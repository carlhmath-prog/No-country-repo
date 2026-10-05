import unittest
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models, schemas
from app.database import Base
from app.routers.procesos import crear_proceso, listar_procesos


class CrearProcesoTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = sessionmaker(bind=self.engine)()

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def payload(self, **entity_fields):
        return schemas.ProcesoSeleccionCreate(
            codigo="PROC-TEST",
            titulo="Servicio de prueba",
            descripcion="Descripción",
            fecha_cierre=datetime(2027, 1, 1, tzinfo=timezone.utc),
            entidad=entity_fields or {
                "nombre": "Entidad de prueba",
                "ruc": "20123456789",
            },
            tdr={"titulo": "TDR de prueba"},
        )

    def test_creates_entity_and_process_together(self):
        process = crear_proceso(self.payload(), self.session)

        self.assertEqual(process.entidad.nombre, "Entidad de prueba")
        self.assertEqual(process.entidad.ruc, "20123456789")
        self.assertEqual(process.tdr.titulo, "TDR de prueba")

    def test_rejects_past_closing_date(self):
        payload = schemas.ProcesoSeleccionCreate(
            codigo="PROC-TEST",
            titulo="Servicio vencido",
            fecha_cierre=datetime(2020, 1, 1, tzinfo=timezone.utc),
            entidad={"nombre": "Entidad", "ruc": "20123456789"},
            tdr={"titulo": "TDR de prueba"},
        )

        with self.assertRaises(HTTPException) as error:
            crear_proceso(payload, self.session)

        self.assertEqual(error.exception.status_code, 422)
        self.assertEqual(self.session.query(models.ProcesoSeleccion).count(), 0)

    def test_reuses_entity_with_same_tax_id(self):
        self.session.add(models.EntidadContratante(
            nombre="Entidad existente",
            ruc="20123456789",
        ))
        self.session.commit()

        process = crear_proceso(self.payload(), self.session)

        self.assertEqual(process.entidad.nombre, "Entidad existente")
        self.assertEqual(self.session.query(models.EntidadContratante).count(), 1)

    def test_rejects_unknown_entity_id_without_database_error(self):
        payload = schemas.ProcesoSeleccionCreate(
            codigo="PROC-TEST",
            titulo="Servicio de prueba",
            fecha_cierre=datetime(2027, 1, 1, tzinfo=timezone.utc),
            entidad_id=999,
            tdr={"titulo": "TDR de prueba"},
        )

        with self.assertRaises(HTTPException) as error:
            crear_proceso(payload, self.session)

        self.assertEqual(error.exception.status_code, 404)
        self.assertIn("entidad contratante", error.exception.detail)
        self.assertEqual(self.session.query(models.ProcesoSeleccion).count(), 0)

    def test_schema_requires_exactly_one_entity_reference(self):
        with self.assertRaises(ValueError):
            schemas.ProcesoSeleccionCreate(
                codigo="PROC-TEST",
                titulo="Servicio de prueba",
                fecha_cierre=datetime(2027, 1, 1, tzinfo=timezone.utc),
                tdr={"titulo": "TDR de prueba"},
            )

    def test_public_process_list_excludes_expired_and_unpublished(self):
        entidad = models.EntidadContratante(nombre="Entidad", ruc="20123456789")
        self.session.add(entidad)
        self.session.flush()
        self.session.add_all([
            models.ProcesoSeleccion(
                entidad_id=entidad.id,
                codigo="OPEN",
                titulo="Proceso vigente",
                estado="publicado",
                fecha_cierre=datetime(2027, 1, 1),
            ),
            models.ProcesoSeleccion(
                entidad_id=entidad.id,
                codigo="EXPIRED",
                titulo="Proceso vencido",
                estado="publicado",
                fecha_cierre=datetime(2025, 1, 1),
            ),
            models.ProcesoSeleccion(
                entidad_id=entidad.id,
                codigo="DRAFT",
                titulo="Proceso no publicado",
                estado="borrador",
                fecha_cierre=datetime(2027, 1, 1),
            ),
        ])
        self.session.commit()

        processes = listar_procesos(self.session)

        self.assertEqual([process.codigo for process in processes], ["OPEN"])
