import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Ruta base
base_dir = Path(__file__).resolve().parent.parent

# Cargar .env
dotenv_path = base_dir / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)

# Base de datos (SIN fallback automático)
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # fallback SOLO si tú lo decides explícitamente
    db_path = base_dir / "govtech.db"
    DATABASE_URL = f"sqlite:///{db_path}"
    print("⚠️ DATABASE_URL no definida, usando SQLite local")

# Config engine
connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args
)

# Session
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# Dependency FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()