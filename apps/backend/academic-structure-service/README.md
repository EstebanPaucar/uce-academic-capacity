# Academic Structure Service

This service manages the core hierarchical data of the UCE Academic System, including Faculties, Careers, and Courses. It acts as the primary orchestrator for persisting calculated academic data.

## Features
- Manages the academic organizational tree (Faculty -> Career -> Course).
- Synchronizes with the **Go Calculation Engine** via RabbitMQ.
- Handles massive recalculations triggered by business rule changes.

## Tech Stack
- **Framework:** NestJS
- **ORM:** Prisma (PostgreSQL)
- **Communication:** RabbitMQ (Asynchronous), REST (Sychronous)

## Dependencies
- **PostgreSQL:** Primary storage for academic entities.
- **RabbitMQ:** Listens to `calculation_results_queue` and `structure_rules_queue`.
- **Capacity Calculation Service (Go):** Sends raw course data for processing.