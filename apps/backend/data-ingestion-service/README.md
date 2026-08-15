# Data Ingestion Service

The entry point for external academic data. It performs ETL (Extract, Transform, Load) operations on Excel files.

## Features
- Parses complex Excel structures with merged cells (Faculty/Career headers).
- Cleans and transforms raw spreadsheet rows into standard JSON course objects.
- Streams data to the calculation engine via RabbitMQ.

## Tech Stack
- **Framework:** NestJS
- **Library:** XLSX (SheetJS)
- **Communication:** RabbitMQ

## Dependencies
- **RabbitMQ:** Publishes to `academic_data_queue` and `audit_queue`.
- **Auth Service:** Protects upload endpoints via JWT.