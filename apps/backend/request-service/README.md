# Request Service

Manages the workflow for course capacity increase requests, bridging the gap between Career Directors and the Vicerrectorado.

## Features
- Creation of change requests with justifications (Professionalizing, Closing Career, etc.).
- Approval/Rejection workflow for administrators.
- Automated execution trigger upon approval.

## Tech Stack
- **Framework:** NestJS
- **ORM:** Prisma (PostgreSQL)
- **Communication:** RabbitMQ (`capacity_execution_queue`)

## Dependencies
- **Capacity Management Service:** Executes the change once approved.
- **PostgreSQL:** Tracks request status and resolution codes.