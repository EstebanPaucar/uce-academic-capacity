# Audit Service

A hybrid microservice dedicated to logging system-wide activities for security and traceability.

## Features
- **Asynchronous Logging:** Captures events via RabbitMQ from Auth and Ingestion services.
- **REST API:** Provides endpoints to query historical logs.
- High-performance storage for unstructured log data.

## Tech Stack
- **Framework:** NestJS
- **Database:** MongoDB (Mongoose)
- **Communication:** RabbitMQ (`audit_queue`)

## Dependencies
- **MongoDB:** Stores audit trails.
- **Data Ingestion/Auth Services:** Producers of audit events.