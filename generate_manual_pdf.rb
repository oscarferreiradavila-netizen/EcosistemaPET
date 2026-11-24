# encoding: utf-8
require 'fileutils'

html_content = <<~HTML
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Manual de Instrucciones y Funcionalidades — Ecosistema Digital PET/CT Galaria · SERGAS</title>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {
        content: counter(page);
      }
    }
    
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1e293b;
      line-height: 1.5;
      font-size: 10.5pt;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }

    /* Portada */
    .cover {
      page-break-after: always;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100vh;
      min-height: 250mm;
      padding: 30mm 20mm;
      background: linear-gradient(145deg, #0f172a 0%, #1e3a8a 50%, #0369a1 100%);
      color: #ffffff;
      border-radius: 8px;
    }

    .cover-header {
      border-bottom: 2px solid rgba(255, 255, 255, 0.2);
      padding-bottom: 15px;
    }

    .cover-badge {
      display: inline-block;
      background: #38bdf8;
      color: #0f172a;
      font-weight: 800;
      font-size: 9pt;
      letter-spacing: 1.5px;
      padding: 5px 14px;
      border-radius: 20px;
      text-transform: uppercase;
      margin-bottom: 15px;
    }

    .cover-title {
      font-size: 28pt;
      font-weight: 800;
      line-height: 1.15;
      margin: 10px 0 15px 0;
      letter-spacing: -0.5px;
    }

    .cover-subtitle {
      font-size: 14pt;
      font-weight: 400;
      color: #cbd5e1;
      max-width: 580px;
    }

    .cover-meta {
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      padding: 18px 24px;
      margin-top: 30px;
    }

    .cover-meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      font-size: 9.5pt;
    }

    .cover-meta-item strong {
      display: block;
      color: #7dd3fc;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }

    .cover-footer {
      font-size: 9pt;
      color: #94a3b8;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 15px;
      display: flex;
      justify-content: space-between;
    }

    /* Paginación y Saltos */
    .page-break {
      page-break-after: always;
    }

    .chapter {
      margin-bottom: 30px;
    }

    /* Encabezados */
    h1 {
      font-size: 18pt;
      font-weight: 800;
      color: #0f172a;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    h2 {
      font-size: 13pt;
      font-weight: 700;
      color: #0369a1;
      margin-top: 18px;
      margin-bottom: 8px;
      border-left: 4px solid #0284c7;
      padding-left: 8px;
    }

    h3 {
      font-size: 11pt;
      font-weight: 700;
      color: #334155;
      margin-top: 14px;
      margin-bottom: 6px;
    }

    p {
      margin: 0 0 10px 0;
      color: #334155;
      text-align: justify;
    }

    /* Cajas destacadas */
    .callout {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-left: 4px solid #0284c7;
      border-radius: 6px;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 9.5pt;
    }

    .callout-title {
      font-weight: 700;
      color: #0369a1;
      margin-bottom: 4px;
    }

    .callout-alert {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-left: 4px solid #ef4444;
    }

    .callout-alert .callout-title {
      color: #b91c1c;
    }

    .callout-success {
      background: #f0fdf4;
      border: 1px solid #bbf7d0;
      border-left: 4px solid #16a34a;
    }

    .callout-success .callout-title {
      color: #15803d;
    }

    /* Tablas */
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
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
      font-weight: 700;
      color: #0f172a;
    }

    tr:nth-child(even) td {
      background: #fcfdfe;
    }

    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.3px;
    }

    .badge-p1 { background: #fee2e2; color: #991b1b; }
    .badge-p2 { background: #fef3c7; color: #92400e; }
    .badge-p3 { background: #e0f2fe; color: #075985; }
    .badge-active { background: #dcfce7; color: #166534; }

    /* Listas con viñetas elegantes */
    ul {
      margin: 6px 0 12px 18px;
      padding: 0;
    }

    li {
      margin-bottom: 4px;
      color: #334155;
    }

    li strong {
      color: #0f172a;
    }

    /* Índice */
    .toc-item {
      display: flex;
      justify-content: space-between;
      border-bottom: 1px dotted #cbd5e1;
      padding: 6px 0;
      font-size: 10pt;
    }

    .toc-title {
      font-weight: 600;
      color: #0f172a;
    }

    .toc-desc {
      font-size: 8.5pt;
      color: #64748b;
      display: block;
    }

    .toc-page {
      font-weight: 700;
      color: #0284c7;
    }

    .url-tag {
      font-family: ui-monospace, Menlo, Monaco, Consolas, monospace;
      background: #f1f5f9;
      color: #0369a1;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8.5pt;
      border: 1px solid #e2e8f0;
      word-break: break-all;
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover">
    <div class="cover-header">
      <div class="cover-badge">MANUAL OFICIAL DE OPERACIÓN & FUNCIONALIDADES</div>
      <div class="cover-title">ECOSISTEMA DIGITAL PET/CT</div>
      <div class="cover-subtitle">Guía Integral de Referencia Clínica, Técnica y de Gestión para Medicina Nuclear</div>
    </div>

    <div class="cover-meta">
      <div class="cover-meta-grid">
        <div class="cover-meta-item">
          <strong>Organización</strong>
          Galaria · Empresa Pública de Servizos Sanitarios / SERGAS
        </div>
        <div class="cover-meta-item">
          <strong>Servicio Responsable</strong>
          Medicina Nuclear & Unidad PET/CT (Hospital do Meixoeiro, Vigo)
        </div>
        <div class="cover-meta-item">
          <strong>Despliegue Web 24/7</strong>
          https://oscarferreiradavila-netizen.github.io/EcosistemaPET/
        </div>
        <div class="cover-meta-item">
          <strong>Versión de la Suite</strong>
          Versión 4.2 Pro (Actualización Continua Cloud)
        </div>
      </div>
    </div>

    <div class="cover-footer">
      <span>Documentación Técnica para Facultativos, Enfermería, Técnicos TSID y Dirección</span>
      <span>Vigo · Noviembre 2026</span>
    </div>
  </div>

  <!-- TABLA DE CONTENIDOS -->
  <div class="chapter page-break">
    <h1>Índice de Módulos y Programas</h1>
    <p>El Ecosistema Digital PET/CT está compuesto por 7 programas integrados que cubren el ciclo asistencial completo del paciente, desde la prescripción médica inicial hasta la auditoría analítica de la Jefatura de Servicio:</p>

    <div style="margin-top: 15px;">
      <div class="toc-item">
        <div>
          <span class="toc-title">1. Módulo 0: Portal Maestro Unificado</span>
          <span class="toc-desc">Acceso único centralizado con control de perfiles y monitor de estado.</span>
        </div>
        <span class="toc-page">Pág. 2</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">2. Módulo 1: Petición Médica Electrónica de Estudios PET/CT</span>
          <span class="toc-desc">Prescripción clínica guiada, selección de radiofármaco, validación analítica y volante SERGAS.</span>
        </div>
        <span class="toc-page">Pág. 3</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">3. Módulo 2: Triaje Clínico Algorítmico y Priorización</span>
          <span class="toc-desc">Ponderación algorítmica EANM (P1, P2, P3), peonadas extraordinarias y citación óptima.</span>
        </div>
        <span class="toc-page">Pág. 4</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">4. Módulo 3: Portal del Paciente & Audioguías Interactivas</span>
          <span class="toc-desc">Semáforo de alimentos, ayuno inteligente, audioguía bilingüe y Chatbot IA con Blindaje Clínico.</span>
        </div>
        <span class="toc-page">Pág. 5</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">5. Módulo 4: Consola de Enfermería & Boxes de Inyección</span>
          <span class="toc-desc">Gestión de vías, glucemia capilar en box, cronómetro de reposo y eliminación coordinada.</span>
        </div>
        <span class="toc-page">Pág. 6</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">6. Módulo 5: Consola Médica de Protocolización y Adquisición</span>
          <span class="toc-desc">Planificador Full Body interactivo, posición de brazos, fase vascular, firma digital y visor SIDI PACS.</span>
        </div>
        <span class="toc-page">Pág. 7</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">7. Módulo 6: Consola Técnica TSID (Técnicos de Tomógrafo)</span>
          <span class="toc-desc">Semáforo de preparación de salas, órdenes de escaneo en máquina y control de incidencias.</span>
        </div>
        <span class="toc-page">Pág. 8</span>
      </div>

      <div class="toc-item">
        <div>
          <span class="toc-title">8. Módulo 7: Consola de Jefatura de Servicio & Gestión Clínica</span>
          <span class="toc-desc">Peticiones erróneas, paso a máquina, no-shows, anulaciones operativas, métricas por médico e informes oficiales.</span>
        </div>
        <span class="toc-page">Pág. 9</span>
      </div>
    </div>

    <div class="callout callout-success" style="margin-top: 25px;">
      <div class="callout-title">Sincronización en Tiempo Real</div>
      Todos los programas comparten un bus de datos clínico bidireccional. Cualquier acción realizada en una consola (ej. protocolizar un estudio, anotar una glucemia o marcar una inyección) se refleja instantáneamente en el resto de terminales sin necesidad de recargar la página.
    </div>
  </div>

  <!-- MÓDULO 0: PORTAL MAESTRO -->
  <div class="chapter page-break">
    <h1>1. Portal Maestro Unificado</h1>
    <div class="url-tag">Ruta Web: /index.html</div>

    <h2>1.1. Propósito y Audiencia</h2>
    <p>El <strong>Portal Maestro</strong> es el punto de entrada oficial para todo el personal del servicio (médicos nucleares, radiofarmacéuticos, enfermeros, técnicos TSID, administrativos y jefatura) y para pacientes que acceden a sus instrucciones de cita. Proporciona una interfaz visual moderna que organiza los módulos por categorías asistenciales.</p>

    <h2>1.2. Funcionalidades Principales</h2>
    <ul>
      <li><strong>Navegación Unificada con 1 Clic:</strong> Tarjetas interactivas con acceso directo a cada una de las 7 consolas clínicas sin necesidad de recordar URLs individuales.</li>
      <li><strong>Monitor de Estado del Servidor:</strong> Indicador en tiempo real de la conectividad de la base de datos y de la sincronización en la nube.</li>
      <li><strong>Filtros por Perfil Profesional:</strong> Permite alternar la vista entre perfil <em>Médico</em>, <em>Enfermería / Técnico</em>, <em>Gestión / Jefatura</em> o <em>Acceso Paciente</em>.</li>
      <li><strong>Guías y Recursos Rápidos:</strong> Enlaces a la documentación oficial de radiofármacos (18F-FDG, 68Ga-PSMA, 18F-Colina, 68Ga-DOTATOC), normativas de radioprotección y directorios telefónicos de la unidad.</li>
    </ul>

    <div class="callout">
      <div class="callout-title">Uso Típico</div>
      Se recomienda configurar <code>https://oscarferreiradavila-netizen.github.io/EcosistemaPET/index.html</code> como página de inicio en todos los navegadores de los puestos de trabajo del Hospital do Meixoeiro.
    </div>
  </div>

  <!-- MÓDULO 1: PETICIÓN MÉDICA -->
  <div class="chapter page-break">
    <h1>2. Módulo de Petición Médica Electrónica</h1>
    <div class="url-tag">Ruta Web: /pet_peticion_medica/index.html</div>

    <h2>2.1. Propósito</h2>
    <p>Herramienta diseñada para facultativos especialistas peticionarios (Oncología Médica, Radioterápica, Hematología, Medicina Interna, Urología, Cirugía, etc.) para solicitar estudios PET/CT garantizando que la petición cumpla todos los criterios clínicos obligatorios.</p>

    <h2>2.2. Funcionalidades Principales</h2>
    <ul>
      <li><strong>Filiación Integral del Paciente:</strong> Captura de NHC, CIP Autonómico, nombre, edad, sexo, peso (kg) y talla (cm) para cálculo automático del IMC y dosis estimada.</li>
      <li><strong>Filtro Clínico Oncológico y de Seguridad:</strong>
        <ul>
          <li>Registro de diagnóstico histológico y estadio tumoral para priorización EANM.</li>
          <li>Fecha de última quimioterapia / radioterapia para respetar la ventana biológica de 21 días (evitar falsos negativos por aturdimiento metabólico).</li>
          <li>Chequeo de diabetes y antecedentes de alergia a contrastes si se solicita TAC diagnóstico coadyuvante.</li>
        </ul>
      </li>
      <li><strong>Selector Clínico de Radiofármaco:</strong>
        <ul>
          <li><strong>18F-FDG:</strong> Indicaciones oncológicas estándar, linfomas, nódulo pulmonar, endocarditis y vasculitis.</li>
          <li><strong>68Ga-PSMA-11 / 18F-PSMA:</strong> Estadificación inicial de alto riesgo y recidiva bioquímica en cáncer de próstata.</li>
          <li><strong>18F-Fluorocolina:</strong> Adenomas paratiroideos en hiperparatiroidismo primario y carcinoma prostático.</li>
          <li><strong>68Ga-DOTATOC:</strong> Tumores neuroendocrinos gastroenteropancreáticos y bronquiales.</li>
        </ul>
      </li>
      <li><strong>Generación de ID Único de Petición (<code>Submission ID</code>):</strong> Cada solicitud genera un identificador alfanumérico irrepetible con código de barras y QR para trazabilidad SERGAS.</li>
      <li><strong>Impresión del Volante Normalizado:</strong> Generación en tiempo real del documento PDF oficial del volante de petición médica con diseño institucional para historia clínica en IANUS.</li>
    </ul>

    <table>
      <thead>
        <tr>
          <th>Campo de Petición</th>
          <th>Tipo</th>
          <th>Validación Clínica</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Glucemia previa</td>
          <td>Numérico (mg/dL)</td>
          <td>Alerta si ≥ 200 mg/dL en estudios FDG. Requiere pauta de ajuste.</td>
        </tr>
        <tr>
          <td>Fase Vascular</td>
          <td>Selector Sí/No</td>
          <td>Activa adquisición dinámica precoz en sospecha de arteritis.</td>
        </tr>
        <tr>
          <td>Contraste Yodado IV</td>
          <td>Selector Sí/No</td>
          <td>Bloqueado automáticamente si no hay FGe registrado o si FGe &lt; 30.</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- MÓDULO 2: TRIAJE CLÍNICO ALGORÍTMICO -->
  <div class="chapter page-break">
    <h1>3. Módulo de Triaje Clínico Algorítmico</h1>
    <div class="url-tag">Ruta Web: /pet_ct_triage/web_app/index.html</div>

    <h2>3.1. Propósito</h2>
    <p>Sistema inteligente para los Médicos Nucleares que reciben el aluvión de peticiones. Clasifica, prioriza y cita automáticamente a los pacientes según guías clínicas de la EANM y protocolos de demora máxima de Galaria · SERGAS.</p>

    <h2>3.2. Clasificación de Prioridades (P1 · P2 · P3)</h2>
    <table>
      <thead>
        <tr>
          <th>Nivel</th>
          <th>Demora Objetivo</th>
          <th>Criterios Clínicos Típicos</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><span class="badge badge-p1">P1 · URGENTE</span></td>
          <td>&lt; 7 días naturales</td>
          <td>Planificación radioterápica con fecha fija, sospecha de endocarditis protésica aguda, linfoma agresivo con rápida progresión, nódulo solitario previo a resección.</td>
        </tr>
        <tr>
          <td><span class="badge badge-p2">P2 · ESTÁNDAR</span></td>
          <td>&lt; 15 días naturales</td>
          <td>Evaluación de respuesta a quimioterapia/inmunoterapia, reestadificación tumoral programada, tumores neuroendocrinos de bajo grado.</td>
        </tr>
        <tr>
          <td><span class="badge badge-p3">P3 · DIFERIBLE</span></td>
          <td>&gt; 21 días / Seguimiento</td>
          <td>Seguimiento anual de lesiones quiescentes, recidivas bioquímicas de muy lenta duplicación, sospecha de vasculitis sin clínica activa.</td>
        </tr>
      </tbody>
    </table>

    <h2>3.3. Funcionalidades Destacadas</h2>
    <ul>
      <li><strong>Algoritmo Automático de Puntuación:</strong> Analiza el motivo de consulta, estadio tumoral y fechas límite para proponer la prioridad y el hueco en agenda más adecuado.</li>
      <li><strong>Detección de "Peticiones Mal Formadas":</strong> Marca automáticamente peticiones que carecen de diagnóstico histológico, sin estadio tumoral o con indicación no financiada en cartera de servicios.</li>
      <li><strong>Asignación de Peonadas Extraordinarias:</strong> Permite etiquetar y derivar pacientes a turnos de tarde o jornadas de fin de semana para cumplir objetivos de lista de espera.</li>
      <li><strong>Buscador y Filtro Predictivo:</strong> Búsqueda en tiempo real por NHC, nombre, servicio peticionario o rango de fechas.</li>
    </ul>
  </div>

  <!-- MÓDULO 3: PORTAL DEL PACIENTE & AUDIOGUÍAS -->
  <div class="chapter page-break">
    <h1>4. Portal del Paciente & Audioguías Interactivas</h1>
    <div class="url-tag">Ruta Web: /pet_prep_page/ (Adaptado a cada Radiofármaco)</div>

    <h2>4.1. Propósito</h2>
    <p>Página web interactiva optimizada para teléfonos móviles y tablets. Se envía al paciente por SMS/WhatsApp al momento de la citación para eliminar el absentismo y los estudios fallidos por mala preparación dietética o ayuno incorrecto.</p>

    <h2>4.2. Variantes Específicas por Prueba</h2>
    <ul>
      <li><strong>18F-FDG Oncológico Estándar y Diabéticos:</strong> Ayuno de 6 horas, dieta pobre en hidratos 24h antes, reposo muscular estricto (prohibido ejercicio) y pauta de glucemia matutina.</li>
      <li><strong>18F-FDG Endocarditis / Infección Valvular:</strong> Dieta estricta cero carbohidratos (carne, pescado, huevos y grasa exclusiva) y 16 horas de ayuno estricto para suprimir el miocardio sano.</li>
      <li><strong>18F-FDG Vasculitis de Grandes Vasos:</strong> Explicación de los 90 minutos de espera en reposo para máximo aclaramiento sanguíneo.</li>
      <li><strong>18F-FDG Neurológico / Demencias:</strong> Instrucciones de reposo neurosensorial estricto (sala a oscuras, silencio total, sin hablar ni mirar el móvil).</li>
      <li><strong>68Ga-PSMA / 18F-Colina / 68Ga-DOTATOC:</strong> Protocolos de hidratación forzada (1 litro de agua en espera) y supresión de análogos de somatostatina.</li>
    </ul>

    <h2>4.3. Motor de Inteligencia Artificial & Blindaje Clínico Cero Alucinaciones</h2>
    <div class="callout callout-success">
      <div class="callout-title">Blindaje Clínico SERGAS (Opción C)</div>
      El chatbot del paciente opera bajo un sistema de seguridad clínica con doble barrera:
      <ol style="margin: 5px 0 0 15px; padding: 0;">
        <li><strong>Motor Semántico Determinista:</strong> Respuestas exactas preaprobadas por el servicio médico para ayuno, alimentos y medicación.</li>
        <li><strong>Filtro de Seguridad IA (Google Gemini 2.5 Flash):</strong> Asistencia humana y empática respetando rigurosamente las guías clínicas cargadas en <code>guias_clinicas_ia/*.md</code>. Si el paciente pregunta algo no protocolizado, el bot nunca improvisa: muestra un botón para consultar con enfermería.</li>
      </ol>
    </div>

    <h2>4.4. Funcionalidades Interactivas para el Paciente</h2>
    <ul>
      <li><strong>Cronómetro de Ayuno Personalizado:</strong> El paciente introduce su hora de cita y la web calcula el minuto exacto en que debe dejar de comer.</li>
      <li><strong>Audioguía Locutada:</strong> Reproductor sonoro en gallego y castellano que explica cada fase del estudio para pacientes con dificultades de lectura.</li>
      <li><strong>Botón de Cancelación con Preaviso:</strong> Si el paciente no puede acudir, puede liberar su hueco con 1 clic para que el servicio pueda recitar a otro paciente en lista de espera.</li>
    </ul>
  </div>

  <!-- MÓDULO 4: CONSOLA DE ENFERMERÍA -->
  <div class="chapter page-break">
    <h1>5. Consola de Enfermería & Boxes de Inyección</h1>
    <div class="url-tag">Ruta Web: /pet_prep_page/enfermeria.html</div>

    <h2>5.1. Propósito</h2>
    <p>Herramienta táctil para el personal de enfermería en el área de radiofarmacia y boxes de reposo de Medicina Nuclear. Controla el flujo físico de pacientes y los tiempos de aclaramiento radiofarmacéutico.</p>

    <h2>5.2. Funcionalidades Principales</h2>
    <ul>
      <li><strong>Recepción y Triaje In Situ:</strong>
        <ul>
          <li>Comprobación de identidad (doble verificación verbal + pulsera).</li>
          <li>Pesaje real verificado (esencial para el cálculo preciso del SUV en el tomógrafo).</li>
          <li>Registro del acceso venoso: calibre del catéter (ej. 20G/18G) y localización (ej. flexura antecubital izquierda).</li>
        </ul>
      </li>
      <li><strong>🩸 Glucemia Capilar en Box (mg/dL):</strong>
        <p>Campo numérico ubicado estratégicamente junto a la hora de inyección. Aplica validación semafórica SERGAS:</p>
        <ul>
          <li><strong style="color: #16a34a;">&lt; 160 mg/dL:</strong> Óptima. Autorización automática para inyectar FDG.</li>
          <li><strong style="color: #ca8a04;">160 – 199 mg/dL:</strong> Límite. Requiere verificación de ayuno y aviso a médico responsable.</li>
          <li><strong style="color: #dc2626;">≥ 200 mg/dL:</strong> Alerta crítica. Riesgo severo de estudio no diagnóstico por competición con la glucosa plasmática. Requiere hidratación forzada o reprogramación.</li>
        </ul>
      </li>
      <li><strong>⏰ Hora de Inyección & Cronómetro de Reposo en Box:</strong>
        <p>Al pulsar "Inyectar", arranca un temporizador automático ajustado al protocolo:</p>
        <ul>
          <li><strong>60 minutos:</strong> FDG Oncológico estándar, PSMA, Colina y DOTATOC.</li>
          <li><strong>90 minutos:</strong> FDG Endocarditis (tras administración previa de Heparina IV) y FDG Vasculitis.</li>
        </ul>
      </li>
      <li><strong>Detección y Reporte de Extravasaciones:</strong> Botón de aviso si parte de la dosis queda en el tejido celular subcutáneo del brazo, alertando a los técnicos para incluir la zona en el campo de visión.</li>
      <li><strong>Eliminación Coordinada de Pacientes:</strong> Botón de borrado simultáneo sincronizado con la Consola Técnica TSID para limpiar cancelaciones de última hora sin dejar datos huérfanos.</li>
    </ul>
  </div>

  <!-- MÓDULO 5: CONSOLA MÉDICA DE PROTOCOLIZACIÓN -->
  <div class="chapter page-break">
    <h1>6. Consola Médica de Protocolización y Adquisición</h1>
    <div class="url-tag">Ruta Web: /pet_consola_medica/index.html</div>

    <h2>6.1. Propósito</h2>
    <p>Consola de trabajo de los Facultativos Especialistas de Medicina Nuclear. En ella se revisan las peticiones aceptadas y se prescriben las directrices técnicas que debe ejecutar el tomógrafo PET/CT.</p>

    <h2>6.2. Modal de Protocolización — Secciones Clínicas</h2>
    <ul>
      <li><strong>Sección 1: Planificador Anatómico Full Body Interactivo:</strong>
        <p>Permite dibujar con precisión el Campo de Visión (FOV) que debe explorar la máquina:</p>
        <ul>
          <li>Selectores <em>"DESDE"</em> (Vertex, Base de Cráneo, etc.) y <em>"HASTA"</em> (Pelvis, Tercio Proximal de Muslos, Pies).</li>
          <li><strong>Posición de Brazos:</strong> Selector con 3 opciones estandarizadas:
            <ul>
              <li><strong>Brazos Arriba:</strong> Protocolo estándar de tronco para evitar artefactos de endurecimiento de haz sobre el abdomen.</li>
              <li><strong>Brazos Abajo:</strong> Obligatorio en dolor de hombro, artritis o cabeza/cuello.</li>
              <li><strong>Brazos en Almohada:</strong> Para pacientes con cifosis o encamados con dolor lumbar.</li>
            </ul>
          </li>
        </ul>
      </li>
      <li><strong>Sección 2: Fase Vascular Dinámica (SÍ / NO):</strong>
        <p>Instrucción directa para que el técnico lance la adquisición del tomógrafo en el mismo segundo en que se inyecta el trazador (adquisición precoz), fundamental para estudiar el flujo arterial en vasculitis y prótesis vasculares.</p>
      </li>
      <li><strong>Sección 3: Protocolo de TAC y Contraste:</strong>
        <p>Definición del tipo de adquisición: TAC de baja dosis para corrección de atenuación vs TAC Diagnóstico con Contraste Intravenoso (bifásico o trifásico).</p>
      </li>
      <li><strong>Sección 4: Fármacos Coadyuvantes:</strong>
        <p>Prescripción de Furosemida (diurético de asa para lavado de pelvis renal), Heparina sódica o medicación sedante.</p>
      </li>
      <li><strong>Sección 5: Integración con Visor SIDI PACS (SERGAS):</strong>
        <p>Permite abrir los estudios radiológicos previos del paciente directamente dentro de la consola médica para comparar con el PET actual.</p>
      </li>
      <li><strong>Sección 6: Solicitud de Imágenes Tardías (Delayed Scans):</strong>
        <p>Botón directo para ordenar a los técnicos una segunda adquisición diferida a las 2-3 horas si hay captaciones dudosas en intestino o vejiga.</p>
      </li>
    </ul>
  </div>

  <!-- MÓDULO 6: CONSOLA TÉCNICA TSID -->
  <div class="chapter page-break">
    <h1>7. Consola Técnica TSID (Técnicos de Tomógrafo)</h1>
    <div class="url-tag">Ruta Web: /pet_consola_tecnicos/index.html</div>

    <h2>7.1. Propósito</h2>
    <p>Consola operativa instalada en la sala de control del tomógrafo PET/CT. Los Técnicos Superiores en Imagen para el Diagnóstico (TSID) visualizan el flujo de pacientes y reciben las instrucciones médicas exactas de adquisición.</p>

    <h2>7.2. Funcionalidades Principales</h2>
    <ul>
      <li><strong>Semáforo de Preparación del Paciente en Tiempo Real:</strong>
        <ul>
          <li><span class="badge badge-p1">CITADO:</span> En sala de espera general, pendiente de canalizar vía.</li>
          <li><span class="badge badge-p2">EN REPOSO:</span> En box de radiofarmacia cumpliendo los 60 o 90 minutos de aclaramiento. Muestra la hora de inyección y el minutero regresivo.</li>
          <li><span class="badge badge-active">LISTO PARA ENTRAR:</span> Tiempo de reposo completado con éxito, vejiga vaciada, paciente listo para ser transferido a la camilla del gantry.</li>
          <li><span class="badge" style="background:#f1f5f9; color:#475569;">EN MÁQUINA:</span> Adquisición en curso.</li>
        </ul>
      </li>
      <li><strong>Recepción Automática de Instrucciones del Protocolo Médico:</strong>
        <p>El técnico ve en pantalla grande de forma clara y destacada:</p>
        <ul>
          <li>Cobertura anatómica requerida (ej. <em>"Vértice a pies"</em>).</li>
          <li>Posición de brazos prescrita (ej. <em>"Brazos en almohada sobre el abdomen"</em>).</li>
          <li>Indicación de Fase Vascular (SÍ / NO).</li>
          <li>Glucemia capilar real registrada por enfermería antes de inyectar.</li>
          <li>Si requiere administración de contraste yodado en el TAC.</li>
        </ul>
      </li>
      <li><strong>Registro de Tiempos Reales de Máquina:</strong> Botones de un toque para registrar la hora exacta de entrada en gantry, hora del primer barrido y hora de finalización del escaneo.</li>
    </ul>
  </div>

  <!-- MÓDULO 7: JEFATURA DE SERVICIO & GESTIÓN -->
  <div class="chapter page-break">
    <h1>8. Consola de Jefatura de Servicio & Gestión Clínica</h1>
    <div class="url-tag">Ruta Web: /pet_jefatura_servicio/index.html</div>

    <h2>8.1. Propósito</h2>
    <p>Cuadro de mando analítico integral (Business Intelligence clínico) para el Jefe de Servicio de Medicina Nuclear, Directores Médicos y Supervisión de Enfermería. Monitoriza la calidad asistencial, el absentismo, los tiempos de espera y el rendimiento operativo.</p>

    <h2>8.2. Indicadores Clave de Rendimiento (KPIs)</h2>
    <table>
      <thead>
        <tr>
          <th>Indicador</th>
          <th>Objetivo SERGAS</th>
          <th>Impacto Clínico y Operativo</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><strong>% Peticiones con Errores</strong></td>
          <td>&lt; 5 %</td>
          <td>Peticiones que llegan sin estadio tumoral, sin fecha de último tratamiento o mal formuladas por servicio peticionario.</td>
        </tr>
        <tr>
          <td><strong>Puntualidad en Máquina</strong></td>
          <td>&gt; 90 %</td>
          <td>Porcentaje de pacientes que entran al tomógrafo en su ventana exacta de tiempo tras el reposo.</td>
        </tr>
        <tr>
          <td><strong>No-Shows (No acuden sin avisar)</strong></td>
          <td>&lt; 3 %</td>
          <td>Pérdida de dosis radiactiva de alto coste económico si el paciente falta sin previo aviso.</td>
        </tr>
        <tr>
          <td><strong>Recitación de Huecos</strong></td>
          <td>&gt; 80 %</td>
          <td>Tasa de aprovechamiento de citas canceladas con preaviso llamando a pacientes en espera.</td>
        </tr>
        <tr>
          <td><strong>Anulaciones por Mala Preparación</strong></td>
          <td>&lt; 2 %</td>
          <td>Pacientes que llegan habiendo desayunado o con glucemias &gt; 200 mg/dL por no seguir la guía.</td>
        </tr>
        <tr>
          <td><strong>Fallos de Producción Ciclotrón</strong></td>
          <td>Monitorización</td>
          <td>Incidencias en la entrega del radiofármaco desde la unidad de radiofarmacia externa.</td>
        </tr>
      </tbody>
    </table>

    <h2>8.3. Funcionalidades Analíticas Avanzadas</h2>
    <ul>
      <li><strong>Estadísticas por Radiofármaco:</strong> Cuantificación mensual de estudios con 18F-FDG, 68Ga-PSMA, 18F-Colina, 68Ga-DOTATOC, 18F-DOPA y trazadores de amiloide.</li>
      <li><strong>Gráficas de Evolución Temporal (Sparklines y Curvas SVG):</strong> Visualización de tendencias históricas de los últimos 6 meses para cada parámetro.</li>
      <li><strong>Métricas por Facultativo y Paciente:</strong>
        <ul>
          <li>Número de adquisiciones tardías prescritas por cada médico nuclear.</li>
          <li>Tiempo de espera del paciente desde que termina la imagen hasta que recibe el alta de la unidad.</li>
          <li>Tiempo medio de prueba por paciente y por médico.</li>
        </ul>
      </li>
      <li><strong>Pestaña 8 · Generador de Informes Periódicos:</strong> Permite emitir con 1 clic el <em>Informe Mensual</em>, <em>Informe Trimestral</em> o la <em>Memoria Anual</em> de la Unidad PET/CT con todos los cálculos agregados.</li>
      <li><strong>Pestaña 9 · Demo Imprimible A4:</strong> Maquetación profesional lista para imprimir o archivar en PDF con el formato oficial de Galaria · Servizo Galego de Saúde.</li>
    </ul>
  </div>

  <!-- RESUMEN TÉCNICO Y DESPLIEGUE -->
  <div class="chapter">
    <h1>9. Arquitectura Técnica y Despliegue en la Nube</h1>

    <h2>9.1. Infraestructura Cloud y Conectividad</h2>
    <ul>
      <li><strong>Alojamiento Web Continuo:</strong> Plataforma GitHub Pages bajo HTTPS seguro con certificado SSL TLS 1.3 activo 24/7 en la dirección:
        <br><a href="https://oscarferreiradavila-netizen.github.io/EcosistemaPET/" target="_blank"><strong>https://oscarferreiradavila-netizen.github.io/EcosistemaPET/</strong></a>
      </li>
      <li><strong>Auto-Deploy Watcher en Segundo Plano:</strong> El entorno de desarrollo cuenta con un servicio daemon activo (<code>watch_and_deploy.rb</code>) que monitoriza los archivos del proyecto. Cualquier actualización de código, estilo o directriz clínica se compila y se despliega automáticamente en la web en menos de 5 segundos.</li>
      <li><strong>Compatibilidad Multiplataforma:</strong> Interfaz 100% responsiva optimizada para ordenadores de sobremesa con pantallas médicas de diagnóstico, ordenadores portátiles de consulta y dispositivos móviles (iOS y Android).</li>
      <li><strong>Blindaje de Datos Clínicos:</strong> Los identificadores de pacientes y contraseñas de sesión están aislados en el almacenamiento local seguro y tokens efímeros conformes con el Esquema Nacional de Seguridad (ENS) y el RGPD sanitario.</li>
    </ul>

    <div class="callout callout-success" style="margin-top: 30px;">
      <div class="callout-title">Respaldo y Soporte</div>
      Para cualquier duda operativa o modificación sobre los módulos, el personal autorizado puede recurrir a las guías integradas en cada pantalla o ponerse en contacto con la Unidad de Medicina Nuclear de Galaria (Hospital do Meixoeiro).
    </div>
  </div>

</body>
</html>
HTML

File.write("MANUAL_ECOSISTEMA_PET_CT.html", html_content, encoding: "UTF-8")
puts "✅ Archivo HTML del Manual generado: MANUAL_ECOSISTEMA_PET_CT.html (#{File.size('MANUAL_ECOSISTEMA_PET_CT.html')} bytes)"

puts "🖨️ Compilando a PDF con Google Chrome Headless..."
chrome_cmd = '"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --no-sandbox --user-data-dir=/tmp/chrome_pdf_user_data --print-to-pdf="MANUAL_ECOSISTEMA_PET_CT.pdf" --no-pdf-header-footer "MANUAL_ECOSISTEMA_PET_CT.html"'
system(chrome_cmd)

if File.exist?("MANUAL_ECOSISTEMA_PET_CT.pdf")
  size_kb = (File.size("MANUAL_ECOSISTEMA_PET_CT.pdf").to_f / 1024).round(2)
  puts "🎉 MANUAL EN PDF GENERADO CON ÉXITO!"
  puts "📄 Archivo: MANUAL_ECOSISTEMA_PET_CT.pdf (#{size_kb} KB)"
else
  puts "⚠️ Error generando el PDF con Chrome."
end

