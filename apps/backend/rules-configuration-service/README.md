# Rules Configuration Service

Centralizes the management of business logic thresholds for the entire ecosystem.

## Features
- Updates global alert thresholds (e.g., changing the "Saturated" trigger from 80% to 90%).
- Multi-target broadcasting: Notifies both the Go Engine (RAM) and NestJS (Database).

## Tech Stack
- **Framework:** NestJS
- **Communication:** RabbitMQ (`rules_updates_queue` and `structure_rules_queue`)

## Dependencies
- **Academic Structure Service:** To trigger mass DB recalculations.
- **Capacity Calculation Service (Go):** To update real-time memory variables.