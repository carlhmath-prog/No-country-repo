$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

if (-not (Test-Path -Path ".env")) {
    @"
DATABASE_URL=postgresql://user:password@localhost:5432/govtech_db
"@ | Out-File -Encoding utf8 .env
    Write-Host ".env creado con valores de ejemplo. Edita DATABASE_URL si tu Postgres usa otro host/usuario/contraseña." -ForegroundColor Green
} else {
    Write-Host ".env ya existe. Revísalo en $(Resolve-Path .env)" -ForegroundColor Yellow
}

Write-Host "Para iniciar el servidor con PostgreSQL, edita backend/.env y luego ejecuta start-backend.ps1" -ForegroundColor Cyan
