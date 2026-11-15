#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
GENERADOR AUTOMÁTICO DE DATASET DE 250 PACIENTES REALES PET/CT
Generación basada en distribuciones estadísticas reales (Julio 2026 - Actualidad)
==============================================================================
"""

import csv
import json
import random
import datetime

# Reference Dates
START_DATE = datetime.date(2026, 7, 1)
CURRENT_DATE = datetime.date(2026, 9, 10)

# Statistical Targets (Total = 250)
TOTAL_PATIENTS = 250

# Radioisotope Weights
# 65% FDG (163), 20% PSMA (50), 8% DOTATOC (20), 4% Amiloide (10), 3% Colina/Otros (7)
RADIOFARMACOS_POOL = (
    ["18F-FDG"] * 163 +
    ["Fluor-PSMA"] * 25 + ["68Ga-PSMA"] * 25 +
    ["68Ga-DOTATATE / Somatostatina"] * 20 +
    ["PET Neurológico / Amiloide"] * 10 +
    ["18F-Colina"] * 7
)

# Priority Weights
# 30% Urgente (75), 20% Preferente (50), 50% Normal (125)
PRIORITIES_POOL = (
    ["🔴 Urgente"] * 75 +
    ["🟡 Preferente"] * 50 +
    ["🟢 Ordinaria"] * 125
)

# Spanish Names Data
MALE_NAMES = [
    "Carlos", "Alejandro", "Javier", "Manuel", "David", "Daniel", "Miguel", "Rafael",
    "Álvaro", "Fernando", "Sergio", "Gonzalo", "Pablo", "José Luis", "Antonio", "Francisco",
    "Jorge", "Enrique", "Ramón", "Alberto", "Diego", "Rubén", "Marcos", "Iván", "Guillermo"
]

FEMALE_NAMES = [
    "María", "Carmen", "Lucía", "Ana", "Elena", "Laura", "Marta", "Sara", "Paula", "Cristina",
    "Isabel", "Sofía", "Beatriz", "Silvia", "Teresa", "Patricia", "Rocío", "Alicia", "Rosa",
    "Pilar", "Nuria", "Mónica", "Inés", "Irene", "Clara"
]

SURNAMES = [
    "García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez",
    "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno", "Muñoz", "Álvarez",
    "Romero", "Alonso", "Gutiérrez", "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos"
]

SERVICES = [
    "Oncología Médica", "Hematología", "Neumología", "Urología", "Neurología",
    "Cirugía General", "Medicina Interna", "Infectología", "Cardiología", "Aparato Digestivo"
]

DOCTORS = [
    "Dra. Elena Gómez", "Dr. Javier Martínez", "Dra. Sofía Fernández", "Dr. Antonio López",
    "Dra. Lucía Sánchez", "Dr. Miguel Ramírez", "Dra. Carmen Ruiz", "Dr. Fernando García",
    "Dra. Isabel Navarro", "Dr. Carlos Rodríguez"
]

DIAGNOSES_BY_RF = {
    "18F-FDG": [
        "Carcinoma de Pulmón CPNM (Estadio III)", "Linfoma de Hodgkin", "Linfoma No Hodgkin Difuso",
        "Melanoma Metastásico", "Cáncer de Cérvix Uterino", "Carcinoma de Esófago",
        "Nódulo Solitario de Pulmón (NSP)", "Tumor Primario Desconocido (CUP)",
        "Sospecha de Endocarditis Bacteriana", "Vasculitis de Grandes Vasos"
    ],
    "Fluor-PSMA": [
        "Adenocarcinoma de Próstata (Elevación de PSA)", "Recidiva Bioquímica de Cáncer de Próstata",
        "Reestadificación de Ca. Próstata Alto Riesgo"
    ],
    "68Ga-PSMA": [
        "Adenocarcinoma de Próstata Resistente a Castración", "Cáncer de Próstata con Duplicación Rápida PSA",
        "Evaluación previa a Terapia Lu-177 PSMA"
    ],
    "68Ga-DOTATATE / Somatostatina": [
        "Tumor Neuroendocrino Pancreático (TNE G2)", "Tumor Neuroendocrino Intestinal (TNE G1)",
        "Carcinoma Neuroendocrino Pulmonar"
    ],
    "PET Neurológico / Amiloide": [
        "Deterioro Cognitivo Leve / Sospecha Alzheimer", "Demencia Temprana de Perfil Amiloide",
        "Mapeo de Epilepsia Refractaria"
    ],
    "18F-Colina": [
        "Adenoma de Paratiroides / Hiperparatiroidismo", "Recidiva Local de Cáncer de Próstata"
    ]
}

MOTIVES = {
    "🔴 Urgente": [
        "Evaluación prequirúrgica urgente por cambio de conducta terapéutica",
        "Sospecha de recidiva agudizada con peligro vital",
        "Paciente ingresado en planta con deterioro clínico rápido",
        "Sospecha de endocarditis sobre prótesis valvular aguda"
    ],
    "🟡 Preferente": [
        "Estadificación inicial previa a inicio de quimioterapia",
        "Evaluación de respuesta a tratamiento oncológico (2º ciclo)",
        "Reestadificación por elevación de marcadores tumorales",
        "Recidiva bioquímica preferente"
    ],
    "🟢 Ordinaria": [
        "Caracterización de Nódulo Solitario de Pulmón (NSP)",
        "Seguimiento anual de paciente en remisión completa",
        "Evaluación de deterioro cognitivo / placa amiloide",
        "Estudio ordinario de control"
    ]
}

ALLERGIES_LIST = ["Ninguna", "Ninguna", "Ninguna", "Ninguna", "Yodo", "Contrastes iodados", "Látex", "Penicilina"]


def add_business_days(start_date: datetime.date, num_days: int) -> datetime.date:
    """Calcula la fecha límite sumando exactamente días laborables (Mon-Fri)"""
    curr = start_date
    added = 0
    while added < num_days:
        curr += datetime.timedelta(days=1)
        if curr.weekday() < 5:
            added += 1
    return curr


def generate_patients():
    random.seed(20260910)
    
    rf_pool = list(RADIOFARMACOS_POOL)
    prio_pool = list(PRIORITIES_POOL)
    random.shuffle(rf_pool)
    random.shuffle(prio_pool)

    patients = []
    
    total_days = (CURRENT_DATE - START_DATE).days

    for i in range(TOTAL_PATIENTS):
        nhc = f"NHC-{random.randint(100000, 999999)}"
        
        # Sex & Name
        is_female = random.choice([True, False])
        if is_female:
            sexo = "Femenino"
            nombre = f"{random.choice(FEMALE_NAMES)} {random.choice(SURNAMES)} {random.choice(SURNAMES)}"
            height = random.randint(152, 175)
            weight = random.randint(48, 85)
        else:
            sexo = "Masculino"
            nombre = f"{random.choice(MALE_NAMES)} {random.choice(SURNAMES)} {random.choice(SURNAMES)}"
            height = random.randint(165, 192)
            weight = random.randint(62, 105)

        age = random.randint(22, 86)
        
        # Submission Date between 2026-07-01 and 2026-09-10
        sub_days = random.randint(0, total_days)
        submission_date = START_DATE + datetime.timedelta(days=sub_days)

        # Radiopharmaceutical & Priority
        rf = rf_pool[i]
        prio_raw = prio_pool[i]

        if prio_raw.startswith("🔴"):
            prioridad = "🔴 P1"
            max_days = 7
        elif prio_raw.startswith("🟡"):
            prioridad = "🟡 P2"
            max_days = 14
        else:
            prioridad = "🟢 P3"
            max_days = 30

        # Department & Doctor
        servicio = random.choice(SERVICES)
        medico = random.choice(DOCTORS)
        
        # Diagnosis & Motive
        diag_list = DIAGNOSES_BY_RF.get(rf, DIAGNOSES_BY_RF["18F-FDG"])
        diagnostico = random.choice(diag_list)
        motivo = random.choice(MOTIVES[prio_raw])

        # Clinical Data & Tech Alerts
        has_diabetes = random.random() < 0.18  # 18% diabetes
        glucemia = random.randint(185, 260) if has_diabetes else random.randint(75, 140)
        diabetes_str = "Sí" if has_diabetes else "No"

        recent_qtrt = random.random() < 0.15  # 15% QT/RT reciente
        if recent_qtrt:
            qtrt_days_ago = random.randint(2, 18)
            fin_qtrt = (submission_date - datetime.timedelta(days=qtrt_days_ago)).strftime("%Y-%m-%d")
        else:
            fin_qtrt = ""

        alergia = random.choice(ALLERGIES_LIST)
        is_ingresado = "ingresado" in motivo.lower() or random.random() < 0.12
        ubicacion = "Ingresado en Planta" if is_ingresado else "Ambulatorio"
        movilidad = random.choice(["Autónomo", "Silla de ruedas", "Cama / Camilla", "Precisa Sedación"]) if is_ingresado else "Autónomo"

        # Calculate Coherent Appointment Date (Business Days)
        min_start = submission_date
        tech_alerts = []

        if recent_qtrt:
            tech_alerts.append("⚠️ ALERTA TÉCNICA: QT/RT RECIENTE (<21 días)")
            safe_date = datetime.datetime.strptime(fin_qtrt, "%Y-%m-%d").date() + datetime.timedelta(days=21)
            if safe_date > min_start:
                min_start = safe_date

        if has_diabetes:
            tech_alerts.append("⚠️ PROTOCOLO DIABETES (Glucemia > 180 mg/dL)")

        deadline = add_business_days(min_start, max_days)
        
        # Simulate realistic schedule date within target window
        days_to_add = random.randint(1, min(max_days, 5))
        assigned_date = min_start + datetime.timedelta(days=days_to_add)
        
        # Ensure assigned date is a weekday (Mon-Fri)
        while assigned_date.weekday() >= 5:
            assigned_date += datetime.timedelta(days=1)

        # Slot time based on mobility / radioisotope
        if "68Ga" in rf:
            assigned_time = "10:30"
        elif "Sedación" in movilidad:
            assigned_time = "11:00"
        elif is_ingresado:
            assigned_time = "10:00"
        else:
            assigned_time = random.choice(["08:00", "08:20", "08:40", "09:00", "09:20", "09:40"])

        sub_id = f"sub_{random.randint(10000000, 99999999)}"
        resp_id = f"resp_{random.randint(10000000, 99999999)}"

        patients.append({
            "Submission ID": sub_id,
            "Respondent ID": resp_id,
            "Fecha Solicitud": submission_date.strftime("%Y-%m-%d"),
            "NHC / Historia Clínica": nhc,
            "Nombre del Paciente": nombre,
            "Nombre y Apellidos": nombre,
            "Sexo": sexo,
            "Edad": age,
            "Talla (cm)": height,
            "Peso (kg)": weight,
            "Servicio Solicitante": servicio,
            "Médico Solicitante": medico,
            "Diagnóstico Clínico": diagnostico,
            "Motivo de Solicitud": motivo,
            "Tipo de Estudio PET Solicitado": rf,
            "Carácter de la Petición": "Urgente" if "P1" in prioridad else ("Preferente" if "P2" in prioridad else "Ordinario"),
            "Prioridad Calculada": prioridad,
            "Ventana Clínica (Días Laborables)": max_days,
            "Fecha Cita Asignada": assigned_date.strftime("%Y-%m-%d"),
            "Hora Cita Asignada": f"{assigned_time} h ({rf})",
            "¿El paciente está ingresado?": "Sí" if is_ingresado else "No",
            "Movilidad / Traslado": movilidad,
            "¿Tiene Diabetes Mellitus?": diabetes_str,
            "Glucemia (mg/dL)": glucemia,
            "Fin Tratamiento QT/RT": fin_qtrt,
            "Alergias Conocidas": alergia,
            "Alertas Técnicas": " | ".join(tech_alerts) if tech_alerts else "Ninguna"
        })

    return patients


def main():
    patients = generate_patients()

    # Save to CSV
    csv_file = "pacientes_pet_ct_250.csv"
    fieldnames = list(patients[0].keys())

    with open(csv_file, mode="w", encoding="utf-8-sig", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(patients)

    print(f"✅ ¡Dataset de {len(patients)} pacientes generado con éxito en '{csv_file}'!")

    # Save to JSON
    json_file = "pacientes_pet_ct_250.json"
    with open(json_file, mode="w", encoding="utf-8") as f:
        json.dump(patients, f, ensure_ascii=False, indent=2)

    print(f"✅ Dataset también guardado en '{json_file}'.")


if __name__ == "__main__":
    main()
