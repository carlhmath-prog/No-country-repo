# Backend GovTech

Scripts disponibles:

- `start-backend.ps1`: instala dependencias y arranca el servidor FastAPI en `http://127.0.0.1:8000`
- `config-postgres.ps1`: crea el archivo `.env` con la URL de PostgreSQL y prepara el entorno local.
- `test-register.ps1`: prueba el endpoint `POST /auth/register` con un usuario de ejemplo.
- `test-login.ps1`: prueba el endpoint `POST /auth/login` y devuelve un token JWT.

Configurar PostgreSQL:

1. Crea un servidor PostgreSQL local o remoto.
2. Ajusta `backend/.env` o usa `config-postgres.ps1`.

Uso:

```powershell
cd backend
./config-postgres.ps1
./start-backend.ps1
```

En otra terminal:

```powershell
cd backend
./test-register.ps1
```

Si no tienes PostgreSQL disponible, el backend usa SQLite de forma temporal con `backend/govtech.db`.
