from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Numeric, Date, Boolean, UniqueConstraint
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class Usuario(Base):
    __tablename__ = 'usuarios'
    id = Column(Integer, primary_key=True, index=True)
    nombre_completo = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    rol = Column(String(50), default='postulante')
    fecha_registro = Column(DateTime, default=datetime.utcnow)
    evaluaciones = relationship('Evaluacion', back_populates='evaluador')

class EntidadContratante(Base):
    __tablename__ = 'entidades_contratantes'
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(255), nullable=False)
    ruc = Column(String(11), unique=True, index=True, nullable=False)
    direccion = Column(String(255))
    procesos = relationship('ProcesoSeleccion', back_populates='entidad')

class ProcesoSeleccion(Base):
    __tablename__ = 'procesos_seleccion'
    id = Column(Integer, primary_key=True, index=True)
    entidad_id = Column(Integer, ForeignKey('entidades_contratantes.id'), nullable=False)
    codigo = Column(String(100), unique=True, index=True, nullable=False)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    estado = Column(String(50), default='publicado')
    fecha_publicacion = Column(DateTime, default=datetime.utcnow)
    fecha_cierre = Column(DateTime, nullable=False)
    entidad = relationship('EntidadContratante', back_populates='procesos')
    tdr = relationship('TDR', uselist=False, back_populates='proceso')
    requisitos_calificacion = relationship('RequisitoCalificacion', back_populates='proceso')
    factores_evaluacion = relationship('FactorEvaluacion', back_populates='proceso')
    reglas_validacion = relationship('ReglaValidacion', back_populates='proceso')
    ofertas = relationship('Oferta', back_populates='proceso')

class TDR(Base):
    __tablename__ = 'tdr'
    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey('procesos_seleccion.id'), unique=True, nullable=False)
    version = Column(String(20), default='1.0')
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    ruta_archivo = Column(String(512))
    proceso = relationship('ProcesoSeleccion', back_populates='tdr')
    requisitos_tecnicos = relationship('RequisitoTecnico', back_populates='tdr')

class RequisitoTecnico(Base):
    __tablename__ = 'requisitos_tecnicos'
    id = Column(Integer, primary_key=True, index=True)
    tdr_id = Column(Integer, ForeignKey('tdr.id'), nullable=False)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    tdr = relationship('TDR', back_populates='requisitos_tecnicos')

class RequisitoCalificacion(Base):
    __tablename__ = 'requisitos_calificacion'
    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey('procesos_seleccion.id'), nullable=False)
    titulo = Column(String(255), nullable=False)
    descripcion = Column(Text)
    obligatorio = Column(Boolean, default=True)
    proceso = relationship('ProcesoSeleccion', back_populates='requisitos_calificacion')

class FactorEvaluacion(Base):
    __tablename__ = 'factores_evaluacion'
    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey('procesos_seleccion.id'), nullable=False)
    nombre = Column(String(255), nullable=False)
    puntaje_maximo = Column(Integer, nullable=False)
    proceso = relationship('ProcesoSeleccion', back_populates='factores_evaluacion')
    detalles_evaluacion = relationship('DetalleEvaluacion', back_populates='factor')

class Postulante(Base):
    __tablename__ = 'postulantes'
    id = Column(Integer, primary_key=True, index=True)
    razon_social = Column(String(255), nullable=False)
    ruc = Column(String(11), unique=True, index=True, nullable=False)
    correo = Column(String(150), nullable=False)
    ofertas = relationship('Oferta', back_populates='postulante')

class Oferta(Base):
    __tablename__ = 'ofertas'
    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey('procesos_seleccion.id'), nullable=False)
    postulante_id = Column(Integer, ForeignKey('postulantes.id'), nullable=False)
    estado = Column(String(50), default='enviada')
    fecha_presentacion = Column(DateTime, default=datetime.utcnow)
    __table_args__ = (UniqueConstraint('postulante_id', 'proceso_id', name='unique_postulante_proceso'),)
    proceso = relationship('ProcesoSeleccion', back_populates='ofertas')
    postulante = relationship('Postulante', back_populates='ofertas')
    propuestas = relationship('Propuesta', back_populates='oferta')
    documentos = relationship('Documento', back_populates='oferta')
    personal_clave = relationship('PersonalClave', back_populates='oferta')
    evaluaciones = relationship('Evaluacion', back_populates='oferta')

class Propuesta(Base):
    __tablename__ = 'propuestas'
    id = Column(Integer, primary_key=True, index=True)
    oferta_id = Column(Integer, ForeignKey('ofertas.id'), nullable=False)
    tipo = Column(String(50), nullable=False)
    ruta_archivo = Column(String(512), nullable=False)
    oferta = relationship('Oferta', back_populates='propuestas')

class Documento(Base):
    __tablename__ = 'documentos'
    id = Column(Integer, primary_key=True, index=True)
    oferta_id = Column(Integer, ForeignKey('ofertas.id'), nullable=False)
    tipo = Column(String(100))
    ruta_archivo = Column(String(512), nullable=False)
    oferta = relationship('Oferta', back_populates='documentos')

class PersonalClave(Base):
    __tablename__ = 'personal_clave'
    id = Column(Integer, primary_key=True, index=True)
    oferta_id = Column(Integer, ForeignKey('ofertas.id'), nullable=False)
    nombre = Column(String(255), nullable=False)
    cargo = Column(String(150), nullable=False)
    experiencia = Column(String(255))
    oferta = relationship('Oferta', back_populates='personal_clave')

class ReglaValidacion(Base):
    __tablename__ = 'reglas_validacion'
    id = Column(Integer, primary_key=True, index=True)
    proceso_id = Column(Integer, ForeignKey('procesos_seleccion.id'), nullable=False)
    descripcion = Column(Text, nullable=False)
    severidad = Column(String(50))
    activa = Column(Boolean, default=True)
    proceso = relationship('ProcesoSeleccion', back_populates='reglas_validacion')

class Evaluacion(Base):
    __tablename__ = 'evaluaciones'
    id = Column(Integer, primary_key=True, index=True)
    oferta_id = Column(Integer, ForeignKey('ofertas.id'), nullable=False)
    usuario_id = Column(Integer, ForeignKey('usuarios.id'), nullable=False)
    estado = Column(String(50), default='pendiente')
    puntaje_total = Column(Numeric(5, 2), default=0.00)
    observaciones = Column(Text)
    oferta = relationship('Oferta', back_populates='evaluaciones')
    evaluador = relationship('Usuario', back_populates='evaluaciones')
    detalles = relationship('DetalleEvaluacion', back_populates='evaluacion')

class DetalleEvaluacion(Base):
    __tablename__ = 'detalle_evaluacion'
    id = Column(Integer, primary_key=True, index=True)
    evaluacion_id = Column(Integer, ForeignKey('evaluaciones.id'), nullable=False)
    factor_id = Column(Integer, ForeignKey('factores_evaluacion.id'), nullable=False)
    puntaje = Column(Numeric(5, 2), nullable=False)
    evaluacion = relationship('Evaluacion', back_populates='detalles')
    factor = relationship('FactorEvaluacion', back_populates='detalles_evaluacion')
