import json
import os
import tempfile
import unittest
from datetime import datetime, timezone
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from fastapi import HTTPException, UploadFile

from app import ai_analysis, file_storage, models, schemas


class PdfStorageTests(unittest.IsolatedAsyncioTestCase):
    async def test_stores_and_reads_pdf_with_generated_key(self):
        with tempfile.TemporaryDirectory() as directory:
            with patch.object(file_storage, "UPLOAD_DIRECTORY", file_storage.Path(directory)):
                upload = UploadFile(filename="terms.pdf", file=BytesIO(b"%PDF-1.7 content"))
                storage_key = await file_storage.guardar_pdf(upload)

                self.assertRegex(storage_key, r"^[a-f0-9]{32}\.pdf$")
                self.assertEqual(file_storage.leer_pdf(storage_key), b"%PDF-1.7 content")

    async def test_rejects_non_pdf_content(self):
        upload = UploadFile(filename="proposal.pdf", file=BytesIO(b"not a pdf"))
        with self.assertRaises(HTTPException) as error:
            await file_storage.guardar_pdf(upload)
        self.assertEqual(error.exception.status_code, 400)

    def test_rejects_path_traversal_storage_keys(self):
        with self.assertRaises(HTTPException) as error:
            file_storage.leer_pdf("../secret.pdf")
        self.assertEqual(error.exception.status_code, 400)


class AiAnalysisTests(unittest.TestCase):
    def test_analysis_model_exposes_validated_json_result(self):
        analysis = models.AnalisisIA(
            id=1,
            oferta_id=2,
            evaluador_id=3,
            modelo="gpt-4o-mini",
            fecha_analisis=datetime.now(timezone.utc),
            resultado_json=json.dumps({
                "resumen": "Cumple",
                "estado_general": "cumple",
                "hallazgos": [],
                "recomendaciones": [],
            }),
        )

        result = schemas.AnalisisIAResponse.model_validate(analysis)

        self.assertEqual(result.resultado.estado_general, "cumple")

    @patch.dict(os.environ, {"OPENAI_API_KEY": "test-key"})
    @patch("app.ai_analysis.leer_pdf", return_value=b"%PDF-1.7 content")
    @patch("app.ai_analysis.OpenAI")
    def test_sends_documents_and_deletes_temporary_remote_files(self, openai_class, _):
        client = openai_class.return_value
        client.files.create.side_effect = [
            SimpleNamespace(id="tdr-id"),
            SimpleNamespace(id="proposal-id"),
        ]
        expected = {
            "resumen": "Cumple parcialmente",
            "estado_general": "cumple_parcialmente",
            "hallazgos": [{
                "requisito": "Experiencia mínima",
                "estado": "cumple",
                "evidencia": "Cuenta con experiencia acreditada.",
                "documento": "tecnica.pdf",
            }],
            "recomendaciones": [],
        }
        client.responses.create.return_value.output_text = json.dumps(expected)

        model, result = ai_analysis.analizar_documentos(
            "tdr.pdf",
            [("tecnica", "proposal.pdf")],
        )

        self.assertEqual(model, ai_analysis.DEFAULT_MODEL)
        self.assertEqual(result, expected)
        self.assertEqual(client.files.delete.call_count, 2)
        self.assertEqual(client.responses.create.call_args.kwargs["text"], {"format": {"type": "json_object"}})

    @patch.dict(os.environ, {}, clear=True)
    @patch("app.ai_analysis.OpenAI")
    def test_requires_openai_api_key(self, openai_class):
        with self.assertRaisesRegex(RuntimeError, "OPENAI_API_KEY"):
            ai_analysis.analizar_documentos("tdr.pdf", [("tecnica", "proposal.pdf")])
        openai_class.assert_not_called()
