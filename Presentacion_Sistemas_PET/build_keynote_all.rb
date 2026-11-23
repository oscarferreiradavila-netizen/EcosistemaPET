# encoding: UTF-8
require 'fileutils'

target_dir = "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET"
screenshots_dir = "#{target_dir}/screenshots"

slides = [
  {
    num: 1,
    is_cover: true,
    title: "ECOSISTEMA DIGITAL PET/CT & MEDICINA NUCLEAR",
    subtitle: "Suite Asistencial de Prescripción Médica, Triaje Matricial y Acompañamiento Clínico al Paciente\n\nGalaria · Empresa Pública de Servizos Sanitarios | SERGAS · Hospital Meixoeiro\nSesión Clínica Departamental · 2026"
  },
  {
    num: 2,
    is_cover: false,
    title: "1. Retos y Cuellos de Botella en Medicina Nuclear",
    badge: "T½ Flúor-18: 110 min  |  Coste dosis: 400€ - 1.200€  |  Absentismo previo: 8-12%",
    body: "• Decaimiento Físico Inflexible: 18F (110 min) y 68Ga (68 min). Cada cita perdida destruye la dosis.\n\n• Cancelaciones en el Día: Ingestas inadvertidas o glucemias descompensadas en el box de inyección.\n\n• Volantes No Estructurados: Solicitudes en papel sin peso ni talla para MBq, ni antecedentes de QT/RT.\n\n• Sobrecarga Telefónica: Enfermería consumida respondiendo dudas básicas repetitivas sobre el ayuno.",
    image: "#{screenshots_dir}/pet_triage_table.png"
  },
  {
    num: 3,
    is_cover: false,
    title: "2. Arquitectura Integral: 6 Módulos Conectados",
    badge: "Interoperabilidad HL7 / JSON  |  3 Consolas Especializadas  |  Sincronización en Tiempo Real",
    body: "• Ciclo Completo 360°: Desde la prescripción del oncólogo hasta el alta de enfermería tras la prueba.\n\n• Base de Datos Unificada: Sincronización instantánea entre volantes, agendas y pantallas de sala.\n\n• Consolas por Perfil Clínico: Pantallas específicas para Médicos Nucleares, Enfermería y Técnicos TSID.\n\n• Acompañamiento Continuo: 12 audioguías y asistente virtual empático 24/7 en el móvil del paciente.",
    image: "#{screenshots_dir}/pet_peticion_db.png"
  },
  {
    num: 4,
    is_cover: false,
    title: "3. Portal Clínico de Prescripción Médica PET/CT",
    badge: "10 Trazadores Tipificados  |  Dosimetría Automática en MBq  |  Prioridad EANM (P1 / P2 / P3)",
    body: "• Cálculo Dosimétrico Automático: Peso y talla obligatorios para calcular la actividad en MBq.\n\n• Catálogo de 10 Protocolos: FDG oncológico, contraste iodado, Endocarditis HEP, PSMA, Colina y Cerebro.\n\n• Motor de Priorización EANM: Clasificación objetiva en P1 (<7d), P2 (<14d) o P3 (>14d).\n\n• Panel 'Mis Peticiones': Seguimiento de estado en vivo para el médico peticionario.",
    image: "#{screenshots_dir}/pet_peticion.png"
  },
  {
    num: 5,
    is_cover: false,
    title: "4. Suite de Triaje y Agendamiento Matricial",
    badge: "Bloqueo QT/RT: 21 días  |  Matriz Semanal de Isótopos  |  Zonificación por Movilidad",
    body: "• Parrilla por Radiofármaco: Cupos semanales sincronizados con el ciclotrón (FDG, PSMA y Colina).\n\n• Bloqueo Preventivo QT/RT (<21 días): Evita falsos negativos por aturdimiento tumoral fijando fecha mínima.\n\n• Zonificación Horaria Asistencial: 08:00h autónomos, 10:00h traslados en camilla, 11:00h sedación.\n\n• Gestión de Demoras: Planificación de agendas ordinarias y jornadas vespertinas extraordinarias.",
    image: "#{screenshots_dir}/pet_triage_dashboard.png"
  },
  {
    num: 6,
    is_cover: false,
    title: "5. Portal de Audioguías Oficiales de Preparación",
    badge: "12 Audioguías Oficiales  |  Enlace Web Directo por SMS  |  Cronómetro de Ayuno en Vivo",
    body: "• 12 Protocolos Específicos: Desde FDG estándar hasta dieta cetogénica 16h en Endocarditis.\n\n• Narración Oral con Voz: Locución clara pensada para personas mayores o con dificultades visuales.\n\n• Cronómetro de Ayuno: Cuenta atrás visual adaptada a la hora exacta de la cita del paciente.\n\n• Cero Barreras: Enlace web directo por SMS oficial del SERGAS, sin instalar aplicaciones ni recordar contraseñas.",
    image: "#{screenshots_dir}/pet_prep.png"
  },
  {
    num: 7,
    is_cover: false,
    title: "6. Chatbot Empático de Enfermería con Streaming",
    badge: "Escritura Progresiva en Streaming  |  Personalización con NHC  |  Audio Síntesis 24/7",
    body: "• Efecto Typewriter Streaming: Respuestas redactadas progresivamente con ritmo pausado y humano.\n\n• Personalización Real: Llama al paciente por su nombre, confirma hora y sala en el Meixoeiro.\n\n• Contención de Ansiedad: Explica con cercanía que el tomógrafo es abierto, ventilado y luminoso.\n\n• Síntesis de Voz Integrada: Botón 'Escuchar' para reproducir la respuesta locutada en alta fidelidad.",
    image: "#{screenshots_dir}/prep_chatbot.png"
  },
  {
    num: 8,
    is_cover: false,
    title: "7. Consola de Enfermería y Control Pre-Analítico",
    badge: "Alerta Glucemia ≥200 mg/dL  |  Botón 'Pode Marchar'  |  Detección Temprana de Incidencias",
    body: "• Semáforo Domiciliario: Paciente reporta glucemia antes de salir de casa; alerta si ≥200 mg/dL.\n\n• Anticipación de Huecos: Cancelaciones detectadas 24-48h antes para citar pacientes de lista de espera.\n\n• Protocolo 'Pode Marchar': Validación de hidratación y micción para archivar el episodio con un clic.\n\n• Bandeja de Incidencias: Atención prioritaria a pacientes que requieren consulta telefónica real.",
    image: "#{screenshots_dir}/enfermeria_dashboard.png"
  },
  {
    num: 9,
    is_cover: false,
    title: "8. Consola Médica & Carpeta de Peticiones No Triables",
    badge: "Criterio Médico Soberano  |  Buzón de Casos Complejos  |  Pauta Técnica Digital en 3 Clics",
    body: "• Carpeta de No Triables: Casos clínicos complejos retenidos para que el médico decida prioridad.\n\n• Visor Oficial SERGAS: Acceso inmediato a antecedentes oncológicos, informes de TC y analíticas.\n\n• Pauta a Máquina en 3 Clics: Brazos arriba/abajo, tiempos por cama, diurético (Seguril) y contraste.\n\n• Sincronización en Sala: Órdenes médicas visibles de inmediato en el tomógrafo de los TSID.",
    image: "#{screenshots_dir}/triage_confirmaciones.png"
  },
  {
    num: 10,
    is_cover: false,
    title: "9. Consola Técnica TSID (Sala de Tomógrafo)",
    badge: "Pico Metabólico Óptimo (60 min)  |  Esquema Anatómico Vectorial  |  Control Vía 18G / Contraste",
    body: "• Cronómetro de Captación: Tiempo exacto tras inyección para pasar a camilla en pico óptimo (60 min).\n\n• Esquemas Vectoriales Posturales: Indicación visual inequívoca de brazos, centrado láser e isocentro.\n\n• Mapa de Campos FOV: Longitud de corte clara (cráneo-muslos vs cuerpo entero con extremidades).\n\n• Semáforo de Contraste IV: Confirmación de calibre de vía (18G), volumen en mL y retardo de fase.",
    image: "#{screenshots_dir}/enfermeria_consola_abierta.png"
  },
  {
    num: 11,
    is_cover: false,
    title: "10. Impacto Asistencial, Clínico y Retorno de Inversión",
    badge: "ROI Inmediato  |  Garantía Plazos SERGAS  |  Optimización Ciclotrón",
    body: "• < 1.5% Absentismo: Reducción drástica frente al 8-12% de la citación tradicional en papel.\n\n• 100% Aprovechamiento: Cero dosis de ciclotrón o generador caducadas por incomparecencia.\n\n• Triaje en Minutos: De 48 horas de revisión manual de volantes a agendamiento algorítmico ágil.\n\n• -70% Carga Telefónica: Enfermería liberada de llamadas repetitivas sobre normas de ayuno.",
    image: "#{screenshots_dir}/deck_preview.png"
  },
  {
    num: 12,
    is_cover: false,
    title: "11. Demostración en Vivo & Despliegue Inmediato",
    badge: "Modo Demo Auto-Reset 24h  |  Cero Instalación de Software  |  Validación Departamental",
    body: "• Modo Demo Auto-Reset 24h: Citas siempre activas para HOY y MAÑANA en cualquier fecha.\n\n• Acceso Universal sin Instalación: Operativo en ordenadores del hospital, tablets y teléfonos móviles.\n\n• Caso Piloto (Carmen Lois Souto): Demostración en 3 min (No Triables -> Triaje P1 -> Chatbot -> Alta).\n\n• Listo para Implantación: Validación departamental para despliegue en Galaria y el SERGAS.",
    image: "#{screenshots_dir}/pet_peticion_db.png"
  }
]

def as_str(val)
  escaped = val.to_s.gsub("\\", "\\\\").gsub("\"", "\\\"")
  "\"#{escaped}\""
end

as_script = []
as_script << 'tell application "Keynote"'
as_script << '  set doc to make new document with properties {document theme:theme "Básico blanco", width:1920, height:1080}'
as_script << '  tell doc'

slides.each_with_index do |s, idx|
  if s[:is_cover]
    as_script << '    tell slide 1'
    as_script << "      set object text of default title item to #{as_str(s[:title])}"
    as_script << "      set object text of default body item to #{as_str(s[:subtitle])}"
    as_script << '      set position of default title item to {120, 240}'
    as_script << '      set width of default title item to 1680'
    as_script << '      set position of default body item to {120, 480}'
    as_script << '      set width of default body item to 1680'
    as_script << '    end tell'
  else
    as_script << '    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}'
    as_script << '    tell newSlide'
    as_script << "      set object text of default title item to #{as_str(s[:title])}"
    as_script << '      set position of default title item to {80, 50}'
    as_script << '      set width of default title item to 1760'
    
    # Text content with badge header
    full_text = ""
    if s[:badge]
      full_text += "[ #{s[:badge]} ]\n\n"
    end
    full_text += s[:body]

    as_script << "      set object text of default body item to #{as_str(full_text)}"
    as_script << '      set position of default body item to {80, 180}'
    as_script << '      set width of default body item to 860'
    as_script << '      set height of default body item to 820'
    if s[:image] && File.exist?(s[:image])
      as_script << "      set imgPath to POSIX file #{as_str(s[:image])}"
      as_script << '      set img to make new image with properties {file:imgPath}'
      as_script << '      set origW to width of img'
      as_script << '      set origH to height of img'
      as_script << '      if (origW / origH) > (880.0 / 760.0) then'
      as_script << '        set width of img to 880'
      as_script << '      else'
      as_script << '        set height of img to 760'
      as_script << '      end if'
      as_script << '      set position of img to {980, 190}'
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
File.write("#{target_dir}/build_all_keynote.applescript", script_content)
puts "AppleScript generado con exito (#{script_content.lines.size} lineas)"
