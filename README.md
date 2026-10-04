# Plataforma GovTech

Plataforma para automatizar la preparación y revisión de propuestas técnicas y económicas en procesos de contratación pública en Perú. El proyecto incluye registro e inicio de sesión, gestión de procesos de selección y presentación de ofertas.

## Tecnologías actuales

- **Backend:** Python, FastAPI, SQLAlchemy y Uvicorn.
- **Base de datos:** SQLite para ejecución local sin configuración adicional; PostgreSQL 15 con Docker Compose.
- **Frontend:** React 19, JavaScript, React Router y Vite.
- **Contenedores:** Docker Compose levanta PostgreSQL y el backend. El frontend se ejecuta por separado.

> El código actual no usa Java/Spring Boot ni TypeScript. En desarrollo, el frontend envía las solicitudes a `/api` en su propio origen (`http://localhost:5173`) y Vite las reenvía al backend en `http://127.0.0.1:8000`. Así el navegador no depende de que `localhost:8000` sea accesible desde fuera del Codespace.

### Roles

- `superadmin`: administra la plataforma y crea cuentas de evaluador. No se registra públicamente.
- `evaluador`: publica procesos y revisa/evalúa ofertas de postulantes.
- `postulante`: se registra públicamente, completa su perfil y presenta ofertas.

El registro público crea únicamente cuentas `postulante`. La cuenta existente con rol `admin` se convierte automáticamente en `superadmin` al iniciar sesión o usar un endpoint protegido.

La API valida JWT y permisos en backend: consultar procesos es público; crear procesos, listar ofertas y evaluarlas requiere `evaluador` o `superadmin`; presentar ofertas y editar el perfil requiere `postulante`. El superadmin puede crear/listar evaluadores. Las evaluaciones guardan decisión (`aprobada`, `observada` o `rechazada`), puntaje de 0 a 100 y observaciones. En su primer acceso, el postulante completa razón social y RUC; las ofertas se vinculan a su perfil por el correo autenticado.

### Flujo de la interfaz por rol

- Todas las personas usan la misma pantalla de inicio de sesión; después de validar la cuenta, la aplicación abre el panel correspondiente al rol.
- En `/register`, el selector indica qué cuentas pueden registrarse. Solo `postulante` está abierto al público; los roles privilegiados aparecen como acceso restringido y no se envían como opción pública.
- El `superadmin` entra a `/superadmin` para crear cuentas `evaluador` y consultar las existentes.
- El `evaluador` entra a `/admin` para publicar procesos y revisar ofertas. La evaluación permite elegir decisión, asignar puntaje de 0 a 100 y guardar observaciones.
- El `postulante` entra a `/user`, completa razón social y RUC en su primer acceso y luego consulta convocatorias y presenta ofertas.

## Estructura

```text
.
├── backend/
│   ├── app/
│   │   ├── routers/       # Rutas de autenticación, procesos y ofertas
│   │   │   └── postulantes.py # Perfil de postulante asociado a la cuenta
│   │   ├── database.py    # Conexión y sesiones SQLAlchemy
│   │   ├── security.py    # Hash de contraseña, JWT y control de roles
│   │   ├── create_admin.py # Aprovisionamiento privado de superadmin
│   │   ├── models.py      # Modelos de datos
│   │   ├── schemas.py     # Esquemas de entrada y respuesta
│   │   └── main.py        # Aplicación FastAPI y registro de rutas
│   ├── alembic/           # Configuración e historial de migraciones
│   ├── requirements.txt   # Dependencias Python
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes compartidos
│   │   ├── pages/         # Vistas de autenticación y paneles
│   │   │   └── SuperAdminDashboard.jsx # Gestión de evaluadores
│   │   ├── services/      # Llamadas a la API
│   │   ├── App.jsx        # Rutas de la aplicación
│   │   └── main.jsx       # Punto de entrada React
│   └── package.json       # Scripts y dependencias npm
└── docker-compose.yml     # PostgreSQL y backend
```

## Requisitos

- Python 3 y `venv`.
- Node.js y npm compatibles con la versión de Vite del proyecto.
- Docker Compose, solo si se desea ejecutar con PostgreSQL.

## Ejecutar y probar en local

### Opción rápida recomendada

Desde la raíz del repositorio:

```bash
./start-dev.sh
```

Este script hace lo siguiente automáticamente:

- levanta PostgreSQL y el backend con Docker Compose
- instala dependencias del frontend si hace falta
- inicia Vite en `http://localhost:5173` usando un único puerto fijo
- comprueba que la API y el frontend respondan antes de continuar

> Importante: el frontend queda en `5173` para toda la app. Si ese puerto está ocupado por otra app local, debes cerrarla antes de iniciar el proyecto o cambiarlo de forma explícita en el script.

El backend del Compose conecta a PostgreSQL por el gateway del host (`host.docker.internal`). La configuración incluye `host-gateway` porque en algunos entornos de Codespaces los contenedores no se alcanzan directamente por el nombre interno `db`.

### Opción manual

Abre dos terminales. En la primera, instala y arranca el backend:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export JWT_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Si `DATABASE_URL` no está definida en el entorno ni en `backend/.env`, el backend usa SQLite en `backend/govtech.db`. La aplicación está en `http://localhost:8000` y su documentación interactiva en `http://localhost:8000/docs`.

Para comprobar registro e inicio de sesión, deja el backend ejecutándose y usa una segunda terminal:

```bash
email="prueba-$(date +%s)@example.com"

curl -i -X POST http://localhost:8000/auth/register \
	-H 'Content-Type: application/json' \
	-d "{\"nombre_completo\":\"Usuario Prueba\",\"email\":\"$email\",\"password\":\"secret123\",\"rol\":\"postulante\"}"

curl -i -X POST http://localhost:8000/auth/login \
	-H 'Content-Type: application/json' \
	-d "{\"email\":\"$email\",\"password\":\"secret123\"}"
```

El registro debe responder con HTTP `201` y el login con un token. El formulario web está en `http://localhost:5173/register`; crea postulantes. Para probar el inicio de sesión, usa el mismo correo y contraseña en `http://localhost:5173/login`. El rol del token determina qué panel se abre; no elijas el rol desde el login.

También hay scripts `.ps1` y `backend/test_register.py`; los `.ps1` requieren PowerShell y el script Python usa un correo fijo, por lo que puede responder que ya existe si se repite.

En la segunda terminal, instala, revisa y arranca el frontend:

```bash
cd frontend
npm ci
npm run lint
npm run build
npm run dev -- --host 0.0.0.0
```

Abre la URL que indique Vite, normalmente `http://localhost:5173`. `npm run lint` revisa el código con ESLint y `npm run build` genera la versión de producción en `frontend/dist`. Para servir esa compilación localmente, ejecuta `npm run preview` después de `npm run build`. El proxy `/api` está configurado para desarrollo con Vite; una publicación de producción necesita configurar el servidor web para reenviar `/api` al backend.

### Rutas principales de la API

- `POST /auth/register` y `POST /auth/login`: registro público de postulantes e inicio de sesión.
- `GET /postulantes/me` y `PUT /postulantes/me`: consultar y guardar el perfil propio del postulante.
- `GET /procesos/`: consultar convocatorias públicas. `POST /procesos/` requiere rol evaluador o superadmin.
- `POST /ofertas/`: presentar una oferta asociada al perfil autenticado.
- `GET /ofertas/` y `PUT /ofertas/{id}/evaluacion`: revisar y evaluar ofertas como evaluador o superadmin.
- `GET /auth/evaluadores` y `POST /auth/evaluadores`: gestión de cuentas evaluadoras reservada al superadmin.

## Ejecutar con Docker Compose

Desde la raíz del repositorio:

```bash
docker compose up --build -d
```

Esto inicia PostgreSQL y el backend en el puerto `8000`, usando la base `govtech_db`. Para desarrollo local Compose usa una clave JWT de desarrollo; antes de exponer la app, define una propia antes de arrancar:

```bash
export JWT_SECRET_KEY="$(python3 -c 'import secrets; print(secrets.token_hex(32))')"
./start-dev.sh
```

No reutilices la clave local por defecto en un despliegue real. Cambiar la clave invalida los tokens existentes, así que los usuarios deberán iniciar sesión otra vez.

### Crear un superadministrador de forma privada

No existe registro público de cuentas administrativas. Una persona con acceso al entorno puede crear el superadmin inicial desde la raíz del repositorio:

```bash
docker compose exec backend python -m app.create_admin
```

El comando solicita nombre, correo y contraseña (mínimo 12 caracteres) de forma interactiva. Luego el superadmin inicia sesión y crea evaluadores desde `/superadmin`; los evaluadores entran en `/admin` para publicar procesos y revisar ofertas.

### Reiniciar los servicios

Para parar y volver a levantar todo limpio:

```bash
cd /workspaces/No-country-repo
docker compose down
```

Luego vuelves a arrancarlos:

```bash
cd /workspaces/No-country-repo
docker compose up --build -d
```

No inicia el frontend; para probar la interfaz, ejecuta los comandos de frontend anteriores en otra terminal.

### Puertos del proyecto

- Frontend: `http://localhost:5173` (puerto fijo)
- Backend API: `http://localhost:8000`
- Documentación Swagger: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432`

## Base de datos y migraciones

Al iniciar, `backend/app/main.py` crea las tablas con SQLAlchemy. Hay archivos de configuración e historial de Alembic, pero Alembic no está incluido en `backend/requirements.txt`; por tanto, las instrucciones anteriores no ejecutan migraciones con Alembic.
