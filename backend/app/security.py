import hashlib
import hmac
import os
import secrets

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import models
from .database import get_db

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"

if not JWT_SECRET_KEY:
    raise RuntimeError("JWT_SECRET_KEY debe configurarse en el entorno")

bearer_scheme = HTTPBearer(auto_error=False)


def obtener_password_hash(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.scrypt(
        password.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=32,
    )
    return f"scrypt$16384$8$1${salt.hex()}${password_hash.hex()}"


def verificar_password(password: str, stored_hash: str) -> bool:
    if not stored_hash.startswith("scrypt$"):
        legacy_hash = hashlib.sha256(password.encode("utf-8")).hexdigest()
        return hmac.compare_digest(legacy_hash, stored_hash)

    try:
        scheme, n_value, r_value, p_value, salt_hex, expected_hex = stored_hash.split("$")
        if scheme != "scrypt" or (int(n_value), int(r_value), int(p_value)) != (2**14, 8, 1):
            return False
        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(expected_hex)
        actual_hash = hashlib.scrypt(
            password.encode("utf-8"),
            salt=salt,
            n=2**14,
            r=8,
            p=1,
            dklen=len(expected_hash),
        )
        return hmac.compare_digest(actual_hash, expected_hash)
    except (ValueError, OverflowError):
        return False


def obtener_usuario_actual(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.Usuario:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales no válidas o ausentes.",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if credentials is None:
        raise unauthorized

    try:
        payload = jwt.decode(
            credentials.credentials,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM],
        )
    except jwt.InvalidTokenError:
        raise unauthorized

    email = payload.get("sub")
    if not email:
        raise unauthorized

    user = db.query(models.Usuario).filter(models.Usuario.email == email).first()
    if user is None:
        raise unauthorized
    if user.rol == "admin":
        user.rol = "superadmin"
        db.commit()
    return user


def requerir_rol(required_role: str):
    def validar_rol(user: models.Usuario = Depends(obtener_usuario_actual)) -> models.Usuario:
        allowed = user.rol == required_role or (
            user.rol == "superadmin" and required_role == "evaluador"
        )
        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción.",
            )
        return user

    return validar_rol