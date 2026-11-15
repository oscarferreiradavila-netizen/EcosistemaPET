#!/usr/bin/env ruby
# encoding: UTF-8
require 'fileutils'

workspace = "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET"
target_dir = "#{workspace}/Presentacion_Sistemas_PET"
screenshots_dir = "#{target_dir}/screenshots"

def as_str(val)
  # Sanitizar texto para AppleScript conservando UTF-8 puro
  escaped = val.to_s.gsub('\\', '\\\\').gsub('"', '\"')
  "\"#{escaped}\""
end

slides = [
  {
    num: 1,
    is_cover: true,
    title: "ECOSISTEMA DIGITAL PET/CT & MEDICINA NUCLEAR",
    subtitle: "Suite Integral de Prescripción Médica, Triaje Logístico Matricial, Audioguías Asistenciales y Seguridad Radiológica\n\nGalaria · Empresa Pública de Servizos Sanitarios | SERGAS\nOctubre 2026"
  },
  {
    num: 2,
    is_cover: false,
    title: "1. Mapa General del Ecosistema e Interoperabilidad",
    body: "• Ciclo Completo del Paciente: Conecta la prescripción desde cualquier servicio hospitalario (Oncología, Urología, etc.) con el triaje matricial y la cita efectiva.\n\n• Base de Datos Centralizada: Modelo de datos normalizado (JSON / CSV) que sincroniza en tiempo real las solicitudes con la agenda de citas.\n\n• Priorización Clínica Objetiva: Clasificación en P1 (Urgente <7d), P2 (Preferente <14d) y P3 (Ordinaria >14d) según indicación y ventana clínica.\n\n• Seguridad Activa Preventiva: Cribado automático de quimioterapia/radioterapia reciente e hiperglucemias.\n\n• Asistencia al Paciente: Audioguías oficiales y pautas preanalíticas para garantizar la calidad diagnóstica de la imagen.",
    image: "#{screenshots_dir}/pet_peticion_db.png"
  },
  {
    num: 3,
    is_cover: false,
    title: "2. Portal Clínico de Prescripción Médica PET/CT",
    body: "• Formulario Oficial Digitalizado: Recogida estructurada de datos del paciente, NHC, médico prescriptor y servicio hospitalario de origen.\n\n• Catálogo Oficial de 10 Trazadores:\n  1. 18F-FDG Oncológico / Inflamatorio\n  2. 18F-FDG con Contraste Iodado\n  3. 18F-FDG Endocarditis + Protocolo HEP\n  4. 68Ga-PSMA (Próstata)\n  5. 68Ga-DOTATOC (Tumores Neuroendocrinos)\n  6. 18F-Colina (Hiperparatiroidismo)\n  7. 18F-Paratiroides\n  8. 18F-FDG Neurología (Deterioro Cognitivo)\n  9. 18F-FDG Neurofisioneurología (Epilepsia)\n  10. 18F-PSMA\n\n• Parámetros Dosimétricos: Registro de peso y talla para cálculo estricto de la actividad en MBq a inyectar.\n\n• Filtros Clínicos: Alergias al yodo, insuficiencia renal, sedación y requerimientos de camilla o traslado.",
    image: "#{screenshots_dir}/pet_peticion.png"
  },
  {
    num: 4,
    is_cover: false,
    title: "3. Base de Datos Maestra y Auditoría de Peticiones",
    body: "• Búsqueda y Filtro Dinámico: Localización instantánea de solicitudes por paciente, NHC, médico o diagnóstico oncológico.\n\n• Monitor de Carga Asistencial: Contadores automáticos KPI de solicitudes registradas, citas agendadas y distribución por prioridad.\n\n• Interoperabilidad Inmediata: Exportación en un clic a JSON (para nutrir el motor de triaje) y a CSV para Excel o Google Sheets.\n\n• Emisión de Volantes Médicos: Impresión directa de la ficha clínica oficial en PDF para incorporar a la historia del paciente.",
    image: "#{screenshots_dir}/pet_peticion_db.png"
  },
  {
    num: 5,
    is_cover: false,
    title: "4. Suite de Triaje Clínico y Agendamiento Matricial",
    body: "• Parrilla Semanal por Radiofármaco y Suministro:\n  • Lunes, Jueves y Viernes: 7 cupos 18F-FDG + 1 cupo 68Ga-PSMA/DOTATOC.\n  • Martes: 4 cupos Fluor-PSMA + 4 cupos 18F-FDG.\n  • Miércoles: 6 cupos 18F-Colina.\n\n• Franjas Horarias Adaptadas:\n  • 08:00 - 10:00: Pacientes autónomos.\n  • 10:00 - 11:00: Pacientes ingresados en planta o silla/camilla.\n  • 10:30: Slot exclusivo de elución fija para Galio-68.\n  • 11:00 - 11:30: Pacientes con necesidad de sedación.\n\n• Eficiencia Radiofarmacéutica: Minimiza el decaimiento radiactivo entre la entrega del ciclotrón y la inyección al paciente.",
    image: "#{screenshots_dir}/pet_triage_dashboard.png"
  },
  {
    num: 6,
    is_cover: false,
    title: "5. Filtros de Seguridad y Prevención de Errores",
    body: "• ⛔ Bloqueo por QT/RT Reciente (< 21 días):\n  • Evita falsos negativos provocados por el 'aturdimiento celular' post-tratamiento o falsos positivos inflamatorios.\n  • Desplaza automáticamente la fecha mínima asignable al día 21 post-tratamiento.\n\n• 🩸 Protocolo Diabetes (Glucemia > 180 mg/dL):\n  • Detecta hiperglucemias que compiten con el 18F-FDG por los receptores GLUT.\n  • Asigna automáticamente pauta de corrección y video instructivo de ajuste de insulina.\n\n• 📋 Gestión de Jornadas Extra (Peonadas):\n  • Asignación de cupos vespertinos extraordinarios para cumplir los objetivos de lista de espera del SERGAS.",
    image: "#{screenshots_dir}/pet_triage_table.png"
  },
  {
    num: 7,
    is_cover: false,
    title: "6. Portal de Audioguías Oficiales de Preparación",
    body: "• 🔊 Audioguía con Síntesis de Voz: Narración oral paso a paso de las normas asistenciales para pacientes mayores o con dificultades visuales.\n\n• ⏱️ Cronómetro Interactivo de Ayuno: Control preciso del ayuno de 6 horas de sólidos previas a la inyección.\n\n• 🥗 Protocolo Dietético Restrictivo: Dieta pobre en hidratos 24h antes y reposo muscular absoluto para evitar captación miocárdica o en grasa parda.\n\n• 💧 Pauta de Hidratación Abundante: Ingesta de 1 litro de agua pura para favorecer la diuresis y proteger la vejiga de la radiación.",
    image: "#{screenshots_dir}/pet_prep.png"
  },
  {
    num: 8,
    is_cover: false,
    title: "7. Consola de Enfermería y Verificación Previa",
    body: "• 📞 Verificación Telefónica Pre-Cita (48-72h antes): Contacto directo con el paciente para confirmar la adherencia al ayuno y la dieta.\n\n• 💉 Ajuste Personalizado de Tratamiento: Control y suspensión pautada de metformina, corticoides y medicación habitual.\n\n• 🚑 Coordinación de Ambulancias: Solicitud de transporte sanitario individual o colectivo y camillas para evitar demoras.\n\n• 📉 Reducción del Absentismo: Tasa de citas canceladas ('no-shows') reducida a menos del 1.5%.",
    image: "#{screenshots_dir}/pet_prep_enfermeria.png"
  },
  {
    num: 9,
    is_cover: false,
    title: "8. RadioRisk: Formación y Gamificación en ALARA",
    body: "• ☢️ Cultura de Seguridad ALARA: Formación en los tres principios básicos: Distancia, Tiempo de exposición y Blindaje plomado.\n\n• 💶 Dinámica Lúdica 'Radiación vs Salario': A mayor radiación acumulada durante la jornada, mayor penalización económica en el salario del turno.\n\n• 🩺 4 Roles Profesionales: Enfermería, Técnicos TSID, Facultativos y Radiofarmacia.\n\n• 🧪 Física Dosimétrica Real: Manejo de 18F (511 keV) y 99mTc (140 keV), cálculo de tasa en µSv/h y compra de equipamiento de protección plomado.",
    image: "#{screenshots_dir}/game.png"
  },
  {
    num: 10,
    is_cover: false,
    title: "9. Conclusiones y Beneficios para el Servicio",
    body: "• 🚀 Agilidad Asistencial: Reducción del tiempo de triaje clínico de 48 horas a minutos.\n\n• 💯 Máximo Rendimiento Radiofarmacéutico: Sincronización exacta entre la vida media isotópica y la llegada de los pacientes.\n\n• 🛡️ Cero Exploraciones Inútiles: Filtros preventivos de quimioterapia y glucemia que garantizan estudios diagnósticos válidos.\n\n• 🤝 Acompañamiento del Paciente: Las audioguías y el seguimiento telefónico aportan tranquilidad y confianza.\n\n• 🎓 Capacitación Continua: La gamificación consolida los hábitos de protección radiológica en todo el equipo asistencial.",
    image: "#{screenshots_dir}/pet_triage_dashboard.png"
  }
]

as_script = []
as_script << 'tell application "Keynote"'
as_script << '  set doc to make new document with properties {document theme:theme "Básico blanco"}'
as_script << '  tell doc'

slides.each do |s|
  if s[:is_cover]
    as_script << '    tell slide 1'
    as_script << "      set object text of default title item to #{as_str(s[:title])}"
    as_script << "      set object text of default body item to #{as_str(s[:subtitle])}"
    as_script << '    end tell'
  else
    as_script << '    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}'
    as_script << '    tell newSlide'
    as_script << "      set object text of default title item to #{as_str(s[:title])}"
    as_script << "      set object text of default body item to #{as_str(s[:body])}"
    as_script << '      set width of default body item to 840'
    as_script << '      set position of default body item to {80, 200}'
    if s[:image] && File.exist?(s[:image])
      as_script << "      set imgPath to POSIX file #{as_str(s[:image])}"
      as_script << '      set img to make new image with properties {file:imgPath}'
      as_script << '      set position of img to {960, 200}'
      as_script << '      set width of img to 880'
    end
    as_script << '    end tell'
  end
end

pptx_path = "#{target_dir}/Presentacion_Ecosistema_PET_CT.pptx"
pdf_path = "#{target_dir}/Presentacion_Ecosistema_PET_CT.pdf"

as_script << '  end tell'
as_script << "  export doc to POSIX file #{as_str(pptx_path)} as Microsoft PowerPoint"
as_script << "  export doc to POSIX file #{as_str(pdf_path)} as PDF"
as_script << '  close doc saving no'
as_script << '  return "EXPORT_COMPLETE"'
as_script << 'end tell'

script_content = as_script.join("\n")
File.write("#{target_dir}/generate_native.applescript", script_content)

puts "Ejecutando AppleScript..."
output = `osascript "#{target_dir}/generate_native.applescript"`
puts "Resultado: #{output}"
