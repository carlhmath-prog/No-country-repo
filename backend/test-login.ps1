$body = @{
    email = "juana@example.com"
    password = "secret123"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8000/auth/login" -Method Post -Body $body -ContentType "application/json"