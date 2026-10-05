from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
import json
import logging
import os
from openai import OpenAIError
from pydantic import ValidationError
from ..database import get_db
from .. import models, schemas
from ..security import requerir_rol
from ..ai_analysis import analizar_documentos
from ..ai_errors import convertir_error_openai

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ofertas",
    tags=["Postulaciones / Ofertas"]
)

@router.post(
    "/",
    response_model=schemas.OfertaResponse,
    status_code=status.HTTP_201_CREATED,
)
def presentar_oferta(
    oferta: schemas.OfertaCreate,
    user: models.Usuario = Depends(requerir_rol("postulante")),
    db: Session = Depends(get_db),
):
    """
    Registra la postulación de un proveedor y ejecuta las validaciones 
    obligatorias del Motor de Reglas del Backend.
    """
    ahora = datetime.utcnow()
    postulante = db.query(models.Postulante).filter(
        models.Postulante.correo == user.email
    ).first()
    if postulante is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Completa el perfil de postulante antes de presentar una oferta.",
        )

    # 1. REGLA DE NEGOCIO: El proceso de selección debe existir
    proceso = db.query(models.ProcesoSeleccion).filter(models.ProcesoSeleccion.id == oferta.proceso_id).first()
    if not proceso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"El proceso de selección con ID {oferta.proceso_id} no existe."
        )

    # 2. REGLA DE NEGOCIO: El proceso debe estar publicado/abierto
    if proceso.estado != "publicado":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El proceso seleccionado no se encuentra activo para aceptar ofertas."
        )

    # 3. REGLA DE NEGOCIO: No se aceptan ofertas fuera de fecha límite (Normalizando Zona Horaria)
    fecha_cierre_limpia = proceso.fecha_cierre.replace(tzinfo=None) if proceso.fecha_cierre.tzinfo else proceso.fecha_cierre
    if ahora > fecha_cierre_limpia:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=f"La fecha límite de presentación ({fecha_cierre_limpia}) ha expirado."
        )

    # 4. REGLA DE NEGOCIO: Un postulante solo puede presentar una oferta por proceso (Unique Constraint)
    oferta_existente = db.query(models.Oferta).filter(
        models.Oferta.proceso_id == oferta.proceso_id,
        models.Oferta.postulante_id == postulante.id
    ).first()
    
    if oferta_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Este postulante ya cuenta con una propuesta registrada para este proceso."
        )

    # Si pasa el motor de reglas, registramos la cabecera de la Oferta
    nueva_oferta = models.Oferta(
        proceso_id=oferta.proceso_id,
        postulante_id=postulante.id,
        estado="enviada",
        fecha_presentacion=ahora
    )
    db.add(nueva_oferta)
    db.flush()  # Genera el ID de la oferta para asociar los detalles anidados

    # Guardar Propuestas Anidadas (Técnica / Económica)
    for prop in oferta.propuestas:
        nueva_prop = models.Propuesta(
            oferta_id=nueva_oferta.id,
            tipo=prop.tipo,
            ruta_archivo=prop.ruta_archivo
        )
        db.add(nueva_prop)

    # Guardar Documentos Sustentatorios Adjuntos
    for doc in oferta.documentos:
        nuevo_doc = models.Documento(
            oferta_id=nueva_oferta.id,
            tipo=doc.tipo,
            ruta_archivo=doc.ruta_archivo
        )
        db.add(nuevo_doc)

    # Guardar Registro del Personal Clave
    for persona in oferta.personal_clave:
        nuevo_personal = models.PersonalClave(
            oferta_id=nueva_oferta.id,
            nombre=persona.nombre,
            cargo=persona.cargo,
            experiencia=persona.experiencia
        )
        db.add(nuevo_personal)

    db.commit()
    db.refresh(nueva_oferta)
    return nueva_oferta


@router.get(
    "/",
    response_model=List[schemas.OfertaResponse],
    dependencies=[Depends(requerir_rol("evaluador"))],
)
def listar_ofertas(db: Session = Depends(get_db)):
    """
    Lista todas las ofertas ingresadas al ecosistema GovTech.
    """
    return db.query(models.Oferta).all()


@router.get(
    "/mis",
    response_model=List[schemas.OfertaResponse],
)
def listar_mis_ofertas(
    user: models.Usuario = Depends(requerir_rol("postulante")),
    db: Session = Depends(get_db),
):
    postulante = db.query(models.Postulante).filter(
        models.Postulante.correo == user.email
    ).first()
    if postulante is None:
        return []
    return db.query(models.Oferta).filter(
        models.Oferta.postulante_id == postulante.id
    ).order_by(models.Oferta.fecha_presentacion.desc()).all()


@router.put(
    "/{oferta_id}/evaluacion",
    response_model=schemas.EvaluacionResponse,
)
def evaluar_oferta(
    oferta_id: int,
    evaluacion: schemas.EvaluacionCreate,
    user: models.Usuario = Depends(requerir_rol("evaluador")),
    db: Session = Depends(get_db),
):
    oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
    if oferta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La oferta no existe.")

    registro = db.query(models.Evaluacion).filter(
        models.Evaluacion.oferta_id == oferta_id,
        models.Evaluacion.usuario_id == user.id,
    ).first()
    if registro is None:
        registro = models.Evaluacion(oferta_id=oferta_id, usuario_id=user.id)
        db.add(registro)

    registro.estado = evaluacion.estado
    registro.puntaje_total = evaluacion.puntaje_total
    registro.observaciones = evaluacion.observaciones
    db.commit()
    db.refresh(registro)
    return registro


@router.post(
    "/{oferta_id}/analisis-ia",
    response_model=schemas.AnalisisIAResponse,
)
def analizar_oferta(
    oferta_id: int,
    user: models.Usuario = Depends(requerir_rol("evaluador")),
    db: Session = Depends(get_db),
):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="El análisis IA no está configurado. Define OPENAI_API_KEY en el backend.",
        )

    oferta = db.query(models.Oferta).filter(models.Oferta.id == oferta_id).first()
    if oferta is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="La oferta no existe.")
    if not oferta.proceso.tdr or not oferta.proceso.tdr.ruta_archivo:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El proceso no tiene un TDR PDF cargado.",
        )

    proposal_documents = [
        (propuesta.tipo, propuesta.ruta_archivo)
        for propuesta in oferta.propuestas
    ] + [
        (documento.tipo or "Documento de oferta", documento.ruta_archivo)
        for documento in oferta.documentos
    ]
    if not proposal_documents:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="La oferta no tiene documentos PDF para analizar.",
        )

    try:
        modelo, resultado = analizar_documentos(oferta.proceso.tdr.ruta_archivo, proposal_documents)
        resultado_validado = schemas.ResultadoAnalisisIA.model_validate(resultado)
    except RuntimeError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error))
    except OpenAIError as error:
        logger.exception("Falló el proveedor IA al analizar la oferta %s", oferta_id)
        raise convertir_error_openai(error)
    except (ValueError, ValidationError):
        logger.exception("Falló el análisis IA de la oferta %s", oferta_id)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo completar el análisis IA. Revisa la configuración o inténtalo de nuevo.",
        )

    analisis = models.AnalisisIA(
        oferta_id=oferta.id,
        evaluador_id=user.id,
        modelo=modelo,
        resultado_json=json.dumps(resultado_validado.model_dump(), ensure_ascii=False),
    )
    db.add(analisis)
    db.commit()
    db.refresh(analisis)
    return analisis
