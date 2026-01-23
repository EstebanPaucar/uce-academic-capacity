# ETAPA 1: Compilación
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copiamos los archivos de dependencias
# Ajusta la ruta si tu go.mod está en otra subcarpeta, asumo la estructura estándar
COPY apps/backend/capacity-calculation-service/go.mod apps/backend/capacity-calculation-service/go.sum ./
RUN go mod download

# Copiamos el código fuente
COPY apps/backend/capacity-calculation-service/ .

# Compilamos el binario
RUN go build -o main .

# ETAPA 2: Ejecución (Imagen ligera)
FROM alpine:latest

WORKDIR /app

# Copiamos el binario desde la etapa anterior
COPY --from=builder /app/main .

# Exponemos el puerto 3004
ENV PORT=3004
EXPOSE 3004

CMD ["./main"]