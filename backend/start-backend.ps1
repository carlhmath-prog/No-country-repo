$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Instalando dependencias desde requirements.txt..."
python -m pip install -r requirements.txt

Write-Host "Iniciando servidor FastAPI en http://127.0.0.1:8000"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
