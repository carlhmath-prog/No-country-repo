from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
from ..database import get_db
from .. import models, schemas
from ..security import requerir_rol

router = APIRouter(
    prefix="/procesos",
    tags=["Procesos de Selección"]
)

@router.post(
    "/",
    response_model=schemas.ProcesoSeleccionResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(requerir_rol("evaluador"))],
)
def crear_proceso(proceso: schemas.ProcesoSeleccionCreate, db: Session = Depends(get_db)):
    fecha_cierre = proceso.fecha_cierre.replace(tzinfo=None) if proceso.fecha_cierre.tzinfo else proceso.fecha_cierre
    ahora = datetime.now(timezone.utc).replace(tzinfo=None)
    if fecha_cierre <= ahora:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="La fecha de cierre debe ser futura.",
        )

    db_proceso = db.query(models.ProcesoSeleccion).filter(models.ProcesoSeleccion.codigo == proceso.codigo).first()
    if db_proceso:
        raise HTTPException(status_code=400, detail=f"El proceso '{proceso.codigo}' ya existe.")

    if proceso.entidad_id is not None:
        entidad = db.query(models.EntidadContratante).filter(
            models.EntidadContratante.id == proceso.entidad_id
        ).first()
        if entidad is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La entidad contratante indicada no existe.",
            )
    else:
        entidad = db.query(models.EntidadContratante).filter(
            models.EntidadContratante.ruc == proceso.entidad.ruc
        ).first()
        if entidad is None:
            entidad = models.EntidadContratante(**proceso.entidad.model_dump())
            db.add(entidad)
            db.flush()

    nuevo_proceso = models.ProcesoSeleccion(
        entidad_id=entidad.id,
        codigo=proceso.codigo,
        titulo=proceso.titulo,
        descripcion=proceso.descripcion,
        fecha_cierre=proceso.fecha_cierre
    )
    db.add(nuevo_proceso)
    db.flush()

    nuevo_tdr = models.TDR(
        proceso_id=nuevo_proceso.id,
        version=proceso.tdr.version,
        titulo=proceso.tdr.titulo,
        descripcion=proceso.tdr.descripcion,
        ruta_archivo=proceso.tdr.ruta_archivo
    )
    db.add(nuevo_tdr)
    try:
        db.commit()
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo guardar el proceso por datos duplicados o referencias inválidas.",
        ) from error
    db.refresh(nuevo_proceso)
    return nuevo_proceso

@router.get("/", response_model=List[schemas.ProcesoSeleccionResponse])
def listar_procesos(db: Session = Depends(get_db)):
    return db.query(models.ProcesoSeleccion).filter(
        models.ProcesoSeleccion.estado == "publicado",
        models.ProcesoSeleccion.fecha_cierre > datetime.now(timezone.utc).replace(tzinfo=None),
    ).order_by(models.ProcesoSeleccion.fecha_cierre.asc()).all()
