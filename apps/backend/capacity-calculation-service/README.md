# Capacity Calculation Service

The high-performance mathematical core of the system, written in Go to handle real-time concurrency.

## Features
- Calculates course status (AVAILABLE, ALERT, SATURATED) based on dynamic thresholds.
- Concurrent processing of academic data using Go Routines.
- Real-time rule updates via shared memory (thread-safe).

## Tech Stack
- **Language:** Go 1.21+
- **Communication:** RabbitMQ (AMQP)

## Dependencies
- **RabbitMQ:** Consumes from `academic_data_queue` and `rules_updates_queue`.
- **Notification Service:** Forwards critical results for alerting.