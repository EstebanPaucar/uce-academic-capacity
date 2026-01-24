# Auth Service

Handles identity management, secure registration, and JWT-based authentication for the UCE ecosystem.

## Features
- User registration with Role and Faculty binding.
- Password encryption using Bcrypt.
- JWT issuance containing user context (role, facultyId) for frontend filtering.

## Tech Stack
- **Framework:** NestJS
- **Security:** Passport.js + JWT
- **ORM:** Prisma (PostgreSQL)

## Dependencies
- **PostgreSQL:** Stores user credentials and profile data.