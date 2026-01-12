package main

import (
	"fmt"
	"sync"
	"time"
)

// Section representa un paralelo o asignatura a calcular
type Section struct {
	ID   int
	Name string
}

func calculateCapacity(section Section, wg *sync.WaitGroup) {
	defer wg.Done()
	
	fmt.Printf("[Calculation] Starting parallel processing for: %s (ID: %d)\n", section.Name, section.ID)
	
	// Simulación del cálculo pesado basado en las reglas de Redis
	time.Sleep(2 * time.Second) 
	
	fmt.Printf("[Success] Capacity calculated for %s\n", section.Name)
}

func main() {
	fmt.Println("UCE Academic Capacity - Calculation Engine (Go) is starting...")

	// Simulamos una carga de datos desde el Ingestion Service
	sections := []Section{
		{ID: 101, Name: "Programación Distribuida - Paralelo A"},
		{ID: 102, Name: "Arquitectura de Software - Paralelo B"},
		{ID: 103, Name: "Minería de Datos - Paralelo C"},
	}

	var wg sync.WaitGroup

	fmt.Println("--- Starting Parallel Goroutines ---")
	for _, section := range sections {
		wg.Add(1)
		// Ejecución en paralelo usando Goroutines
		go calculateCapacity(section, &wg)
	}

	// Esperar a que todas las goroutines terminen (RNF de Consistencia)
	wg.Wait()
	fmt.Println("--- All calculations completed successfully ---")
}