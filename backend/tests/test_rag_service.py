import unittest
from datetime import datetime, timezone

import fitz
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models, rag_service
from app.database import Base


class RagServiceTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.user = models.Usuario(
            nombre_completo="Postulante Uno",
            email="uno@example.com",
            password_hash="hash",
            rol="postulante",
        )
        other_user = models.Usuario(
            nombre_completo="Postulante Dos",
            email="dos@example.com",
            password_hash="hash",
            rol="postulante",
        )
        entidad = models.EntidadContratante(nombre="Entidad", ruc="12345678901")
        self.session.add_all([self.user, other_user, entidad])
        self.session.flush()
        proceso = models.ProcesoSeleccion(
            entidad_id=entidad.id,
            codigo="PROC-1",
            titulo="Servicio",
            fecha_cierre=datetime.now(timezone.utc),
            estado="publicado",
        )
        self.session.add(proceso)
        self.session.flush()
        self.session.add(models.TDR(
            proceso_id=proceso.id,
            titulo="Términos de referencia",
            ruta_archivo="a" * 32 + ".pdf",
        ))
        postulante_uno = models.Postulante(
            razon_social="Empresa Uno",
            ruc="12345678902",
            correo=self.user.email,
        )
        postulante_dos = models.Postulante(
            razon_social="Empresa Dos",
            ruc="12345678903",
            correo=other_user.email,
        )
        self.session.add_all([postulante_uno, postulante_dos])
        self.session.flush()
        offer_one = models.Oferta(proceso_id=proceso.id, postulante_id=postulante_uno.id)
        offer_two = models.Oferta(proceso_id=proceso.id, postulante_id=postulante_dos.id)
        self.session.add_all([offer_one, offer_two])
        self.session.flush()
        self.session.add_all([
            models.Propuesta(oferta_id=offer_one.id, tipo="tecnica", ruta_archivo="b" * 32 + ".pdf"),
            models.Propuesta(oferta_id=offer_two.id, tipo="tecnica", ruta_archivo="c" * 32 + ".pdf"),
        ])
        self.session.commit()
        self.process_id = proceso.id
        self.evaluator = models.Usuario(
            nombre_completo="Evaluador",
            email="evaluador@example.com",
            password_hash="hash",
            rol="evaluador",
        )

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_postulante_only_retrieves_own_offer_documents(self):
        sources = rag_service.obtener_documentos_autorizados(
            self.session, self.user, self.process_id
        )

        self.assertEqual(
            {source.storage_key for source in sources},
            {"a" * 32 + ".pdf", "b" * 32 + ".pdf"},
        )

    def test_evaluator_can_retrieve_offers_for_selected_process(self):
        self.session.add(self.evaluator)
        self.session.commit()

        sources = rag_service.obtener_documentos_autorizados(
            self.session, self.evaluator, self.process_id
        )

        self.assertEqual(
            {source.storage_key for source in sources},
            {"a" * 32 + ".pdf", "b" * 32 + ".pdf", "c" * 32 + ".pdf"},
        )

    def test_postulante_cannot_retrieve_unpublished_process(self):
        proceso = self.session.query(models.ProcesoSeleccion).filter(
            models.ProcesoSeleccion.id == self.process_id
        ).first()
        proceso.estado = "cerrado"
        self.session.commit()

        sources = rag_service.obtener_documentos_autorizados(
            self.session, self.user, self.process_id
        )

        self.assertEqual(sources, [])

    def test_scanned_pdf_without_text_is_rejected(self):
        document = fitz.open()
        document.new_page()
        content = document.tobytes()
        document.close()

        with self.assertRaisesRegex(ValueError, "no contiene texto extraíble"):
            rag_service.dividir_en_fragmentos(content)

    def test_retrieval_uses_cosine_similarity(self):
        self.assertAlmostEqual(rag_service.similitud_coseno([1, 0], [0.9, 0.1]), 0.9938837, places=6)

    def test_assistant_citations_are_resolved_to_server_owned_sources(self):
        chunk = models.FragmentoDocumento(
            id=1,
            storage_key="a" * 32 + ".pdf",
            chunk_index=0,
            proceso_id=self.process_id,
            tipo_documento="TDR",
            nombre_documento="Términos de referencia",
            pagina=2,
            contenido="Experiencia mínima de cinco años.",
            embedding_json="[1, 0]",
        )

        class FakeProvider:
            chat_model = "test-model"

            @staticmethod
            def answer(question, context, role):
                return '{"respuesta":"Se requieren cinco años [S1].","citas":[{"source_id":"S1"}]}'

        response = rag_service.responder_pregunta(FakeProvider(), "¿Qué experiencia?", [(chunk, 1.0)], "evaluador")

        self.assertEqual(response.citas[0].documento, "Términos de referencia")
        self.assertEqual(response.citas[0].pagina, 2)
        self.assertEqual(response.citas[0].oferta_id, None)

    def test_assistant_rejects_citations_to_unretrieved_sources(self):
        chunk = models.FragmentoDocumento(
            id=1,
            storage_key="a" * 32 + ".pdf",
            chunk_index=0,
            proceso_id=self.process_id,
            tipo_documento="TDR",
            nombre_documento="Términos de referencia",
            pagina=2,
            contenido="Experiencia mínima de cinco años.",
            embedding_json="[1, 0]",
        )

        class FakeProvider:
            chat_model = "test-model"

            @staticmethod
            def answer(question, context, role):
                return '{"respuesta":"Se requiere [S2].","citas":[{"source_id":"S2"}]}'

        with self.assertLogs(rag_service.logger, level="ERROR"):
            with self.assertRaisesRegex(ValueError, "respuesta verificable"):
                rag_service.responder_pregunta(
                    FakeProvider(),
                    "¿Qué experiencia?",
                    [(chunk, 1.0)],
                    "evaluador",
                )
