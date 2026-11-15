# 🏥 Sistema de Triaje y Agendamiento Automático PET/CT

Solución integral de inteligibilidad clínica y automatización logística para peticiones de PET/CT procedentes del formulario Tally y hoja de cálculo de Google Sheets.

URL de la Hoja de Cálculo: [Google Sheet PET/CT Tally](https://docs.google.com/spreadsheets/d/1PRrDEG0F3OmCLGJ9Ir3wwkuhofIXvVfVz9DpJaTmuMM/edit?gid=0#gid=0)

---

## 📌 Estructura del Proyecto

```
pet_ct_triage/
├── app_script/
│   └── Code.gs                # Código Google Apps Script para instalar en Google Sheets
├── python/
│   ├── pet_ct_triage.py        # Motor de triaje y agendador matricial en Python
│   └── test_triage.py         # Suite de 11 pruebas unitarias automáticas
├── web_app/
│   ├── index.html             # Interfaz web interactiva del simulador
│   ├── styles.css             # Estilos dark-mode glassmorphic premium
│   └── app.js                 # Lógica interactiva en JavaScript
└── README.md                  # Manual de instalación y documentación técnica
```

---

## 🧠 1. Reglas de Triaje Clínico e Indicaciones

### 🔴 Prioridad 1 (URGENTE - Target < 7 días)
- Paciente ingresado en planta u hospitalizado.
- Peligro vital, cambio quirúrgico inminente, evaluación prequirúrgica urgente o sospecha de recidiva agudizada.
- Infección / Inflamación grave: Endocarditis sobre prótesis, vasculitis activa, infección de prótesis vascular/articular o FOD en paciente grave.
- Cáncer de Próstata con cinética de PSA rápida (duplicación < 3 meses).
- Evaluación pre-terapia con radioligandos (Lu-177 en TNE) o rescate radioterápico agudo en PSMA.

### 🟡 Prioridad 2 (PREFERENTE - Target < 14 días)
- Estadificación inicial oncológica (Pulmón CPNM, Linfoma Hodgkin/No Hodgkin, Melanoma, Cabeza y Cuello, Esófago, Cérvix, Tumor de Origen Desconocido).
- Reestadificación o valoración de respuesta a tratamiento (post-QT/RT).
- Recidiva bioquímica / elevación de marcadores (ej. PSA en ascenso).
- Adenoma de Paratiroides / Hiperparatiroidismo o Hepatocarcinoma/Renal en reestadificación.
- Mapeo presquirúrgico de Epilepsia Refractaria.

### 🟢 Prioridad 3 (ORDINARIA - Target > 14 días)
- Nódulo Solitario de Pulmón (NSP) o seguimiento oncológico en remisión/enfermedad estable.
- TNE en seguimiento con lesiones estables.
- PET Neurológico: Demencias, deterioro cognitivo, trastornos del movimiento o diagnóstico con Amiloide/Tau.

---

## 🗓️ 2. Parrilla Semanal y Matriz Logística por Radiofármaco

| Día de la Semana | Radiofármaco Permitido | Cupos Máximos / Día | Franjas Horarias |
|---|---|---|---|
| **Lunes** | 18F-FDG + 68Ga-PSMA/Somatostatina | 7 FDG + 1 68Ga | 08:00-10:00 (Autónomos), 10:00-11:00 (Planta/Silla), 10:30 (Fijo 68Ga), 11:00-11:30 (Sedación) |
| **Martes** | Fluor-PSMA + 18F-FDG | 4 Fluor-PSMA + 4 FDG | 08:00-09:30 (Fluor-PSMA), 10:00-11:00 (FDG) |
| **Miércoles** | 18F-Colina | 6 Colina | 08:00-10:00 (Autónomos), 10:00-11:00 (Planta/Silla) |
| **Jueves** | 18F-FDG + 68Ga-PSMA/Somatostatina | 7 FDG + 1 68Ga | 08:00-10:00 (Autónomos), 10:00-11:00 (Planta/Silla), 10:30 (Fijo 68Ga), 11:00-11:30 (Sedación) |
| **Viernes** | 18F-FDG + 68Ga-PSMA/Somatostatina | 7 FDG + 1 68Ga | 08:00-10:00 (Autónomos), 10:00-11:00 (Planta/Silla), 10:30 (Fijo 68Ga), 11:00-11:30 (Sedación) |

---

## 🛡️ 3. Alertas Técnicas y Bloqueos de Seguridad

1. **Fin de QT/RT hace < 21 días:**
   - Asigna etiqueta `⚠️ ALERTA TÉCNICA: QT/RT RECIENTE (<21 días)`.
   - Desplaza la fecha mínima de agendamiento automático a exactamente **21 días después de la fecha de fin de tratamiento**.
2. **Glucemia > 180 mg/dL:**
   - Asigna etiqueta `⚠️ PROTOCOLO DIABETES (Glucemia > 180 mg/dL)`.
   - Asigna la URL del vídeo explicativo de ajuste insulínico previo al PET.

---

## ⚙️ 4. Guía de Instalación en Google Sheets (Google Apps Script)

1. Abre la Hoja de Cálculo: [Spreadsheet URL](https://docs.google.com/spreadsheets/d/1PRrDEG0F3OmCLGJ9Ir3wwkuhofIXvVfVz9DpJaTmuMM/edit).
2. Ve al menú superior: **Extensiones > Apps Script**.
3. Reemplaza el código por defecto con el contenido del archivo [`app_script/Code.gs`](file:///Users/osa/.gemini/antigravity/scratch/pet_ct_triage/app_script/Code.gs).
4. Guarda el proyecto (Ctrl+S / Cmd+S) con el nombre `PET_CT_Triage_Scheduler`.
5. Ejecuta la función `onOpen` o recarga el Google Sheet para que aparezca el menú personalizado **`🏥 PET/CT Triaje`**.
6. En el menú del Sheet, selecciona **`⏰ Instalar Trigger Automático`** para que cada nueva respuesta entrante de Tally active el triaje y asignación en tiempo real.

---

## 🐍 5. Ejecución del Backend en Python y Pruebas Unitarias

Para ejecutar la suite de pruebas automáticas:

```bash
python3 python/test_triage.py
```

Para procesar peticiones en lote desde Python:

```bash
python3 python/pet_ct_triage.py
```

---

## 🌐 6. Simulador / Dashboard Web Interactivo

Abre `web_app/index.html` en el navegador para acceder a una interfaz visual donde podrás:
- Probar solicitudes de prueba de pacientes en tiempo real.
- Visualizar la asignación inmediata de prioridad (P1/P2/P3), fecha, hora y alertas técnicas.
- Inspeccionar el calendario semanal y la ocupación de cupos por radiofármaco.
- **⚙️ Edición Dinámica de Agendas de Citación por Día**:
  - Configuración personalizada e independiente por día concreto o modificación de la plantilla semanal estándar.
  - **🌆 Activación de Turnos de Tarde**: Posibilidad de habilitar turnos vespertinos (ej. 15:00 a 18:30) con cupos, horarios e intervalos configurables.
  - **💊 Gestión de Nuevos Tratamientos**: Soporte ampliado para 18F-DOPA, 18F-Florbetapir/Amiloide, 18F-Flutemetamol/Tau, 177Lu Terapias o introducción de cualquier tratamiento personalizado mediante campo de texto libre.
  - **⚡ Motor de Auto-Relleno con Triaje Clínico**: Algoritmo inteligente que distribuye automáticamente a los pacientes en lista de espera en los huecos libres de Mañana y Tarde respetando la prioridad médica (🔴 P1 > 🟡 P2 > 🟢 P3), la compatibilidad del radiofármaco prescrito y las alertas de QT/RT reciente (< 21 días).

