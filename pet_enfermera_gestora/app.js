/**
 * CONSOLA DE ENFERMERÍA GESTORA DE CASOS & ENLACE ASISTENCIAL — GALARIA · SERGAS
 * Módulo 9 del Ecosistema Digital PET/CT
 * - Seguimiento de la situación de las peticiones de los pacientes por servicio clínico
 * - Sincronización y control de fechas de citas para sucesivas consultas con especialistas y comités
 * - Filtrado por servicio clínico de la enfermera gestora
 * - Búsqueda universal por NHC (Historia Clínica) cruzando todos los servicios del hospital
 * - Semáforo de coordinación asistencial y detección de descoordinaciones clínicas
 */

(function () {
  'use strict';

  const STORAGE_KEY_CONSULTAS = 'PET_GESTORA_CONSULTAS_V1';
  const STORAGE_KEY_SERVICIO = 'PET_GESTORA_SERVICIO_ACTIVO_V1';
  const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pet_clinical_channel') : null;

  // Semilla de consultas sucesivas pre-agendadas para casos de referencia
  const DEFAULT_CONSULTAS_SEED = {
    'NHC-652391': {
      fechaConsulta: getFutureDateISO(4),
      horaConsulta: '10:30',
      medicoConsulta: 'Dra. Isabel Calvo (Oncología Médica)',
      tipoConsulta: 'Comité Multidisciplinar de Tumores',
      notasGestora: 'Comité de Tumores Ginecológicos. Requiere informe PET previo para decidir rescate quirúrgico vs quimioterapia.'
    },
    'NHC-741902': {
      fechaConsulta: getFutureDateISO(7),
      horaConsulta: '11:15',
      medicoConsulta: 'Dra. Marta Veiga (Neumología)',
      tipoConsulta: 'Consulta Sucesiva / Revisión',
      notasGestora: 'Revisión de nódulo pulmonar en LSI. Comprobar que acuda en ayunas al PET.'
    },
    'NHC-813405': {
      fechaConsulta: getFutureDateISO(3),
      horaConsulta: '09:45',
      medicoConsulta: 'Dr. Manuel Quintela (Hematología)',
      tipoConsulta: 'Inicio Tratamiento (Quimio/Inmuno)',
      notasGestora: 'Linfoma B difuso. Inicio de ciclo R-CHOP en Hospital de Día condicionado al resultado del PET basal.'
    },
    'NHC-398244': {
      fechaConsulta: getFutureDateISO(12),
      horaConsulta: '12:00',
      medicoConsulta: 'Dr. Antonio Casal (Urología)',
      tipoConsulta: 'Consulta Sucesiva / Revisión',
      notasGestora: 'Recidiva bioquímica de Ca. Próstata (PSA 1.4 ng/mL). Estudio con 18F-PSMA para valorar radioterapia de rescate.'
    },
    'NHC-509182': {
      fechaConsulta: getFutureDateISO(1),
      horaConsulta: '10:00',
      medicoConsulta: 'Dra. Teresa Domínguez (Aparato Digestivo)',
      tipoConsulta: 'Consulta Sucesiva / Revisión',
      notasGestora: 'Urgente: Consulta mañana. Comprobar si Medicina Nuclear ha emitido ya el informe preliminar.'
    },
    'NHC-481920': {
      fechaConsulta: getFutureDateISO(14),
      horaConsulta: '11:30',
      medicoConsulta: 'Dr. Carlos Loureiro (Neurología)',
      tipoConsulta: 'Primera Visita Post-Estadificación',
      notasGestora: 'Deterioro cognitivo rápidamente progresivo. PET Cerebral 18F-FDG para diagnóstico diferencial.'
    }
  };

  const state = {
    servicioActivo: 'Oncología Médica',
    subTabActiva: 'todas', // 'todas' | 'proximas_consultas' | 'descoordinadas' | 'informadas' | 'cruce_nhc'
    busquedaQuery: '',
    filtroEstadoPet: 'todos',
    filtroSemaforo: 'todos',
    peticiones: [],
    consultasMap: {}, // Key: NHC o peticionId
    activePeticionEdit: null
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

  function getFutureDateISO(daysAhead) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function parseISODate(dateStr) {
    if (!dateStr) return null;
    const clean = String(dateStr).split('T')[0];
    const parts = clean.split('-');
    if (parts.length < 3) return null;
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return isNaN(d.getTime()) ? null : d;
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '—';
    const d = parseISODate(dateStr);
    if (!d) return dateStr;
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return d.toLocaleDateString('es-ES', options);
  }

  // ==========================================================================
  // 1. CARGA DE DATOS Y SINCRONIZACIÓN CON EL ECOSISTEMA
  // ==========================================================================
  function loadConsultasStore() {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(STORAGE_KEY_CONSULTAS);
        if (raw) return JSON.parse(raw);
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_CONSULTAS_SEED));
  }

  function saveConsultasStore(data) {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_CONSULTAS, JSON.stringify(data));
      }
    } catch (_) {}
  }

  function loadServicioActivo() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY_SERVICIO);
        if (stored) return stored;
      }
    } catch (_) {}
    return 'Oncología Médica';
  }

  async function loadAllData() {
    state.consultasMap = loadConsultasStore();
    state.servicioActivo = loadServicioActivo();

    const selectEl = document.getElementById('selectServicioGestora');
    if (selectEl) selectEl.value = state.servicioActivo;

    let rawList = [];

    // 1. Intentar leer desde Master Database V4
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = JSON.parse(localStorage.getItem('PET_DATABASE_MASTER_V4') || '[]');
        if (Array.isArray(stored) && stored.length > 0) rawList = stored;
      }
    } catch (_) {}

    // 2. Si no hay en localStorage, leer peticiones_db.json
    if (!rawList || rawList.length === 0) {
      try {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timeoutId = controller ? setTimeout(() => controller.abort(), 1200) : null;
        const res = await fetch('../pet_ct_triage/web_app/peticiones_db.json?t=' + Date.now(), {
          signal: controller ? controller.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) rawList = data;
        }
      } catch (_) {}
    }

    // 3. Fallback con casos clínicos emblemáticos del hospital si estuviera vacío
    if (!rawList || rawList.length === 0) {
      rawList = getReferenceCases();
    }

    // Normalizar y enriquecer peticiones para la enfermera gestora
    state.peticiones = rawList.map((item, idx) => normalizePetition(item, idx));

    // Comprobar cruces multi-servicio por NHC
    tagMultiServicePatients();

    renderAll();
  }

  function getReferenceCases() {
    return [
      {
        "Submission ID": "PET-2026-001",
        "NHC / Historia Clínica": "NHC-652391",
        "Nombre del Paciente": "Rosa María Otero Gómez",
        "Edad": 62,
        "Sexo": "Mujer",
        "Servicio Solicitante": "Oncología Médica",
        "Médico Solicitante": "Dra. Isabel Calvo",
        "Diagnóstico Clínico": "Carcinoma de ovario seroso de alto grado estadío IIIC. Valoración de respuesta a quimioterapia adyuvante.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Ginecología)",
        "Prioridad Calculada": "🔴 P1",
        "Estado PET": "citado",
        "Fecha Cita PET": getFutureDateISO(2),
        "Hora Cita PET": "08:30"
      },
      {
        "Submission ID": "PET-2026-002",
        "NHC / Historia Clínica": "NHC-652391",
        "Nombre del Paciente": "Rosa María Otero Gómez",
        "Edad": 62,
        "Sexo": "Mujer",
        "Servicio Solicitante": "Cirugía General & Digestiva",
        "Médico Solicitante": "Dr. Fernando Seijas",
        "Diagnóstico Clínico": "Valoración de citorreducción secundaria en carcinomatosis peritoneal ovárica.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Cirugía)",
        "Prioridad Calculada": "🟡 P2",
        "Estado PET": "pendiente",
        "Fecha Cita PET": null
      },
      {
        "Submission ID": "PET-2026-003",
        "NHC / Historia Clínica": "NHC-741902",
        "Nombre del Paciente": "Carmen Lois Souto",
        "Edad": 58,
        "Sexo": "Mujer",
        "Servicio Solicitante": "Neumología",
        "Médico Solicitante": "Dra. Marta Veiga",
        "Diagnóstico Clínico": "Nódulo pulmonar espiculado de 14 mm en LSI detectado en TAC. Sospecha malignidad.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Pulmón)",
        "Prioridad Calculada": "🟡 P2",
        "Estado PET": "citado",
        "Fecha Cita PET": getFutureDateISO(3),
        "Hora Cita PET": "09:15"
      },
      {
        "Submission ID": "PET-2026-004",
        "NHC / Historia Clínica": "NHC-813405",
        "Nombre del Paciente": "Manuel Quintela Ferro",
        "Edad": 67,
        "Sexo": "Hombre",
        "Servicio Solicitante": "Hematología",
        "Médico Solicitante": "Dr. Manuel Quintela",
        "Diagnóstico Clínico": "Linfoma no Hodgkin B difuso de célula grande estadio IV con adenopatías retroperitoneales.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Hematológico / Linfoma)",
        "Prioridad Calculada": "🔴 P1",
        "Estado PET": "informado",
        "Fecha Cita PET": getTodayISO(),
        "Hora Cita PET": "08:45"
      },
      {
        "Submission ID": "PET-2026-005",
        "NHC / Historia Clínica": "NHC-398244",
        "Nombre del Paciente": "Ángel Souto Fernández",
        "Edad": 71,
        "Sexo": "Hombre",
        "Servicio Solicitante": "Urología",
        "Médico Solicitante": "Dr. Antonio Casal",
        "Diagnóstico Clínico": "Adenocarcinoma prostático tratado con prostatectomía radical. Recidiva bioquímica PSA 1.45 ng/mL.",
        "Tipo de Estudio PET Solicitado": "18F-PSMA (Recidiva Prostática)",
        "Prioridad Calculada": "🟡 P2",
        "Estado PET": "citado",
        "Fecha Cita PET": getFutureDateISO(6),
        "Hora Cita PET": "10:30"
      },
      {
        "Submission ID": "PET-2026-006",
        "NHC / Historia Clínica": "NHC-509182",
        "Nombre del Paciente": "Domingo Besteiro Prado",
        "Edad": 64,
        "Sexo": "Hombre",
        "Servicio Solicitante": "Aparato Digestivo",
        "Médico Solicitante": "Dra. Teresa Domínguez",
        "Diagnóstico Clínico": "Adenocarcinoma de cabeza de páncreas con sospecha de metástasis hepáticas.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Páncreas)",
        "Prioridad Calculada": "🔴 P1",
        "Estado PET": "pendiente",
        "Fecha Cita PET": null
      },
      {
        "Submission ID": "PET-2026-007",
        "NHC / Historia Clínica": "NHC-481920",
        "Nombre del Paciente": "Rosa María Calvo Soto",
        "Edad": 75,
        "Sexo": "Mujer",
        "Servicio Solicitante": "Neurología",
        "Médico Solicitante": "Dr. Carlos Loureiro",
        "Diagnóstico Clínico": "Deterioro cognitivo leve-moderado atípico. Diagnóstico diferencial Alzheimer vs DFT.",
        "Tipo de Estudio PET Solicitado": "18F-FDG Cerebral (Neurología)",
        "Prioridad Calculada": "🟢 P3",
        "Estado PET": "citado",
        "Fecha Cita PET": getFutureDateISO(10),
        "Hora Cita PET": "11:45"
      },
      {
        "Submission ID": "PET-2026-008",
        "NHC / Historia Clínica": "NHC-892143",
        "Nombre del Paciente": "Javier Pardo Vilar",
        "Edad": 53,
        "Sexo": "Hombre",
        "Servicio Solicitante": "Oncología Médica",
        "Médico Solicitante": "Dr. Gómez Pardo",
        "Diagnóstico Clínico": "Melanoma maligno en tronco con adenopatía inguinal palpable. Estadificación ganglionar y a distancia.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Melanoma)",
        "Prioridad Calculada": "🔴 P1",
        "Estado PET": "citado",
        "Fecha Cita PET": getFutureDateISO(5),
        "Hora Cita PET": "09:00"
      }
    ];
  }

  function normalizePetition(raw, idx) {
    const id = raw['Submission ID'] || raw.id || `sub_${idx + 1}`;
    const nhc = raw['NHC / Historia Clínica'] || raw.nhc || `NHC-${100000 + idx}`;
    const nombre = raw['Nombre del Paciente'] || raw.nombre || 'Paciente';
    const edad = raw['Edad'] || raw.edad || 65;
    const sexo = raw['Sexo'] || raw.sexo || 'Indiferente';
    const servicio = raw['Servicio Solicitante'] || raw.servicio || 'Oncología Médica';
    const medico = raw['Médico Solicitante'] || raw.medicoSolicitante || 'Facultativo Especialista';
    const diag = raw['Diagnóstico Clínico'] || raw.diagnostico || 'Estudio PET';
    const estudio = raw['Tipo de Estudio PET Solicitado'] || raw.estudio || '18F-FDG';
    const prio = raw['Prioridad Calculada'] || raw.prioridad || '🟡 P2';

    // Estado del circuito PET
    let estadoPet = 'pendiente'; // pendiente, citado, proceso, informado
    if (raw['Estado PET']) {
      estadoPet = raw['Estado PET'];
    } else if (raw.informeValidado || raw.estado === 'informado' || raw['Estado de Triaje'] === 'Informado') {
      estadoPet = 'informado';
    } else if (raw.horaRealMaquina || raw.estado === 'en_proceso' || raw.estado === 'realizado') {
      estadoPet = 'proceso';
    } else if (raw.horaPrevistaMaquina || raw['Fecha Cita PET'] || raw.citado) {
      estadoPet = 'citado';
    }

    const fechaCitaPet = raw['Fecha Cita PET'] || (estadoPet !== 'pendiente' ? getFutureDateISO(2 + (idx % 6)) : null);
    const horaCitaPet = raw['Hora Cita PET'] || (fechaCitaPet ? `${String(8 + (idx % 5)).padStart(2, '0')}:${(idx % 2 === 0 ? '00' : '30')}` : null);

    // Consulta sucesiva agendada por la gestora (desde almacenamiento)
    const consultaData = state.consultasMap[nhc] || state.consultasMap[id] || null;

    // Calcular estado de coordinación
    const semaforoCoord = calcularCoordinacion(fechaCitaPet, consultaData ? consultaData.fechaConsulta : null, estadoPet);

    return {
      id,
      nhc,
      nombre,
      edad,
      sexo,
      servicio,
      medico,
      diag,
      estudio,
      prioridad: prio.includes('P1') ? 'P1' : (prio.includes('P2') ? 'P2' : 'P3'),
      estadoPet,
      fechaCitaPet,
      horaCitaPet,
      consulta: consultaData,
      semaforoCoord,
      isMultiService: false,
      otherServices: []
    };
  }

  // Identificar pacientes con peticiones en varios servicios clínicos (Cruce Multi-Servicio)
  function tagMultiServicePatients() {
    const nhcMap = new Map();
    state.peticiones.forEach(p => {
      if (!nhcMap.has(p.nhc)) nhcMap.set(p.nhc, []);
      nhcMap.get(p.nhc).push(p);
    });

    nhcMap.forEach((list, nhc) => {
      const services = Array.from(new Set(list.map(p => p.servicio)));
      if (services.length > 1) {
        list.forEach(p => {
          p.isMultiService = true;
          p.otherServices = services.filter(s => s !== p.servicio);
        });
      }
    });
  }

  // ==========================================================================
  // 2. MOTOR DE EVALUACIÓN DE COORDINACIÓN CLÍNICA (PET vs CONSULTA SUCESIVA)
  // ==========================================================================
  function calcularCoordinacion(fechaPet, fechaConsulta, estadoPet) {
    if (!fechaConsulta) {
      return {
        tipo: 'pendiente_consulta',
        badgeClass: 'badge-neutral',
        badgeText: '⏳ Pendiente Fecha Consulta',
        diasMargen: null,
        explicacion: 'No se ha registrado aún la fecha de la cita con el especialista.'
      };
    }

    if (!fechaPet && estadoPet !== 'informado') {
      return {
        tipo: 'critico',
        badgeClass: 'badge-danger',
        badgeText: '🔴 Sin Cita PET Asignada',
        diasMargen: null,
        explicacion: '¡Alerta! La consulta clínica ya tiene fecha pero el PET aún no está citado.'
      };
    }

    if (estadoPet === 'informado') {
      return {
        tipo: 'optimo',
        badgeClass: 'badge-ok',
        badgeText: '🟢 Informe PET Disponible',
        diasMargen: 999,
        explicacion: 'Estudio completado y validado en IANUS, listo para la consulta.'
      };
    }

    const dPet = parseISODate(fechaPet);
    const dCons = parseISODate(fechaConsulta);

    if (!dPet || !dCons) {
      return {
        tipo: 'desconocido',
        badgeClass: 'badge-neutral',
        badgeText: 'ℹ️ Fechas no disponibles',
        diasMargen: null,
        explicacion: 'Formato de fecha no procesable.'
      };
    }

    const diffDays = Math.round((dCons - dPet) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        tipo: 'critico',
        badgeClass: 'badge-danger',
        badgeText: `🔴 Descoordinado (PET posterior por ${Math.abs(diffDays)}d)`,
        diasMargen: diffDays,
        explicacion: '¡Grave! El PET está citado después del día de la consulta médica.'
      };
    }

    if (diffDays === 0) {
      return {
        tipo: 'critico',
        badgeClass: 'badge-danger',
        badgeText: '🔴 Mismo Día (Sin margen de informe)',
        diasMargen: 0,
        explicacion: 'El PET se realiza el mismo día de la consulta; el facultativo no tendrá el informe redactado.'
      };
    }

    if (diffDays === 1) {
      return {
        tipo: 'ajustado',
        badgeClass: 'badge-warn',
        badgeText: '🟡 Margen Ajustado (24h previas)',
        diasMargen: 1,
        explicacion: 'Margen de 24 horas. Precisa informe prioritario el mismo día del escáner.'
      };
    }

    return {
      tipo: 'optimo',
      badgeClass: 'badge-ok',
      badgeText: `🟢 Margen Óptimo (${diffDays} días previos)`,
      diasMargen: diffDays,
      explicacion: 'Coordinación excelente: tiempo suficiente para informe radiológico antes de la visita.'
    };
  }

  // ==========================================================================
  // 3. RENDERIZADO DE LA INTERFAZ
  // ==========================================================================
  function renderAll() {
    renderKPIs();
    renderTabsCounts();
    renderMainTable();
  }

  function renderKPIs() {
    const srv = state.servicioActivo;
    const listSrv = srv === 'todos' ? state.peticiones : state.peticiones.filter(p => p.servicio === srv);

    const total = listSrv.length;
    const p1Count = listSrv.filter(p => p.prioridad === 'P1').length;
    const p2Count = listSrv.filter(p => p.prioridad === 'P2').length;
    const p3Count = listSrv.filter(p => p.prioridad === 'P3').length;

    const conConsulta = listSrv.filter(p => p.consulta && p.consulta.fechaConsulta).length;
    const pctConConsulta = total > 0 ? Math.round((conConsulta / total) * 100) : 0;

    const alertas = listSrv.filter(p => p.semaforoCoord.tipo === 'critico' || p.semaforoCoord.tipo === 'ajustado').length;
    const informados = listSrv.filter(p => p.estadoPet === 'informado').length;

    // Actualizar elementos DOM
    const elTot = document.getElementById('kpiTotalPeticionesServicio');
    const elBadge = document.getElementById('kpiServicioActivoBadge');
    const elPrio = document.getElementById('kpiDesglosePrioridades');
    const elConCons = document.getElementById('kpiConConsultaCount');
    const elPctCoord = document.getElementById('kpiPctCoordinadas');
    const elAlertas = document.getElementById('kpiAlertasCount');
    const elInf = document.getElementById('kpiInformesListosCount');
    const elBadgeTop = document.getElementById('badgeTotalPacientesServicio');

    if (elTot) elTot.textContent = total;
    if (elBadge) elBadge.textContent = srv === 'todos' ? 'Hospital Global' : srv;
    if (elPrio) elPrio.textContent = `🔴 P1: ${p1Count} · 🟡 P2: ${p2Count} · 🟢 P3: ${p3Count}`;
    if (elConCons) elConCons.textContent = conConsulta;
    if (elPctCoord) elPctCoord.textContent = `${pctConConsulta}% con fecha`;
    if (elAlertas) elAlertas.textContent = alertas;
    if (elInf) elInf.textContent = informados;
    if (elBadgeTop) elBadgeTop.textContent = `${total} pacientes`;

    // Títulos de panel
    const elTit = document.getElementById('tituloPanelPrincipal');
    const elSub = document.getElementById('subtituloPanelPrincipal');
    if (elTit) {
      elTit.textContent = srv === 'todos'
        ? 'Todos los Servicios Hospitalarios: Situación PET/CT y Consultas Sucesivas'
        : `Pacientes de ${srv}: Situación PET/CT y Consultas Sucesivas`;
    }
    if (elSub) {
      elSub.textContent = `Coordinación de agendas entre Medicina Nuclear y Consultas Externas · ${srv}`;
    }
  }

  function renderTabsCounts() {
    const srv = state.servicioActivo;
    const listSrv = srv === 'todos' ? state.peticiones : state.peticiones.filter(p => p.servicio === srv);

    const bTodas = document.getElementById('badgeTabTodas');
    const bProx = document.getElementById('badgeTabProximas');
    const bDesc = document.getElementById('badgeTabDescoordinadas');
    const bInf = document.getElementById('badgeTabInformadas');

    const proxCount = listSrv.filter(p => {
      if (!p.consulta || !p.consulta.fechaConsulta) return false;
      const d = parseISODate(p.consulta.fechaConsulta);
      const hoy = new Date();
      if (!d) return false;
      const diff = Math.round((d - hoy) / (1000 * 60 * 60 * 24));
      return diff >= 0 && diff <= 15;
    }).length;

    const descCount = listSrv.filter(p => p.semaforoCoord.tipo === 'critico').length;
    const infCount = listSrv.filter(p => p.estadoPet === 'informado').length;

    if (bTodas) bTodas.textContent = listSrv.length;
    if (bProx) bProx.textContent = proxCount;
    if (bDesc) bDesc.textContent = descCount;
    if (bInf) bInf.textContent = infCount;
  }

  function renderMainTable() {
    const srv = state.servicioActivo;
    const q = state.busquedaQuery.toLowerCase().trim();
    const subTab = state.subTabActiva;

    const banner = document.getElementById('bannerBusquedaNhc');
    let filtrados = [];

    // BÚSQUEDA UNIVERSAL POR NHC: si el usuario escribe en el buscador, busca en TODO el hospital
    if (q.length > 0) {
      filtrados = state.peticiones.filter(p => {
        const text = `${p.nhc} ${p.nombre} ${p.medico} ${p.diag} ${p.servicio} ${p.estudio}`.toLowerCase();
        return text.includes(q);
      });

      if (banner) {
        banner.style.display = 'block';
        banner.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div>
              <strong>🔍 Búsqueda Universal Hospitalaria Activa ("${escapeHTML(q)}"):</strong>
              Buscando coincidencias en <strong>todos los servicios del hospital</strong> (${filtrados.length} resultados encontrados).
            </div>
            <button type="button" class="btn-gestora btn-gestora-outline" style="padding:2px 8px; font-size:0.75rem;"
              onclick="window.gestoraApp.limpiarBusqueda()">✕ Restaurar Servicio</button>
          </div>
        `;
      }
    } else {
      if (banner) banner.style.display = 'none';

      // Filtrado por servicio clínico habitual de la gestora
      filtrados = srv === 'todos' ? state.peticiones : state.peticiones.filter(p => p.servicio === srv);

      // Filtrado según sub-pestaña seleccionada
      if (subTab === 'proximas_consultas') {
        const hoy = new Date();
        filtrados = filtrados.filter(p => {
          if (!p.consulta || !p.consulta.fechaConsulta) return false;
          const d = parseISODate(p.consulta.fechaConsulta);
          if (!d) return false;
          const diff = Math.round((d - hoy) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 15;
        });
      } else if (subTab === 'descoordinadas') {
        filtrados = filtrados.filter(p => p.semaforoCoord.tipo === 'critico' || p.semaforoCoord.tipo === 'ajustado');
      } else if (subTab === 'informadas') {
        filtrados = filtrados.filter(p => p.estadoPet === 'informado');
      }
    }

    // Filtros secundarios (Selects de estado PET y semáforo)
    if (state.filtroEstadoPet !== 'todos') {
      filtrados = filtrados.filter(p => p.estadoPet === state.filtroEstadoPet);
    }
    if (state.filtroSemaforo !== 'todos') {
      filtrados = filtrados.filter(p => p.semaforoCoord.tipo === state.filtroSemaforo);
    }

    // Si la sub-pestaña es 'cruce_nhc', renderizar vista agrupada de fichas
    if (subTab === 'cruce_nhc') {
      renderFichasCruceNhc(filtrados);
      return;
    }

    document.getElementById('contenedorTablaPrincipal').style.display = 'block';
    document.getElementById('contenedorFichasNhc').style.display = 'none';

    const tbody = document.getElementById('tablaGestoraBody');
    if (!tbody) return;

    if (filtrados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align:center; padding:2rem; color:#64748b;">
            🔍 No se encontraron pacientes para este servicio con los criterios seleccionados.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtrados.map(p => {
      const pBadge = p.prioridad === 'P1' ? 'badge-danger' : (p.prioridad === 'P2' ? 'badge-warn' : 'badge-ok');

      // Stepper gráfico del estado PET
      const stepperHtml = renderStepperPet(p);

      // Info de próxima consulta (enlazada con la clínica)
      const consultaHtml = p.consulta && p.consulta.fechaConsulta
        ? `
          <div>
            <strong style="color:#4c1d95; font-size:0.86rem;">📅 ${formatShortDate(p.consulta.fechaConsulta)}</strong>
            <span style="font-size:0.74rem; color:#6d28d9;">(${escapeHTML(p.consulta.horaConsulta || '10:00')})</span>
            <div style="font-size:0.72rem; color:#475569; margin-top:2px;">
              ${escapeHTML(p.consulta.medicoConsulta || 'Especialista')}
            </div>
            <div style="font-size:0.68rem; color:#7c3aed; font-weight:700;">
              ${escapeHTML(p.consulta.tipoConsulta || 'Consulta Sucesiva')}
            </div>
            <button type="button" class="btn-gestora btn-gestora-outline" style="padding:1px 6px; font-size:0.68rem; margin-top:3px;"
              onclick="window.gestoraApp.abrirModalNuevaConsulta('${p.id}')" title="Modificar cita enlazada con la clínica">
              ✏️ Modificar
            </button>
          </div>
        `
        : `
          <button type="button" class="btn-gestora btn-gestora-primary" style="padding:4px 9px; font-size:0.74rem; font-weight:700;"
            onclick="window.gestoraApp.abrirModalNuevaConsulta('${p.id}')" title="Asignar cita vinculada a la clínica del paciente">
            ➕ Asignar Cita
          </button>
        `;

      // Cruce multi-servicio badge
      const multiServBadge = p.isMultiService
        ? `<div style="margin-top:3px;"><span class="status-badge badge-purple" style="font-size:0.65rem;" title="Tiene otras peticiones en: ${p.otherServices.join(', ')}">🌐 Cruce: ${p.otherServices.join(', ')}</span></div>`
        : '';

      return `
        <tr>
          <td>
            <div style="display:flex; align-items:center; gap:8px;">
              <div class="nhc-patient-avatar" style="width:34px; height:34px; font-size:0.9rem; cursor:pointer;"
                onclick="window.gestoraApp.abrirModalDetalle('${p.id}')" title="Ver clínica del paciente">
                ${escapeHTML(p.nombre.charAt(0))}
              </div>
              <div>
                <strong style="color:#0f172a; font-size:0.88rem; cursor:pointer;"
                  onclick="window.gestoraApp.abrirModalDetalle('${p.id}')" title="Ver clínica del paciente">
                  ${escapeHTML(p.nombre)}
                </strong>
                <div style="font-family:'JetBrains Mono',monospace; font-size:0.75rem; color:#7c3aed; font-weight:700; cursor:pointer;"
                  onclick="window.gestoraApp.abrirModalDetalle('${p.id}')" title="Ver ficha clínica">
                  ${escapeHTML(p.nhc)} <span style="color:#64748b; font-weight:500;">· ${p.edad}a · ${p.sexo.charAt(0)}</span>
                </div>
                ${multiServBadge}
              </div>
            </div>
          </td>
          <td>
            <strong style="color:#1e293b; font-size:0.82rem;">${escapeHTML(p.servicio)}</strong>
            <div style="font-size:0.74rem; color:#475569;">${escapeHTML(p.medico)}</div>
          </td>
          <td>
            <strong style="color:#004868; font-size:0.82rem; cursor:pointer;"
              onclick="window.gestoraApp.abrirModalDetalle('${p.id}')" title="Ver clínica del paciente">
              ${escapeHTML(p.estudio)}
            </strong>
            <div style="font-size:0.72rem; color:#64748b; max-width:220px; line-height:1.25; margin-top:2px; cursor:pointer;"
              onclick="window.gestoraApp.abrirModalDetalle('${p.id}')" title="Ver ficha clínica completa: ${escapeHTML(p.diag)}">
              🩺 ${escapeHTML(p.diag.length > 52 ? p.diag.substring(0, 49) + '...' : p.diag)}
            </div>
          </td>
          <td>
            <span class="status-badge ${pBadge}">${p.prioridad}</span>
          </td>
          <td>
            ${stepperHtml}
          </td>
          <td>
            ${consultaHtml}
          </td>
          <td>
            <span class="status-badge ${p.semaforoCoord.badgeClass}" title="${escapeHTML(p.semaforoCoord.explicacion)}">
              ${p.semaforoCoord.badgeText}
            </span>
          </td>
          <td style="font-size:0.75rem; color:#334155; max-width:180px; line-height:1.3;">
            ${escapeHTML(p.consulta && p.consulta.notasGestora ? p.consulta.notasGestora : 'Sin notas')}
          </td>
          <td class="no-print">
            <div style="display:flex; gap:4px;">
              <button type="button" class="btn-gestora btn-gestora-outline" style="padding:3px 7px; font-size:0.72rem; color:#0284c7; border-color:#bae6fd;"
                onclick="window.gestoraApp.abrirModalDetalle('${p.id}')" title="Ver Clínica del Paciente">
                🩺 Clínica
              </button>
              <button type="button" class="btn-gestora btn-gestora-outline" style="padding:3px 7px; font-size:0.72rem; color:#7c3aed; border-color:#ddd6fe;"
                onclick="window.gestoraApp.abrirModalNuevaConsulta('${p.id}')" title="Asignar o Modificar Cita">
                📅 Cita
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  function renderStepperPet(p) {
    const isPendiente = p.estadoPet === 'pendiente';
    const isCitado = p.estadoPet === 'citado';
    const isProceso = p.estadoPet === 'proceso';
    const isInformado = p.estadoPet === 'informado';

    let estadoLabel = '🟡 Petición Registrada';
    let subtext = 'En espera de triaje/aceptación';

    if (isInformado) {
      estadoLabel = '✅ Informe Validado';
      subtext = `Cita: ${formatShortDate(p.fechaCitaPet)} · Dictamen OK`;
    } else if (isProceso) {
      estadoLabel = '🏥 En Box / Adquisición';
      subtext = 'Prueba en ejecución hoy';
    } else if (isCitado) {
      estadoLabel = `📅 Cita PET: ${formatShortDate(p.fechaCitaPet)}`;
      subtext = `A las ${p.horaCitaPet || '09:00'} h · Máquina PET`;
    }

    return `
      <div>
        <div style="font-weight:800; font-size:0.8rem; color:#0f172a;">${estadoLabel}</div>
        <div style="font-size:0.72rem; color:#64748b; margin-top:1px;">${subtext}</div>
        <div class="pet-progress-stepper" style="margin-top:4px;">
          <span class="step-dot ${isPendiente ? 'step-active' : 'step-done'}" title="Petición">1</span>
          <span style="color:#cbd5e1;">-</span>
          <span class="step-dot ${isCitado ? 'step-active' : (isProceso || isInformado ? 'step-done' : 'step-pending')}" title="Citada">2</span>
          <span style="color:#cbd5e1;">-</span>
          <span class="step-dot ${isProceso ? 'step-active' : (isInformado ? 'step-done' : 'step-pending')}" title="Realizada">3</span>
          <span style="color:#cbd5e1;">-</span>
          <span class="step-dot ${isInformado ? 'step-done' : 'step-pending'}" title="Informe">4</span>
        </div>
      </div>
    `;
  }

  // Vista especial para agrupar pacientes por NHC y ver cruce multi-servicio
  function renderFichasCruceNhc(peticionesList) {
    document.getElementById('contenedorTablaPrincipal').style.display = 'none';
    const contFichas = document.getElementById('contenedorFichasNhc');
    contFichas.style.display = 'block';

    const porNhc = new Map();
    peticionesList.forEach(p => {
      if (!porNhc.has(p.nhc)) porNhc.set(p.nhc, []);
      porNhc.get(p.nhc).push(p);
    });

    if (porNhc.size === 0) {
      contFichas.innerHTML = '<div style="text-align:center; padding:2rem; color:#64748b;">No hay pacientes para mostrar.</div>';
      return;
    }

    contFichas.innerHTML = Array.from(porNhc.entries()).map(([nhc, petList]) => {
      const pac = petList[0];
      const services = Array.from(new Set(petList.map(p => p.servicio)));

      return `
        <div class="nhc-patient-card">
          <div class="nhc-patient-header">
            <div class="nhc-patient-title">
              <div class="nhc-patient-avatar">${pac.nombre.charAt(0)}</div>
              <div>
                <strong style="font-size:1.05rem; color:#1e1b4b; font-family:'Outfit',sans-serif;">${escapeHTML(pac.nombre)}</strong>
                <div style="font-family:'JetBrains Mono',monospace; font-size:0.8rem; color:#7c3aed; font-weight:700;">
                  NHC: ${escapeHTML(nhc)} · ${pac.edad} años · Sexo: ${escapeHTML(pac.sexo)}
                </div>
              </div>
            </div>
            <div>
              <span class="status-badge badge-purple" style="font-size:0.75rem; font-weight:800;">
                🏥 Servicios Involucrados (${services.length}): ${services.join(' · ')}
              </span>
            </div>
          </div>

          <div class="nhc-petitions-timeline">
            ${petList.map(p => `
              <div class="nhc-petition-row">
                <div style="flex:1; min-width:220px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span class="status-badge ${p.prioridad === 'P1' ? 'badge-danger' : 'badge-warn'}">${p.prioridad}</span>
                    <strong style="color:#004868; font-size:0.88rem;">${escapeHTML(p.servicio)}</strong>
                    <span style="font-size:0.78rem; color:#64748b;">(${escapeHTML(p.medico)})</span>
                  </div>
                  <div style="font-size:0.8rem; color:#334155; margin-top:2px;">
                    <strong>Estudio:</strong> ${escapeHTML(p.estudio)} · <em>${escapeHTML(p.diag)}</em>
                  </div>
                </div>

                <div style="min-width:180px;">
                  <div style="font-size:0.74rem; font-weight:700; color:#475569;">CITA PET/CT:</div>
                  <strong style="font-size:0.82rem; color:#0f172a;">
                    ${p.fechaCitaPet ? `📅 ${formatShortDate(p.fechaCitaPet)} (${p.horaCitaPet || '09:00'})` : '🟡 Pendiente Asignación'}
                  </strong>
                </div>

                <div style="min-width:180px;">
                  <div style="font-size:0.74rem; font-weight:700; color:#475569;">PRÓXIMA CONSULTA:</div>
                  <strong style="font-size:0.82rem; color:#4c1d95;">
                    ${p.consulta && p.consulta.fechaConsulta ? `📅 ${formatShortDate(p.consulta.fechaConsulta)}` : '⏳ Sin Fecha Agendada'}
                  </strong>
                  <div style="font-size:0.7rem; color:#6d28d9;">
                    ${p.consulta ? escapeHTML(p.consulta.medicoConsulta || p.consulta.tipoConsulta) : ''}
                  </div>
                </div>

                <div>
                  <span class="status-badge ${p.semaforoCoord.badgeClass}">
                    ${p.semaforoCoord.badgeText}
                  </span>
                </div>

                <div>
                  <button type="button" class="btn-gestora btn-gestora-outline" style="padding:4px 8px; font-size:0.72rem;"
                    onclick="window.gestoraApp.abrirModalNuevaConsulta('${p.id}')">
                    ✏️ Editar Consulta
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  // ==========================================================================
  // 4. ACCIONES Y CONTROLADORES DE LA GESTORA
  // ==========================================================================
  function cambiarServicioActivo(servicio) {
    state.servicioActivo = servicio;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_SERVICIO, servicio);
      }
    } catch (_) {}
    renderAll();
    showToast(`🏥 Servicio cambiado a: ${servicio === 'todos' ? 'Todos los Servicios' : servicio}`);
  }

  function cambiarSubTab(tabName) {
    state.subTabActiva = tabName;
    document.querySelectorAll('.gestora-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    renderMainTable();
  }

  function onBusquedaUniversal(val) {
    state.busquedaQuery = val;
    renderMainTable();
  }

  function limpiarBusqueda() {
    state.busquedaQuery = '';
    const input = document.getElementById('inputBuscarUniversal');
    if (input) input.value = '';
    renderMainTable();
  }

  function aplicarFiltrosTabla() {
    const sPet = document.getElementById('selectFiltroEstadoPet');
    const sSem = document.getElementById('selectFiltroSemaforo');
    state.filtroEstadoPet = sPet ? sPet.value : 'todos';
    state.filtroSemaforo = sSem ? sSem.value : 'todos';
    renderMainTable();
  }

  function abrirModalNuevaConsulta(peticionId) {
    let p = null;
    const selectorContainer = document.getElementById('modalSelectorPacienteContainer');
    const selectDirecto = document.getElementById('modalSelectPacienteDirecto');

    if (peticionId) {
      p = state.peticiones.find(item => item.id === peticionId);
      if (selectorContainer) selectorContainer.style.display = 'none';
    } else {
      // Apertura desde la cabecera: permitir elegir paciente con selector
      if (selectorContainer && selectDirecto) {
        selectorContainer.style.display = 'block';
        selectDirecto.innerHTML = state.peticiones.map(item => `
          <option value="${item.id}" ${state.activePeticionEdit && state.activePeticionEdit.id === item.id ? 'selected' : ''}>
            ${escapeHTML(item.nombre)} (${escapeHTML(item.nhc)}) · ${escapeHTML(item.servicio)}
          </option>
        `).join('');
        const chosenId = selectDirecto.value || (state.peticiones[0] ? state.peticiones[0].id : null);
        p = state.peticiones.find(item => item.id === chosenId) || state.peticiones[0];
      } else {
        p = state.peticiones[0];
      }
    }
    if (!p) return;

    state.activePeticionEdit = p;

    const modal = document.getElementById('modalEditarConsulta');
    const box = document.getElementById('modalInfoPacienteBox');
    const inId = document.getElementById('modalInputIdPeticion');
    const inNhc = document.getElementById('modalInputNhc');
    const inFecha = document.getElementById('modalFechaConsulta');
    const inHora = document.getElementById('modalHoraConsulta');
    const inMed = document.getElementById('modalMedicoConsulta');
    const inTipo = document.getElementById('modalTipoConsulta');
    const inNotas = document.getElementById('modalNotasGestora');

    if (inId) inId.value = p.id;
    if (inNhc) inNhc.value = p.nhc;

    if (box) {
      box.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
          <div>
            <strong style="font-size:1rem; color:#1e1b4b;">${escapeHTML(p.nombre)}</strong>
            <span style="font-family:'JetBrains Mono',monospace; font-weight:700; margin-left:6px; color:#6d28d9;">(${escapeHTML(p.nhc)})</span>
            <div style="font-size:0.78rem; color:#475569; margin-top:2px;">
              <strong>Servicio:</strong> ${escapeHTML(p.servicio)} · <strong>Médico Peticionario:</strong> ${escapeHTML(p.medico)}
            </div>
          </div>
          <div>
            <span class="status-badge badge-purple">
              ${p.fechaCitaPet ? `Cita PET: ${formatShortDate(p.fechaCitaPet)} (${p.horaCitaPet || '09:00'})` : '⚠️ PET Sin Cita'}
            </span>
          </div>
        </div>

        <!-- PANEL DE CLÍNICA ENLAZADA DIRECTA -->
        <div class="clinical-highlight-box" style="margin: 0.5rem 0 0.2rem 0; background: #ffffff;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px;">
            <strong style="color:#0369a1; font-size:0.84rem; display:flex; align-items:center; gap:5px;">
              <span>🩺</span> Clínica del Paciente & Diagnóstico
            </strong>
            <button type="button" class="btn-open-clinical" onclick="window.gestoraApp.abrirDetalleDesdeModal()">
              <span>👁️</span> Ver Ficha Clínica Completa
            </button>
          </div>
          <div style="font-size:0.79rem; color:#1e293b; line-height:1.4;">
            <div><strong>Diagnóstico / Sospecha Clínica:</strong> <span style="color:#0f172a;">${escapeHTML(p.diag || 'No especificado')}</span></div>
            <div style="margin-top:2px;"><strong>Estudio PET & Radiofármaco:</strong> ${escapeHTML(p.estudio)} · <span class="status-badge ${p.prioridad === 'P1' ? 'badge-danger' : (p.prioridad === 'P2' ? 'badge-warn' : 'badge-ok')}" style="padding:1px 6px; font-size:0.7rem;">${p.prioridad}</span></div>
            <div style="margin-top:2px;"><strong>Estado Asistencial PET:</strong> ${escapeHTML(p.estadoPet.toUpperCase())} ${p.fechaCitaPet ? `(Citado para el ${formatShortDate(p.fechaCitaPet)})` : ''}</div>
          </div>
        </div>
      `;
    }

    const cons = p.consulta || {};
    if (inFecha) inFecha.value = cons.fechaConsulta || getFutureDateISO(7);
    if (inHora) inHora.value = cons.horaConsulta || '10:00';
    if (inMed) inMed.value = cons.medicoConsulta || `${p.medico} (${p.servicio})`;
    if (inTipo) inTipo.value = cons.tipoConsulta || 'Consulta Sucesiva / Revisión';
    if (inNotas) inNotas.value = cons.notasGestora || '';

    actualizarPreviewMargenModal();
    if (inFecha) inFecha.oninput = actualizarPreviewMargenModal;

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function onSelectPacienteDirecto(peticionId) {
    abrirModalNuevaConsulta(peticionId);
  }

  function abrirDetalleDesdeModal() {
    if (state.activePeticionEdit) {
      const pid = state.activePeticionEdit.id;
      cerrarModalConsulta();
      abrirModalDetalle(pid);
    }
  }

  function abrirCitaDesdeDetalle() {
    if (state.activeDetallePeticionId) {
      const pid = state.activeDetallePeticionId;
      cerrarModalDetalle();
      abrirModalNuevaConsulta(pid);
    }
  }

  function actualizarPreviewMargenModal() {
    const p = state.activePeticionEdit;
    const inFecha = document.getElementById('modalFechaConsulta');
    const prev = document.getElementById('modalPreviewMargen');
    if (!p || !inFecha || !prev) return;

    const fechaCons = inFecha.value;
    if (!fechaCons) {
      prev.innerHTML = '⚠️ Selecciona una fecha de consulta.';
      prev.style.color = '#b45309';
      return;
    }

    const evalCoord = calcularCoordinacion(p.fechaCitaPet, fechaCons, p.estadoPet);
    prev.innerHTML = `
      <span>Margen de Coordinación: </span>
      <span class="status-badge ${evalCoord.badgeClass}">${evalCoord.badgeText}</span>
      <span style="font-size:0.75rem; color:#475569; display:block; margin-top:2px;">${evalCoord.explicacion}</span>
    `;
  }

  function cerrarModalConsulta() {
    const modal = document.getElementById('modalEditarConsulta');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  function guardarConsultaSucesiva() {
    const inNhc = document.getElementById('modalInputNhc');
    const inId = document.getElementById('modalInputIdPeticion');
    const inFecha = document.getElementById('modalFechaConsulta');
    const inHora = document.getElementById('modalHoraConsulta');
    const inMed = document.getElementById('modalMedicoConsulta');
    const inTipo = document.getElementById('modalTipoConsulta');
    const inNotas = document.getElementById('modalNotasGestora');

    if (!inNhc || !inNhc.value || !inFecha || !inFecha.value) {
      showToast('⚠️ Por favor indica la fecha de la consulta médica.');
      return;
    }

    const nhc = inNhc.value;
    const id = inId ? inId.value : nhc;

    const nuevaConsulta = {
      fechaConsulta: inFecha.value,
      horaConsulta: inHora.value || '10:00',
      medicoConsulta: inMed.value.trim() || 'Especialista',
      tipoConsulta: inTipo.value,
      notasGestora: inNotas.value.trim(),
      updatedAt: new Date().toISOString()
    };

    state.consultasMap[nhc] = nuevaConsulta;
    state.consultasMap[id] = nuevaConsulta;
    saveConsultasStore(state.consultasMap);

    // Actualizar en memoria la petición activa
    state.peticiones.forEach(p => {
      if (p.nhc === nhc || p.id === id) {
        p.consulta = nuevaConsulta;
        p.semaforoCoord = calcularCoordinacion(p.fechaCitaPet, nuevaConsulta.fechaConsulta, p.estadoPet);
      }
    });

    if (broadcast) {
      broadcast.postMessage({
        action: 'CONSULTA_SUCESIVA_UPDATED',
        nhc: nhc,
        id: id,
        consulta: nuevaConsulta
      });
    }

    cerrarModalConsulta();
    renderAll();
    showToast(`💾 Cita de consulta sucesiva para ${nhc} sincronizada con éxito.`);
  }

  function abrirModalDetalle(peticionId) {
    const p = state.peticiones.find(item => item.id === peticionId);
    if (!p) return;

    state.activeDetallePeticionId = p.id;

    const modal = document.getElementById('modalDetallePaciente');
    const cont = document.getElementById('modalDetalleContenido');
    const tit = document.getElementById('modalDetalleTitulo');

    if (tit) tit.textContent = `👁️ Ficha y Trazabilidad: ${p.nombre} (${p.nhc})`;

    if (cont) {
      cont.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div style="background:#f8fafc; border:1px solid #cbd5e1; border-radius:10px; padding:1rem;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <strong style="font-size:1.05rem; color:#0f172a;">${escapeHTML(p.nombre)}</strong>
              <span class="status-badge ${p.prioridad === 'P1' ? 'badge-danger' : 'badge-warn'}">Prioridad ${p.prioridad}</span>
            </div>
            <div style="font-size:0.8rem; color:#475569; margin-top:3px;">
              <strong>NHC:</strong> ${escapeHTML(p.nhc)} · <strong>Edad:</strong> ${p.edad} años · <strong>Sexo:</strong> ${escapeHTML(p.sexo)}
            </div>
            <div style="font-size:0.8rem; color:#004868; margin-top:4px;">
              <strong>Servicio:</strong> ${escapeHTML(p.servicio)} · <strong>Médico:</strong> ${escapeHTML(p.medico)}
            </div>
            <div style="font-size:0.8rem; color:#334155; margin-top:4px;">
              <strong>Diagnóstico:</strong> ${escapeHTML(p.diag)}
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.85rem;">
            <div style="background:#f0f9ff; border:1px solid #bae6fd; border-radius:8px; padding:0.85rem;">
              <strong style="color:#0369a1; font-size:0.85rem; display:block; margin-bottom:4px;">☢️ Circuito Medicina Nuclear / PET</strong>
              <div style="font-size:0.8rem;">• Radiofármaco: <strong>${escapeHTML(p.estudio)}</strong></div>
              <div style="font-size:0.8rem;">• Estado actual: <strong>${escapeHTML(p.estadoPet.toUpperCase())}</strong></div>
              <div style="font-size:0.8rem;">• Fecha Tomógrafo: <strong>${p.fechaCitaPet ? formatShortDate(p.fechaCitaPet) + ' ' + (p.horaCitaPet || '') : 'Sin cita asignada'}</strong></div>
            </div>

            <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:8px; padding:0.85rem;">
              <strong style="color:#6d28d9; font-size:0.85rem; display:block; margin-bottom:4px;">📅 Consulta Sucesiva Especialista</strong>
              <div style="font-size:0.8rem;">• Fecha Consulta: <strong>${p.consulta && p.consulta.fechaConsulta ? formatShortDate(p.consulta.fechaConsulta) + ' (' + p.consulta.horaConsulta + ')' : 'No fijada'}</strong></div>
              <div style="font-size:0.8rem;">• Atiende: <strong>${escapeHTML(p.consulta ? p.consulta.medicoConsulta : '—')}</strong></div>
              <div style="font-size:0.8rem;">• Tipo: <strong>${escapeHTML(p.consulta ? p.consulta.tipoConsulta : '—')}</strong></div>
            </div>
          </div>

          <div style="background:#ecfdf5; border:1px solid #6ee7b7; border-radius:8px; padding:0.85rem;">
            <strong style="color:#065f46; font-size:0.85rem; display:block; margin-bottom:4px;">🚦 Semáforo de Coordinación Asistencial:</strong>
            <span class="status-badge ${p.semaforoCoord.badgeClass}">${p.semaforoCoord.badgeText}</span>
            <div style="font-size:0.78rem; color:#065f46; margin-top:4px;">${p.semaforoCoord.explicacion}</div>
          </div>

          <div>
            <strong style="font-size:0.82rem; color:#1e293b; display:block; margin-bottom:4px;">📝 Notas de la Enfermera Gestora de Casos:</strong>
            <div style="background:#ffffff; border:1px solid #cbd5e1; border-radius:6px; padding:0.75rem; font-size:0.8rem; color:#334155;">
              ${escapeHTML(p.consulta && p.consulta.notasGestora ? p.consulta.notasGestora : 'Sin observaciones registradas por la gestora.')}
            </div>
          </div>
        </div>
      `;
    }

    if (modal) {
      modal.style.display = 'flex';
      modal.classList.add('active');
    }
  }

  function cerrarModalDetalle() {
    const modal = document.getElementById('modalDetallePaciente');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('active');
    }
  }

  function exportarCsv() {
    const srv = state.servicioActivo;
    const list = srv === 'todos' ? state.peticiones : state.peticiones.filter(p => p.servicio === srv);

    const rows = [
      ['NHC', 'Paciente', 'Edad', 'Sexo', 'Servicio', 'Medico Solicitante', 'Estudio PET', 'Prioridad', 'Estado PET', 'Fecha Cita PET', 'Hora PET', 'Fecha Consulta Sucesiva', 'Medico Consulta', 'Tipo Consulta', 'Semaforo Coordinacion', 'Notas Gestora'],
      ...list.map(p => [
        p.nhc,
        p.nombre,
        p.edad,
        p.sexo,
        p.servicio,
        p.medico,
        p.estudio,
        p.prioridad,
        p.estadoPet,
        p.fechaCitaPet || '',
        p.horaCitaPet || '',
        p.consulta ? p.consulta.fechaConsulta : '',
        p.consulta ? p.consulta.medicoConsulta : '',
        p.consulta ? p.consulta.tipoConsulta : '',
        p.semaforoCoord.badgeText,
        p.consulta ? p.consulta.notasGestora : ''
      ])
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.href = encodedUri;
    link.download = `coordinacion_gestora_${srv.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${getTodayISO()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('📊 Listado de coordinación exportado en CSV.');
  }

  async function sincronizarDatos() {
    await loadAllData();
    showToast('🔄 Peticiones y citas sincronizadas en vivo con Medicina Nuclear y Consultas.');
  }

  function showToast(msg) {
    const container = document.getElementById('gestoraToastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'gestora-toast';
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => {
      if (div.parentNode) div.remove();
    }, 4500);
  }

  // Escuchar sincronización con el ecosistema
  if (broadcast) {
    broadcast.onmessage = () => {
      loadAllData();
    };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.startsWith('PET_') || e.key === STORAGE_KEY_CONSULTAS)) {
        loadAllData();
      }
    });
  }

  // Inicialización
  document.addEventListener('DOMContentLoaded', () => {
    loadAllData();
  });

  // Exportar API global
  if (typeof window !== 'undefined') {
    window.gestoraApp = {
      cambiarServicioActivo,
      cambiarSubTab,
      onBusquedaUniversal,
      limpiarBusqueda,
      aplicarFiltrosTabla,
      abrirModalNuevaConsulta,
      onSelectPacienteDirecto,
      abrirDetalleDesdeModal,
      abrirCitaDesdeDetalle,
      cerrarModalConsulta,
      guardarConsultaSucesiva,
      abrirModalDetalle,
      cerrarModalDetalle,
      exportarCsv,
      sincronizarDatos
    };
  }
})();
