# start-all.ps1
# Ejecuta TODO: docker, prisma, go, microservicios NX y frontend
# Uso: powershell -ExecutionPolicy Bypass -File .\start-all.ps1

$ErrorActionPreference = "Stop"

function Start-NewTerminal($title, $cmd) {
  # Abre una nueva ventana de PowerShell y ejecuta el comando
  Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$PWD`"; `$host.UI.RawUI.WindowTitle=`"$title`"; $cmd"
}

Write-Host "=== 1) Levantando infraestructura (Docker Compose) ===" -ForegroundColor Cyan
docker-compose up -d

Write-Host "=== 2) Prisma db push ===" -ForegroundColor Cyan
npx prisma db push

Write-Host "=== 3) Levantando Go capacity-calculation-service (3004 RMQ) ===" -ForegroundColor Cyan
Start-NewTerminal "GO capacity-calculation-service" "go run apps/backend/capacity-calculation-service/main.go"

Write-Host "=== 4) Levantando microservicios (NX) ===" -ForegroundColor Cyan

# Importante: forzamos puertos con env:PORT para que no se te mezclen.
Start-NewTerminal "auth-service :3002"                "`$env:PORT=3002; npx nx serve auth-service"
Start-NewTerminal "academic-structure-service :3001"  "`$env:PORT=3001; npx nx serve academic-structure-service"
Start-NewTerminal "data-ingestion-service :3000"      "`$env:PORT=3000; npx nx serve data-ingestion-service"
Start-NewTerminal "audit-service :3003"               "`$env:PORT=3003; npx nx serve audit-service"
Start-NewTerminal "rules-configuration-service :3005" "`$env:PORT=3005; npx nx serve rules-configuration-service"
Start-NewTerminal "notification-service :3007"        "`$env:PORT=3007; npx nx serve notification-service"
Start-NewTerminal "analytics-service :3006"           "`$env:PORT=3006; npx nx serve analytics-service"
Start-NewTerminal "request-service :3008"             "`$env:PORT=3008; npx nx serve request-service"
Start-NewTerminal "capacity-management-service :3009" "`$env:PORT=3009; npx nx serve capacity-management-service"

Write-Host "=== 5) Levantando Frontend (web-admin :4200) ===" -ForegroundColor Cyan
Start-NewTerminal "frontend web-admin :4200" "npx nx serve web-admin"

Write-Host ""
Write-Host "✅ Todo lanzado. Revisa las ventanas abiertas para logs." -ForegroundColor Green
Write-Host "Frontend: http://localhost:4200" -ForegroundColor Yellow
Write-Host "Auth: http://localhost:3002/api" -ForegroundColor Yellow
Write-Host "Structure: http://localhost:3001/api" -ForegroundColor Yellow
