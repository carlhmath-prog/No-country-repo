import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Carga variables de entorno desde backend/.env
base_dir = Path(__file__).resolve().parent.parent
dotenv_path = base_dir / ".env"
if dotenv_path.exists():
    load_dotenv(dotenv_path)

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{base_dir / 'govtech.db'}"
)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(DATABASE_URL, connect_args=connect_args)


try:
    with engine.connect() as connection:
        pass
except Exception as err:
    if not DATABASE_URL.startswith("sqlite"):
        fallback_url = f"sqlite:///{base_dir / 'govtech.db'}"
        print(f"WARNING: No se pudo conectar a PostgreSQL ({err}). Usando SQLite local en {fallback_url}")
        DATABASE_URL = fallback_url
        connect_args = {"check_same_thread": False}
        engine = create_engine(DATABASE_URL, connect_args=connect_args)
    else:
        raise

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
