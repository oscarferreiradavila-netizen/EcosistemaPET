tell application "Keynote"
  set doc to make new document with properties {document theme:theme "Básico blanco"}
  tell doc
    tell slide 1
      set object text of default title item to "ECOSISTEMA DIGITAL PET/CT & MEDICINA NUCLEAR"
      set object text of default body item to "Suite Integral de Prescripción Médica, Triaje Logístico Matricial, Audioguías Asistenciales y Seguridad Radiológica

Galaria · Empresa Pública de Servizos Sanitarios | SERGAS
Octubre 2026"
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "1. Mapa General del Ecosistema e Interoperabilidad"
      set object text of default body item to "• Ciclo Completo del Paciente: Conecta la prescripción desde cualquier servicio hospitalario (Oncología, Urología, etc.) con el triaje matricial y la cita efectiva.

• Base de Datos Centralizada: Modelo de datos normalizado (JSON / CSV) que sincroniza en tiempo real las solicitudes con la agenda de citas.

• Priorización Clínica Objetiva: Clasificación en P1 (Urgente <7d), P2 (Preferente <14d) y P3 (Ordinaria >14d) según indicación y ventana clínica.

• Seguridad Activa Preventiva: Cribado automático de quimioterapia/radioterapia reciente e hiperglucemias.

• Asistencia al Paciente: Audioguías oficiales y pautas preanalíticas para garantizar la calidad diagnóstica de la imagen."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_peticion_db.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "2. Portal Clínico de Prescripción Médica PET/CT"
      set object text of default body item to "• Formulario Oficial Digitalizado: Recogida estructurada de datos del paciente, NHC, médico prescriptor y servicio hospitalario de origen.

• Catálogo Oficial de 10 Trazadores:
  1. 18F-FDG Oncológico / Inflamatorio
  2. 18F-FDG con Contraste Iodado
  3. 18F-FDG Endocarditis + Protocolo HEP
  4. 68Ga-PSMA (Próstata)
  5. 68Ga-DOTATOC (Tumores Neuroendocrinos)
  6. 18F-Colina (Hiperparatiroidismo)
  7. 18F-Paratiroides
  8. 18F-FDG Neurología (Deterioro Cognitivo)
  9. 18F-FDG Neurofisioneurología (Epilepsia)
  10. 18F-PSMA

• Parámetros Dosimétricos: Registro de peso y talla para cálculo estricto de la actividad en MBq a inyectar.

• Filtros Clínicos: Alergias al yodo, insuficiencia renal, sedación y requerimientos de camilla o traslado."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_peticion.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "3. Base de Datos Maestra y Auditoría de Peticiones"
      set object text of default body item to "• Búsqueda y Filtro Dinámico: Localización instantánea de solicitudes por paciente, NHC, médico o diagnóstico oncológico.

• Monitor de Carga Asistencial: Contadores automáticos KPI de solicitudes registradas, citas agendadas y distribución por prioridad.

• Interoperabilidad Inmediata: Exportación en un clic a JSON (para nutrir el motor de triaje) y a CSV para Excel o Google Sheets.

• Emisión de Volantes Médicos: Impresión directa de la ficha clínica oficial en PDF para incorporar a la historia del paciente."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_peticion_db.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "4. Suite de Triaje Clínico y Agendamiento Matricial"
      set object text of default body item to "• Parrilla Semanal por Radiofármaco y Suministro:
  • Lunes, Jueves y Viernes: 7 cupos 18F-FDG + 1 cupo 68Ga-PSMA/DOTATOC.
  • Martes: 4 cupos Fluor-PSMA + 4 cupos 18F-FDG.
  • Miércoles: 6 cupos 18F-Colina.

• Franjas Horarias Adaptadas:
  • 08:00 - 10:00: Pacientes autónomos.
  • 10:00 - 11:00: Pacientes ingresados en planta o silla/camilla.
  • 10:30: Slot exclusivo de elución fija para Galio-68.
  • 11:00 - 11:30: Pacientes con necesidad de sedación.

• Eficiencia Radiofarmacéutica: Minimiza el decaimiento radiactivo entre la entrega del ciclotrón y la inyección al paciente."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_triage_dashboard.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "5. Filtros de Seguridad y Prevención de Errores"
      set object text of default body item to "• ⛔ Bloqueo por QT/RT Reciente (< 21 días):
  • Evita falsos negativos provocados por el 'aturdimiento celular' post-tratamiento o falsos positivos inflamatorios.
  • Desplaza automáticamente la fecha mínima asignable al día 21 post-tratamiento.

• 🩸 Protocolo Diabetes (Glucemia > 180 mg/dL):
  • Detecta hiperglucemias que compiten con el 18F-FDG por los receptores GLUT.
  • Asigna automáticamente pauta de corrección y video instructivo de ajuste de insulina.

• 📋 Gestión de Jornadas Extra (Peonadas):
  • Asignación de cupos vespertinos extraordinarios para cumplir los objetivos de lista de espera del SERGAS."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_triage_table.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "6. Portal de Audioguías Oficiales de Preparación"
      set object text of default body item to "• 🔊 Audioguía con Síntesis de Voz: Narración oral paso a paso de las normas asistenciales para pacientes mayores o con dificultades visuales.

• ⏱️ Cronómetro Interactivo de Ayuno: Control preciso del ayuno de 6 horas de sólidos previas a la inyección.

• 🥗 Protocolo Dietético Restrictivo: Dieta pobre en hidratos 24h antes y reposo muscular absoluto para evitar captación miocárdica o en grasa parda.

• 💧 Pauta de Hidratación Abundante: Ingesta de 1 litro de agua pura para favorecer la diuresis y proteger la vejiga de la radiación."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_prep.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "7. Consola de Enfermería y Verificación Previa"
      set object text of default body item to "• 📞 Verificación Telefónica Pre-Cita (48-72h antes): Contacto directo con el paciente para confirmar la adherencia al ayuno y la dieta.

• 💉 Ajuste Personalizado de Tratamiento: Control y suspensión pautada de metformina, corticoides y medicación habitual.

• 🚑 Coordinación de Ambulancias: Solicitud de transporte sanitario individual o colectivo y camillas para evitar demoras.

• 📉 Reducción del Absentismo: Tasa de citas canceladas ('no-shows') reducida a menos del 1.5%."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_prep_enfermeria.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "8. RadioRisk: Formación y Gamificación en ALARA"
      set object text of default body item to "• ☢️ Cultura de Seguridad ALARA: Formación en los tres principios básicos: Distancia, Tiempo de exposición y Blindaje plomado.

• 💶 Dinámica Lúdica 'Radiación vs Salario': A mayor radiación acumulada durante la jornada, mayor penalización económica en el salario del turno.

• 🩺 4 Roles Profesionales: Enfermería, Técnicos TSID, Facultativos y Radiofarmacia.

• 🧪 Física Dosimétrica Real: Manejo de 18F (511 keV) y 99mTc (140 keV), cálculo de tasa en µSv/h y compra de equipamiento de protección plomado."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/game.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
    set newSlide to make new slide with properties {base layout:slide layout "Título y viñetas"}
    tell newSlide
      set object text of default title item to "9. Conclusiones y Beneficios para el Servicio"
      set object text of default body item to "• 🚀 Agilidad Asistencial: Reducción del tiempo de triaje clínico de 48 horas a minutos.

• 💯 Máximo Rendimiento Radiofarmacéutico: Sincronización exacta entre la vida media isotópica y la llegada de los pacientes.

• 🛡️ Cero Exploraciones Inútiles: Filtros preventivos de quimioterapia y glucemia que garantizan estudios diagnósticos válidos.

• 🤝 Acompañamiento del Paciente: Las audioguías y el seguimiento telefónico aportan tranquilidad y confianza.

• 🎓 Capacitación Continua: La gamificación consolida los hábitos de protección radiológica en todo el equipo asistencial."
      set width of default body item to 840
      set position of default body item to {80, 200}
      set imgPath to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/screenshots/pet_triage_dashboard.png"
      set img to make new image with properties {file:imgPath}
      set position of img to {960, 200}
      set width of img to 880
    end tell
  end tell
  export doc to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/Presentacion_Ecosistema_PET_CT.pptx" as Microsoft PowerPoint
  export doc to POSIX file "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET/Presentacion_Sistemas_PET/Presentacion_Ecosistema_PET_CT.pdf" as PDF
  close doc saving no
  return "EXPORT_COMPLETE"
end tell