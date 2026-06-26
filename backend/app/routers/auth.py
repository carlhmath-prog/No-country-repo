from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.hash import pbkdf2_sha256
import jwt
from datetime import datetime, timedelta, timezone
import os

from ..database import get_db
from .. import models, schemas

router = APIRouter()

SECRET_KEY = os.getenv("SECRET_KEY", "dev_secret_key")
ALGORITHM = "HS256"

# =========================
# REGISTER
# =========================
@router.post("/register", response_model=schemas.UsuarioResponse)
def register(user: schemas.UsuarioCreate, db: Session = Depends(get_db)):

    exists = db.query(models.Usuario).filter(models.Usuario.email == user.email).first()

    if exists:
        raise HTTPException(status_code=400, detail="Email ya registrado")

    hashed = pbkdf2_sha256.hash(user.password)

    new_user = models.Usuario(
        nombre_completo=user.nombre_completo,
        email=user.email,
        password_hash=hashed,
        rol=user.rol
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# =========================
# LOGIN
# =========================
@router.post("/login")
def login(data: schemas.LoginRequest, db: Session = Depends(get_db)):

    user = db.query(models.Usuario).filter(models.Usuario.email == data.email).first()

    if not user or not pbkdf2_sha256.verify(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")

    token = jwt.encode(
        {
            "sub": user.email,
            "rol": user.rol,
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        },
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }