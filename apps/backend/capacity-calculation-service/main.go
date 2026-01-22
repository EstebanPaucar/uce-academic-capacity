package main

import (
	"encoding/json"
	"log"
	"math"
	"os"
	"sync" 

	"github.com/streadway/amqp"
)

var (
	CurrentAlertThreshold = 80.0 
	mu                    sync.RWMutex 
)

// --- ESTRUCTURAS (Igual que antes) ---
type IncomingNestJSEvent struct {
	Pattern string         `json:"pattern"`
	Data    IncomingCourse `json:"data"`
}

type IncomingCourse struct {
	Name            string `json:"name"`
	Parallel        string `json:"parallel"`
	Level           string `json:"level"`
	CurrentStudents int    `json:"currentStudents"`
	MaxCapacity     int    `json:"maxCapacity"`
	Faculty         string `json:"Facultad"`
	Career          string `json:"Carrera"`
}

type IncomingRuleEvent struct {
	Pattern string `json:"pattern"`
	Data    struct {
		Key   string  `json:"key"`
		Value float64 `json:"value"`
	} `json:"data"`
}

type CalculatedResult struct {
	IncomingCourse
	Status              string  `json:"status"`
	OccupancyPercentage float64 `json:"occupancyPercentage"`
}

type OutputNestJSMessage struct {
	Pattern string           `json:"pattern"`
	Data    CalculatedResult `json:"data"`
}

func main() {
	rmqURL := os.Getenv("RABBITMQ_URL")
	if rmqURL == "" {
		rmqURL = "amqp://guest:guest@localhost:5672/"
	}

	conn, err := amqp.Dial(rmqURL)
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	// --- COLAS ---
	qInput, _ := ch.QueueDeclare("academic_data_queue", true, false, false, false, nil)
	// Cola original (Base de datos)
	qOutput, _ := ch.QueueDeclare("calculation_results_queue", true, false, false, false, nil)
	// Cola de Reglas
	qRules, _ := ch.QueueDeclare("rules_updates_queue", true, false, false, false, nil)
	
	// 🚩 NUEVA COLA: Notificaciones (Exclusiva para Notification Service)
	qNotif, _ := ch.QueueDeclare("notification_queue", true, false, false, false, nil)

	// --- CONSUMIDORES ---
	msgsData, err := ch.Consume(qInput.Name, "", true, false, false, false, nil)
	failOnError(err, "Failed Data Consumer")

	msgsRules, err := ch.Consume(qRules.Name, "", true, false, false, false, nil)
	failOnError(err, "Failed Rules Consumer")

	forever := make(chan bool)

	// --- HILO 1: REGLAS ---
	go func() {
		for d := range msgsRules {
			var ruleEvent IncomingRuleEvent
			if err := json.Unmarshal(d.Body, &ruleEvent); err == nil && ruleEvent.Pattern == "rule_updated" {
				mu.Lock() 
				if ruleEvent.Data.Key == "UMBRAL_ALERTA" {
					CurrentAlertThreshold = ruleEvent.Data.Value
					log.Printf("🔧 CONFIG ACTUALIZADA: Nuevo Umbral = %.2f%%", CurrentAlertThreshold)
				}
				mu.Unlock()
			}
		}
	}()

	// --- HILO 2: DATOS ---
	go func() {
		for d := range msgsData {
			go func(msg amqp.Delivery) {
				var event IncomingNestJSEvent
				if err := json.Unmarshal(msg.Body, &event); err != nil {
					log.Printf("❌ Error JSON: %s", err)
					return
				}

				course := event.Data
				mu.RLock()
				umbralAlerta := CurrentAlertThreshold
				mu.RUnlock()

				// LÓGICA DE CÁLCULO
				percentage := 0.0
				status := "DISPONIBLE"

				if course.MaxCapacity > 0 {
					percentage = (float64(course.CurrentStudents) / float64(course.MaxCapacity)) * 100
					percentage = math.Round(percentage*100) / 100

					// 1. Estado Principal
					if percentage >= 100 {
						status = "SATURADO"
					} else if percentage >= umbralAlerta { 
						status = "ALERTA"
					}

					// 2. Estado Normativo (Si > 35)
					if course.CurrentStudents > 35 {
						status += " | ALERTA_NORMATIVA"
					}
				} else {
					status = "DESBORDADO"
					percentage = 100.0
				}

				result := CalculatedResult{
					IncomingCourse:      course,
					Status:              status,
					OccupancyPercentage: percentage,
				}

				nestMessage := OutputNestJSMessage{Pattern: "course_created", Data: result}
				body, _ := json.Marshal(nestMessage)

				// 🚩 DOBLE PUBLICACIÓN 🚩
				
				// 1. Enviar a Academic Structure (BD) - COMO SIEMPRE
				ch.Publish("", qOutput.Name, false, false, amqp.Publishing{
					ContentType: "application/json", Body: body,
				})

				// 2. Enviar a Notification Service (NUEVO)
				ch.Publish("", qNotif.Name, false, false, amqp.Publishing{
					ContentType: "application/json", Body: body,
				})

			}(d)
		}
	}()

	log.Printf("--- 🐹 Go Calculation Service Ready (Umbral: %.0f%%) ---", CurrentAlertThreshold)
	<-forever
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}