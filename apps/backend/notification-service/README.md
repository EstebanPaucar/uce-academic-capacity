# Notification Service

Monitors critical academic states and alerts relevant users (Vicerrectorado/Directors).

## Features
- Filters notifications based on severity (Critical/Saturated).
- Context-aware delivery: Directors only see alerts for their own Faculty.
- Stores historical alerts for the notification center.

## Tech Stack
- **Framework:** NestJS
- **ORM:** Prisma (PostgreSQL)
- **Communication:** RabbitMQ (`notification_queue`)

## Dependencies
- **Capacity Calculation Service (Go):** Producer of saturated course events.
- **PostgreSQL:** Stores persistent notification logs.