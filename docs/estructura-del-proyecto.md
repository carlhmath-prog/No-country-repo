# Estructura del proyecto

Este documento describe la estructura de carpetas y archivos del proyecto.

## Raíz del proyecto

- `README.md`
- `docker-compose.yml`
- `.gitignore`
- `check_sqlite.py`
- `test-login.ps1`
- `govtech.db` ⚠️ **(no se sube a Git)**
- `backend/`
- `frontend/`
- `docs/`

## `backend/`

- `.env` ⚠️ **(no se sube a Git)**
- `app/`
  - `__init__.py`
  - `database.py`
  - `main.py`
  - `models.py`
  - `schemas.py`
- `config-postgres.ps1`
- `start-backend.ps1`
- `stop-backend.ps1`
- `test-login.ps1`
- `test-register.ps1`
- `debug_testclient.py`
- `test_debug.py`
- `test_register.py`
- `Dockerfile`
- `README.md`
- `requirements.txt`
- `govtech.db` ⚠️ **(no se sube a Git)**

## `frontend/`

- `.gitignore`
- `index.html`
- `package.json`
- `package-lock.json`
- `vite.config.js`
- `eslint.config.js`
- `README.md`
- `public/`
- `src/`
  - `main.jsx`
  - `App.jsx`
  - `App.css`
  - `index.css`
  - `assets/`
    - `react.svg`
    - `vite.svg`
    - `hero.png`
  - `components/`
    - `PrivateRoute.jsx` (componente para proteger rutas)
  - `pages/`
    - `Login.jsx` (página de inicio de sesión)
    - `Register.jsx` (página de registro)
    - `UserDashboard.jsx` (panel de usuario)
    - `AdminDashboard.jsx` (panel de administrador)
    - `Auth.css` (estilos para autenticación)

## `docs/`

- `arquitectura.md`
- `estructura-del-proyecto.md`

## Descripción general

- `README.md`: Documentación general del proyecto.
- `docker-compose.yml`: Configuración de servicios para el proyecto.
- `.gitignore`: Archivos y carpetas ignorados por Git.
- `backend/`: Código del servidor, configuración de base de datos y scripts de prueba.
- `frontend/`: Aplicación React con Vite.
- `docs/`: Documentación adicional.

## Notas de seguridad ⚠️

Los siguientes archivos **NO deben subirse a Git**:

- `backend/.env`: Contiene credenciales sensibles (DATABASE_URL, etc.)
- `*.db`: Archivos de base de datos locales (SQLite)
- `frontend/node_modules/`: Dependencias (se regeneran con `npm install`)

Estos están configurados en `.gitignore` a nivel de raíz.

## Notas de backend

- `backend/.env`: Configuración de PostgreSQL usada por el backend.
- `backend/app/database.py`: Carga la conexión desde `DATABASE_URL` y usa SQLite solo como fallback.
- `backend/start-backend.ps1`: Script PowerShell para instalar dependencias y arrancar el servidor.
- `backend/test-register.ps1`: Script PowerShell para probar `POST /auth/register`.
- `backend/config-postgres.ps1`: Genera un `.env` de ejemplo para PostgreSQL.

## Notas de frontend

- Aplicación React con Vite como bundler.
- Ejecutar `npm install` para instalar dependencias (regenera `node_modules/`).
- ESLint está configurado para validación de código.
- **Autenticación:**
  - `Login.jsx` y `Register.jsx` usan estilos modernos y profesionales desde `Auth.css`
  - `PrivateRoute.jsx` protege rutas que requieren autenticación
  - Manejo de errores y mensajes de éxito integrados
  - Soporta dos roles: Postulante y Administrador
