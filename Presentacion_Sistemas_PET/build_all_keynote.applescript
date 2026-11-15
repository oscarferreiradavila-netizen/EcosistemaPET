tell application "Keynote"
  set doc to make new document with properties {document theme:theme "Básico blanco", width:1920, height:1080}
  tell doc
    tell slide 1
      set object text of default title item to "ECOSISTEMA DIGITAL PET/CT & MEDICINA NUCLEAR"
      set object text of default body item to "Suite Asistencial de Prescripción Médica, Triaje Matricial y Acompañamiento Clínico al Paciente

Galaria · Empresa Pública de Servizos Sanitarios | SERGAS · Hospital Meixoeiro
Sesión Clínica Departamental · 2026"
      set position of default title item to {120, 240}
      set width of default title item to 1680
      set position of default body item to {120, 480}
      set width of default body item to 1680
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "1. Retos y Cuellos de Botella en Medicina Nuclear"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ T½ Flúor-18: 110 min  |  Coste dosis: 400€ - 1.200€  |  Absentismo previo: 8-12% ]

• Decaimiento Físico Inflexible: 18F (110 min) y 68Ga (68 min). Cada cita perdida destruye la dosis.

• Cancelaciones en el Día: Ingestas inadvertidas o glucemias descompensadas en el box de inyección.

• Volantes No Estructurados: Solicitudes en papel sin peso ni talla para MBq, ni antecedentes de QT/RT.

• Sobrecarga Telefónica: Enfermería consumida respondiendo dudas básicas repetitivas sobre el ayuno."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_triage_table.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "2. Arquitectura Integral: 6 Módulos Conectados"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Interoperabilidad HL7 / JSON  |  3 Consolas Especializadas  |  Sincronización en Tiempo Real ]

• Ciclo Completo 360°: Desde la prescripción del oncólogo hasta el alta de enfermería tras la prueba.

• Base de Datos Unificada: Sincronización instantánea entre volantes, agendas y pantallas de sala.

• Consolas por Perfil Clínico: Pantallas específicas para Médicos Nucleares, Enfermería y Técnicos TSID.

• Acompañamiento Continuo: 12 audioguías y asistente virtual empático 24/7 en el móvil del paciente."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_peticion_db.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "3. Portal Clínico de Prescripción Médica PET/CT"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ 10 Trazadores Tipificados  |  Dosimetría Automática en MBq  |  Prioridad EANM (P1 / P2 / P3) ]

• Cálculo Dosimétrico Automático: Peso y talla obligatorios para calcular la actividad en MBq.

• Catálogo de 10 Protocolos: FDG oncológico, contraste iodado, Endocarditis HEP, PSMA, Colina y Cerebro.

• Motor de Priorización EANM: Clasificación objetiva en P1 (<7d), P2 (<14d) o P3 (>14d).

• Panel 'Mis Peticiones': Seguimiento de estado en vivo para el médico peticionario."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_peticion.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "4. Suite de Triaje y Agendamiento Matricial"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Bloqueo QT/RT: 21 días  |  Matriz Semanal de Isótopos  |  Zonificación por Movilidad ]

• Parrilla por Radiofármaco: Cupos semanales sincronizados con el ciclotrón (FDG, PSMA y Colina).

• Bloqueo Preventivo QT/RT (<21 días): Evita falsos negativos por aturdimiento tumoral fijando fecha mínima.

• Zonificación Horaria Asistencial: 08:00h autónomos, 10:00h traslados en camilla, 11:00h sedación.

• Gestión de Demoras: Planificación de agendas ordinarias y jornadas vespertinas extraordinarias."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_triage_dashboard.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "5. Portal de Audioguías Oficiales de Preparación"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ 12 Audioguías Oficiales  |  Enlace Web Directo por SMS  |  Cronómetro de Ayuno en Vivo ]

• 12 Protocolos Específicos: Desde FDG estándar hasta dieta cetogénica 16h en Endocarditis.

• Narración Oral con Voz: Locución clara pensada para personas mayores o con dificultades visuales.

• Cronómetro de Ayuno: Cuenta atrás visual adaptada a la hora exacta de la cita del paciente.

• Cero Barreras: Enlace web directo por SMS oficial del SERGAS, sin instalar aplicaciones ni recordar contraseñas."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_prep.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "6. Chatbot Empático de Enfermería con Streaming"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Escritura Progresiva en Streaming  |  Personalización con NHC  |  Audio Síntesis 24/7 ]

• Efecto Typewriter Streaming: Respuestas redactadas progresivamente con ritmo pausado y humano.

• Personalización Real: Llama al paciente por su nombre, confirma hora y sala en el Meixoeiro.

• Contención de Ansiedad: Explica con cercanía que el tomógrafo es abierto, ventilado y luminoso.

• Síntesis de Voz Integrada: Botón 'Escuchar' para reproducir la respuesta locutada en alta fidelidad."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/prep_chatbot.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "7. Consola de Enfermería y Control Pre-Analítico"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Alerta Glucemia ≥200 mg/dL  |  Botón 'Pode Marchar'  |  Detección Temprana de Incidencias ]

• Semáforo Domiciliario: Paciente reporta glucemia antes de salir de casa; alerta si ≥200 mg/dL.

• Anticipación de Huecos: Cancelaciones detectadas 24-48h antes para citar pacientes de lista de espera.

• Protocolo 'Pode Marchar': Validación de hidratación y micción para archivar el episodio con un clic.

• Bandeja de Incidencias: Atención prioritaria a pacientes que requieren consulta telefónica real."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/enfermeria_dashboard.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "8. Consola Médica & Carpeta de Peticiones No Triables"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Criterio Médico Soberano  |  Buzón de Casos Complejos  |  Pauta Técnica Digital en 3 Clics ]

• Carpeta de No Triables: Casos clínicos complejos retenidos para que el médico decida prioridad.

• Visor Oficial SERGAS: Acceso inmediato a antecedentes oncológicos, informes de TC y analíticas.

• Pauta a Máquina en 3 Clics: Brazos arriba/abajo, tiempos por cama, diurético (Seguril) y contraste.

• Sincronización en Sala: Órdenes médicas visibles de inmediato en el tomógrafo de los TSID."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/triage_confirmaciones.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "9. Consola Técnica TSID (Sala de Tomógrafo)"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Pico Metabólico Óptimo (60 min)  |  Esquema Anatómico Vectorial  |  Control Vía 18G / Contraste ]

• Cronómetro de Captación: Tiempo exacto tras inyección para pasar a camilla en pico óptimo (60 min).

• Esquemas Vectoriales Posturales: Indicación visual inequívoca de brazos, centrado láser e isocentro.

• Mapa de Campos FOV: Longitud de corte clara (cráneo-muslos vs cuerpo entero con extremidades).

• Semáforo de Contraste IV: Confirmación de calibre de vía (18G), volumen en mL y retardo de fase."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/enfermeria_consola_abierta.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "10. Impacto Asistencial, Clínico y Retorno de Inversión"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ ROI Inmediato  |  Garantía Plazos SERGAS  |  Optimización Ciclotrón ]

• < 1.5% Absentismo: Reducción drástica frente al 8-12% de la citación tradicional en papel.

• 100% Aprovechamiento: Cero dosis de ciclotrón o generador caducadas por incomparecencia.

• Triaje en Minutos: De 48 horas de revisión manual de volantes a agendamiento algorítmico ágil.

• -70% Carga Telefónica: Enfermería liberada de llamadas repetitivas sobre normas de ayuno."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/deck_preview.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "11. Demostración en Vivo & Despliegue Inmediato"
      set position of default title item to {80, 50}
      set width of default title item to 1760
      set object text of default body item to "[ Modo Demo Auto-Reset 24h  |  Cero Instalación de Software  |  Validación Departamental ]

• Modo Demo Auto-Reset 24h: Citas siempre activas para HOY y MAÑANA en cualquier fecha.

• Acceso Universal sin Instalación: Operativo en ordenadores del hospital, tablets y teléfonos móviles.

• Caso Piloto (Carmen Lois Souto): Demostración en 3 min (No Triables -> Triaje P1 -> Chatbot -> Alta).

• Listo para Implantación: Validación departamental para despliegue en Galaria y el SERGAS."
      set position of default body item to {80, 180}
      set width of default body item to 860
      set height of default body item to 820
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_peticion_db.png"
      set img to make new image with properties {file:imgPath}
      set origW to width of img
      set origH to height of img
      if (origW / origH) > (880.0 / 760.0) then
        set width of img to 880
      else
        set height of img to 760
      end if
      set position of img to {980, 190}
    end tell
  end tell
  export doc to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/Presentacion_Ecosistema_PET_CT.pptx" as Microsoft PowerPoint
  export doc to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/Presentacion_Ecosistema_PET_CT.pdf" as PDF
  close doc saving no
  return "EXPORT_COMPLETE"
end tell