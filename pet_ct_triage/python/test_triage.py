#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SUITE DE PRUEBAS UNITARIAS - TRIAJE Y AGENDAMIENTO PET/CT
==============================================================================
"""

import unittest
import datetime
from pet_ct_triage import (
    evaluate_triage,
    evaluate_technical_alerts,
    get_video_guide_url,
    schedule_appointment,
    process_batch,
    VIDEO_URLS
)

class TestPETCTTriage(unittest.TestCase):
    def setUp(self):
        self.ref_date = datetime.date(2026, 9, 7) # Lunes 7 de Septiembre 2026

    def test_p1_hospitalized_patient(self):
        """Verificar P1 para paciente ingresado en planta"""
        patient = {
            "id": "T01",
            "ubicacion": "Ingresado en Planta",
            "motivo": "Estadificación",
            "radiofarmaco": "18F-FDG"
        }
        priority, max_days = evaluate_triage(patient)
        self.assertEqual(priority, "🔴 P1")
        self.assertEqual(max_days, 7)

    def test_p1_rapid_psa_duplication(self):
        """Verificar P1 para cáncer de próstata con duplicación PSA < 3 meses"""
        patient = {
            "id": "T02",
            "ubicacion": "Ambulatorio",
            "motivo": "Cáncer de Próstata",
            "psa_duplicacion": "< 3 meses",
            "radiofarmaco": "68Ga-PSMA"
        }
        priority, _ = evaluate_triage(patient)
        self.assertEqual(priority, "🔴 P1")

    def test_p1_prosthesis_endocarditis(self):
        """Verificar P1 para infección/inflamación grave (Endocarditis sobre prótesis)"""
        patient = {
            "id": "T03",
            "ubicacion": "Ambulatorio",
            "infeccion": "Endocarditis sobre prótesis valvular",
            "radiofarmaco": "18F-FDG"
        }
        priority, _ = evaluate_triage(patient)
        self.assertEqual(priority, "🔴 P1")

    def test_p2_initial_staging_cpnm(self):
        """Verificar P2 para estadificación inicial de Pulmón CPNM"""
        patient = {
            "id": "T04",
            "ubicacion": "Ambulatorio",
            "motivo": "Estadificación inicial oncológica",
            "tipo_cancer": "Pulmón CPNM",
            "radiofarmaco": "18F-FDG"
        }
        priority, max_days = evaluate_triage(patient)
        self.assertEqual(priority, "🟡 P2")
        self.assertEqual(max_days, 14)

    def test_p2_parathyroid_adenoma(self):
        """Verificar P2 para Adenoma de Paratiroides"""
        patient = {
            "id": "T05",
            "ubicacion": "Ambulatorio",
            "patologia_especifica": "Adenoma de Paratiroides",
            "radiofarmaco": "18F-Choline"
        }
        priority, _ = evaluate_triage(patient)
        self.assertEqual(priority, "🟡 P2")

    def test_p3_solitary_pulmonary_nodule(self):
        """Verificar P3 para Nódulo Solitario de Pulmón (NSP)"""
        patient = {
            "id": "T06",
            "ubicacion": "Ambulatorio",
            "motivo": "Nódulo Solitario de Pulmón (NSP)",
            "radiofarmaco": "18F-FDG"
        }
        priority, max_days = evaluate_triage(patient)
        self.assertEqual(priority, "🟢 P3")
        self.assertEqual(max_days, 30)

    def test_p3_neuro_amyloid(self):
        """Verificar P3 para PET Neurológico (Amiloide/Tau/Demencias)"""
        patient = {
            "id": "T07",
            "ubicacion": "Ambulatorio",
            "motivo": "PET Neurológico (Deterioro cognitivo / Amiloide)",
            "radiofarmaco": "18F-FDG"
        }
        priority, _ = evaluate_triage(patient)
        self.assertEqual(priority, "🟢 P3")

    def test_qtrt_recent_alert_and_date_shift(self):
        """Verificar que QT/RT finalizada hace < 21 días genera alerta y desplaza la cita"""
        fin_date = self.ref_date - datetime.timedelta(days=10) # Finalizó hace 10 días
        patient = {
            "id": "T08",
            "ubicacion": "Ambulatorio",
            "motivo": "Valoración de respuesta",
            "fin_qtrt": fin_date.strftime("%Y-%m-%d"),
            "radiofarmaco": "18F-FDG"
        }
        alerts, has_diabetes, min_date = evaluate_technical_alerts(patient, self.ref_date)
        self.assertIn("QT/RT RECIENTE", alerts)
        
        # Fecha mínima asignable debe ser fin_date + 21 días = ref_date + 11 días
        expected_min_date = fin_date + datetime.timedelta(days=21)
        self.assertEqual(min_date, expected_min_date)

    def test_diabetes_protocol_alert_and_url(self):
        """Verificar que Glucemia > 180 mg/dL activa alerta y enlace de diabetes"""
        patient = {
            "id": "T09",
            "ubicacion": "Ambulatorio",
            "motivo": "Estadificación",
            "glucemia": 210,
            "radiofarmaco": "18F-FDG"
        }
        alerts, has_diabetes, _ = evaluate_technical_alerts(patient, self.ref_date)
        self.assertTrue(has_diabetes)
        self.assertIn("PROTOCOLO DIABETES", alerts)

        video_url = get_video_guide_url("18F-FDG", has_diabetes)
        self.assertEqual(video_url, VIDEO_URLS["FDG_DIABETES"])

    def test_weekly_schedule_radiopharmaceutical_days(self):
        """Verificar que Fluor-PSMA solo se agenda los Martes y Colina los Miércoles"""
        patient_psma = {
            "id": "T10",
            "ubicacion": "Ambulatorio",
            "motivo": "Recidiva",
            "radiofarmaco": "Fluor-PSMA"
        }
        occupied_map = {}
        res_psma = schedule_appointment(patient_psma, occupied_map, self.ref_date)
        # ref_date es Lunes 2026-09-07. Próximo martes es 2026-09-08
        self.assertEqual(res_psma["fecha_cita"], "2026-09-08")

        patient_colina = {
            "id": "T11",
            "ubicacion": "Ambulatorio",
            "motivo": "Adenoma Paratiroides",
            "radiofarmaco": "18F-Colina"
        }
        res_colina = schedule_appointment(patient_colina, occupied_map, self.ref_date)
        # Próximo miércoles es 2026-09-09
        self.assertEqual(res_colina["fecha_cita"], "2026-09-09")

    def test_slot_overflow(self):
        """Verificar el salto al siguiente día disponible cuando se agota la capacidad del día"""
        patients = []
        # Crear 8 pacientes para FDG el Lunes (capacidad 7)
        for i in range(8):
            patients.append({
                "id": f"FDG_{i+1}",
                "ubicacion": "Ambulatorio",
                "motivo": "Estadificación",
                "radiofarmaco": "18F-FDG"
            })

        results, occupied = process_batch(patients, self.ref_date)
        
        # 7 deben agendarse el Lunes 2026-09-07 (si se busca desde mañana ref_date + 1 = Mar 8, etc.)
        # ref_date + 1 día es Martes 2026-09-08.
        # Martes 8 tiene capacidad 4 para FDG.
        # Los primeros 4 van al Martes 8, los siguientes 3 van al Jueves 10 (Miércoles es Colina).
        martes_count = sum(1 for r in results if r["fecha_cita"] == "2026-09-08")
        jueves_count = sum(1 for r in results if r["fecha_cita"] == "2026-09-10")

        self.assertEqual(martes_count, 4)
        self.assertEqual(jueves_count, 4)

if __name__ == "__main__":
    unittest.main()
