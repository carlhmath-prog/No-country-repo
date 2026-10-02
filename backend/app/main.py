# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware

# from .database import engine, Base
# from .routers import auth

# app = FastAPI()

# Base.metadata.create_all(bind=engine)

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(auth.router, prefix="/auth")

# @app.get("/")
# def root():
#     return {"message": "API funcionando 🚀"}



from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import engine, Base
# Importamos de manera ordenada todos los routers de la aplicación
from .routers import auth, procesos, ofertas

app = FastAPI(
    title="GovTech Perú - Automatización de Contrataciones",
    version="1.0.0"
)

# Nota: Dado que usas Alembic para manejar las migraciones, 
# la línea Base.metadata.create_all ya no es estrictamente necesaria,
# pero la dejamos por seguridad como fallback automático.
Base.metadata.create_all(bind=engine)

# Configuración del Middleware CORS para comunicación con el Frontend (React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro estructurado de todos los endpoints de la plataforma GovTech
app.include_router(auth.router, prefix="/auth")
app.include_router(procesos.router)  # /procesos prefix configurado internamente
app.include_router(ofertas.router)   # /ofertas prefix configurado internamente

@app.get("/")
def root():
    return {
        "message": "GovTech API funcionando con éxito 🚀",
        "version": "Semana 2 - Motor de Reglas e Integración de Datos"
    }
