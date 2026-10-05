import json
import logging
import math
import re
from dataclasses import dataclass

import fitz
from openai import OpenAIError
from sqlalchemy.orm import Session

from . import models, schemas
from .ai_provider import OpenAIProvider
from .file_storage import leer_pdf

logger = logging.getLogger(__name__)
CHUNK_CHARACTERS = 1200
CHUNK_OVERLAP = 160
MAX_CHUNKS_PER_PDF = 60
MAX_DOCUMENTS_PER_QUERY = 20
MAX_RETRIEVED_CHUNKS = 8


@dataclass(frozen=True)
class DocumentSource:
    storage_key: str
    process_id: int
    document_type: str
    name: str
    offer_id: int | None = None


def obtener_documentos_autorizados(
    db: Session,
    user: models.Usuario,
    proceso_id: int,
) -> list[DocumentSource]:
    proceso = db.query(models.ProcesoSeleccion).filter(
        models.ProcesoSeleccion.id == proceso_id
    ).first()
    if proceso is None:
        return []
    if user.rol == "postulante" and proceso.estado != "publicado":
        return []
    if user.rol not in {"postulante", "evaluador", "superadmin"}:
        return []

    sources: list[DocumentSource] = []
    if proceso.tdr and proceso.tdr.ruta_archivo:
        sources.append(DocumentSource(
            storage_key=proceso.tdr.ruta_archivo,
            process_id=proceso.id,
            document_type="TDR",
            name=proceso.tdr.titulo,
        ))

    offer_query = db.query(models.Oferta).filter(models.Oferta.proceso_id == proceso_id)
    if user.rol == "postulante":
        postulante = db.query(models.Postulante).filter(
            models.Postulante.correo == user.email
        ).first()
        if postulante is None:
            return sources
        offer_query = offer_query.filter(models.Oferta.postulante_id == postulante.id)

    for offer in offer_query.all():
        for proposal in offer.propuestas:
            sources.append(DocumentSource(
                storage_key=proposal.ruta_archivo,
                process_id=proceso.id,
                document_type=proposal.tipo,
                name=f"{proposal.tipo} · oferta {offer.id}",
                offer_id=offer.id,
            ))
        for document in offer.documentos:
            sources.append(DocumentSource(
                storage_key=document.ruta_archivo,
                process_id=proceso.id,
                document_type=document.tipo or "Documento",
                name=f"{document.tipo or 'Documento'} · oferta {offer.id}",
                offer_id=offer.id,
            ))
    return sources


def dividir_en_fragmentos(pdf_bytes: bytes) -> list[tuple[int, str]]:
    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
    except (fitz.FileDataError, ValueError) as error:
        raise ValueError("No se pudo leer el PDF. Verifica que no esté dañado.") from error

    fragments: list[tuple[int, str]] = []
    for page_index, page in enumerate(document):
        text = re.sub(r"\s+", " ", page.get_text("text")).strip()
        if not text:
            continue
        start = 0
        while start < len(text):
            end = min(start + CHUNK_CHARACTERS, len(text))
            if end < len(text):
                sentence_break = text.rfind(" ", start + CHUNK_CHARACTERS // 2, end)
                if sentence_break > start:
                    end = sentence_break
            fragment = text[start:end].strip()
            if fragment:
                fragments.append((page_index + 1, fragment))
            if end >= len(text):
                break
            start = max(end - CHUNK_OVERLAP, start + 1)

    if not fragments:
        raise ValueError("El PDF no contiene texto extraíble; los documentos escaneados requieren OCR.")
    if len(fragments) > MAX_CHUNKS_PER_PDF:
        raise ValueError(
            f"El PDF supera el límite de {MAX_CHUNKS_PER_PDF} fragmentos para el asistente."
        )
    return fragments


def indexar_fuentes(
    db: Session,
    provider: OpenAIProvider,
    sources: list[DocumentSource],
) -> list[models.FragmentoDocumento]:
    indexed: list[models.FragmentoDocumento] = []
    for source in sources:
        chunks = db.query(models.FragmentoDocumento).filter(
            models.FragmentoDocumento.storage_key == source.storage_key
        ).order_by(models.FragmentoDocumento.chunk_index).all()
        if not chunks:
            fragments = dividir_en_fragmentos(leer_pdf(source.storage_key))
            embeddings = provider.embed([fragment for _, fragment in fragments])
            if len(embeddings) != len(fragments):
                raise ValueError("El proveedor de embeddings devolvió una cantidad inesperada de vectores.")
            chunks = [
                models.FragmentoDocumento(
                    storage_key=source.storage_key,
                    chunk_index=index,
                    proceso_id=source.process_id,
                    oferta_id=source.offer_id,
                    tipo_documento=source.document_type,
                    nombre_documento=source.name,
                    pagina=page,
                    contenido=text,
                    embedding_json=json.dumps(embedding),
                )
                for index, ((page, text), embedding) in enumerate(zip(fragments, embeddings))
            ]
            db.add_all(chunks)
            db.commit()
        indexed.extend(chunks)
    return indexed


def recuperar_fragmentos(
    provider: OpenAIProvider,
    pregunta: str,
    chunks: list[models.FragmentoDocumento],
) -> list[tuple[models.FragmentoDocumento, float]]:
    query_embedding = provider.embed([pregunta])[0]
    ranked = [
        (chunk, similitud_coseno(query_embedding, json.loads(chunk.embedding_json)))
        for chunk in chunks
    ]
    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked[:MAX_RETRIEVED_CHUNKS]


def similitud_coseno(left: list[float], right: list[float]) -> float:
    if len(left) != len(right):
        raise ValueError("Las dimensiones de los embeddings no coinciden.")
    left_norm = math.sqrt(sum(value * value for value in left))
    right_norm = math.sqrt(sum(value * value for value in right))
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return sum(a * b for a, b in zip(left, right)) / (left_norm * right_norm)


def responder_pregunta(
    provider: OpenAIProvider,
    pregunta: str,
    retrieved: list[tuple[models.FragmentoDocumento, float]],
    role: str,
) -> schemas.RespuestaAsistente:
    source_by_id: dict[str, models.FragmentoDocumento] = {}
    context_parts = []
    for chunk, _ in retrieved:
        source_id = f"S{len(source_by_id) + 1}"
        source_by_id[source_id] = chunk
        context_parts.append(
            f"[{source_id}] {chunk.nombre_documento}, página {chunk.pagina}:\n{chunk.contenido}"
        )

    try:
        response_data = json.loads(provider.answer(pregunta, "\n\n".join(context_parts), role))
        answer = response_data["respuesta"]
        citations = response_data.get("citas", [])
        if not isinstance(answer, str) or not isinstance(citations, list):
            raise ValueError("El modelo devolvió una respuesta con formato inválido.")
        parsed_citations = []
        cited_source_ids = set()
        for citation in citations:
            if not isinstance(citation, dict):
                raise ValueError("El modelo devolvió una cita con formato inválido.")
            source_id = citation.get("source_id")
            chunk = source_by_id.get(source_id)
            if chunk is None:
                raise ValueError("El modelo citó una fuente que no fue recuperada.")
            if source_id in cited_source_ids:
                continue
            cited_source_ids.add(source_id)
            parsed_citations.append(schemas.CitaAsistente(
                documento=chunk.nombre_documento,
                tipo_documento=chunk.tipo_documento,
                pagina=chunk.pagina,
                oferta_id=chunk.oferta_id,
            ))
        if any(source_id not in cited_source_ids for source_id in re.findall(r"\[(S\d+)\]", answer)):
            raise ValueError("La respuesta contiene una cita sin fuente verificable.")
        return schemas.RespuestaAsistente(
            respuesta=answer,
            citas=parsed_citations,
            modelo=provider.chat_model,
        )
    except (json.JSONDecodeError, KeyError, TypeError, ValueError) as error:
        logger.exception("Respuesta RAG del modelo inválida")
        raise ValueError("El asistente no pudo generar una respuesta verificable.") from error


def responder_sobre_proceso(
    db: Session,
    user: models.Usuario,
    proceso_id: int,
    pregunta: str,
) -> schemas.RespuestaAsistente:
    provider = OpenAIProvider()
    sources = obtener_documentos_autorizados(db, user, proceso_id)
    if not sources:
        raise LookupError("No hay documentos disponibles para esta consulta.")
    if len(sources) > MAX_DOCUMENTS_PER_QUERY:
        raise ValueError(
            f"Este proceso supera el límite de {MAX_DOCUMENTS_PER_QUERY} documentos por consulta."
        )
    try:
        chunks = indexar_fuentes(db, provider, sources)
        retrieved = recuperar_fragmentos(provider, pregunta, chunks)
        return responder_pregunta(provider, pregunta, retrieved, user.rol)
    except (OpenAIError, ValueError):
        logger.exception("Falló la consulta RAG para el proceso %s", proceso_id)
        raise
