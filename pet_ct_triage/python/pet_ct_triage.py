#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SISTEMA DE TRIAJE Y AGENDAMIENTO AUTOMÁTICO PET/CT
Motor Anual (52 Semanas) y Sistema de Propuesta de Fechas para Peonadas / Turnos Extra
==============================================================================
"""

import datetime
import json
from typing import Dict, List, Any, Tuple

VIDEO_URLS = {
    "FDG_ESTANDAR": "http://localhost:8000",
    "FDG_DIABETES": "http://localhost:8000",
    "PSMA": "http://localhost:8000",
    "COLINA": "http://localhost:8000",
    "SOMATOSTATINA": "http://localhost:8000",
    "NEURO": "http://localhost:8000",
    "GENERAL": "http://localhost:8000"
}

def get_video_guide_url(radiofarmaco: str, has_diabetes: bool = False) -> str:
    rf = str(radiofarmaco).lower()
    if has_diabetes and ("fdg" in rf or "18f" in rf):
        return VIDEO_URLS["FDG_DIABETES"]
    if "psma" in rf:
        return VIDEO_URLS["PSMA"]
    if "colina" in rf:
        return VIDEO_URLS["COLINA"]
    if "somatostatina" in rf or "dotatate" in rf or "68ga" in rf:
        return VIDEO_URLS["SOMATOSTATINA"]
    if "neuro" in rf:
        return VIDEO_URLS["NEURO"]
    if "fdg" in rf:
        return VIDEO_URLS["FDG_ESTANDAR"]
    return VIDEO_URLS["GENERAL"]

def evaluate_triage(patient: Dict[str, Any]) -> Tuple[str, int]:
    """
    Evalúa la prioridad clínica del paciente según la jerarquía establecida.
    Retorna (Prioridad, Días Máximos Ventana)
    """
    ubicacion = str(patient.get("ubicacion", "")).lower()
    motivo = str(patient.get("motivo", "")).lower()
    infeccion = str(patient.get("infeccion", "")).lower()
    psa = str(patient.get("psa_duplicacion", "")).lower()
    terapia = str(patient.get("terapia_especial", "")).lower()
    patologia = str(patient.get("patologia_especifica", "")).lower()
    tipo_cancer = str(patient.get("tipo_cancer", "")).lower()

    # 🔴 PRIORIDAD 1 (URGENTE - Target < 7 días)
    is_p1 = (
        "ingresado" in ubicacion or "planta" in ubicacion or
        any(m in motivo for m in ["urgente", "peligro vital", "cambio quirúrgico", "cambio quirurgico", 
                                  "evaluación prequirúrgica urgente", "evaluacion prequirurgica urgente", 
                                  "recidiva agudizada"]) or
        any(i in infeccion for i in ["endocarditis", "vasculitis", "prótesis", "protesis", "fod"]) or
        ("< 3 meses" in psa or "rápida" in psa or "rapida" in psa) or
        any(t in terapia for t in ["lu-177", "radioligandos", "rescate"])
    )
    if is_p1:
        return "🔴 P1", 7

    # 🟡 PRIORIDAD 2 (PREFERENTE - Target < 14 días)
    is_p2 = (
        any(m in motivo for m in ["estadificación inicial", "estadificacion inicial", "preferente",
                                  "reestadificación", "reestadificacion", 
                                  "respuesta a tratamiento", "recidiva bioquímica", "recidiva bioquimica"]) or
        any(c in tipo_cancer for c in ["pulmón cpnm", "pulmon cpnm", "linfoma", "melanoma", 
                                       "cabeza y cuello", "esófago", "esofago", "cérvix", "cervix", "tod"]) or
        any(p in patologia for p in ["paratiroides", "hiperparatiroidismo", "hepatocarcinoma", "renal", "epilepsia"])
    )
    if is_p2:
        return "🟡 P2", 14

    # 🟢 PRIORIDAD 3 (ORDINARIA - Target > 14 días)
    return "🟢 P3", 30


def evaluate_technical_alerts(patient: Dict[str, Any], current_date: datetime.date = None) -> Tuple[str, bool, datetime.date]:
    if current_date is None:
        current_date = datetime.date.today()

    alerts = []
    min_start_date = current_date
    glucemia = float(patient.get("glucemia", 0) or 0)
    has_diabetes = glucemia > 180

    fin_qtrt_str = str(patient.get("fin_qtrt", "")).strip()
    if fin_qtrt_str:
        try:
            fin_date = datetime.datetime.strptime(fin_qtrt_str, "%Y-%m-%d").date()
            diff_days = (current_date - fin_date).days
            if diff_days < 21:
                alerts.append("⚠️ ALERTA TÉCNICA: QT/RT RECIENTE (<21 días)")
                safe_date = fin_date + datetime.timedelta(days=21)
                if safe_date > min_start_date:
                    min_start_date = safe_date
        except ValueError:
            pass

    if has_diabetes:
        alerts.append("⚠️ PROTOCOLO DIABETES (Glucemia > 180 mg/dL)")

    return " | ".join(alerts), has_diabetes, min_start_date


def normalize_radiofarmaco(rf_str: str) -> str:
    rf = rf_str.lower()
    if "psma" in rf and ("68ga" in rf or "ga68" in rf or "ga 68" in rf):
        return "68GA-PSMA"
    if "psma" in rf or "fluor-psma" in rf:
        return "FLUOR-PSMA"
    if "colina" in rf or "paratiroides" in rf:
        return "18F-COLINA"
    if "somatostatina" in rf or "dotatate" in rf or "dotatoc" in rf:
        return "68GA-SOMATOSTATINA"
    return "18F-FDG"


def is_radiofarmaco_allowed_on_day(rf_key: str, weekday: int) -> bool:
    if rf_key == "18F-FDG":
        return weekday in [0, 1, 3, 4]  # Lun, Mar, Jue, Vie
    if rf_key in ["68GA-PSMA", "68GA-SOMATOSTATINA"]:
        return weekday in [0, 3, 4]     # Lun, Jue, Vie
    if rf_key == "FLUOR-PSMA":
        return weekday == 1             # Martes
    if rf_key == "18F-COLINA":
        return weekday == 2             # Miércoles
    return True


def get_max_morning_capacity(rf_key: str, weekday: int) -> int:
    if rf_key == "18F-FDG":
        return 4 if weekday == 1 else 7
    if rf_key == "FLUOR-PSMA":
        return 4
    if rf_key == "18F-COLINA":
        return 6
    if rf_key in ["68GA-PSMA", "68GA-SOMATOSTATINA"]:
        return 1
    return 4


def assign_morning_time_slot(rf_key: str, movilidad: str, ubicacion: str, slot_index: int) -> str:
    if rf_key in ["68GA-PSMA", "68GA-SOMATOSTATINA"]:
        return "10:30"

    mob = f"{movilidad} {ubicacion}".lower()
    if any(s in mob for s in ["sedación", "sedacion", "anestesia"]):
        return "11:00" if slot_index % 2 == 0 else "11:20"
    if any(h in mob for h in ["ingresado", "planta", "cama", "silla", "reducida"]):
        return "10:00" if slot_index % 2 == 0 else "10:30"

    default_slots = ["08:00", "08:20", "08:40", "09:00", "09:20", "09:40"]
    return default_slots[slot_index % len(default_slots)]


def add_business_days(start_date: datetime.date, num_business_days: int) -> datetime.date:
    """
    Suma 'num_business_days' días laborables (Lunes a Viernes) excluyendo Sábados y Domingos.
    """
    current = start_date
    added = 0
    while added < num_business_days:
        current += datetime.timedelta(days=1)
        if current.weekday() < 5:  # 0=Lunes, ..., 4=Viernes
            added += 1
    return current


def schedule_appointment(patient: Dict[str, Any], occupied_map: Dict[str, int], current_date: datetime.date = None) -> Dict[str, Any]:
    """
    Agendamiento oficial en Mañana y Sistema de Propuesta de Fecha para Peonadas (sin agendado automático en tarde).
    Calcula las ventanas de prioridad clínica estrictamente en DÍAS LABORABLES (Lunes a Viernes).
    """
    if current_date is None:
        current_date = datetime.date.today()

    priority, max_days = evaluate_triage(patient)
    alerts_text, has_diabetes, min_start_date = evaluate_technical_alerts(patient, current_date)
    radiofarmaco = str(patient.get("radiofarmaco", "18F-FDG"))
    rf_key = normalize_radiofarmaco(radiofarmaco)

    fecha_sol_str = str(patient.get("fecha_solicitud", "")).strip()
    if fecha_sol_str:
        try:
            sol_date = datetime.datetime.strptime(fecha_sol_str, "%Y-%m-%d").date()
        except Exception:
            sol_date = current_date
    else:
        sol_date = current_date

    # Exact deadline date calculated in business days (Lunes a Viernes) from request date
    deadline_date = add_business_days(sol_date, max_days)

    start_search = max(min_start_date + datetime.timedelta(days=1), current_date + datetime.timedelta(days=1))

    # 1. Intentar agendar en Mañana dentro de la ventana de prioridad del paciente
    search_date = start_search
    assigned_date_str = None
    assigned_time_str = None

    while search_date <= deadline_date:
        weekday = search_date.weekday()
        if weekday < 5:
            if is_radiofarmaco_allowed_on_day(rf_key, weekday):
                date_str = search_date.strftime("%Y-%m-%d")
                morning_key = f"{date_str}_{rf_key}"
                current_count = occupied_map.get(morning_key, 0)
                max_cap = get_max_morning_capacity(rf_key, weekday)

                if current_count < max_cap:
                    occupied_map[morning_key] = current_count + 1
                    assigned_date_str = date_str
                    time_slot_raw = assign_morning_time_slot(
                        rf_key, 
                        str(patient.get("movilidad", "")), 
                        str(patient.get("ubicacion", "")), 
                        current_count
                    )
                    assigned_time_str = f"{time_slot_raw} h ({radiofarmaco})"
                    break
        search_date += datetime.timedelta(days=1)

    # 2. Si las mañanas están llenas dentro de la ventana -> NO AGENDAR, sino GENERAR PROPUESTA DE PEONADA
    requires_proposal = False
    proposed_date_str = None
    grupo_propuesta = None

    if not assigned_date_str:
        requires_proposal = True
        # Buscar el primer día adecuado de radiofármaco dentro del plazo clínico para proponerlo
        proposal_search = start_search
        while proposal_search <= deadline_date:
            weekday = proposal_search.weekday()
            if weekday < 5 and is_radiofarmaco_allowed_on_day(rf_key, weekday):
                proposed_date_str = proposal_search.strftime("%Y-%m-%d")
                break
            proposal_search += datetime.timedelta(days=1)

        if not proposed_date_str:
            proposed_date_str = deadline_date.strftime("%Y-%m-%d")

        assigned_date_str = "SIN AGENDAR (PROPUESTA TURNO EXTRA)"
        assigned_time_str = "-"
        grupo_propuesta = f"Grupo {priority}"
        
        proposal_alert = f"💡 PROPUESTA PEONADA/TARDE: Fecha recomendada {proposed_date_str} (Límite {priority} Límite {deadline_date.strftime('%Y-%m-%d')})"
        alerts_text = f"{alerts_text} | {proposal_alert}".strip(" | ")

    return {
        "paciente_id": patient.get("id", "N/A"),
        "nombre": patient.get("nombre", "Anónimo"),
        "radiofarmaco": radiofarmaco,
        "tipo_estudio": patient.get("tipo_estudio", radiofarmaco),
        "motivo": patient.get("motivo", "Estudio PET/CT"),
        "prioridad": priority,
        "max_dias_ventana": max_days,
        "fecha_solicitud": sol_date.strftime("%Y-%m-%d"),
        "fecha_limite": deadline_date.strftime("%Y-%m-%d"),
        "fecha_cita": assigned_date_str,
        "hora_cita": assigned_time_str,
        "requires_proposal": requires_proposal,
        "proposed_date": proposed_date_str,
        "grupo_propuesta": grupo_propuesta,
        "alertas_tecnicas": alerts_text,
        "enlace_video": VIDEO_URLS["GENERAL"]
    }


def process_batch(patients: List[Dict[str, Any]], reference_date: datetime.date = None) -> Tuple[List[Dict[str, Any]], Dict[str, int]]:
    occupied_map = {}
    results = []
    for patient in patients:
        res = schedule_appointment(patient, occupied_map, reference_date)
        results.append(res)
    return results, occupied_map
