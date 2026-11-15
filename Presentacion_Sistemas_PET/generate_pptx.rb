44#!/usr/bin/env ruby
# encoding: UTF-8
require 'fileutils'

workspace_dir = "/Users/oscarysara/Library/CloudStorage/GoogleDrive-oscarferreiradavila@gmail.com/Mi unidad/Antigravititi IDE/PET"
out_dir = "#{workspace_dir}/Presentacion_Sistemas_PET"
build_dir = "#{out_dir}/pptx_build"

FileUtils.rm_rf(build_dir)
FileUtils.mkdir_p("#{build_dir}/_rels")
FileUtils.mkdir_p("#{build_dir}/ppt/_rels")
FileUtils.mkdir_p("#{build_dir}/ppt/slideMasters/_rels")
FileUtils.mkdir_p("#{build_dir}/ppt/slideLayouts/_rels")
FileUtils.mkdir_p("#{build_dir}/ppt/theme")
FileUtils.mkdir_p("#{build_dir}/ppt/slides/_rels")
FileUtils.mkdir_p("#{build_dir}/ppt/media")

slides_data = [
  {
    num: 1,
    is_cover: true,
    title: "ECOSISTEMA DIGITAL PET/CT & MEDICINA NUCLEAR",
    subtitle: "Suite Integral de Prescripción Médica, Triaje Logístico Matricial, Audioguías Asistenciales con IA, Consola Médica, Consola TSID y Enfermería",
    org: "Galaria · Empresa Pública de Servizos Sanitarios | SERGAS",
    tag: "PRESENTACIÓN CLÍNICA, ASISTENCIAL Y OPERATIVA",
    image: nil
  },
  {
    num: 2,
    is_cover: false,
    tag: "EL PROBLEMA CLÍNICO REAL",
    title: "1. Retos y Cuellos de Botella en Medicina Nuclear",
    subtitle: "La carrera contra el decaimiento isotópico y las cancelaciones en el día de la cita",
    image: "pet_triage_table.png",
    points: [
      "⏳ Decaimiento Físico Inflexible: 18F (T1/2 = 110 min) y 68Ga (T1/2 = 68 min). Una cita perdida supone cientos de euros desperdiciados.",
      "🚫 Cancelaciones en el Día de la Cita: Pacientes con ingesta inadvertida de hidratos, falta de ayuno o glucemias >180 mg/dL.",
      "📋 Volantes No Normalizados: Solicitudes en papel sin peso ni talla (datos vitales para dosimetría en MBq) ni antecedentes de QT/RT.",
      "📞 Sobrecarga Telefónica: Enfermería y secretaría consumen horas respondiendo dudas repetitivas que restan tiempo de atención directa."
    ]
  },
  {
    num: 3,
    is_cover: false,
    tag: "ARQUITECTURA DEL SISTEMA",
    title: "2. Arquitectura Integral End-to-End: 6 Módulos Conectados",
    subtitle: "Flujo asistencial unificado mediante Base de Datos Clínica Sincronizada en Tiempo Real",
    image: "pet_peticion_db.png",
    points: [
      "🔄 Ciclo Completo del Paciente: Conexión total desde la prescripción hasta la adquisición tomográfica y el alta asistencial.",
      "🗄️ Base de Datos Centralizada Sincronizada: Modelo de datos compartido (JSON/Storage) en tiempo real entre peticiones, agendas y consolas.",
      "🩺 Consolas Dedicadas por Perfil: Pantallas adaptadas para Facultativos de Medicina Nuclear, Enfermería y Técnicos TSID.",
      "📱 Acompañamiento Continuo al Paciente: 12 audioguías oficiales con voz y chatbot empático 24/7 en su propio teléfono móvil."
    ]
  },
  {
    num: 4,
    is_cover: false,
    tag: "MÓDULO 1: PRESCRIPCIÓN MÉDICA",
    title: "3. Portal Clínico de Prescripción Médica PET/CT",
    subtitle: "Formulario Oficial Digitalizado con Validación Dosimétrica y Cálculo de Prioridad",
    image: "pet_peticion.png",
    points: [
      "📋 Filiación Hospitalaria Exhaustiva: Registro obligatorio de NHC, facultativo solicitante, servicio, peso y talla para el cálculo de dosis en MBq.",
      "☢️ Selección de 10 Protocolos Oficiales: 18F-FDG oncológico, FDG contraste iodado, Endocarditis infecciosa HEP, 68Ga-PSMA, 68Ga-DOTATOC, 18F-Colina, 18F-Paratiroides, 18F-PSMA y FDG Neurología.",
      "🧮 Motor de Priorización Dinámica: Clasifica de forma objetiva al paciente en 🔴 P1 (<7d), 🟡 P2 (<14d) o 🟢 P3 (>14d) según guías EANM.",
      "⚠️ Detección Inmediata de Riesgos: Alergias al yodo, insuficiencia renal, diabetes mellitus, claustrofobia y necesidad de camilla/sedación."
    ]
  },
  {
    num: 5,
    is_cover: false,
    tag: "MÓDULO 2: TRIAJE Y AGENDAMIENTO",
    title: "4. Suite de Triaje y Agendamiento Matricial",
    subtitle: "Asignación Inteligente de Cupos Semanales según Isótopo, Vida Media y Bloqueos de Seguridad",
    image: "pet_triage_dashboard.png",
    points: [
      "🗓️ Matriz Semanal por Radiofármaco: Parrilla organizada por isótopo (días de ciclotrón FDG, martes de Fluor-PSMA, miércoles de Colina).",
      "⛔ Bloqueo Preventivo QT/RT (<21 días): Impide citas precoces que generen falsos negativos por aturdimiento tumoral, fijando la fecha en el día 21.",
      "⏰ Zonificación Horaria Asistencial: Pacientes autónomos a primera hora (08:00), traslados de planta en camilla (10:00) y sedaciones (11:00).",
      "📋 Control de Peonadas y Jornadas Extra: Gestión de actividad vespertina para cumplir los objetivos de demora media del SERGAS."
    ]
  },
  {
    num: 6,
    is_cover: false,
    tag: "MÓDULO 3: ASISTENCIA AL PACIENTE",
    title: "5. Portal de Audioguías Oficiales de Preparación",
    subtitle: "12 Protocolos Interactivos con Síntesis de Voz, Cronómetros de Ayuno y Acceso por QR",
    image: "pet_prep.png",
    points: [
      "🔊 Narración Oral con Síntesis de Voz: Instrucciones narradas paso a paso para personas mayores o con dificultades de lectura.",
      "⏱️ Cronómetro Interactivo de Ayuno: Cuenta atrás visual del ayuno estricto de 6 horas adaptada a la hora exacta de la cita del paciente.",
      "🥗 Protocolos Dietéticos Metabólicos: Dieta sin carbohidratos 24h previas en FDG estándar y dieta grasa estricta de 16h en Endocarditis.",
      "📲 Acceso Inmediato por Código QR: El paciente escanea con su cámara y abre la web institucional sin instalar aplicaciones ni recordar claves."
    ]
  },
  {
    num: 7,
    is_cover: false,
    tag: "INNOVACIÓN ASISTENCIAL CON IA",
    title: "6. Chatbot de Enfermería Empático con Streaming Progresivo",
    subtitle: "Asistente Virtual 24/7 con Trato Humano, Escritura Fluida Palabra por Palabra y Datos Reales",
    image: "prep_chatbot.png",
    points: [
      "✍️ Efecto Typewriter Streaming: Las respuestas se redactan progresivamente palabra por palabra, aportando un ritmo de lectura humano y cómodo.",
      "👤 Personalización Clínica Total: Llama al paciente por su nombre de pila ('Hola Carmen') y confirma su hora (08:30 h) y lugar exactos en el Meixoeiro.",
      "🩺 Contención de la Ansiedad: Resuelve miedos frecuentes sobre claustrofobia, dolor o radiación explicando que el escáner es abierto y ventilado.",
      "🗣️ Síntesis de Voz Integrada: Botón '🔊 Escuchar' para reproducir la respuesta en audio de alta fidelidad tras finalizar la redacción."
    ]
  },
  {
    num: 8,
    is_cover: false,
    tag: "MÓDULO 4: ENFERMERÍA CLÍNICA",
    title: "7. Consola de Enfermería y Control Pre-Analítico",
    subtitle: "Semáforo Metabólico Domiciliario, Gestión de Incidencias y Altas Asistenciales Seguras",
    image: "enfermeria_dashboard.png",
    points: [
      "🩸 Semáforo Metabólico en Domicilio: Pacientes diabéticos reportan su glucemia antes de salir de casa; alerta roja en consola si es ≥200 mg/dL.",
      "📞 Bandeja de Consultas Telefónicas: Gestión ágil de llamadas solicitadas por pacientes que requieren valoración directa de enfermería.",
      "✅ Protocolo de Alta 'Pode Marchar': Verificación de hidratación y micción para eliminación del radiofármaco antes de archivar la cita.",
      "📉 Erradicación del Absentismo: Detección temprana de incidencias 24-48h antes de la cita para reasignar huecos libres inmediatamente."
    ]
  },
  {
    num: 9,
    is_cover: false,
    tag: "MÓDULO 5: FACULTATIVOS DE MEDICINA NUCLEAR",
    title: "8. Consola Médica & Carpeta de Peticiones No Triables",
    subtitle: "Visor Oficial de Volante SERGAS, Pauta de Adquisición a Máquina y Buzón Facultativo",
    image: "triage_confirmaciones.png",
    points: [
      "📁 Carpeta de Peticiones No Triables: Casos complejos retenidos para que el facultativo revise el volante, asigne prioridad y elija el radiofármaco.",
      "📄 Visor Oficial de Volante SERGAS: Consulta digital inmediata de antecedentes oncológicos, informes de TC y analíticas previas.",
      "⚙️ Prescripción Técnica a Máquina: Pauta médica con 3 clics: posición de brazos, tiempos por cama, diurético Seguril, contrastes y tardías.",
      "🔄 Sincronización en Sala: Las órdenes firmadas aparecen de forma instantánea en la pantalla de adquisición de los técnicos TSID."
    ]
  },
  {
    num: 10,
    is_cover: false,
    tag: "MÓDULO 6: TÉCNICOS SUPERIORES TSID",
    title: "9. Consola Técnica TSID (Sala de Tomógrafo)",
    subtitle: "Control de Tiempos de Captación en Máquina, Posicionamiento Vectorial y Contraste",
    image: "enfermeria_consola_abierta.png",
    points: [
      "⏱️ Cronómetro de Paso a Gantry: Contador en vivo de minutos transcurridos tras la inyección para adquirir en el pico de captación óptimo.",
      "📐 Diagramas Anatómicos de Posicionamiento: Esquemas vectoriales claros de postura (brazos arriba/abajo), centrado láser e isocentro.",
      "🗺️ Mapa de Campos FOV: Selección visual de campo tomográfico (base de cráneo a muslos vs cuerpo entero con extremidades).",
      "💉 Semáforo de Contraste IV: Confirmación inmediata de fase de contraste (arterial/portal/baja dosis), volumen en mL y calibre de vía (18G)."
    ]
  },
  {
    num: 11,
    is_cover: false,
    tag: "IMPACTO Y EFICIENCIA ASISTENCIAL",
    title: "10. Impacto Asistencial, Clínico y Retorno de Inversión (ROI)",
    subtitle: "Resultados medibles en listas de espera, aprovechamiento de dosis y satisfacción",
    image: "deck_preview.png",
    points: [
      "📉 Absentismo reducido a < 1.5%: Caída radical de los 'no-shows' frente al 8-12% de la citación tradicional en papel.",
      "💶 100% de Aprovechamiento Radiofarmacéutico: Cero dosis de ciclotrón o eluciones de generador caducadas por incomparecencia del paciente.",
      "⚡ Reducción del Tiempo de Triaje: De 48 horas mediante revisión de volantes manuales a pocos minutos con el motor algorítmico.",
      "🤝 Liberación del 70% del Tiempo Burocrático: Enfermería y secretaría se liberan de llamadas repetitivas para centrarse en el cuidado asistencial."
    ]
  },
  {
    num: 12,
    is_cover: false,
    tag: "DEMOSTRACIÓN Y CIERRE",
    title: "11. Demostración en Vivo & Despliegue Inmediato (Auto-Reset 24h)",
    subtitle: "Acceso multidispositivo instantáneo y garantía de citas siempre vigentes para evaluación",
    image: "pet_peticion_db.png",
    points: [
      "🔄 Modo Demostración Auto-Reset 24h: El sistema sincroniza automáticamente citas para HOY y MAÑANA en cualquier fecha que se abra la web.",
      "📱 Acceso Universal sin Instalación: Compatible al 100% con ordenadores de estación de trabajo, tablets de planta y smartphones.",
      "🎭 Caso Clínico Piloto (Carmen Lois Souto): Demostración en 3 minutos: resolución en buzón médico, citación P1, audioguía y alta de enfermería.",
      "🚀 Hoja de Ruta Inmediata: Listo para validación en comités clínicos y despliegue departamental en Galaria y el SERGAS."
    ]
  }
]

# Copiar imágenes al build_dir
slides_data.each do |s|
  if s[:image]
    src = "#{out_dir}/screenshots/#{s[:image]}"
    dst = "#{build_dir}/ppt/media/#{s[:image]}"
    if File.exist?(src)
      FileUtils.cp(src, dst)
    else
      puts "Warning: image not found #{src}"
    end
  end
end

# 1. [Content_Types].xml
content_types = <<~XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Default Extension="jpg" ContentType="image/jpeg"/>
  <Default Extension="jpeg" ContentType="image/jpeg"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
XML

slides_data.each do |s|
  content_types << "  <Override PartName=\"/ppt/slides/slide#{s[:num]}.xml\" ContentType=\"application/vnd.openxmlformats-officedocument.presentationml.slide+xml\"/>\n"
end
content_types << "</Types>\n"
File.write("#{build_dir}/[Content_Types].xml", content_types)

# 2. _rels/.rels
File.write("#{build_dir}/_rels/.rels", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>
XML

# 3. ppt/_rels/presentation.xml.rels
pres_rels = <<~XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
XML

slides_data.each_with_index do |s, idx|
  pres_rels << "  <Relationship Id=\"rId#{idx + 2}\" Type=\"http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide\" Target=\"slides/slide#{s[:num]}.xml\"/>\n"
end
pres_rels << "</Relationships>\n"
File.write("#{build_dir}/ppt/_rels/presentation.xml.rels", pres_rels)

# 4. ppt/presentation.xml
pres_xml = <<~XML
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst>
    <p:sldMasterId id="2147483648" r:id="rId1"/>
  </p:sldMasterIdLst>
  <p:sldIdLst>
XML

slides_data.each_with_index do |s, idx|
  pres_xml << "    <p:sldId id=\"#{256 + idx}\" r:id=\"rId#{idx + 2}\"/>\n"
end
pres_xml << <<~XML
  </p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>
XML
File.write("#{build_dir}/ppt/presentation.xml", pres_xml)

# 5. ppt/theme/theme1.xml
File.write("#{build_dir}/ppt/theme/theme1.xml", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Galaria Theme">
  <a:themeElements>
    <a:clrScheme name="Galaria">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="004868"/></a:dk2>
      <a:lt2><a:srgbClr val="F0F7FB"/></a:lt2>
      <a:accent1><a:srgbClr val="007EB4"/></a:accent1>
      <a:accent2><a:srgbClr val="004868"/></a:accent2>
      <a:accent3><a:srgbClr val="0284C7"/></a:accent3>
      <a:accent4><a:srgbClr val="16A34A"/></a:accent4>
      <a:accent5><a:srgbClr val="D97706"/></a:accent5>
      <a:accent6><a:srgbClr val="DC2626"/></a:accent6>
      <a:hlink><a:srgbClr val="007EB4"/></a:hlink>
      <a:folHlink><a:srgbClr val="004868"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Galaria">
      <a:majorFont><a:latin typeface="Helvetica Neue"/></a:majorFont>
      <a:minorFont><a:latin typeface="Helvetica Neue"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Galaria">
      <a:fillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:fillStyleLst>
      <a:lnStyleLst><a:ln><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:ln></a:lnStyleLst>
      <a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>
      <a:bgFillStyleLst><a:solidFill><a:schemeClr val="phClr"/></a:solidFill></a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>
XML

# 6. ppt/slideMasters/slideMaster1.xml
File.write("#{build_dir}/ppt/slideMasters/slideMaster1.xml", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>
XML

File.write("#{build_dir}/ppt/slideMasters/_rels/slideMaster1.xml.rels", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>
XML

# 7. ppt/slideLayouts/slideLayout1.xml
File.write("#{build_dir}/ppt/slideLayouts/slideLayout1.xml", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank">
  <p:cSld>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
</p:sldLayout>
XML

File.write("#{build_dir}/ppt/slideLayouts/_rels/slideLayout1.xml.rels", <<~XML)
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>
XML

# 8. Generar cada diapositiva
slides_data.each do |s|
  slide_num = s[:num]
  
  if s[:is_cover]
    # Diapositiva de Portada
    slide_xml = <<~XML
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
          <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>

          <!-- Fondo Azul Marino Galaria -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="2" name="Fondo"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm>
              <a:solidFill><a:srgbClr val="004868"/></a:solidFill>
              <a:ln><a:noFill/></a:ln>
            </p:spPr>
          </p:sp>

          <!-- Banda Cyan Superior -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="3" name="Banda"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="180000"/></a:xfrm>
              <a:solidFill><a:srgbClr val="007EB4"/></a:solidFill>
              <a:ln><a:noFill/></a:ln>
            </p:spPr>
          </p:sp>

          <!-- Tarjeta Central Glassmorphism -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="4" name="Card"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="900000" y="1000000"/><a:ext cx="10392000" cy="4858000"/></a:xfrm>
              <a:solidFill><a:srgbClr val="08293D"/></a:solidFill>
              <a:ln w="25400"><a:solidFill><a:srgbClr val="007EB4"/></a:solidFill></a:ln>
            </p:spPr>
            <p:txBody>
              <a:bodyPr vert="horz" lIns="360000" tIns="360000" rIns="360000" bIns="360000"/>
              <a:lstStyle/>
              
              <!-- Badge -->
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1300" b="1"><a:solidFill><a:srgbClr val="007EB4"/></a:solidFill></a:rPr>
                  <a:t>🏥 #{s[:tag]}</a:t>
                </a:r>
              </a:p>

              <!-- Espaciador -->
              <a:p><a:endParaRPr sz="1000"/></a:p>

              <!-- Título Portada -->
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="3200" b="1"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:rPr>
                  <a:t>#{s[:title]}</a:t>
                </a:r>
              </a:p>

              <!-- Espaciador -->
              <a:p><a:endParaRPr sz="800"/></a:p>

              <!-- Subtítulo Portada -->
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1600"><a:solidFill><a:srgbClr val="E6F4FA"/></a:solidFill></a:rPr>
                  <a:t>#{s[:subtitle]}</a:t>
                </a:r>
              </a:p>

              <!-- Espaciador -->
              <a:p><a:endParaRPr sz="1600"/></a:p>

              <!-- Institución -->
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1400" b="1"><a:solidFill><a:srgbClr val="0284C7"/></a:solidFill></a:rPr>
                  <a:t>#{s[:org]}</a:t>
                </a:r>
              </a:p>
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1200"><a:solidFill><a:srgbClr val="94A3B8"/></a:solidFill></a:rPr>
                  <a:t>Documentación Técnica, Funcional y Clínica · Edición Oficial 2026</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>
        </p:spTree>
      </p:cSld>
    </p:sld>
    XML

  else
    # Diapositiva de Contenido
    slide_xml = <<~XML
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld>
        <p:spTree>
          <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
          <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>

          <!-- Fondo Página Claro y Sanitario -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="2" name="Fondo"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="0" y="0"/><a:ext cx="12192000" cy="6858000"/></a:xfrm>
              <a:solidFill><a:srgbClr val="F8FAFC"/></a:solidFill>
              <a:ln><a:noFill/></a:ln>
            </p:spPr>
          </p:sp>

          <!-- Cabecera Superior Corporativa -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="3" name="Header"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="600000" y="400000"/><a:ext cx="10992000" cy="950000"/></a:xfrm>
              <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
              <a:ln w="12700"><a:solidFill><a:srgbClr val="D6E2E9"/></a:solidFill></a:ln>
            </p:spPr>
            <p:txBody>
              <a:bodyPr vert="horz" lIns="180000" tIns="120000" rIns="180000" bIns="120000"/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1000" b="1"><a:solidFill><a:srgbClr val="007EB4"/></a:solidFill></a:rPr>
                  <a:t>#{s[:tag].upcase}</a:t>
                </a:r>
              </a:p>
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1900" b="1"><a:solidFill><a:srgbClr val="004868"/></a:solidFill></a:rPr>
                  <a:t>#{s[:title]}</a:t>
                </a:r>
              </a:p>
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="1100"><a:solidFill><a:srgbClr val="526071"/></a:solidFill></a:rPr>
                  <a:t>#{s[:subtitle]}</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>

          <!-- Columna Izquierda: Puntos Clave -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="4" name="TextCol"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="600000" y="1500000"/><a:ext cx="5800000" cy="4800000"/></a:xfrm>
              <a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>
              <a:ln w="12700"><a:solidFill><a:srgbClr val="D6E2E9"/></a:solidFill></a:ln>
            </p:spPr>
            <p:txBody>
              <a:bodyPr vert="horz" lIns="240000" tIns="240000" rIns="240000" bIns="240000"/>
              <a:lstStyle/>
    XML

    s[:points].each do |pt|
      slide_xml << <<~XML
              <a:p>
                <a:pPr marL="280000" indent="-280000">
                  <a:buChar char="▪"/>
                  <a:buClr><a:srgbClr val="007EB4"/></a:buClr>
                </a:pPr>
                <a:r>
                  <a:rPr lang="es-ES" sz="1150"><a:solidFill><a:srgbClr val="1E293B"/></a:solidFill></a:rPr>
                  <a:t>#{pt}</a:t>
                </a:r>
              </a:p>
              <a:p><a:endParaRPr sz="600"/></a:p>
      XML
    end

    slide_xml << <<~XML
            </p:txBody>
          </p:sp>

          <!-- Columna Derecha: Imagen Ilustrativa -->
    XML

    if s[:image]
      slide_xml << <<~XML
          <p:pic>
            <p:nvPicPr>
              <p:cNvPr id="5" name="Screenshot"/>
              <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
              <p:nvPr/>
            </p:nvPicPr>
            <p:blipFill>
              <a:blip r:embed="rId2"/>
              <a:stretch><a:fillRect/></a:stretch>
            </p:blipFill>
            <p:spPr>
              <a:xfrm><a:off x="6600000" y="1500000"/><a:ext cx="5000000" cy="4800000"/></a:xfrm>
              <a:ln w="25400"><a:solidFill><a:srgbClr val="007EB4"/></a:solidFill></a:ln>
            </p:spPr>
          </p:pic>
      XML
    end

    slide_xml << <<~XML
          <!-- Pie de Diapositiva -->
          <p:sp>
            <p:nvSpPr><p:cNvPr id="6" name="Footer"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr>
            <p:spPr>
              <a:xfrm><a:off x="600000" y="6400000"/><a:ext cx="10992000" cy="300000"/></a:xfrm>
            </p:spPr>
            <p:txBody>
              <a:bodyPr vert="horz" lIns="0" tIns="0" rIns="0" bIns="0"/>
              <a:lstStyle/>
              <a:p>
                <a:r>
                  <a:rPr lang="es-ES" sz="900"><a:solidFill><a:srgbClr val="718096"/></a:solidFill></a:rPr>
                  <a:t>Galaria · Unidade de Medicina Nuclear (SERGAS) | Presentación Oficial del Ecosistema | Diapositiva #{slide_num} de #{slides_data.length}</a:t>
                </a:r>
              </a:p>
            </p:txBody>
          </p:sp>

        </p:spTree>
      </p:cSld>
    </p:sld>
    XML
  end

  File.write("#{build_dir}/ppt/slides/slide#{slide_num}.xml", slide_xml)

  # Slide rels
  if s[:image]
    File.write("#{build_dir}/ppt/slides/_rels/slide#{slide_num}.xml.rels", <<~XML)
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
      <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/#{s[:image]}"/>
    </Relationships>
    XML
  else
    File.write("#{build_dir}/ppt/slides/_rels/slide#{slide_num}.xml.rels", <<~XML)
    <?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
    </Relationships>
    XML
  end
end

puts "Generación de archivos XML completada."
system("cd \"#{build_dir}\" && zip -q -r \"#{out_dir}/Presentacion_Ecosistema_PET_CT.pptx\" .")
puts "Archivo PPTX creado con éxito en: #{out_dir}/Presentacion_Ecosistema_PET_CT.pptx"
