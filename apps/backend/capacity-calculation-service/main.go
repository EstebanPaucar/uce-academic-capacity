package main

import (
	"encoding/json"
	"log"
	"math"
	"os"

	"github.com/streadway/amqp"
)

// 1. ESTRUCTURA DE ENTRADA (El "Sobre" que envía Ingestion Service)
type IncomingNestJSEvent struct {
	Pattern string         `json:"pattern"`
	Data    IncomingCourse `json:"data"` // Aquí adentro está la materia real
}

// Estructura de la materia (La "Carta")
type IncomingCourse struct {
    Name            string `json:"name"`            // Coincide con cleanData.name
    Parallel        string `json:"parallel"`        // Coincide con cleanData.parallel
    Level           string `json:"level"`           // Coincide con cleanData.level
    CurrentStudents int    `json:"currentStudents"` // Coincide con cleanData.currentStudents
    MaxCapacity     int    `json:"maxCapacity"`     // Coincide con cleanData.maxCapacity
    Faculty         string `json:"Facultad"`        // Coincide con cleanData.Facultad
    Career          string `json:"Carrera"`         // Coincide con cleanData.Carrera
}

type CalculatedResult struct {
	IncomingCourse
	Status              string  `json:"status"`
	OccupancyPercentage float64 `json:"occupancyPercentage"`
}

// Estructura de SALIDA (El "Sobre" para el siguiente servicio)
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

	qInput, _ := ch.QueueDeclare("academic_data_queue", true, false, false, false, nil)
	qOutput, _ := ch.QueueDeclare("calculation_results_queue", true, false, false, false, nil)

	msgs, err := ch.Consume(qInput.Name, "", true, false, false, false, nil)
	failOnError(err, "Failed to register a consumer")

	forever := make(chan bool)

	go func() {
		for d := range msgs {
			go func(msg amqp.Delivery) {
				// 🚩 PASO 1: ABRIR EL SOBRE DE ENTRADA
				var event IncomingNestJSEvent
				err := json.Unmarshal(msg.Body, &event)
				if err != nil {
					log.Printf("❌ Error al leer JSON de entrada: %s", err)
					return
				}

				// Extraemos la materia real
				course := event.Data 

				// Lógica del Motor (Inscritos / Cupo)
				percentage := 0.0
				status := "DISPONIBLE"

				if course.MaxCapacity > 0 {
					percentage = (float64(course.CurrentStudents) / float64(course.MaxCapacity)) * 100
					percentage = math.Round(percentage*100) / 100

					if percentage >= 100 {
						status = "SATURADO"
					} else if percentage >= 80 { 
						status = "ALERTA"
					}
					
					if course.CurrentStudents < 35 {
						status = "ALERTA_NORMATIVA" 
					}
				} else {
					// Solo es desbordado si realmente vino con 0 de capacidad
					status = "DESBORDADO" 
					percentage = 100.0
				}

				result := CalculatedResult{
					IncomingCourse:      course,
					Status:              status,
					OccupancyPercentage: percentage,
				}

				// 🚩 PASO 2: METER EN SOBRE DE SALIDA
				nestMessage := OutputNestJSMessage{
					Pattern: "course_created", 
					Data:    result,
				}

				body, _ := json.Marshal(nestMessage)
				
				ch.Publish("", qOutput.Name, false, false, amqp.Publishing{
					ContentType: "application/json",
					Body:        body,
				})

				// Log corregido para ver el nombre real
				log.Printf("✅ Calculado: %s (%v%%) -> %s", course.Name, percentage, status)
			}(d)
		}
	}()

	log.Printf("--- 🐹 Go Calculation Service Ready ---")
	<-forever
}

func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}