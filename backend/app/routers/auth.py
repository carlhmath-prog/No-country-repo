from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta, timezone
import jwt
from ..database import get_db
from .. import models, schemas
from ..security import JWT_ALGORITHM, JWT_SECRET_KEY, obtener_password_hash, requerir_rol, verificar_password

router = APIRouter(
    tags=["Autenticación"]
)

def crear_token_acceso(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=2)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
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

    if not user.password_hash.startswith("scrypt$"):
        user.password_hash = obtener_password_hash(login_request.password)
        db.commit()

    if user.rol == "admin":
        user.rol = "superadmin"
        db.commit()

    payload = {
        "sub": user.email,
        "rol": user.rol
    }

    token = crear_token_acceso(payload)
    return {
        "access_token": token,
        "token_type": "bearer"
    }


@router.get("/evaluadores", response_model=list[schemas.UsuarioResponse])
def listar_evaluadores(
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(requerir_rol("superadmin")),
):
    return db.query(models.Usuario).filter(models.Usuario.rol == "evaluador").order_by(models.Usuario.id).all()


@router.post("/evaluadores", response_model=schemas.UsuarioResponse, status_code=status.HTTP_201_CREATED)
def crear_evaluador(
    evaluator: schemas.EvaluadorCreate,
    db: Session = Depends(get_db),
    _: models.Usuario = Depends(requerir_rol("superadmin")),
):
    existing_user = db.query(models.Usuario).filter(models.Usuario.email == evaluator.email).first()
    if existing_user:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="El correo ya está registrado.")

    user = models.Usuario(
        nombre_completo=evaluator.nombre_completo,
        email=evaluator.email,
        password_hash=obtener_password_hash(evaluator.password),
        rol="evaluador",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user
