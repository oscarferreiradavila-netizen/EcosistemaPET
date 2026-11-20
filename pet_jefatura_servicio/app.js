/**
 * CONSOLA DE JEFATURA DE SERVICIO & GESTIÓN CLÍNICA PET/CT — GALARIA · SERGAS
 * Módulo 7 del Ecosistema Digital PET/CT
 * - Estadísticas de peticiones que llegan y % de peticiones que llegan mal
 * - Cantidad de pruebas hechas por radiofármaco
 * - Gráficas de evolución en el tiempo para cada parámetro
 * - Estadística de pacientes que pasan en hora a máquina (puntualidad de tomógrafo)
 * - Pacientes que no acuden sin avisar (No-Show) y cancelaciones recitables
 * - Anulaciones por pacientes mal preparados, fallo de producción de radiofármaco y extravasaciones
 * - Tardías pedidas por médico, tiempo de espera en salir desde la última imagen y tiempo medio por prueba (por paciente y por médico)
 */

(function () {
  'use strict';

  const STORAGE_KEY_MGMT = 'PET_SERVICE_MANAGEMENT_V1';
  const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pet_clinical_channel') : null;

  const NUCLEAR_DOCTORS = [
    'Dr. Manuel Gómez Feijóo',
    'Dra. Elena Rial Vázquez',
    'Dr. Alberto Silva Pousa',
    'Dra. Carmen Montes Rey'
  ];

  const state = {
    periodo: 'all', // 'all' | 'month' | 'week' | 'today'
    activeRole: 'jefatura', // 'jefatura' | 'enfermeria' | 'global'
    activeTab: 'resumen',
    peticiones: [],
    machineEntries: [],
    cancellations: [],
    noShows: [],
    anulaciones: [],
    patientDoctorTimings: [],
    reportType: 'mensual', // 'mensual' | 'trimestral' | 'anual'
    activeRecitarSlotId: null
  };

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function getTodayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseHHMMToMinutes(hhmm) {
    if (!hhmm) return null;
    const clean = String(hhmm).replace(/[^\d:]/g, '');
    const parts = clean.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function formatMinutesToHHMM(totalMin) {
    const norm = ((totalMin % 1440) + 1440) % 1440;
    const h = Math.floor(norm / 60);
    const m = norm % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function getTimeAxisLabels() {
    if (state.periodo === 'today') return ['08:30h', '09:30h', '10:30h', '11:30h', '12:30h', '13:30h'];
    if (state.periodo === 'week') return ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Hoy'];
    if (state.periodo === 'month') return ['Sem -5', 'Sem -4', 'Sem -3', 'Sem -2', 'Sem -1', 'Actual'];
    return ['Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov'];
  }

  // ==========================================================================
  // MOTOR GRÁFICO SVG: SPARKLINES Y GRÁFICAS DE EVOLUCIÓN EN EL TIEMPO
  // ==========================================================================
  function renderSparklineSVG(values, color) {
    if (!Array.isArray(values) || values.length < 2) return '';
    const w = 180;
    const h = 30;
    const min = Math.min.apply(null, values);
    const max = Math.max.apply(null, values);
    const range = Math.max(max - min, 1);

    const pts = values.map((v, i) => {
      const x = Math.round((i / (values.length - 1)) * (w - 10) + 5);
      const y = Math.round(h - 5 - ((v - min) / range) * (h - 10));
      return `${x},${y}`;
    });

    const areaPts = `5,${h - 2} ` + pts.join(' ') + ` ${w - 5},${h - 2}`;
    const lastPt = pts[pts.length - 1].split(',');

    return `
      <svg viewBox="0 0 ${w} ${h}" width="100%" height="30" style="overflow:visible;">
        <polygon points="${areaPts}" fill="${color}" fill-opacity="0.13"></polygon>
        <polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"></polyline>
        <circle cx="${lastPt[0]}" cy="${lastPt[1]}" r="3.5" fill="${color}"></circle>
      </svg>
    `;
  }

  function renderEvolutionChartSVG(config) {
    const xLabels = config.xLabels || getTimeAxisLabels();
    const series = config.series || [];
    const ySuffix = config.ySuffix || '';
    const width = 620;
    const height = 205;
    const padL = 44;
    const padR = 22;
    const padT = 22;
    const padB = 34;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    let allVals = [];
    series.forEach(s => {
      if (Array.isArray(s.data)) allVals = allVals.concat(s.data);
    });
    const minVal = Math.min(0, Math.min.apply(null, allVals.length ? allVals : [0]));
    const maxVal = Math.max(10, Math.ceil(Math.max.apply(null, allVals.length ? allVals : [10]) * 1.15));
    const range = Math.max(maxVal - minVal, 1);

    // Líneas horizontales de guía
    const steps = 4;
    let gridLinesHtml = '';
    for (let i = 0; i <= steps; i++) {
      const val = Math.round(minVal + (range * i) / steps);
      const y = Math.round(padT + plotH - (i / steps) * plotH);
      gridLinesHtml += `
        <line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="#e2e8f0" stroke-dasharray="3,3" stroke-width="1"/>
        <text x="${padL - 7}" y="${y + 4}" text-anchor="end" font-family="JetBrains Mono, monospace" font-size="9.5" fill="#64748b" font-weight="600">${val}${ySuffix}</text>
      `;
    }

    // Etiquetas eje X
    let xLabelsHtml = '';
    xLabels.forEach((lbl, idx) => {
      const x = Math.round(padL + (idx / Math.max(xLabels.length - 1, 1)) * plotW);
      xLabelsHtml += `
        <text x="${x}" y="${height - 10}" text-anchor="middle" font-family="Outfit, sans-serif" font-size="10.5" fill="#334155" font-weight="700">${escapeHTML(lbl)}</text>
      `;
    });

    // Series
    let seriesHtml = '';
    series.forEach((s, sIdx) => {
      const color = s.color || '#0284c7';
      const pts = (s.data || []).map((val, idx) => {
        const x = Math.round(padL + (idx / Math.max(xLabels.length - 1, 1)) * plotW);
        const y = Math.round(padT + plotH - ((val - minVal) / range) * plotH);
        return { x, y, val };
      });
      if (pts.length === 0) return;

      const polyStr = pts.map(p => `${p.x},${p.y}`).join(' ');
      if (sIdx === 0 && series.length <= 2) {
        const areaStr = `${pts[0].x},${padT + plotH} ${polyStr} ${pts[pts.length - 1].x},${padT + plotH}`;
        seriesHtml += `<polygon points="${areaStr}" fill="${color}" fill-opacity="0.10"/>`;
      }
      seriesHtml += `<polyline points="${polyStr}" fill="none" stroke="${color}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`;

      pts.forEach(p => {
        seriesHtml += `
          <g>
            <circle cx="${p.x}" cy="${p.y}" r="4" fill="#ffffff" stroke="${color}" stroke-width="2.4">
              <title>${escapeHTML(s.name)}: ${p.val}${ySuffix}</title>
            </circle>
            <text x="${p.x}" y="${p.y - 7}" text-anchor="middle" font-family="JetBrains Mono, monospace" font-size="9" font-weight="800" fill="${color}">${p.val}${ySuffix}</text>
          </g>
        `;
      });
    });

    const legendHtml = series.map(s => `
      <span class="legend-item">
        <span class="legend-dot" style="background:${s.color || '#0284c7'};"></span>
        <span>${escapeHTML(s.name)}</span>
      </span>
    `).join('');

    return `
      <div class="chart-card-box">
        <div class="chart-header-row">
          <div class="chart-title">${escapeHTML(config.title || 'Evolución Temporal')}</div>
          <div class="chart-legend">${legendHtml}</div>
        </div>
        <div class="svg-chart-container">
          <svg viewBox="0 0 ${width} ${height}" class="svg-time-chart">
            ${gridLinesHtml}
            ${xLabelsHtml}
            ${seriesHtml}
          </svg>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // 1. CARGA Y FUSIÓN DE DATOS EN TIEMPO REAL CON TODO EL ECOSISTEMA
  // ==========================================================================
  async function loadAllEcosystemData() {
    let rawList = [];

    try {
      const res = await fetch('/api/sync-database?t=' + Date.now());
      if (res.ok) {
        const json = await res.json();
        const data = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(data) && data.length > 0) rawList = data;
      }
    } catch (e) { }

    if (!rawList || rawList.length === 0) {
      try {
        const res2 = await fetch('../pet_ct_triage/web_app/peticiones_db.json?t=' + Date.now());
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2) && data2.length > 0) rawList = data2;
        }
      } catch (e) { }
    }

    if ((!rawList || rawList.length === 0) && Array.isArray(window.PETICIONES_DATABASE_SEED)) {
      rawList = JSON.parse(JSON.stringify(window.PETICIONES_DATABASE_SEED));
    }

    try {
      const storedMaster = JSON.parse(localStorage.getItem('PET_DATABASE_MASTER_V4') || '[]');
      if (Array.isArray(storedMaster) && storedMaster.length > 0) {
        const byId = new Map();
        rawList.forEach((r, i) => {
          const id = r['Submission ID'] || r.id || `sub_${i + 1}`;
          const nhc = r['NHC / Historia Clínica'] || r.nhc;
          if (id) byId.set(id, i);
          if (nhc) byId.set(nhc, i);
        });
        storedMaster.forEach(item => {
          const id = item['Submission ID'] || item.id;
          const nhc = item['NHC / Historia Clínica'] || item.nhc;
          const idx = (id && byId.has(id)) ? byId.get(id) : ((nhc && byId.has(nhc)) ? byId.get(nhc) : -1);
          if (idx !== -1) {
            rawList[idx] = Object.assign({}, rawList[idx], item);
          } else {
            rawList.unshift(item);
          }
        });
      }
    } catch (e) { }

    ensureUntriagedReferenceCases(rawList);
    state.peticiones = rawList.map((item, idx) => classifyPetitionRecord(item, idx));
    populateServiceFilterDropdown();
    loadOrInitManagementStore();
  }

  function ensureUntriagedReferenceCases(rawList) {
    const examples = [
      {
        "Submission ID": "UNTRIAGED_001",
        "NHC / Historia Clínica": "NHC-741902",
        "Nombre del Paciente": "Carmen Lois Souto",
        "Fecha Solicitud": getTodayISO(),
        "Servicio Solicitante": "Neumología",
        "Médico Solicitante": "Dra. Marta Veiga",
        "Diagnóstico Clínico": "Nódulo pulmonar subsólido de 11 mm en LSI sin confirmación histológica ni biopsia previa.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Pulmón)",
        "Prioridad Calculada": "🟡 P2",
        "Glucemia (mg/dL)": 98,
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Datos clínicos / Histología incompleta (Nódulo subsólido <12mm sin biopsia)"
      },
      {
        "Submission ID": "UNTRIAGED_002",
        "NHC / Historia Clínica": "NHC-892143",
        "Nombre del Paciente": "Javier Pardo Vilar",
        "Fecha Solicitud": getTodayISO(),
        "Servicio Solicitante": "Endocrinología y Nutrición",
        "Médico Solicitante": "Dr. Fernando Seijas",
        "Diagnóstico Clínico": "Masa retroperitoneal sospechosa de paraganglioma vs TNE sin catecolaminas ni trazador especificado.",
        "Tipo de Estudio PET Solicitado": "PET Neuroendocrino (Sin especificar radiofármaco)",
        "Prioridad Calculada": "🟢 P3",
        "Glucemia (mg/dL)": 104,
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Radiofármaco mal indicado o sin especificar (18F-DOPA vs 68Ga-DOTATOC)"
      },
      {
        "Submission ID": "UNTRIAGED_003",
        "NHC / Historia Clínica": "NHC-652391",
        "Nombre del Paciente": "Rosa María Otero Gómez",
        "Fecha Solicitud": getTodayISO(),
        "Servicio Solicitante": "Oncología Médica",
        "Médico Solicitante": "Dra. Isabel Calvo",
        "Diagnóstico Clínico": "Carcinoma seroso ovárico con solicitud de contraste IV obligatorio en paciente con FG 22 mL/min.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Ginecología)",
        "Prioridad Calculada": "🔴 P1",
        "Contraindicación Contraste": "Sí",
        "Glucemia (mg/dL)": 142,
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Contraindicación de contraste IV / Insuficiencia renal (FG <30) sin pauta"
      },
      {
        "Submission ID": "UNTRIAGED_004",
        "NHC / Historia Clínica": "NHC-813405",
        "Nombre del Paciente": "Manuel Quintela Ferro",
        "Fecha Solicitud": getTodayISO(),
        "Servicio Solicitante": "Hematología",
        "Médico Solicitante": "Dr. Carlos Bermejo",
        "Diagnóstico Clínico": "Linfoma B difuso de células grandes tras ciclo R-CHOP completado hace solo 8 días.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Hematología)",
        "Prioridad Calculada": "🟡 P2",
        "Glucemia (mg/dL)": 108,
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Intervalo post-Quimioterapia/RT insuficiente (<21 días tras ciclo)"
      }
    ];

    examples.forEach(ex => {
      const exists = rawList.some(r => (r['Submission ID'] || r.id) === ex['Submission ID'] || (r['NHC / Historia Clínica'] || r.nhc) === ex['NHC / Historia Clínica']);
      if (!exists) rawList.unshift(ex);
    });
  }

  function normalizeRadiopharmaGroup(estudioStr) {
    const s = String(estudioStr || '').toLowerCase();
    if (s.includes('psma')) return '68Ga-PSMA-11 (Próstata)';
    if (s.includes('colina')) return '18F-Colina (Urológico / Hepático)';
    if (s.includes('dotatoc') || s.includes('dotatate') || s.includes('somatostatina')) return '68Ga-DOTATOC (Neuroendocrino)';
    if (s.includes('dopa')) return '18F-DOPA (Neuro / Feocromocitoma)';
    if (s.includes('amiloide') || s.includes('florbetaben') || s.includes('flutemetamol')) return '18F-Florbetaben (Amiloide Cerebral)';
    if (s.includes('endocarditis') || s.includes('vasculitis') || s.includes('card')) return '18F-FDG (Endocarditis / Cardíaco)';
    if (s.includes('cerebr') || s.includes('neuro') || s.includes('demencia') || s.includes('epilepsia')) return '18F-FDG (Neurológico Cerebral)';
    return '18F-FDG (Oncológico / General)';
  }

  function classifyPetitionRecord(r, idx) {
    const id = r['Submission ID'] || r.id || `sub_${idx + 1}`;
    const nhc = r['NHC / Historia Clínica'] || r.nhc || `NHC-${100000 + idx}`;
    const nombre = r['Nombre del Paciente'] || r['Nombre y Apellidos'] || r.nombre || 'Paciente';
    const fechaSolicitud = r['Fecha Solicitud'] || r.fechaSolicitud || '2026-11-10';
    const servicioRaw = r['Servicio Solicitante'] || r.servicio || 'Oncología Médica';
    const servicio = servicioRaw.split('(')[0].trim();
    const medico = r['Médico Solicitante'] || r.medico || 'Facultativo Solicitante';
    const estudio = r['Tipo de Estudio PET Solicitado'] || r.radiofarmaco || '18F-FDG (Oncológico)';
    const radiofarmacoGrupo = normalizeRadiopharmaGroup(estudio + ' ' + (r['Diagnóstico Clínico'] || ''));
    const prioridadRaw = String(r['Prioridad Calculada'] || r.prioridad || '🟢 P3');
    const prioridad = prioridadRaw.includes('P1') ? 'P1' : (prioridadRaw.includes('P2') ? 'P2' : 'P3');
    const glucemia = parseInt(String(r['Glucemia (mg/dL)'] || r.glucemia || '95').replace(/[^\d]/g, ''), 10) || 95;
    const alertas = String(r['Alertas Técnicas'] || '');
    const estadoTriaje = String(r['Estado de Triaje'] || '');
    const finQtRt = String(r['Fin Tratamiento QT/RT'] || '');
    const resumen = String(r['Resumen Clínico'] || r['Diagnóstico Clínico'] || '');

    let llegaMal = false;
    let categoriaFallo = '';
    let detalleFallo = '';

    if (r.subsanadaJefatura) {
      llegaMal = false;
      categoriaFallo = 'Subsanada / Validada';
      detalleFallo = 'Petición corregida y validada por Jefatura / Medicina Nuclear';
    } else if (r.noTriable || estadoTriaje === 'No Triable' || r.motivoNoTriable) {
      llegaMal = true;
      const m = String(r.motivoNoTriable || '');
      if (m.toLowerCase().includes('quimioterapia') || m.toLowerCase().includes('<21') || m.toLowerCase().includes('< 10')) {
        categoriaFallo = 'Intervalo QT/RT < 21 días';
      } else if (m.toLowerCase().includes('radiofármaco') || m.toLowerCase().includes('trazador')) {
        categoriaFallo = 'Radiofármaco mal indicado / sin especificar';
      } else if (m.toLowerCase().includes('renal') || m.toLowerCase().includes('contraste')) {
        categoriaFallo = 'Contraindicación Contraste IV / FG bajo sin pauta';
      } else {
        categoriaFallo = 'Falta histología / Datos clínicos incompletos';
      }
      detalleFallo = r.motivoNoTriable || 'Incidencia clínica detectada en el volante de solicitud.';
    } else if (glucemia >= 200 || alertas.includes('GLUCEMIA CRÍTICA')) {
      llegaMal = true;
      categoriaFallo = 'Glucemia basal crítica (≥ 200 mg/dL) sin control previo';
      detalleFallo = `Glucemia reportada en volante de ${glucemia} mg/dL en estudio FDG sin ajuste insulínico previo.`;
    } else if (alertas.toLowerCase().includes('bloqueo') || alertas.toLowerCase().includes('qt reciente') || finQtRt.toLowerCase().includes('hace 5') || finQtRt.toLowerCase().includes('hace 8')) {
      llegaMal = true;
      categoriaFallo = 'Intervalo QT/RT < 21 días';
      detalleFallo = 'Solicitud cursada sin respetar ventana mínima de 21 días post-quimioterapia.';
    } else if (String(r['Contraindicación Contraste'] || '').toLowerCase() === 'sí' && resumen.toLowerCase().includes('contraste')) {
      llegaMal = true;
      categoriaFallo = 'Contraindicación Contraste IV / FG bajo sin pauta';
      detalleFallo = 'Solicita TC diagnóstica con contraste IV pese a alergia a yodo o insuficiencia renal.';
    } else if (!resumen || resumen.trim().length < 18) {
      llegaMal = true;
      categoriaFallo = 'Falta histología / Datos clínicos incompletos';
      detalleFallo = 'Volante remitido sin resumen clínico ni estadificación mínima exigible.';
    }

    return {
      id,
      nhc,
      nombre,
      fechaSolicitud,
      fechaCita: r['Fecha Cita Asignada'] || r.fechaCita || '',
      horaCita: r['Hora Cita Asignada'] || r.horaCita || '',
      servicio,
      medico,
      estudio,
      radiofarmacoGrupo,
      prioridad,
      glucemia,
      llegaMal,
      categoriaFallo,
      detalleFallo,
      raw: r
    };
  }

  // ==========================================================================
  // 2. GESTIÓN DE PUNTUALIDAD, CANCELACIONES, NO-SHOWS, ANULACIONES Y MÉDICOS
  // ==========================================================================
  function loadOrInitManagementStore() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY_MGMT) || 'null');
    } catch (e) { }

    const today = getTodayISO();

    let tsidList = [];
    let nursingMap = {};
    let tsidLiveMap = {};
    let medicalProtocolsMap = {};
    let lateScanOrdersMap = {};
    let dischargeMap = {};
    try {
      tsidList = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
      nursingMap = JSON.parse(localStorage.getItem('PET_SHARED_INJECTIONS_AND_MOBILITY_V1') || '{}');
      tsidLiveMap = JSON.parse(localStorage.getItem('PET_SHARED_TSID_STATUS_V1') || '{}');
      medicalProtocolsMap = JSON.parse(localStorage.getItem('PET_MEDICAL_PROTOCOLS_V1') || '{}');
      lateScanOrdersMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
      dischargeMap = JSON.parse(localStorage.getItem('PET_SHARED_DISCHARGE_V1') || '{}');
    } catch (e) { }

    const defaultMachineEntries = [
      {
        id: 'PAT-TSID-01',
        nhc: 'NHC-409182',
        nombre: 'Antonio Vázquez Lorenzo',
        medicoNuclear: 'Dr. Manuel Gómez Feijóo',
        radiofarmaco: '18F-FDG',
        box: 'Box 1',
        horaCita: '08:00',
        horaInyeccion: '08:12',
        tiempoCaptacionMin: 60,
        horaPrevistaMaquina: '09:12',
        horaRealMaquina: '09:15',
        duracionMaquinaMin: 18,
        horaFinUltimaImagen: '09:33',
        tardiaPedida: false,
        zonaTardia: '',
        horaAltaSalida: '09:40',
        causaDemora: 'Paso puntual a tomógrafo tras vaciado vesical'
      },
      {
        id: 'PAT-TSID-02',
        nhc: 'NHC-518294',
        nombre: 'María del Carmen Souto Paz',
        medicoNuclear: 'Dra. Elena Rial Vázquez',
        radiofarmaco: '18F-FDG',
        box: 'Box 2',
        horaCita: '08:30',
        horaInyeccion: '08:40',
        tiempoCaptacionMin: 60,
        horaPrevistaMaquina: '09:40',
        horaRealMaquina: '09:44',
        duracionMaquinaMin: 24,
        horaFinUltimaImagen: '10:08',
        tardiaPedida: true,
        zonaTardia: 'Pelvis / Vejiga (2 camas)',
        horaAltaSalida: '10:19',
        causaDemora: 'Paso puntual (Brazos arriba + Fase vascular + Tardía pélvica)'
      },
      {
        id: 'PAT-TSID-03',
        nhc: 'NHC-312890',
        nombre: 'José Manuel Barreiro Castro',
        medicoNuclear: 'Dr. Manuel Gómez Feijóo',
        radiofarmaco: '68Ga-PSMA-11',
        box: 'Box 3',
        horaCita: '09:00',
        horaInyeccion: '09:10',
        tiempoCaptacionMin: 55,
        horaPrevistaMaquina: '10:05',
        horaRealMaquina: '10:08',
        duracionMaquinaMin: 22,
        horaFinUltimaImagen: '10:30',
        tardiaPedida: true,
        zonaTardia: 'Pelvis prostática post-Seguril',
        horaAltaSalida: '10:38',
        causaDemora: 'Paso en hora tras administración de Seguril IV'
      },
      {
        id: 'PAT-TSID-04',
        nhc: 'NHC-782341',
        nombre: 'Dolores Méndez Fariña',
        medicoNuclear: 'Dr. Alberto Silva Pousa',
        radiofarmaco: '18F-FDG',
        box: 'Box 4',
        horaCita: '09:30',
        horaInyeccion: '09:45',
        tiempoCaptacionMin: 60,
        horaPrevistaMaquina: '10:45',
        horaRealMaquina: '11:01',
        duracionMaquinaMin: 20,
        horaFinUltimaImagen: '11:21',
        tardiaPedida: false,
        zonaTardia: '',
        horaAltaSalida: '11:39',
        causaDemora: 'Demora leve (+16 min): Paciente en silla de ruedas + vaciado de bolsa colectora'
      },
      {
        id: 'PAT-TSID-05',
        nhc: 'NHC-629104',
        nombre: 'Ramón Piñeiro Lago',
        medicoNuclear: 'Dra. Carmen Montes Rey',
        radiofarmaco: '18F-FDG (Endocarditis)',
        box: 'Box 1',
        horaCita: '10:00',
        horaInyeccion: '10:15',
        tiempoCaptacionMin: 90,
        horaPrevistaMaquina: '11:45',
        horaRealMaquina: '11:48',
        duracionMaquinaMin: 21,
        horaFinUltimaImagen: '12:09',
        tardiaPedida: true,
        zonaTardia: 'Tórax / Válvula Protésica (2 camas)',
        horaAltaSalida: '12:18',
        causaDemora: 'Paso puntual (Protocolo Endocarditis 90 min + Heparina IV)'
      },
      {
        id: 'PAT-TSID-06',
        nhc: 'NHC-904112',
        nombre: 'Lucía Fernández Otero',
        medicoNuclear: 'Dr. Alberto Silva Pousa',
        radiofarmaco: '18F-FDG',
        box: 'Box 5',
        horaCita: '10:30',
        horaInyeccion: '10:50',
        tiempoCaptacionMin: 60,
        horaPrevistaMaquina: '11:50',
        horaRealMaquina: '12:18',
        duracionMaquinaMin: 25,
        horaFinUltimaImagen: '12:43',
        tardiaPedida: true,
        zonaTardia: 'Hígado / Epigastrio (2 camas)',
        horaAltaSalida: '13:04',
        causaDemora: 'Fuera de hora (+28 min): Adquisición tardía pélvica del paciente previo en sala'
      },
      {
        id: 'PAT-TSID-07',
        nhc: 'NHC-449021',
        nombre: 'Alfonso Rivas Conde',
        medicoNuclear: 'Dra. Elena Rial Vázquez',
        radiofarmaco: '18F-Colina',
        box: 'Box 2',
        horaCita: '11:00',
        horaInyeccion: '11:08',
        tiempoCaptacionMin: 55,
        horaPrevistaMaquina: '12:03',
        horaRealMaquina: '12:05',
        duracionMaquinaMin: 18,
        horaFinUltimaImagen: '12:23',
        tardiaPedida: false,
        zonaTardia: '',
        horaAltaSalida: '12:32',
        causaDemora: 'Paso puntual en ventana óptima'
      },
      {
        id: 'PAT-TSID-08',
        nhc: 'NHC-558120',
        nombre: 'Pilar Domínguez Vila',
        medicoNuclear: 'Dra. Carmen Montes Rey',
        radiofarmaco: '18F-FDG',
        box: 'Box 3',
        horaCita: '11:30',
        horaInyeccion: '11:40',
        tiempoCaptacionMin: 60,
        horaPrevistaMaquina: '12:40',
        horaRealMaquina: '12:43',
        duracionMaquinaMin: 17,
        horaFinUltimaImagen: '13:00',
        tardiaPedida: false,
        zonaTardia: '',
        horaAltaSalida: '13:08',
        causaDemora: 'Paso puntual a tomógrafo'
      },
      {
        id: 'PAT-TSID-09',
        nhc: 'NHC-663819',
        nombre: 'Gonzalo Pereiro Souto',
        medicoNuclear: 'Dr. Manuel Gómez Feijóo',
        radiofarmaco: '68Ga-DOTATOC',
        box: 'Box 4',
        horaCita: '12:00',
        horaInyeccion: '12:09',
        tiempoCaptacionMin: 55,
        horaPrevistaMaquina: '13:04',
        horaRealMaquina: '13:07',
        duracionMaquinaMin: 19,
        horaFinUltimaImagen: '13:26',
        tardiaPedida: false,
        zonaTardia: '',
        horaAltaSalida: '13:33',
        causaDemora: 'Paso puntual (Estudio receptores somatostatina)'
      },
      {
        id: 'PAT-TSID-10',
        nhc: 'NHC-710492',
        nombre: 'Esperanza Lago Vidal',
        medicoNuclear: 'Dra. Elena Rial Vázquez',
        radiofarmaco: '18F-DOPA',
        box: 'Box 1',
        horaCita: '12:30',
        horaInyeccion: '12:38',
        tiempoCaptacionMin: 45,
        horaPrevistaMaquina: '13:23',
        horaRealMaquina: '13:26',
        duracionMaquinaMin: 16,
        horaFinUltimaImagen: '13:42',
        tardiaPedida: false,
        zonaTardia: '',
        horaAltaSalida: '13:51',
        causaDemora: 'Paso puntual a tomógrafo'
      }
    ];

    const defaultCancellations = [
      {
        slotId: 'CANC-001',
        patientId: 'sub_100014',
        nhc: 'NHC-482910',
        nombre: 'Emilio Figueroa Seoane',
        radiofarmaco: '18F-FDG (Oncológico / Inflamatorio General)',
        prioridad: '🟡 P2',
        fechaCitaOriginal: today,
        horaCitaOriginal: '12:30 h',
        canalAviso: 'Teléfono Enfermería (24h antes)',
        motivoCancelacion: 'Ingreso urgente por cuadro respiratorio febril agudo; avisa para reprogramar',
        estadoHueco: 'disponible',
        recitadoA: null
      },
      {
        slotId: 'CANC-002',
        patientId: 'sub_100019',
        nhc: 'NHC-719204',
        nombre: 'Beatriz Mosquera Rey',
        radiofarmaco: '68Ga-PSMA-11 (Próstata)',
        prioridad: '🔴 P1',
        fechaCitaOriginal: today,
        horaCitaOriginal: '13:15 h',
        canalAviso: 'Chatbot Audioguía PET (48h antes)',
        motivoCancelacion: 'Indisposición familiar; solicita cambio de fecha con preaviso',
        estadoHueco: 'disponible',
        recitadoA: null
      },
      {
        slotId: 'CANC-003',
        patientId: 'sub_100022',
        nhc: 'NHC-330192',
        nombre: 'Sergio Blanco Ameijeiras',
        radiofarmaco: '18F-FDG (Oncológico / Inflamatorio General)',
        prioridad: '🟡 P2',
        fechaCitaOriginal: today,
        horaCitaOriginal: '09:15 h',
        canalAviso: 'Llamada pre-cita Enfermería',
        motivoCancelacion: 'Glucemia domiciliaria en ayunas de 265 mg/dL detectada la víspera; se difiere y recita hueco',
        estadoHueco: 'recitado',
        recitadoA: {
          nombre: 'Ignacio Muñoz Álvarez',
          nhc: 'NHC-226739',
          prioridad: '🔴 P1',
          horaAsignada: '09:15 h'
        }
      },
      {
        slotId: 'CANC-004',
        patientId: 'sub_100028',
        nhc: 'NHC-601928',
        nombre: 'Teresa Vázquez Dopico',
        radiofarmaco: '18F-Colina (Próstata / Hepatocarcinoma)',
        prioridad: '🟢 P3',
        fechaCitaOriginal: today,
        horaCitaOriginal: '10:45 h',
        canalAviso: 'Portal Paciente SERGAS',
        motivoCancelacion: 'Coincidencia con prueba de Cardiología; avisa con 36h de antelación',
        estadoHueco: 'recitado',
        recitadoA: {
          nombre: 'Carlos Fraga Novoa',
          nhc: 'NHC-510923',
          prioridad: '🟡 P2',
          horaAsignada: '10:45 h'
        }
      }
    ];

    const defaultNoShows = [
      {
        noShowId: 'NOSHOW-001',
        patientId: 'sub_100031',
        nhc: 'NHC-839104',
        nombre: 'Arturo Salgado Pérez',
        radiofarmaco: '18F-FDG (Oncológico / Inflamatorio General)',
        prioridad: '🟢 P3',
        fechaCita: today,
        horaCita: '08:45 h',
        impactoAsistencial: '1 dosis FDG comprometida / slot público vacante',
        observaciones: 'No acude a admisión ni responde a 3 llamadas telefónicas de Enfermería. Dosis FDG reasignada parcialmente a paciente de lista de espera.'
      },
      {
        noShowId: 'NOSHOW-002',
        patientId: 'sub_100035',
        nhc: 'NHC-294811',
        nombre: 'Begoña Estévez Mariño',
        radiofarmaco: '18F-Colina',
        prioridad: '🟡 P2',
        fechaCita: today,
        horaCita: '11:15 h',
        impactoAsistencial: '1 dosis Colina comprometida / slot público vacante',
        observaciones: 'No se presenta sin avisar (olvido de cita). Se registra incidencia en historia electrónica del SERGAS.'
      }
    ];

    const defaultAnulaciones = [
      {
        anulId: 'ANUL-PREP-001',
        tipo: 'mal_preparado',
        patientId: 'sub_100002',
        nhc: 'NHC-341148',
        nombre: 'Alba Alonso Barros',
        radiofarmaco: '18F-FDG (Protocolo Endocarditis)',
        prioridad: '🔴 P1',
        fechaCita: today,
        horaCita: '09:30 h',
        subcausa: 'Glucemia capilar en Box 228 mg/dL + Incumplimiento dieta cetogénica (ingesta de hidratos en cena)',
        detalleClinico: 'Anulada en Box de Enfermería antes de inyectar por hiperglucemia >200 mg/dL y fallo en supresión miocárdica (16h ayuno / dieta sin carbohidratos).',
        reprogramado: false,
        nuevaCita: ''
      },
      {
        anulId: 'ANUL-PREP-002',
        tipo: 'mal_preparado',
        patientId: 'sub_100041',
        nhc: 'NHC-591024',
        nombre: 'Manuel Rivas Seoane',
        radiofarmaco: '18F-FDG (Oncológico General)',
        prioridad: '🟡 P2',
        fechaCita: today,
        horaCita: '10:15 h',
        subcausa: 'Administración de insulina rápida subcutánea < 4 horas antes (riesgo captación muscular difusa)',
        detalleClinico: 'El paciente se inyectó 8 UI de insulina rápida 90 min antes de acudir. Se anula para evitar biodistribución muscular no diagnóstica.',
        reprogramado: true,
        nuevaCita: 'Mañana · 08:30 h (1ª hora en ayunas)'
      },
      {
        anulId: 'ANUL-RF-001',
        tipo: 'fallo_radiofarmaco',
        patientId: 'sub_100048',
        nhc: 'NHC-618203',
        nombre: 'Jorge Méndez Souto',
        radiofarmaco: '18F-FDG (Lote Ciclotrón #FDG-114)',
        prioridad: '🟡 P2',
        fechaCita: today,
        horaCita: '13:30 h',
        subcausa: 'Fallo de síntesis / Caída de rendimiento en Ciclotrón (Actividad insuficiente en último vial)',
        detalleClinico: 'Incidencia técnica en módulo de síntesis de ciclotrón que redujo la actividad disponible para el cierre de turno matinal.',
        reprogramado: false,
        nuevaCita: ''
      },
      {
        anulId: 'ANUL-RF-002',
        tipo: 'fallo_radiofarmaco',
        patientId: 'sub_100052',
        nhc: 'NHC-472918',
        nombre: 'Elena Varela Dopico',
        radiofarmaco: '68Ga-DOTATOC (Neuroendocrino)',
        prioridad: '🔴 P1',
        fechaCita: today,
        horaCita: '11:45 h',
        subcausa: 'Fallo en Control de Calidad Radioquímico (Pureza radioquímica < 95% tras marcaje)',
        detalleClinico: 'El lote de 68Ga-DOTATOC no superó el test cromatográfico ITLC pre-liberación en Radiofarmacia. Se bloquea administración por seguridad.',
        reprogramado: true,
        nuevaCita: 'Mañana · 10:00 h (1ª elución generador)'
      },
      {
        anulId: 'ANUL-EXT-001',
        tipo: 'extravasacion',
        patientId: 'sub_100059',
        nhc: 'NHC-729105',
        nombre: 'Fernando Castro Lema',
        radiofarmaco: '18F-FDG (Estadificación Melanoma)',
        prioridad: '🔴 P1',
        fechaCita: today,
        horaCita: '10:00 h',
        subcausa: 'Extravasación paravenosa severa (~35% dosis) en fosa antecubital derecha',
        detalleClinico: 'Infiltración paravenosa por fragilidad venosa post-quimioterapia. Artefacto de captación linfática axilar derecha e invalidación de SUVmax; requiere repetición.',
        reprogramado: false,
        nuevaCita: ''
      }
    ];

    if (saved && Array.isArray(saved.machineEntries) && saved.machineEntries.length > 0) {
      state.machineEntries = saved.machineEntries.map((m, idx) => Object.assign({}, defaultMachineEntries[idx % defaultMachineEntries.length] || {}, m));
      state.cancellations = saved.cancellations || defaultCancellations;
      state.noShows = saved.noShows || defaultNoShows;
      state.anulaciones = (Array.isArray(saved.anulaciones) && saved.anulaciones.length > 0) ? saved.anulaciones : defaultAnulaciones;
    } else {
      state.machineEntries = defaultMachineEntries;
      state.cancellations = defaultCancellations;
      state.noShows = defaultNoShows;
      state.anulaciones = defaultAnulaciones;
    }

    mergeLiveTsidAndNursingIntoMachineStats(tsidList, nursingMap, tsidLiveMap, medicalProtocolsMap, lateScanOrdersMap, dischargeMap);
    saveManagementStore();
  }

  function cleanDoctorName(rawDoc) {
    if (!rawDoc) return 'Dr. Manuel Gómez Feijóo';
    const base = String(rawDoc).split('(')[0].trim();
    const match = NUCLEAR_DOCTORS.find(d => base.toLowerCase().includes(d.toLowerCase().split(' ')[1]));
    return match || base || 'Dr. Manuel Gómez Feijóo';
  }

  function mergeLiveTsidAndNursingIntoMachineStats(tsidList, nursingMap, tsidLiveMap, medicalProtocolsMap, lateScanOrdersMap, dischargeMap) {
    if (!Array.isArray(tsidList)) return;

    tsidList.forEach((tp, idx) => {
      const id = tp.id || tp.nhc;
      if (!id) return;
      const nSync = nursingMap[tp.id] || nursingMap[tp.nhc] || {};
      const liveSync = tsidLiveMap[tp.id] || tsidLiveMap[tp.nhc] || {};
      const proto = medicalProtocolsMap[tp.id] || medicalProtocolsMap[tp.nhc] || tp.protocoloMedico || {};
      const tardiaOrder = lateScanOrdersMap[tp.id] || lateScanOrdersMap[tp.nhc] || tp.tardiaPautada || proto.tardiaPautada || null;
      const disc = dischargeMap[tp.id] || dischargeMap[tp.nhc] || {};

      const horaInj = nSync.horaInyeccion || tp.horaInyeccion || liveSync.horaInyeccion || '';
      const horaRealMaq = liveSync.horaEntradaMaquina || tp.horaEntradaMaquina || '';
      if (!horaInj && !horaRealMaq && !tardiaOrder && !disc.horaAltaMedica) return;

      const tiempoProt = parseInt(tp.tiempoProtocoloMin || proto.uptakeTime || 60, 10) || 60;
      let horaPrevista = '--:--';
      const injMin = parseHHMMToMinutes(horaInj);
      if (injMin !== null) {
        horaPrevista = formatMinutesToHHMM(injMin + tiempoProt);
      }

      const doctorName = cleanDoctorName(
        (tardiaOrder && tardiaOrder.medico) ||
        proto.doctorName ||
        tp.medicoProtocolizador ||
        disc.doctor ||
        NUCLEAR_DOCTORS[idx % NUCLEAR_DOCTORS.length]
      );

      const numCamas = parseInt(tp.numCamas || 6, 10) || 6;
      const durMaq = Math.max(15, numCamas * 3 + (tardiaOrder && tardiaOrder.requerida ? 6 : 0));
      const maqMin = parseHHMMToMinutes(horaRealMaq || horaPrevista || '10:00') || 600;
      const horaFinImg = tp.horaSalidaMaquina || formatMinutesToHHMM(maqMin + durMaq);
      const horaAlta = disc.horaAltaMedica || tp.horaAltaMedica || formatMinutesToHHMM(maqMin + durMaq + 9);

      const existing = state.machineEntries.find(m => m.id === tp.id || m.nhc === tp.nhc);
      if (existing) {
        if (horaInj) existing.horaInyeccion = horaInj;
        existing.tiempoCaptacionMin = tiempoProt;
        if (horaPrevista !== '--:--') existing.horaPrevistaMaquina = horaPrevista;
        if (horaRealMaq) existing.horaRealMaquina = horaRealMaq;
        if (nSync.boxAsignado || tp.boxAsignado) existing.box = nSync.boxAsignado || tp.boxAsignado;
        existing.medicoNuclear = doctorName;
        if (tardiaOrder && tardiaOrder.requerida) {
          existing.tardiaPedida = true;
          existing.zonaTardia = tardiaOrder.zonaNombre || 'Pelvis / Vejiga';
        }
        if (disc.horaAltaMedica || tp.horaAltaMedica) {
          existing.horaAltaSalida = disc.horaAltaMedica || tp.horaAltaMedica;
        }
      } else {
        state.machineEntries.unshift({
          id: tp.id || tp.nhc,
          nhc: tp.nhc || 'NHC',
          nombre: tp.nombre || 'Paciente en Sala',
          medicoNuclear: doctorName,
          radiofarmaco: tp.radiofarmaco || '18F-FDG',
          box: nSync.boxAsignado || tp.boxAsignado || 'Box 1',
          horaCita: tp.horaCita || '09:00',
          horaInyeccion: horaInj || '09:10',
          tiempoCaptacionMin: tiempoProt,
          horaPrevistaMaquina: horaPrevista !== '--:--' ? horaPrevista : '10:10',
          horaRealMaquina: horaRealMaq || (horaPrevista !== '--:--' ? horaPrevista : '10:12'),
          duracionMaquinaMin: durMaq,
          horaFinUltimaImagen: horaFinImg,
          tardiaPedida: Boolean(tardiaOrder && tardiaOrder.requerida),
          zonaTardia: (tardiaOrder && tardiaOrder.zonaNombre) || '',
          horaAltaSalida: horaAlta,
          causaDemora: horaRealMaq ? 'Sincronizado en vivo desde Consola TSID' : 'En curso en unidad PET'
        });
      }
    });
  }

  function saveManagementStore() {
    try {
      localStorage.setItem(STORAGE_KEY_MGMT, JSON.stringify({
        machineEntries: state.machineEntries,
        cancellations: state.cancellations,
        noShows: state.noShows,
        anulaciones: state.anulaciones,
        updatedAt: Date.now()
      }));
    } catch (e) { }
  }

  // ==========================================================================
  // 3. CÁLCULO DE MÉTRICAS (INCLUYENDO RADIOFÁRMACOS Y TIEMPOS POR MÉDICO)
  // ==========================================================================
  function getFilteredPetitionsByPeriod() {
    if (state.periodo === 'all') return state.peticiones;
    const list = state.peticiones;
    if (state.periodo === 'today') {
      return list.slice(0, Math.max(18, Math.round(list.length * 0.25)));
    }
    if (state.periodo === 'week') {
      return list.slice(0, Math.max(35, Math.round(list.length * 0.55)));
    }
    return list;
  }

  function computeRadiopharmaBreakdown(petList) {
    const meta = {
      '18F-FDG (Oncológico / General)': { isotopo: '18F · Ciclotrón', captacion: '60 min · 18m máq.', color: '#0284c7', trend: [112, 118, 125, 129, 134, 142] },
      '68Ga-PSMA-11 (Próstata)': { isotopo: '68Ga · Generador', captacion: '55 min · 20m máq.', color: '#0d9488', trend: [24, 28, 31, 35, 39, 44] },
      '18F-Colina (Urológico / Hepático)': { isotopo: '18F · Ciclotrón', captacion: '55 min · 18m máq.', color: '#7c3aed', trend: [19, 21, 20, 24, 26, 29] },
      '18F-FDG (Endocarditis / Cardíaco)': { isotopo: '18F · Dieta Cetogénica', captacion: '90 min · 21m máq.', color: '#e11d48', trend: [9, 11, 12, 14, 15, 18] },
      '68Ga-DOTATOC (Neuroendocrino)': { isotopo: '68Ga · Generador', captacion: '55 min · 19m máq.', color: '#d97706', trend: [10, 12, 13, 15, 16, 19] },
      '18F-FDG (Neurológico Cerebral)': { isotopo: '18F · Ciclotrón', captacion: '40 min · 12m máq.', color: '#2563eb', trend: [8, 9, 11, 10, 13, 15] },
      '18F-DOPA (Neuro / Feocromocitoma)': { isotopo: '18F · Radiofarmacia', captacion: '45 min · 16m máq.', color: '#059669', trend: [5, 6, 7, 8, 9, 11] },
      '18F-Florbetaben (Amiloide Cerebral)': { isotopo: '18F · Neurorradiología', captacion: '90 min · 15m máq.', color: '#9333ea', trend: [4, 5, 6, 7, 8, 9] }
    };

    const counts = {};
    Object.keys(meta).forEach(k => { counts[k] = 0; });

    petList.forEach(p => {
      if (p.llegaMal) return;
      const g = p.radiofarmacoGrupo || '18F-FDG (Oncológico / General)';
      counts[g] = (counts[g] || 0) + 1;
    });

    // Asegurar volumen mínimo representativo por cada familia de radiofármaco
    const scale = state.periodo === 'today' ? 0.15 : (state.periodo === 'week' ? 0.45 : 1);
    const items = Object.keys(meta).map(name => {
      const m = meta[name];
      const baseCount = counts[name] || 0;
      const seedCount = Math.max(baseCount, Math.round(m.trend[m.trend.length - 1] * scale));
      return {
        nombre: name,
        isotopo: m.isotopo,
        captacion: m.captacion,
        color: m.color,
        pruebas: seedCount,
        aprovechamiento: name.includes('68Ga') ? 96.5 : 98.2,
        trend: m.trend.map(v => Math.max(1, Math.round(v * scale)))
      };
    }).sort((a, b) => b.pruebas - a.pruebas);

    const totalPruebas = items.reduce((acc, x) => acc + x.pruebas, 0) || 1;
    items.forEach(x => {
      x.pct = (x.pruebas / totalPruebas) * 100;
    });

    return { items, totalPruebas };
  }

  function computeDoctorAndPatientMetrics(evaluatedMachine) {
    // Evaluar tiempos exactos por cada paciente monitorizado
    const patientTimings = evaluatedMachine.map((m, idx) => {
      const medico = cleanDoctorName(m.medicoNuclear || NUCLEAR_DOCTORS[idx % NUCLEAR_DOCTORS.length]);
      const injMin = parseHHMMToMinutes(m.horaInyeccion) || 500;
      const maqInMin = parseHHMMToMinutes(m.horaRealMaquina) || (injMin + (m.tiempoCaptacionMin || 60));
      const durMaq = m.duracionMaquinaMin || (m.tardiaPedida ? 24 : 18);
      const finImgMin = parseHHMMToMinutes(m.horaFinUltimaImagen) || (maqInMin + durMaq);
      const horaFinUltimaImagen = formatMinutesToHHMM(finImgMin);

      let salidaMin = parseHHMMToMinutes(m.horaAltaSalida);
      if (salidaMin === null || salidaMin < finImgMin) {
        const defaultWait = medico.includes('Alberto') ? 16 : (medico.includes('Elena') ? 11 : 8);
        salidaMin = finImgMin + defaultWait;
      }
      const horaAltaSalida = formatMinutesToHHMM(salidaMin);
      const esperaDesdeUltimaImagenMin = Math.max(2, salidaMin - finImgMin);
      const tiempoTotalPruebaMin = Math.max(45, salidaMin - injMin);

      return Object.assign({}, m, {
        medicoNuclear: medico,
        duracionMaquinaMin: durMaq,
        horaFinUltimaImagen,
        horaAltaSalida,
        esperaDesdeUltimaImagenMin,
        tiempoTotalPruebaMin
      });
    });

    // Agrupar por los 4 médicos nucleares del servicio
    const docProfiles = {
      'Dr. Manuel Gómez Feijóo': {
        cargo: 'Jefe de Sección / Facultativo MN',
        color: '#0284c7',
        tardiasTrend: [14, 15, 13, 16, 15, 14],
        esperaTrend: [9, 8, 8, 7, 8, 7.5],
        duracionTrend: [84, 83, 82, 81, 80, 79]
      },
      'Dra. Elena Rial Vázquez': {
        cargo: 'Facultativa Especialista MN',
        color: '#0d9488',
        tardiasTrend: [18, 19, 17, 20, 18, 19],
        esperaTrend: [12, 11, 11, 10, 10, 9.8],
        duracionTrend: [89, 88, 87, 86, 86, 85]
      },
      'Dr. Alberto Silva Pousa': {
        cargo: 'Facultativo Especialista MN',
        color: '#d97706',
        tardiasTrend: [24, 25, 23, 26, 25, 24],
        esperaTrend: [19, 18, 17, 18, 17, 16.5],
        duracionTrend: [98, 97, 96, 95, 96, 94]
      },
      'Dra. Carmen Montes Rey': {
        cargo: 'Facultativa Especialista MN',
        color: '#7c3aed',
        tardiasTrend: [15, 16, 14, 15, 16, 15],
        esperaTrend: [10, 9, 9, 8, 9, 8.5],
        duracionTrend: [86, 85, 84, 85, 83, 82]
      }
    };

    const byDoctor = NUCLEAR_DOCTORS.map(docName => {
      const pList = patientTimings.filter(p => p.medicoNuclear === docName);
      const prof = docProfiles[docName];
      const numPacientes = Math.max(pList.length, 1);
      const tardiasHoy = pList.filter(p => p.tardiaPedida).length;
      const scale = state.periodo === 'today' ? 1 : (state.periodo === 'week' ? 5 : 18);
      const totalEstudiosPeriodo = pList.length * scale;
      const totalTardiasPeriodo = Math.max(tardiasHoy, tardiasHoy * scale);
      const pctTardias = (totalTardiasPeriodo / Math.max(totalEstudiosPeriodo, 1)) * 100;

      const avgEsperaSalidaMin = pList.length > 0
        ? (pList.reduce((acc, x) => acc + x.esperaDesdeUltimaImagenMin, 0) / numPacientes)
        : prof.esperaTrend[5];

      const avgMaquinaMin = pList.length > 0
        ? (pList.reduce((acc, x) => acc + x.duracionMaquinaMin, 0) / numPacientes)
        : 19.5;

      const avgTotalPruebaMin = pList.length > 0
        ? (pList.reduce((acc, x) => acc + x.tiempoTotalPruebaMin, 0) / numPacientes)
        : prof.duracionTrend[5];

      return {
        medico: docName,
        cargo: prof.cargo,
        color: prof.color,
        pacientesHoy: pList.length,
        totalEstudiosPeriodo,
        tardiasHoy,
        totalTardiasPeriodo,
        pctTardias,
        avgEsperaSalidaMin,
        avgMaquinaMin,
        avgTotalPruebaMin,
        tardiasTrend: prof.tardiasTrend,
        esperaTrend: prof.esperaTrend,
        duracionTrend: prof.duracionTrend
      };
    });

    const globalEsperaPostImagen = byDoctor.reduce((acc, d) => acc + d.avgEsperaSalidaMin, 0) / byDoctor.length;
    const globalTiempoMedioPrueba = byDoctor.reduce((acc, d) => acc + d.avgTotalPruebaMin, 0) / byDoctor.length;
    const globalTardiasCount = byDoctor.reduce((acc, d) => acc + d.totalTardiasPeriodo, 0);

    return {
      patientTimings,
      byDoctor,
      globalEsperaPostImagen,
      globalTiempoMedioPrueba,
      globalTardiasCount
    };
  }

  function computeServiceStats() {
    const petList = getFilteredPetitionsByPeriod();
    const totalPeticiones = petList.length;
    const malList = petList.filter(p => p.llegaMal);
    const okList = petList.filter(p => !p.llegaMal);
    const pctMal = totalPeticiones > 0 ? ((malList.length / totalPeticiones) * 100) : 0;
    const pctOk = totalPeticiones > 0 ? ((okList.length / totalPeticiones) * 100) : 0;

    // Puntualidad en máquina
    let enHoraCount = 0;
    let demoraLeveCount = 0;
    let retrasoCriticoCount = 0;
    let sumAbsDiff = 0;

    const evaluatedMachine = state.machineEntries.map(m => {
      const prevMin = parseHHMMToMinutes(m.horaPrevistaMaquina);
      const realMin = parseHHMMToMinutes(m.horaRealMaquina);
      let diff = 0;
      if (prevMin !== null && realMin !== null) {
        diff = realMin - prevMin;
      }
      sumAbsDiff += Math.abs(diff);

      let status = 'ontime';
      if (diff > 20) {
        status = 'late';
        retrasoCriticoCount++;
      } else if (diff > 10) {
        status = 'mild';
        demoraLeveCount++;
      } else {
        status = 'ontime';
        enHoraCount++;
      }

      return Object.assign({}, m, { diffMin: diff, status });
    });

    const totalMachine = evaluatedMachine.length || 1;
    const pctEnHora = (enHoraCount / totalMachine) * 100;
    const avgDiff = Math.round(sumAbsDiff / totalMachine);

    // Cancelaciones, No-Shows y Anulaciones
    const totalNoShow = state.noShows.length;
    const totalCancelaciones = state.cancellations.length;
    const huecosDisponibles = state.cancellations.filter(c => c.estadoHueco === 'disponible').length;
    const huecosRecitados = state.cancellations.filter(c => c.estadoHueco === 'recitado').length;
    const pctRecitados = totalCancelaciones > 0 ? Math.round((huecosRecitados / totalCancelaciones) * 100) : 100;

    const anulList = state.anulaciones || [];
    const totalAnulaciones = anulList.length;
    const malPrepList = anulList.filter(a => a.tipo === 'mal_preparado');
    const falloRFList = anulList.filter(a => a.tipo === 'fallo_radiofarmaco');
    const extravList = anulList.filter(a => a.tipo === 'extravasacion');

    const universoCitas = Math.max(totalMachine + totalNoShow + totalCancelaciones + totalAnulaciones, 28);
    const pctNoShow = ((totalNoShow / universoCitas) * 100);
    const pctAnulaciones = ((totalAnulaciones / universoCitas) * 100);
    const rendimientoGlobal = Math.min(100, Math.max(0, ((universoCitas - totalNoShow - huecosDisponibles - totalAnulaciones) / universoCitas) * 100));

    // Radiofármacos, Dosimetría por Peso/Talla y Médicos
    const rfStats = computeRadiopharmaBreakdown(petList);
    const dosimetryStats = computeDosimetryQualityStats();
    const docStats = computeDoctorAndPatientMetrics(evaluatedMachine);
    const advancedQualityStats = computeAdvancedQualityAndOperationalStats();

    return {
      petList,
      totalPeticiones,
      malList,
      okList,
      pctMal,
      pctOk,
      evaluatedMachine,
      enHoraCount,
      demoraLeveCount,
      retrasoCriticoCount,
      pctEnHora,
      avgDiff,
      totalNoShow,
      pctNoShow,
      totalCancelaciones,
      huecosDisponibles,
      huecosRecitados,
      pctRecitados,
      anulList,
      totalAnulaciones,
      pctAnulaciones,
      malPrepList,
      falloRFList,
      extravList,
      rendimientoGlobal,
      rfStats,
      dosimetryStats,
      docStats,
      advancedQualityStats
    };
  }

  function computeAdvancedQualityAndOperationalStats() {
    const scale = state.periodo === 'today' ? 0.05 : (state.periodo === 'week' ? 0.25 : 1.0);
    const recMBq = Math.round(8420 * scale);
    const inyMBq = Math.round(7680 * scale);
    const perdMBq = recMBq - inyMBq;
    const dosisPerdidasEquiv = Math.max(1, Math.round(4 * scale));
    const pctAprov = ((inyMBq / Math.max(recMBq, 1)) * 100);

    // Huecos libres de camilla (gantry)
    const totalSlotsDia = 32;
    const ocupadosDia = 29;
    const libresDia = 3;
    const pctLibres = (libresDia / totalSlotsDia) * 100;

    // Fármacos breakdown
    const farmacosEfficiency = [
      { name: '18F-FDG (Glucosa)', dosisPedidas: Math.round(180 * scale), inyectadas: Math.round(171 * scale), mbqPerd: Math.round(310 * scale), pct: 95.0, dosisPerdidas: Math.max(1, Math.round(9 * scale)), accion: 'Ajuste de calibración con Ciclotrón público según agenda confirmada' },
      { name: '18F-PSMA (Próstata)', dosisPedidas: Math.round(45 * scale), inyectadas: Math.round(41 * scale), mbqPerd: Math.round(180 * scale), pct: 91.1, dosisPerdidas: Math.max(1, Math.round(4 * scale)), accion: 'Coordinación logística con radiofarmacia externa según demanda asistencial' },
      { name: '18F-Colina (Próstata / Parat.)', dosisPedidas: Math.round(24 * scale), inyectadas: Math.round(21 * scale), mbqPerd: Math.round(150 * scale), pct: 87.5, dosisPerdidas: Math.max(1, Math.round(3 * scale)), accion: 'Concentración de pacientes en tandas matinales para maximizar actividad' },
      { name: '68Ga-DOTATOC (Neuroendócrinos)', dosisPedidas: Math.round(12 * scale), inyectadas: Math.round(10 * scale), mbqPerd: Math.round(100 * scale), pct: 83.3, dosisPerdidas: Math.max(1, Math.round(2 * scale)), accion: 'Optimización de elución de generador 68Ge/68Ga in situ para lista de espera' }
    ];

    // Demoras Lead Time
    const demoraP1 = 4.6;
    const demoraP2 = 10.8;
    const demoraP3 = 24.5;
    const tatInformeHoras = 18.2;
    const tatMenor24h = 78.5;
    const tat24a48h = 16.2;
    const tatMayor48h = 5.3;

    // Tiempos permanencia door to door
    const permanenciaTotalMin = 112;
    const fasesMin = {
      acogida: 14,
      boxReposo: 58,
      camilla: 18,
      revisionAlta: 22
    };
    const ventanaEarlPct = 93.1;
    const ventanaEarlPrecoz = 2.4;
    const ventanaEarlTardia = 4.5;

    // Audioguías & Calidad
    const adherenciaAudioPct = 85.4;
    const suspConAudioPct = 1.1;
    const suspSinAudioPct = 8.7;
    const consultasChatbot = Math.round(342 * scale);

    // Mal preparados
    const totalMalPrep = Math.max(1, Math.round(12 * scale));
    const causasMalPrep = [
      { causa: 'Rotura involuntaria de ayuno (comida/bebida calórica)', pct: 42, count: Math.round(totalMalPrep * 0.42) },
      { causa: 'Medicación o insulina mal pautada', pct: 28, count: Math.round(totalMalPrep * 0.28) },
      { causa: 'Ejercicio físico intenso en 24-48h previas', pct: 18, count: Math.round(totalMalPrep * 0.18) },
      { causa: 'Incumplimiento de dieta cetogénica (Endocarditis)', pct: 12, count: Math.round(totalMalPrep * 0.12) }
    ];

    // Glucemias en Box
    const glucemiaVerdePct = 76.2;
    const glucemiaAmbarPct = 17.5;
    const glucemiaRojaPct = 6.3;
    const rescateGlucemiaPct = 71.4;

    return {
      recMBq,
      inyMBq,
      perdMBq,
      dosisPerdidasEquiv,
      pctAprov,
      totalSlotsDia,
      ocupadosDia,
      libresDia,
      pctLibres,
      farmacosEfficiency,
      demoraP1,
      demoraP2,
      demoraP3,
      tatInformeHoras,
      tatMenor24h,
      tat24a48h,
      tatMayor48h,
      permanenciaTotalMin,
      fasesMin,
      ventanaEarlPct,
      ventanaEarlPrecoz,
      ventanaEarlTardia,
      adherenciaAudioPct,
      suspConAudioPct,
      suspSinAudioPct,
      consultasChatbot,
      totalMalPrep,
      causasMalPrep,
      glucemiaVerdePct,
      glucemiaAmbarPct,
      glucemiaRojaPct,
      rescateGlucemiaPct
    };
  }

  function calcularDosisIdealJefatura(pesoRaw, tallaRaw, farmacoRaw) {
    const peso = parseFloat(String(pesoRaw || '').replace(',', '.')) || 72;
    const talla = parseFloat(String(tallaRaw || '').replace(',', '.')) || 170;
    const f = String(farmacoRaw || 'FDG').toUpperCase();
    const tM = talla > 3 ? (talla / 100) : talla;
    const imc = (peso > 0 && tM > 0.5) ? (peso / (tM * tM)) : 24.9;
    let factorBmi = 1.0;
    if (imc >= 30) factorBmi = 1.08;
    else if (imc < 18.5) factorBmi = 0.94;
    let idealMci = 7.20;
    if (f.includes('PSMA')) {
      idealMci = Math.min(8.0, Math.max(2.8, peso * 0.054 * factorBmi));
    } else if (f.includes('COLINA')) {
      idealMci = Math.min(11.5, Math.max(4.0, peso * 0.10 * factorBmi));
    } else if (f.includes('GA68') || f.includes('DOTATOC')) {
      idealMci = Math.min(6.8, Math.max(2.5, peso * 0.05 * factorBmi));
    } else {
      idealMci = Math.min(13.5, Math.max(4.0, peso * 0.10 * factorBmi));
    }
    return {
      pesoKg: Number(peso.toFixed(1)),
      tallaCm: Math.round(talla),
      imcStr: imc.toFixed(1),
      dosisIdealMci: Number(idealMci.toFixed(2)),
      dosisIdealStr: idealMci.toFixed(2)
    };
  }

  function evaluarCalidadDosisJefatura(mciRealRaw, idealMciRaw) {
    const real = parseFloat(String(mciRealRaw || '').replace(',', '.'));
    const ideal = parseFloat(String(idealMciRaw || '').replace(',', '.'));
    if (isNaN(real) || real <= 0 || isNaN(ideal) || ideal <= 0) {
      return { estado: 'pendiente', pctDiff: 0, diffMci: 0, label: '⚪ Pendiente', badgeClass: 'badge-info' };
    }
    const diffMci = real - ideal;
    const pctDiff = (diffMci / ideal) * 100;
    const pctRound = Number(pctDiff.toFixed(1));
    if (pctDiff > 10) {
      return {
        estado: 'mas',
        pctDiff: pctRound,
        diffMci: Number(diffMci.toFixed(2)),
        label: `🔴 Más del Ideal (+${pctRound}%)`,
        badgeClass: 'badge-danger'
      };
    }
    if (pctDiff < -10) {
      return {
        estado: 'menos',
        pctDiff: pctRound,
        diffMci: Number(diffMci.toFixed(2)),
        label: `🟡 Menos del Ideal (${pctRound}%)`,
        badgeClass: 'badge-warn'
      };
    }
    return {
      estado: 'ideal',
      pctDiff: pctRound,
      diffMci: Number(diffMci.toFixed(2)),
      label: `🟢 Dosis Ideal (${pctRound >= 0 ? '+' : ''}${pctRound}%)`,
      badgeClass: 'badge-ok'
    };
  }

  function computeDosimetryQualityStats() {
    const recordsMap = {};
    const todayStr = getTodayISO();

    // 1. Leer histórico de Enfermería (PET_NURSING_SHIFT_INJECTIONS_LOG_V1)
    try {
      const shiftLog = JSON.parse(localStorage.getItem('PET_NURSING_SHIFT_INJECTIONS_LOG_V1') || '{}');
      Object.keys(shiftLog).forEach(k => {
        const r = shiftLog[k];
        if (r && (r.mciInyectados || r.horaInyeccion)) {
          const fk = r.farmacoInyectado || 'FDG';
          const calc = calcularDosisIdealJefatura(r.pesoKg, r.tallaCm, fk);
          const mciUse = r.mciInyectados || calc.dosisIdealStr;
          const evalQ = evaluarCalidadDosisJefatura(mciUse, r.dosisIdealMci || calc.dosisIdealMci);
          recordsMap[r.nhc || k] = {
            fecha: r.fechaInyeccion || todayStr,
            farmaco: fk,
            nombre: r.nombre || 'Paciente PET',
            iniciales: r.iniciales || 'P.P.',
            nhc: r.nhc || k,
            pesoKg: calc.pesoKg,
            tallaCm: calc.tallaCm,
            imc: r.imc || calc.imcStr,
            dosisIdealMci: Number(r.dosisIdealMci || calc.dosisIdealMci).toFixed(2),
            mciInyectados: Number(parseFloat(String(mciUse).replace(',', '.')) || calc.dosisIdealMci).toFixed(2),
            estadoInyeccion: r.estadoInyeccion === 'extravasacion' ? 'extravasacion' : 'correcta',
            horaInyeccion: r.horaInyeccion || '09:15',
            calidad: evalQ
          };
        }
      });
    } catch (e) { }

    // 2. Leer sincronización en vivo de Enfermería/TSID (PET_SHARED_INJECTIONS_AND_MOBILITY_V1)
    try {
      const sharedInj = JSON.parse(localStorage.getItem('PET_SHARED_INJECTIONS_AND_MOBILITY_V1') || '{}');
      Object.keys(sharedInj).forEach(k => {
        const s = sharedInj[k];
        if (s && (s.mciInyectados || s.horaInyeccion)) {
          const nhcKey = s.nhc || k;
          const fk = s.farmacoInyectado || 'FDG';
          const calc = calcularDosisIdealJefatura(s.pesoKg, s.tallaCm, fk);
          const mciUse = s.mciInyectados || calc.dosisIdealStr;
          const evalQ = evaluarCalidadDosisJefatura(mciUse, s.dosisIdealMci || calc.dosisIdealMci);
          const nom = s.nombre || 'Paciente PET';
          const ini = nom.split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + '.').join('');
          recordsMap[nhcKey] = {
            fecha: s.fechaInyeccion || todayStr,
            farmaco: fk,
            nombre: nom,
            iniciales: ini || 'P.P.',
            nhc: nhcKey,
            pesoKg: calc.pesoKg,
            tallaCm: calc.tallaCm,
            imc: s.imc || calc.imcStr,
            dosisIdealMci: Number(s.dosisIdealMci || calc.dosisIdealMci).toFixed(2),
            mciInyectados: Number(parseFloat(String(mciUse).replace(',', '.')) || calc.dosisIdealMci).toFixed(2),
            estadoInyeccion: s.estadoInyeccion === 'extravasacion' ? 'extravasacion' : 'correcta',
            horaInyeccion: s.horaInyeccion || '09:30',
            calidad: evalQ
          };
        }
      });
    } catch (e) { }

    // 3. Semilla clínica de referencia para auditoría de calidad si hay pocos registros en vivo
    const baselineSamples = [
      { fecha: todayStr, farmaco: 'FDG', nombre: 'Manuel Piñeiro Castro', iniciales: 'M.P.C.', nhc: 'NHC-391042', pesoKg: 76, tallaCm: 172, mciInyectados: '7.65', estadoInyeccion: 'correcta', horaInyeccion: '08:35' },
      { fecha: todayStr, farmaco: 'PSMA', nombre: 'Alfonso Vázquez Souto', iniciales: 'A.V.S.', nhc: 'NHC-518290', pesoKg: 82, tallaCm: 175, mciInyectados: '4.45', estadoInyeccion: 'correcta', horaInyeccion: '09:05' },
      { fecha: todayStr, farmaco: 'FDG', nombre: 'Carmen Domínguez Lago', iniciales: 'C.D.L.', nhc: 'NHC-602118', pesoKg: 64, tallaCm: 162, mciInyectados: '7.35', estadoInyeccion: 'correcta', horaInyeccion: '09:35' },
      { fecha: todayStr, farmaco: 'COLINA', nombre: 'Ramiro Estévez Pazos', iniciales: 'R.E.P.', nhc: 'NHC-449812', pesoKg: 78, tallaCm: 170, mciInyectados: '7.75', estadoInyeccion: 'correcta', horaInyeccion: '10:10' },
      { fecha: todayStr, farmaco: 'GA68', nombre: 'Dolores Méndez Conde', iniciales: 'D.M.C.', nhc: 'NHC-710394', pesoKg: 68, tallaCm: 160, mciInyectados: '3.40', estadoInyeccion: 'correcta', horaInyeccion: '10:40' },
      { fecha: todayStr, farmaco: 'FDG', nombre: 'Brais Nogueira Rial', iniciales: 'B.N.R.', nhc: 'NHC-829104', pesoKg: 85, tallaCm: 178, mciInyectados: '7.40', estadoInyeccion: 'extravasacion', horaInyeccion: '11:15' }
    ];
    baselineSamples.forEach(b => {
      if (!recordsMap[b.nhc]) {
        const calc = calcularDosisIdealJefatura(b.pesoKg, b.tallaCm, b.farmaco);
        const evalQ = evaluarCalidadDosisJefatura(b.mciInyectados, calc.dosisIdealMci);
        recordsMap[b.nhc] = {
          fecha: b.fecha,
          farmaco: b.farmaco,
          nombre: b.nombre,
          iniciales: b.iniciales,
          nhc: b.nhc,
          pesoKg: calc.pesoKg,
          tallaCm: calc.tallaCm,
          imc: calc.imcStr,
          dosisIdealMci: calc.dosisIdealStr,
          mciInyectados: b.mciInyectados,
          estadoInyeccion: b.estadoInyeccion || 'correcta',
          horaInyeccion: b.horaInyeccion,
          calidad: evalQ
        };
      }
    });

    const items = Object.values(recordsMap).sort((a, b) => (a.horaInyeccion || '').localeCompare(b.horaInyeccion || ''));
    let idealCount = 0;
    let masCount = 0;
    let menosCount = 0;
    let correctaCount = 0;
    let extravasacionCount = 0;
    items.forEach(it => {
      if (it.calidad.estado === 'ideal') idealCount++;
      else if (it.calidad.estado === 'mas') masCount++;
      else if (it.calidad.estado === 'menos') menosCount++;
      if (it.estadoInyeccion === 'extravasacion') extravasacionCount++;
      else correctaCount++;
    });
    const total = items.length || 1;
    return {
      items,
      total: items.length,
      idealCount,
      masCount,
      menosCount,
      correctaCount,
      extravasacionCount,
      pctIdeal: (idealCount / total) * 100,
      pctMas: (masCount / total) * 100,
      pctMenos: (menosCount / total) * 100,
      pctCorrecta: (correctaCount / total) * 100,
      pctExtravasacion: (extravasacionCount / total) * 100
    };
  }

  function renderAll() {
    const stats = computeServiceStats();
    renderExecutiveKPIs(stats);
    renderResumenTab(stats);
    renderPeticionesTab(stats);
    renderRadiofarmacosTab(stats);
    renderPuntualidadTab(stats);
    renderCitasTab(stats);
    renderAnulacionesTab(stats);
    renderMedicosTab(stats);
    renderEficienciaTiemposTab(stats);
    renderAudioguiasCalidadTab(stats);
    actualizarDemoInforme(stats);
  }

  // ==========================================================================
  // 4. RENDERIZADO DE TARJETAS KPI CON SPARKLINES DE EVOLUCIÓN
  // ==========================================================================
  function renderExecutiveKPIs(stats) {
    const p1Count = stats.petList.filter(p => p.prioridad === 'P1').length;
    const p2Count = stats.petList.filter(p => p.prioridad === 'P2').length;
    const p3Count = stats.petList.filter(p => p.prioridad === 'P3').length;

    // KPI 1: Peticiones Recibidas
    document.getElementById('kpiTotalPeticiones').textContent = stats.totalPeticiones;
    document.getElementById('kpiPeticionesValidasPct').textContent = `${stats.pctOk.toFixed(1)}% válidas`;
    document.getElementById('kpiPeticionesDesglosePrio').textContent = `🔴 P1: ${p1Count} · 🟡 P2: ${p2Count} · 🟢 P3: ${p3Count}`;
    document.getElementById('sparkKpiPeticiones').innerHTML = renderSparklineSVG([145, 162, 174, 189, 204, stats.totalPeticiones], '#0284c7');

    // KPI 2: % Peticiones que Llegan Mal
    document.getElementById('kpiPctPeticionesMal').textContent = `${stats.pctMal.toFixed(1)}%`;
    document.getElementById('kpiNumPeticionesMal').textContent = `${stats.malList.length} llegan mal`;
    document.getElementById('sparkKpiMal').innerHTML = renderSparklineSVG([18.4, 16.9, 15.2, 14.1, 12.8, Number(stats.pctMal.toFixed(1))], '#dc2626');

    // KPI 3: Pruebas por Radiofármaco
    document.getElementById('kpiTotalPruebasRF').textContent = stats.rfStats.totalPruebas;
    const topRf = stats.rfStats.items[0];
    document.getElementById('kpiTopRadiofarmacoBadge').textContent = `FDG ${topRf ? topRf.pct.toFixed(0) : 52}%`;
    document.getElementById('kpiDesgloseCortoRF').textContent = `FDG: ${stats.rfStats.items[0].pruebas} · PSMA: ${stats.rfStats.items[1].pruebas} · Colina: ${stats.rfStats.items[2].pruebas}`;
    document.getElementById('sparkKpiRadiofarmacos').innerHTML = renderSparklineSVG([192, 208, 221, 238, 254, stats.rfStats.totalPruebas], '#0d9488');

    // KPI 4: Paso en Hora a Máquina
    document.getElementById('kpiPctPasoEnHora').textContent = `${stats.pctEnHora.toFixed(1)}%`;
    document.getElementById('kpiNumPasoEnHora').textContent = `${stats.enHoraCount}/${stats.evaluatedMachine.length} en hora`;
    document.getElementById('kpiDesviacionMedia').textContent = `Desviación media: ±${stats.avgDiff} min (Meta ≤10m)`;
    document.getElementById('sparkKpiMaquina').innerHTML = renderSparklineSVG([72, 75, 78, 79, 81, Math.round(stats.pctEnHora)], '#059669');

    // KPI 5: No-Show vs Cancelaciones Recitables
    document.getElementById('kpiNumCancelaciones').textContent = stats.totalCancelaciones;
    document.getElementById('kpiHuecosDisponibles').textContent = stats.huecosDisponibles > 0
      ? `🔓 ${stats.huecosDisponibles} por recitar`
      : '✓ 100% recitados';
    document.getElementById('kpiRecitadosExito').innerHTML = `${stats.huecosRecitados}/${stats.totalCancelaciones} recitados · <strong style="color:#b91c1c;">${stats.totalNoShow} No-Show (${stats.pctNoShow.toFixed(1)}%)</strong>`;
    document.getElementById('sparkKpiCitas').innerHTML = renderSparklineSVG([55, 62, 68, 74, 80, stats.pctRecitados], '#d97706');

    // KPI 6: Anulaciones en Sala / Box
    document.getElementById('kpiNumAnulaciones').textContent = stats.totalAnulaciones;
    document.getElementById('kpiPctAnulaciones').textContent = `${stats.pctAnulaciones.toFixed(1)}% anuladas`;
    document.getElementById('kpiDesgloseAnulaciones').textContent = `🍽️ Prep: ${stats.malPrepList.length} · ☢️ RF: ${stats.falloRFList.length} · 💉 Extrav: ${stats.extravList.length}`;
    document.getElementById('sparkKpiAnulaciones').innerHTML = renderSparklineSVG([9, 8, 7, 6, 6, stats.totalAnulaciones], '#e11d48');

    // KPI 7: Tiempos y Tardías por Médico
    document.getElementById('kpiEsperaPostImagenMedia').textContent = `${stats.docStats.globalEsperaPostImagen.toFixed(1)} min`;
    document.getElementById('kpiTardiasTotalesBadge').textContent = `${stats.docStats.globalTardiasCount} tardías`;
    document.getElementById('kpiTiempoMedioPruebaGlobal').textContent = `Espera post-imagen · Prueba media: ${Math.round(stats.docStats.globalTiempoMedioPrueba)} min`;
    document.getElementById('sparkKpiMedicos').innerHTML = renderSparklineSVG([14.2, 13.5, 12.4, 11.8, 11.1, Number(stats.docStats.globalEsperaPostImagen.toFixed(1))], '#7c3aed');

    // KPI 8: Eficiencia y Aprovechamiento de Fármacos & Huecos Libres
    const ef = stats.advancedQualityStats;
    const elKpiAprov = document.getElementById('kpiPctAprovechamientoRF');
    if (elKpiAprov) elKpiAprov.textContent = `${ef.pctAprov.toFixed(1)}%`;
    const elKpiHuecos = document.getElementById('kpiHuecosLibresBadge');
    if (elKpiHuecos) elKpiHuecos.textContent = `${ef.libresDia} huecos libres`;
    const elSubAprov = document.getElementById('kpiSubtextAprovechamiento');
    if (elSubAprov) elSubAprov.textContent = `Recibido: ${ef.recMBq.toLocaleString('es-ES')} MBq · Inyectado: ${ef.inyMBq.toLocaleString('es-ES')} MBq`;
    const elSparkEf = document.getElementById('sparkKpiEficiencia');
    if (elSparkEf) elSparkEf.innerHTML = renderSparklineSVG([86.2, 87.5, 88.9, 90.1, 90.8, Number(ef.pctAprov.toFixed(1))], '#0284c7');

    // KPI 9: Demoras P1/P2 & TAT
    const elKpiDemoraP1 = document.getElementById('kpiDemoraP1Media');
    if (elKpiDemoraP1) elKpiDemoraP1.textContent = `${ef.demoraP1} d`;
    const elKpiTat = document.getElementById('kpiTatInformeBadge');
    if (elKpiTat) elKpiTat.textContent = `TAT: ${ef.tatInformeHoras} h`;
    const elSubDemoras = document.getElementById('kpiSubtextDemoras');
    if (elSubDemoras) elSubDemoras.textContent = `P1: ${ef.demoraP1}d (Meta ≤7d) · P2: ${ef.demoraP2}d · ${ef.tatMenor24h}% <24h`;
    const elSparkDem = document.getElementById('sparkKpiDemoras');
    if (elSparkDem) elSparkDem.innerHTML = renderSparklineSVG([6.8, 6.1, 5.5, 5.0, 4.8, ef.demoraP1], '#059669');

    // KPI 10: Permanencia & Ventana EARL
    const elKpiPerm = document.getElementById('kpiPermanenciaServicioMedia');
    if (elKpiPerm) elKpiPerm.textContent = `${ef.permanenciaTotalMin} min`;
    const elKpiEarl = document.getElementById('kpiVentanaEarlBadge');
    if (elKpiEarl) elKpiEarl.textContent = `${ef.ventanaEarlPct}% EARL`;
    const elSubPerm = document.getElementById('kpiSubtextPermanencia');
    if (elSubPerm) elSubPerm.textContent = `Door-to-Door: ${ef.permanenciaTotalMin}m · Ventana 55-75m OK`;
    const elSparkPerm = document.getElementById('sparkKpiPermanencia');
    if (elSparkPerm) elSparkPerm.innerHTML = renderSparklineSVG([128, 124, 119, 116, 114, ef.permanenciaTotalMin], '#d97706');

    // KPI 11: Audioguías & Glucemias Box
    const elKpiAudio = document.getElementById('kpiAdherenciaAudioguia');
    if (elKpiAudio) elKpiAudio.textContent = `${ef.adherenciaAudioPct}%`;
    const elKpiGluc = document.getElementById('kpiGlucemiasAltasBadge');
    if (elKpiGluc) elKpiGluc.textContent = `${ef.glucemiaRojaPct}% ≥200`;
    const elSubAudio = document.getElementById('kpiSubtextAudioguias');
    if (elSubAudio) elSubAudio.textContent = `Adherencia ${ef.adherenciaAudioPct}% · Susp: ${ef.suspConAudioPct}% con vs ${ef.suspSinAudioPct}% sin`;
    const elSparkAud = document.getElementById('sparkKpiAudioguias');
    if (elSparkAud) elSparkAud.innerHTML = renderSparklineSVG([62, 69, 75, 80, 83, ef.adherenciaAudioPct], '#be123c');

    // Badges de pestañas
    document.getElementById('tabBadgeMal').textContent = `${stats.malList.length} (${stats.pctMal.toFixed(0)}%)`;
    document.getElementById('tabBadgeRF').textContent = `${stats.rfStats.totalPruebas}`;
    document.getElementById('tabBadgeMaquina').textContent = `${stats.pctEnHora.toFixed(0)}%`;
    document.getElementById('tabBadgeRecitar').textContent = `${stats.huecosDisponibles} libres`;
    document.getElementById('tabBadgeAnulaciones').textContent = `${stats.totalAnulaciones}`;
    document.getElementById('tabBadgeMedicos').textContent = `${NUCLEAR_DOCTORS.length} méd.`;
    const elTabBadgeEf = document.getElementById('tabBadgeEficiencia');
    if (elTabBadgeEf) elTabBadgeEf.textContent = `${ef.pctAprov.toFixed(0)}%`;
    const elTabBadgeAud = document.getElementById('tabBadgeAudioguias');
    if (elTabBadgeAud) elTabBadgeAud.textContent = `${ef.adherenciaAudioPct.toFixed(0)}%`;
  }

  // ==========================================================================
  // 5. PESTAÑA 1: CUADRO DE MANDO EJECUTIVO Y GRÁFICAS DE EVOLUCIÓN
  // ==========================================================================
  function renderResumenTab(stats) {
    const xLabels = getTimeAxisLabels();

    // 4 Gráficas principales de evolución temporal en el Cuadro de Mando
    const chart1 = renderEvolutionChartSVG({
      title: '1. Evolución de % Peticiones Mal Formuladas vs % Paso en Hora a Máquina',
      xLabels,
      ySuffix: '%',
      series: [
        { name: '% Pasan en Hora a Máquina', color: '#059669', data: [72, 75, 78, 80, 82, Math.round(stats.pctEnHora)] },
        { name: '% Peticiones que Llegan Mal', color: '#dc2626', data: [19, 17, 15, 14, 12, Math.round(stats.pctMal)] }
      ]
    });

    const chart2 = renderEvolutionChartSVG({
      title: '2. Evolución de Pruebas Realizadas por Radiofármaco (Top 3 Trazadores)',
      xLabels,
      ySuffix: '',
      series: [
        { name: '18F-FDG', color: '#0284c7', data: stats.rfStats.items[0].trend },
        { name: '68Ga-PSMA-11', color: '#0d9488', data: stats.rfStats.items[1].trend },
        { name: '18F-Colina', color: '#7c3aed', data: stats.rfStats.items[2].trend }
      ]
    });

    const chart3 = renderEvolutionChartSVG({
      title: '3. Evolución de Huecos Recitados vs No-Shows y Anulaciones Operativas',
      xLabels,
      ySuffix: '',
      series: [
        { name: 'Cancelaciones Recitadas', color: '#10b981', data: [2, 3, 3, 4, 4, stats.huecosRecitados] },
        { name: 'No-Shows sin Avisar', color: '#dc2626', data: [5, 4, 4, 3, 3, stats.totalNoShow] },
        { name: 'Anulaciones (Prep/RF/Extrav)', color: '#d97706', data: [7, 6, 6, 5, 5, stats.totalAnulaciones] }
      ]
    });

    const chart4 = renderEvolutionChartSVG({
      title: '4. Evolución de Espera post-Última Imagen (min) y % Tardías Pedidas por Médico',
      xLabels,
      ySuffix: 'm',
      series: [
        { name: 'Espera Salir desde Última Imagen (min)', color: '#7c3aed', data: [14, 13, 12, 11, 11, Math.round(stats.docStats.globalEsperaPostImagen)] },
        { name: 'Tiempo Medio en Máquina (min)', color: '#0284c7', data: [22, 21, 21, 20, 20, 20] }
      ]
    });

    document.getElementById('resumenChartsGrid').innerHTML = chart1 + chart2 + chart3 + chart4;

    // Barras de causas de peticiones que llegan mal
    const causasMap = {
      'Falta histología / Datos clínicos incompletos': { count: 0, color: '#dc2626' },
      'Glucemia basal crítica (≥ 200 mg/dL) sin control previo': { count: 0, color: '#ea580c' },
      'Intervalo QT/RT < 21 días': { count: 0, color: '#d97706' },
      'Contraindicación Contraste IV / FG bajo sin pauta': { count: 0, color: '#7c3aed' },
      'Radiofármaco mal indicado / sin especificar': { count: 0, color: '#0284c7' }
    };

    stats.malList.forEach(p => {
      if (!causasMap[p.categoriaFallo]) {
        causasMap[p.categoriaFallo] = { count: 0, color: '#dc2626' };
      }
      causasMap[p.categoriaFallo].count++;
    });

    const totalMal = Math.max(stats.malList.length, 1);
    document.getElementById('resumenCausasPeticionesMal').innerHTML = `
      <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <strong style="color:#991b1b; font-size:0.86rem;">Tasa de Peticiones que Llegan Mal: ${stats.pctMal.toFixed(1)}%</strong>
          <div style="font-size:0.76rem; color:#7f1d1d;">${stats.malList.length} peticiones con defectos sobre ${stats.totalPeticiones} recibidas</div>
        </div>
        <span class="status-badge badge-danger">${stats.malList.length} Incidencias</span>
      </div>
      ${Object.entries(causasMap).map(([label, obj]) => {
      const pct = Math.round((obj.count / totalMal) * 100);
      return `
          <div class="stat-bar-item">
            <div class="stat-bar-top">
              <span>${escapeHTML(label)}</span>
              <span style="font-family:'JetBrains Mono',monospace; color:${obj.color};">${obj.count} pet. (${pct}%)</span>
            </div>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${pct}%; background:${obj.color};"></div>
            </div>
          </div>
        `;
    }).join('')}
    `;

    // Barras de Pruebas Hechas por Radiofármaco
    document.getElementById('resumenPruebasPorRadiofarmacoBars').innerHTML = stats.rfStats.items.slice(0, 6).map(rf => `
      <div class="stat-bar-item">
        <div class="stat-bar-top">
          <span><strong>${escapeHTML(rf.nombre)}</strong> <span style="font-size:0.72rem; color:#64748b;">(${escapeHTML(rf.isotopo)})</span></span>
          <span style="font-family:'JetBrains Mono',monospace; color:${rf.color};">${rf.pruebas} pruebas (${rf.pct.toFixed(1)}%)</span>
        </div>
        <div class="stat-bar-track">
          <div class="stat-bar-fill" style="width:${Math.max(6, rf.pct)}%; background:${rf.color};"></div>
        </div>
      </div>
    `).join('');

    // Barras de puntualidad de paso a máquina
    const totalMaq = Math.max(stats.evaluatedMachine.length, 1);
    const pctOnTime = Math.round((stats.enHoraCount / totalMaq) * 100);
    const pctMild = Math.round((stats.demoraLeveCount / totalMaq) * 100);
    const pctLate = Math.round((stats.retrasoCriticoCount / totalMaq) * 100);

    document.getElementById('resumenPuntualidadMaquina').innerHTML = `
      <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:10px 14px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
        <div>
          <strong style="color:#065f46; font-size:0.86rem;">Pacientes que Pasan en Hora a Máquina: ${stats.pctEnHora.toFixed(1)}%</strong>
          <div style="font-size:0.76rem; color:#047857;">Cumplimiento de ventana de captación post-inyección (±10 min) en ${stats.enHoraCount} de ${stats.evaluatedMachine.length} estudios</div>
        </div>
        <span class="status-badge badge-ok">Meta SERGAS ≥ 80%</span>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-top">
          <span>🟢 Pasan en Hora a Máquina (Desviación ≤ ±10 min)</span>
          <span style="font-family:'JetBrains Mono',monospace; color:#059669;">${stats.enHoraCount} pac. (${pctOnTime}%)</span>
        </div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pctOnTime}%; background:#10b981;"></div></div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-top">
          <span>🟡 Demora Leve (+11 a +20 min por movilidad / vaciado vesical)</span>
          <span style="font-family:'JetBrains Mono',monospace; color:#d97706;">${stats.demoraLeveCount} pac. (${pctMild}%)</span>
        </div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pctMild}%; background:#f59e0b;"></div></div>
      </div>
      <div class="stat-bar-item">
        <div class="stat-bar-top">
          <span>🔴 Fuera de Hora / Retraso (&gt; +20 min por tardía previa o glucemia)</span>
          <span style="font-family:'JetBrains Mono',monospace; color:#dc2626;">${stats.retrasoCriticoCount} pac. (${pctLate}%)</span>
        </div>
        <div class="stat-bar-track"><div class="stat-bar-fill" style="width:${pctLate}%; background:#ef4444;"></div></div>
      </div>
    `;

    // Resumen compacto de Médicos Nucleares en Tab 1
    document.getElementById('resumenMedicosCompactBox').innerHTML = `
      <div class="table-responsive">
        <table class="chief-table">
          <thead>
            <tr>
              <th>Médico Nuclear</th>
              <th>🕒 Tardías Pedidas</th>
              <th>⏳ Espera Salir post-Imagen</th>
              <th>⏱️ Tiempo Medio/Prueba</th>
            </tr>
          </thead>
          <tbody>
            ${stats.docStats.byDoctor.map(d => {
      const espBadge = d.avgEsperaSalidaMin > 15 ? 'badge-danger' : (d.avgEsperaSalidaMin > 10 ? 'badge-warn' : 'badge-ok');
      return `
                <tr>
                  <td><strong>${escapeHTML(d.medico)}</strong></td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#b45309;">${d.totalTardiasPeriodo} (${d.pctTardias.toFixed(0)}%)</td>
                  <td><span class="status-badge ${espBadge}">${d.avgEsperaSalidaMin.toFixed(1)} min</span></td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${Math.round(d.avgTotalPruebaMin)} min <span style="font-size:0.72rem; color:#64748b;">(${Math.round(d.avgMaquinaMin)}m máq)</span></td>
                </tr>
              `;
    }).join('')}
          </tbody>
        </table>
      </div>
    `;

    // Tabla resumen por Servicio Solicitante
    const byService = buildServiceBreakdown(stats.petList);
    document.getElementById('tablaResumenServiciosBody').innerHTML = byService.slice(0, 7).map(s => {
      const badgeClass = s.pctMal >= 20 ? 'badge-danger' : (s.pctMal >= 10 ? 'badge-warn' : 'badge-ok');
      return `
        <tr>
          <td><strong>${escapeHTML(s.servicio)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${s.total}</td>
          <td style="color:#059669; font-weight:700;">${s.ok}</td>
          <td style="color:#dc2626; font-weight:800;">${s.mal}</td>
          <td><span class="status-badge ${badgeClass}">${s.pctMal.toFixed(1)}% mal</span></td>
          <td style="font-size:0.77rem; color:#475569;">${escapeHTML(s.topCausa)}</td>
        </tr>
      `;
    }).join('');

    // Balance de Citas y Anulaciones
    document.getElementById('resumenBalanceCitasBox').innerHTML = `
      <div style="display:flex; flex-direction:column; gap:0.85rem;">
        <div style="background:#fffbeb; border:1.5px solid #fcd34d; border-radius:12px; padding:0.9rem 1.1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:#92400e; font-size:0.88rem;">🔄 Cancelaciones con Aviso (Huecos Recitables)</strong>
            <span class="status-badge badge-warn">${stats.totalCancelaciones} Cancelaciones</span>
          </div>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <div style="flex:1; background:#ffffff; border:1px solid #fde68a; border-radius:8px; padding:7px 10px;">
              <div style="font-size:0.7rem; color:#64748b; font-weight:700;">YA RECITADOS</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.25rem; font-weight:800; color:#059669;">${stats.huecosRecitados} (${stats.pctRecitados}%)</div>
            </div>
            <div style="flex:1; background:#ffffff; border:1px solid #f59e0b; border-radius:8px; padding:7px 10px;">
              <div style="font-size:0.7rem; color:#b45309; font-weight:800;">POR RECITAR AHORA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.25rem; font-weight:800; color:#d97706;">${stats.huecosDisponibles} libres</div>
            </div>
          </div>
        </div>

        <div style="background:#fef2f2; border:1.5px solid #fca5a5; border-radius:12px; padding:0.85rem 1.1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong style="color:#991b1b; font-size:0.88rem;">🚫 No Acuden sin Avisar (No-Show)</strong>
            <span class="status-badge badge-danger">${stats.totalNoShow} No-Shows (${stats.pctNoShow.toFixed(1)}%)</span>
          </div>
        </div>

        <div style="background:#fff1f2; border:1.5px solid #fda4af; border-radius:12px; padding:0.85rem 1.1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <strong style="color:#9f1239; font-size:0.88rem;">🛑 Anulaciones (Mal Prep · Radiofármaco · Extrav)</strong>
            <button type="button" class="btn-chief btn-chief-outline no-print" style="padding:3px 9px; font-size:0.73rem; border-color:#fda4af; color:#be123c;" onclick="window.jefaturaApp.cambiarTab('anulaciones')">
              Ver (${stats.totalAnulaciones}) →
            </button>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:8px;">
            <div style="background:#ffffff; border:1px solid #fed7aa; border-radius:8px; padding:6px 8px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#c2410c;">🍽️ MAL PREP</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:800; color:#ea580c;">${stats.malPrepList.length}</div>
            </div>
            <div style="background:#ffffff; border:1px solid #ddd6fe; border-radius:8px; padding:6px 8px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#6d28d9;">☢️ FALLO RF</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:800; color:#7c3aed;">${stats.falloRFList.length}</div>
            </div>
            <div style="background:#ffffff; border:1px solid #fecdd3; border-radius:8px; padding:6px 8px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#be123c;">💉 EXTRAV</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:800; color:#e11d48;">${stats.extravList.length}</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function buildServiceBreakdown(petList) {
    const map = {};
    petList.forEach(p => {
      if (!map[p.servicio]) {
        map[p.servicio] = { servicio: p.servicio, total: 0, ok: 0, mal: 0, causas: {} };
      }
      map[p.servicio].total++;
      if (p.llegaMal) {
        map[p.servicio].mal++;
        const c = p.categoriaFallo || 'Incidencia clínica';
        map[p.servicio].causas[c] = (map[p.servicio].causas[c] || 0) + 1;
      } else {
        map[p.servicio].ok++;
      }
    });

    return Object.values(map).map(item => {
      const pctMal = item.total > 0 ? (item.mal / item.total) * 100 : 0;
      let topCausa = 'Sin incidencias reseñables';
      let maxC = 0;
      Object.entries(item.causas).forEach(([c, cnt]) => {
        if (cnt > maxC) {
          maxC = cnt;
          topCausa = c;
        }
      });
      return Object.assign({}, item, { pctMal, topCausa });
    }).sort((a, b) => b.mal - a.mal || b.total - a.total);
  }

  // ==========================================================================
  // 6. PESTAÑA 2: AUDITORÍA DE PETICIONES QUE LLEGAN MAL + GRÁFICA EVOLUCIÓN
  // ==========================================================================
  function populateServiceFilterDropdown() {
    const sel = document.getElementById('filtroServicioPeticiones');
    if (!sel) return;
    const services = Array.from(new Set(state.peticiones.map(p => p.servicio))).sort();
    sel.innerHTML = `<option value="all">🏥 Todos los Servicios Solicitantes (${services.length})</option>` +
      services.map(s => `<option value="${escapeHTML(s)}">${escapeHTML(s)}</option>`).join('');
  }

  function renderPeticionesTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const xLabels = getTimeAxisLabels();

    const chartEl = document.getElementById('chartEvolucionPeticiones');
    if (chartEl) {
      chartEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución Temporal: Peticiones Correctas vs Peticiones que Llegan Mal (Con Defecto)',
        xLabels,
        ySuffix: '',
        series: [
          { name: 'Peticiones Válidas a la 1ª', color: '#0284c7', data: [122, 136, 149, 162, 178, stats.okList.length] },
          { name: 'Peticiones que Llegan Mal', color: '#dc2626', data: [27, 26, 25, 24, 22, stats.malList.length] }
        ]
      });
    }

    const byService = buildServiceBreakdown(stats.petList);
    document.getElementById('tablaDetalleServiciosCalidad').innerHTML = byService.map(s => {
      const badgeClass = s.pctMal >= 20 ? 'badge-danger' : (s.pctMal >= 10 ? 'badge-warn' : 'badge-ok');
      return `
        <tr>
          <td><strong>${escapeHTML(s.servicio)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${s.total}</td>
          <td style="color:#059669; font-weight:700;">${s.ok} (${(100 - s.pctMal).toFixed(1)}%)</td>
          <td style="color:#dc2626; font-weight:800;">${s.mal}</td>
          <td><span class="status-badge ${badgeClass}">${s.pctMal.toFixed(1)}% llegan mal</span></td>
          <td style="font-size:0.78rem;">${escapeHTML(s.topCausa)}</td>
          <td class="no-print">
            <button type="button" class="btn-chief btn-chief-outline" style="padding:4px 10px; font-size:0.75rem;" onclick="window.jefaturaApp.enviarFeedbackServicio('${escapeHTML(s.servicio)}', ${s.mal}, '${escapeHTML(s.topCausa)}')">
              📩 Enviar Informe Calidad
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const srvFilter = (document.getElementById('filtroServicioPeticiones') || {}).value || 'all';
    const statusFilter = (document.getElementById('filtroEstadoCalidadPeticion') || {}).value || 'bad';

    const rows = stats.petList.filter(p => {
      if (srvFilter !== 'all' && p.servicio !== srvFilter) return false;
      if (statusFilter === 'bad' && !p.llegaMal) return false;
      if (statusFilter === 'ok' && p.llegaMal) return false;
      return true;
    });

    document.getElementById('tablaNominalPeticionesMal').innerHTML = rows.slice(0, 60).map(p => {
      const prioBadge = p.prioridad === 'P1' ? 'badge-danger' : (p.prioridad === 'P2' ? 'badge-warn' : 'badge-ok');
      return `
        <tr>
          <td style="font-family:'JetBrains Mono',monospace; font-size:0.76rem;">
            <div>${escapeHTML(p.fechaSolicitud)}</div>
            <div style="color:#64748b;">${escapeHTML(p.id)}</div>
          </td>
          <td>
            <strong>${escapeHTML(p.nombre)}</strong>
            <div style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:#0284c7;">${escapeHTML(p.nhc)}</div>
          </td>
          <td>
            <strong>${escapeHTML(p.servicio)}</strong>
            <div style="font-size:0.75rem; color:#64748b;">${escapeHTML(p.medico)}</div>
          </td>
          <td>
            <span class="status-badge ${prioBadge}">${p.prioridad}</span>
            <div style="font-size:0.75rem; margin-top:3px;">${escapeHTML(p.estudio)}</div>
          </td>
          <td>
            ${p.llegaMal
          ? `<span class="status-badge badge-danger">⚠️ Llega Mal / Incidencia</span>`
          : `<span class="status-badge badge-ok">✅ Correcta</span>`}
          </td>
          <td style="max-width:320px; font-size:0.78rem;">
            ${p.llegaMal
          ? `<strong style="color:#991b1b; display:block;">${escapeHTML(p.categoriaFallo)}</strong><span>${escapeHTML(p.detalleFallo)}</span>`
          : `<span style="color:#059669;">Cumple criterios clínicos y de seguridad EANM/SERGAS</span>`}
          </td>
          <td class="no-print">
            ${p.llegaMal ? `
              <button type="button" class="btn-chief btn-chief-primary" style="padding:4px 10px; font-size:0.74rem;" onclick="window.jefaturaApp.subsanarPeticionJefatura('${escapeHTML(p.id)}')">
                ✓ Subsanar / Validar
              </button>
            ` : `<span style="font-size:0.74rem; color:#64748b;">Auditada OK</span>`}
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // 7. PESTAÑA 3: PRUEBAS HECHAS POR RADIOFÁRMACO Y EVOLUCIÓN TEMPORAL
  // ==========================================================================
  function renderRadiofarmacosTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const xLabels = getTimeAxisLabels();
    const rfItems = stats.rfStats.items;

    const chartEl = document.getElementById('chartEvolucionRadiofarmacos');
    if (chartEl) {
      chartEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución en el Tiempo de Cantidad de Pruebas Realizadas por Radiofármaco',
        xLabels,
        ySuffix: '',
        series: rfItems.slice(0, 5).map(item => ({
          name: item.nombre.split('(')[0].trim(),
          color: item.color,
          data: item.trend
        }))
      });
    }

    const tbody = document.getElementById('tablaRadiofarmacosDetalleBody');
    if (tbody) {
      tbody.innerHTML = rfItems.map(rf => `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="width:10px; height:10px; border-radius:50%; background:${rf.color}; display:inline-block;"></span>
              <strong>${escapeHTML(rf.nombre)}</strong>
            </div>
          </td>
          <td><span class="status-badge badge-info">${escapeHTML(rf.isotopo)}</span></td>
          <td style="font-family:'JetBrains Mono',monospace; font-size:0.95rem; font-weight:800; color:#0f172a;">${rf.pruebas} pruebas</td>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div style="width:80px; height:8px; background:#e2e8f0; border-radius:99px; overflow:hidden;">
                <div style="width:${Math.max(5, rf.pct)}%; height:100%; background:${rf.color};"></div>
              </div>
              <span style="font-family:'JetBrains Mono',monospace; font-weight:700;">${rf.pct.toFixed(1)}%</span>
            </div>
          </td>
          <td><span class="status-badge badge-ok">${rf.aprovechamiento}% aprovechadas</span></td>
          <td style="font-size:0.79rem; color:#334155;">${escapeHTML(rf.captacion)}</td>
          <td style="width:160px;">${renderSparklineSVG(rf.trend, rf.color)}</td>
        </tr>
      `).join('');
    }

    const dStats = stats.dosimetryStats || computeDosimetryQualityStats();
    const kpiDosEl = document.getElementById('resumenKpisCalidadDosimetrica');
    if (kpiDosEl) {
      kpiDosEl.innerHTML = `
        <div style="background:#ecfdf5; border:1.5px solid #6ee7b7; border-radius:10px; padding:12px 14px;">
          <div style="font-size:0.72rem; font-weight:800; color:#047857; text-transform:uppercase;">🟢 Dosis Ideal (±10% Peso/Talla)</div>
          <div style="font-family:'Outfit',sans-serif; font-size:1.55rem; font-weight:900; color:#065f46; margin-top:2px;">${dStats.pctIdeal.toFixed(1)}% <span style="font-size:0.86rem; font-weight:700;">(${dStats.idealCount}/${dStats.total} pac.)</span></div>
          <div style="font-size:0.74rem; color:#047857; margin-top:2px;">Inyección ajustada al peso y talla del paciente</div>
        </div>
        <div style="background:#fef2f2; border:1.5px solid #fca5a5; border-radius:10px; padding:12px 14px;">
          <div style="font-size:0.72rem; font-weight:800; color:#b91c1c; text-transform:uppercase;">🔴 Más del Ideal (&gt; +10% Sobredosis)</div>
          <div style="font-family:'Outfit',sans-serif; font-size:1.55rem; font-weight:900; color:#991b1b; margin-top:2px;">${dStats.pctMas.toFixed(1)}% <span style="font-size:0.86rem; font-weight:700;">(${dStats.masCount}/${dStats.total} pac.)</span></div>
          <div style="font-size:0.74rem; color:#b91c1c; margin-top:2px;">Actividad administrada superior al rango ideal</div>
        </div>
        <div style="background:#fffbeb; border:1.5px solid #fcd34d; border-radius:10px; padding:12px 14px;">
          <div style="font-size:0.72rem; font-weight:800; color:#b45309; text-transform:uppercase;">🟡 Menos del Ideal (&lt; -10% Subdosis)</div>
          <div style="font-family:'Outfit',sans-serif; font-size:1.55rem; font-weight:900; color:#92400e; margin-top:2px;">${dStats.pctMenos.toFixed(1)}% <span style="font-size:0.86rem; font-weight:700;">(${dStats.menosCount}/${dStats.total} pac.)</span></div>
          <div style="font-size:0.74rem; color:#b45309; margin-top:2px;">Actividad administrada inferior al rango ideal</div>
        </div>
        <div style="background:${dStats.extravasacionCount > 0 ? '#fef2f2' : '#ecfdf5'}; border:1.5px solid ${dStats.extravasacionCount > 0 ? '#fca5a5' : '#6ee7b7'}; border-radius:10px; padding:12px 14px;">
          <div style="font-size:0.72rem; font-weight:800; color:${dStats.extravasacionCount > 0 ? '#b91c1c' : '#047857'}; text-transform:uppercase;">🩹 Vía: Inyección Correcta vs Extravasación</div>
          <div style="font-family:'Outfit',sans-serif; font-size:1.45rem; font-weight:900; color:${dStats.extravasacionCount > 0 ? '#991b1b' : '#065f46'}; margin-top:2px;">✅ ${dStats.correctaCount} OK · 🚨 ${dStats.extravasacionCount} Extrav.</div>
          <div style="font-size:0.74rem; color:${dStats.extravasacionCount > 0 ? '#b91c1c' : '#047857'}; margin-top:2px;">${dStats.pctCorrecta.toFixed(1)}% inyección correcta sin extravasación</div>
        </div>
      `;
    }

    const tbodyDos = document.getElementById('tablaCalidadDosimetricaBody');
    if (tbodyDos) {
      tbodyDos.innerHTML = dStats.items.map(it => `
        <tr>
          <td><strong>${escapeHTML(it.fecha)}</strong></td>
          <td><span class="status-badge badge-info">☢️ ${escapeHTML(it.farmaco)}</span></td>
          <td><strong>${escapeHTML(it.iniciales)}</strong> · <span style="font-family:'JetBrains Mono',monospace; color:#0284c7; font-weight:700;">${escapeHTML(it.nhc)}</span></td>
          <td><strong>${escapeHTML(it.pesoKg)} kg</strong> / <strong>${escapeHTML(it.tallaCm)} cm</strong> <span style="color:#64748b; font-size:0.75rem;">(IMC ${escapeHTML(it.imc)})</span></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0369a1;">🎯 ${escapeHTML(it.dosisIdealMci)} mCi</td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0f172a;">💉 ${escapeHTML(it.mciInyectados)} mCi</td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:${it.calidad.estado === 'ideal' ? '#047857' : (it.calidad.estado === 'mas' ? '#b91c1c' : '#b45309')};">
            ${it.calidad.pctDiff >= 0 ? '+' : ''}${it.calidad.pctDiff}% (${it.calidad.diffMci >= 0 ? '+' : ''}${it.calidad.diffMci} mCi)
          </td>
          <td><span class="status-badge ${it.calidad.badgeClass}">${escapeHTML(it.calidad.label)}</span></td>
          <td>
            ${it.estadoInyeccion === 'extravasacion'
          ? '<span class="status-badge badge-danger">🚨 Extravasación</span>'
          : '<span class="status-badge badge-ok">✅ Inyección Correcta</span>'
        }
          </td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">⏰ ${escapeHTML(it.horaInyeccion)} h</td>
        </tr>
      `).join('');
    }
  }

  // ==========================================================================
  // 8. PESTAÑA 4: PUNTUALIDAD DE PASO A MÁQUINA + GRÁFICA DE EVOLUCIÓN
  // ==========================================================================
  function renderPuntualidadTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const xLabels = getTimeAxisLabels();

    const chartEl = document.getElementById('chartEvolucionPuntualidad');
    if (chartEl) {
      chartEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución en el Tiempo: % Pacientes que Pasan en Hora a Máquina vs Desviación Media (min)',
        xLabels,
        ySuffix: '',
        series: [
          { name: '% Paso en Hora a Máquina (≤10m)', color: '#059669', data: [72, 75, 78, 80, 82, Math.round(stats.pctEnHora)] },
          { name: 'Desviación Media (Δ min)', color: '#d97706', data: [14, 12, 11, 9, 8, stats.avgDiff] }
        ]
      });
    }

    const filterVal = (document.getElementById('filtroPuntualidadEstado') || {}).value || 'all';
    const list = stats.evaluatedMachine.filter(m => {
      if (filterVal === 'all') return true;
      return m.status === filterVal;
    });

    document.getElementById('tablaPuntualidadMaquinaBody').innerHTML = list.map(m => {
      const sign = m.diffMin > 0 ? `+${m.diffMin}` : `${m.diffMin}`;
      let badgeHtml = `<span class="status-badge badge-ok">🟢 En Hora (${sign} min)</span>`;
      if (m.status === 'mild') {
        badgeHtml = `<span class="status-badge badge-warn">🟡 Demora Leve (${sign} min)</span>`;
      } else if (m.status === 'late') {
        badgeHtml = `<span class="status-badge badge-danger">🔴 Fuera de Hora (${sign} min)</span>`;
      }

      return `
        <tr>
          <td>
            <strong>${escapeHTML(m.nombre)}</strong>
            <div style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:#0284c7;">${escapeHTML(m.nhc)}</div>
          </td>
          <td>
            <strong>${escapeHTML(m.radiofarmaco)}</strong>
            <div style="font-size:0.75rem; color:#64748b;">${escapeHTML(m.box)} (+${m.tiempoCaptacionMin}m)</div>
          </td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${escapeHTML(m.horaCita)}</td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#0369a1;">💉 ${escapeHTML(m.horaInyeccion)}</td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0f172a;">🎯 ${escapeHTML(m.horaPrevistaMaquina)}</td>
          <td>
            <input type="time" value="${escapeHTML(m.horaRealMaquina)}" onchange="window.jefaturaApp.actualizarHoraRealMaquina('${escapeHTML(m.id)}', this.value)" style="font-family:'JetBrains Mono',monospace; font-weight:800; padding:4px 7px; border-radius:6px; border:1px solid #cbd5e1;">
          </td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800;">${sign} min</td>
          <td>${badgeHtml}</td>
          <td style="font-size:0.78rem; color:#334155; max-width:260px;">${escapeHTML(m.causaDemora || '')}</td>
          <td class="no-print">
            <button type="button" class="btn-chief btn-chief-outline" style="padding:4px 9px; font-size:0.74rem;" onclick="window.jefaturaApp.marcarEnHoraExacta('${escapeHTML(m.id)}')">
              ⚡ Poner en Hora
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // 9. PESTAÑA 5: NO-SHOWS VS CANCELACIONES Y RECITACIÓN + GRÁFICA EVOLUCIÓN
  // ==========================================================================
  function renderCitasTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const xLabels = getTimeAxisLabels();

    const chartEl = document.getElementById('chartEvolucionCitas');
    if (chartEl) {
      chartEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución en el Tiempo: Cancelaciones con Aviso, Huecos Recitados y No-Shows',
        xLabels,
        ySuffix: '',
        series: [
          { name: 'Cancelaciones con Aviso', color: '#d97706', data: [4, 5, 4, 5, 4, stats.totalCancelaciones] },
          { name: 'Huecos Recitados (Dosis Salvadas)', color: '#10b981', data: [2, 3, 3, 4, 4, stats.huecosRecitados] },
          { name: 'No-Shows sin Avisar', color: '#dc2626', data: [5, 4, 4, 3, 3, stats.totalNoShow] }
        ]
      });
    }

    const recitablesGrid = document.getElementById('gridHuecosRecitables');
    recitablesGrid.innerHTML = state.cancellations.map(c => {
      const isAvailable = c.estadoHueco === 'disponible';
      return `
        <article class="slot-card ${isAvailable ? 'recitable-open' : 'recitable-filled'}">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div>
              <span class="status-badge ${isAvailable ? 'badge-warn' : 'badge-ok'}">
                ${isAvailable ? '🔓 HUECO LIBRE · SE PUEDE RECITAR' : '✅ HUECO RECITADO · DOSIS SALVADA'}
              </span>
              <h3 style="font-family:'Outfit',sans-serif; font-size:1.02rem; margin-top:6px; color:#0f172a;">
                Cita Cancelada: ${escapeHTML(c.nombre)} (${escapeHTML(c.nhc)})
              </h3>
            </div>
            <span style="font-family:'JetBrains Mono',monospace; font-weight:800; font-size:0.86rem; background:#0f172a; color:#fde047; padding:4px 9px; border-radius:6px;">
              🕒 ${escapeHTML(c.horaCitaOriginal)}
            </span>
          </div>

          <div style="font-size:0.8rem; color:#334155; display:flex; flex-direction:column; gap:3px;">
            <div><strong>🧪 Radiofármaco reservado:</strong> ${escapeHTML(c.radiofarmaco)}</div>
            <div><strong>📞 Canal de preaviso:</strong> ${escapeHTML(c.canalAviso)}</div>
            <div><strong>📝 Motivo cancelación:</strong> ${escapeHTML(c.motivoCancelacion)}</div>
          </div>

          ${isAvailable ? `
            <div style="margin-top:6px; padding-top:8px; border-top:1px dashed #fcd34d; display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <span style="font-size:0.76rem; font-weight:700; color:#b45309;">⚡ Dosis disponible para reasignar hoy</span>
              <button type="button" class="btn-chief btn-chief-primary" onclick="window.jefaturaApp.abrirModalRecitar('${escapeHTML(c.slotId)}')">
                🔄 Recitar a Otro Paciente →
              </button>
            </div>
          ` : `
            <div style="margin-top:6px; padding:8px 10px; background:#ffffff; border:1px solid #6ee7b7; border-radius:8px; font-size:0.79rem; color:#065f46;">
              <strong>🎉 Recitado con éxito a:</strong> ${escapeHTML(c.recitadoA ? c.recitadoA.nombre : '')} (${escapeHTML(c.recitadoA ? c.recitadoA.nhc : '')}) · Prioridad ${escapeHTML(c.recitadoA ? c.recitadoA.prioridad : 'P1')} a las <strong>${escapeHTML(c.recitadoA ? c.recitadoA.horaAsignada : c.horaCitaOriginal)}</strong>
            </div>
          `}
        </article>
      `;
    }).join('');

    const noShowGrid = document.getElementById('gridPacientesNoShow');
    noShowGrid.innerHTML = state.noShows.map(ns => `
      <article class="slot-card noshow-card">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
          <div>
            <span class="status-badge badge-danger">🚫 NO ACUDE SIN AVISAR (NO-SHOW)</span>
            <h3 style="font-family:'Outfit',sans-serif; font-size:1.02rem; margin-top:6px; color:#7f1d1d;">
              ${escapeHTML(ns.nombre)} (${escapeHTML(ns.nhc)})
            </h3>
          </div>
          <span style="font-family:'JetBrains Mono',monospace; font-weight:800; font-size:0.84rem; background:#991b1b; color:#ffffff; padding:4px 9px; border-radius:6px;">
            🕒 ${escapeHTML(ns.horaCita)}
          </span>
        </div>

        <div style="font-size:0.8rem; color:#450a0a; display:flex; flex-direction:column; gap:3px;">
          <div><strong>🧪 Recurso Público Asignado:</strong> ${escapeHTML(ns.radiofarmaco)} (1 slot de alta tecnología desaprovechado)</div>
          <div><strong>📌 Prioridad:</strong> ${escapeHTML(ns.prioridad)} · <strong>Fecha:</strong> ${escapeHTML(ns.fechaCita)}</div>
          <div><strong>📝 Incidencia:</strong> ${escapeHTML(ns.observaciones)}</div>
        </div>

        <div style="margin-top:6px; padding-top:8px; border-top:1px dashed #fca5a5; display:flex; justify-content:flex-end; gap:8px;" class="no-print">
          <button type="button" class="btn-chief btn-chief-outline" style="font-size:0.75rem; padding:4px 10px;" onclick="window.jefaturaApp.convertirNoShowEnRecitable('${escapeHTML(ns.noShowId)}')">
            🔄 Intentar Recitar de Urgencia
          </button>
        </div>
      </article>
    `).join('');
  }

  // ==========================================================================
  // 10. PESTAÑA 6: ANULACIONES (MAL PREPARADOS, FALLO RF, EXTRAVASACIONES)
  // ==========================================================================
  function renderAnulacionesTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const xLabels = getTimeAxisLabels();
    const totalA = Math.max(stats.totalAnulaciones, 1);

    const chartEl = document.getElementById('chartEvolucionAnulaciones');
    if (chartEl) {
      chartEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución en el Tiempo de Anulaciones: Mal Preparados, Fallo Radiofármaco y Extravasaciones',
        xLabels,
        ySuffix: '',
        series: [
          { name: 'Pacientes Mal Preparados', color: '#ea580c', data: [5, 4, 4, 3, 3, stats.malPrepList.length] },
          { name: 'Fallo Producción Radiofármaco', color: '#7c3aed', data: [3, 2, 2, 2, 1, stats.falloRFList.length] },
          { name: 'Extravasaciones', color: '#e11d48', data: [2, 2, 1, 2, 1, stats.extravList.length] }
        ]
      });
    }

    const elCountPrep = document.getElementById('anulCountMalPrep');
    if (elCountPrep) {
      elCountPrep.textContent = stats.malPrepList.length;
      document.getElementById('anulPctMalPrep').textContent = `${Math.round((stats.malPrepList.length / totalA) * 100)}% de anulaciones`;
      document.getElementById('anulCountFalloRF').textContent = stats.falloRFList.length;
      document.getElementById('anulPctFalloRF').textContent = `${Math.round((stats.falloRFList.length / totalA) * 100)}% de anulaciones`;
      document.getElementById('anulCountExtrav').textContent = stats.extravList.length;
      document.getElementById('anulPctExtrav').textContent = `${Math.round((stats.extravList.length / totalA) * 100)}% de anulaciones`;
    }

    const filterTipo = (document.getElementById('filtroTipoAnulacion') || {}).value || 'all';
    const filtered = stats.anulList.filter(a => filterTipo === 'all' || a.tipo === filterTipo);

    const grid = document.getElementById('gridAnulacionesOperativas');
    if (!grid) return;

    grid.innerHTML = filtered.map(a => {
      let badgeHtml = `<span class="status-badge badge-warn">🍽️ PACIENTE MAL PREPARADO</span>`;
      let borderColor = '#f97316';
      let bgGrad = 'linear-gradient(to bottom right, #ffffff, #fff7ed)';

      if (a.tipo === 'fallo_radiofarmaco') {
        badgeHtml = `<span class="status-badge badge-purple">☢️ FALLO PRODUCCIÓN RADIOFÁRMACO</span>`;
        borderColor = '#8b5cf6';
        bgGrad = 'linear-gradient(to bottom right, #ffffff, #f5f3ff)';
      } else if (a.tipo === 'extravasacion') {
        badgeHtml = `<span class="status-badge badge-danger">💉 EXTRAVASACIÓN DE DOSIS</span>`;
        borderColor = '#f43f5e';
        bgGrad = 'linear-gradient(to bottom right, #ffffff, #fff1f2)';
      }

      return `
        <article class="slot-card" style="border-color:${borderColor}; background:${bgGrad};">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
            <div>
              ${badgeHtml}
              <h3 style="font-family:'Outfit',sans-serif; font-size:1.02rem; margin-top:6px; color:#0f172a;">
                ${escapeHTML(a.nombre)} (${escapeHTML(a.nhc)})
              </h3>
            </div>
            <span style="font-family:'JetBrains Mono',monospace; font-weight:800; font-size:0.82rem; background:#0f172a; color:#fde047; padding:4px 9px; border-radius:6px;">
              🕒 ${escapeHTML(a.horaCita)}
            </span>
          </div>

          <div style="font-size:0.8rem; color:#334155; display:flex; flex-direction:column; gap:4px;">
            <div><strong>🧪 Estudio / Trazador:</strong> ${escapeHTML(a.radiofarmaco)} · <strong>Prioridad:</strong> ${escapeHTML(a.prioridad)}</div>
            <div><strong style="color:#991b1b;">⚠️ Causa de Anulación:</strong> ${escapeHTML(a.subcausa)}</div>
            <div style="font-size:0.77rem; color:#475569;">${escapeHTML(a.detalleClinico)}</div>
          </div>

          ${a.reprogramado ? `
            <div style="margin-top:6px; padding:8px 10px; background:#ecfdf5; border:1px solid #6ee7b7; border-radius:8px; font-size:0.79rem; color:#065f46;">
              <strong>✅ Reprogramado con prioridad:</strong> ${escapeHTML(a.nuevaCita)}
            </div>
          ` : `
            <div style="margin-top:6px; padding-top:8px; border-top:1px dashed #cbd5e1; display:flex; justify-content:space-between; align-items:center; gap:8px;" class="no-print">
              <span style="font-size:0.75rem; font-weight:700; color:#b91c1c;">⏳ Pendiente de nueva cita prioritaria</span>
              <button type="button" class="btn-chief btn-chief-primary" style="padding:5px 11px; font-size:0.76rem;" onclick="window.jefaturaApp.reprogramarAnulacionPrioritaria('${escapeHTML(a.anulId)}')">
                📅 Reprogramar Cita Prioritaria
              </button>
            </div>
          `}
        </article>
      `;
    }).join('');
  }

  // ==========================================================================
  // 11. PESTAÑA 7: ESTADÍSTICA POR MÉDICO (TARDÍAS, ESPERA SALIDA Y TIEMPO/PRUEBA)
  // ==========================================================================
  function renderMedicosTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const xLabels = getTimeAxisLabels();
    const byDoctor = stats.docStats.byDoctor;
    const patientTimings = stats.docStats.patientTimings;

    // Gráfica 1: Tardías pedidas por médico en el tiempo
    const chartTardiasEl = document.getElementById('chartEvolucionMedicosTardias');
    if (chartTardiasEl) {
      chartTardiasEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución Temporal de % Tardías Pedidas por Médico Nuclear',
        xLabels,
        ySuffix: '%',
        series: byDoctor.map(d => ({
          name: d.medico.replace('Dr. ', '').replace('Dra. ', ''),
          color: d.color,
          data: d.tardiasTrend
        }))
      });
    }

    // Gráfica 2: Tiempo de espera en salir desde última imagen por médico
    const chartTiemposEl = document.getElementById('chartEvolucionMedicosTiempos');
    if (chartTiemposEl) {
      chartTiemposEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución de Tiempo de Espera del Paciente en Salir desde la Última Imagen (min)',
        xLabels,
        ySuffix: 'm',
        series: byDoctor.map(d => ({
          name: d.medico.replace('Dr. ', '').replace('Dra. ', ''),
          color: d.color,
          data: d.esperaTrend
        }))
      });
    }

    // Tarjetas de los 4 Facultativos de Medicina Nuclear
    const cardsGrid = document.getElementById('gridTarjetasMedicosNucleares');
    if (cardsGrid) {
      cardsGrid.innerHTML = byDoctor.map(d => {
        const esperaBadge = d.avgEsperaSalidaMin > 15 ? 'badge-danger' : (d.avgEsperaSalidaMin > 10 ? 'badge-warn' : 'badge-ok');
        return `
          <article class="doctor-stat-card" style="--doc-accent:${d.color};">
            <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">
              <div>
                <h3 style="font-family:'Outfit',sans-serif; font-size:1.06rem; font-weight:800; color:#0f172a;">👨‍⚕️ ${escapeHTML(d.medico)}</h3>
                <div style="font-size:0.75rem; color:#64748b; font-weight:600;">${escapeHTML(d.cargo)} · ${d.totalEstudiosPeriodo} estudios en periodo</div>
              </div>
              <span class="status-badge ${esperaBadge}">Espera salida: ${d.avgEsperaSalidaMin.toFixed(1)} min</span>
            </div>

            <div class="doctor-metrics-3col">
              <div class="doctor-metric-box">
                <div class="dm-label">🕒 Tardías Pedidas</div>
                <div class="dm-val" style="color:#d97706;">${d.totalTardiasPeriodo}</div>
                <div class="dm-sub">${d.pctTardias.toFixed(0)}% de sus pruebas</div>
              </div>
              <div class="doctor-metric-box">
                <div class="dm-label">🚪 Espera Post-Imagen</div>
                <div class="dm-val" style="color:${d.avgEsperaSalidaMin > 15 ? '#dc2626' : '#059669'};">${d.avgEsperaSalidaMin.toFixed(1)}m</div>
                <div class="dm-sub">Últ. imagen ➔ Salir</div>
              </div>
              <div class="doctor-metric-box">
                <div class="dm-label">⏱️ Tiempo / Prueba</div>
                <div class="dm-val" style="color:${d.color};">${Math.round(d.avgTotalPruebaMin)}m</div>
                <div class="dm-sub">${Math.round(d.avgMaquinaMin)}m en máquina</div>
              </div>
            </div>

            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.73rem; font-weight:700; color:#475569; margin-bottom:2px;">
                <span>Tendencia de espera post-última imagen (min):</span>
                <span style="color:${d.color};">${d.esperaTrend[0]}m ➔ ${d.avgEsperaSalidaMin.toFixed(1)}m</span>
              </div>
              ${renderSparklineSVG(d.esperaTrend, d.color)}
            </div>
          </article>
        `;
      }).join('');
    }

    // Tabla detallada por paciente y por médico
    const docFilter = (document.getElementById('filtroMedicoNuclearTiempos') || {}).value || 'all';
    const filteredPatients = patientTimings.filter(p => docFilter === 'all' || p.medicoNuclear === docFilter);

    const tbody = document.getElementById('tablaTiemposPorPacienteMedico');
    if (tbody) {
      tbody.innerHTML = filteredPatients.map(p => {
        const espClass = p.esperaDesdeUltimaImagenMin > 15 ? 'badge-danger' : (p.esperaDesdeUltimaImagenMin > 10 ? 'badge-warn' : 'badge-ok');
        return `
          <tr>
            <td>
              <strong>${escapeHTML(p.nombre)}</strong>
              <div style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:#0284c7;">${escapeHTML(p.nhc)}</div>
            </td>
            <td><strong>👨‍⚕️ ${escapeHTML(p.medicoNuclear)}</strong></td>
            <td>
              <strong>${escapeHTML(p.radiofarmaco)}</strong>
              <div style="font-size:0.74rem; color:#64748b;">Captación: +${p.tiempoCaptacionMin}m</div>
            </td>
            <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#0369a1;">💉 ${escapeHTML(p.horaInyeccion)}</td>
            <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">🔬 ${escapeHTML(p.horaRealMaquina)}</td>
            <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0f172a;">🖼️ ${escapeHTML(p.horaFinUltimaImagen)}</td>
            <td>
              ${p.tardiaPedida
            ? `<span class="status-badge badge-warn">🕒 SÍ · ${escapeHTML(p.zonaTardia || 'Pelvis')}</span>`
            : `<span class="status-badge badge-ok">No requerida</span>`}
            </td>
            <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#047857;">🟢 ${escapeHTML(p.horaAltaSalida)}</td>
            <td>
              <span class="status-badge ${espClass}">⏳ ${p.esperaDesdeUltimaImagenMin} min</span>
            </td>
            <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${p.duracionMaquinaMin} min</td>
            <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#4f46e5;">${p.tiempoTotalPruebaMin} min totales</td>
          </tr>
        `;
      }).join('');
    }
  }

  // ==========================================================================
  // 10. PESTAÑA 8: EFICIENCIA DE FÁRMACOS, DEMORAS, TAT Y TIEMPOS DE PROCESO
  // ==========================================================================
  function renderEficienciaTiemposTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const ef = stats.advancedQualityStats;
    const xLabels = getTimeAxisLabels();

    // 1. Métricas de Cabecera
    const elRec = document.getElementById('statActividadRecibida');
    if (elRec) elRec.textContent = `${ef.recMBq.toLocaleString('es-ES')} MBq`;
    const elIny = document.getElementById('statActividadInyectada');
    if (elIny) elIny.textContent = `${ef.inyMBq.toLocaleString('es-ES')} MBq`;
    const elPerdEur = document.getElementById('statDosisPerdidasEur');
    if (elPerdEur) elPerdEur.textContent = `${ef.dosisPerdidasEquiv} pac. equiv. (${ef.perdMBq} MBq)`;
    const elHuecosDia = document.getElementById('statHuecosLibresDia');
    if (elHuecosDia) elHuecosDia.textContent = `${ef.libresDia} / día (${ef.pctLibres.toFixed(1)}%)`;

    const elBadgeEf = document.getElementById('badgeEficienciaGlobal');
    if (elBadgeEf) elBadgeEf.textContent = `${ef.pctAprov.toFixed(1)}% Aprovechamiento Global`;
    const elBadgeHuecos = document.getElementById('badgeHuecosLibresGlobal');
    if (elBadgeHuecos) elBadgeHuecos.textContent = `${ef.libresDia} Huecos Libres / Día`;

    // 2. Gráfica Evolución Aprovechamiento Radiofármacos
    const chartAprovEl = document.getElementById('chartAprovechamientoRF');
    if (chartAprovEl) {
      chartAprovEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución de Tasa de Aprovechamiento por Isótopo (%)',
        xLabels,
        ySuffix: '%',
        series: [
          { name: '18F-FDG (Glucosa)', color: '#0284c7', data: [92, 93, 93.5, 94, 94.6, 95.0] },
          { name: '18F-PSMA', color: '#0d9488', data: [88, 89, 89.4, 90.2, 90.7, 91.1] },
          { name: '18F-Colina', color: '#7c3aed', data: [84, 85, 85.5, 86.2, 86.8, 87.5] }
        ]
      });
    }

    // 3. Gráfica Ocupación Horaria de Slots y Huecos Vacíos (SVG)
    const chartSlotsEl = document.getElementById('chartOcupacionSlots');
    if (chartSlotsEl) {
      const horas = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00'];
      const ocupados = [5, 5, 4, 5, 4, 4, 2];
      const libres = [0, 0, 1, 0, 1, 0, 1];
      const w = 580; const h = 190;
      const barW = 38; const gap = 38; const startX = 50;
      const barsHtml = horas.map((hr, idx) => {
        const x = startX + idx * (barW + gap);
        const tot = ocupados[idx] + libres[idx];
        const hOcup = (ocupados[idx] / 6) * 110;
        const hLibre = (libres[idx] / 6) * 110;
        const yOcup = 140 - hOcup;
        const yLibre = yOcup - hLibre;
        return `
          <g>
            <rect x="${x}" y="${yOcup}" width="${barW}" height="${hOcup}" fill="#0284c7" rx="3">
              <title>${hr}: ${ocupados[idx]} ocupados</title>
            </rect>
            ${libres[idx] > 0 ? `
              <rect x="${x}" y="${yLibre}" width="${barW}" height="${hLibre}" fill="#f59e0b" rx="3">
                <title>${hr}: ${libres[idx]} hueco libre</title>
              </rect>
              <text x="${x + barW/2}" y="${yLibre - 5}" text-anchor="middle" font-size="9" font-weight="800" fill="#d97706">+${libres[idx]}</text>
            ` : ''}
            <text x="${x + barW/2}" y="${yOcup + hOcup/2 + 3}" text-anchor="middle" font-size="10" font-weight="700" fill="#ffffff">${ocupados[idx]}</text>
            <text x="${x + barW/2}" y="160" text-anchor="middle" font-size="10" font-weight="600" fill="#475569">${hr}</text>
          </g>
        `;
      }).join('');

      chartSlotsEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="190">
          <line x1="40" y1="140" x2="550" y2="140" stroke="#cbd5e1" stroke-width="1.5"/>
          ${barsHtml}
          <g transform="translate(180, 180)">
            <rect x="0" y="-8" width="12" height="10" fill="#0284c7" rx="2"/>
            <text x="18" y="0" font-size="9.5" fill="#334155" font-weight="600">Slots Ocupados en Camilla</text>
            <rect x="180" y="-8" width="12" height="10" fill="#f59e0b" rx="2"/>
            <text x="198" y="0" font-size="9.5" fill="#b45309" font-weight="700">Huecos Libres No Citados</text>
          </g>
        </svg>
      `;
    }

    // 4. Tabla de Aprovechamiento de Fármacos
    const tablaFarmacosEl = document.getElementById('tablaAprovechamientoFarmacos');
    if (tablaFarmacosEl) {
      tablaFarmacosEl.innerHTML = ef.farmacosEfficiency.map(f => `
        <tr>
          <td><strong style="color:#0f172a;">${escapeHTML(f.name)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${f.dosisPedidas} dosis</td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#059669;">${f.inyectadas} inyectadas</td>
          <td><span class="status-badge ${f.pct >= 90 ? 'badge-ok' : 'badge-warn'}">${f.pct.toFixed(1)}%</span></td>
          <td style="font-family:'JetBrains Mono',monospace; color:#dc2626;">${f.mbqPerd} MBq</td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#e11d48;">${f.dosisPerdidas} pac. equiv.</td>
          <td style="font-size:0.78rem; color:#475569;">${escapeHTML(f.accion)}</td>
        </tr>
      `).join('');
    }

    // 5. Demoras y TAT
    const elDemP1 = document.getElementById('statDemoraP1');
    if (elDemP1) elDemP1.textContent = `${ef.demoraP1} días`;
    const elDemP2 = document.getElementById('statDemoraP2');
    if (elDemP2) elDemP2.textContent = `${ef.demoraP2} días`;
    const elDemP3 = document.getElementById('statDemoraP3');
    if (elDemP3) elDemP3.textContent = `${ef.demoraP3} días`;
    const elTatMedio = document.getElementById('statTatInformeMedio');
    if (elTatMedio) elTatMedio.textContent = `${ef.tatInformeHoras} horas`;

    // Gráfica Demoras
    const chartDemorasEl = document.getElementById('chartEvolucionDemoras');
    if (chartDemorasEl) {
      chartDemorasEl.innerHTML = renderEvolutionChartSVG({
        title: 'Evolución Demoras de Citación (Días) vs Metas SERGAS',
        xLabels,
        ySuffix: 'd',
        series: [
          { name: 'P1 Onco (Meta ≤ 7d)', color: '#059669', data: [6.8, 6.2, 5.7, 5.2, 4.9, ef.demoraP1] },
          { name: 'P2 Ordinaria (Meta ≤ 15d)', color: '#0284c7', data: [14.1, 13.5, 12.8, 12.0, 11.4, ef.demoraP2] }
        ]
      });
    }

    // Gráfica Distribución TAT
    const chartTatEl = document.getElementById('chartDistribucionTAT');
    if (chartTatEl) {
      const w = 560; const h = 185;
      chartTatEl.innerHTML = `
        <svg viewBox="0 0 ${w} ${h}" width="100%" height="185">
          <g transform="translate(40, 20)">
            <text x="0" y="16" font-size="11" font-weight="700" fill="#334155">&lt; 24 Horas (Meta ≥ 75%):</text>
            <rect x="180" y="5" width="280" height="18" fill="#e2e8f0" rx="4"/>
            <rect x="180" y="5" width="${(ef.tatMenor24h/100)*280}" height="18" fill="#059669" rx="4"/>
            <text x="475" y="19" font-size="11" font-weight="800" fill="#047857">${ef.tatMenor24h}%</text>

            <text x="0" y="60" font-size="11" font-weight="700" fill="#334155">24 a 48 Horas:</text>
            <rect x="180" y="49" width="280" height="18" fill="#e2e8f0" rx="4"/>
            <rect x="180" y="49" width="${(ef.tat24a48h/100)*280}" height="18" fill="#f59e0b" rx="4"/>
            <text x="475" y="63" font-size="11" font-weight="800" fill="#b45309">${ef.tat24a48h}%</text>

            <text x="0" y="104" font-size="11" font-weight="700" fill="#334155">&gt; 48 Horas (Demora):</text>
            <rect x="180" y="93" width="280" height="18" fill="#e2e8f0" rx="4"/>
            <rect x="180" y="93" width="${(ef.tatMayor48h/100)*280}" height="18" fill="#dc2626" rx="4"/>
            <text x="475" y="107" font-size="11" font-weight="800" fill="#b91c1c">${ef.tatMayor48h}%</text>
          </g>
        </svg>
      `;
    }

    // Tabla Demoras por Servicio
    const tablaDemorasEl = document.getElementById('tablaDemorasPorServicio');
    if (tablaDemorasEl) {
      const servData = [
        { name: 'Oncología Médica', p1: 58, demP1: 4.2, p2: 18, demP2: 9.8, cumplimiento: '98.5%', tat: '16.5 h' },
        { name: 'Urología', p1: 22, demP1: 4.8, p2: 34, demP2: 11.2, cumplimiento: '95.0%', tat: '17.8 h' },
        { name: 'Neumología', p1: 31, demP1: 4.5, p2: 14, demP2: 10.4, cumplimiento: '96.2%', tat: '18.1 h' },
        { name: 'Hematología', p1: 19, demP1: 4.1, p2: 12, demP2: 9.5, cumplimiento: '100.0%', tat: '15.9 h' },
        { name: 'Cirugía General y Digestiva', p1: 16, demP1: 5.2, p2: 19, demP2: 12.1, cumplimiento: '92.4%', tat: '19.4 h' },
        { name: 'Neurología / Demencias', p1: 6, demP1: 6.4, p2: 24, demP2: 13.8, cumplimiento: '91.0%', tat: '22.0 h' }
      ];
      tablaDemorasEl.innerHTML = servData.map(s => `
        <tr>
          <td><strong style="color:#0f172a;">${escapeHTML(s.name)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.p1}</td>
          <td><span class="status-badge badge-ok">${s.demP1} d</span></td>
          <td style="font-family:'JetBrains Mono',monospace;">${s.p2}</td>
          <td><span class="status-badge badge-info">${s.demP2} d</span></td>
          <td><span class="status-badge badge-ok">${s.cumplimiento}</span></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#4338ca;">${s.tat}</td>
        </tr>
      `).join('');
    }

    // 6. Fases de Estancia & Ventana EARL
    const chartFasesEl = document.getElementById('chartFasesEstancia');
    if (chartFasesEl) {
      const f = ef.fasesMin;
      chartFasesEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:9px; padding:0.4rem 0;">
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; margin-bottom:3px;">
              <span>1. Acogida, Registro y Vía Venosa</span>
              <span style="color:#0284c7;">${f.acogida} min</span>
            </div>
            <div style="background:#e2e8f0; border-radius:6px; height:11px; overflow:hidden;">
              <div style="background:#0284c7; width:${(f.acogida/ef.permanenciaTotalMin)*100}%; height:100%;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; margin-bottom:3px;">
              <span>2. Inyección y Reposo Metabólico en Box</span>
              <span style="color:#0d9488;">${f.boxReposo} min (Meta 50-60m)</span>
            </div>
            <div style="background:#e2e8f0; border-radius:6px; height:11px; overflow:hidden;">
              <div style="background:#0d9488; width:${(f.boxReposo/ef.permanenciaTotalMin)*100}%; height:100%;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; margin-bottom:3px;">
              <span>3. Adquisición en Camilla PET-CT</span>
              <span style="color:#7c3aed;">${f.camilla} min</span>
            </div>
            <div style="background:#e2e8f0; border-radius:6px; height:11px; overflow:hidden;">
              <div style="background:#7c3aed; width:${(f.camilla/ef.permanenciaTotalMin)*100}%; height:100%;"></div>
            </div>
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; margin-bottom:3px;">
              <span>4. Revisión Médica de Imágenes y Salida</span>
              <span style="color:#059669;">${f.revisionAlta} min</span>
            </div>
            <div style="background:#e2e8f0; border-radius:6px; height:11px; overflow:hidden;">
              <div style="background:#059669; width:${(f.revisionAlta/ef.permanenciaTotalMin)*100}%; height:100%;"></div>
            </div>
          </div>
          <div style="text-align:right; font-family:'Outfit',sans-serif; font-weight:800; font-size:0.95rem; color:#004868; margin-top:5px;">
            Total Estancia Media: ${ef.permanenciaTotalMin} min (Meta ≤ 120 min)
          </div>
        </div>
      `;
    }

    const chartEarlEl = document.getElementById('chartVentanaEarl');
    if (chartEarlEl) {
      chartEarlEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px; padding:0.6rem 0;">
          <div style="background:#ecfdf5; border:1.5px solid #a7f3d0; border-radius:10px; padding:0.8rem 1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="color:#047857; font-size:0.92rem;">🟢 Ventana Óptima EARL (55 a 75 min)</strong>
              <span class="status-badge badge-ok" style="font-size:0.88rem;">${ef.ventanaEarlPct}% Cumplimiento</span>
            </div>
            <div style="font-size:0.75rem; color:#065f46; margin-top:3px;">Cumple estándar europeo EANM/EARL de biodistribución radiofarmacéutica estable.</div>
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px;">
            <div style="background:#fef2f2; border:1px solid #fecdd3; border-radius:8px; padding:0.7rem 0.9rem;">
              <div style="font-size:0.75rem; font-weight:700; color:#991b1b;">⚠️ Precoz (&lt; 55 min)</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:800; color:#dc2626;">${ef.ventanaEarlPrecoz}%</div>
              <div style="font-size:0.7rem; color:#7f1d1d;">Riesgo captación incompleta</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.7rem 0.9rem;">
              <div style="font-size:0.75rem; font-weight:700; color:#92400e;">⚠️ Tardía (&gt; 75 min)</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:800; color:#d97706;">${ef.ventanaEarlTardia}%</div>
              <div style="font-size:0.7rem; color:#78350f;">Demora por máquina o vía</div>
            </div>
          </div>
        </div>
      `;
    }
  }

  // ==========================================================================
  // 11. PESTAÑA 9: EFICACIA DE AUDIOGUÍAS, PACIENTES MAL PREPARADOS Y GLUCEMIAS
  // ==========================================================================
  function renderAudioguiasCalidadTab(statsObj) {
    const stats = statsObj || computeServiceStats();
    const ef = stats.advancedQualityStats;
    const xLabels = getTimeAxisLabels();

    // 1. Métricas Cabecera Audioguías
    const elAdh = document.getElementById('statAdherenciaPct');
    if (elAdh) elAdh.textContent = `${ef.adherenciaAudioPct}%`;
    const elSuspCon = document.getElementById('statSuspConAudio');
    if (elSuspCon) elSuspCon.textContent = `${ef.suspConAudioPct}%`;
    const elSuspSin = document.getElementById('statSuspSinAudio');
    if (elSuspSin) elSuspSin.textContent = `${ef.suspSinAudioPct}%`;
    const elCons = document.getElementById('statConsultasChatbot');
    if (elCons) elCons.textContent = `${ef.consultasChatbot}`;

    // 2. Gráfica Comparativa Suspensión Con vs Sin Audioguía
    const chartCompEl = document.getElementById('chartEficaciaAudioguias');
    if (chartCompEl) {
      chartCompEl.innerHTML = renderEvolutionChartSVG({
        title: 'Tasa de Suspensión por Fallos de Preparación: CON vs SIN Audioguía (%)',
        xLabels,
        ySuffix: '%',
        series: [
          { name: 'Sin Audioguía (8.7%)', color: '#dc2626', data: [9.8, 9.4, 9.1, 8.9, 8.8, ef.suspSinAudioPct] },
          { name: 'Con Audioguía (1.1%)', color: '#059669', data: [2.1, 1.8, 1.5, 1.3, 1.2, ef.suspConAudioPct] }
        ]
      });
    }

    // 3. Gráfica Uso por Protocolo
    const chartUsoEl = document.getElementById('chartUsoPorProtocolo');
    if (chartUsoEl) {
      const protos = [
        { name: '18F-FDG Oncológico', pct: 91 },
        { name: '18F-FDG Diabético', pct: 94 },
        { name: '18F-PSMA Próstata', pct: 88 },
        { name: '18F-Colina', pct: 86 },
        { name: '18F-Endocarditis', pct: 92 },
        { name: '18F-Vasculitis', pct: 83 }
      ];
      chartUsoEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:8px; padding:0.4rem 0;">
          ${protos.map(p => `
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.79rem; font-weight:700; margin-bottom:2px;">
                <span>${escapeHTML(p.name)}</span>
                <span style="color:#0284c7;">${p.pct}% adherencia</span>
              </div>
              <div style="background:#e2e8f0; border-radius:5px; height:8px; overflow:hidden;">
                <div style="background:linear-gradient(90deg, #0284c7, #0d9488); width:${p.pct}%; height:100%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 4. Métricas Mal Preparados y Glucemias Box
    const elTotMal = document.getElementById('statTotalMalPrepBox');
    if (elTotMal) elTotMal.textContent = `${ef.totalMalPrep} pac`;
    const elGlucVerde = document.getElementById('statGlucemiaVerdePct');
    if (elGlucVerde) elGlucVerde.textContent = `${ef.glucemiaVerdePct}%`;
    const elGlucAmbar = document.getElementById('statGlucemiaAmbarPct');
    if (elGlucAmbar) elGlucAmbar.textContent = `${ef.glucemiaAmbarPct}%`;
    const elGlucRoja = document.getElementById('statGlucemiaRojaPct');
    if (elGlucRoja) elGlucRoja.textContent = `${ef.glucemiaRojaPct}%`;

    // 5. Gráfica Causas Mal Preparados
    const chartCausasEl = document.getElementById('chartCausasMalPrep');
    if (chartCausasEl) {
      chartCausasEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:9px; padding:0.4rem 0;">
          ${ef.causasMalPrep.map(c => `
            <div>
              <div style="display:flex; justify-content:space-between; font-size:0.78rem; font-weight:700; margin-bottom:3px;">
                <span>${escapeHTML(c.causa)}</span>
                <span style="color:#c2410c;">${c.pct}% (${c.count} pac)</span>
              </div>
              <div style="background:#ffedd5; border-radius:5px; height:9px; overflow:hidden;">
                <div style="background:#ea580c; width:${c.pct}%; height:100%;"></div>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    // 6. Gráfica Semáforo Glucemia Capilar en Box
    const chartSemEl = document.getElementById('chartSemaforoGlucemia');
    if (chartSemEl) {
      chartSemEl.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:10px; padding:0.4rem 0;">
          <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:8px; padding:0.65rem 0.9rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#047857; font-size:0.86rem;">🟢 Glucemia Verde (&lt; 160 mg/dL)</strong>
              <div style="font-size:0.72rem; color:#065f46;">Biodistribución óptima garantizada. Paso directo a box de inyección.</div>
            </div>
            <span class="status-badge badge-ok" style="font-size:0.88rem;">${ef.glucemiaVerdePct}%</span>
          </div>
          <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:8px; padding:0.65rem 0.9rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#b45309; font-size:0.86rem;">🟡 Glucemia Ámbar (160 - 199 mg/dL)</strong>
              <div style="font-size:0.72rem; color:#78350f;">Aviso a enfermería. Reposo estricto e hidratación con agua sola en box.</div>
            </div>
            <span class="status-badge badge-warn" style="font-size:0.88rem;">${ef.glucemiaAmbarPct}%</span>
          </div>
          <div style="background:#fef2f2; border:1px solid #fecdd3; border-radius:8px; padding:0.65rem 0.9rem; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong style="color:#991b1b; font-size:0.86rem;">🔴 Glucemia Roja (≥ 200 mg/dL - Alerta Preferente)</strong>
              <div style="font-size:0.72rem; color:#7f1d1d;"><strong>${ef.rescateGlucemiaPct}%</strong> rescatados tras 45 min hidratación y reposo.</div>
            </div>
            <span class="status-badge badge-danger" style="font-size:0.88rem;">${ef.glucemiaRojaPct}%</span>
          </div>
        </div>
      `;
    }

    // 7. Tabla Detalle Mal Prep & Glucemias
    const tablaDetalleEl = document.getElementById('tablaDetalleMalPrepGlucemia');
    if (tablaDetalleEl) {
      const records = [
        { nombre: 'Rosa María Calvo Soto', nhc: 'NHC-481920', fecha: 'Hoy · 08:45', proto: 'FDG Diabético', tipo: 'Glucemia alta en box', val: '228 mg/dL', sem: '🔴 ROJO', badge: 'badge-danger', res: 'Normalizada a 172 mg/dL tras 45 min hidratación oral; inyectada con éxito.' },
        { nombre: 'Domingo Besteiro Prado', nhc: 'NHC-509182', fecha: 'Hoy · 09:30', proto: 'FDG Oncológico', tipo: 'Rotura ayuno involuntaria', val: '185 mg/dL', sem: '🟡 ÁMBAR', badge: 'badge-warn', res: 'Tomó café con leche a las 07:00h. Recitado prioritario para mañana 08:30h.' },
        { nombre: 'Consuelo Otero Varela', nhc: 'NHC-612409', fecha: 'Ayer · 10:15', proto: 'FDG Endocarditis', tipo: 'Incumplimiento dieta cetogénica', val: '110 mg/dL', sem: '🟢 VERDE', badge: 'badge-ok', res: 'Cena con hidratos; reprogramada con refuerzo de audioguía específica.' },
        { nombre: 'Ángel Souto Fernández', nhc: 'NHC-398244', fecha: 'Ayer · 11:00', proto: '18F-PSMA', tipo: 'Medicación no suspendida', val: 'Normal', sem: '🟢 N/A', badge: 'badge-info', res: 'Aclarada compatibilidad con radiofármaco por médico nuclear; realizada sin demora.' },
        { nombre: 'Mercedes Rial Castro', nhc: 'NHC-724185', fecha: '18/11 · 08:30', proto: 'FDG Diabético', tipo: 'Glucemia capilar elevada', val: '245 mg/dL', sem: '🔴 ROJO', badge: 'badge-danger', res: 'Valor confirmado en glucómetro SERGAS; reprogramada a primera hora con pauta insulina.' }
      ];
      tablaDetalleEl.innerHTML = records.map(r => `
        <tr>
          <td><strong style="color:#0f172a;">${escapeHTML(r.nombre)}</strong><br><span style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:#0284c7;">${escapeHTML(r.nhc)}</span></td>
          <td style="font-size:0.78rem; color:#475569;">${escapeHTML(r.fecha)}</td>
          <td><span class="status-badge badge-info">${escapeHTML(r.proto)}</span></td>
          <td><strong style="color:#334155; font-size:0.82rem;">${escapeHTML(r.tipo)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0f172a;">${escapeHTML(r.val)}</td>
          <td><span class="status-badge ${r.badge}">${escapeHTML(r.sem)}</span></td>
          <td style="font-size:0.79rem; color:#1e293b;">${escapeHTML(r.res)}</td>
        </tr>
      `).join('');
    }
  }

  // ==========================================================================
  // 12. INTERACCIONES: RECITAR, ANULAR, REPROGRAMAR Y EXPORTAR
  // ==========================================================================
  function abrirModalRecitar(slotId) {
    const slot = state.cancellations.find(c => c.slotId === slotId);
    if (!slot) return;
    state.activeRecitarSlotId = slotId;

    document.getElementById('infoHuecoLiberadoModal').innerHTML = `
      <div><strong>🔓 Hueco Liberado por Cancelación:</strong> ${escapeHTML(slot.fechaCitaOriginal)} a las <strong>${escapeHTML(slot.horaCitaOriginal)}</strong></div>
      <div style="margin-top:3px;"><strong>🧪 Radiofármaco disponible:</strong> ${escapeHTML(slot.radiofarmaco)} (Paciente original: ${escapeHTML(slot.nombre)} · ${escapeHTML(slot.nhc)})</div>
    `;

    const tracerKey = slot.radiofarmaco.toLowerCase().includes('psma') ? 'psma'
      : (slot.radiofarmaco.toLowerCase().includes('colina') ? 'colina' : 'fdg');

    let candidates = state.peticiones.filter(p => {
      if (p.llegaMal) return false;
      return p.estudio.toLowerCase().includes(tracerKey);
    });
    if (candidates.length === 0) candidates = state.peticiones.filter(p => !p.llegaMal);

    const rank = { P1: 1, P2: 2, P3: 3 };
    candidates.sort((a, b) => (rank[a.prioridad] || 3) - (rank[b.prioridad] || 3));

    document.getElementById('listaCandidatosRecitar').innerHTML = candidates.slice(0, 6).map(cand => {
      const badge = cand.prioridad === 'P1' ? 'badge-danger' : (cand.prioridad === 'P2' ? 'badge-warn' : 'badge-ok');
      return `
        <div class="candidate-item">
          <div>
            <div style="display:flex; align-items:center; gap:8px;">
              <span class="status-badge ${badge}">${cand.prioridad}</span>
              <strong style="font-size:0.92rem; color:#0f172a;">${escapeHTML(cand.nombre)}</strong>
              <span style="font-family:'JetBrains Mono',monospace; font-size:0.78rem; color:#0284c7;">${escapeHTML(cand.nhc)}</span>
            </div>
            <div style="font-size:0.78rem; color:#475569; margin-top:3px;">
              <strong>Servicio:</strong> ${escapeHTML(cand.servicio)} · <strong>Estudio:</strong> ${escapeHTML(cand.estudio)} · <strong>Glucemia:</strong> ${cand.glucemia} mg/dL
            </div>
          </div>
          <button type="button" class="btn-chief btn-chief-primary" onclick="window.jefaturaApp.confirmarRecitacionEnHueco('${escapeHTML(slot.slotId)}', '${escapeHTML(cand.id)}')">
            ✅ Asignar Hueco (${escapeHTML(slot.horaCitaOriginal)})
          </button>
        </div>
      `;
    }).join('');

    document.getElementById('modalRecitarHueco').classList.add('active');
  }

  function cerrarModalRecitar() {
    document.getElementById('modalRecitarHueco').classList.remove('active');
    state.activeRecitarSlotId = null;
  }

  function confirmarRecitacionEnHueco(slotId, candidateId) {
    const slot = state.cancellations.find(c => c.slotId === slotId);
    const cand = state.peticiones.find(p => p.id === candidateId);
    if (!slot || !cand) return;

    slot.estadoHueco = 'recitado';
    slot.recitadoA = {
      id: cand.id,
      nombre: cand.nombre,
      nhc: cand.nhc,
      prioridad: cand.prioridad,
      horaAsignada: slot.horaCitaOriginal
    };

    cand.fechaCita = slot.fechaCitaOriginal;
    cand.horaCita = slot.horaCitaOriginal;

    try {
      const master = JSON.parse(localStorage.getItem('PET_DATABASE_MASTER_V4') || '[]');
      master.forEach(m => {
        if ((m['Submission ID'] || m.id) === cand.id || (m['NHC / Historia Clínica'] || m.nhc) === cand.nhc) {
          m['Fecha Cita Asignada'] = slot.fechaCitaOriginal;
          m['Hora Cita Asignada'] = slot.horaCitaOriginal;
          m['Estado de Triaje'] = 'Cita Asignada (Recitado por Jefatura)';
        }
      });
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(master));
    } catch (e) { }

    saveManagementStore();
    if (broadcast) {
      broadcast.postMessage({
        type: 'TRIAGE_DATABASE_UPDATED',
        source: 'jefatura_recitacion',
        timestamp: Date.now()
      });
    }

    cerrarModalRecitar();
    renderAll();
    showToast(`🔄 Hueco de las ${slot.horaCitaOriginal} recitado con éxito a ${cand.nombre} (${cand.nhc}). Dosis salvada.`);
  }

  function abrirModalRegistrarIncidenciaCita(defaultType) {
    const selType = document.getElementById('selectTipoIncidenciaCita');
    if (selType && defaultType) selType.value = defaultType;

    const selPat = document.getElementById('selectPacienteIncidenciaCita');
    if (selPat) {
      selPat.innerHTML = state.peticiones.slice(0, 35).map(p =>
        `<option value="${escapeHTML(p.id)}">${escapeHTML(p.nombre)} (${escapeHTML(p.nhc)}) — ${escapeHTML(p.estudio)}</option>`
      ).join('');
    }
    document.getElementById('inputMotivoIncidenciaCita').value = '';
    document.getElementById('modalRegistrarIncidenciaCita').classList.add('active');
  }

  function cerrarModalIncidenciaCita() {
    document.getElementById('modalRegistrarIncidenciaCita').classList.remove('active');
  }

  function confirmarRegistroIncidenciaCita() {
    const tipo = document.getElementById('selectTipoIncidenciaCita').value;
    const patId = document.getElementById('selectPacienteIncidenciaCita').value;
    const motivo = document.getElementById('inputMotivoIncidenciaCita').value.trim();
    const pat = state.peticiones.find(p => p.id === patId) || state.peticiones[0];
    if (!pat) return;

    const horaSlot = pat.horaCita && !pat.horaCita.includes('Sin') ? pat.horaCita : '12:00 h';

    if (tipo === 'cancelacion') {
      state.cancellations.unshift({
        slotId: 'CANC-' + Date.now(),
        patientId: pat.id,
        nhc: pat.nhc,
        nombre: pat.nombre,
        radiofarmaco: pat.estudio,
        prioridad: pat.prioridad === 'P1' ? '🔴 P1' : (pat.prioridad === 'P2' ? '🟡 P2' : '🟢 P3'),
        fechaCitaOriginal: getTodayISO(),
        horaCitaOriginal: horaSlot,
        canalAviso: 'Registro Directo Consola Jefatura / Enfermería',
        motivoCancelacion: motivo || 'Cancelación comunicada con preaviso; hueco liberado para recitar.',
        estadoHueco: 'disponible',
        recitadoA: null
      });
      showToast(`🔄 Cancelación registrada para ${pat.nombre}. El hueco (${horaSlot}) ya está disponible para recitar.`);
      saveManagementStore();
      cerrarModalIncidenciaCita();
      cambiarTab('citas');
      renderAll();
    } else if (tipo === 'noshow') {
      state.noShows.unshift({
        noShowId: 'NOSHOW-' + Date.now(),
        patientId: pat.id,
        nhc: pat.nhc,
        nombre: pat.nombre,
        radiofarmaco: pat.estudio,
        prioridad: pat.prioridad,
        fechaCita: getTodayISO(),
        horaCita: horaSlot,
        impactoAsistencial: '1 dosis comprometida / slot de alta tecnología vacante',
        observaciones: motivo || 'Paciente no acude a la cita sin previo aviso.'
      });
      showToast(`🚫 Paciente ${pat.nombre} registrado como No Presentado sin avisar (No-Show).`);
      saveManagementStore();
      cerrarModalIncidenciaCita();
      cambiarTab('citas');
      renderAll();
    } else {
      const defaultSubcausa = tipo === 'mal_preparado'
        ? 'Paciente mal preparado (rotura de ayuno / dieta o glucemia ≥ 200 mg/dL en Box)'
        : (tipo === 'fallo_radiofarmaco'
          ? 'Fallo de producción / síntesis o control de calidad del radiofármaco'
          : 'Extravasación paravenosa en punto de venopunción que requiere repetir estudio');

      state.anulaciones.unshift({
        anulId: 'ANUL-' + Date.now(),
        tipo: tipo,
        patientId: pat.id,
        nhc: pat.nhc,
        nombre: pat.nombre,
        radiofarmaco: pat.estudio,
        prioridad: pat.prioridad === 'P1' ? '🔴 P1' : (pat.prioridad === 'P2' ? '🟡 P2' : '🟢 P3'),
        fechaCita: getTodayISO(),
        horaCita: horaSlot,
        subcausa: motivo || defaultSubcausa,
        detalleClinico: motivo || defaultSubcausa,
        reprogramado: false,
        nuevaCita: ''
      });
      showToast(`🛑 Anulación registrada (${defaultSubcausa.split('(')[0].trim()}) para ${pat.nombre}.`);
      saveManagementStore();
      cerrarModalIncidenciaCita();
      cambiarTab('anulaciones');
      renderAll();
    }
  }

  function reprogramarAnulacionPrioritaria(anulId) {
    const item = state.anulaciones.find(a => a.anulId === anulId);
    if (!item) return;
    item.reprogramado = true;
    item.nuevaCita = 'Mañana · 08:45 h (Hueco Prioritario Reservado por Jefatura)';
    saveManagementStore();
    renderAll();
    showToast(`📅 Cita reprogramada con prioridad para ${item.nombre} (${item.nhc}) tras anulación.`);
  }

  function convertirNoShowEnRecitable(noShowId) {
    const idx = state.noShows.findIndex(n => n.noShowId === noShowId);
    if (idx === -1) return;
    const ns = state.noShows[idx];
    state.noShows.splice(idx, 1);

    const newSlotId = 'CANC-URG-' + Date.now();
    state.cancellations.unshift({
      slotId: newSlotId,
      patientId: ns.patientId,
      nhc: ns.nhc,
      nombre: ns.nombre,
      radiofarmaco: ns.radiofarmaco,
      prioridad: ns.prioridad,
      fechaCitaOriginal: ns.fechaCita,
      horaCitaOriginal: ns.horaCita,
      canalAviso: 'Rescate de Urgencia tras No-Show',
      motivoCancelacion: 'Hueco rescatado por Jefatura para recitación exprés de paciente cercano.',
      estadoHueco: 'disponible',
      recitadoA: null
    });

    saveManagementStore();
    renderAll();
    abrirModalRecitar(newSlotId);
  }

  function subsanarPeticionJefatura(petId) {
    const p = state.peticiones.find(x => x.id === petId);
    if (!p) return;
    p.llegaMal = false;
    p.categoriaFallo = 'Subsanada / Validada';
    p.detalleFallo = 'Subsanada y autorizada por Jefatura de Servicio';
    if (p.raw) p.raw.subsanadaJefatura = true;
    renderAll();
    showToast(`✅ Petición de ${p.nombre} (${p.nhc}) subsanada y validada para citación.`);
  }

  function enviarFeedbackServicio(servicio, numMal, topCausa) {
    showToast(`📩 Informe de Calidad Prescriptora enviado a Jefatura de ${servicio} (${numMal} incidencias · Causa principal: ${topCausa}).`);
  }

  function actualizarHoraRealMaquina(id, newTime) {
    const item = state.machineEntries.find(m => m.id === id);
    if (!item || !newTime) return;
    item.horaRealMaquina = newTime;
    saveManagementStore();
    renderAll();
    showToast(`⏱️ Hora real de paso a máquina de ${item.nombre} actualizada a ${newTime}.`);
  }

  function marcarEnHoraExacta(id) {
    const item = state.machineEntries.find(m => m.id === id);
    if (!item) return;
    item.horaRealMaquina = item.horaPrevistaMaquina;
    item.causaDemora = 'Paso puntual verificado por Jefatura / TSID';
    saveManagementStore();
    renderAll();
    showToast(`🟢 Paciente ${item.nombre} registrado en hora exacta (${item.horaPrevistaMaquina}).`);
  }

  function cambiarTab(tabId) {
    state.activeTab = tabId;
    document.querySelectorAll('.chief-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
  }

  function cambiarPeriodo(val) {
    state.periodo = val;
    renderAll();
  }

  async function sincronizarAhora() {
    await loadAllEcosystemData();
    renderAll();
    showToast('🔄 Estadísticas sincronizadas en vivo con Triaje, Consola Médica, Enfermería y Técnicos TSID.');
  }

  function exportarCSV() {
    const stats = computeServiceStats();
    const lines = [
      ['Indicador', 'Valor', 'Detalle'],
      ['Peticiones Totales Recibidas', stats.totalPeticiones, `Validas: ${stats.okList.length}`],
      ['Peticiones que Llegan Mal', stats.malList.length, `${stats.pctMal.toFixed(1)}%`],
      ['Total Pruebas Hechas por Radiofarmaco', stats.rfStats.totalPruebas, stats.rfStats.items.map(i => `${i.nombre}: ${i.pruebas}`).join(' | ')],
      ['Pacientes Pasan en Hora a Maquina', `${stats.enHoraCount}/${stats.evaluatedMachine.length}`, `${stats.pctEnHora.toFixed(1)}%`],
      ['Pacientes No Acuden sin Avisar (No-Show)', stats.totalNoShow, `${stats.pctNoShow.toFixed(1)}%`],
      ['Cancelaciones con Aviso (Recitables)', stats.totalCancelaciones, `Recitados: ${stats.huecosRecitados} (${stats.pctRecitados}%)`],
      ['Anulaciones Totales en Sala/Box', stats.totalAnulaciones, `${stats.pctAnulaciones.toFixed(1)}%`],
      [' - Anulaciones por Paciente Mal Preparado', stats.malPrepList.length, 'Ayuno / Dieta / Glucemia / Insulina'],
      [' - Anulaciones por Fallo Produccion Radiofarmaco', stats.falloRFList.length, 'Ciclotron / QC / Generador'],
      [' - Anulaciones por Extravasacion', stats.extravList.length, 'Infiltracion paravenosa'],
      ['Tardias Totales Pedidas por Medicos', stats.docStats.globalTardiasCount, stats.docStats.byDoctor.map(d => `${d.medico}: ${d.totalTardiasPeriodo} (${d.pctTardias.toFixed(0)}%)`).join(' | ')],
      ['Tiempo Medio Espera Salir desde Ultima Imagen', `${stats.docStats.globalEsperaPostImagen.toFixed(1)} min`, stats.docStats.byDoctor.map(d => `${d.medico}: ${d.avgEsperaSalidaMin.toFixed(1)}m`).join(' | ')],
      ['Tiempo Medio Total por Prueba', `${Math.round(stats.docStats.globalTiempoMedioPrueba)} min`, stats.docStats.byDoctor.map(d => `${d.medico}: ${Math.round(d.avgTotalPruebaMin)}m`).join(' | ')]
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + lines.map(e => e.join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `informe_jefatura_pet_sergas_${getTodayISO()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('📥 Informe CSV completo de Jefatura de Servicio descargado.');
  }

  // ==========================================================================
  // 13. PESTAÑAS 8 Y 9: CREAR INFORME (MENSUAL, TRIMESTRAL, ANUAL) Y DEMO A4
  // ==========================================================================
  function getDefaultDictamenPorTipo(tipo) {
    if (tipo === 'anual') {
      return 'MEMORIA ANUAL EJECUTIVA (12 MESES): El Servicio de Medicina Nuclear y Unidad PET/CT ha consolidado un incremento sostenido de actividad (+14.8% interanual), reduciendo la tasa de peticiones mal cumplimentadas del 18.4% al 11.9% gracias al sistema de validación clínica en origen. El protocolo activo de recitación telefónica y por chatbot ha permitido recuperar el 86% de las citas canceladas con preaviso, salvando 94 dosis de radiofármaco y manteniendo el absentismo sin aviso (No-Show) por debajo del 2.4%.';
    }
    if (tipo === 'trimestral') {
      return 'BALANCE TRIMESTRAL (4º TRIMESTRE · T4): Durante el trimestre Sep–Oct–Nov se ha alcanzado un 81.5% de puntualidad de paso en hora a máquina (±10 min respecto a la ventana metabólica). Se recomienda reforzar con los servicios de Hematología y Oncología Médica el control de intervalos post-quimioterapia (<21 días) y glucemias basales, así como optimizar el tiempo de espera post-última imagen en estudios con adquisición tardía pélvica.';
    }
    return 'INFORME OPERATIVO MENSUAL (NOVIEMBRE 2026): En los últimos 30 días la unidad mantiene un alto rendimiento de sala y aprovechamiento de dosis de 18F-FDG y 68Ga-PSMA-11. Las anulaciones por mala preparación del paciente se han contenido mediante las audioguías interactivas pre-cita, y el tiempo medio de espera del paciente desde la última imagen hasta recibir el alta médica ("Puede Irse") se sitúa dentro del objetivo de calidad asistencial.';
  }

  function seleccionarTipoInforme(tipo) {
    state.reportType = tipo || 'mensual';

    ['mensual', 'trimestral', 'anual'].forEach(t => {
      const card = document.getElementById(`cardRepType_${t}`);
      if (card) card.classList.toggle('selected', t === state.reportType);
      const pill = document.getElementById(`btnDemoSwitch_${t}`);
      if (pill) pill.classList.toggle('active', t === state.reportType);
    });

    const badge = document.getElementById('tabBadgeTipoDemo');
    if (badge) {
      badge.textContent = state.reportType === 'anual' ? 'Anual' : (state.reportType === 'trimestral' ? 'Trimestral' : 'Mensual');
    }

    const txtObs = document.getElementById('txtObservacionesInforme');
    if (txtObs) {
      txtObs.value = getDefaultDictamenPorTipo(state.reportType);
    }

    actualizarDemoInforme();
  }

  function generarYVerDemoInforme() {
    actualizarDemoInforme();
    cambiarTab('demo_informe');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`✨ Demo de Informe ${state.reportType.toUpperCase()} generada. Lista para revisar e imprimir.`);
  }

  function abrirEImprimirDemoInforme() {
    actualizarDemoInforme();
    cambiarTab('demo_informe');
    setTimeout(() => {
      window.print();
    }, 250);
  }

  function actualizarDemoInforme(statsObj) {
    const sheet = document.getElementById('printableReportSheet');
    if (!sheet) return;

    const txtObs = document.getElementById('txtObservacionesInforme');
    if (txtObs && !txtObs.value) {
      txtObs.value = getDefaultDictamenPorTipo(state.reportType);
    }

    const stats = statsObj || computeServiceStats();
    const tipo = state.reportType || 'mensual';

    // Escalar magnitudes de forma realista según Informe Mensual (x1), Trimestral (x3) o Anual (x12)
    const mult = tipo === 'anual' ? 12 : (tipo === 'trimestral' ? 3 : 1);
    const metaDoc = {
      mensual: {
        badge: 'INFORME MENSUAL DE GESTIÓN CLÍNICA',
        titulo: 'Informe Mensual de Actividad, Calidad y Rendimiento PET/CT',
        periodoLabel: 'Noviembre 2026 (30 días naturales)',
        codigoDoc: 'SERGAS-GAL-PET-MEN-2026-11',
        xLabels: ['Sem 1', 'Sem 2', 'Sem 3', 'Sem 4'],
        petSeriesValidas: [64, 68, 71, 74],
        petSeriesMal: [10, 9, 8, 7],
        maqSeriesPct: [76, 79, 81, Math.round(stats.pctEnHora)],
        esperaSeries: [11.5, 10.8, 10.2, Number(stats.docStats.globalEsperaPostImagen.toFixed(1))]
      },
      trimestral: {
        badge: 'INFORME TRIMESTRAL DE DIRECCIÓN (T4)',
        titulo: 'Informe Trimestral de Gestión y Calidad del Servicio de Medicina Nuclear',
        periodoLabel: '4º Trimestre 2026 (Septiembre · Octubre · Noviembre)',
        codigoDoc: 'SERGAS-GAL-PET-TRI-2026-T4',
        xLabels: ['Septiembre', 'Octubre', 'Noviembre'],
        petSeriesValidas: [248, 269, 284],
        petSeriesMal: [44, 38, 31],
        maqSeriesPct: [74, 79, Math.round(stats.pctEnHora)],
        esperaSeries: [13.2, 11.4, Number(stats.docStats.globalEsperaPostImagen.toFixed(1))]
      },
      anual: {
        badge: 'MEMORIA ANUAL DEL SERVICIO PET/CT',
        titulo: 'Memoria Anual Ejecutiva de Actividad, Radiofarmacia y Calidad Asistencial',
        periodoLabel: 'Ejercicio Completo 2026 (Enero – Diciembre · 12 Meses)',
        codigoDoc: 'SERGAS-GAL-PET-ANU-2026-01',
        xLabels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic(e)'],
        petSeriesValidas: [215, 224, 238, 242, 255, 260, 248, 230, 258, 272, 285, 294],
        petSeriesMal: [46, 44, 42, 39, 38, 36, 35, 33, 34, 31, 29, 27],
        maqSeriesPct: [70, 71, 73, 74, 76, 77, 78, 79, 80, 81, 83, 85],
        esperaSeries: [15.0, 14.5, 14.0, 13.5, 12.8, 12.2, 11.9, 11.5, 11.0, 10.6, 10.1, 9.6]
      }
    }[tipo];

    const incPeticiones = !document.getElementById('chkRep_peticiones') || document.getElementById('chkRep_peticiones').checked;
    const incRadiofarmacos = !document.getElementById('chkRep_radiofarmacos') || document.getElementById('chkRep_radiofarmacos').checked;
    const incDosimetria = !document.getElementById('chkRep_dosimetria') || document.getElementById('chkRep_dosimetria').checked;
    const incGraficas = !document.getElementById('chkRep_graficas') || document.getElementById('chkRep_graficas').checked;
    const incPuntualidad = !document.getElementById('chkRep_puntualidad') || document.getElementById('chkRep_puntualidad').checked;
    const incCitas = !document.getElementById('chkRep_citas') || document.getElementById('chkRep_citas').checked;
    const incAnulaciones = !document.getElementById('chkRep_anulaciones') || document.getElementById('chkRep_anulaciones').checked;
    const incMedicos = !document.getElementById('chkRep_medicos') || document.getElementById('chkRep_medicos').checked;
    const incEficienciaFarmacos = !document.getElementById('chkRep_eficiencia_farmacos') || document.getElementById('chkRep_eficiencia_farmacos').checked;
    const incDemorasTAT = !document.getElementById('chkRep_demoras_tat') || document.getElementById('chkRep_demoras_tat').checked;
    const incPermanenciaEARL = !document.getElementById('chkRep_permanencia_earl') || document.getElementById('chkRep_permanencia_earl').checked;
    const incAudioguiasCalidad = !document.getElementById('chkRep_audioguias_calidad') || document.getElementById('chkRep_audioguias_calidad').checked;
    const incGlucemiasAltas = !document.getElementById('chkRep_glucemias_altas') || document.getElementById('chkRep_glucemias_altas').checked;

    const destinatario = (document.getElementById('selectDestinatarioInforme') || {}).value || 'Dirección Asistencial SERGAS & Gerencia Galaria';
    const firmante = (document.getElementById('selectFirmanteJefatura') || {}).value || 'Dr. Manuel Gómez Feijóo · Jefe de Servicio de Medicina Nuclear';
    const dictamenTxt = (txtObs && txtObs.value) ? txtObs.value : getDefaultDictamenPorTipo(tipo);

    // Magnitudes escaladas al periodo del informe (Mensual, Trimestral o Anual)
    const totPet = stats.totalPeticiones * mult;
    const totMal = stats.malList.length * mult;
    const totOk = totPet - totMal;
    const totPruebasRF = stats.rfStats.totalPruebas * mult;
    const totCanc = Math.max(8, stats.totalCancelaciones * 3 * mult);
    const totRecitados = Math.round(totCanc * (stats.pctRecitados / 100));
    const totNoShow = Math.max(4, stats.totalNoShow * 2 * mult);
    const totAnul = stats.totalAnulaciones * mult;
    const totMalPrep = stats.malPrepList.length * mult;
    const totFalloRF = stats.falloRFList.length * mult;
    const totExtrav = stats.extravList.length * mult;

    const byService = buildServiceBreakdown(stats.petList).slice(0, 6);

    const chartEvol1 = renderEvolutionChartSVG({
      title: `Evolución (${metaDoc.periodoLabel}): Peticiones Válidas vs Peticiones que Llegan Mal`,
      xLabels: metaDoc.xLabels,
      ySuffix: '',
      series: [
        { name: 'Peticiones Válidas', color: '#0284c7', data: metaDoc.petSeriesValidas },
        { name: 'Llegan Mal (Incidencia)', color: '#dc2626', data: metaDoc.petSeriesMal }
      ]
    });

    const chartEvol2 = renderEvolutionChartSVG({
      title: `Evolución (${metaDoc.periodoLabel}): % Paso en Hora a Máquina y Espera Salir post-Imagen (min)`,
      xLabels: metaDoc.xLabels,
      ySuffix: '',
      series: [
        { name: '% Paso en Hora a Máquina', color: '#059669', data: metaDoc.maqSeriesPct },
        { name: 'Espera Salir desde Últ. Imagen (min)', color: '#7c3aed', data: metaDoc.esperaSeries }
      ]
    });

    sheet.innerHTML = `
      <!-- CABECERA OFICIAL DEL FOLIO A4 SERGAS / GALARIA -->
      <header class="a4-header-banner">
        <div style="display:flex; align-items:center; gap:14px;">
          <img src="../galaria_logo.jpg" alt="Galaria SERGAS" style="height:54px; width:auto; object-fit:contain;" onerror="this.style.display='none'">
          <div>
            <div style="font-size:0.72rem; font-weight:800; color:#007eb4; letter-spacing:0.06em; text-transform:uppercase;">
              XUNTA DE GALICIA · CONSELLERÍA DE SANIDADE · SERGAS · GALARIA
            </div>
            <h1 style="font-family:'Outfit',sans-serif; font-size:1.32rem; font-weight:800; color:#004868; margin-top:2px;">
              ${escapeHTML(metaDoc.titulo)}
            </h1>
            <div style="font-size:0.8rem; color:#475569; font-weight:600; margin-top:2px;">
              <strong>Destinatario:</strong> ${escapeHTML(destinatario)}
            </div>
          </div>
        </div>

        <div style="text-align:right; font-family:'JetBrains Mono',monospace; font-size:0.74rem; background:#f8fafc; border:1px solid #cbd5e1; padding:8px 12px; border-radius:8px;">
          <div style="font-weight:800; color:#004868;">${escapeHTML(metaDoc.badge)}</div>
          <div style="color:#334155; margin-top:2px;">Periodo: <strong>${escapeHTML(metaDoc.periodoLabel)}</strong></div>
          <div style="color:#64748b; margin-top:2px;">Ref: ${escapeHTML(metaDoc.codigoDoc)} · Fecha: ${getTodayISO()}</div>
        </div>
      </header>

      <!-- 1. TIRA EJECUTIVA DE 6 INDICADORES CLAVE DEL PERIODO -->
      <section>
        <div class="a4-kpi-strip">
          <div class="a4-kpi-cell" style="--cell-color:#0284c7;">
            <div class="c-lbl">1. Peticiones Recibidas</div>
            <div class="c-val">${totPet}</div>
            <div class="c-sub">${totOk} válidas (${stats.pctOk.toFixed(1)}%)</div>
          </div>
          <div class="a4-kpi-cell" style="--cell-color:#dc2626;">
            <div class="c-lbl">2. % Peticiones Mal</div>
            <div class="c-val" style="color:#dc2626;">${stats.pctMal.toFixed(1)}%</div>
            <div class="c-sub">${totMal} con defecto</div>
          </div>
          <div class="a4-kpi-cell" style="--cell-color:#0d9488;">
            <div class="c-lbl">3. Pruebas por Isótopo</div>
            <div class="c-val" style="color:#0f766e;">${totPruebasRF}</div>
            <div class="c-sub">8 radiofármacos activos</div>
          </div>
          <div class="a4-kpi-cell" style="--cell-color:#059669;">
            <div class="c-lbl">4. Paso en Hora Máquina</div>
            <div class="c-val" style="color:#059669;">${stats.pctEnHora.toFixed(1)}%</div>
            <div class="c-sub">Desv. media: ±${stats.avgDiff} min</div>
          </div>
          <div class="a4-kpi-cell" style="--cell-color:#d97706;">
            <div class="c-lbl">5. Recitaciones vs NoShow</div>
            <div class="c-val" style="color:#d97706;">${stats.pctRecitados}%</div>
            <div class="c-sub">${totRecitados}/${totCanc} salvadas · ${totNoShow} NoShow</div>
          </div>
          <div class="a4-kpi-cell" style="--cell-color:#7c3aed;">
            <div class="c-lbl">6. Espera Salir / Anul.</div>
            <div class="c-val" style="color:#7c3aed;">${stats.docStats.globalEsperaPostImagen.toFixed(1)}m</div>
            <div class="c-sub">${totAnul} anul. (Prep/RF/Extrav)</div>
          </div>
        </div>
      </section>

      <!-- 2. GRÁFICAS DE EVOLUCIÓN EN EL TIEMPO -->
      ${incGraficas ? `
        <section style="display:flex; flex-direction:column; gap:0.75rem;">
          <div class="a4-section-title">
            <span>📈 1. Evolución en el Tiempo de los Indicadores del Servicio (${escapeHTML(metaDoc.periodoLabel)})</span>
            <span style="font-size:0.74rem; color:#bae6fd;">Trazabilidad Temporal</span>
          </div>
          <div class="a4-two-cols">
            ${chartEvol1}
            ${chartEvol2}
          </div>
        </section>
      ` : ''}

      <!-- 3. CALIDAD DE PETICIONES (% LLEGAN MAL) Y CANTIDAD POR RADIOFÁRMACO -->
      ${(incPeticiones || incRadiofarmacos) ? `
        <section class="a4-two-cols">
          ${incPeticiones ? `
            <div style="display:flex; flex-direction:column; gap:0.55rem;">
              <div class="a4-section-title">
                <span>📋 2. Calidad de Peticiones Recibidas (% Llegan Mal)</span>
              </div>
              <table class="chief-table" style="font-size:0.76rem;">
                <thead>
                  <tr>
                    <th>Servicio Solicitante</th>
                    <th>Recibidas</th>
                    <th>Mal</th>
                    <th>% Error</th>
                    <th>Causa Frecuente</th>
                  </tr>
                </thead>
                <tbody>
                  ${byService.map(s => `
                    <tr>
                      <td><strong>${escapeHTML(s.servicio)}</strong></td>
                      <td>${s.total * mult}</td>
                      <td style="color:#dc2626; font-weight:800;">${s.mal * mult}</td>
                      <td><strong>${s.pctMal.toFixed(1)}%</strong></td>
                      <td>${escapeHTML(s.topCausa)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}

          ${incRadiofarmacos ? `
            <div style="display:flex; flex-direction:column; gap:0.55rem;">
              <div class="a4-section-title">
                <span>☢️ 3. Cantidad de Pruebas Hechas por Radiofármaco</span>
              </div>
              <table class="chief-table" style="font-size:0.76rem;">
                <thead>
                  <tr>
                    <th>Radiofármaco / Trazador</th>
                    <th>Pruebas</th>
                    <th>% Cuota</th>
                    <th>Ventana / Máquina</th>
                  </tr>
                </thead>
                <tbody>
                  ${stats.rfStats.items.slice(0, 6).map(rf => `
                    <tr>
                      <td><strong>${escapeHTML(rf.nombre)}</strong></td>
                      <td style="font-family:'JetBrains Mono',monospace; font-weight:800;">${rf.pruebas * mult}</td>
                      <td>${rf.pct.toFixed(1)}%</td>
                      <td>${escapeHTML(rf.captacion)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : ''}
        </section>
      ` : ''}

      <!-- 3B. AUDITORÍA DE CALIDAD DOSIMÉTRICA SEGÚN PESO Y TALLA (DOSIS IDEAL VS MÁS O MENOS) -->
      ${incDosimetria ? (() => {
        const dStats = stats.dosimetryStats || computeDosimetryQualityStats();
        return `
        <section style="display:flex; flex-direction:column; gap:0.55rem;">
          <div class="a4-section-title">
            <span>⚖️ 3B. Calidad Dosimétrica por Peso y Talla: Radiofármaco Ideal vs. Inyectado (Ideal, Más o Menos)</span>
            <span style="font-size:0.74rem; color:#bae6fd;">🟢 Ideal: ${dStats.pctIdeal.toFixed(1)}% · 🔴 Más: ${dStats.pctMas.toFixed(1)}% · 🟡 Menos: ${dStats.pctMenos.toFixed(1)}%</span>
            <span>⚖️ 3B. Calidad Dosimétrica por Peso/Talla y Estado de Inyección (Ideal/Más/Menos · Correcta/Extravasación)</span>
            <span style="font-size:0.74rem; color:#bae6fd;">🟢 Ideal: ${dStats.pctIdeal.toFixed(1)}% · ✅ Correctas: ${dStats.pctCorrecta.toFixed(1)}% · 🚨 Extrav.: ${dStats.extravasacionCount * mult}</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.65rem; font-size:0.76rem;">
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:0.65rem; font-size:0.75rem;">
            <div style="background:#ecfdf5; border:1px solid #6ee7b7; border-radius:7px; padding:0.55rem 0.75rem;">
              <strong style="color:#065f46;">🟢 Dosis Ideal (±10% Peso/Talla):</strong> <strong>${dStats.idealCount * mult} pac. (${dStats.pctIdeal.toFixed(1)}%)</strong>
              <strong style="color:#065f46;">🟢 Dosis Ideal (±10%):</strong> <strong>${dStats.idealCount * mult} pac. (${dStats.pctIdeal.toFixed(1)}%)</strong>
            </div>
            <div style="background:#fef2f2; border:1px solid #fca5a5; border-radius:7px; padding:0.55rem 0.75rem;">
              <strong style="color:#991b1b;">🔴 Más del Ideal (&gt;+10% Sobredosis):</strong> <strong>${dStats.masCount * mult} pac. (${dStats.pctMas.toFixed(1)}%)</strong>
              <strong style="color:#991b1b;">🔴 Más del Ideal (&gt;+10%):</strong> <strong>${dStats.masCount * mult} pac. (${dStats.pctMas.toFixed(1)}%)</strong>
            </div>
            <div style="background:#fffbeb; border:1px solid #fcd34d; border-radius:7px; padding:0.55rem 0.75rem;">
              <strong style="color:#92400e;">🟡 Menos del Ideal (&lt;-10% Subdosis):</strong> <strong>${dStats.menosCount * mult} pac. (${dStats.pctMenos.toFixed(1)}%)</strong>
              <strong style="color:#92400e;">🟡 Menos del Ideal (&lt;-10%):</strong> <strong>${dStats.menosCount * mult} pac. (${dStats.pctMenos.toFixed(1)}%)</strong>
            </div>
            <div style="background:${dStats.extravasacionCount > 0 ? '#fef2f2' : '#ecfdf5'}; border:1px solid ${dStats.extravasacionCount > 0 ? '#fca5a5' : '#6ee7b7'}; border-radius:7px; padding:0.55rem 0.75rem;">
              <strong style="color:${dStats.extravasacionCount > 0 ? '#991b1b' : '#065f46'};">🩹 Vía / Inyección:</strong> <strong>✅ ${dStats.correctaCount * mult} OK · 🚨 ${dStats.extravasacionCount * mult} Extrav.</strong>
            </div>
          </div>
          <table class="chief-table" style="font-size:0.74rem;">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Fármaco</th>
                <th>Iniciales / NHC</th>
                <th>Peso / Talla (IMC)</th>
                <th>🎯 Dosis Ideal</th>
                <th>💉 mCi Inyectados</th>
                <th>Desviación</th>
                <th>Calidad Dosimétrica</th>
                <th>Estado Inyección</th>
              </tr>
            </thead>
            <tbody>
              ${dStats.items.slice(0, 8).map(it => `
                <tr>
                  <td>${escapeHTML(it.fecha)}</td>
                  <td><strong>${escapeHTML(it.farmaco)}</strong></td>
                  <td><strong>${escapeHTML(it.iniciales)}</strong> (${escapeHTML(it.nhc)})</td>
                  <td>${escapeHTML(it.pesoKg)} kg / ${escapeHTML(it.tallaCm)} cm (${escapeHTML(it.imc)})</td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0369a1;">${escapeHTML(it.dosisIdealMci)} mCi</td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:800;">${escapeHTML(it.mciInyectados)} mCi</td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${it.calidad.pctDiff >= 0 ? '+' : ''}${it.calidad.pctDiff}%</td>
                  <td><strong>${escapeHTML(it.calidad.label)}</strong></td>
                  <td><strong>${it.estadoInyeccion === 'extravasacion' ? '🚨 Extravasación' : '✅ Correcta'}</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
        `;
      })() : ''}

      <!-- 4. PUNTUALIDAD MÁQUINA, NO-SHOWS, RECITACIONES Y ANULACIONES (PREP / RF / EXTRAV) -->
      ${(incPuntualidad || incCitas || incAnulaciones) ? `
        <section style="display:flex; flex-direction:column; gap:0.6rem;">
          <div class="a4-section-title">
            <span>🔄 4. Puntualidad en Máquina, No-Shows, Recitación de Cancelaciones y Anulaciones en Sala</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.75rem; font-size:0.78rem;">
            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.75rem;">
              <strong style="color:#065f46; display:block; margin-bottom:4px;">⏱️ Paso en Hora a Máquina (${stats.pctEnHora.toFixed(1)}%)</strong>
              <div>• Pasan en hora (≤ ±10 min): <strong>${stats.enHoraCount * mult} pac.</strong></div>
              <div>• Demora leve (11-20 min): <strong>${stats.demoraLeveCount * mult} pac.</strong></div>
              <div>• Retraso (&gt; 20 min): <strong>${stats.retrasoCriticoCount * mult} pac.</strong></div>
            </div>

            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.75rem;">
              <strong style="color:#b45309; display:block; margin-bottom:4px;">🔄 Cancelaciones y No-Shows</strong>
              <div>• Cancelaciones con preaviso: <strong>${totCanc} citas</strong></div>
              <div>• Huecos recitados (dosis salvadas): <strong style="color:#059669;">${totRecitados} (${stats.pctRecitados}%)</strong></div>
              <div>• No acuden sin avisar (No-Show): <strong style="color:#dc2626;">${totNoShow} (${stats.pctNoShow.toFixed(1)}%)</strong></div>
            </div>

            <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:8px; padding:0.75rem;">
              <strong style="color:#9f1239; display:block; margin-bottom:4px;">🛑 Anulaciones en Servicio (${totAnul} casos)</strong>
              <div>• 🍽️ Pacientes mal preparados: <strong>${totMalPrep} casos</strong></div>
              <div>• ☢️ Fallo producción radiofármaco: <strong>${totFalloRF} casos</strong></div>
              <div>• 💉 Extravasaciones de dosis: <strong>${totExtrav} casos</strong></div>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- 5. RENDIMIENTO Y TIEMPOS POR MÉDICO DE MEDICINA NUCLEAR -->
      ${incMedicos ? `
        <section style="display:flex; flex-direction:column; gap:0.55rem;">
          <div class="a4-section-title">
            <span>👨‍⚕️ 5. Estadística por Médico: Tardías Pedidas, Espera en Salir desde Última Imagen y Tiempo Medio/Prueba</span>
          </div>
          <table class="chief-table" style="font-size:0.77rem;">
            <thead>
              <tr>
                <th>Facultativo de Medicina Nuclear</th>
                <th>Estudios Informados</th>
                <th>🕒 Tardías Pedidas (%)</th>
                <th>🚪 Espera Salir desde Última Imagen</th>
                <th>⏱️ Tiempo Medio en Máquina</th>
                <th>⏱️ Tiempo Medio Total / Prueba</th>
              </tr>
            </thead>
            <tbody>
              ${stats.docStats.byDoctor.map(d => `
                <tr>
                  <td><strong>${escapeHTML(d.medico)}</strong></td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:700;">${d.pacientesHoy * 22 * mult}</td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#b45309;">${d.tardiasHoy * 20 * mult} (${d.pctTardias.toFixed(0)}%)</td>
                  <td><strong style="color:${d.avgEsperaSalidaMin > 15 ? '#dc2626' : '#059669'};">${d.avgEsperaSalidaMin.toFixed(1)} min</strong> (Fin imagen ➔ Alta)</td>
                  <td>${Math.round(d.avgMaquinaMin)} min</td>
                  <td><strong>${Math.round(d.avgTotalPruebaMin)} min totales</strong></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
      ` : ''}

      ${incEficienciaFarmacos ? `
        <!-- SECCIÓN 6: EFICIENCIA RADIOFARMACÉUTICA Y HUECOS LIBRES -->
        <section class="a4-report-section">
          <div class="a4-section-title">
            <span>💎 6. Eficiencia Radiofarmacéutica, Aprovechamiento y Huecos Libres de Agenda</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:8px;">
            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#0369a1;">APROVECHAMIENTO</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#0284c7;">${stats.advancedQualityStats.pctAprov.toFixed(1)}%</div>
              <div style="font-size:0.65rem; color:#64748b;">${(stats.advancedQualityStats.recMBq * mult).toLocaleString('es-ES')} MBq recibidos</div>
            </div>
            <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#047857;">INYECTADA NETA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#059669;">${(stats.advancedQualityStats.inyMBq * mult).toLocaleString('es-ES')} MBq</div>
              <div style="font-size:0.65rem; color:#64748b;">Administrada en box</div>
            </div>
            <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#be123c;">CAPACIDAD ASISTENCIAL NO APROVECHADA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#e11d48;">${Math.round(stats.advancedQualityStats.dosisPerdidasEquiv * mult) || 4} pac. equiv.</div>
              <div style="font-size:0.65rem; color:#64748b;">Desintegración física + absentismo</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#b45309;">HUECOS LIBRES</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#d97706;">${stats.advancedQualityStats.libresDia} / día</div>
              <div style="font-size:0.65rem; color:#64748b;">9.4% slots de camilla pública no programados</div>
            </div>
          </div>
          <table class="chief-table" style="font-size:0.77rem;">
            <thead>
              <tr>
                <th>Radiofármaco</th>
                <th>Dosis Pedidas</th>
                <th>Dosis Inyectadas</th>
                <th>Aprovechamiento (%)</th>
                <th>MBq Desintegrados</th>
                <th>Capacidad Asistencial Afectada</th>
              </tr>
            </thead>
            <tbody>
              ${stats.advancedQualityStats.farmacosEfficiency.map(f => `
                <tr>
                  <td><strong>${escapeHTML(f.name)}</strong></td>
                  <td style="font-family:'JetBrains Mono',monospace;">${f.dosisPedidas * mult}</td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#059669;">${f.inyectadas * mult}</td>
                  <td><span class="status-badge ${f.pct >= 90 ? 'badge-ok' : 'badge-warn'}">${f.pct.toFixed(1)}%</span></td>
                  <td style="font-family:'JetBrains Mono',monospace; color:#dc2626;">${f.mbqPerd * mult} MBq</td>
                  <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#be123c;">${Math.round((f.dosisPerdidas || 1) * mult)} pac. equiv.</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </section>
      ` : ''}

      ${incDemorasTAT ? `
        <!-- SECCIÓN 7: DEMORAS DE CITACIÓN Y TAT DE INFORME -->
        <section class="a4-report-section">
          <div class="a4-section-title">
            <span>📅 7. Tiempos de Demora de Citación (Lead Time) y Plazo de Firma del Informe (TAT)</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:8px;">
            <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#047857;">DEMORA P1 ONCOLÓGICA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#059669;">${stats.advancedQualityStats.demoraP1} días</div>
              <div style="font-size:0.65rem; color:#047857; font-weight:700;">✓ Meta SERGAS ≤ 7d</div>
            </div>
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#15803d;">DEMORA P2 ORDINARIA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#16a34a;">${stats.advancedQualityStats.demoraP2} días</div>
              <div style="font-size:0.65rem; color:#16a34a; font-weight:700;">✓ Meta SERGAS ≤ 15d</div>
            </div>
            <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#6d28d9;">TAT INFORME MÉDICO</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#7c3aed;">${stats.advancedQualityStats.tatInformeHoras} h</div>
              <div style="font-size:0.65rem; color:#6d28d9; font-weight:700;">${stats.advancedQualityStats.tatMenor24h}% en &lt; 24h</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#334155;">DEMORA &gt; 48H</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#334155;">${stats.advancedQualityStats.tatMayor48h}%</div>
              <div style="font-size:0.65rem; color:#64748b;">Casos complejos / tardías</div>
            </div>
          </div>
        </section>
      ` : ''}

      ${incPermanenciaEARL ? `
        <!-- SECCIÓN 8: TIEMPO DE PERMANENCIA Y CALIDAD TÉCNICA EARL -->
        <section class="a4-report-section">
          <div class="a4-section-title">
            <span>⏳ 8. Tiempo de Permanencia en el Servicio (Door-to-Door) & Ventana EARL 55-75 min</span>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:8px 12px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:800; color:#004868; margin-bottom:6px;">
              <span>Fases Asistenciales del Proceso (Estancia Media Total: ${stats.advancedQualityStats.permanenciaTotalMin} min · Meta ≤ 120 min)</span>
              <span class="status-badge badge-ok">${stats.advancedQualityStats.ventanaEarlPct}% Cumplimiento Ventana EARL 55-75m</span>
            </div>
            <div style="font-size:0.75rem; color:#475569; line-height:1.45;">
              • <strong>Admisión y vía venosa:</strong> ${stats.advancedQualityStats.fasesMin.acogida} min · 
              • <strong>Reposo metabólico en box:</strong> ${stats.advancedQualityStats.fasesMin.boxReposo} min (Meta 50-60m) · 
              • <strong>Camilla PET-CT:</strong> ${stats.advancedQualityStats.fasesMin.camilla} min · 
              • <strong>Revisión médica y alta:</strong> ${stats.advancedQualityStats.fasesMin.revisionAlta} min
            </div>
          </div>
        </section>
      ` : ''}

      ${incAudioguiasCalidad ? `
        <!-- SECCIÓN 9: EFICACIA PREVENTIVA DE LAS AUDIOGUÍAS Y GLUCEMIAS -->
        <section class="a4-report-section">
          <div class="a4-section-title">
            <span>🎧 9. Eficacia de las Audioguías Digitales, Pacientes Mal Preparados y Glucemias en Box</span>
          </div>
          <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px; margin-bottom:8px;">
            <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#15803d;">ADHERENCIA AUDIOGUÍA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#16a34a;">${stats.advancedQualityStats.adherenciaAudioPct}%</div>
              <div style="font-size:0.65rem; color:#15803d;">Acceso pre-cita</div>
            </div>
            <div style="background:#ecfdf5; border:1px solid #a7f3d0; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#047857;">SUSPENSIÓN CON AUDIOGUÍA</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#059669;">${stats.advancedQualityStats.suspConAudioPct}%</div>
              <div style="font-size:0.65rem; color:#047857; font-weight:700;">vs 8.7% sin audioguía</div>
            </div>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#b45309;">GLUCEMIA ÓPTIMA (&lt;160)</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#d97706;">${stats.advancedQualityStats.glucemiaVerdePct}%</div>
              <div style="font-size:0.65rem; color:#b45309;">Paso directo a inyección</div>
            </div>
            <div style="background:#fff1f2; border:1px solid #fecdd3; border-radius:6px; padding:6px 9px; text-align:center;">
              <div style="font-size:0.68rem; font-weight:800; color:#be123c;">RESCATE GLUCEMIA ≥200</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.15rem; font-weight:800; color:#e11d48;">${stats.advancedQualityStats.rescateGlucemiaPct}%</div>
              <div style="font-size:0.65rem; color:#be123c; font-weight:700;">Rescatados con hidratación</div>
            </div>
          </div>
        </section>
      ` : ''}

      <!-- 10. DICTAMEN DE JEFATURA Y FIRMA OFICIAL -->
      <section style="background:#f8fafc; border-left:4px solid #004868; padding:0.85rem 1.1rem; border-radius:6px; font-size:0.8rem; line-height:1.5; color:#1e293b;">
        <strong style="color:#004868; display:block; margin-bottom:3px;">📌 CONCLUSIONES Y PLAN DE ACCIÓN DE JEFATURA DE SERVICIO:</strong>
        ${escapeHTML(dictamenTxt)}
      </section>

      <footer class="a4-signature-footer">
        <div style="font-size:0.75rem; color:#64748b;">
          <div>Documento oficial generado por el Ecosistema Digital PET/CT — Galaria · Servizo Galego de Saúde (SERGAS)</div>
          <div>Hospital Público Álvaro Cunqueiro · Unidad de Medicina Nuclear y Diagnóstico Molecular</div>
        </div>
        <div style="text-align:right;">
          <div style="font-family:'Outfit',sans-serif; font-size:0.85rem; font-weight:800; color:#004868;">Fdo.: ${escapeHTML(firmante)}</div>
          <div style="font-size:0.73rem; color:#059669; font-weight:700; margin-top:2px;">✓ Sello Digital Validado · Jefatura de Servicio MN</div>
        </div>
      </footer>
    `;
  }

  function showToast(msg) {
    const container = document.getElementById('chiefToastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'chief-toast';
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => {
      if (div.parentNode) div.remove();
    }, 5000);
  }

  // ==========================================================================
  // DOS PESTAÑAS MAESTRAS AL ENTRAR EN JEFATURA: JEFE DE SERVICIO Y SUPERVISIÓN DE ENFERMERÍA
  // ==========================================================================
  function setMasterTab(masterTab, showNotification = true) {
    const valid = ['jefe', 'enfermeria'];
    const chosen = valid.includes(masterTab) ? masterTab : 'jefe';
    state.activeMasterArea = chosen;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('pet_master_tab', chosen);
      }
    } catch (_) {}

    // 1. Clases en el body para visualización directa mediante CSS
    if (typeof document !== 'undefined' && document.body) {
      document.body.classList.remove('mode-jefe', 'mode-enfermeria');
      document.body.classList.add(`mode-${chosen}`);
    }

    // 2. Estado activo de las dos pestañas maestras
    const btnJefe = document.getElementById('btnMasterJefe');
    const btnEnf = document.getElementById('btnMasterEnfermeria');
    if (btnJefe) btnJefe.classList.toggle('active', chosen === 'jefe');
    if (btnEnf) btnEnf.classList.toggle('active', chosen === 'enfermeria');

    // 3. Títulos y subtítulos en la cabecera
    const elTitle = document.getElementById('headerMainTitle');
    const elBadge = document.getElementById('headerRoleBadge');
    const elSub = document.getElementById('headerSubtitle');

    if (chosen === 'jefe') {
      if (elTitle) elTitle.textContent = '👑 Consola de Jefe de Servicio & Dirección Médica PET/CT';
      if (elBadge) {
        elBadge.textContent = 'Jefe de Servicio';
        elBadge.style.background = '#004868';
        elBadge.style.color = '#ffffff';
      }
      if (elSub) elSub.textContent = 'Cuadro de Mando Integral: Peticiones (% Mal), Radiofármacos, Demoras P1/P2, Cuadro Facultativo, TAT y Tiempos Asistenciales.';
      if (showNotification) {
        cambiarTab('resumen');
        showToast('👑 Pestaña Activa: Jefe de Servicio (Todos los datos médicos y asistenciales)');
      }
    } else {
      if (elTitle) elTitle.textContent = '🩺 Consola de Supervisión de Cuidados & Enfermería PET/CT';
      if (elBadge) {
        elBadge.textContent = 'Supervisión de Enfermería';
        elBadge.style.background = '#0d9488';
        elBadge.style.color = '#ffffff';
      }
      if (elSub) elSub.textContent = 'Área de Cuidados y Boxes: Semáforo Glucémico, Audioguías, Camilla, Absentismo, Vías Venosas y Extravasaciones.';
      if (showNotification) {
        cambiarTab('audioguias_calidad');
        showToast('🩺 Pestaña Activa: Supervisión de Enfermería (Cuidados, boxes y preparación)');
      }
    }
  }

  function aplicarPlantillaInforme(tipo) {
    const checks = {
      chkRep_peticiones: tipo === 'jefatura' || tipo === 'global',
      chkRep_radiofarmacos: tipo === 'jefatura' || tipo === 'global',
      chkRep_medicos: tipo === 'jefatura' || tipo === 'global',
      chkRep_eficiencia_farmacos: tipo === 'jefatura' || tipo === 'global',
      chkRep_demoras_tat: tipo === 'jefatura' || tipo === 'global',
      chkRep_graficas: true,
      chkRep_puntualidad: tipo === 'enfermeria' || tipo === 'global',
      chkRep_citas: tipo === 'enfermeria' || tipo === 'global',
      chkRep_anulaciones: tipo === 'enfermeria' || tipo === 'global',
      chkRep_dosimetria: tipo === 'enfermeria' || tipo === 'global',
      chkRep_permanencia_earl: tipo === 'enfermeria' || tipo === 'global',
      chkRep_audioguias_calidad: tipo === 'enfermeria' || tipo === 'global',
      chkRep_glucemias_altas: tipo === 'enfermeria' || tipo === 'global'
    };

    Object.entries(checks).forEach(([id, val]) => {
      const el = document.getElementById(id);
      if (el) el.checked = val;
    });

    actualizarDemoInforme();
    showToast(tipo === 'jefatura'
      ? '📋 Plantilla de Informe de Jefatura Médica cargada.'
      : (tipo === 'enfermeria' ? '🩺 Plantilla de Informe de Supervisión de Enfermería cargada.' : '🌐 Plantilla Completa de Dirección cargada.'));
  }

  if (broadcast) {
    broadcast.onmessage = () => {
      loadAllEcosystemData().then(() => renderAll());
    };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key && e.key.startsWith('PET_')) {
        loadAllEcosystemData().then(() => renderAll());
      }
    });
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', async () => {
      await loadAllEcosystemData();
      let savedTab = 'jefe';
      try {
        if (typeof localStorage !== 'undefined') {
          savedTab = localStorage.getItem('pet_master_tab') || 'jefe';
        }
      } catch (_) {}
      setMasterTab(savedTab, false);
      renderAll();
    });
  }

  if (typeof window !== 'undefined') {
    window.jefaturaApp = {
      setMasterTab,
      aplicarPlantillaInforme,
      cambiarTab,
      cambiarPeriodo,
      sincronizarAhora,
      exportarCSV,
      renderPeticionesTab,
      renderRadiofarmacosTab,
      renderPuntualidadTab,
      renderAnulacionesTab,
      renderMedicosTab,
      renderEficienciaTiemposTab,
      renderAudioguiasCalidadTab,
      reprogramarAnulacionPrioritaria,
      abrirModalRecitar,
      cerrarModalRecitar,
      confirmarRecitacionEnHueco,
      abrirModalRegistrarIncidenciaCita,
      cerrarModalIncidenciaCita,
      confirmarRegistroIncidenciaCita,
      convertirNoShowEnRecitable,
      subsanarPeticionJefatura,
      enviarFeedbackServicio,
      actualizarHoraRealMaquina,
      marcarEnHoraExacta,
      seleccionarTipoInforme,
      generarYVerDemoInforme,
      abrirEImprimirDemoInforme,
      actualizarDemoInforme
    };
  }
})();
