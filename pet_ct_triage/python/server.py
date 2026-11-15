#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SERVIDOR WEB Y CONECTOR GOOGLE SHEETS LIVE PET/CT
Soporte para Agendamiento Anual y Grupos de Propuestas de Peonadas por Prioridad
==============================================================================
"""

import http.server
import socketserver
import urllib.request
import csv
import io
import json
import os
import datetime
from typing import Dict, List, Any

from pet_ct_triage import schedule_appointment, process_batch

PORT = 8080
MASTER_DB_JSON_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "pet_peticion_medica", "database", "peticiones_db.json"))
MASTER_DB_CSV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "pet_peticion_medica", "database", "peticiones_db.csv"))
WEB_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web_app"))
DATABASE_JSON_PATH = os.path.join(WEB_DIR, "peticiones_db.json")
DATABASE_CSV_PATH = os.path.join(WEB_DIR, "peticiones_db.csv")
FALLBACK_250_PATH = os.path.join(WEB_DIR, "pacientes_pet_ct_250.json")

CSV_HEADERS = [
    "Submission ID", "Respondent ID", "Modalidad", "Fecha Solicitud",
    "NHC / Historia Clínica", "Nombre del Paciente", "Nombre y Apellidos",
    "Sexo", "Edad", "Talla (cm)", "Peso (kg)", "Servicio Solicitante",
    "Médico Solicitante", "Diagnóstico Clínico", "Motivo de Solicitud",
    "Tipo de Estudio PET Solicitado", "Carácter de la Petición",
    "Prioridad Calculada", "Ventana Clínica (Días Laborables)",
    "Fecha Próxima Consulta", "Fecha Cita Asignada", "Hora Cita Asignada",
    "¿El paciente está ingresado?", "¿Precisa sedación?", "Movilidad / Traslado",
    "¿Tiene Diabetes Mellitus?", "Glucemia (mg/dL)", "Fin Tratamiento QT/RT",
    "Alergias Conocidas", "Contraindicación Contraste", "Portador Objetos Metálicos",
    "Alertas Técnicas", "Estado de Triaje", "Resumen Clínico"
]

SERVER_PEONADA_ASSIGNMENTS: Dict[str, Dict[str, str]] = {}

def save_master_database(records: List[Dict[str, Any]]):
    """Guarda concurrentemente en pet_peticion_medica/database (JSON y CSV) y en réplica de web_app."""
    try:
        # 1. Guardar JSON maestro
        with open(MASTER_DB_JSON_PATH, "w", encoding="utf-8") as f:
            json.dump(records, f, ensure_ascii=False, indent=2)

        # 2. Guardar CSV maestro
        with open(MASTER_DB_CSV_PATH, "w", encoding="utf-8", newline="") as f:
            f.write("\ufeff") # BOM para compatibilidad con Excel
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)
            for r in records:
                writer.writerow([r.get(h, "") for h in CSV_HEADERS])

        # 3. Guardar réplicas en web_app
        if os.path.exists(WEB_DIR):
            with open(DATABASE_JSON_PATH, "w", encoding="utf-8") as f:
                json.dump(records, f, ensure_ascii=False, indent=2)
            with open(DATABASE_CSV_PATH, "w", encoding="utf-8", newline="") as f:
                f.write("\ufeff")
                writer = csv.writer(f)
                writer.writerow(CSV_HEADERS)
                for r in records:
                    writer.writerow([r.get(h, "") for h in CSV_HEADERS])
    except Exception as e:
        print(f"⚠️ Error guardando en base de datos maestra: {e}")

class TriageRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def do_GET(self):
        if self.path in ("/api/sync-sheet", "/api/sync-database"):
            self.handle_sync_database()
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == "/api/assign-peonada":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                pid = data.get("paciente_id")
                f_cita = data.get("fecha_cita")
                h_cita = data.get("hora_cita")
                if pid:
                    SERVER_PEONADA_ASSIGNMENTS[pid] = {
                        "fecha_cita": f_cita,
                        "hora_cita": h_cita
                    }
                    # Actualizar directamente en la base de datos maestra pet_peticion_medica/database
                    records = self.load_raw_records()
                    updated = False
                    for r in records:
                        if (r.get("Submission ID") == pid or r.get("id") == pid or r.get("paciente_id") == pid):
                            r["Fecha Cita Asignada"] = f_cita
                            r["Hora Cita Asignada"] = h_cita
                            r["Estado de Triaje"] = "Cita Asignada"
                            updated = True
                            break
                    if updated:
                        save_master_database(records)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "assignments": SERVER_PEONADA_ASSIGNMENTS}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))

        elif self.path == "/api/sync-database":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                payload = json.loads(body)
                if isinstance(payload, list) and len(payload) > 0:
                    save_master_database(payload)
                elif isinstance(payload, dict):
                    records = self.load_raw_records()
                    sub_id = payload.get("Submission ID") or payload.get("id")
                    idx = next((i for i, r in enumerate(records) if (r.get("Submission ID") == sub_id or r.get("id") == sub_id)), None)
                    if idx is not None:
                        records[idx] = payload
                    else:
                        records.insert(0, payload)
                    save_master_database(records)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "success", "message": "Base de datos maestra sincronizada"}).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        elif self.path == "/api/auth/login":
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(body)
                user = str(data.get("usuario") or data.get("username") or "").strip().lower()
                pw = str(data.get("password") or data.get("pass") or "").strip()
                if (user == "triaje" and (pw == "triaje2026" or pw == "sergas2026" or pw == "demo")) or \
                   (user == "enfermeria" and (pw == "sergas2026" or pw == "pet2026" or pw == "demo")) or \
                   (user == "admin" and (pw == "admin" or pw == "galaria2026")):
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "status": "ok",
                        "token": f"pet_triage_{user}_{int(datetime.datetime.now().timestamp())}",
                        "usuario": user,
                        "role": "triaje"
                    }).encode('utf-8'))
                else:
                    self.send_response(401)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Access-Control-Allow-Origin", "*")
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "status": "error",
                        "message": "Credenciales de acceso asistencial incorrectas."
                    }).encode('utf-8'))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"status": "error", "message": str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def load_raw_records(self) -> List[Dict[str, Any]]:
        """Carga siempre con prioridad la base de datos de pet_peticion_medica/database/peticiones_db.json."""
        if os.path.exists(MASTER_DB_JSON_PATH):
            with open(MASTER_DB_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        elif os.path.exists(DATABASE_JSON_PATH):
            with open(DATABASE_JSON_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        elif os.path.exists(FALLBACK_250_PATH):
            with open(FALLBACK_250_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return []

    def handle_sync_database(self):
        try:
            records = self.load_raw_records()

            patients = []
            row_index = 0
            for row in records:
                row_index += 1
                sub_id = row.get("Submission ID", "") or f"SUB-{row_index}"
                resp_id = row.get("Respondent ID", "") or f"RESP-{row_index}"
                
                nombre = (row.get("Nombre del Paciente", "") or 
                          row.get("Nombre y Apellidos", "") or 
                          row.get("Nombre", "") or 
                          f"Paciente #{row_index}")
                          
                nhc = (row.get("Número de Historia Clínica", "") or 
                       row.get("NHC / Historia Clínica", "") or 
                       row.get("NHC", ""))
                       
                full_nombre = f"{nombre} (NHC: {nhc})" if nhc else nombre

                ingresado = row.get("¿El paciente está ingresado?", "")
                habitacion = row.get("Indicar Habitación", "")
                traslado = row.get("Tipo de traslado", "")
                movilidad_row = row.get("Movilidad del paciente", "") or row.get("Movilidad del Paciente", "")
                sedacion = row.get("¿Precisa sedación?", "")

                ubicacion_str = "Ingresado en Planta" if (ingresado.lower() == "sí" or ingresado.lower() == "si") else "Ambulatorio"
                movilidad_str = "Sedación" if (sedacion.lower() == "sí" or sedacion.lower() == "si") else (traslado or movilidad_row or "Autónomo")

                radiofarmaco = row.get("Tipo de Estudio PET Solicitado", "18F-FDG")
                motivo = row.get("Motivo de la Petición", "") or row.get("Indicación Clínica", "") or row.get("Especifique el motivo clínico...", "")
                
                caracter = row.get("Carácter de la Petición", "")
                if caracter.lower() == "urgente":
                    motivo = f"Peligro vital / {motivo}"

                infeccion = row.get("Proceso Infeccioso o Inflamatorio activo", "")
                psa = row.get("Situación Clínica en Cáncer de Próstata", "") + " " + row.get("Valor de PSA actual y Gleason", "")
                
                diabetes = row.get("¿El paciente tiene Diabetes Mellitus?", "")
                glucemia_val = 195 if (diabetes.lower() == "sí" or diabetes.lower() == "si") else 100

                patients.append({
                    "id": sub_id,
                    "respondent_id": resp_id,
                    "nombre": full_nombre,
                    "fecha_solicitud": row.get("Fecha Solicitud", "") or row.get("Submitted at", ""),
                    "ubicacion": ubicacion_str,
                    "radiofarmaco": radiofarmaco,
                    "tipo_estudio": radiofarmaco,
                    "motivo": motivo,
                    "infeccion": infeccion,
                    "psa_duplicacion": psa,
                    "glucemia": glucemia_val,
                    "movilidad": movilidad_str,
                    "fin_qtrt": row.get("Tratamiento Quimioterápico / Radioterápico", "") or row.get("Tratamiento Quimioterápico", "")
                })

            ref_date = datetime.date(2026, 9, 7)
            results, occupancy = process_batch(patients, ref_date)

            for r in results:
                pid = r.get("paciente_id")
                if pid in SERVER_PEONADA_ASSIGNMENTS:
                    r["fecha_cita"] = SERVER_PEONADA_ASSIGNMENTS[pid]["fecha_cita"]
                    r["hora_cita"] = SERVER_PEONADA_ASSIGNMENTS[pid]["hora_cita"]
                    r["requires_proposal"] = False

            proposals = [r for r in results if r.get("requires_proposal")]
            proposals_by_priority = {
                "p1": [p for p in proposals if "P1" in p.get("prioridad", "")],
                "p2": [p for p in proposals if "P2" in p.get("prioridad", "")],
                "p3": [p for p in proposals if "P3" in p.get("prioridad", "")]
            }

            response_payload = json.dumps({
                "status": "success",
                "count": len(results),
                "data": results,
                "proposals_count": len(proposals),
                "proposals": proposals,
                "proposals_by_priority": proposals_by_priority,
                "occupancy": occupancy
            }, ensure_ascii=False).encode('utf-8')

            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            self.wfile.write(response_payload)

        except Exception as e:
            err_payload = json.dumps({"status": "error", "message": str(e)}).encode('utf-8')
            self.send_response(500)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(err_payload)

if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), TriageRequestHandler) as httpd:
        print(f"🚀 Servidor Live PET/CT corriendo en http://localhost:{PORT}")
        httpd.serve_forever()
