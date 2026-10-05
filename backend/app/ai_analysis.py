import json
import logging
import os

from openai import OpenAI, OpenAIError

from .file_storage import leer_pdf

logger = logging.getLogger(__name__)
DEFAULT_MODEL = "gpt-4o-mini"


def analizar_documentos(tdr_key: str, propuestas: list[tuple[str, str]]) -> tuple[str, dict]:
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY no está configurada.")

    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    client = OpenAI(api_key=api_key)
    uploaded_file_ids: list[str] = []
    try:
        tdr_id = _subir_pdf(client, tdr_key, "TDR")
        uploaded_file_ids.append(tdr_id)
        proposal_inputs = []
        for tipo, storage_key in propuestas:
            file_id = _subir_pdf(client, storage_key, tipo)
            uploaded_file_ids.append(file_id)
            proposal_inputs.append({"type": "input_file", "file_id": file_id})

        prompt = (
            "Compara los documentos de propuesta con los requisitos del TDR adjunto. "
            "El primer archivo es el TDR; los demás son documentos de la oferta. "
            "No inventes evidencia: usa citas breves y señala el nombre del documento. "
            "Si un requisito no puede comprobarse desde los documentos, marca inconcluso o no_encontrado. "
            "No emitas una decisión legal ni sustituyas al evaluador humano. "
            "Devuelve únicamente JSON con esta estructura: "
            '{"resumen":"...","estado_general":"cumple|cumple_parcialmente|no_cumple|inconcluso",'
            '"hallazgos":[{"requisito":"...","estado":"cumple|no_cumple|no_encontrado|inconcluso",'
            '"evidencia":"...","documento":"..."}],"recomendaciones":["..."]}.'
        )
        response = client.responses.create(
            model=model,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": prompt},
                        {"type": "input_file", "file_id": tdr_id},
                        *proposal_inputs,
                    ],
                }
            ],
            text={"format": {"type": "json_object"}},
        )
        resultado = json.loads(response.output_text)
        if not isinstance(resultado, dict):
            raise ValueError("La respuesta de IA no contiene un objeto JSON.")
        return model, resultado
    except (OpenAIError, json.JSONDecodeError, ValueError):
        raise
    finally:
        for file_id in uploaded_file_ids:
            try:
                client.files.delete(file_id)
            except OpenAIError:
                logger.exception("No se pudo eliminar el archivo temporal %s en OpenAI", file_id)


def _subir_pdf(client: OpenAI, storage_key: str, nombre: str) -> str:
    contenido = leer_pdf(storage_key)
    archivo = client.files.create(
        file=(f"{nombre}.pdf", contenido, "application/pdf"),
        purpose="user_data",
    )
    return archivo.id
