package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"os"

	"github.com/streadway/amqp" // Driver estándar para RabbitMQ
)

// Estructuras de datos sincronizadas con tu esquema de TypeScript [cite: 2026-01-20]
type IncomingCourse struct {
	Name            string `json:"name"`
	Parallel        string `json:"parallel"`
	Level           string `json:"level"`
	CurrentStudents int    `json:"currentStudents"`
	MaxCapacity     int    `json:"maxCapacity"`
	// Se incluyen campos adicionales del Excel para no perder trazabilidad
	Faculty string `json:"Facultad"`
	Career  string `json:"Carrera"`
}

type CalculatedResult struct {
	IncomingCourse
	Status              string  `json:"status"`
	OccupancyPercentage float64 `json:"occupancyPercentage"`
}

func main() {
	// 1. Configuración de conexión compatible con AWS Academy [cite: 2026-01-06]
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

	// 2. Declaración de colas (Pipeline de Eventos) [cite: 649, 650]
	qInput, _ := ch.QueueDeclare("academic_data_queue", true, false, false, false, nil)
	qOutput, _ := ch.QueueDeclare("calculation_results_queue", true, false, false, false, nil)

	msgs, err := ch.Consume(qInput.Name, "", true, false, false, false, nil)
	failOnError(err, "Failed to register a consumer")

	forever := make(chan bool)

	// 3. PROCESAMIENTO PARALELO CON GOROUTINES 
	go func() {
		for d := range msgs {
			// Lanzamos una Goroutine por cada mensaje para cálculo simultáneo [cite: 264]
			go func(msg amqp.Delivery) {
				var course IncomingCourse
				json.Unmarshal(msg.Body, &course)

				// Lógica del Motor de Cálculo (Fórmula: Inscritos / Cupo) [cite: 119, 164]
				percentage := 0.0
				status := "DISPONIBLE"

				if course.MaxCapacity > 0 {
					percentage = (float64(course.CurrentStudents) / float64(course.MaxCapacity)) * 100
					percentage = math.Round(percentage*100) / 100

					// Aplicación de Regla Normativa FE19 (Semaforización) [cite: 165, 166]
					if percentage >= 100 {
						status = "SATURADO"
					} else if percentage >= 80 { // Umbral de alerta configurado [cite: 2026-01-20]
						status = "ALERTA"
					}
					
					// Validación específica del Reglamento: Mínimo 35 estudiantes [cite: 89, 109]
					if course.CurrentStudents < 35 {
						status = "ALERTA_NORMATIVA" 
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

				// Enviar resultado a la siguiente etapa del pipeline [cite: 147, 180]
				body, _ := json.Marshal(result)
				ch.Publish("", qOutput.Name, false, false, amqp.Publishing{
					ContentType: "application/json",
					Body:        body,
				})

				log.Printf("✅ Calculado: %s (%v%%) -> %s", course.Name, percentage, status)
			}(d)
		}
	}()

	log.Printf("--- 🐹 Go Calculation Service Waiting for messages ---")
	<-forever
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}