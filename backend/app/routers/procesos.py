from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
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
    # Lógica de validación
    db_proceso = db.query(models.ProcesoSeleccion).filter(models.ProcesoSeleccion.codigo == proceso.codigo).first()
    if db_proceso:
        raise HTTPException(status_code=400, detail=f"El proceso '{proceso.codigo}' ya existe.")
        
    nuevo_proceso = models.ProcesoSeleccion(
        entidad_id=proceso.entidad_id,
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
    db.commit()
    db.refresh(nuevo_proceso)
    return nuevo_proceso

@router.get("/", response_model=List[schemas.ProcesoSeleccionResponse])
def listar_procesos(db: Session = Depends(get_db)):
    return db.query(models.ProcesoSeleccion).all()
