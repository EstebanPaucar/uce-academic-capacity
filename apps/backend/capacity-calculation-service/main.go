package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math"
	"sync" // Para manejo de Goroutines
)

// CapacityStatus coincide con tu Enum de TypeScript [cite: 2026-01-20]
const (
	AVAILABLE = "DISPONIBLE"
	WARNING   = "ALERTA"
	SATURATED  = "SATURADO"
	OVERFLOW  = "DESBORDADO"
)

type CourseData struct {
	Name            string `json:"name"`
	CurrentStudents int    `json:"currentStudents"`
	MaxCapacity     int    `json:"maxCapacity"`
}

type CalculationResult struct {
	Name       string  `json:"name"`
	Status     string  `json:"status"`
	Percentage float64 `json:"percentage"`
}

// El "Cerebro" en Go con procesamiento paralelo [cite: 184, 469]
func calculateCapacity(course CourseData, wg *sync.WaitGroup, results chan<- CalculationResult) {
	defer wg.Done() // Indica que esta Goroutine terminó

	percentage := 0.0
	status := AVAILABLE

	if course.MaxCapacity == 0 {
		status = OVERFLOW
		percentage = 100.0
	} else {
		percentage = (float64(course.CurrentStudents) / float64(course.MaxCapacity)) * 100
		percentage = math.Round(percentage*100) / 100

		if percentage >= 100 {
			status = SATURATED
		} else if percentage >= 80 { // Umbral de tu reglamento FE19 [cite: 89, 243]
			status = WARNING
		}
	}

	results <- CalculationResult{
		Name:       course.Name,
		Status:     status,
		Percentage: percentage,
	}
}

func main() {
	// Simulación de carga masiva de datos [cite: 117]
	courses := []CourseData{
		{Name: "Software Architecture", CurrentStudents: 35, MaxCapacity: 35},
		{Name: "Distributed Systems", CurrentStudents: 30, MaxCapacity: 40},
	}

	var wg sync.WaitGroup
	results := make(chan CalculationResult, len(courses))

	fmt.Println("🚀 Iniciando cálculo paralelo de capacidad (Go Goroutines)...")

	for _, course := range courses {
		wg.Add(1)
		go calculateCapacity(course, &wg, results) // Dispara el hilo paralelo [cite: 326]
	}

	wg.Wait()
	close(results)

	for res := range results {
		resJSON, _ := json.Marshal(res)
		fmt.Printf("✅ Resultado: %s\n", string(resJSON))
	}
}