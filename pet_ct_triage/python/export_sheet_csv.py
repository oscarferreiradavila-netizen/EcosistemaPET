import csv
import io
import os
import json
import datetime
from pet_ct_triage import process_batch

MASTER_DB_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "pet_peticion_medica", "database", "peticiones_db.csv"))
MASTER_DB_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "pet_peticion_medica", "database", "peticiones_db.json"))
LOCAL_DB_CSV = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web_app", "peticiones_db.csv"))
LOCAL_DB_JSON = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "web_app", "peticiones_db.json"))

def export_processed_csv():
    rows = []
    headers = []

    target_csv = MASTER_DB_CSV if os.path.exists(MASTER_DB_CSV) else (LOCAL_DB_CSV if os.path.exists(LOCAL_DB_CSV) else None)
    target_json = MASTER_DB_JSON if os.path.exists(MASTER_DB_JSON) else (LOCAL_DB_JSON if os.path.exists(LOCAL_DB_JSON) else None)

    if target_csv:
        print(f"📖 Leyendo base de datos CSV enlazada: {target_csv}")
        with open(target_csv, "r", encoding="utf-8-sig") as f:
            reader = list(csv.reader(f))
            if reader:
                headers = reader[0]
                rows = reader[1:]
    elif target_json:
        print(f"📖 Leyendo base de datos JSON enlazada: {target_json}")
        with open(target_json, "r", encoding="utf-8") as f:
            data = json.load(f)
            if data and isinstance(data, list):
                headers = list(data[0].keys())
                rows = [[item.get(h, "") for h in headers] for item in data]

    patients = []
    for idx, r in enumerate(rows):
        if not any(r):
            continue
        row_dict = dict(zip(headers, r))
        
        nombre = row_dict.get("Nombre del Paciente", "") or f"Paciente #{idx+1}"
        nhc = row_dict.get("Número de Historia Clínica", "")
        ingresado = row_dict.get("¿El paciente está ingresado?", "")
        habitacion = row_dict.get("Indicar Habitación", "")
        traslado = row_dict.get("Tipo de traslado", "")
        movilidad_row = row_dict.get("Movilidad del Paciente", "")
        sedacion = row_dict.get("¿Precisa sedación?", "")

        ubicacion_str = "Ingresado en Planta" if (ingresado.lower() == "sí" or ingresado.lower() == "si") else "Ambulatorio"
        movilidad_str = "Sedación" if (sedacion.lower() == "sí" or sedacion.lower() == "si") else (traslado or movilidad_row or "Autónomo")

        radiofarmaco = row_dict.get("Tipo de Estudio PET Solicitado", "18F-FDG")
        motivo = row_dict.get("Motivo de la Petición", "") or row_dict.get("Indicación Clínica", "")
        caracter = row_dict.get("Carácter de la Petición", "")
        if caracter.lower() == "urgente":
            motivo = f"Peligro vital / {motivo}"

        infeccion = row_dict.get("Proceso Infeccioso o Inflamatorio activo", "")
        psa = row_dict.get("Situación Clínica en Cáncer de Próstata", "")
        diabetes = row_dict.get("¿El paciente tiene Diabetes Mellitus?", "")
        glucemia_val = 195 if (diabetes.lower() == "sí" or diabetes.lower() == "si") else 100

        patients.append({
            "id": row_dict.get("Submission ID", f"ROW-{idx+1}"),
            "nombre": nombre,
            "ubicacion": ubicacion_str,
            "radiofarmaco": radiofarmaco,
            "motivo": motivo,
            "infeccion": infeccion,
            "psa_duplicacion": psa,
            "glucemia": glucemia_val,
            "movilidad": movilidad_str,
            "fin_qtrt": row_dict.get("Tratamiento Quimioterápico", "")
        })

    ref_date = datetime.date(2026, 9, 7)
    results, _ = process_batch(patients, ref_date)

    print("ID | Paciente | Prioridad | Fecha Cita | Hora | Alertas | Vídeo-Guía")
    print("-" * 90)
    for res in results:
        print(f"{res['paciente_id']} | {res['nombre']} | {res['prioridad']} | {res['fecha_cita']} | {res['hora_cita']} | {res['alertas_tecnicas']} | {res['enlace_video']}")

if __name__ == "__main__":
    export_processed_csv()
