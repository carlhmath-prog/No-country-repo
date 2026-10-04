

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Literal

# =====================================================================
# 1. ESQUEMAS DE AUTENTICACIÓN ORIGINALES (SIN CAMBIOS)
# =====================================================================

class UsuarioCreate(BaseModel):
    nombre_completo: str
    email: EmailStr
    password: str
    rol: Literal["postulante"] = "postulante"

class UsuarioResponse(BaseModel):
    id: int
    nombre_completo: str
    email: EmailStr
    rol: str
    fecha_registro: datetime

    model_config = {
        "from_attributes": True
    }

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class EvaluadorCreate(BaseModel):
    nombre_completo: str
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)

class EvaluacionCreate(BaseModel):
    estado: Literal["aprobada", "observada", "rechazada"]
    puntaje_total: float = Field(..., ge=0, le=100)
    observaciones: Optional[str] = None

class EvaluacionResponse(BaseModel):
    id: int
    oferta_id: int
    usuario_id: int
    estado: str
    puntaje_total: float
    observaciones: Optional[str] = None

    model_config = {
        "from_attributes": True
    }


# =====================================================================
# 2. ESQUEMAS NUEVOS - PROCESOS DE SELECCIÓN (SEMANA 2)
# =====================================================================

class EntidadContratanteBase(BaseModel):
    nombre: str
    ruc: str = Field(..., min_length=11, max_length=11, description="RUC de 11 dígitos")
    direccion: Optional[str] = None

class EntidadContratanteCreate(EntidadContratanteBase):
    pass

class EntidadContratanteResponse(EntidadContratanteBase):
    id: int

    model_config = {
        "from_attributes": True
    }


class TDRBase(BaseModel):
    version: Optional[str] = "1.0"
    titulo: str
    descripcion: Optional[str] = None
    ruta_archivo: Optional[str] = None

class TDRCreate(TDRBase):
    pass

class TDRResponse(TDRBase):
    id: int
    proceso_id: int

    model_config = {
        "from_attributes": True
    }


class ProcesoSeleccionBase(BaseModel):
    codigo: str = Field(..., description="Ej: LPI-001-2026")
    titulo: str
    descripcion: Optional[str] = None
    fecha_cierre: datetime

class ProcesoSeleccionCreate(ProcesoSeleccionBase):
    entidad_id: int
    tdr: TDRCreate  # Inyección 1:1 nativa para adjuntar el TDR directo al proceso

class ProcesoSeleccionResponse(ProcesoSeleccionBase):
    id: int
    entidad_id: int
    estado: str
    fecha_publicacion: datetime
    tdr: Optional[TDRResponse] = None

    model_config = {
        "from_attributes": True
    }


# =====================================================================
# 3. ESQUEMAS NUEVOS - POSTULACIONES Y OFERTAS (SEMANA 2)
# =====================================================================

class PropuestaCreate(BaseModel):
    tipo: str = Field(..., description="'tecnica' o 'economica'")
    ruta_archivo: str

class PropuestaResponse(PropuestaCreate):
    id: int
    oferta_id: int

    model_config = {
        "from_attributes": True
    }


class DocumentoCreate(BaseModel):
    tipo: str = Field(..., description="Ej: CV, Certificado, Anexo, Declaracion Jurada")
    ruta_archivo: str

class DocumentoResponse(DocumentoCreate):
    id: int
    oferta_id: int

    model_config = {
        "from_attributes": True
    }


class PersonalClaveCreate(BaseModel):
    nombre: str
    cargo: str
    experiencia: Optional[str] = None

class PersonalClaveResponse(PersonalClaveCreate):
    id: int
    oferta_id: int

    model_config = {
        "from_attributes": True
    }


class OfertaCreate(BaseModel):
    proceso_id: int
    propuestas: List[PropuestaCreate] = []
    documentos: List[DocumentoCreate] = []
    personal_clave: List[PersonalClaveCreate] = []

class PerfilPostulanteInput(BaseModel):
    razon_social: str = Field(..., min_length=2, max_length=255)
    ruc: str = Field(..., pattern=r"^\d{11}$")

class PerfilPostulanteResponse(BaseModel):
    id: int
    razon_social: str
    ruc: str
    correo: EmailStr

    model_config = {
        "from_attributes": True
    }

class OfertaResponse(BaseModel):
    id: int
    proceso_id: int
    postulante_id: int
    estado: str
    fecha_presentacion: datetime
    propuestas: List[PropuestaResponse] = []
    documentos: List[DocumentoResponse] = []
    personal_clave: List[PersonalClaveResponse] = []
    evaluaciones: List[EvaluacionResponse] = []

    model_config = {
        "from_attributes": True
    }
