from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import datetime
from typing import List
from ..database import get_db
from .. import models, schemas
from ..security import requerir_rol

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
