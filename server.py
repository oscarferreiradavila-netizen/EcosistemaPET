#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
==============================================================================
SERVIDOR MAESTRO UNIFICADO — ECOSISTEMA DIGITAL PET/CT (GALARIA · SERGAS)
100% Gratuito y Compatible con la Biblioteca Estándar de Python 3 (Sin pip install)
==============================================================================
"""

import http.server
import socketserver
import json
import sqlite3
import os
import csv
import urllib.request
import urllib.parse
from datetime import datetime

PORT = int(os.environ.get("PORT", 8000))
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Rutas de Archivos y Bases de Datos
DB_SQLITE_PATH = os.path.join(BASE_DIR, "pet_prep_page", "pet_database.db")
MASTER_JSON_PATH = os.path.join(BASE_DIR, "pet_peticion_medica", "database", "peticiones_db.json")
MASTER_JS_PATH = os.path.join(BASE_DIR, "pet_peticion_medica", "database", "peticiones_data.js")
MASTER_CSV_PATH = os.path.join(BASE_DIR, "pet_peticion_medica", "database", "peticiones_db.csv")
TRIAGE_JSON_PATH = os.path.join(BASE_DIR, "pet_ct_triage", "web_app", "peticiones_db.json")
TRIAGE_JS_PATH = os.path.join(BASE_DIR, "pet_ct_triage", "web_app", "peticiones_data.js")
TRIAGE_CSV_PATH = os.path.join(BASE_DIR, "pet_ct_triage", "web_app", "peticiones_db.csv")

DEFAULT_EMAIL = "oscarferreiradavila@gmail.com"
CONFIG_PATH = os.path.join(BASE_DIR, "gemini_config.json")

def get_gemini_config():
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return {}
    return {}

def get_gemini_api_key(explicit_key=None):
    if explicit_key and str(explicit_key).strip():
        return str(explicit_key).strip()
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key
    cfg = get_gemini_config()
    return str(cfg.get("gemini_api_key") or cfg.get("apiKey") or "").strip()

CLINICAL_SYSTEM_PROMPTS = {
    'FDG_ENDOCARDITIS': """Eres la enfermera/o virtual experta en Medicina Nuclear del Hospital do Meixoeiro (Galaria · SERGAS, Vigo).
Tu labor es asistir a pacientes y familiares con cercanía, empatía y el máximo rigor clínico en su prueba PET/CT 18F-FDG para Endocarditis Infecciosa / Infección Valvular.

PROTOCOLO CLÍNICO OBLIGATORIO:
1. DIETA DÍA ANTERIOR: Estricta CARNE Y GRASA EXCLUSIVA (cero hidratos de carbono, cero frutas, cero azúcares). Permitido: carnes, bacon, jamón serrano, huevos, pescados, quesos curados, aceite de oliva. Prohibido: pan, arroz, pasta, patatas, legumbres, fruta, verdura, dulces, refrescos. Objetivo: forzar al miocardio sano a quemar ácidos grasos y apagar el consumo de glucosa.
2. AYUNO: 16 HORAS ESTRICTAS previas a la hora de citación (el ayuno habitual de 6h NO es suficiente). Durante las 16h SOLO se permite AGUA SOLA PURA.
3. HEPARINA IV: Se administra en la propia sala de Medicina Nuclear por enfermería exactamente 15 minutos antes de inyectar el FDG (50 UI/kg) para estimular la lipoproteinlipasa y asegurar el bloqueo miocárdico completo.
4. TIEMPO EN SILLÓN / REPOSO: 60 MINUTOS tras inyectar el radiofármaco antes de pasar al tomógrafo para la adquisición tomográfica con sincronización cardíaca. El escaneo dura 20-25 minutos.
5. UBICACIÓN: Hospital do Meixoeiro, Planta -1 (Medicina Nuclear / PET-CT). Llegar 15 min antes.
6. RADIOPROTECCIÓN: Evitar contacto estrecho (< 2m) con embarazadas y niños pequeños durante 6 a 8 horas. Beber agua para eliminar la radiación por orina.
7. ALIMENTACIÓN TRAS LA PRUEBA: Una vez terminada la exploración y recibido el alta médica/técnica, el paciente PUEDE COMER LO QUE QUIERA con total libertad (no hay restricciones de alimentos, puede tomar sólidos, carbohidratos, azúcar, fruta o lo que desee). Se recomienda acompañarlo de abundante agua para favorecer la diuresis.
8. ALERTA VITAL: Si el paciente menciona dolor torácico, opresión, asfixia, falta de aire grave o desmayo, ordena inmediatamente llamar al 061 o 112 o acudir a Urgencias.

REGLAS DE FORMATO:
- Responde en español, con tono empático, tranquilizador y profesional.
- Usa viñetas breves y negritas para facilitar la lectura rápida al paciente.
- Al final de tu respuesta, añade exactamente 2 o 3 sugerencias breves de repregunta en una línea con el formato:
  [SUGERENCIAS: ¿Puedo beber agua? | ¿Qué puedo comer al terminar? | ¿Dónde está la planta -1?]
""",
    'FDG_ONCOLOGICO': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear del Hospital do Meixoeiro (Galaria · SERGAS, Vigo).
Especialidad: PET/CT 18F-FDG Oncológico e Inflamatorio.

PROTOCOLO CLÍNICO:
1. AYUNO: Mínimo 6 horas estricto de alimentos sólidos. Solo se permite beber AGUA SOLA PURA (sin azúcar ni edulcorantes). Prohibido café, té, zumos, leche y chicles.
2. DIETA VÍSPERA (24h antes): Dieta POBRE en carbohidratos (evitar pan, pasta, arroz, patatas, legumbres, bollería, fruta y dulces). Cenar ligero proteína (pescado o tortilla) con ensalada verde aliñada con aceite de oliva.
3. REPOSO MUSCULAR (24-48h antes): Totalmente PROHIBIDO hacer ejercicio físico, ir al gimnasio, correr o hacer esfuerzos intensos. El músculo activo capta glucosa masivamente (GLUT4) y produce artefactos que arruinan la imagen diagnóstica.
4. DIABETES: Medir glucemia basal 1-2h antes de salir. Óptima <160 mg/dL, límite 160-199 mg/dL, alerta >=200 mg/dL. No ponerse insulina rápida en las 4-6h previas.
5. UBICACIÓN Y FASES: Hospital Meixoeiro, Planta -1 (al lado de Medicina Nuclear). Llegada 15 min antes, inyección del trazador, 60 MINUTOS de reposo absoluto en sillón en penumbra y silencio total (sin hablar ni usar el móvil), escaneo PET-CT 20-25 min. Duración total ~2h - 2h30.
6. RADIOPROTECCIÓN TRAS LA PRUEBA: Evitar estar con niños y mujeres embarazadas las 6 horas posteriores a la prueba (mantener distancia de seguridad de al menos 2 metros). Beber abundante agua para la rápida eliminación del radiofármaco a través de la orina. Tirar de la cadena 2 veces y lavarse bien las manos al orinar.
7. ALCOHOL (ANTES Y DESPUÉS): Prohibido consumir alcohol en las 24-48 horas previas al examen (altera el metabolismo de la glucosa). DESPUÉS de la prueba: NO beber alcohol en las primeras 6 horas posteriores; el paciente debe beber exclusivamente abundante AGUA PURA para acelerar la eliminación urinaria del radiofármaco y evitar la deshidratación. Pasadas las 6 horas y tras abundante agua, se puede reanudar el consumo moderado si el médico no lo contraindica.
8. COMIDA TRAS LA PRUEBA (DESPUÉS DEL PET): Nada más terminar la exploración y recibir el alta del equipo técnico/médico tras revisar las imágenes, el paciente PUEDE COMER LO QUE QUIERA con absoluta libertad. Se terminan todas las restricciones de hidratos de carbono y el ayuno: puede tomar bocadillos, comida normal, fruta, pasta, arroz, dulces, etc. Se aconseja llevar un pequeño tentempié en el bolso o mochila para tomarlo nada más salir si se siente fatigado por el ayuno, recordando beber abundante agua pura para acelerar la eliminación del trazador.
9. ALERTA VITAL: Si el paciente menciona dolor torácico, disnea grave o síncope, ordenar llamar al 061 o 112.

Incluye al final: [SUGERENCIAS: ¿Cuántas horas de ayuno? | ¿Qué puedo comer al terminar? | ¿Medidas de radioprotección?]
""",
    'FDG_VASCULITIS': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear del Hospital do Meixoeiro (Galaria · SERGAS, Vigo).
Especialidad: PET/CT 18F-FDG Vasculitis de Grandes Vasos (Arteritis de Células Gigantes / Temporal y Arteritis de Takayasu).

PROTOCOLO CLÍNICO:
1. TIEMPO EN SILLÓN / REPOSO: 90 MINUTOS EXACTOS tras inyectar el FDG (en lugar de 60 min). Esto permite el aclaramiento óptimo de la sangre circulante para que la pared arterial inflamada brille con máxima nitidez.
2. AYUNO: Mínimo 6 horas estricto. Solo agua pura abundante.
3. DIETA DÍA ANTERIOR: Pobre en carbohidratos (cero azúcares, pan, pasta, arroz o dulces).
4. REPOSO MUSCULAR: Sin deporte ni esfuerzo en las 24-48 horas previas.
5. CORTICOIDES: No suspender tu pauta de corticoides o inmunosupresores salvo indicación expresa de tu reumatólogo o médico nuclear.
6. RADIOPROTECCIÓN: Evitar contacto con embarazadas y niños pequeños 8 horas. Beber agua.
7. ALERTA VITAL: Avisar al 061/112 si hay dolor torácico o síncope.

Incluye al final: [SUGERENCIAS: ¿Por qué 90 min de espera? | ¿Cómo es el ayuno de 6h? | ¿Debo suspender corticoides?]
""",
    'FDG_CONTRASTE': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
Especialidad: PET/CT 18F-FDG con Contraste Yodado Intravenoso Diagnóstico.

PROTOCOLO CLÍNICO:
1. AYUNO: Mínimo 6 horas estricto con abundante agua sola.
2. DIETA: Pobre en hidratos de carbono 24 horas antes.
3. CONTRASTE YODADO: Se inyectará contraste radiológico en el TAC. Debe verificarse analítica reciente de función renal (creatinina y filtrado glomerular) y descartar alergias previas al yodo o asma grave no controlada.
4. HIDRATACIÓN: Beber 1 litro de agua en las horas previas y posteriores para proteger los riñones y acelerar la eliminación del contraste.
5. RADIOPROTECCIÓN: Evitar contacto con embarazadas y niños 8 horas.
6. SEGURIDAD Y RIESGO VITAL DEL CONTRASTE (MIEDO O PREGUNTAS SOBRE SI SE PUEDE MORIR): Si el paciente pregunta si se puede morir, si es mortal, si hay peligro de muerte o tiene miedo al contraste yodado, tranquilízalo con rigor médico y empatía: las reacciones graves con riesgo vital son extraordinariamente excepcionales (< 1 de cada 100.000 a 170.000 casos, < 0.001%), se utilizan contrastes no iónicos modernos de altísima seguridad y tolerancia, el equipo de enfermería y médicos supervisa toda la prueba por cámara y disponen en la propia sala de toda la medicación inmediata de rescate (adrenalina, corticoides, antihistamínicos, oxígeno). Si el paciente tuvo alergia previa, se pauta premedicación protectora con corticoides para anular cualquier reacción.
7. CANTIDAD PEQUEÑA POR SEGURIDAD FRENTE A ALERGIAS: Explica siempre que en esta prueba se pone una cantidad pequeña de contraste yodado (la dosis mínima estrictamente necesaria ajustada para el TAC), precisamente por seguridad para minimizar y prevenir al máximo el riesgo de reacciones alérgicas o intolerancias.

Incluye al final: [SUGERENCIAS: ¿Es seguro el contraste? | ¿Tengo que beber agua? | ¿Alergia al contraste?]
""",
    'FDG_NEUROLOGICO': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
Especialidad: PET/CT 18F-FDG Cerebral / Neurológico (Deterioro Cognitivo, Demencias y Epilepsia).

PROTOCOLO CLÍNICO:
1. AYUNO: 6 horas de ayuno estricto de sólidos (solo agua pura).
2. DIETA: Baja en carbohidratos el día previo.
3. REPOSO NEUROSENSORIAL ESTRICTO: 30 minutos antes y 40 minutos después de la inyección en sala en penumbra y silencio total. Terminantemente prohibido hablar, leer, escuchar música, mirar el móvil o recibir estímulos visuales/auditivos para no hiperactivar áreas de la corteza cerebral.
4. MEDICACIÓN: Tomar la medicación neurológica/antiepiléptica según pauta habitual con agua.
5. RADIOPROTECCIÓN: 8 horas sin contacto estrecho con niños ni embarazadas.

Incluye al final: [SUGERENCIAS: ¿Por qué reposo en silencio? | ¿Puedo tomar mi medicación? | ¿Cuánto dura la prueba?]
""",
    'F18_COLINA': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
Especialidad: PET/CT 18F-Fluorocolina (Próstata / Recidiva Bioquímica e Hiperparatiroidismo).

PROTOCOLO CLÍNICO:
1. AYUNO: 4 a 6 horas de ayuno de sólidos. Se permite y aconseja beber abundante agua sola.
2. DIETA: NO requiere dieta pobre en hidratos de carbono ni supresión de azúcar (la Colina es un precursor fosfolipídico de membrana, no glucosa). Puedes comer normal el día anterior.
3. TIEMPOS: Adquisición precoz y/o a los 15-30 minutos según indicación médica.
4. RADIOPROTECCIÓN: 8 horas de protección con niños y embarazadas. Beber agua para orinar.

Incluye al final: [SUGERENCIAS: ¿Debo hacer dieta sin azúcar? | ¿Cuántas horas de ayuno? | ¿Cuánto dura la prueba?]
""",
    'PSMA': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
Especialidad: PET/CT 68Ga-PSMA / 18F-PSMA (Cáncer de Próstata).

PROTOCOLO CLÍNICO:
1. AYUNO: 4 a 6 horas de ayuno simple de sólidos. Beber abundante agua sola.
2. DIETA: Dieta normal el día anterior (no requiere dieta cetogénica ni sin hidratos).
3. HIDRATACIÓN FORZADA: Muy importante beber 1 litro de agua durante los 60 minutos de espera tras la inyección para favorecer la diuresis y vaciar completamente la vejiga justo antes de entrar al tomógrafo.
4. RADIOPROTECCIÓN: 8 horas de distancia con niños y embarazadas.

Incluye al final: [SUGERENCIAS: ¿Tengo que beber mucha agua? | ¿Puedo comer normal el día antes? | ¿Cuánto dura?]
""",
    'GA68_DOTATOC': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
Especialidad: PET/CT 68Ga-DOTATOC (Tumores Neuroendocrinos).

PROTOCOLO CLÍNICO:
1. AYUNO: 4 a 6 horas con abundante agua sola.
2. ANÁLOGOS DE SOMATOSTATINA: Consultar con el médico si debes suspender la inyección de octreótida o lanreótida según pauta clínica.
3. TIEMPOS: 60 minutos de reposo tras la inyección y escaneo de 20 minutos.
4. RADIOPROTECCIÓN: 8 horas de precaución con niños y embarazadas.

Incluye al final: [SUGERENCIAS: ¿Debo suspender mi medicación? | ¿Cómo es el ayuno? | ¿Cuánto dura la prueba?]
""",
    'DEFAULT': """Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
Orienta al paciente con tono humano, tranquilizador y preciso sobre la preparación de su estudio PET/CT, ayuno, hidratación y radioprotección de 8 horas.
Si detectas dolor torácico o síncope, ordena llamar de inmediato al 061/112.
Al final, incluye [SUGERENCIAS: Pregunta 1 | Pregunta 2].
"""
}


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

def init_sqlite_db():
    os.makedirs(os.path.dirname(DB_SQLITE_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_SQLITE_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS registros_enfermeria (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            origen TEXT NOT NULL,
            nivel TEXT,
            fecha_hora TEXT NOT NULL,
            paciente_nombre TEXT NOT NULL,
            paciente_telefono TEXT,
            hora_control_capilar TEXT,
            glucemia_mg_dl INTEGER,
            modo_envio TEXT,
            mensaje_escrito TEXT,
            transcripcion_audio TEXT,
            duracion_audio_segundos INTEGER,
            mensaje_alerta TEXT,
            fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()

    # Si está vacía, sembrar ejemplos clínicos iniciales
    cursor.execute("SELECT COUNT(*) FROM registros_enfermeria")
    if cursor.fetchone()[0] == 0:
        ahora = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor.executemany('''
            INSERT INTO registros_enfermeria 
            (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, mensaje_alerta)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', [
            ('AUDIOGUIA_VOZ', 'CONSULTA', ahora, 'Manuel Gómez Suárez', '644 123 456', '08:00', 105, 'Consulta sobre preparación dietética sin hidratos.'),
            ('CHATBOT_INTERACCION', 'CONSULTA', ahora, 'Carmen Varela Rey', '622 987 654', '08:30', 112, 'Consulta medicación habitual antihipertensiva.'),
            ('AUDIOGUIA_METABOLICA', 'URGENCIA_METABOLICA', ahora, 'Antonio Lois Pazo', '688 334 455', '07:15', 245, 'Glucemia capilar crítica (245 mg/dL). Supera umbral de 200 mg/dL.')
        ])
        conn.commit()
    conn.close()
    print(f"✅ Base de datos SQLite lista en: {DB_SQLITE_PATH}")

def sync_csv_and_replicas(records):
    """Sincroniza peticiones_db.json y peticiones_db.csv concurrentemente."""
    try:
        # Guardar JSON Maestro y semilla JS
        json_text = json.dumps(records, ensure_ascii=False, indent=2)
        js_text = f"window.PETICIONES_DATABASE_SEED = {json_text};"
        os.makedirs(os.path.dirname(MASTER_JSON_PATH), exist_ok=True)
        with open(MASTER_JSON_PATH, 'w', encoding='utf-8') as f:
            f.write(json_text)
        with open(MASTER_JS_PATH, 'w', encoding='utf-8') as f:
            f.write(js_text)

        # Guardar CSV Maestro con BOM
        with open(MASTER_CSV_PATH, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)
            for r in records:
                writer.writerow([r.get(h, "") for h in CSV_HEADERS])

        # Guardar Réplicas en pet_ct_triage
        os.makedirs(os.path.dirname(TRIAGE_JSON_PATH), exist_ok=True)
        with open(TRIAGE_JSON_PATH, 'w', encoding='utf-8') as f:
            f.write(json_text)
        with open(TRIAGE_JS_PATH, 'w', encoding='utf-8') as f:
            f.write(js_text)
        with open(TRIAGE_CSV_PATH, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(CSV_HEADERS)
            for r in records:
                writer.writerow([r.get(h, "") for h in CSV_HEADERS])
    except Exception as e:
        print(f"⚠️ Error sincronizando réplicas CSV/JSON: {e}")

class MasterPETHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def _send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Accept')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors_headers()
        self.end_headers()

    def do_GET(self):
        # 1. API Sincronización Base de Datos Clínica
        if self.path in ('/api/sync-database', '/api/sync-sheet'):
            try:
                data = []
                if os.path.exists(MASTER_JSON_PATH):
                    with open(MASTER_JSON_PATH, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self._send_cors_headers()
                self.end_headers()
                resp = {"status": "success", "count": len(data), "data": data}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                return

        # 2. API Panel de Enfermería
        elif self.path == '/api/enfermeria/panel':
            try:
                conn = sqlite3.connect(DB_SQLITE_PATH)
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute('SELECT * FROM registros_enfermeria ORDER BY id DESC')
                rows = [dict(r) for r in cursor.fetchall()]
                conn.close()

                dudas = []
                urgencias = []
                for r in rows:
                    origen = str(r.get('origen') or '')
                    nivel = str(r.get('nivel') or '')
                    glucemia = r.get('glucemia_mg_dl')
                    if 'GLUCEMIA' in origen or 'ROJO' in nivel or (glucemia is not None and glucemia >= 200) or origen == 'CANCELACION_WEB' or origen == 'CANCELACION_PRUEBA':
                        urgencias.append(r)
                    else:
                        dudas.append(r)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self._send_cors_headers()
                self.end_headers()
                resp = {
                    "status": "ok",
                    "total_dudas": len(dudas),
                    "total_urgencias": len(urgencias),
                    "dudas": dudas,
                    "urgencias": urgencias
                }
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                return

        # 3. API Configuración Chat Gemini
        elif self.path == '/api/chat/config':
            key = get_gemini_api_key()
            has_key = bool(key)
            preview = f"{key[:6]}...{key[-4:]}" if has_key and len(key) > 10 else ("***" if has_key else "")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self._send_cors_headers()
            self.end_headers()
            resp = {"status": "ok", "has_key": has_key, "preview": preview, "model": "gemini-1.5-flash"}
            self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        # Servir archivos estáticos normales
        super().do_GET()

    def do_POST(self):
        length = int(self.headers.get('Content-Length', 0))
        raw_body = self.rfile.read(length)
        data = {}
        try:
            data = json.loads(raw_body.decode('utf-8')) if raw_body else {}
        except:
            pass

        # 1. API Login Consola Enfermería / Triaje
        if self.path == '/api/auth/login':
            user = data.get('usuario', '').strip().lower()
            pwd = data.get('password', '').strip()
            if (user == 'enfermeria' and pwd in ('pet2026', 'sergas2026', 'demo')) or \
               (user == 'triaje' and pwd in ('triaje2026', 'sergas2026', 'demo')):
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                resp = {"status": "ok", "token": f"token_{user}_pet2026", "usuario": user}
                self.wfile.write(json.dumps(resp).encode('utf-8'))
            else:
                self.send_response(401)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                resp = {"status": "error", "message": "Credenciales incorrectas"}
                self.wfile.write(json.dumps(resp).encode('utf-8'))
            return

        # 2. API Crear Petición Médica
        elif self.path == '/api/peticiones/crear':
            try:
                current_records = []
                if os.path.exists(MASTER_JSON_PATH):
                    with open(MASTER_JSON_PATH, 'r', encoding='utf-8') as f:
                        current_records = json.load(f)

                sub_id = data.get('Submission ID') or f"sub_{int(datetime.now().timestamp()*1000)}"
                data['Submission ID'] = sub_id

                idx = next((i for i, p in enumerate(current_records) if p.get('Submission ID') == sub_id), None)
                if idx is not None:
                    current_records[idx] = data
                else:
                    current_records.insert(0, data)

                sync_csv_and_replicas(current_records)

                self.send_response(201)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self._send_cors_headers()
                self.end_headers()
                resp = {"status": "success", "id": sub_id, "count": len(current_records), "petition": data}
                self.wfile.write(json.dumps(resp, ensure_ascii=False).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                return

        # 3. API Sincronizar Volcado Completo
        elif self.path == '/api/sync-database':
            try:
                final_records = []
                if isinstance(data, list):
                    final_records = data
                elif isinstance(data, dict):
                    final_records = [data]
                if final_records:
                    sync_csv_and_replicas(final_records)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                resp = {"status": "success", "count": len(final_records)}
                self.wfile.write(json.dumps(resp).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                return

        # 4. API Cancelar Cita Paciente
        elif self.path == '/api/citas/cancelar':
            try:
                dest = data.get('email_destino', DEFAULT_EMAIL)
                nombre = data.get('paciente_nombre') or data.get('paciente') or 'Paciente'
                nhc = data.get('paciente_nhc') or data.get('nhc') or 'N/D'
                motivo = data.get('motivo_categoria') or data.get('motivo') or 'Cancelación paciente'
                msg = f"Cancelación cita: {motivo} | {data.get('explicacion_motivo', '')}"

                conn = sqlite3.connect(DB_SQLITE_PATH)
                c = conn.cursor()
                c.execute('''
                    INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, mensaje_alerta)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', ('CANCELACION_WEB', 'CANCELACION', datetime.now().strftime("%Y-%m-%d %H:%M:%S"), f"{nombre} (NHC: {nhc})", data.get('paciente_telefono', ''), msg))
                conn.commit()
                rec_id = c.lastrowid
                conn.close()

                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                resp = {"status": "success", "id": rec_id, "message": "Cancelación registrada"}
                self.wfile.write(json.dumps(resp).encode('utf-8'))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                return

        # 5. API Eliminar Registro Atendido Enfermería
        elif self.path == '/api/enfermeria/eliminar':
            rec_id = data.get('id')
            if rec_id:
                conn = sqlite3.connect(DB_SQLITE_PATH)
                c = conn.cursor()
                c.execute('DELETE FROM registros_enfermeria WHERE id = ?', (rec_id,))
                conn.commit()
                conn.close()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "deleted_id": rec_id}).encode('utf-8'))
            return

        # 6. API Configuración Chat Gemini (POST)
        elif self.path == '/api/chat/config':
            new_key = str(data.get('gemini_api_key') or data.get('apiKey') or '').strip()
            cfg = get_gemini_config()
            cfg['gemini_api_key'] = new_key
            cfg['updated_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            try:
                with open(CONFIG_PATH, 'w', encoding='utf-8') as f:
                    json.dump(cfg, f, indent=2, ensure_ascii=False)
            except Exception as e:
                print(f"Error guardando gemini_config.json: {e}")
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self._send_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps({"status": "ok", "has_key": bool(new_key)}).encode('utf-8'))
            return

        # 7. API Consulta Inteligente Gemini IA
        elif self.path == '/api/chat/ask':
            try:
                user_msg = str(data.get('message') or data.get('prompt') or '').strip()
                study_type = str(data.get('study_type') or 'FDG_ENDOCARDITIS').upper()
                patient_name = str(data.get('patient_name') or '').strip()
                patient_hora = str(data.get('patient_hora') or data.get('hora') or '').strip()
                patient_fecha = str(data.get('patient_fecha') or data.get('fecha') or '').strip()
                history = data.get('history') or []
                explicit_key = data.get('api_key')

                if not user_msg:
                    self.send_response(400)
                    self.end_headers()
                    return

                api_key = get_gemini_api_key(explicit_key)
                if not api_key:
                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json')
                    self._send_cors_headers()
                    self.end_headers()
                    resp = {
                        "status": "fallback",
                        "source": "local_engine",
                        "message": "No hay GEMINI_API_KEY configurada. Se utilizará el motor clínico local.",
                        "has_key": False
                    }
                    self.wfile.write(json.dumps(resp).encode('utf-8'))
                    return

                system_prompt = CLINICAL_SYSTEM_PROMPTS.get(study_type, CLINICAL_SYSTEM_PROMPTS['DEFAULT'])
                if patient_name:
                    system_prompt += f"\nEl nombre del paciente al que te diriges es: {patient_name}."
                if patient_hora:
                    system_prompt += f"\nEl/la paciente está citado/a exactamente a las: {patient_hora}."
                if patient_fecha:
                    system_prompt += f"\nLa fecha de la cita es: {patient_fecha}."

                system_prompt += f"""
UBICACIÓN DE LA PRUEBA Y HORARIO DE CITACIÓN:
- LUGAR DE LA PRUEBA: Hospital Meixoeiro, Planta -1 (al lado de Medicina Nuclear).
- HORA DE LA CITA: {patient_hora if patient_hora else "la hora indicada en su citación oficial"}.
- RECOMENDACIÓN: Llegar con 10 a 15 minutos de antelación para realizar la admisión con tranquilidad.
- REGLA IMPERATIVA: Si el paciente pregunta dónde se realiza la prueba, dónde está la sala, cómo llegar, en qué planta es, a qué hora está citado, o cualquier duda sobre el lugar y hora de su cita, debes responder SIEMPRE indicando de forma explícita y prioritaria que la prueba se realiza en el Hospital Meixoeiro, Planta -1 al lado de Medicina Nuclear, e indícale la hora a la que está citado/a ({patient_hora if patient_hora else "la hora indicada en su citación"}), recomendándole llegar con 10-15 minutos de antelación.
"""

                url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
                contents = []
                for turn in history[-4:]:
                    role = 'user' if turn.get('role') == 'user' else 'model'
                    t_text = str(turn.get('text') or turn.get('content') or '').strip()
                    if t_text:
                        contents.append({"role": role, "parts": [{"text": t_text}]})
                contents.append({"role": "user", "parts": [{"text": user_msg}]})

                payload = {
                    "contents": contents,
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "generationConfig": {"temperature": 0.35, "maxOutputTokens": 600}
                }

                req = urllib.request.Request(
                    url,
                    data=json.dumps(payload).encode('utf-8'),
                    headers={'Content-Type': 'application/json'}
                )

                with urllib.request.urlopen(req, timeout=12) as response:
                    res_body = json.loads(response.read().decode('utf-8'))
                    raw_text = res_body['candidates'][0]['content']['parts'][0]['text']

                    suggestions = []
                    clean_answer = raw_text
                    import re
                    match = re.search(r'\[SUGERENCIAS:\s*([^\]]+)\]', raw_text, re.IGNORECASE)
                    if match:
                        clean_answer = re.sub(r'\[SUGERENCIAS:[^\]]+\]', '', raw_text, flags=re.IGNORECASE).strip()
                        suggestions = [{"label": s.strip(), "query": s.strip()} for s in match.group(1).split('|') if s.strip()]

                    self.send_response(200)
                    self.send_header('Content-Type', 'application/json; charset=utf-8')
                    self._send_cors_headers()
                    self.end_headers()
                    self.wfile.write(json.dumps({
                        "status": "success",
                        "source": "gemini",
                        "model": "gemini-1.5-flash",
                        "answer": clean_answer,
                        "suggestions": suggestions
                    }, ensure_ascii=False).encode('utf-8'))
                    return
            except Exception as e:
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self._send_cors_headers()
                self.end_headers()
                self.wfile.write(json.dumps({
                    "status": "fallback",
                    "source": "local_engine",
                    "error_detail": str(e),
                    "message": "Fallo de conexión con Gemini, alternando a motor clínico local"
                }).encode('utf-8'))
                return

        super().do_POST()

class ThreadedHTTPServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    init_sqlite_db()
    with ThreadedHTTPServer(("", PORT), MasterPETHandler) as httpd:
        import socket
        local_ip = "127.0.0.1"
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
        except Exception:
            pass

        print(f"\n=======================================================")
        print(f"🏥 ECOSISTEMA DIGITAL PET/CT — SERVIDOR UNIFICADO (MULTIHILO)")
        print(f"🌐 Servidor local activo en:   http://localhost:{PORT}")
        print(f"📲 Servidor en red Wi-Fi:      http://{local_ip}:{PORT}")
        print(f"👉 Portal Maestro:             http://localhost:{PORT}/index.html")
        print(f"👉 Prescripción Médica:        http://localhost:{PORT}/pet_peticion_medica/")
        print(f"👉 Triaje y Agendamiento:      http://localhost:{PORT}/pet_ct_triage/web_app/")
        print(f"👉 Audioguías (12 Protocolos): http://localhost:{PORT}/index.html#seccion-audioguias")
        print(f"👉 Consola Enfermería:         http://localhost:{PORT}/pet_prep_page/enfermeria.html")
        print(f"=======================================================\n")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Servidor detenido.")
