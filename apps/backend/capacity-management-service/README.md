# Capacity Management Service

Executes physical changes to course capacities once administrative requests are approved.

## Features
- Listens for approved capacity change orders.
- Directly updates the PostgreSQL database.
- Triggers immediate recalculations in the Go Engine after an update.

## Tech Stack
- **Framework:** NestJS
- **Communication:** RabbitMQ (`capacity_execution_queue`)
- **ORM:** Prisma (PostgreSQL)

## Dependencies
- **Request Service:** Source of approved execution orders.
- **Capacity Calculation Service (Go):** Target for post-update recalculation.