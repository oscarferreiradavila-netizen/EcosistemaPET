# encoding: utf-8
require 'fileutils'
require 'base64'

def to_base64(path)
  return "" unless File.exist?(path)
  ext = File.extname(path).delete('.').downcase
  ext = 'jpeg' if ext == 'jpg'
  "data:image/#{ext};base64,#{Base64.strict_encode64(File.binread(path))}"
end

xunta_b64 = to_base64("xunta_logo.png")
galaria_b64 = to_base64("galaria_logo.jpg")
pet_scanner_b64 = to_base64("pet_scanner_cover.jpg")

html_content = <<~HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Libro Maestro de Instrucciones y Manual de Operaciones — Ecosistema Digital PET/CT Galaria · SERGAS</title>
  
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&family=Open+Sans:ital,wght@0,300..800;1,300..800&family=JetBrains+Mono:wght@500;600;700&display=swap" rel="stylesheet">

  <style>
    @page {
      size: A4;
      margin: 16mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page);
        font-family: 'Outfit', sans-serif;
        font-size: 8pt;
        color: #64748b;
      }
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Open Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      line-height: 1.55;
      font-size: 10pt;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    /* BARRA SUPERIOR PARA PANTALLA */
    .screen-header {
      background: #ffffff;
      border-bottom: 2px solid #e2e8f0;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 0;
      z-index: 1000;
      box-shadow: 0 4px 12px rgba(0, 43, 64, 0.05);
    }
    .screen-header-logos {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .screen-header-logos img {
      height: 38px;
      width: auto;
      object-fit: contain;
    }
    .screen-header-actions {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .btn-action {
      background: #007eb4;
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      text-decoration: none;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      font-size: 9pt;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }
    .btn-action:hover {
      background: #004868;
    }
    .btn-outline {
      background: transparent;
      color: #004868;
      border: 1px solid #cbd5e1;
    }
    .btn-outline:hover {
      background: #f1f5f9;
    }

    /* CONTENEDOR PRINCIPAL */
    .manual-wrapper {
      max-width: 960px;
      margin: 0 auto;
      padding: 24px 20px;
    }

    /* PORTADA */
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 250mm;
      padding: 25mm 20mm;
      background: linear-gradient(135deg, #002b40 0%, #004868 45%, #007eb4 100%);
      color: #ffffff;
      border-radius: 12px;
      box-shadow: 0 16px 36px rgba(0, 43, 64, 0.35);
      margin-bottom: 30px;
    }
    .cover-logos {
      background: rgba(255, 255, 255, 0.96);
      padding: 16px 24px;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }
    .cover-logos img {
      height: 42px;
      width: auto;
      object-fit: contain;
    }
    .cover-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #fde047;
      color: #002b40;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 8.5pt;
      letter-spacing: 1.5px;
      padding: 5px 14px;
      border-radius: 30px;
      text-transform: uppercase;
      margin-top: 25px;
      margin-bottom: 12px;
    }
    .cover-title {
      font-family: 'Outfit', sans-serif;
      font-size: 32pt;
      font-weight: 900;
      line-height: 1.2;
      letter-spacing: -0.5px;
      margin: 32px 0 16px 0;
      color: #ffffff;
      text-shadow: 0 4px 25px rgba(0, 0, 0, 0.5), 0 0 35px rgba(0, 210, 255, 0.4);
    }
    .cover-subtitle {
      font-size: 13.5pt;
      font-weight: 500;
      color: #e0f2fe;
      line-height: 1.45;
      max-width: 720px;
      text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    }
    .cover-scanner-box {
      position: relative;
      margin: 20px auto 10px auto;
      max-width: 680px;
      text-align: center;
    }
    .cover-scanner-img {
      display: block;
      width: 100%;
      max-height: 285px;
      object-fit: cover;
      object-position: 58% 48%;
      opacity: 0.78;
      filter: saturate(0.52) contrast(0.92) brightness(0.86);
      -webkit-mask-image: radial-gradient(ellipse 72% 68% at 54% 50%, rgba(0, 0, 0, 1) 24%, rgba(0, 0, 0, 0.55) 58%, rgba(0, 0, 0, 0) 92%);
      mask-image: radial-gradient(ellipse 72% 68% at 54% 50%, rgba(0, 0, 0, 1) 24%, rgba(0, 0, 0, 0.55) 58%, rgba(0, 0, 0, 0) 92%);
    }
    .cover-meta {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255, 255, 255, 0.25);
      border-radius: 8px;
      padding: 16px 20px;
      margin-top: 24px;
    }
    .cover-meta-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12px;
      font-size: 9pt;
    }
    .cover-meta-item strong {
      display: block;
      color: #7dd3fc;
      font-family: 'Outfit', sans-serif;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .cover-footer {
      font-size: 8.5pt;
      color: #94a3b8;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      padding-top: 12px;
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }

    /* SALTOS DE PÁGINA Y CAPÍTULOS */
    .page-break {
      page-break-after: always;
    }
    .chapter {
      margin-bottom: 35px;
    }

    /* ENCABEZADOS */
    h1 {
      font-family: 'Outfit', sans-serif;
      font-size: 18pt;
      font-weight: 800;
      color: #002b40;
      border-bottom: 2.5px solid #007eb4;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    h2 {
      font-family: 'Outfit', sans-serif;
      font-size: 12.5pt;
      font-weight: 700;
      color: #004868;
      margin-top: 18px;
      margin-bottom: 8px;
      border-left: 4px solid #007eb4;
      padding-left: 8px;
    }
    h3 {
      font-family: 'Outfit', sans-serif;
      font-size: 10.5pt;
      font-weight: 700;
      color: #1e293b;
      margin-top: 12px;
      margin-bottom: 6px;
    }
    p {
      margin: 0 0 10px 0;
      color: #334155;
      text-align: justify;
    }
    ul, ol {
      margin: 0 0 12px 0;
      padding-left: 22px;
      color: #334155;
    }
    li {
      margin-bottom: 4px;
    }

    /* CAJAS CALLOUT */
    .callout {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-left: 4.5px solid #007eb4;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 9.5pt;
    }
    .callout-title {
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      color: #004868;
      margin-bottom: 4px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .callout-alert {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4.5px solid #ef4444;
    }
    .callout-alert .callout-title {
      color: #991b1b;
    }
    .callout-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4.5px solid #16a34a;
    }
    .callout-success .callout-title {
      color: #166534;
    }
    .callout-warning {
      background: #fffbeb;
      border: 1px solid #fde68a;
      border-left: 4.5px solid #d97706;
    }
    .callout-warning .callout-title {
      color: #92400e;
    }

    /* TABLAS */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 12px 0 16px 0;
      font-size: 9pt;
    }
    th, td {
      border: 1px solid #e2e8f0;
      padding: 7px 10px;
      text-align: left;
      vertical-align: top;
    }
    th {
      background: #f8fafc;
      font-family: 'Outfit', sans-serif;
      font-weight: 700;
      color: #002b40;
    }
    tr:nth-child(even) td {
      background: #fbfcfe;
    }

    /* BADGES Y PILLS */
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
    }
    .badge-p1 { background: #fee2e2; color: #991b1b; }
    .badge-p2 { background: #fef3c7; color: #92400e; }
    .badge-p3 { background: #e0f2fe; color: #0369a1; }
    .badge-role { background: #ede9fe; color: #6d28d9; }

    /* TARJETAS RESUMEN DE MÓDULOS */
    .module-hero-card {
      background: linear-gradient(135deg, #f8fafc 0%, #f0f9ff 100%);
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 14px 18px;
      margin: 14px 0;
      display: grid;
      grid-template-columns: 80px 1fr;
      gap: 16px;
      align-items: center;
    }
    .module-hero-icon {
      font-size: 38pt;
      text-align: center;
      line-height: 1;
    }
    .module-hero-desc strong {
      display: block;
      color: #004868;
      font-family: 'Outfit', sans-serif;
      font-size: 11pt;
      margin-bottom: 3px;
    }
    .module-hero-desc span {
      color: #475569;
      font-size: 9pt;
    }

    /* WORKFLOW STEPS */
    .step-list {
      counter-reset: step-counter;
      list-style: none;
      padding: 0;
      margin: 14px 0;
    }
    .step-list li {
      counter-increment: step-counter;
      position: relative;
      padding-left: 36px;
      margin-bottom: 10px;
    }
    .step-list li::before {
      content: counter(step-counter);
      position: absolute;
      left: 0;
      top: 0;
      width: 24px;
      height: 24px;
      background: #007eb4;
      color: #ffffff;
      border-radius: 50%;
      text-align: center;
      line-height: 24px;
      font-family: 'Outfit', sans-serif;
      font-weight: 800;
      font-size: 8.5pt;
    }

    /* ÍNDICE INTERACTIVO */
    .toc-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 18px 0;
    }
    .toc-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: #004868;
      font-weight: 600;
      font-size: 9pt;
      transition: all 0.2s;
    }
    .toc-item:hover {
      background: #e0f2fe;
      border-color: #38bdf8;
    }
    .toc-num {
      background: #007eb4;
      color: #ffffff;
      width: 22px;
      height: 22px;
      border-radius: 4px;
      text-align: center;
      line-height: 22px;
      font-family: 'Outfit', sans-serif;
      font-size: 8pt;
      font-weight: 800;
      flex-shrink: 0;
    }

    @media print {
      .screen-header { display: none; }
      .manual-wrapper { max-width: 100%; padding: 0; }
      .cover { min-height: 270mm; margin-bottom: 0; border-radius: 0; }
    }
  </style>
</head>
<body>

  <!-- BARRA DE ACCIONES PARA PANTALLA -->
  <header class="screen-header">
    <div class="screen-header-logos">
      <img src="#{xunta_b64}" alt="Xunta de Galicia">
      <img src="#{galaria_b64}" alt="Galaria">
    </div>
    <div class="screen-header-actions">
      <a href="index.html" class="btn-action btn-outline">🏠 Portal Maestro</a>
      <a href="PRESENTACION_GESTION_PUBLICA_ECOSISTEMA_PET.html" class="btn-action btn-outline">📊 Presentación</a>
      <button onclick="window.print()" class="btn-action">🖨️ Imprimir / Guardar en PDF</button>
    </div>
  </header>

  <div class="manual-wrapper">

    <!-- PORTADA DEL MANUAL -->
    <div class="cover">
      <div>
        <div class="cover-logos">
          <img src="#{xunta_b64}" alt="Xunta de Galicia">
          <img src="#{galaria_b64}" alt="Galaria">
        </div>

        <h1 class="cover-title">Libro Maestro de Instrucciones y Manual de Programas</h1>
        <div class="cover-subtitle">
          Guía integral de funcionamiento, operativa clínica y arquitectura del Ecosistema Digital de Gestión Integral PET/CT de Alta Resolución.
        </div>

        <div class="cover-scanner-box">
          <img src="#{pet_scanner_b64}" alt="Tomógrafo PET/CT de Alta Resolución" class="cover-scanner-img">
        </div>
      </div>

      <div>
        <div class="cover-meta">
          <div class="cover-meta-grid">
            <div class="cover-meta-item">
              <strong>Entidad Responsable</strong>
              Unidad Asistencial PET/CT · Galaria Empresa Pública de Servizos Sanitarios · SERGAS
            </div>
            <div class="cover-meta-item">
              <strong>Ámbito Asistencial</strong>
              Servizo Galego de Saúde · Consellería de Sanidade · Xunta de Galicia
            </div>
            <div class="cover-meta-item">
              <strong>Versión y Cobertura</strong>
              Versión 4.0 (9 Módulos Clínicos + 12 Audioguías Oficiales)
            </div>
            <div class="cover-meta-item">
              <strong>Fecha de Actualización</strong>
              Noviembre 2026 · Certificación de Calidad Asistencial
            </div>
          </div>
        </div>

        <div class="cover-footer">
          <span>Manual de Operaciones Clínicas PET/CT — SERGAS / Galaria</span>
          <span>Distribución Autorizada para Personal Asistencial</span>
        </div>
      </div>
    </div>

    <!-- CAPÍTULO 0: ÍNDICE GENERAL Y PORTAL MAESTRO -->
    <div class="chapter">
      <h1>Índice General de Programas y Módulos</h1>
      <p>
        El presente libro de instrucciones compendia la totalidad de las aplicaciones, consolas y herramientas que conforman el Ecosistema Digital PET/CT. Todos los módulos operan de forma interconectada en tiempo real mediante un canal clínico seguro y persistencia local/cloud.
      </p>

      <div class="toc-grid">
        <a href="#mod-0" class="toc-item"><span class="toc-num">0</span> 0. Portal Maestro Unificado (Hub Central)</a>
        <a href="#mod-1" class="toc-item"><span class="toc-num">1</span> 1. Petición Médica Electrónica Asistencial</a>
        <a href="#mod-2" class="toc-item"><span class="toc-num">2</span> 2. Triaje Clínico Algorítmico y Agendamiento</a>
        <a href="#mod-3" class="toc-item"><span class="toc-num">3</span> 3. Portal del Paciente & 12 Audioguías Oficiales</a>
        <a href="#mod-4" class="toc-item"><span class="toc-num">4</span> 4. Consola de Enfermería & Boxes de Inyección</a>
        <a href="#mod-5" class="toc-item"><span class="toc-num">5</span> 5. Consola Médica de Protocolización y Adquisición</a>
        <a href="#mod-6" class="toc-item"><span class="toc-num">6</span> 6. Consola Técnica TSID de Tomógrafo PET/CT</a>
        <a href="#mod-7" class="toc-item"><span class="toc-num">7</span> 7. Jefatura de Servicio & Cuadro de Mando</a>
        <a href="#mod-8" class="toc-item"><span class="toc-num">8</span> 8. Supervisión de Enfermería & Gestión de Stock</a>
        <a href="#mod-9" class="toc-item"><span class="toc-num">9</span> 9. Enfermería Gestora de Casos Oncológicos</a>
        <a href="#mod-10" class="toc-item"><span class="toc-num">10</span> 10. Herramientas Auxiliares e Informes Oficiales</a>
        <a href="#mod-11" class="toc-item"><span class="toc-num">11</span> 11. Arquitectura Técnica e Interoperabilidad en Vivo</a>
      </div>
    </div>

    <!-- SECCIÓN MODULO 0: PORTAL MAESTRO -->
    <div id="mod-0" class="chapter">
      <h1>0. Portal Maestro Unificado (Hub Central)</h1>
      
      <div class="module-hero-card">
        <div class="module-hero-icon">🏠</div>
        <div class="module-hero-desc">
          <strong>Acceso Centralizado · Portal Unificado</strong>
          <span>Puerta de entrada unificada para todo el personal asistencial y directivo del SERGAS y Galaria. Agrupa los accesos a los 9 módulos clínicos, el catálogo de 12 audioguías y la presentación ejecutiva.</span>
        </div>
      </div>

      <h2>0.1. Propósito y Funcionalidad</h2>
      <p>
        El Portal Maestro actúa como distribuidor de perfiles. Desde una única pantalla institucional se permite a facultativos, enfermeros, técnicos TSID, supervisoras, gestoras de casos y directivos acceder a su entorno de trabajo específico sin fricción y con autenticación unificada.
      </p>

      <h2>0.2. Componentes de la Pantalla Principal</h2>
      <ul>
        <li><strong>Cabecera Institucional:</strong> Identidad visual oficial con los emblemas de la Xunta de Galicia, SERGAS y Galaria.</li>
        <li><strong>Dossier Estratégico:</strong> Botón directo a la <em>Presentación Ejecutiva de Gestión Sanitaria</em> para sesiones clínicas y comisiones de gerencia.</li>
        <li><strong>Parrilla de los 9 Programas:</strong> Tarjetas interactivas con código de color institucional, descripción funcional, perfil de usuario asignado y botón de salto directo.</li>
        <li><strong>Centro de Revisión de Audioguías:</strong> Catálogo expandible de los 12 protocolos con botón "Revisar una a una" para control de calidad.</li>
        <li><strong>Popovers de Ayuda Rápida:</strong> Resumen de atajos, canales de soporte y enlace al repositorio oficial.</li>
      </ul>
    </div>

    <!-- SECCIÓN MODULO 1: PETICION MEDICA -->
    <div id="mod-1" class="chapter">
      <h1>1. Módulo 1 · Petición Médica Electrónica Asistencial</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">🩺</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Médicos Especialistas Peticionarios</strong>
          <span>Portal de prescripción médica para facultativos de Oncología Médica, Hematología, Neumología, Urología, Cirugía y Neurología con validación clínica inmediata.</span>
        </div>
      </div>

      <h2>1.1. Propósito Operativo</h2>
      <p>
        Sustituye los volantes en papel y formularios desestructurados por un portal inteligente que guía al facultativo en la indicación correcta según guías clínicas EANM/SERGAS, calculando de forma automática el radiofármaco idóneo, la dosimetría estimada y la prioridad algorítmica.
      </p>

      <h2>1.2. Catálogo de Protocolos Integrados</h2>
      <table>
        <thead>
          <tr>
            <th>Protocolo</th>
            <th>Radiofármaco</th>
            <th>Indicaciones Principales</th>
            <th>Parámetros Clave</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>PET Oncológico Estándar</strong></td>
            <td>18F-FDG</td>
            <td>Estadificación, re-estadificación y respuesta tumoral en pulmón, linfoma, mama, digestivo.</td>
            <td>Ayuno 6h, glucemia &lt; 160 mg/dL, dosis calculada por peso.</td>
          </tr>
          <tr>
            <td><strong>PET Próstata (Curium)</strong></td>
            <td>18F-PSMA</td>
            <td>Recidiva bioquímica precoz (PSA &gt; 0.2 ng/mL) y cáncer de próstata de alto riesgo.</td>
            <td>Sin ayuno metabólico, hidratación forzada.</td>
          </tr>
          <tr>
            <td><strong>PET Neuroendocrino</strong></td>
            <td>68Ga-DOTATOC</td>
            <td>Tumores neuroendocrinos gastroenteropancreáticos (TNE) y receptores de somatostatina.</td>
            <td>Suspender análogos de somatostatina según pauta.</td>
          </tr>
          <tr>
            <td><strong>PET Paratiroides</strong></td>
            <td>18F-Colina</td>
            <td>Hiperparatiroidismo primario y localización de adenomas ectópicos.</td>
            <td>Adquisición precoz cérvico-torácica.</td>
          </tr>
          <tr>
            <td><strong>PET Cardíaco / Infección</strong></td>
            <td>18F-FDG</td>
            <td>Endocarditis sobre válvula protésica, marcapasos/DAI y vasculitis de grandes vasos.</td>
            <td>Dieta cetogénica preparatoria rica en grasas y heparina.</td>
          </tr>
          <tr>
            <td><strong>PET Cerebral / Neurología</strong></td>
            <td>18F-FDG</td>
            <td>Deterioro cognitivo, diagnóstico diferencial de demencias y foco epileptógeno.</td>
            <td>Reposo sensorial acústico y visual previo a inyección.</td>
          </tr>
        </tbody>
      </table>

      <h2>1.3. Algoritmo de Priorización Clínica (P1 · P2 · P3)</h2>
      <p>
        El formulario evalúa en tiempo real las variables introducidas y asigna un nivel de prioridad objetivo:
      </p>
      <ul>
        <li><span class="badge badge-p1">P1 · Preferente (&lt; 7 días):</span> Decisión de tratamiento inminente, sospecha de neoplasia de rápida progresión o comités con fecha fijada.</li>
        <li><span class="badge badge-p2">P2 · Ordinaria (&lt; 15 días):</span> Estadificación estándar, control de respuesta intermedia o planificación de radioterapia.</li>
        <li><span class="badge badge-p3">P3 · Demorable (&lt; 30 días):</span> Sospechas de baja probabilidad, re-evaluación a largo plazo y nódulos de crecimiento indolente.</li>
      </ul>

      <h2>1.4. Flujo Paso a Paso de Prescripción</h2>
      <ol class="step-list">
        <li><strong>Filiación del Paciente:</strong> Introducción de NHC, nombre, apellidos, fecha de nacimiento, peso y talla (cálculo instantáneo de IMC y dosis recomendada en mCi).</li>
        <li><strong>Selección de Indicación y Protocolo:</strong> Selección del tipo de estudio en el menú guiado por patología oncológica o infecciosa.</li>
        <li><strong>Alertas de Seguridad:</strong> Detección de movilidad reducida (alerta para camilla/ayuda en colocación), alergia a contrastes o diabetes.</li>
        <li><strong>Firma y Envío:</strong> Generación del volante digital y emisión instantánea al canal de triaje.</li>
      </ol>
    </div>

    <!-- SECCIÓN MODULO 2: TRIAJE Y AGENDAMIENTO -->
    <div id="mod-2" class="chapter">
      <h1>2. Módulo 2 · Triaje Clínico Algorítmico y Agendamiento Inteligente</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">📊</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Médicos Nucleares y Personal de Citaciones</strong>
          <span>Motor algorítmico de clasificación, control de vida media de radiofármacos y matriz semanal de agendamiento inteligente.</span>
        </div>
      </div>

      <h2>2.1. Propósito Operativo</h2>
      <p>
        Optimiza la utilización del tomógrafo PET/CT emparejando la disponibilidad física de los radiofármacos (lotes de ciclotrón para 18F y eluciones de generador/radiofarmacia para 68Ga) con la severidad clínica del paciente, minimizando tiempos de espera y garantizando el cumplimiento de plazos del SERGAS.
      </p>

      <h2>2.2. Reglas de Validación y Bloqueos Preventivos</h2>
      <div class="callout callout-alert">
        <div class="callout-title">⚠️ Filtro Antineoplásico de 21 Días</div>
        El sistema bloquea automáticamente la citación si han transcurrido menos de 21 días desde el último ciclo de quimioterapia o inmunoterapia (o menos de 3 meses tras radioterapia curativa), previniendo falsos negativos por aturdimiento tumoral o falsos positivos por inflamación reactiva.
      </div>

      <h2>2.3. Matriz Semanal de Isótopos y Agendas</h2>
      <ul>
        <li><strong>Lunes, Miércoles y Viernes:</strong> Lotes de 18F-FDG (Oncología general, infección y neurología) en turnos continuados.</li>
        <li><strong>Martes:</strong> Estudios especiales de 18F-Colina (Próstata/Paratiroides) y trazadores vasculares.</li>
        <li><strong>Jueves:</strong> 68Ga-DOTATOC y 18F-PSMA (Radiofarmacia y Curium) con agrupamiento en ventanas de elución.</li>
        <li><strong>Gestión de Peonadas y Cupos Extraordinarios:</strong> Capacidad de activar módulos de jornada de tarde para reducir listas de espera oncológicas.</li>
      </ul>

      <h2>2.4. Automatización de Envío al Paciente</h2>
      <p>
        Al confirmar la cita en la matriz, el sistema genera automáticamente un mensaje SMS personalizado con el enlace a la audioguía específica del paciente, sin necesidad de instalar aplicaciones móviles externas.
      </p>
    </div>

    <!-- SECCIÓN MODULO 3: AUDIOGUIAS -->
    <div id="mod-3" class="chapter">
      <h1>3. Módulo 3 · Portal del Paciente & Catálogo de 12 Audioguías Oficiales</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">🎧</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Pacientes, Familiares y Cuidadores</strong>
          <span>Portal asistencial interactivo con síntesis de voz en gallego/castellano, cronómetros de ayuno y asistente virtual de dudas clínicas 24/7.</span>
        </div>
      </div>

      <h2>3.1. Las 12 Audioguías Específicas por Prueba</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Protocolo / Audioguía</th>
            <th>Pauta Específica de Preparación</th>
            <th>Origen / Radiofármaco</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>01</strong></td>
            <td>18F-FDG Oncológico (No Diabético)</td>
            <td>Ayuno estricto 6 horas (solo agua). Hidratación previa abundante.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>02</strong></td>
            <td>18F-FDG Oncológico (Diabético)</td>
            <td>Envío de glucemia capilar matutina. Pauta personalizada de insulina/antidiabéticos.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>03</strong></td>
            <td>18F-FDG con Contraste Iodado IV</td>
            <td>Ayuno 6 horas + analítica de creatinina (&lt; 30 días) para filtrado glomerular.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>04</strong></td>
            <td>18F-FDG Endocarditis y Dispositivos</td>
            <td>Dieta preparatoria de supresión miocárdica (alta en grasas, cero hidratos) + heparina.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>05</strong></td>
            <td>18F-FDG Vasculitis de Grandes Vasos</td>
            <td>Ayuno de 6 horas, evitar ejercicio físico previo y coordinar corticoides.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>06</strong></td>
            <td>18F-FDG Neurológico / Demencias</td>
            <td>Ayuno 6 horas, estancia en penumbra sin estímulos auditivos ni lectura previa.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>07</strong></td>
            <td>18F-FDG Neurofisioneurología (Epilepsia)</td>
            <td>Monitorización EEG coordinada. Pauta especial de fármacos antiepilépticos.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>08</strong></td>
            <td>68Ga-PSMA Próstata (Radiofarmacia)</td>
            <td>Buena hidratación previa. No requiere ayuno metabólico de glucosa.</td>
            <td>Radiofarmacia Interna</td>
          </tr>
          <tr>
            <td><strong>09</strong></td>
            <td>68Ga-DOTATOC Tumores Neuroendocrinos</td>
            <td>Control y suspensión temporal de análogos de somatostatina (octreótido/lanreótido).</td>
            <td>Radiofarmacia Interna</td>
          </tr>
          <tr>
            <td><strong>10</strong></td>
            <td>18F-PSMA Próstata (Curium Madrid)</td>
            <td>Hidratación forzada antes y después para lavado vesical. Sin ayuno estricto.</td>
            <td>Curium Pharma</td>
          </tr>
          <tr>
            <td><strong>11</strong></td>
            <td>18F-Colina Próstata (Recidiva)</td>
            <td>Ayuno ligero de 4 horas para reducir peristaltismo intestinal.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
          <tr>
            <td><strong>12</strong></td>
            <td>18F-Colina Paratiroides (Adenoma)</td>
            <td>Ayuno ligero de 4 horas. Inmovilización cérvico-facial durante adquisición.</td>
            <td>Ciclotrón Nacional</td>
          </tr>
        </tbody>
      </table>

      <h2>3.2. Asistente Virtual Inteligente con Cero Alucinaciones</h2>
      <p>
        El asistente conversacional integrado opera bajo un motor semántico restringido a la base de conocimiento clínico oficial del SERGAS. Si el usuario pregunta dudas fuera del protocolo o de alto riesgo médico (ej. suspensión no autorizada de medicación vital), el sistema deriva de inmediato a la enfermera gestora o al teléfono asistencial de Galaria.
      </p>

      <h2>3.3. Modo Revisor de Audioguías</h2>
      <p>
        Diseñado para comisiones de calidad y personal facultativo. Permite navegar una a una por las 12 audioguías comprobando locuciones, textos, cronómetros y respuestas del chatbot con un solo clic desde el Portal Maestro.
      </p>
    </div>

    <!-- SECCIÓN MODULO 4: ENFERMERIA Y BOXES -->
    <div id="mod-4" class="chapter">
      <h1>4. Módulo 4 · Consola de Enfermería & Boxes de Inyección</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">🏥</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Personal de Enfermería de la Unidad PET/CT</strong>
          <span>Supervisión de pacientes en boxes, dosimetría pre-analítica en mCi, control de glucemias y tiempos de reposo en penumbra.</span>
        </div>
      </div>

      <h2>4.1. Funcionalidades Principales</h2>
      <ul>
        <li><strong>Monitorización de Boxes Individuales:</strong> Panel visual del estado de cada box (libre, ocupado en reposo, en inyección o listo para pasar al tomógrafo).</li>
        <li><strong>Triaje de Glucemia Capilar:</strong> Registro inmediato de la cifra glucémica. Alerta prioritaria si la cifra supera el umbral recomendado para el protocolo metabólico.</li>
        <li><strong>Cálculo Dosimétrico en mCi:</strong> Cálculo automático de la actividad neta a inyectar según el peso del paciente, con factor de corrección por decaimiento físico radiactivo entre la extracción y la inyección.</li>
        <li><strong>Temporizador de Reposo Post-Inyección:</strong> Cronómetro de 45-60 minutos de reposo obligatorio en penumbra y silencio (crucial en 18F-FDG para evitar captación muscular por estrés o frío).</li>
        <li><strong>Gestión de Necesidades Especiales:</strong> Registro inmediato si el paciente requiere camilla, ayuda para la colocación o soporte de movilidad.</li>
      </ul>
    </div>

    <!-- SECCIÓN MODULO 5: CONSOLA MEDICA -->
    <div id="mod-5" class="chapter">
      <h1>5. Módulo 5 · Consola Médica de Protocolización y Adquisición</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">👨‍⚕️</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Facultativos Especialistas en Medicina Nuclear</strong>
          <span>Agenda clínica del día, visor de volantes médicos, protocolización de rangos de escaneo y pautas de contraste intravenoso.</span>
        </div>
      </div>

      <h2>5.1. Modal de Protocolización Asistencial</h2>
      <p>
        El médico nuclear revisa el historial del paciente citado y define las directrices que serán transmitidas automáticamente a la consola técnica del tomógrafo:
      </p>
      <ul>
        <li><strong>Rango Anatómico de Adquisición:</strong> Selección entre Cráneo a Muslos (estándar), Cuerpo Entero (vértice a pies para melanoma, mieloma y vasculitis) o Estudio Cerebral dedicado.</li>
        <li><strong>Posicionamiento de Extremidades:</strong> Brazos arriba (oncológico abdominal/torácico) o brazos abajo (cabeza y cuello, melanoma facial o pacientes con hombro congelado).</li>
        <li><strong>Protocolo de TC Diagnóstico y Contraste:</strong> Definición de TC de baja dosis para corrección de atenuación o TC diagnóstico con contraste iodado IV (fases arterial, venosa o portal).</li>
        <li><strong>Fármacos Coadyuvantes:</strong> Prescripción de diuréticos (furosemida / Seguril) para eliminación precoz de actividad vesical en estudios urológicos y pélvicos.</li>
      </ul>
    </div>

    <!-- SECCIÓN MODULO 6: CONSOLA TECNICA TSID -->
    <div id="mod-6" class="chapter">
      <h1>6. Módulo 6 · Consola Técnica TSID de Tomógrafo PET/CT</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">🔬</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Técnicos Superiores en Imagen para el Diagnóstico (TSID)</strong>
          <span>Consola a pie de escáner: secuenciación de pacientes, posicionamiento láser, campos FOV y gestión de contraste iodado.</span>
        </div>
      </div>

      <h2>6.1. Operativa en Sala de Adquisición</h2>
      <ul>
        <li><strong>Cronómetro en Vivo de Entrada a Máquina:</strong> Sincronizado con la hora de inyección registrada por enfermería en el Módulo 4. El técnico sabe con precisión de segundos cuándo se cumple el tiempo óptimo de captación.</li>
        <li><strong>Esquemas Anatómicos Visuales:</strong> Representación gráfica clara de la postura prescrita por el facultativo (brazos arriba/abajo, soportes de cabeza, cuñas de rodillas).</li>
        <li><strong>Diagrama de Cobertura de Campos (FOV):</strong> Indicación visual de las posiciones de cama necesarias para cubrir el rango prescrito.</li>
        <li><strong>Semáforo de Contraste IV:</strong> Comprobación de vía venosa periférica permeable, volumen de contraste a infundir, velocidad de bomba de inyección (ml/s) y tiempo de retardo (delay).</li>
        <li><strong>Alertas de Corrección O-MAR:</strong> Notificación automática de presencia de prótesis metálicas (cadera, prótesis dental o artrodesis) para activar el algoritmo de reducción de artefactos metálicos en la reconstrucción tomográfica.</li>
      </ul>
    </div>

    <!-- SECCIÓN MODULO 7: JEFATURA DE SERVICIO -->
    <div id="mod-7" class="chapter">
      <h1>7. Módulo 7 · Jefatura de Servicio & Cuadro de Mando de Gestión Clínica</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">📈</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Jefatura de Servicio, Dirección Médica y Gerencia</strong>
          <span>Business Intelligence clínico: auditoría de calidad prescriptiva, puntualidad del tomógrafo, tasas de absentismo y memoria de actividad.</span>
        </div>
      </div>

      <h2>7.1. Indicadores Clave de Rendimiento (KPIs)</h2>
      <table>
        <thead>
          <tr>
            <th>Indicador Asistencial</th>
            <th>Objetivo SERGAS</th>
            <th>Impacto en la Gestión Sanitaria</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Paso en Hora a Máquina</strong></td>
            <td>&gt; 92 %</td>
            <td>Garantiza la validez de la captación metabólica y evita pérdidas de actividad radiactiva.</td>
          </tr>
          <tr>
            <td><strong>Tasa de Absentismo (No-Show)</strong></td>
            <td>&lt; 2.5 %</td>
            <td>Evita el desaprovechamiento de radiofármacos de vida media corta y minimiza el coste de inactividad.</td>
          </tr>
          <tr>
            <td><strong>Recitación de Huecos Liberados</strong></td>
            <td>&gt; 80 %</td>
            <td>Aprovechamiento ágil de cancelaciones mediante lista de pacientes en espera telefónica.</td>
          </tr>
          <tr>
            <td><strong>Prescripciones con Deficiencias</strong></td>
            <td>&lt; 5 %</td>
            <td>Auditoría de volantes incompletos o con indicación desajustada a guías clínicas oficiales.</td>
          </tr>
        </tbody>
      </table>

      <h2>7.2. Gráficas de Tendencia y Memorias Automatizadas</h2>
      <p>
        El cuadro de mando calcula tendencias históricas mediante micro-gráficos SVG interactivos y genera informes mensuales, trimestrales y anuales listos para exportar y archivar en comisiones de dirección.
      </p>
    </div>

    <!-- SECCIÓN MODULO 8: SUPERVISION DE ENFERMERIA -->
    <div id="mod-8" class="chapter">
      <h1>8. Módulo 8 · Supervisión de Enfermería, Gestión de Stock y Logística</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">📦</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Supervisora de Enfermería de la Unidad</strong>
          <span>Planilla de turnos de personal, calculadora logística diaria de fungibles para compras públicas (SERGAS LOGAS / Galaria) y memoria de cuidados.</span>
        </div>
      </div>

      <h2>8.1. Pestañas y Funcionalidades del Módulo</h2>
      <ul>
        <li><strong>1. Planilla Interactiva de Personal:</strong> Programación y cobertura de turnos diarios y mensuales para enfermeros, técnicos TSID, celadores y TCAEs en Medicina Nuclear y PET/CT.</li>
        <li><strong>2. Pedidos y Fungibles por Paciente:</strong> Calculadora logística que proyecta el consumo exacto de fungibles (vías periféricas 20G/22G, sistemas de infusión con alargadera, apósitos estériles, agujas y jeringas de plomo) según los pacientes y radiofármacos citados en la jornada. Genera los borradores de pedido normalizados para la plataforma LOGAS del SERGAS y compras de Galaria.</li>
        <li><strong>3. Eficacia Preventiva de Audioguías:</strong> Monitorización del impacto de la información al paciente: tasa de adherencia del 85.4% y reducción superior al 85% de suspensiones en box por error en el ayuno.</li>
        <li><strong>4. Puntualidad en Boxes:</strong> Tiempos medios de reposo, control de estancias y agilidad en el flujo de pacientes.</li>
        <li><strong>5. Calidad de Venopunción:</strong> Auditoría de accesos vasculares periféricos, calibres recomendados y ausencia de incidencias en administración.</li>
        <li><strong>6. Absentismo y Contingencias:</strong> Registro de cancelaciones de última hora y reasignación de huecos disponibles.</li>
        <li><strong>7. Memoria de Cuidados e Informe del Turno:</strong> Generador de informe oficial consolidado del turno con maquetación formal para archivo y supervisión.</li>
      </ul>
    </div>

    <!-- SECCIÓN MODULO 9: ENFERMERA GESTORA DE CASOS -->
    <div id="mod-9" class="chapter">
      <h1>9. Módulo 9 · Enfermería Gestora de Casos Oncológicos y Enlace Asistencial</h1>

      <div class="module-hero-card">
        <div class="module-hero-icon">📋</div>
        <div class="module-hero-desc">
          <strong>Destinatarios: Enfermeras Gestoras de Casos por Especialidad Médica</strong>
          <span>Seguimiento transversal del paciente oncológico, cruce multi-servicio por NHC, sincronización con consultas médicas y comités de tumores.</span>
        </div>
      </div>

      <h2>9.1. Funcionalidades Estratégicas</h2>
      <ul>
        <li><strong>Filtrado por Servicio Clínico Solicitante:</strong> Visualización segmentada para gestoras de Oncología Médica, Hematología, Neumología, Urología, Aparato Digestivo y Cirugía.</li>
        <li><strong>Búsqueda Universal por NHC:</strong> Identificación inmediata del paciente oncológico complejo con peticiones simultáneas procedentes de diferentes departamentos (ej. Neumología y Cirugía Torácica), evitando duplicidades y exploraciones redundantes.</li>
        <li><strong>Sincronización Bidireccional Cita-PET / Consulta Médica:</strong> Registro de la fecha de la consulta sucesiva o del comité de tumores donde se tomará la decisión terapéutica.</li>
        <li><strong>Semáforo de Coordinación Asistencial:</strong>
          <ul>
            <li><span class="badge badge-p1">Alerta Roja:</span> PET sin citar y consulta médica fijada en menos de 5 días hábiles.</li>
            <li><span class="badge badge-p2">Alerta Ámbar:</span> Margen inferior a 48 horas entre la realización del PET y la consulta (riesgo de no disponer del informe validado a tiempo).</li>
            <li><span class="badge badge-p3">Coordinado (Verde):</span> Margen superior a 72 horas con informe programado para la sesión clínica.</li>
          </ul>
        </li>
      </ul>
    </div>

    <!-- SECCIÓN MODULO 10: HERRAMIENTAS Y REPORTES -->
    <div id="mod-10" class="chapter">
      <h1>10. Herramientas Auxiliares e Informes Oficiales</h1>

      <h2>10.1. Generador e Impresor de Informes Diarios de Enfermería</h2>
      <p>
        Plantilla normalizada en formato A4 con membrete institucional del Servizo Galego de Saúde y Galaria. Consolida la relación nominal de pacientes atendidos, trazador administrado, actividad neta en mCi, glucemias registradas, incidencias de enfermería y firma de la supervisora de unidad.
      </p>

      <h2>10.2. Dossier Ejecutivo de Gestión Sanitaria Pública</h2>
      <p>
        Presentación corporativa en pantalla completa con métricas directivas, matriz de interoperabilidad y valor asistencial de la gestión pública sanitaria para el SERGAS y Galaria.
      </p>
    </div>

    <!-- SECCIÓN MODULO 11: ARQUITECTURA TECNICA -->
    <div id="mod-11" class="chapter">
      <h1>11. Arquitectura Técnica, Interoperabilidad y Despliegue en la Nube</h1>

      <h2>11.1. Comunicación en Vivo e Interoperabilidad entre Módulos</h2>
      <p>
        El ecosistema no requiere servidores intermedios pesados para la sincronización intrahospitalaria. Todos los módulos comparten un canal de mensajería asistencial en vivo y almacenamiento estructurado de datos clínicos, permitiendo que:
      </p>
      <ul>
        <li>Una nueva prescripción en el <strong>Módulo 1</strong> aparezca de inmediato en la bandeja de triaje del <strong>Módulo 2</strong> y en la consola de la gestora en el <strong>Módulo 9</strong>.</li>
        <li>La citación confirmada en el <strong>Módulo 2</strong> alimente la agenda de citados del <strong>Módulo 5</strong> y las necesidades de stock del <strong>Módulo 8</strong>.</li>
        <li>La hora real de inyección en el <strong>Módulo 4</strong> inicie automáticamente el cronómetro de cuenta atrás en la consola de adquisición técnica TSID del <strong>Módulo 6</strong>.</li>
      </ul>

      <h2>11.2. Despliegue y Disponibilidad</h2>
      <table style="margin-top: 10px;">
        <thead>
          <tr>
            <th>Entorno</th>
            <th>Dirección de Acceso</th>
            <th>Protocolo de Seguridad</th>
            <th>Finalidad</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Red Local / Hospital</strong></td>
            <td><code>http://127.0.0.1:8000/index.html</code></td>
            <td>Red asistencial interna protegida</td>
            <td>Operativa clínica diaria a pie de tomógrafo y consultas</td>
          </tr>
          <tr>
            <td><strong>Nube Vercel Cloud</strong></td>
            <td><code>https://ecosistemagalariapet1.vercel.app</code></td>
            <td>HTTPS · TLS 1.3 · Alta Disponibilidad 24/7</td>
            <td>Acceso corporativo SERGAS, pacientes (audioguías) y telemedicina</td>
          </tr>
        </tbody>
      </table>

      <div class="callout callout-success" style="margin-top: 25px;">
        <div class="callout-title">Garantía de Continuidad y Soporte</div>
        El ecosistema cuenta con un servicio daemon activo de sincronización que compila cualquier mejora clínica o de protocolo en tiempo real. Para soporte o sugerencias, dirigirse al Comité de Coordinación PET/CT de Galaria · Servizo Galego de Saúde.
      </div>
    </div>

  </div>

</body>
</html>
HTML

File.write("MANUAL_ECOSISTEMA_PET_CT.html", html_content, encoding: "UTF-8")
puts "✅ MANUAL_ECOSISTEMA_PET_CT.html generado (#{File.size('MANUAL_ECOSISTEMA_PET_CT.html')} bytes)"

puts "🖨️ Compilando a PDF con Google Chrome Headless..."
chrome_cmd = '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-sandbox --user-data-dir=/tmp/chrome_pdf_manual_data --print-to-pdf="MANUAL_ECOSISTEMA_PET_CT.pdf" --no-pdf-header-footer "MANUAL_ECOSISTEMA_PET_CT.html"'
system(chrome_cmd)

if File.exist?("MANUAL_ECOSISTEMA_PET_CT.pdf")
  size_kb = (File.size("MANUAL_ECOSISTEMA_PET_CT.pdf").to_f / 1024).round(2)
  puts "🎉 MANUAL EN PDF GENERADO CON ÉXITO!"
  puts "📄 Archivo: MANUAL_ECOSISTEMA_PET_CT.pdf (#{size_kb} KB)"
else
  puts "⚠️ Error generando el PDF con Chrome."
end
