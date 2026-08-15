# UCE Academic Capacity System

Sistema distribuido de gestión de capacidad académica para la Universidad Central del Ecuador. Automatiza el cálculo, monitoreo y control de la capacidad estudiantil por curso (cupos, saturación, alertas normativas) mediante una arquitectura de microservicios orientada a eventos, desplegada sobre infraestructura como código en AWS.

## 🏗️ Arquitectura

El sistema está compuesto por **9 microservicios independientes** (8 en Node.js/NestJS + 1 motor de cálculo en Go) que se comunican de forma asíncrona a través de **RabbitMQ**, con persistencia en **PostgreSQL** (datos transaccionales, vía Prisma) y **MongoDB** (auditoría). El motor de reglas de negocio corre en un servicio Go independiente para maximizar el rendimiento del cálculo de capacidad, desacoplado del resto de servicios de dominio.

```
Frontend (React/Vite)
      │
      ▼
API Gateway implícito por servicio (Auth, Academic Structure, Data Ingestion, ...)
      │
      ├── auth-service               → Autenticación y JWT
      ├── academic-structure-service → Facultades, carreras, cursos
      ├── data-ingestion-service     → Ingesta de datos académicos
      ├── audit-service              → Auditoría (MongoDB)
      ├── rules-configuration-service→ Reglas de negocio (roles/guards)
      ├── analytics-service          → Métricas y reportes
      ├── notification-service       → Notificaciones a directores
      ├── request-service            → Solicitudes de cambio de cupo
      ├── capacity-management-service→ Gestión de capacidad
      │
      └── capacity-calculation-service (Go) → Motor de cálculo de ocupación/estado
```

### Flujo de eventos (RabbitMQ)

1. `academic-structure-service` publica un curso nuevo/actualizado en la cola `academic_data_queue`.
2. `capacity-calculation-service` (Go) consume el mensaje, calcula `occupancyPercentage` y `status` (`DISPONIBLE`, `ALERTA`, `SATURADO`) y publica el resultado en `calculation_results_queue`.
3. `academic-structure-service` persiste el resultado en PostgreSQL vía Prisma.
4. Cuando `rules-configuration-service` actualiza una regla de negocio (`structure_rules_queue`), se dispara un **recálculo masivo**: se reenvían todos los cursos existentes al motor Go para aplicar la nueva regla.

Toda la comunicación usa confirmación manual de mensajes (`ack`/`nack`) para garantizar consistencia ante fallos de persistencia.

## ⚙️ Stack Tecnológico

| Categoría | Tecnología |
|---|---|
| Backend (microservicios de dominio) | Node.js, TypeScript, NestJS |
| Motor de cálculo | Go |
| Mensajería | RabbitMQ (event-driven, colas durables) |
| Persistencia transaccional | PostgreSQL + Prisma ORM |
| Persistencia de auditoría | MongoDB |
| Frontend | React + Vite |
| Infraestructura como código | Terraform (AWS) |
| Contenedores | Docker / Docker Compose |
| Monorepo / Build system | Nx |
| CI/CD | GitHub Actions |
| Autenticación | JWT |

## ☁️ Infraestructura (Terraform / AWS)

La infraestructura se define completamente en `terraform/main.tf` y provisiona:

- **Red**: VPC dedicada con subredes públicas (multi-AZ) y una subred privada, Internet Gateway y NAT Gateway para salida controlada de la subred privada.
- **Cómputo**: instancia bastion (jump host, subred pública) e instancia de aplicación `t3.large` (subred privada) dimensionada para correr los 9 microservicios junto a RabbitMQ y las bases de datos.
- **Balanceo**: Application Load Balancer con health checks hacia Nginx.
- **Seguridad**: Security Groups segmentados por rol (bastion, ALB, aplicación).
- **Almacenamiento**: bucket S3 para reportes generados.
- **Bootstrap automatizado**: el `user_data` de la instancia instala Docker, Node.js 20 y Go 1.21, y habilita Nginx sin intervención manual.

El acceso a la instancia de aplicación (subred privada) se realiza mediante un patrón **bastion host**, saltando desde la instancia pública.

## 🚀 Puesta en marcha local

El proyecto incluye un script (`start-all.ps1`) que levanta todo el stack en un solo comando:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-all.ps1
```

Esto ejecuta, en orden:

1. `docker-compose up -d` → PostgreSQL, RabbitMQ, MongoDB
2. `npx prisma db push` → sincroniza el esquema con PostgreSQL
3. Levanta el motor de cálculo en Go
4. Levanta los 9 microservicios Nx (cada uno en su puerto, `3000`–`3009`)
5. Levanta el frontend (`web-admin`) en `http://localhost:4200`

Alternativamente, cada pieza puede levantarse de forma manual con `docker-compose up -d` y `npx nx serve <servicio>`.

## 📁 Estructura del monorepo

```
apps/
├── backend/
│   ├── academic-structure-service/
│   ├── analytics-service/
│   ├── audit-service/
│   ├── auth-service/
│   ├── capacity-calculation-service/   # Go
│   ├── capacity-management-service/
│   ├── data-ingestion-service/
│   ├── notification-service/
│   ├── request-service/
│   └── rules-configuration-service/
└── frontend/
    └── web-admin/                      # React + Vite
prisma/
└── schema.prisma                       # Modelos: User, Role, Faculty, Career, Course, BusinessRule, Notification, Request
terraform/
└── main.tf                             # Infraestructura AWS completa
```

Cada microservicio backend cuenta con su propio proyecto de pruebas end-to-end (`*-e2e`) gestionado por Nx.

## 👨‍💻 Autor

**Esteban Paucar**
