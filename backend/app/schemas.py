

from pydantic import BaseModel, EmailStr, Field, model_validator
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


class HallazgoAnalisisIA(BaseModel):
    requisito: str
    estado: Literal["cumple", "no_cumple", "no_encontrado", "inconcluso"]
    evidencia: str
    documento: str


class ResultadoAnalisisIA(BaseModel):
    resumen: str
    estado_general: Literal["cumple", "cumple_parcialmente", "no_cumple", "inconcluso"]
    hallazgos: List[HallazgoAnalisisIA]
    recomendaciones: List[str]


class AnalisisIAResponse(BaseModel):
    id: int
    oferta_id: int
    evaluador_id: int
    modelo: str
    resultado: ResultadoAnalisisIA
    fecha_analisis: datetime

    model_config = {
        "from_attributes": True
    }


class PreguntaAsistente(BaseModel):
    proceso_id: int
    pregunta: str = Field(..., min_length=3, max_length=2000)


class CitaAsistente(BaseModel):
    documento: str
    tipo_documento: str
    pagina: int
    oferta_id: Optional[int] = None


class RespuestaAsistente(BaseModel):
    respuesta: str
    citas: List[CitaAsistente]
    modelo: str


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
    entidad_id: Optional[int] = None
    entidad: Optional[EntidadContratanteCreate] = None
    tdr: TDRCreate  # Inyección 1:1 nativa para adjuntar el TDR directo al proceso

    @model_validator(mode="after")
    def validar_entidad(self):
        if (self.entidad_id is None) == (self.entidad is None):
            raise ValueError("Debes indicar entidad_id existente o los datos de una nueva entidad.")
        return self

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

class ProcesoOfertaResponse(BaseModel):
    id: int
    codigo: str
    titulo: str
    fecha_cierre: datetime

    model_config = {
        "from_attributes": True
    }

class OfertaResponse(BaseModel):
    id: int
    proceso_id: int
    postulante_id: int
    postulante: PerfilPostulanteResponse
    proceso: ProcesoOfertaResponse
    estado: str
    fecha_presentacion: datetime
    propuestas: List[PropuestaResponse] = []
    documentos: List[DocumentoResponse] = []
    personal_clave: List[PersonalClaveResponse] = []
    evaluaciones: List[EvaluacionResponse] = []
    analisis_ia: List[AnalisisIAResponse] = []

    model_config = {
        "from_attributes": True
    }
