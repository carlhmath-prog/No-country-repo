$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Buscando procesos de backend en el puerto 8000..."
$processes = Get-CimInstance Win32_Process | Where-Object {
    $_.CommandLine -match 'uvicorn.*8000' -or $_.CommandLine -match 'app\.main:app'
}

if (-not $processes) {
    Write-Host "No se encontraron procesos de backend activos."
    exit 0
}

foreach ($p in $processes) {
    Write-Host "Deteniendo PID $($p.ProcessId): $($p.CommandLine)"
    Stop-Process -Id $p.ProcessId -Force -ErrorAction SilentlyContinue
}

Write-Host "Backend detenido. Puedes reiniciar con .\start-backend.ps1"
