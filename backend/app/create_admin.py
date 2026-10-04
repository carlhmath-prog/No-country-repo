from getpass import getpass

from . import models
from .database import SessionLocal
from .security import obtener_password_hash


def main() -> None:
    nombre = input("Nombre del superadministrador: ").strip()
    email = input("Correo del superadministrador: ").strip().lower()
    password = getpass("Contraseña (mínimo 12 caracteres): ")
    confirmacion = getpass("Confirma la contraseña: ")

    if not nombre or not email:
        raise SystemExit("El nombre y el correo son obligatorios.")
    if len(password) < 12:
        raise SystemExit("La contraseña debe tener al menos 12 caracteres.")
    if password != confirmacion:
        raise SystemExit("Las contraseñas no coinciden.")

    with SessionLocal() as db:
        existente = db.query(models.Usuario).filter(models.Usuario.email == email).first()
        if existente:
            raise SystemExit("Ya existe una cuenta con ese correo.")

        admin = models.Usuario(
            nombre_completo=nombre,
            email=email,
            password_hash=obtener_password_hash(password),
            rol="superadmin",
        )
        db.add(admin)
        db.commit()

    print(f"Cuenta superadmin creada para {email}.")


if __name__ == "__main__":
    main()