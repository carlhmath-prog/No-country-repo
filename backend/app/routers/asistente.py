import logging

from fastapi import APIRouter, Depends, HTTPException, status
from openai import OpenAIError
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..ai_errors import convertir_error_openai
from ..rag_service import responder_sobre_proceso
from ..security import obtener_usuario_actual

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/asistente", tags=["Asistente RAG"])


@router.post("/preguntar", response_model=schemas.RespuestaAsistente)
def preguntar(
    request: schemas.PreguntaAsistente,
    user: models.Usuario = Depends(obtener_usuario_actual),
    db: Session = Depends(get_db),
):
    try:
        return responder_sobre_proceso(db, user, request.proceso_id, request.pregunta)
    except LookupError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error))
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error))
    except ValueError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(error))
    except OpenAIError as error:
        logger.exception("Proveedor IA no disponible para el asistente")
        raise convertir_error_openai(error)
