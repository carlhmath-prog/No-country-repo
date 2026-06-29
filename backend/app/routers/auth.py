from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import jwt
import hashlib
from ..database import get_db
from .. import models, schemas

SECRET_KEY = "your-secret-key-here"
ALGORITHM = "HS256"

router = APIRouter(
    tags=["Autenticación"]
)

def obtener_password_hash(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def verificar_password(plain_password: str, hashed_password: str) -> bool:
    return obtener_password_hash(plain_password) == hashed_password

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=2)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    if isinstance(encoded_jwt, bytes):
        return encoded_jwt.decode('utf-8')
    return encoded_jwt

# =====================================================================
# ENDPOINTS OPERATIVOS
# =====================================================================

@router.post("/register", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def register(user: schemas.UsuarioCreate, db: Session = Depends(get_db)):
    """
    Registra un usuario insertando datos planos directamente en PostgreSQL.
    """
    # Validar si el email ya existe
    db_user = db.query(models.Usuario).filter(models.Usuario.email == user.email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El correo ya está registrado."
        )
    
    # Instanciamos el modelo usando estrictamente las columnas físicas de la tabla 'usuarios'
    nuevo_usuario = models.Usuario(
        nombre_completo=user.nombre_completo,
        email=user.email,
        password_hash=obtener_password_hash(user.password),
        rol=user.rol
    )
    
    db.add(nuevo_usuario)
    db.commit()
    db.refresh(nuevo_usuario)
    return nuevo_usuario

@router.post("/login", response_model=schemas.TokenResponse)
def login(login_request: schemas.LoginRequest, db: Session = Depends(get_db)):
    """
    Autentica al usuario y genera el token de seguridad.
    """
    user = db.query(models.Usuario).filter(models.Usuario.email == login_request.email).first()
    if not user or not verificar_password(login_request.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico o la contraseña son incorrectos."
        )

    payload = {
        "sub": user.email,
        "rol": user.rol
    }

    token = crear_token_acceso(payload)
    return {
        "access_token": token,
        "token_type": "bearer"
    }
