from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

response = client.post(
    "/auth/register",
    json={
        "nombre_completo": "Juan Pérez",
        "email": "juan+test@example.com",
        "password": "secret123",
        "rol": "postulante"
    }
)

print("status", response.status_code)
print(response.text)
print(response.json() if response.headers.get('content-type', '').startswith('application/json') else '')
