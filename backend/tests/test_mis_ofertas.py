import unittest
from datetime import datetime, timezone

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models
from app.database import Base
from app.routers.ofertas import listar_mis_ofertas
from app.schemas import OfertaResponse


class MisOfertasTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()
        self.applicant = models.Usuario(
            nombre_completo="Postulante Uno",
            email="uno@example.com",
            password_hash="hash",
            rol="postulante",
        )
        other_applicant = models.Usuario(
            nombre_completo="Postulante Dos",
            email="dos@example.com",
            password_hash="hash",
            rol="postulante",
        )
        entity = models.EntidadContratante(nombre="Entidad", ruc="20123456789")
        self.session.add_all([self.applicant, other_applicant, entity])
        self.session.flush()
        process = models.ProcesoSeleccion(
            entidad_id=entity.id,
            codigo="PROC-1",
            titulo="Proceso de prueba",
            fecha_cierre=datetime(2027, 1, 1),
        )
        self.session.add(process)
        self.session.flush()
        applicant_one = models.Postulante(
            razon_social="Empresa Uno",
            ruc="20123456780",
            correo=self.applicant.email,
        )
        applicant_two = models.Postulante(
            razon_social="Empresa Dos",
            ruc="20123456781",
            correo=other_applicant.email,
        )
        self.session.add_all([applicant_one, applicant_two])
        self.session.flush()
        self.own_offer = models.Oferta(
            proceso_id=process.id,
            postulante_id=applicant_one.id,
            fecha_presentacion=datetime.now(timezone.utc),
        )
        other_offer = models.Oferta(
            proceso_id=process.id,
            postulante_id=applicant_two.id,
        )
        self.session.add_all([self.own_offer, other_offer])
        self.session.commit()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def test_applicant_only_sees_their_own_offers(self):
        offers = listar_mis_ofertas(self.applicant, self.session)

        self.assertEqual([offer.id for offer in offers], [self.own_offer.id])

    def test_my_offer_response_includes_company_and_process_summary(self):
        offer = listar_mis_ofertas(self.applicant, self.session)[0]

        result = OfertaResponse.model_validate(offer)

        self.assertEqual(result.postulante.razon_social, "Empresa Uno")
        self.assertEqual(result.postulante.correo, "uno@example.com")
        self.assertEqual(result.proceso.codigo, "PROC-1")
