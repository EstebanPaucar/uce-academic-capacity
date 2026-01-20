package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// Section representa un paralelo o asignatura a calcular
type Section struct {
	ID   int
	Name string
}

// Función que realiza el cálculo pesado (Goroutine)
func calculateCapacity(section Section, wg *sync.WaitGroup) {
	defer wg.Done()
	log.Printf("[Calculation] Processing: %s (ID: %d)\n", section.Name, section.ID)
	
	// Simulación de procesamiento intensivo
	time.Sleep(2 * time.Second) 
	
	log.Printf("[Success] Capacity calculated for %s\n", section.Name)
}

// Handler para activar el cálculo vía HTTP
func calculationHandler(w http.ResponseWriter, r *http.Request) {
	sections := []Section{
		{ID: 101, Name: "Programación Distribuida - Paralelo A"},
		{ID: 102, Name: "Arquitectura de Software - Paralelo B"},
		{ID: 103, Name: "Minería de Datos - Paralelo C"},
	}

	var wg sync.WaitGroup
	log.Println("--- Starting Parallel Processing via HTTP Request ---")

	for _, section := range sections {
		wg.Add(1)
		go calculateCapacity(section, &wg)
	}

	wg.Wait()
	fmt.Fprintf(w, "Cálculo de capacidad UCE completado exitosamente en paralelo.")
}

func main() {
	// Definimos el puerto 3004 según nuestro mapa de arquitectura
	port := "3004"

	// Definimos las rutas (endpoints)
	http.HandleFunc("/calculate", calculationHandler)
	
	// Health Check simple
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Capacity Calculation Service (Go) is Online")
	})

	log.Printf("🚀 UCE Calculation Engine (Go) running on http://localhost:%s\n", port)
	
	// Iniciamos el servidor
	err := http.ListenAndServe(":"+port, nil)
	if err != nil {
		log.Fatal("Error starting server: ", err)
	}
}