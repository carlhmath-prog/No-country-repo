from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import requerir_rol

router = APIRouter(
    prefix="/postulantes",
    tags=["Perfil de postulante"],
)


@router.get("/me", response_model=schemas.PerfilPostulanteResponse | None)
def obtener_perfil(
    user: models.Usuario = Depends(requerir_rol("postulante")),
    db: Session = Depends(get_db),
):
    return db.query(models.Postulante).filter(
        models.Postulante.correo == user.email
    ).first()


@router.put("/me", response_model=schemas.PerfilPostulanteResponse)
def guardar_perfil(
    perfil: schemas.PerfilPostulanteInput,
    user: models.Usuario = Depends(requerir_rol("postulante")),
    db: Session = Depends(get_db),
):
    perfil_existente = db.query(models.Postulante).filter(
        models.Postulante.correo == user.email
    ).first()
    ruc_existente = db.query(models.Postulante).filter(
        models.Postulante.ruc == perfil.ruc
    ).first()
    if ruc_existente and (perfil_existente is None or ruc_existente.id != perfil_existente.id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El RUC ya está asociado a otro postulante.",
        )

    if perfil_existente is None:
        perfil_existente = models.Postulante(correo=user.email, **perfil.model_dump())
        db.add(perfil_existente)
    else:
        perfil_existente.razon_social = perfil.razon_social
        perfil_existente.ruc = perfil.ruc

    db.commit()
    db.refresh(perfil_existente)
    return perfil_existente