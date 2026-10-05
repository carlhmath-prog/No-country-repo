from fastapi import APIRouter, Depends, File, UploadFile

from .. import models
from ..file_storage import guardar_pdf
from ..security import requerir_rol

router = APIRouter(prefix="/archivos", tags=["Documentos PDF"])


@router.post("/tdr", response_model=dict[str, str])
async def subir_tdr(
    archivo: UploadFile = File(...),
    _: models.Usuario = Depends(requerir_rol("evaluador")),
):
    return {"storage_key": await guardar_pdf(archivo)}


@router.post("/ofertas", response_model=dict[str, str])
async def subir_documento_oferta(
    archivo: UploadFile = File(...),
    _: models.Usuario = Depends(requerir_rol("postulante")),
):
    return {"storage_key": await guardar_pdf(archivo)}
