# Estructura del Proyecto

Este documento describe la estructura de carpetas y archivos del proyecto GovTech.

## 📋 Raíz del proyecto

```
S06-26-NC-Equipo-07/
├── README.md
├── docker-compose.yml
├── .gitignore
├── backend/
├── frontend/
└── docs/
```

## 🔧 Backend (`backend/`)

### Estructura de directorios

```
backend/
├── .env ⚠️ (no se sube a Git - credenciales)
├── .env.example
├── govtech.db ⚠️ (SQLite fallback - no se sube a Git)
├── requirements.txt
├── Dockerfile
├── README.md
├── alembic/
│   ├── env.py (configuración runtime con fallback PostgreSQL→SQLite)
│   ├── script.py.mako (template para migraciones)
│   └── versions/
│       └── 1dcd90e7c184_init.py (migración inicial)
├── alembic.ini (configuración de Alembic)
├── app/
│   ├── __init__.py
│   ├── main.py (aplicación FastAPI principal)
│   ├── database.py (sesiones SQLAlchemy + fallback logic)
│   ├── models.py (modelos ORM - Usuario)
│   ├── schemas.py (esquemas Pydantic)
│   └── routers/
│       ├── __init__.py
│       └── auth.py (endpoints POST /auth/register, POST /auth/login)
├── config-postgres.ps1
├── start-backend.ps1
├── stop-backend.ps1
└── test scripts/
```

### Archivos principales - Backend

| Archivo | Propósito |
|---------|-----------|
| `app/main.py` | Aplicación FastAPI, middleware CORS, inclusión de routers |
| `app/database.py` | Engine SQLAlchemy con fallback PostgreSQL→SQLite |
| `app/models.py` | Modelo ORM `Usuario` (usuarios table) |
| `app/schemas.py` | Validación Pydantic: `UsuarioCreate`, `LoginRequest`, `TokenResponse` |
| `app/routers/auth.py` | **Endpoints de autenticación** - registro y login con JWT |
| `alembic.ini` | Configuración de migraciones (URL, versioning) |
| `alembic/env.py` | Runtime de Alembic con soporte PostgreSQL/SQLite |
| `requirements.txt` | Dependencias: FastAPI, Uvicorn, SQLAlchemy, Alembic, PyJWT, passlib |

## 🎨 Frontend (`frontend/`)

### Estructura de directorios

```
frontend/
├── .gitignore
├── index.html
├── vite.config.js
├── eslint.config.js
├── package.json
├── package-lock.json
├── README.md
├── public/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── App.css
│   ├── index.css
│   ├── assets/
│   ├── components/
│   │   └── PrivateRoute.jsx (protección de rutas autenticadas)
│   └── pages/
│       ├── Login.jsx (login con JWT)
│       ├── Register.jsx (registro de usuarios)
│       ├── UserDashboard.jsx (panel postulante)
│       ├── AdminDashboard.jsx (panel administrador)
│       └── Auth.css (estilos autenticación)
└── node_modules/ ⚠️ (no se sube a Git)
```

### Stack frontend

- **Framework:** React 19
- **Bundler:** Vite
- **Linting:** ESLint
- **Autenticación:** JWT (localStorage)
- **CORS:** Configurado para http://localhost:5173

## 📚 Documentación (`docs/`)

- `arquitectura.md` - Diagrama de arquitectura del sistema
- `estructura-del-proyecto.md` - Este archivo

## ✅ Estado de Funcionalidad

### Backend - OPERATIVO ✅

**Servidor:** http://127.0.0.1:8000

| Endpoint | Método | Estado | Descripción |
|----------|--------|--------|-------------|
| `/auth/register` | POST | ✅ | Crear nuevo usuario |
| `/auth/login` | POST | ✅ | Autenticación + JWT |
| `/docs` | GET | ✅ | Swagger UI |
| `/openapi.json` | GET | ✅ | OpenAPI schema |

### Características implementadas

✅ **Autenticación JWT:**
- Algoritmo: HS256
- Payload: `{sub: email, rol: usuario_rol, exp: timestamp+2h}`
- Generación en `/auth/login`

✅ **Hashing de contraseñas:**
- Algoritmo: pbkdf2_sha256
- Implementación: passlib

✅ **CORS:**
- Origen permitido: http://localhost:5173
- Métodos: todos
- Headers: todos
- Credenciales: permitidas

✅ **Base de datos:**
- PostgreSQL (producción)
- SQLite (fallback) → `backend/govtech.db`
- Migraciones Alembic funcionales

✅ **Validación:**
- Pydantic schemas
- EmailStr validation
- Request/response models

### Frontend - EN DESARROLLO 🔄

**Estado:** Listo para integración con backend
- Componentes: Login, Register, PrivateRoute
- CORS: Configurado para recibir requests desde backend

### Base de datos - OPERATIVA ✅

**Tabla: `usuarios`**
```sql
- id (Integer, PK, autoincrement)
- nombre_completo (String 150)
- email (String 150, unique, indexed)
- password_hash (String 255)
- rol (String 50, default='postulante')
- fecha_registro (DateTime, default=utcnow)
```

**Migraciones:**
- Archivo: `alembic/versions/1dcd90e7c184_init.py`
- Estado: Aplicada ✅
- Método: Alembic autogenerate

## 🔐 Notas de Seguridad

⚠️ **Archivos que NO deben subirse a Git:**

| Archivo | Razón |
|---------|-------|
| `backend/.env` | Credenciales PostgreSQL (DATABASE_URL) |
| `backend/govtech.db` | Base de datos SQLite local |
| `frontend/node_modules/` | Dependencias (regenerables con npm install) |

✅ **Ya configurado en `.gitignore`**

## 📝 Configuración

### Backend - Variables de entorno

**`backend/.env`** (crear manualmente):
```
DATABASE_URL=postgresql://user:password@localhost:5432/govtech_db
SECRET_KEY=your-secret-key-here (opcional, usa default si falta)
```

**Si PostgreSQL no está disponible:** 
- Backend automáticamente cae a SQLite en `backend/govtech.db`
- Migraciones Alembic aplican en ambas bases

### Backend - Arrancar servidor

**Ubicación importante:** Ejecutar desde carpeta `backend/`

```powershell
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

**Swagger UI:** http://127.0.0.1:8000/docs

### Frontend - Arrancar desarrollo

```bash
cd frontend
npm install
npm run dev
```

**URL:** http://localhost:5173

### Alembic - Migraciones

**Crear migración automática:**
```powershell
cd backend
python -m alembic revision --autogenerate -m "descripción"
```

**Aplicar migraciones:**
```powershell
python -m alembic upgrade head
```

**Ver estado:**
```powershell
python -m alembic current
python -m alembic history
```

## 🧪 Testing

### Probar autenticación (sin frontend)

**1. Registrar usuario:**
```bash
curl -X POST http://127.0.0.1:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"nombre_completo":"Test User","email":"test@example.com","password":"pass123","rol":"postulante"}'
```

**2. Login:**
```bash
curl -X POST http://127.0.0.1:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"pass123"}'
```

**Respuesta:** Token JWT en `access_token`

### Usar Swagger UI

Acceder a http://127.0.0.1:8000/docs para:
- ✅ Probar endpoints interactivamente
- ✅ Ver esquemas de request/response
- ✅ Descargar OpenAPI spec

## 🚀 Dependencias principales

### Backend
- **FastAPI** 0.111.0 - Framework web
- **Uvicorn** 0.30.1 - ASGI server
- **SQLAlchemy** 2.0.31 - ORM
- **Alembic** 1.18.5 - Migraciones
- **Pydantic** 2.x - Validación
- **PyJWT** 2.8.0 - JWT tokens
- **passlib** 1.7.4 - Hashing (pbkdf2_sha256)
- **python-dotenv** - Variables de entorno
- **psycopg2** - Driver PostgreSQL

### Frontend
- **React** 19
- **Vite** - Bundler
- **ESLint** - Linting
