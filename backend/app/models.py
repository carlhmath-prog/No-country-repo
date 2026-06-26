from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from .database import Base


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), default="postulante")  # 'postulante' o 'evaluador'
    fecha_registro = Column(DateTime, default=datetime.utcnow)
