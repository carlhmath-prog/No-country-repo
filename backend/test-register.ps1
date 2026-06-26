$body = @{ 
  nombre_completo = "Juana Pérez"
  email = "juana5@example.com"
  password = "secret123"
  rol = "postulante"
} | ConvertTo-Json

$bytes = [System.Text.Encoding]::UTF8.GetBytes($body)

Invoke-RestMethod -Uri http://127.0.0.1:8000/auth/register -Method Post -Body $bytes -ContentType "application/json; charset=utf-8"
