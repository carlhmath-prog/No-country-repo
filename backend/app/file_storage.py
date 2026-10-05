import logging
import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile, status

logger = logging.getLogger(__name__)
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "data" / "uploads"
MAX_PDF_SIZE = 15 * 1024 * 1024
STORAGE_KEY_PATTERN = re.compile(r"^[a-f0-9]{32}\.pdf$")


async def guardar_pdf(archivo: UploadFile) -> str:
    if Path(archivo.filename or "").suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Solo se permiten archivos PDF.",
        )

    contenido = await archivo.read(MAX_PDF_SIZE + 1)
    if len(contenido) > MAX_PDF_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="El PDF no puede superar los 15 MB.",
        )
    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El archivo no contiene una cabecera PDF válida.",
        )

    storage_key = f"{uuid4().hex}.pdf"
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    destino = UPLOAD_DIRECTORY / storage_key
    try:
        destino.write_bytes(contenido)
    except OSError:
        logger.exception("No se pudo guardar el archivo PDF")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar el archivo.",
        )
    return storage_key


def leer_pdf(storage_key: str) -> bytes:
    if not STORAGE_KEY_PATTERN.fullmatch(storage_key):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="La referencia del archivo no es válida.",
        )

    ruta = UPLOAD_DIRECTORY / storage_key
    try:
        contenido = ruta.read_bytes()
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El documento no está disponible para analizar.",
        )
    except OSError:
        logger.exception("No se pudo leer un PDF almacenado")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo leer el documento.",
        )

    if not contenido.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El documento almacenado no es un PDF válido.",
        )
    return contenido
