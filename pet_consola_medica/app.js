/**
 * CONSOLA MÉDICA DE PROTOCOLIZACIÓN Y ADQUISICIÓN PET/CT — GALARIA · SERGAS
 * Módulo 5 del Ecosistema Digital PET/CT
 * Gestión de pacientes citados, volantes de petición e instrucciones técnicas de adquisición
 */

(function () {
  'use strict';

  // ==========================================================================
  // ESTADO GLOBAL DE LA APLICACIÓN
  // ==========================================================================
  const state = {
    allPatients: [],
    filteredPatients: [],
    protocols: {}, // key: patient id or nhc -> protocol object
    activeFilterDate: 'today', // 'today', 'tomorrow', 'all', or 'YYYY-MM-DD'
    activeFilterStatus: 'all', // 'all', 'pending', 'done'
    activeFilterTracer: 'all',
    activeFilterTestType: 'all',
    searchTerm: '',
    currentView: 'cards', // 'cards' | 'table'
    activeMainView: 'agenda', // 'agenda' (citas confirmadas) | 'untriaged_folder' (carpeta no triables)
    selectedPriorities: {}, // map patientId -> 'P1'|'P2'|'P3'
    selectedPatient: null,
    editingProtocol: null
  };

  // Referencias DOM
  const elements = {};

  // ==========================================================================
  // INICIALIZACIÓN
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', init);

  async function init() {
    cacheDomElements();
    setupEventListeners();
    setupInteractiveRadioCards();
    setupProtocolNavTabs();
    loadStoredProtocols();
    await loadPatientsData();
    render();
  }

  function cacheDomElements() {
    elements.kpiTotalCitados = document.getElementById('kpiTotalCitados');
    elements.kpiPendientes = document.getElementById('kpiPendientes');
    elements.kpiProtocolizados = document.getElementById('kpiProtocolizados');
    elements.kpiAlertas = document.getElementById('kpiAlertas');
    elements.kpiFechaSub = document.getElementById('kpiFechaSub');

    elements.countTabAll = document.getElementById('countTabAll');
    elements.countTabPending = document.getElementById('countTabPending');
    elements.countTabDone = document.getElementById('countTabDone');
    elements.countTabUntriaged = document.getElementById('countTabUntriaged');

    // Navegación Principal: Agenda vs Carpeta No Triables
    elements.btnSwitchAgenda = document.getElementById('btnSwitchAgenda');
    elements.btnSwitchUntriaged = document.getElementById('btnSwitchUntriaged');
    elements.badgeAgendaCount = document.getElementById('badgeAgendaCount');
    elements.badgeUntriagedCount = document.getElementById('badgeUntriagedCount');
    elements.agendaSectionWrap = document.getElementById('agendaSectionWrap');
    elements.untriagedFolderWrap = document.getElementById('untriagedFolderWrap');
    elements.folderHeroCount = document.getElementById('folderHeroCount');
    elements.folderCountDisplay = document.getElementById('folderCountDisplay');
    elements.untriagedFolderCardsGrid = document.getElementById('untriagedFolderCardsGrid');
    elements.noUntriagedMessage = document.getElementById('noUntriagedMessage');

    elements.btnDateToday = document.getElementById('btnDateToday');
    elements.btnDateTomorrow = document.getElementById('btnDateTomorrow');
    elements.btnDateAll = document.getElementById('btnDateAll');
    elements.inputCustomDate = document.getElementById('inputCustomDate');
    elements.statusTabs = document.querySelectorAll('.status-tab');
    elements.searchInput = document.getElementById('searchInput');
    elements.selectTracer = document.getElementById('selectTracer');
    elements.selectTestType = document.getElementById('selectTestType');
    elements.btnViewCards = document.getElementById('btnViewCards');
    elements.btnViewTable = document.getElementById('btnViewTable');
    elements.btnSyncPatients = document.getElementById('btnSyncPatients');

    elements.patientsGrid = document.getElementById('patientsGrid');
    elements.patientsTableWrap = document.getElementById('patientsTableWrap');
    elements.patientsTableBody = document.getElementById('patientsTableBody');
    elements.noPatientsMessage = document.getElementById('noPatientsMessage');
    elements.sectionTitleText = document.getElementById('sectionTitleText');
    elements.displayFilteredCount = document.getElementById('displayFilteredCount');

    // Modal Protocolo
    elements.protocolModalBackdrop = document.getElementById('protocolModalBackdrop');
    elements.btnCloseProtocolModal = document.getElementById('btnCloseProtocolModal');
    elements.btnCancelProtocol = document.getElementById('btnCancelProtocol');
    elements.btnSaveProtocol = document.getElementById('btnSaveProtocol');
    elements.btnPrintProtocolSheet = document.getElementById('btnPrintProtocolSheet');
    elements.btnViewVolanteFromModal = document.getElementById('btnViewVolanteFromModal');

    // Elementos del Modal
    elements.modalPatName = document.getElementById('modalPatName');
    elements.modalPatNHC = document.getElementById('modalPatNHC');
    elements.modalPatAge = document.getElementById('modalPatAge');
    elements.modalPatWeight = document.getElementById('modalPatWeight');
    elements.modalPatTracer = document.getElementById('modalPatTracer');
    elements.modalPatGlucose = document.getElementById('modalPatGlucose');

    elements.inputCustomUptake = document.getElementById('inputCustomUptake');
    elements.wrapCustomRange = document.getElementById('wrapCustomRange');
    elements.inputCustomRange = document.getElementById('inputCustomRange');
    elements.inputDiureticMinutes = document.getElementById('inputDiureticMinutes');
    elements.inputContrastBoxMinutes = document.getElementById('inputContrastBoxMinutes');

    elements.txtDoctorNotes = document.getElementById('txtDoctorNotes');
    elements.selectDoctorSign = document.getElementById('selectDoctorSign');
    elements.displaySignTimestamp = document.getElementById('displaySignTimestamp');

    // Modal Volante
    elements.volanteModalBackdrop = document.getElementById('volanteModalBackdrop');
    elements.btnCloseVolanteModal = document.getElementById('btnCloseVolanteModal');
    elements.btnCloseVolanteModalBtn = document.getElementById('btnCloseVolanteModalBtn');
    elements.btnPrintVolanteFromViewer = document.getElementById('btnPrintVolanteFromViewer');
    elements.volanteIframe = document.getElementById('volanteIframe');
    elements.volanteModalSubtitle = document.getElementById('volanteModalSubtitle');

    // Modal Visor SIDI (SERGAS PACS)
    elements.sidiModalBackdrop = document.getElementById('sidiModalBackdrop');
    elements.btnCloseSidiModal = document.getElementById('btnCloseSidiModal');
    elements.btnCloseSidiModalBtn = document.getElementById('btnCloseSidiModalBtn');
    elements.btnViewSidiFromModal = document.getElementById('btnViewSidiFromModal');
    elements.btnLaunchExternalSidi = document.getElementById('btnLaunchExternalSidi');
    elements.btnSidiOrderTardia = document.getElementById('btnSidiOrderTardia');
    elements.btnSidiAuthorizeDischarge = document.getElementById('btnSidiAuthorizeDischarge');
    elements.btnSidiOpenProtocol = document.getElementById('btnSidiOpenProtocol');
    elements.sidiIframe = document.getElementById('sidiIframe');
    elements.sidiModalSubtitle = document.getElementById('sidiModalSubtitle');

    elements.toastContainer = document.getElementById('toastContainer');
  }

  // ==========================================================================
  // CARGA DE DATOS & INTEROPERABILIDAD
  // ==========================================================================
  function loadStoredProtocols() {
    try {
      const raw = localStorage.getItem('PET_MEDICAL_PROTOCOLS_V1');
      if (raw) {
        state.protocols = JSON.parse(raw) || {};
      }
    } catch (e) {
      console.warn('Error leyendo PET_MEDICAL_PROTOCOLS_V1:', e);
      state.protocols = {};
    }
  }

  function saveStoredProtocols() {
    try {
      localStorage.setItem('PET_MEDICAL_PROTOCOLS_V1', JSON.stringify(state.protocols));
      syncProtocolsToMasterDb();
    } catch (e) {
      console.warn('Error guardando PET_MEDICAL_PROTOCOLS_V1:', e);
    }
  }

  function syncProtocolsToMasterDb() {
    try {
      const rawMaster = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (rawMaster) {
        const masterList = JSON.parse(rawMaster);
        if (Array.isArray(masterList)) {
          let modified = false;
          masterList.forEach(item => {
            const key = item["Submission ID"] || item.id || item["NHC / Historia Clínica"] || item.nhc;
            if (key && state.protocols[key]) {
              item.protocoloMedico = state.protocols[key];
              modified = true;
            }
          });
          if (modified) {
            localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(masterList));
          }
        }
      }

      // Sincronización inmediata con la lista de trabajo de los Técnicos (PET_TSID_WORKLIST_V1)
      const rawTsid = localStorage.getItem('PET_TSID_WORKLIST_V1');
      if (rawTsid) {
        const tsidList = JSON.parse(rawTsid);
        if (Array.isArray(tsidList)) {
          let tsidModified = false;
          tsidList.forEach(tp => {
            const proto = state.protocols[tp.id] || state.protocols[tp.nhc];
            if (proto && proto.completed) {
              tp.protocoloMedico = proto;
              if (proto.armsPosition) tp.posicionBrazos = proto.armsPosition;
              if (proto.scanRange) {
                tp.rangoCampos = proto.scanRange;
                const r = String(proto.scanRange).toLowerCase();
                if (r === 'base_craneo_muslos' || r.includes('base') || r.includes('cráneo a muslos')) {
                  tp.presetCajaCampos = 'standard';
                  tp.numCamas = 6;
                } else if (r === 'cuerpo_total' || r.includes('total') || r.includes('vértice a pies')) {
                  tp.presetCajaCampos = 'whole';
                  tp.numCamas = 9;
                } else if (r === 'cabeza_cuello_cuerpo' || r.includes('cuello') || r.includes('combinado')) {
                  tp.presetCajaCampos = 'whole';
                  tp.numCamas = 8;
                } else if (r === 'torax_abdomen' || r.includes('tórax') || r.includes('abdomen')) {
                  tp.presetCajaCampos = 'torax_abdomen';
                  tp.numCamas = 4;
                } else if (r === 'cerebro' || r.includes('cerebr') || r.includes('encéfalo')) {
                  tp.presetCajaCampos = 'brain';
                  tp.numCamas = 1;
                } else if (r === 'pelvis_tardia' || r.includes('pelvis') || r.includes('tardía')) {
                  tp.presetCajaCampos = 'pelvis_tardia';
                  tp.numCamas = 2;
                }
              }
              if (proto.uptakeTime) tp.tiempoProtocoloMin = parseInt(proto.uptakeTime, 10) || tp.tiempoProtocoloMin;
              if (proto.doctorNotes) tp.notasFacultativo = proto.doctorNotes;
              if (proto.doctorName) tp.medicoProtocolizador = proto.doctorName;
              if (proto.vascularPhase !== undefined) tp.requiereFaseVascular = (proto.vascularPhase === 'si');
              tsidModified = true;
            }
          });
          if (tsidModified) {
            localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(tsidList));
          }
        }
      }
    } catch (e) {
      console.warn('Error sincronizando protocolos con base de datos:', e);
    }
  }

  function getTodayStr() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getTomorrowStr() {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  async function loadPatientsData(forceFetch = false) {
    let rawList = [];

    // 1. Intentar consultar la API en vivo si hay servidor activo en la red
    try {
      const resApi = await fetch('/api/sync-database?t=' + Date.now());
      if (resApi.ok) {
        const json = await resApi.json();
        const data = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(data) && data.length > 0) {
          rawList = data;
        }
      }
    } catch (e) {}

    // 2. Consultar JSON oficial de peticiones si no hubo API en vivo
    if (!rawList || rawList.length === 0) {
      try {
        const response = await fetch('../pet_peticion_medica/database/peticiones_db.json?t=' + Date.now());
        if (response.ok) {
          const fetched = await response.json();
          if (Array.isArray(fetched) && fetched.length > 0) {
            rawList = fetched;
          }
        }
      } catch (e) {}
    }

    if (!rawList || rawList.length === 0) {
      try {
        const response2 = await fetch('../pet_ct_triage/web_app/peticiones_db.json?t=' + Date.now());
        if (response2.ok) {
          const fetched2 = await response2.json();
          if (Array.isArray(fetched2) && fetched2.length > 0) {
            rawList = fetched2;
          }
        }
      } catch (e) {}
    }

    // 3. Semilla global síncrona (imprescindible cuando se abre por file:// o sin red)
    if ((!rawList || rawList.length === 0) && window.PETICIONES_DATABASE_SEED && Array.isArray(window.PETICIONES_DATABASE_SEED) && window.PETICIONES_DATABASE_SEED.length > 0) {
      rawList = window.PETICIONES_DATABASE_SEED;
    }

    // 4. Fusionar con localStorage dando prioridad a los cambios locales en vivo y a las citas de Triaje
    try {
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!rawList || rawList.length === 0) {
            rawList = parsed;
          } else {
            const indexByKey = new Map();
            rawList.forEach((r, idx) => {
              const k1 = r["Submission ID"] || r.id || r.paciente_id || `sub_${idx + 1}`;
              const k2 = r["NHC / Historia Clínica"] || r.nhc;
              if (k1) indexByKey.set(k1, idx);
              if (k2) indexByKey.set(k2, idx);
            });
            parsed.forEach((item, pIdx) => {
              const k1 = item["Submission ID"] || item.id || item.paciente_id || `sub_${pIdx + 1}`;
              const k2 = item["NHC / Historia Clínica"] || item.nhc;
              const matchIdx = (k1 && indexByKey.has(k1)) ? indexByKey.get(k1) : ((k2 && indexByKey.has(k2)) ? indexByKey.get(k2) : -1);
              if (matchIdx !== -1) {
                rawList[matchIdx] = Object.assign({}, rawList[matchIdx], item);
              } else {
                indexByKey.set(k1, rawList.length);
                rawList.push(item);
              }
            });
          }
        }
      }

      // 4.b Fusionar instantánea directa de pacientes citados del Programa de Triaje (PET_TRIAGE_CITED_PATIENTS_V1)
      const triageCitedRaw = localStorage.getItem('PET_TRIAGE_CITED_PATIENTS_V1');
      if (triageCitedRaw) {
        const triageCitedList = JSON.parse(triageCitedRaw);
        if (Array.isArray(triageCitedList) && triageCitedList.length > 0) {
          const indexByKey = new Map();
          rawList.forEach((r, idx) => {
            const k1 = r["Submission ID"] || r.id || r.paciente_id || `sub_${idx + 1}`;
            const k2 = r["NHC / Historia Clínica"] || r.nhc;
            if (k1) indexByKey.set(k1, idx);
            if (k2) indexByKey.set(k2, idx);
          });
          triageCitedList.forEach(cItem => {
            const k1 = cItem["Submission ID"] || cItem.id || cItem.paciente_id;
            const k2 = cItem["NHC / Historia Clínica"] || cItem.nhc;
            const matchIdx = (k1 && indexByKey.has(k1)) ? indexByKey.get(k1) : ((k2 && indexByKey.has(k2)) ? indexByKey.get(k2) : -1);
            if (matchIdx !== -1) {
              rawList[matchIdx] = Object.assign({}, rawList[matchIdx], cItem);
            } else {
              rawList.unshift(cItem);
            }
          });
        }
      }

      // 4.c Aplicar asignaciones directas del planificador de Triaje (pet_ct_peonada_assignments)
      const peonadaRaw = localStorage.getItem('pet_ct_peonada_assignments');
      if (peonadaRaw) {
        const peonadaMap = JSON.parse(peonadaRaw) || {};
        if (Object.keys(peonadaMap).length > 0) {
          rawList.forEach((r, idx) => {
            const subId = r["Submission ID"] || r.id || r.paciente_id || `sub_${idx + 1}`;
            const nhc = r["NHC / Historia Clínica"] || r.nhc;
            const assign = peonadaMap[subId] || (nhc ? peonadaMap[nhc] : null);
            if (assign && assign.fechaCita) {
              r["Fecha Cita Asignada"] = assign.fechaCita;
              r["Hora Cita Asignada"] = assign.horaCita || r["Hora Cita Asignada"] || "08:30 h";
              r["Estado de Triaje"] = "Cita Asignada";
            }
          });
        }
      }
    } catch (e) {
      console.warn('Error leyendo datos de Triaje en localStorage:', e);
    }

    // 5. Normalizar pacientes para la consola médica
    state.allPatients = rawList.map((item, index) => normalizePatient(item, index));

    // Incorporar ejemplos realistas de peticiones que el sistema NO puede triar automáticamente
    ensureUntriagedExamples(state.allPatients);

    // Garantizar que los pacientes No Triables NUNCA tengan cita asignada (no están citados)
    state.allPatients.forEach(p => {
      if (p.noTriable || p.estadoTriaje === 'No Triable' || (p.raw && p.raw["Estado de Triaje"] === 'No Triable')) {
        p.fechaCita = '';
        p.horaCita = 'Sin Cita / Pendiente de Triaje';
        if (p.raw) {
          p.raw["Fecha Cita Asignada"] = '';
          p.raw["Hora Cita Asignada"] = 'Sin Cita / Pendiente de Triaje';
        }
      }
    });

    ensureDatesAndSlots(state.allPatients);

    // Si el filtro de fecha activo (ej. Hoy) tiene 0 pacientes citados pero existen pacientes citados en Triaje en otra fecha, mostrar todos automáticamente
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const allCited = state.allPatients.filter(p => !p.noTriable && p.estadoTriaje !== 'No Triable' && p.fechaCita && p.fechaCita !== 'Pendiente de Triaje' && !String(p.fechaCita).includes('SIN AGENDAR'));
    if (allCited.length > 0 && state.activeFilterDate !== 'all') {
      const targetDate = state.activeFilterDate === 'today' ? todayStr : (state.activeFilterDate === 'tomorrow' ? tomorrowStr : state.activeFilterDate);
      const countForActiveDate = allCited.filter(p => p.fechaCita === targetDate).length;
      if (countForActiveDate === 0) {
        state.activeFilterDate = 'all';
        document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        if (elements.btnDateAll) elements.btnDateAll.classList.add('active');
        if (elements.inputCustomDate) elements.inputCustomDate.value = '';
      }
    }
  }

  function ensureUntriagedExamples(patients) {
    const untriagedExamples = [
      {
        "Submission ID": "UNTRIAGED_001",
        "NHC / Historia Clínica": "NHC-741902",
        "Nombre del Paciente": "Carmen Lois Souto",
        "Edad": 62,
        "Sexo": "Mujer",
        "Peso (kg)": 64,
        "Talla (cm)": 161,
        "Servicio Solicitante": "Neumología / Cirugía Torácica (H. Álvaro Cunqueiro)",
        "Médico Solicitante": "Dra. Marta Veiga (Neumología)",
        "Diagnóstico Clínico": "Nódulo pulmonar indeterminado de 11 mm en LSI (vidrio deslustrado con polo sólido de 4 mm) en paciente exfumadora. Marcador CEA levemente elevado (6.4 ng/mL). Sin confirmación histológica ni biopsia previa por riesgo neumotórax.",
        "Motivo de Solicitud": "Valoración de captación metabólica pulmonar previo a decidir resección atípica vs vigilancia por TC.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Pulmón)",
        "Carácter de la Petición": "🟡 P2 (Preferente)",
        "Prioridad Calculada": "🟡 P2",
        "Fecha Cita Asignada": "",
        "Hora Cita Asignada": "Sin Cita / Pendiente de Triaje",
        "¿Tiene Diabetes Mellitus?": "No",
        "Glucemia (mg/dL)": 98,
        "Alergias Conocidas": "Ninguna",
        "Contraindicación Contraste": "No",
        "Movilidad / Traslado": "Autónomo",
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Falta confirmación histológica y criterio morfológico dudoso en nódulo subsólido < 12 mm. El algoritmo no puede discriminar automáticamente si procede estadificación inmediata de neoplasia o control TC a 3 meses.",
        sugerenciaTriaje: "Revisar imágenes en SIDI y decidir si realizar PET-TAC precoz o recomendar control morfológico con TC a 3 meses."
      },
      {
        "Submission ID": "UNTRIAGED_002",
        "NHC / Historia Clínica": "NHC-892143",
        "Nombre del Paciente": "Javier Pardo Vilar",
        "Edad": 54,
        "Sexo": "Varón",
        "Peso (kg)": 82,
        "Talla (cm)": 178,
        "Servicio Solicitante": "Endocrinología y Nutrición",
        "Médico Solicitante": "Dr. Fernando Seijas (Endocrinología)",
        "Diagnóstico Clínico": "Masa retroperitoneal yuxtarrenal izquierda de 38 mm sospechosa de paraganglioma vs tumor neuroendocrino (TNE). Solicitud sin analítica de catecolaminas/metanefrinas urinarias ni cromogranina A aportadas en volante.",
        "Motivo de Solicitud": "Estudio de extensión y caracterización biológica del tumor retroperitoneal.",
        "Tipo de Estudio PET Solicitado": "PET Neuroendocrino (Trazador no especificado)",
        "Carácter de la Petición": "🟢 P3 (Ordinaria)",
        "Prioridad Calculada": "🟢 P3",
        "Fecha Cita Asignada": "",
        "Hora Cita Asignada": "Sin Cita / Pendiente de Triaje",
        "¿Tiene Diabetes Mellitus?": "No",
        "Glucemia (mg/dL)": 104,
        "Alergias Conocidas": "Penicilinas",
        "Contraindicación Contraste": "No",
        "Movilidad / Traslado": "Autónomo",
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Indeterminación de radiofármaco diana. El sistema no puede seleccionar automáticamente entre 18F-DOPA (feocromocitoma/paraganglioma) o 68Ga-DOTATOC/DOTATATE (receptores de somatostatina).",
        sugerenciaTriaje: "Consultar historia clínica electrónica o contactar con Endocrinología para solicitar metanefrinas o autorizar radiofármaco específico."
      },
      {
        "Submission ID": "UNTRIAGED_003",
        "NHC / Historia Clínica": "NHC-652391",
        "Nombre del Paciente": "Rosa María Otero Gómez",
        "Edad": 71,
        "Sexo": "Mujer",
        "Peso (kg)": 58,
        "Talla (cm)": 155,
        "Servicio Solicitante": "Oncología Médica",
        "Médico Solicitante": "Dra. Isabel Calvo (Oncología)",
        "Diagnóstico Clínico": "Carcinoma seroso ovárico de alto grado en sospecha de recidiva peritoneal (ascenso rápido de CA-125: 320 U/mL). Solicitud con contraste iodado intravenoso bifásico obligatorio.",
        "Motivo de Solicitud": "Reestadificación y localización de implantes peritoneales.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Ginecología)",
        "Carácter de la Petición": "🔴 P1 (Preferente Urgente)",
        "Prioridad Calculada": "🔴 P1",
        "Fecha Cita Asignada": "",
        "Hora Cita Asignada": "Sin Cita / Pendiente de Triaje",
        "¿Tiene Diabetes Mellitus?": "Sí",
        "Glucemia (mg/dL)": 142,
        "Alergias Conocidas": "Ninguna",
        "Contraindicación Contraste": "Sí",
        "Movilidad / Traslado": "Silla de Ruedas",
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Insuficiencia renal con riesgo alto de nefropatía por contraste (FG 22 mL/min/1.73m²). El volante exige contraste IV iodado obligatorio sin pauta de prehidratación nefrológica registrada.",
        sugerenciaTriaje: "Valorar reconversión a PET-TAC de baja dosis sin contraste iodado IV o prescribir pauta de hidratación parenteral previa con suero fisiológico."
      },
      {
        "Submission ID": "UNTRIAGED_004",
        "NHC / Historia Clínica": "NHC-813405",
        "Nombre del Paciente": "Manuel Quintela Ferro",
        "Edad": 68,
        "Sexo": "Varón",
        "Peso (kg)": 76,
        "Talla (cm)": 172,
        "Servicio Solicitante": "Hematología",
        "Médico Solicitante": "Dr. Carlos Bermejo (Hematología)",
        "Diagnóstico Clínico": "Linfoma difuso de células B grandes (LDCBG) estadio IV. Solicitud de reestadificación y fin de tratamiento tras ciclo R-CHOP completado hace solo 8 días.",
        "Motivo de Solicitud": "Evaluación de respuesta metabólica según criterios Deauville/Lugano.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Hematología)",
        "Carácter de la Petición": "🟡 P2 (Preferente)",
        "Prioridad Calculada": "🟡 P2",
        "Fecha Cita Asignada": "",
        "Hora Cita Asignada": "Sin Cita / Pendiente de Triaje",
        "¿Tiene Diabetes Mellitus?": "No",
        "Glucemia (mg/dL)": 108,
        "Alergias Conocidas": "Ninguna",
        "Contraindicación Contraste": "No",
        "Movilidad / Traslado": "Autónomo",
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "Intervalo post-inmunoterapia/quimioterapia insuficiente (< 10 días tras infusión R-CHOP). Riesgo severo de falsos positivos metabólicos por efecto inflamatorio ('flare').",
        sugerenciaTriaje: "Diferir la citación al menos hasta 3-4 semanas post-ciclo de quimioterapia para asegurar validez diagnóstica según criterios Lugano."
      },
      {
        "Submission ID": "UNTRIAGED_005",
        "NHC / Historia Clínica": "NHC-914820",
        "Nombre del Paciente": "Gonzalo Rey Taboada",
        "Edad": 64,
        "Sexo": "Varón",
        "Peso (kg)": 78,
        "Talla (cm)": 174,
        "Servicio Solicitante": "Medicina Interna (H. Álvaro Cunqueiro)",
        "Médico Solicitante": "Dr. Alberto Domínguez (M. Interna)",
        "Diagnóstico Clínico": "Control evolutivo rutinario tras 3 años en remisión completa de Linfoma no Hodgkin folicular. Paciente asintomático, sin pérdida ponderal ni adenopatías periféricas palpables. Analítica con LDH y hemograma en rango normal.",
        "Motivo de Solicitud": "Control evolutivo anual y seguimiento asintomático de rutina.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Oncológico / Hematología)",
        "Carácter de la Petición": "🔴 P1 (Urgente)",
        "Prioridad Solicitada": "🔴 P1 (Urgente)",
        "Prioridad Calculada": "🟢 P3 (Ordinaria)",
        "Fecha Cita Asignada": "",
        "Hora Cita Asignada": "Sin Cita / Pendiente de Triaje",
        "¿Tiene Diabetes Mellitus?": "No",
        "Glucemia (mg/dL)": 94,
        "Alergias Conocidas": "Ninguna",
        "Contraindicación Contraste": "No",
        "Movilidad / Traslado": "Autónomo",
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "⚠️ Discrepancia de prioridades: El médico solicitante indicó prioridad 🔴 P1 (Urgente), pero el protocolo clínico del programa calculó 🟢 P3 (Ordinaria) al tratarse de un control evolutivo anual en paciente asintomático. Requiere triaje médico por facultativo de Medicina Nuclear.",
        sugerenciaTriaje: "El protocolo no justifica urgencia P1 (< 7 días) para un seguimiento rutinario asintomático. Se sugiere adecuar a P3 (o ratificar P1 si el especialista detecta sospecha clínica en informe)."
      },
      {
        "Submission ID": "UNTRIAGED_006",
        "NHC / Historia Clínica": "NHC-503819",
        "Nombre del Paciente": "Elena Méndez Salgado",
        "Edad": 73,
        "Sexo": "Mujer",
        "Peso (kg)": 62,
        "Talla (cm)": 158,
        "Servicio Solicitante": "Cardiología (H. Meixoeiro)",
        "Médico Solicitante": "Dra. Lucía Barbeito (Cardiología)",
        "Diagnóstico Clínico": "Portadora de prótesis aórtica biológica implantada hace 2 años. Ingresada por bacteriemia persistente por S. aureus y picos febriles de 38.6 ºC. Sospecha alta de endocarditis protésica con ETE no concluyente.",
        "Motivo de Solicitud": "PET cardíaco con protocolo HEP para detección precoz de infección activa en anillo protésico.",
        "Tipo de Estudio PET Solicitado": "18F-FDG (Infección Cardíaca / Protocolo HEP)",
        "Carácter de la Petición": "🟢 P3 (Ordinaria)",
        "Prioridad Solicitada": "🟢 P3 (Ordinaria)",
        "Prioridad Calculada": "🔴 P1 (Urgente)",
        "Fecha Cita Asignada": "",
        "Hora Cita Asignada": "Sin Cita / Pendiente de Triaje",
        "¿Tiene Diabetes Mellitus?": "No",
        "Glucemia (mg/dL)": 102,
        "Alergias Conocidas": "Ninguna",
        "Contraindicación Contraste": "No",
        "Movilidad / Traslado": "Ambulatorio / Cama",
        "Estado de Triaje": "No Triable",
        noTriable: true,
        motivoNoTriable: "⚠️ Discrepancia de prioridades: El médico solicitante marcó por error 🟢 P3 (Ordinaria), pero según el protocolo clínico de Endocarditis/Infección Protésica Aguda la prioridad asistencial calculada por el programa es 🔴 P1 (Urgente, < 7 días). Requiere triaje médico urgente por facultativo de Medicina Nuclear.",
        sugerenciaTriaje: "Adecuar inmediatamente a 🔴 P1 (< 7 días) e iniciar preparación dietética miocárdica (dieta rica en grasas sin hidratos) para realizar el estudio en los próximos 3-5 días."
      }
    ];

    untriagedExamples.forEach(rawEx => {
      const existing = patients.find(p => p.id === rawEx["Submission ID"] || p.nhc === rawEx["NHC / Historia Clínica"]);
      if (!existing) {
        patients.push(normalizePatient(rawEx, patients.length));
      } else {
        // Garantizar que los no triables NUNCA tengan cita asignada
        if (existing.noTriable) {
          existing.fechaCita = '';
          existing.horaCita = 'Sin Cita / Pendiente de Triaje';
          if (existing.raw) {
            existing.raw["Fecha Cita Asignada"] = '';
            existing.raw["Hora Cita Asignada"] = 'Sin Cita / Pendiente de Triaje';
          }
        }
      }
    });
  }

  function normalizePatient(raw, index) {
    const subId = raw["Submission ID"] || raw.id || `sub_${index + 1000}`;
    const nhc = raw["NHC / Historia Clínica"] || raw.nhc || `NHC-${100000 + index}`;
    const nombre = raw["Nombre del Paciente"] || raw["Nombre y Apellidos"] || raw.nombre || `Paciente ${index + 1}`;
    const edad = parseInt(raw["Edad"] || raw.edad || 65, 10);
    const sexo = raw["Sexo"] || raw.sexo || "Varón";
    const peso = parseFloat(raw["Peso (kg)"] || raw.peso || 72);
    const talla = parseFloat(raw["Talla (cm)"] || raw.talla || 170);

    const diag = raw["Diagnóstico Clínico"] || raw["Motivo de Solicitud"] || raw.motivo || "Estudio Oncológico";
    const radiofarmaco = raw["Tipo de Estudio PET Solicitado"] || raw.radiofarmaco || "18F-FDG (Oncológico / Inflamatorio General)";
    const prioridad = raw["Carácter de la Petición"] || raw["Prioridad Calculada"] || raw.prioridad || "🟢 P3";
    
    const prioSolicitada = raw["Carácter de la Petición"] || raw["Prioridad Solicitada"] || raw.prioridad || "🟢 P3";
    const prioCalculada = raw["Prioridad Calculada"] || raw["Prioridad Protocolo"] || raw.prioridadCalculada || prioSolicitada;

    const getPrioCat = (p) => {
      const s = String(p || '').toLowerCase();
      if (s.includes('1') || s.includes('urgente')) return 'P1';
      if (s.includes('2') || s.includes('preferente')) return 'P2';
      return 'P3';
    };

    const catSolicitada = getPrioCat(prioSolicitada);
    const catCalculada = getPrioCat(prioCalculada);
    const hasDiscrepancy = (catSolicitada !== catCalculada) && !raw.resolucionMedicaTriaje;

    // Detección de No Triable / Incidencias del algoritmo
    const noTriable = hasDiscrepancy || !!(
      raw.noTriable === true ||
      raw["Estado de Triaje"] === "No Triable" ||
      raw.estadoTriaje === "No Triable" ||
      raw.motivoNoTriable ||
      raw["Motivo No Triable"]
    );

    let motivoNoTriable = raw.motivoNoTriable || raw["Motivo No Triable"] || "";
    let sugerenciaTriaje = raw.sugerenciaTriaje || raw["Sugerencia Triaje"] || "";

    if (hasDiscrepancy && !motivoNoTriable) {
      motivoNoTriable = `⚠️ Discrepancia de prioridades: El médico solicitante indicó prioridad ${catSolicitada} (${prioSolicitada}), pero el protocolo asistencial del programa calculó ${catCalculada} (${prioCalculada}). Requiere triaje médico por facultativo de Medicina Nuclear.`;
      sugerenciaTriaje = `El médico peticionario indicó ${catSolicitada}, pero según las guías clínicas para esta patología corresponde ${catCalculada}. Valide la prioridad definitiva para desbloquear el triaje.`;
    }

    // Los pacientes NO TRIABLES NUNCA están citados (no tienen fecha ni hora de cita asignada)
    const rawFecha = (raw["Fecha Cita Asignada"] || raw.fechaCita || '').trim();
    const fechaCita = noTriable ? "" : ((rawFecha && rawFecha !== 'Pendiente de Triaje') ? rawFecha : (raw["Estado de Triaje"] === "Cita Asignada" ? getTodayStr() : ""));
    const horaCita = noTriable ? "Sin Cita / Pendiente de Triaje" : (raw["Hora Cita Asignada"] || raw.horaCita || "08:30 h");

    // Alertas clínicas
    let isDiabetic = false;
    let glucemia = raw["Glucemia (mg/dL)"] || 95;
    const rawDiab = String(raw["¿Tiene Diabetes Mellitus?"] || '').toLowerCase();
    if (rawDiab.includes('sí') || rawDiab.includes('si') || glucemia >= 130) {
      isDiabetic = true;
    }

    const alergia = raw["Alergias Conocidas"] || "Ninguna";
    const contraindicacionContraste = raw["Contraindicación Contraste"] || "No";
    const movilidad = raw["Movilidad / Traslado"] || "Autónomo";

    const petPrevio = raw["¿Tiene estudio PET previo?"] || raw["PET Previo Realizado"] || (raw["Detalle PET Previo"] && !raw["Detalle PET Previo"].startsWith('No') ? 'Sí' : 'No');
    const isPetPrevio = String(petPrevio).toLowerCase().includes('s') || String(petPrevio).toLowerCase().includes('si');
    const detallePetPrevio = raw["Detalle PET Previo"] || (raw["Fecha PET Previo"] ? `${raw["Fecha PET Previo"]} (${raw["Centro PET Previo"] || 'SERGAS'})` : '');

    const savedProto = state.protocols[subId] || state.protocols[nhc] || raw.protocoloMedico || null;

    return {
      id: subId,
      nhc: nhc,
      nombre: nombre,
      edad: edad,
      sexo: sexo,
      peso: peso,
      talla: talla,
      diagnostico: diag,
      radiofarmaco: radiofarmaco,
      prioridad: prioridad,
      isDiscrepancy: hasDiscrepancy,
      prioSolicitada: prioSolicitada,
      prioCalculada: prioCalculada,
      catSolicitada: catSolicitada,
      catCalculada: catCalculada,
      fechaCita: fechaCita,
      horaCita: horaCita,
      isDiabetic: isDiabetic,
      glucemia: glucemia,
      alergia: alergia,
      contraindicacionContraste: contraindicacionContraste,
      movilidad: movilidad,
      hasPriorPet: isPetPrevio,
      priorPetDetail: detallePetPrevio,
      noTriable: noTriable,
      estadoTriaje: noTriable ? "No Triable" : (raw["Estado de Triaje"] || raw.estadoTriaje || "Pendiente de Triaje"),
      motivoNoTriable: motivoNoTriable,
      sugerenciaTriaje: sugerenciaTriaje,
      protocoloMedico: savedProto,
      raw: raw
    };
  }

  function ensureDatesAndSlots(patients) {
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();

    patients.forEach((p, idx) => {
      // Si el paciente es No Triable, NUNCA debe estar citado en la agenda
      if (p.noTriable || p.estadoTriaje === 'No Triable' || (p.raw && p.raw["Estado de Triaje"] === 'No Triable')) {
        p.fechaCita = '';
        p.horaCita = 'Sin Cita / Pendiente de Triaje';
        if (p.raw) {
          p.raw["Fecha Cita Asignada"] = '';
          p.raw["Hora Cita Asignada"] = 'Sin Cita / Pendiente de Triaje';
        }
        return;
      }

      // No inventar citas automáticas: solo conservar las citas reales asignadas en Triaje
    });

    // Guardar en el almacenamiento local para sincronización con el resto de consolas
    try {
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(patients.map(p => p.raw || p)));
    } catch(e) {}
  }

  // ==========================================================================
  // FILTRADO Y ACTUALIZACIÓN DE VISTAS
  // ==========================================================================
  function applyFilters() {
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();

    state.filteredPatients = state.allPatients.filter(p => {
      const isUntriaged = !!(p.noTriable || p.estadoTriaje === 'No Triable' || (p.raw && p.raw["Estado de Triaje"] === 'No Triable'));

      // En la Agenda de Pacientes Citados, los no triables y los no citados NUNCA se muestran
      if (isUntriaged) return false;
      if (!p.fechaCita || p.fechaCita === 'Pendiente de Triaje' || String(p.fechaCita).trim() === '') return false;

      const isProtocolized = !!(p.protocoloMedico && p.protocoloMedico.completed);

      // 1. Filtro por Estado de Protocolo (Todos, Pendientes, Protocolizados)
      if (state.activeFilterStatus === 'pending' && isProtocolized) return false;
      if (state.activeFilterStatus === 'done' && !isProtocolized) return false;

      // 2. Filtro por Fecha
      if (state.activeFilterDate === 'today') {
        if (p.fechaCita !== todayStr) return false;
      } else if (state.activeFilterDate === 'tomorrow') {
        if (p.fechaCita !== tomorrowStr) return false;
      } else if (state.activeFilterDate !== 'all') {
        if (p.fechaCita !== state.activeFilterDate) return false;
      }

      // 3. Filtro por Isótopo
      if (state.activeFilterTracer !== 'all') {
        const tracer = String(p.radiofarmaco).toLowerCase();
        const filterT = state.activeFilterTracer.toLowerCase();
        if (!tracer.includes(filterT)) return false;
      }

      // 4. Filtro por Tipo de Prueba / Rango
      if (state.activeFilterTestType && state.activeFilterTestType !== 'all') {
        const filterTT = state.activeFilterTestType;
        const assignedRange = p.protocoloMedico ? p.protocoloMedico.scanRange : '';
        const diag = String(p.diagnostico || '').toLowerCase();

        if (filterTT === 'cabeza_cuello') {
          const matchRange = assignedRange === 'cabeza_cuello_cuerpo';
          const matchDiag = diag.includes('cabeza') || diag.includes('cuello') || diag.includes('cavum') || diag.includes('laringe');
          if (!matchRange && !matchDiag) return false;
        } else if (filterTT === 'mmii') {
          const matchRange = assignedRange === 'mmii';
          const matchDiag = diag.includes('mmii') || diag.includes('pierna') || diag.includes('pie') || diag.includes('femur');
          if (!matchRange && !matchDiag) return false;
        } else if (filterTT === 'cuerpo_total') {
          const matchRange = assignedRange === 'cuerpo_total';
          const matchDiag = diag.includes('melanoma') || diag.includes('sarcoma') || diag.includes('mieloma');
          if (!matchRange && !matchDiag) return false;
        } else if (filterTT === 'cerebro') {
          const matchRange = assignedRange === 'cerebro';
          const matchDiag = diag.includes('cerebro') || diag.includes('demencia') || diag.includes('alzheimer');
          if (!matchRange && !matchDiag) return false;
        } else if (filterTT === 'base_craneo') {
          const matchRange = assignedRange === 'base_craneo_muslos' || !assignedRange;
          if (!matchRange) return false;
        }
      }

      // 5. Búsqueda por texto libre
      if (state.searchTerm) {
        const q = state.searchTerm.toLowerCase();
        const matchName = String(p.nombre).toLowerCase().includes(q);
        const matchNHC = String(p.nhc).toLowerCase().includes(q);
        const matchDiag = String(p.diagnostico).toLowerCase().includes(q);
        const matchServ = String(p.raw["Servicio Solicitante"] || '').toLowerCase();
        if (!matchName && !matchNHC && !matchDiag && !matchServ) return false;
      }

      return true;
    });

    // Ordenar estrictamente por hora de cita (de primera hora a última hora)
    state.filteredPatients.sort((a, b) => {
      const minA = parseHoraToMinutes(a.horaCita);
      const minB = parseHoraToMinutes(b.horaCita);
      if (minA !== minB) return minA - minB;
      return String(a.fechaCita || '').localeCompare(String(b.fechaCita || ''));
    });
  }

  function parseHoraToMinutes(horaStr) {
    if (!horaStr) return 9999;
    const match = String(horaStr).match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
    if (!match) return 9999;
    return (parseInt(match[1], 10) * 60) + parseInt(match[2], 10);
  }

  function render() {
    applyFilters();
    updateKpis();
    if (state.activeMainView === 'untriaged_folder') {
      renderUntriagedFolder();
    } else {
      renderPatientList();
    }
  }

  function updateKpis() {
    const todayStr = getTodayStr();
    const tomorrowStr = getTomorrowStr();
    const [, hm, hd] = todayStr.split('-');
    const [, mm, md] = tomorrowStr.split('-');

    // Pacientes citados y pacientes no triables
    const citedPatients = state.allPatients.filter(p => !p.noTriable && p.estadoTriaje !== 'No Triable' && !(p.raw && p.raw["Estado de Triaje"] === 'No Triable') && p.fechaCita);
    const untriagedPatients = state.allPatients.filter(p => !!(p.noTriable || p.estadoTriaje === 'No Triable' || (p.raw && p.raw["Estado de Triaje"] === 'No Triable')));

    let setForKpis = citedPatients;
    if (state.activeFilterDate === 'today') {
      setForKpis = citedPatients.filter(p => p.fechaCita === todayStr);
      elements.kpiFechaSub.textContent = `Hoy: ${hd}/${hm}/${todayStr.split('-')[0]}`;
      elements.sectionTitleText.textContent = `Agenda de Pacientes Citados para Hoy (${hd}/${hm}/${todayStr.split('-')[0]})`;
    } else if (state.activeFilterDate === 'tomorrow') {
      setForKpis = citedPatients.filter(p => p.fechaCita === tomorrowStr);
      elements.kpiFechaSub.textContent = `Mañana: ${md}/${mm}/${tomorrowStr.split('-')[0]}`;
      elements.sectionTitleText.textContent = `Agenda de Pacientes Citados para Mañana (${md}/${mm}/${tomorrowStr.split('-')[0]})`;
    } else if (state.activeFilterDate === 'all') {
      setForKpis = citedPatients;
      elements.kpiFechaSub.textContent = 'Todos los registros históricos';
      elements.sectionTitleText.textContent = 'Agenda Global de Pacientes (Todos los días)';
    } else {
      setForKpis = citedPatients.filter(p => p.fechaCita === state.activeFilterDate);
      const parts = (state.activeFilterDate || '').split('-');
      const labelDate = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : state.activeFilterDate;
      elements.kpiFechaSub.textContent = `Fecha: ${labelDate}`;
      elements.sectionTitleText.textContent = `Agenda de Pacientes Citados (${labelDate})`;
    }

    const total = setForKpis.length;
    let pending = 0;
    let done = 0;
    let alerts = 0;

    setForKpis.forEach(p => {
      const isDone = !!(p.protocoloMedico && p.protocoloMedico.completed);
      if (isDone) done++; else pending++;

      if (p.isDiabetic || p.alergia !== 'Ninguna' || p.contraindicacionContraste === 'Sí' || p.movilidad !== 'Autónomo') {
        alerts++;
      }
    });

    const untriagedCount = untriagedPatients.length;

    elements.kpiTotalCitados.textContent = total;
    elements.kpiPendientes.textContent = pending;
    elements.kpiProtocolizados.textContent = done;
    elements.kpiAlertas.textContent = alerts;

    elements.countTabAll.textContent = total;
    elements.countTabPending.textContent = pending;
    elements.countTabDone.textContent = done;
    if (elements.countTabUntriaged) {
      elements.countTabUntriaged.textContent = untriagedCount;
    }

    // Actualizar contadores del selector principal de vistas
    if (elements.badgeAgendaCount) {
      elements.badgeAgendaCount.textContent = citedPatients.length;
    }
    if (elements.badgeUntriagedCount) {
      elements.badgeUntriagedCount.textContent = untriagedCount;
    }
    if (elements.folderHeroCount) {
      elements.folderHeroCount.textContent = untriagedCount;
    }

    elements.displayFilteredCount.textContent = `${state.filteredPatients.length} pacientes mostrados`;

    // Actualizar insignias de botones de fecha
    if (elements.btnDateToday) {
      const countToday = citedPatients.filter(p => p.fechaCita === todayStr).length;
      elements.btnDateToday.innerHTML = `<span>📅 Citas de Hoy (${hd}/${hm}) <strong style="background:rgba(0,0,0,0.12); padding:1px 6px; border-radius:10px; font-size:0.75rem;">${countToday}</strong></span>`;
    }
    if (elements.btnDateTomorrow) {
      const countTomorrow = citedPatients.filter(p => p.fechaCita === tomorrowStr).length;
      elements.btnDateTomorrow.innerHTML = `<span>📅 Mañana (${md}/${mm}) <strong style="background:rgba(0,0,0,0.12); padding:1px 6px; border-radius:10px; font-size:0.75rem;">${countTomorrow}</strong></span>`;
    }
    if (elements.btnDateAll) {
      const countAll = citedPatients.length;
      elements.btnDateAll.innerHTML = `<span>🌐 Ver Todos <strong style="background:rgba(0,0,0,0.12); padding:1px 6px; border-radius:10px; font-size:0.75rem;">${countAll}</strong></span>`;
    }
  }

  function renderPatientList() {
    if (state.filteredPatients.length === 0) {
      elements.patientsGrid.style.display = 'none';
      elements.patientsTableWrap.style.display = 'none';
      elements.noPatientsMessage.style.display = 'block';
      return;
    }

    elements.noPatientsMessage.style.display = 'none';

    if (state.currentView === 'cards') {
      elements.patientsGrid.style.display = 'grid';
      elements.patientsTableWrap.style.display = 'none';
      renderCardsView();
    } else {
      elements.patientsGrid.style.display = 'none';
      elements.patientsTableWrap.style.display = 'block';
      renderTableView();
    }
  }

  // ==========================================================================
  // CARPETA DE PETICIONES NO TRIABLES: GESTIÓN, PRIORIZACIÓN Y DERIVACIÓN
  // ==========================================================================
  function switchConsoleView(viewName) {
    state.activeMainView = viewName;
    if (viewName === 'untriaged_folder') {
      if (elements.btnSwitchAgenda) elements.btnSwitchAgenda.classList.remove('active');
      if (elements.btnSwitchUntriaged) elements.btnSwitchUntriaged.classList.add('active');
      if (elements.agendaSectionWrap) elements.agendaSectionWrap.style.display = 'none';
      if (elements.untriagedFolderWrap) elements.untriagedFolderWrap.style.display = 'block';
      renderUntriagedFolder();
    } else {
      if (elements.btnSwitchAgenda) elements.btnSwitchAgenda.classList.add('active');
      if (elements.btnSwitchUntriaged) elements.btnSwitchUntriaged.classList.remove('active');
      if (elements.agendaSectionWrap) elements.agendaSectionWrap.style.display = 'block';
      if (elements.untriagedFolderWrap) elements.untriagedFolderWrap.style.display = 'none';
      render();
    }
  }

  function renderUntriagedFolder() {
    const untriagedPatients = state.allPatients.filter(p => !!(
      p.noTriable ||
      p.estadoTriaje === 'No Triable' ||
      (p.raw && p.raw["Estado de Triaje"] === 'No Triable')
    ));

    const totalCount = untriagedPatients.length;
    if (elements.folderHeroCount) elements.folderHeroCount.textContent = totalCount;
    if (elements.folderCountDisplay) elements.folderCountDisplay.textContent = `${totalCount} ${totalCount === 1 ? 'petición pendiente' : 'peticiones pendientes'}`;
    if (elements.badgeUntriagedCount) elements.badgeUntriagedCount.textContent = totalCount;
    if (elements.countTabUntriaged) elements.countTabUntriaged.textContent = totalCount;

    if (totalCount === 0) {
      if (elements.untriagedFolderCardsGrid) elements.untriagedFolderCardsGrid.style.display = 'none';
      if (elements.noUntriagedMessage) elements.noUntriagedMessage.style.display = 'block';
      return;
    }

    if (elements.untriagedFolderCardsGrid) elements.untriagedFolderCardsGrid.style.display = 'flex';
    if (elements.noUntriagedMessage) elements.noUntriagedMessage.style.display = 'none';

    elements.untriagedFolderCardsGrid.innerHTML = untriagedPatients.map(p => {
      const selectedPrio = state.selectedPriorities[p.id] || (p.prioridad ? (p.prioridad.includes('P1') ? 'P1' : (p.prioridad.includes('P2') ? 'P2' : 'P3')) : 'P2');
      const currentTracer = p.radiofarmaco || '18F-FDG';
      const requestingService = (p.raw && p.raw["Servicio Solicitante"]) || 'Servicio Peticionario';
      const requestingDoctor = (p.raw && p.raw["Médico Solicitante"]) || 'Facultativo Solicitante';

      return `
        <article class="untriaged-folder-card" id="cardUntriaged_${p.id}">
          <!-- CABECERA DE PACIENTE -->
          <div class="folder-card-top">
            <div class="folder-pat-info">
              <h3 class="folder-pat-title">
                <span>👤 ${escapeHTML(p.nombre)}</span>
                <span class="uncited-pill">🚫 SIN CITA ASIGNADA · PENDIENTE TRIAJE</span>
              </h3>
              <div class="folder-demographics">
                <span class="nhc-tag">${escapeHTML(p.nhc)}</span>
                <span>${p.edad} años (${escapeHTML(p.sexo)})</span>
                <span>•</span>
                <span>${p.peso} kg (${p.talla} cm)</span>
                <span>•</span>
                <span>🏥 ${escapeHTML(requestingService)} (${escapeHTML(requestingDoctor)})</span>
              </div>
            </div>

            <!-- BOTONES DE INSPECCIÓN -->
            <div style="display:flex; gap:8px; align-items:center;">
              <button type="button" class="btn-card btn-card-volante" onclick="window.consolaApp.openVolanteModal('${p.id}')" style="font-weight:700; padding:8px 14px; font-size:0.82rem;">
                📄 Ver Volante Completo
              </button>
              <button type="button" class="btn-card btn-card-sidi" onclick="window.consolaApp.openSidiModal('${p.id}')" style="font-weight:700; padding:8px 12px; font-size:0.82rem;">
                SIDI (PACS)
              </button>
            </div>
          </div>

          <!-- DIAGNÓSTICO Y SOSPECHA -->
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px 14px;">
            <div style="font-size:0.72rem; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.04em;">Diagnóstico / Motivo de Solicitud en Volante:</div>
            <div style="font-size:0.86rem; color:var(--text-main); font-weight:600; margin-top:3px; line-height:1.4;">${escapeHTML(p.diagnostico)}</div>
          </div>

          <!-- AVISO DE DISCREPANCIA DE PRIORIDADES (SI NO CONCUERDAN) -->
          ${(p.isDiscrepancy || (p.motivoNoTriable && p.motivoNoTriable.includes('Discrepancia'))) ? `
            <div style="background:#fff1f2; border:1px solid #fecdd3; border-left:6px solid #e11d48; border-radius:8px; padding:12px 14px; margin-top:6px;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:0.85rem; font-weight:800; color:#9f1239; display:flex; align-items:center; gap:6px;">
                  <span>⚠️</span> <span>NO CONCUERDAN PRIORIDADES DE TRIAJE</span>
                </div>
                <span style="font-size:0.72rem; font-weight:800; background:#ffe4e6; color:#be123c; padding:3px 10px; border-radius:12px; border:1px solid #fecdd3;">
                  DESVIADO A MEDICINA NUCLEAR
                </span>
              </div>
              <div style="font-size:0.80rem; color:#881337; margin-top:4px; font-weight:600;">
                El médico peticionario solicitó una prioridad que no se corresponde con la calculada por el programa según protocolo asistencial SERGAS.
              </div>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-top:10px; background:#ffffff; border:1px solid #fda4af; border-radius:6px; padding:10px 12px;">
                <div style="border-right:1px solid #fee2e2; padding-right:8px;">
                  <div style="font-size:0.68rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">1. Prioridad Solicitada en Volante:</div>
                  <div style="font-size:0.92rem; font-weight:800; color:#0f172a; margin-top:3px; display:flex; align-items:center; gap:6px;">
                    <span>${p.catSolicitada === 'P1' ? '🔴' : (p.catSolicitada === 'P2' ? '🟡' : '🟢')}</span>
                    <span>${escapeHTML(p.prioSolicitada || p.prioridad)}</span>
                  </div>
                </div>
                <div>
                  <div style="font-size:0.68rem; font-weight:800; color:#64748b; text-transform:uppercase; letter-spacing:0.04em;">2. Prioridad Calculada por Protocolo:</div>
                  <div style="font-size:0.92rem; font-weight:800; color:#0369a1; margin-top:3px; display:flex; align-items:center; gap:6px;">
                    <span>${p.catCalculada === 'P1' ? '🔴' : (p.catCalculada === 'P2' ? '🟡' : '🟢')}</span>
                    <span>${escapeHTML(p.prioCalculada || p.prioridadCalculada || p.prioridad)}</span>
                  </div>
                </div>
              </div>
            </div>
          ` : ''}

          <!-- MOTIVO DE NO TRIAJE -->
          <div class="folder-incidence-box">
            <div class="folder-incidence-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
              <span>MOTIVO DE NO TRIAJE POR EL PROGRAMA (REQUIERE CRITERIO MÉDICO):</span>
            </div>
            <div class="folder-incidence-reason">${escapeHTML(p.motivoNoTriable || 'Indicación clínica no categorizada automáticamente')}</div>
            ${p.sugerenciaTriaje ? `
              <div class="folder-incidence-sug">
                💡 <strong>Orientación sugerida:</strong> ${escapeHTML(p.sugerenciaTriaje)}
              </div>
            ` : ''}
          </div>

          <!-- PANEL DE PRIORIZACIÓN Y DERIVACIÓN AL PROGRAMA DE TRIAJE -->
          <div class="folder-prioritize-box">
            <div class="prioritize-box-header">
              <span>🩺 Validación y Asignación de Prioridad Médica</span>
              <span style="font-size:0.75rem; color:var(--text-muted); font-weight:600;">Facultativo: Dr. Manuel Gómez Feijóo</span>
            </div>

            <!-- Selector de Prioridad (P1 / P2 / P3) -->
            <div>
              <div style="font-size:0.74rem; font-weight:700; color:var(--text-muted); margin-bottom:6px;">1. SELECCIONE LA PRIORIDAD MÉDICA APROBADA:</div>
              <div class="prio-options-group" id="prioGroup_${p.id}">
                <button type="button" class="prio-btn-option prio-p1 ${selectedPrio === 'P1' ? 'selected' : ''}" onclick="window.consolaApp.selectFolderPriority('${p.id}', 'P1')">
                  <span>🔴</span>
                  <span><strong>P1 · Urgente Preferente</strong> (< 7 días naturales)</span>
                </button>
                <button type="button" class="prio-btn-option prio-p2 ${selectedPrio === 'P2' ? 'selected' : ''}" onclick="window.consolaApp.selectFolderPriority('${p.id}', 'P2')">
                  <span>🟡</span>
                  <span><strong>P2 · Preferente</strong> (< 15 días laborables)</span>
                </button>
                <button type="button" class="prio-btn-option prio-p3 ${selectedPrio === 'P3' ? 'selected' : ''}" onclick="window.consolaApp.selectFolderPriority('${p.id}', 'P3')">
                  <span>🟢</span>
                  <span><strong>P3 · Ordinaria</strong> (< 30 días)</span>
                </button>
              </div>
            </div>

            <!-- Campos adicionales: Trazador y Nota de Resolución -->
            <div class="prioritize-inputs-row">
              <div class="prioritize-field">
                <label for="tracerSel_${p.id}">2. RADIOFÁRMACO AUTORIZADO / CONFIRMADO:</label>
                <select id="tracerSel_${p.id}">
                  <option value="18F-FDG (Oncológico / Inflamatorio)" ${currentTracer.includes('FDG') ? 'selected' : ''}>18F-FDG (Oncológico / Inflamatorio)</option>
                  <option value="18F-DOPA (Feocromocitoma / Neuroendocrino)" ${currentTracer.includes('DOPA') ? 'selected' : ''}>18F-DOPA (Feocromocitoma / Neuroendocrino)</option>
                  <option value="68Ga-DOTATOC (Tumores Neuroendocrinos)" ${currentTracer.includes('DOTATOC') ? 'selected' : ''}>68Ga-DOTATOC (Tumores Neuroendocrinos)</option>
                  <option value="18F-PSMA / 68Ga-PSMA (Próstata)" ${currentTracer.includes('PSMA') ? 'selected' : ''}>18F-PSMA / 68Ga-PSMA (Próstata)</option>
                  <option value="18F-Colina (Próstata / Paratiroides)" ${currentTracer.includes('Colina') ? 'selected' : ''}>18F-Colina (Próstata / Paratiroides)</option>
                  <option value="FDG Neurológico / Demencias" ${currentTracer.includes('Neuro') ? 'selected' : ''}>FDG Neurológico / Demencias</option>
                </select>
              </div>

              <div class="prioritize-field">
                <label for="noteInput_${p.id}">3. NOTA / JUSTIFICACIÓN MÉDICA PARA EL PROGRAMA DE TRIAJE:</label>
                <input type="text" id="noteInput_${p.id}" placeholder="Ej: Autorizado PET precoz; realizar sin contraste IV por insuficiencia renal..." value="">
              </div>
            </div>

            <!-- Botón de Envío -->
            <div class="prioritize-actions-row">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600;">
                ℹ️ Al validar, la petición se desbloquea y el programa de triaje le asignará hueco y fecha en la agenda automáticamente.
              </span>
              <button type="button" class="btn-send-to-triage" onclick="window.consolaApp.sendUntriagedToTriage('${p.id}')">
                <span>🚀 Validar Prioridad y Enviar a Triaje</span>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function selectFolderPriority(patientId, prio) {
    state.selectedPriorities[patientId] = prio;
    const groupEl = document.getElementById(`prioGroup_${patientId}`);
    if (groupEl) {
      const btns = groupEl.querySelectorAll('.prio-btn-option');
      btns.forEach(b => {
        b.classList.remove('selected');
        if (b.classList.contains(`prio-${prio.toLowerCase()}`)) {
          b.classList.add('selected');
        }
      });
    }
  }

  function sendUntriagedToTriage(patientId) {
    const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
    if (!patient) return;

    const prioCode = state.selectedPriorities[patientId] || 'P2';
    const prioLabels = {
      'P1': '🔴 P1 (Preferente Urgente)',
      'P2': '🟡 P2 (Preferente)',
      'P3': '🟢 P3 (Ordinaria)'
    };
    const finalPriority = prioLabels[prioCode] || prioLabels.P2;

    const tracerEl = document.getElementById(`tracerSel_${patientId}`);
    const finalTracer = tracerEl ? tracerEl.value : patient.radiofarmaco;

    const noteEl = document.getElementById(`noteInput_${patientId}`);
    const doctorNote = noteEl ? noteEl.value.trim() : '';

    const timestamp = formatCurrentDateTime();

    // 1. Actualizar el paciente: se desbloquea para el programa de triaje
    patient.noTriable = false;
    patient.estadoTriaje = 'Pendiente de Triaje'; // Listo para que el programa de triaje asigne hueco
    patient.prioridad = finalPriority;
    patient.prioridadCalculada = finalPriority;
    patient.caracterPeticion = finalPriority;
    patient.radiofarmaco = finalTracer;
    patient.fechaCita = ''; // Sigue sin cita asignada: la cita la otorga el programa de triaje
    patient.horaCita = 'Pendiente de Triaje';
    patient.motivoNoTriable = '';
    patient.resolucionMedicaTriaje = {
      doctor: 'Dr. Manuel Gómez Feijóo',
      prioridadAsignada: finalPriority,
      radiofarmacoValidado: finalTracer,
      nota: doctorNote || 'Prioridad clínica y radiofármaco validados por facultativo de Medicina Nuclear.',
      timestamp: timestamp
    };

    if (patient.raw) {
      patient.raw.noTriable = false;
      patient.raw["Estado de Triaje"] = 'Pendiente de Triaje';
      patient.raw["Prioridad Calculada"] = finalPriority;
      patient.raw["Carácter de la Petición"] = finalPriority;
      patient.raw["Tipo de Estudio PET Solicitado"] = finalTracer;
      patient.raw["Fecha Cita Asignada"] = '';
      patient.raw["Hora Cita Asignada"] = 'Pendiente de Triaje';
      patient.raw.motivoNoTriable = '';
      patient.raw.resolucionMedicaTriaje = patient.resolucionMedicaTriaje;
    }

    // 2. Persistir en base de datos maestra
    try {
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        const list = JSON.parse(stored);
        list.forEach(item => {
          const k = item["Submission ID"] || item.id || item["NHC / Historia Clínica"] || item.nhc;
          if (k === patient.id || k === patient.nhc) {
            item.noTriable = false;
            item["Estado de Triaje"] = 'Pendiente de Triaje';
            item["Prioridad Calculada"] = finalPriority;
            item["Carácter de la Petición"] = finalPriority;
            item["Tipo de Estudio PET Solicitado"] = finalTracer;
            item["Fecha Cita Asignada"] = '';
            item["Hora Cita Asignada"] = 'Pendiente de Triaje';
            item.motivoNoTriable = '';
            item.resolucionMedicaTriaje = patient.resolucionMedicaTriaje;
          }
        });
        localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(list));
      }
    } catch(e) {}

    // Notificar en red si petClinicalBroadcast existe
    if (petClinicalBroadcast) {
      petClinicalBroadcast.postMessage({
        type: 'PATIENT_TRIAGE_PRIORITIZED',
        patientId: patient.id,
        nhc: patient.nhc,
        nombre: patient.nombre,
        prioridad: finalPriority,
        radiofarmaco: finalTracer,
        doctor: 'Dr. Manuel Gómez Feijóo',
        timestamp: Date.now()
      });
    }

    // 3. Mostrar confirmación asistencial interactiva
    mostrarConfirmacionEnvioTriaje(patient, finalPriority, finalTracer);

    // 4. Re-renderizar la carpeta y actualizar insignias
    renderUntriagedFolder();
    updateKpis();
  }

  function mostrarConfirmacionEnvioTriaje(patient, prio, trazador) {
    const old = document.getElementById('triajeConfirmModal');
    if (old) old.remove();

    const modal = document.createElement('div');
    modal.id = 'triajeConfirmModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(15, 23, 42, 0.7)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '999999';

    modal.innerHTML = `
      <div style="background:#ffffff; border-radius:14px; max-width:540px; width:92%; padding:26px 30px; box-shadow:0 20px 45px rgba(0,0,0,0.3); border:2px solid #10b981; text-align:left;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:14px;">
          <span style="font-size:2.5rem; line-height:1;">🚀</span>
          <div>
            <h3 style="margin:0; font-family:'Outfit',sans-serif; font-size:1.3rem; color:#065f46; font-weight:800;">
              ¡Petición Priorizada y Enviada a Triaje!
            </h3>
            <span style="font-size:0.8rem; color:#047857; font-weight:700;">Desbloqueada para asignación automática de cita</span>
          </div>
        </div>

        <div style="background:#f0fdf4; border:1px solid #bbf7d0; border-radius:8px; padding:12px 16px; margin-bottom:16px; font-size:0.86rem; color:#14532d; line-height:1.45;">
          <div>Paciente: <strong>${escapeHTML(patient.nombre)}</strong> (<span style="font-family:monospace;">${escapeHTML(patient.nhc)}</span>)</div>
          <div style="margin-top:4px;">Prioridad Asignada: <strong>${escapeHTML(prio)}</strong></div>
          <div style="margin-top:2px;">Radiofármaco Confirmado: <strong>${escapeHTML(trazador)}</strong></div>
        </div>

        <p style="font-size:0.82rem; color:#475569; line-height:1.45; margin:0 0 20px 0;">
          La petición ha salido de la carpeta de incidencias y ha entrado en la cola del <strong>Programa de Triaje PET/CT</strong>. El algoritmo procederá a asignarle fecha y hueco de exploración según la ventana de prioridad clínica.
        </p>

        <div style="display:flex; justify-content:flex-end; gap:10px;">
          <a href="../pet_ct_triage/web_app/index.html" target="_blank" style="background:#047857; color:#ffffff; text-decoration:none; padding:9px 16px; border-radius:8px; font-weight:800; font-size:0.84rem; display:inline-flex; align-items:center; gap:6px;">
            <span>📋 Abrir Programa de Triaje</span>
            <span style="font-size:0.75rem;">↗</span>
          </a>
          <button type="button" onclick="this.closest('#triajeConfirmModal').remove()" style="background:#e2e8f0; color:#1e293b; border:none; padding:9px 18px; border-radius:8px; font-weight:800; font-size:0.84rem; cursor:pointer;">
            Aceptar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

// ==========================================================================
// ENLACE EN TIEMPO REAL CON LA CONSOLA DE TÉCNICOS TSID Y ENFERMERÍA
// (Tiempo que le queda por pasar, en máquina, cuándo sale, tardía y aviso de alta)
// ==========================================================================
const petClinicalBroadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pet_clinical_channel') : null;

if (petClinicalBroadcast) {
  petClinicalBroadcast.onmessage = (event) => {
    const data = event.data;
    if (!data) return;
    if (state.tardiaTargetPatient || state.selectedPatient) return;
    if (data.type === 'TRIAGE_DATABASE_UPDATED') {
      loadPatientsData(true).then(() => render());
    } else if (data.type === 'TSID_PATIENT_STATUS_CHANGED' || data.type === 'INJECTION_UPDATED' || data.type === 'PATIENT_DISCHARGE_AUTHORIZED' || data.type === 'TSID_PATIENT_DELETED') {
      renderPatientList();
    }
  };
}

window.addEventListener('storage', (event) => {
  if (state.tardiaTargetPatient || state.selectedPatient) return;
  if (event.key === 'PET_SHARED_TSID_STATUS_V1' || event.key === 'PET_TSID_WORKLIST_V1' || event.key === 'PET_SHARED_DISCHARGE_V1' || event.key === 'PET_MEDICAL_PROTOCOLS_V1' || event.key === 'PET_SHARED_INJECTIONS_AND_MOBILITY_V1') {
    loadStoredProtocols();
    renderPatientList();
  }
});

function formatHHMMFromDate(dt) {
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function ensureDefaultLiveStatusesForToday() {
  // Limpiar cualquier entrada ficticia auto-generada en sesiones previas (las entradas reales de TSID incluyen timestamp)
  try {
    const syncMap = JSON.parse(localStorage.getItem('PET_SHARED_TSID_STATUS_V1') || '{}');
    let modified = false;
    for (const k of Object.keys(syncMap)) {
      const item = syncMap[k];
      if (item && !item.timestamp) {
        delete syncMap[k];
        modified = true;
      }
    }
    if (modified) {
      localStorage.setItem('PET_SHARED_TSID_STATUS_V1', JSON.stringify(syncMap));
    }
  } catch (e) {}
}

function getTsidLiveStatus(patient) {
  ensureDefaultLiveStatusesForToday();
  let tsidState = null;

  // 1. Buscar en PET_SHARED_TSID_STATUS_V1 (solo entradas reales emitidas por TSID)
  try {
    const syncMap = JSON.parse(localStorage.getItem('PET_SHARED_TSID_STATUS_V1') || '{}');
    tsidState = syncMap[patient.id] || syncMap[patient.nhc];
    if (!tsidState && patient.nhc) {
      const pNum = patient.nhc.replace(/\D/g, '');
      for (const k in syncMap) {
        if (k.replace(/\D/g, '') === pNum) {
          tsidState = syncMap[k];
          break;
        }
      }
    }
  } catch(e) {}

  // 2. Si no está, buscar en la worklist de TSID
  if (!tsidState) {
    try {
      const tsidList = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
      const pNum = (patient.nhc || '').replace(/\D/g, '');
      tsidState = tsidList.find(x => x.id === patient.id || x.nhc === patient.nhc || (pNum && (x.nhc || '').replace(/\D/g, '') === pNum));
    } catch(e) {}
  }

  // 2b. Integrar datos de inyección y glucemia de Enfermería (PET_SHARED_INJECTIONS_AND_MOBILITY_V1)
  try {
    const nursingMap = JSON.parse(localStorage.getItem('PET_SHARED_INJECTIONS_AND_MOBILITY_V1') || '{}');
    const nEntry = nursingMap[patient.id] || nursingMap[patient.nhc];
    if (nEntry) {
      if (nEntry.glucemia) {
        const gClean = String(nEntry.glucemia).replace(/[^\d]/g, '');
        if (gClean) patient.glucemia = gClean;
      }
      if (nEntry.horaInyeccion) {
        if (!tsidState) tsidState = { estado: 'uptake', horaInyeccion: nEntry.horaInyeccion };
        else if (!tsidState.horaInyeccion) tsidState.horaInyeccion = nEntry.horaInyeccion;
        if (!tsidState.estado || tsidState.estado === 'waiting') tsidState.estado = 'uptake';
      }
    }
  } catch(e) {}

  // 3. Revisar si hay alta médica registrada
  let isDischarged = false;
  let horaAlta = '';
  try {
    const discMap = JSON.parse(localStorage.getItem('PET_SHARED_DISCHARGE_V1') || '{}');
    const disc = discMap[patient.id] || discMap[patient.nhc];
    if (disc) {
      isDischarged = true;
      horaAlta = disc.horaAltaMedica || '';
    }
  } catch(e) {}

  if (tsidState && tsidState.altaMedicaAutorizada) {
    isDischarged = true;
    horaAlta = tsidState.horaAltaMedica || horaAlta;
  }

  // 4. Revisar si hay orden de adquisición tardía
  let tardiaOrder = patient.tardiaPautada || (patient.protocoloMedico && patient.protocoloMedico.tardiaPautada) || null;
  if (!tardiaOrder) {
    try {
      const storedTardiaMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
      tardiaOrder = storedTardiaMap[patient.id] || storedTardiaMap[patient.nhc] || null;
    } catch(e) {}
  }

  const horaInyeccion = String((tsidState && tsidState.horaInyeccion) || '').trim();
  let estado = tsidState ? (tsidState.estado || 'waiting') : 'waiting';
  // Ningún paciente puede estar en reposo ('uptake') ni listo para pasar a máquina ('ready') si aún no ha sido inyectado
  if (!horaInyeccion && (estado === 'uptake' || estado === 'ready')) {
    estado = 'waiting';
  }
  const tiempoProtocoloMin = (patient.protocoloMedico && parseInt(patient.protocoloMedico.uptakeTime, 10)) || (tsidState && tsidState.tiempoProtocoloMin) || 60;
  const horaEntradaMaquina = (tsidState && tsidState.horaEntradaMaquina) || '';
  const horaSalidaMaquina = (tsidState && tsidState.horaSalidaMaquina) || '';
  const horaEntradaTardia = (tsidState && tsidState.horaEntradaTardia) || '';
  const horaSalidaTardia = (tsidState && tsidState.horaSalidaTardia) || '';

  let targetMachineTime = '--:--';
  let remainingText = '-- min';
  let remainingSeconds = 0;
  let isTimeComplete = false;

  if (horaInyeccion) {
    const parts = horaInyeccion.split(':').map(Number);
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const [injH, injM] = parts;
      let totM = injM + Number(tiempoProtocoloMin);
      let totH = injH + Math.floor(totM / 60);
      totM = totM % 60;
      totH = totH % 24;
      targetMachineTime = `${String(totH).padStart(2, '0')}:${String(totM).padStart(2, '0')}`;

      const now = new Date();
      const curSec = (now.getHours() * 3600) + (now.getMinutes() * 60) + now.getSeconds();
      const tarSec = (totH * 3600) + (totM * 60);
      remainingSeconds = tarSec - curSec;

      if (remainingSeconds <= 0) {
        isTimeComplete = true;
        remainingText = '00:00 (¡Tiempo cumplido!)';
      } else {
        const m = Math.floor(remainingSeconds / 60);
        const s = remainingSeconds % 60;
        remainingText = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')} min`;
      }
    }
  }

  const requiereFaseVascular = Boolean((patient.protocoloMedico && patient.protocoloMedico.vascularPhase === 'si') || (tsidState && tsidState.requiereFaseVascular));
  const faseVascularIniciada = Boolean(tsidState && tsidState.faseVascularIniciada);
  const horaInicioFaseVascular = (tsidState && tsidState.horaInicioFaseVascular) || '';

  return {
    estado,
    isInjected: Boolean(horaInyeccion),
    horaInyeccion,
    tiempoProtocoloMin,
    targetMachineTime,
    remainingSeconds,
    remainingText,
    isTimeComplete,
    horaEntradaMaquina,
    horaSalidaMaquina,
    horaEntradaTardia,
    horaSalidaTardia,
    requiereFaseVascular,
    faseVascularIniciada,
    horaInicioFaseVascular,
    tardiaOrder,
    altaMedicaAutorizada: isDischarged,
    horaAltaMedica: horaAlta
  };
}

function getRecommendedDefaultTardiaZone(p) {
  const diag = String(p.diagnostico || '').toLowerCase();
  const tracer = String(p.radiofarmaco || '').toLowerCase();
  if (tracer.includes('psma') || tracer.includes('colina') || diag.includes('prostata') || diag.includes('vejiga') || diag.includes('pelvis')) {
    return 'pelvis_tardia';
  }
  if (diag.includes('higado') || diag.includes('hepato') || diag.includes('colon') || diag.includes('pancreas')) {
    return 'higado_tardia';
  }
  if (diag.includes('endocarditis') || diag.includes('pulmon') || diag.includes('torax') || diag.includes('mediastino')) {
    return 'torax_tardia';
  }
  if (diag.includes('cabeza') || diag.includes('cuello') || diag.includes('laringe') || diag.includes('cavum')) {
    return 'cabeza_cuello_tardia';
  }
  if (diag.includes('mmii') || diag.includes('sarcoma') || diag.includes('melanoma')) {
    return 'extremidades_tardia';
  }
  return 'pelvis_tardia';
}

function buildScannerStatusCardHtml(p, s) {
  // 1. Etiqueta de si fue Inyectado
  const injectedBadgeHtml = s.isInjected
    ? `<span class="inj-pill is-injected">💉 INYECTADO (${escapeHTML(s.horaInyeccion || 'Sí')} h)</span>`
    : `<span class="inj-pill not-injected">⚪ NO INYECTADO AÚN</span>`;

  // 2. Estado de Máquina y Tiempo Restante
  let badgeClass = s.estado;
  let badgeText = s.requiereFaseVascular && !s.faseVascularIniciada
    ? '🩸 PENDIENTE DE 1ª FASE VASCULAR (TSID)'
    : '🟡 Pendiente de Inyección en Box';
  let timeText = s.requiereFaseVascular && !s.faseVascularIniciada
    ? `Fase Vascular protocolizada · Cuando TSID indique el inicio de la Fase Vascular empezará el descuento de <strong>${s.tiempoProtocoloMin} min</strong> para la 2ª Fase.`
    : 'A la espera de canalización y administración de dosis por Enfermería.';

  if (s.estado === 'uptake') {
    badgeClass = s.isTimeComplete ? 'ready' : 'uptake';
    badgeText = s.isTimeComplete
      ? (s.requiereFaseVascular ? '🟢 ¡TIEMPO CUMPLIDO! LISTO PARA 2ª FASE' : '🟢 ¡TIEMPO CUMPLIDO! LISTO PARA MÁQUINA')
      : (s.requiereFaseVascular ? `🩸 FASE VASCULAR HECHA (${s.horaInicioFaseVascular || s.horaInyeccion}h) · ⏳ FALTAN ${s.remainingText} PARA 2ª FASE` : `⏳ EN REPOSO · FALTAN ${s.remainingText}`);
    timeText = s.requiereFaseVascular
      ? `Descuento para 2ª Fase: <strong class="live-countdown-val" data-countdown-pid="${p.id}">${s.remainingText}</strong> · Entrada a 2ª Fase prevista: <strong>${s.targetMachineTime} h</strong> (Pauta: ${s.tiempoProtocoloMin} min tras Fase Vascular)`
      : `Tiempo restante para pasar a máquina: <strong class="live-countdown-val" data-countdown-pid="${p.id}">${s.remainingText}</strong> · Entrada a máquina prevista: <strong>${s.targetMachineTime} h</strong> (Pauta: ${s.tiempoProtocoloMin} min)`;
  } else if (s.estado === 'ready') {
    badgeClass = 'ready';
    badgeText = '🟢 ¡LISTO PARA ENTRAR A MÁQUINA!';
    timeText = `Tiempo de captación (${s.tiempoProtocoloMin} min) completado a las <strong>${s.targetMachineTime} h</strong>. Preparado para pasar a camilla.`;
  } else if (s.estado === 'scanning') {
    badgeClass = 'scanning';
    badgeText = '🟣 EN MÁQUINA PET/CT (ADQUIRIENDO AHORA)';
    timeText = `<strong>Paciente dentro de máquina desde las ${s.horaEntradaMaquina || '--:--'} h</strong> · Adquisición tomográfica estándar en curso.`;
  } else if (s.estado === 'tardia') {
    badgeClass = 'tardia';
    badgeText = '🕒 EN MÁQUINA (REALIZANDO SERIE TARDÍA)';
    const zName = (s.tardiaOrder && s.tardiaOrder.zonaNombre) || 'Foco Tardío';
    timeText = `<strong>En máquina realizando Tardía de ${escapeHTML(zName)} desde las ${s.horaEntradaTardia || '--:--'} h</strong>.`;
  } else if (s.estado === 'done') {
    badgeClass = 'done';
    badgeText = '✅ ACABÓ DE PASAR A MÁQUINA';
    const tardiaExtra = s.horaEntradaTardia ? ` · Tardía realizada: <strong>${s.horaEntradaTardia}</strong> ➔ <strong>${s.horaSalidaTardia || '--:--'} h</strong>` : '';
    timeText = `Entró a máquina: <strong>${s.horaEntradaMaquina || '--:--'} h</strong> · <strong>Salió de máquina: ${s.horaSalidaMaquina || '--:--'} h</strong>${tardiaExtra}.`;
  }

  // 3. Controles de Adquisición Tardía (elegir de qué zona se realiza) o Alta Médica al acabar de pasar a máquina
  const defZone = (s.tardiaOrder && s.tardiaOrder.zona) || getRecommendedDefaultTardiaZone(p);
  let postScanDecisionHtml = '';

  if (s.altaMedicaAutorizada) {
    postScanDecisionHtml = `
      <div class="post-scan-decision-bar is-discharged">
        <span class="discharge-authorized-tag">🟢 ALTA MÉDICA AUTORIZADA (${escapeHTML(s.horaAltaMedica || '--:--')} h) · No requiere más imágenes</span>
        <button type="button" class="btn-card-tardia" style="padding:4px 9px; font-size:0.74rem;" onclick="window.consolaApp.openModalPedirTardia('${p.id}')">
          🕒 Reabrir / Pedir Tardía
        </button>
      </div>
    `;
  } else if (s.tardiaOrder && s.tardiaOrder.requerida) {
    postScanDecisionHtml = `
      <div class="post-scan-decision-bar has-tardia-order">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          <span class="badge-tardia-solicitada">
            🎯 TARDÍA INDICADA: <strong>${escapeHTML(s.tardiaOrder.zonaNombre)}</strong> (${s.tardiaOrder.numCamas || 2} Camas · +${s.tardiaOrder.minutosEspera || 20} min)
          </span>
          ${s.tardiaOrder.indicaciones ? `<span style="font-size:0.74rem; color:#92400e; font-weight:600;">"${escapeHTML(s.tardiaOrder.indicaciones)}"</span>` : ''}
        </div>
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <button type="button" class="btn-card-tardia" style="padding:4px 10px; font-size:0.75rem;" onclick="window.consolaApp.openModalPedirTardia('${p.id}')">
            🧍‍♂️ Mover Caja / Cambiar Zona Tardía
          </button>
          <button type="button" class="btn-cancel-inline-tardia" onclick="window.consolaApp.anularTardiaRapidaDesdeFila('${p.id}')">
            ❌ Anular
          </button>
          <button type="button" class="btn-card-discharge" style="padding:4px 10px; font-size:0.75rem;" onclick="window.consolaApp.autorizarAltaPaciente('${p.id}')">
            🟢 Dar Alta Médica
          </button>
        </div>
      </div>
    `;
  } else {
    const isFinishedHighlight = s.estado === 'done';
    postScanDecisionHtml = `
      <div class="post-scan-decision-bar ${isFinishedHighlight ? 'highlight-post-scan' : ''}">
        <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
          <span class="tardia-prompt-label">
            ${isFinishedHighlight ? '🔔 <strong>Acabó en máquina · ¿Necesita Tardía?</strong>' : '🕒 <strong>¿Necesita Tardía al acabar?</strong>'}
          </span>
          <button type="button" class="btn-card-tardia has-tardia" style="padding:5px 12px; font-size:0.77rem;" onclick="window.consolaApp.openModalPedirTardia('${p.id}')" title="Abrir imagen del paciente para seleccionar con una caja la zona de la tardía">
            🧍‍♂️ Tardía (Seleccionar Caja en Paciente)
          </button>
          <select id="quickZoneSelect_${p.id}" class="inline-tardia-zone-select" title="Seleccionar de qué zona anatómica realizar la adquisición tardía">
            <option value="pelvis_tardia" ${defZone === 'pelvis_tardia' ? 'selected' : ''}>🎯 Pelvis / Vejiga / Próstata (2 camas)</option>
            <option value="higado_tardia" ${defZone === 'higado_tardia' ? 'selected' : ''}>🎯 Hígado / Abdomen Superior (2 camas)</option>
            <option value="torax_tardia" ${defZone === 'torax_tardia' ? 'selected' : ''}>🎯 Tórax / Mediastino / Cardíaca (2 camas)</option>
            <option value="cabeza_cuello_tardia" ${defZone === 'cabeza_cuello_tardia' ? 'selected' : ''}>🎯 Cabeza y Cuello / Ganglionar (2 camas)</option>
            <option value="extremidades_tardia" ${defZone === 'extremidades_tardia' ? 'selected' : ''}>🎯 Extremidades / Zona Lesional (2 camas)</option>
          </select>
          <button type="button" class="btn-card-tardia" style="padding:4px 9px; font-size:0.74rem;" onclick="window.consolaApp.pedirTardiaRapidaDesdeFila('${p.id}')" title="Enviar directamente la zona del desplegable">
            📢 Envío Rápido
          </button>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <button type="button" class="btn-card-discharge" style="padding:4px 10px; font-size:0.75rem;" onclick="window.consolaApp.autorizarAltaPaciente('${p.id}')">
            🟢 Sin Tardía · Dar Alta
          </button>
        </div>
      </div>
    `;
  }

  return `
    <div class="row-full-live-scanner scanner-live-box ${s.estado === 'scanning' ? 'is-scanning' : ''} ${s.estado === 'tardia' ? 'is-tardia' : ''} ${s.estado === 'done' ? 'is-done' : ''} ${s.altaMedicaAutorizada ? 'is-discharged' : ''}">
      <div class="scanner-live-main-line">
        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${injectedBadgeHtml}
          <span class="scanner-badge-status ${badgeClass}" data-badge-pid="${p.id}">${badgeText}</span>
          <span class="scanner-time-item">${timeText}</span>
        </div>
      </div>
      ${postScanDecisionHtml}
    </div>
  `;
}

function pedirTardiaRapidaDesdeFila(patientId) {
  const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
  if (!patient) return;

  const selectEl = document.getElementById(`quickZoneSelect_${patient.id}`);
  const zoneKey = selectEl ? selectEl.value : getRecommendedDefaultTardiaZone(patient);

  const zoneNames = {
    pelvis_tardia: 'Pelvis / Vejiga / Próstata',
    higado_tardia: 'Hígado / Abdomen Superior',
    torax_tardia: 'Tórax / Mediastino / Cardíaca',
    cabeza_cuello_tardia: 'Cabeza y Cuello / Ganglionar',
    extremidades_tardia: 'Extremidades / Partes Blandas'
  };

  const defaultInstructions = {
    pelvis_tardia: 'Forzar vaciado vesical completo antes de colocar en camilla. Centrar en foco pélvico (2 camas).',
    higado_tardia: '2 camas centradas en hipocondrio derecho y epigastrio para lavado hepatobiliar.',
    torax_tardia: '2 camas torácicas centradas en corazón y mediastino.',
    cabeza_cuello_tardia: '2 camas cervicales con brazos abajo y soporte de confort.',
    extremidades_tardia: '2 camas en extremidades centradas en la zona lesional.'
  };

  const now = new Date();
  const timeStr = formatHHMMFromDate(now);

  const tardiaPautada = {
    requerida: true,
    zona: zoneKey,
    zonaNombre: zoneNames[zoneKey] || 'Pelvis / Vejiga',
    numCamas: 2,
    minutosEspera: '20',
    indicaciones: defaultInstructions[zoneKey] || 'Realizar serie tardía de 2 camas.',
    medico: 'Dr. Manuel Gómez Feijóo',
    horaOrden: timeStr,
    timestamp: Date.now()
  };

  patient.tardiaPautada = tardiaPautada;
  if (!patient.protocoloMedico) {
    patient.protocoloMedico = getSmartDefaultProtocol(patient);
  }
  patient.protocoloMedico.tardia = zoneKey;
  patient.protocoloMedico.tardiaInstructions = tardiaPautada.indicaciones;
  patient.protocoloMedico.tardiaPautada = tardiaPautada;

  try {
    const storedMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
    storedMap[patient.id] = tardiaPautada;
    if (patient.nhc) storedMap[patient.nhc] = tardiaPautada;
    localStorage.setItem('PET_SHARED_LATE_SCAN_ORDERS_V1', JSON.stringify(storedMap));

    const tsidList = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
    tsidList.forEach(tp => {
      if (tp.id === patient.id || tp.nhc === patient.nhc) {
        tp.tardiaPautada = tardiaPautada;
        tp.presetCajaCampos = zoneKey;
      }
    });
    localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(tsidList));
  } catch (e) {}

  saveStoredProtocols();

  if (petClinicalBroadcast) {
    petClinicalBroadcast.postMessage({
      type: 'LATE_SCAN_ORDERED',
      patientId: patient.id,
      nhc: patient.nhc,
      nombre: patient.nombre,
      tardiaPautada: tardiaPautada,
      timestamp: Date.now()
    });
  }

  showToast(`🕒 Tardía de ${zoneNames[zoneKey]} indicada para ${patient.nombre} y enviada a Consola TSID`, 'warning');
  renderPatientList();
}

function anularTardiaRapidaDesdeFila(patientId) {
  const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
  if (!patient) return;
  state.tardiaTargetPatient = patient;
  anularPautaTardia();
}

function sonarAlarmaAltaMedica() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === 'suspended') ctx.resume();

    const playTone = (freq, start, dur) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0.32, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur);
    };

    playTone(523.25, 0.0, 0.14);
    playTone(659.25, 0.16, 0.14);
    playTone(783.99, 0.32, 0.24);

    playTone(523.25, 0.65, 0.14);
    playTone(659.25, 0.81, 0.14);
    playTone(1046.50, 0.97, 0.32);
  } catch (e) {}
}

function autorizarAltaPaciente(patientId) {
  const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
  if (!patient) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nhcDigits = String(patient.nhc || '').replace(/\D/g, '');

  const dischargeEvent = {
    type: 'PATIENT_DISCHARGE_AUTHORIZED',
    patientId: patient.id,
    nhc: patient.nhc,
    nhcDigits: nhcDigits,
    nombre: patient.nombre,
    doctor: 'Dr. Manuel Gómez Feijóo',
    estadoTexto: 'PUEDE IRSE',
    authorized: true,
    discharged: true,
    altaMedicaAutorizada: true,
    notificadoEnfermeria: false,
    horaAlta: timeStr,
    horaAltaMedica: timeStr,
    time: timeStr,
    timestamp: Date.now()
  };

  try {
    const storedDischarges = JSON.parse(localStorage.getItem('PET_SHARED_DISCHARGE_V1') || '{}');
    storedDischarges[patient.id] = dischargeEvent;
    if (patient.nhc) storedDischarges[patient.nhc] = dischargeEvent;
    if (nhcDigits) storedDischarges[nhcDigits] = dischargeEvent;
    if (patient.nombre) storedDischarges[patient.nombre] = dischargeEvent;
    localStorage.setItem('PET_SHARED_DISCHARGE_V1', JSON.stringify(storedDischarges));

    // Si tenía tardía pendiente y se da el alta definitiva, limpiarla
    patient.tardiaPautada = null;
    if (patient.protocoloMedico) patient.protocoloMedico.tardiaPautada = null;
    const storedTardia = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
    delete storedTardia[patient.id];
    if (patient.nhc) delete storedTardia[patient.nhc];
    localStorage.setItem('PET_SHARED_LATE_SCAN_ORDERS_V1', JSON.stringify(storedTardia));

    const syncKey = 'PET_SHARED_TSID_STATUS_V1';
    const tsidSync = JSON.parse(localStorage.getItem(syncKey) || '{}');
    if (!tsidSync[patient.id]) tsidSync[patient.id] = { id: patient.id, nhc: patient.nhc, estado: 'done' };
    tsidSync[patient.id].altaMedicaAutorizada = true;
    tsidSync[patient.id].horaAltaMedica = timeStr;
    if (patient.nhc) {
      if (!tsidSync[patient.nhc]) tsidSync[patient.nhc] = tsidSync[patient.id];
      tsidSync[patient.nhc].altaMedicaAutorizada = true;
      tsidSync[patient.nhc].horaAltaMedica = timeStr;
    }
    localStorage.setItem(syncKey, JSON.stringify(tsidSync));

    const tsidWorklist = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
    tsidWorklist.forEach(tp => {
      if (tp.id === patient.id || tp.nhc === patient.nhc || (nhcDigits && String(tp.nhc || '').replace(/\D/g, '') === nhcDigits)) {
        tp.altaMedicaAutorizada = true;
        tp.horaAltaMedica = timeStr;
        tp.altaDoctor = 'Dr. Manuel Gómez Feijóo';
      }
    });
    localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(tsidWorklist));

    // Sincronizar también en PET_DATABASE_MASTER_V4 para Enfermería
    const masterList = JSON.parse(localStorage.getItem('PET_DATABASE_MASTER_V4') || '[]');
    if (Array.isArray(masterList) && masterList.length > 0) {
      masterList.forEach(mp => {
        const mId = mp["Submission ID"] || mp.id;
        const mNhc = mp["NHC / Historia Clínica"] || mp.nhc || '';
        const mNhcDigits = String(mNhc).replace(/\D/g, '');
        if (mId === patient.id || mNhc === patient.nhc || (nhcDigits && mNhcDigits === nhcDigits)) {
          mp.altaMedicaAutorizada = true;
          mp.horaAltaMedica = timeStr;
          mp.altaDoctor = 'Dr. Manuel Gómez Feijóo';
        }
      });
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(masterList));
    }
  } catch(e) {}

  if (petClinicalBroadcast) {
    petClinicalBroadcast.postMessage(dischargeEvent);
  }

  sonarAlarmaAltaMedica();
  mostrarToastDoctorAltaConfirmada(patient, timeStr);
  renderPatientList();
}

function mostrarToastDoctorAltaConfirmada(pat, timeStr) {
  const old = document.getElementById('doctorAltaNotifBanner');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'doctorAltaNotifBanner';
  toast.style.position = 'fixed';
  toast.style.top = '22px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = 'linear-gradient(135deg, #064e3b 0%, #047857 100%)';
  toast.style.color = '#ffffff';
  toast.style.padding = '16px 24px';
  toast.style.borderRadius = '12px';
  toast.style.border = '2.5px solid #34d399';
  toast.style.boxShadow = '0 18px 40px rgba(0,0,0,0.4), 0 0 25px rgba(16,185,129,0.45)';
  toast.style.zIndex = '999999';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '14px';
  toast.style.maxWidth = '580px';
  toast.style.width = '92%';

  toast.innerHTML = `
    <span style="font-size:2.2rem; line-height:1;">🔔</span>
    <div style="flex:1;">
      <div style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.05rem; color:#fde047;">
        ¡AVISO "PUEDE IRSE" ENVIADO A ENFERMERÍA Y TÉCNICOS!
      </div>
      <div style="font-size:0.86rem; font-weight:600; color:#ecfdf5; margin-top:3px;">
        Paciente: <strong>${pat.nombre}</strong> (${pat.nhc}) · Hora: <strong>${timeStr} h</strong>
      </div>
    </div>
    <button type="button" onclick="this.parentElement.remove()" style="background:#10b981; color:#064e3b; border:none; font-weight:800; padding:6px 12px; border-radius:6px; cursor:pointer;">OK</button>
  `;

  document.body.appendChild(toast);
  setTimeout(() => { if (toast.parentNode) toast.remove(); }, 7000);
}

// Refresco automático cada 1 segundo de las cuentas atrás de máquina (en vivo sin cerrar desplegables)
setInterval(() => {
  if (!state.filteredPatients || state.filteredPatients.length === 0 || document.hidden) return;

  state.filteredPatients.forEach(p => {
    const s = getTsidLiveStatus(p);
    const cdEl = document.querySelector(`[data-countdown-pid="${p.id}"]`);
    if (cdEl) {
      cdEl.textContent = s.remainingText;
    }
    const badgeEl = document.querySelector(`[data-badge-pid="${p.id}"]`);
    if (badgeEl && s.estado === 'uptake') {
      badgeEl.textContent = s.isTimeComplete
        ? '🟢 ¡TIEMPO CUMPLIDO! LISTO PARA MÁQUINA'
        : `⏳ EN REPOSO · FALTAN ${s.remainingText}`;
      badgeEl.className = `scanner-badge-status ${s.isTimeComplete ? 'ready' : 'uptake'}`;
    }
  });
}, 1000);


  function renderCardsView() {
    elements.patientsGrid.innerHTML = state.filteredPatients.map(p => {
      const isUntriaged = !!(p.noTriable || p.estadoTriaje === 'No Triable' || (p.raw && p.raw["Estado de Triaje"] === 'No Triable'));
      const isDone = !!(p.protocoloMedico && p.protocoloMedico.completed);
      const prioClass = getPriorityClass(p.prioridad);
      const liveStatus = getTsidLiveStatus(p);
      const scannerLiveHtml = buildScannerStatusCardHtml(p, liveStatus);

      // Chips del protocolo o Alerta de No Triable
      let protocolHtml = '';
      if (isUntriaged) {
        protocolHtml = `
          <div class="untriaged-banner">
            <div class="untriaged-banner-header">
              <span class="untriaged-badge-pill">⚠️ NO TRIABLE POR EL PROGRAMA</span>
              <span class="untriaged-sub-badge">Valoración Médica Obligatoria</span>
            </div>
            <div class="untriaged-reason">
              <strong>Motivo de Incidencia:</strong> ${escapeHTML(p.motivoNoTriable || 'Indicación atípica o discordancia clínica detectada por el algoritmo.')}
            </div>
            <div class="untriaged-suggestion">
              💡 <strong>Sugerencia del sistema:</strong> ${escapeHTML(p.sugerenciaTriaje || 'Revisar antecedentes en SIDI / Volante y protocolizar manualmente.')}
            </div>
          </div>
        `;
      } else if (isDone) {
        const proto = p.protocoloMedico;
        const medsSummary = getMedicationsBadgeList(proto);

        protocolHtml = `
          <div class="protocol-status-box is-done">
            <div class="protocol-header-status">
              <span class="status-label-badge done">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                Protocolizado Oficial
              </span>
              <span style="font-size:0.7rem; color:var(--text-muted); font-weight:600;">${proto.doctorName || 'Dr. M. Gómez'}</span>
            </div>
            <div class="protocol-summary-chips">
              <span class="proto-chip">⏱️ ${proto.uptakeTime || 60} min máquina</span>
              <span class="proto-chip">🙆‍♂️ ${getArmsShort(proto.armsPosition)}</span>
              <span class="proto-chip" style="${proto.vascularPhase === 'si' ? 'background:#fef2f2; color:#dc2626; border-color:#fca5a5;' : ''}">🩸 Fase Vascular: ${proto.vascularPhase === 'si' ? 'SÍ' : 'NO'}</span>
              <span class="proto-chip">📐 ${getRangeShort(proto)}</span>
              <span class="proto-chip">💧 ${getHydrationShort(proto.hydration)}</span>
              <span class="proto-chip">⚡ ${getDiureticShort(proto)}</span>
              <span class="proto-chip">☢️ ${getContrastShort(proto)}</span>
            </div>
            ${medsSummary ? `
              <div style="margin-top:5px; font-size:0.7rem; color:#0369a1; font-weight:700; background:#ffffff; border:1px dashed #bae6fd; border-radius:4px; padding:3px 6px;">
                💊 <strong>Medicación Previa:</strong> ${medsSummary}
              </div>
            ` : ''}
          </div>
        `;
      } else {
        protocolHtml = `
          <div class="protocol-status-box">
            <div class="protocol-header-status">
              <span class="status-label-badge pending">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                Pendiente de Protocolizar
              </span>
              <span style="font-size:0.7rem; color:var(--protocol-pending); font-weight:700;">Sin pauta médica</span>
            </div>
            <p style="font-size: 0.74rem; color: var(--text-secondary); margin-top: 2px;">
              El técnico requiere validar posición de brazos, tipo de prueba, diurético o contraste 15 min antes.
            </p>
          </div>
        `;
      }

      // Badges de alerta
      let alertsHtml = '';
      const glucValNum = parseInt(String(p.glucemia || '').replace(/[^\d]/g, ''), 10);
      if (p.isDiabetic) {
        alertsHtml += `<span class="clinical-alert-tag alert-diabetes" style="${glucValNum >= 200 ? 'background:#fef2f2; color:#b91c1c; border-color:#ef4444;' : ''}">⚠️ Diabético (${escapeHTML(String(p.glucemia || '--'))} mg/dL)</span>`;
      } else if (!isNaN(glucValNum) && glucValNum > 0) {
        const gColorStyle = glucValNum >= 200
          ? 'background:#fef2f2; color:#b91c1c; border:1px solid #fca5a5;'
          : (glucValNum >= 140 ? 'background:#fffbeb; color:#b45309; border:1px solid #fcd34d;' : 'background:#ecfdf5; color:#047857; border:1px solid #6ee7b7;');
        alertsHtml += `<span class="clinical-alert-tag" style="${gColorStyle}">🩸 Glucemia: ${glucValNum} mg/dL</span>`;
      }
      if (p.contraindicacionContraste === 'Sí' || (p.alergia && p.alergia.toLowerCase().includes('yodo'))) {
        alertsHtml += `<span class="clinical-alert-tag alert-allergy">⚠️ Alergia Contraste</span>`;
      }
      if (p.movilidad && p.movilidad !== 'Autónomo') {
        alertsHtml += `<span class="clinical-alert-tag alert-mobility">🦽 ${escapeHTML(p.movilidad)}</span>`;
      }
      if (p.hasPriorPet) {
        alertsHtml += `<span class="clinical-alert-tag" style="background:#e0f2fe; color:#0369a1; border:1px solid #7dd3fc; font-weight:700;" title="${escapeHTML(p.priorPetDetail || 'PET Previo disponible para comparativa')}">🔬 PET Previo: Sí</span>`;
      }

      return `
        <article class="patient-card patient-row-horizontal ${prioClass} ${isUntriaged ? 'is-untriaged' : ''}">
          <!-- 1. HORA Y PRIORIDAD -->
          <div class="row-col-time">
            <span class="time-slot-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              ${escapeHTML(p.horaCita)}
            </span>
            <span class="priority-pill ${prioClass}">${escapeHTML(p.prioridad)}</span>
          </div>

          <!-- 2. IDENTIDAD DEL PACIENTE Y TRAZADOR -->
          <div class="row-col-identity">
            <div class="patient-identity" style="margin-bottom:0.35rem;">
              <h3 class="patient-name">${escapeHTML(p.nombre)}</h3>
              <div class="patient-demographics">
                <span class="nhc-tag">${escapeHTML(p.nhc)}</span>
                <span>${p.edad} años</span>
                <span>•</span>
                <span>${escapeHTML(p.sexo)}</span>
                <span>•</span>
                <span>${p.peso} kg (${p.talla} cm)</span>
              </div>
            </div>
            <div class="clinical-badge-row" style="margin-bottom:0;">
              <span class="tracer-tag">🧪 ${escapeHTML(p.radiofarmaco)}</span>
              ${alertsHtml}
            </div>
          </div>

          <!-- 3. DIAGNÓSTICO CLÍNICO / SOSPECHA -->
          <div class="row-col-diagnosis">
            <div class="patient-diagnosis-box" style="margin-bottom:0; height:100%; display:flex; flex-direction:column; justify-content:center;">
              <div class="diag-title">Diagnóstico Clínico / Sospecha:</div>
              <div class="diag-text">${escapeHTML(p.diagnostico)}</div>
            </div>
          </div>

          <!-- 4. ESTADO DEL PROTOCOLO -->
          <div class="row-col-protocol">
            ${protocolHtml}
          </div>

          <!-- 5. ACCIONES -->
          <div class="row-col-actions">
            <button class="btn-card btn-card-sidi" onclick="window.consolaApp.openSidiModal('${p.id}')" title="Abrir SIDI (Sistema Integrado de Diagnóstico por Imaxe del SERGAS)">
              SIDI
            </button>
            <button class="btn-card btn-card-tardia ${(liveStatus.tardiaOrder && liveStatus.tardiaOrder.requerida) ? 'has-tardia' : ''}" onclick="window.consolaApp.openModalPedirTardia('${p.id}')" title="Seleccionar con una caja sobre el paciente la zona donde realizar la tardía">
              🕒 Tardía
            </button>
            <button class="btn-card btn-card-volante" onclick="window.consolaApp.openVolanteModal('${p.id}')">
              📄 Volante Petición
            </button>
            <button class="btn-card btn-card-protocol ${isUntriaged ? 'btn-card-untriaged-action' : (isDone ? 'is-edit' : '')}" onclick="window.consolaApp.openProtocolModal('${p.id}')">
              ${isUntriaged ? '🩺 Triar / Pautar' : (isDone ? '✏️ Editar Pauta' : '🩺 Protocolizar')}
            </button>
          </div>

          <!-- 6. ESTADO EN VIVO DE INYECCIÓN, MÁQUINA Y ADQUISICIÓN TARDÍA -->
          ${scannerLiveHtml}
        </article>
      `;
    }).join('');
  }

  function renderTableView() {
    elements.patientsTableBody.innerHTML = state.filteredPatients.map(p => {
      const isDone = !!(p.protocoloMedico && p.protocoloMedico.completed);
      const prioClass = getPriorityClass(p.prioridad);
      const liveStatus = getTsidLiveStatus(p);

      let liveShortHtml = '';
      if (liveStatus.estado === 'scanning') {
        liveShortHtml = `<div style="margin-top:4px; font-size:0.72rem; font-weight:800; color:#6d28d9;">🟣 En Máquina (${liveStatus.horaEntradaMaquina || '--:--'}h)</div>`;
      } else if (liveStatus.estado === 'done') {
        liveShortHtml = `<div style="margin-top:4px; font-size:0.72rem; font-weight:800; color:#15803d;">✅ Salió de Máquina (${liveStatus.horaSalidaMaquina || '--:--'}h)</div>`;
      } else if (liveStatus.isInjected) {
        liveShortHtml = `<div style="margin-top:4px; font-size:0.72rem; font-weight:700; color:#0369a1;">💉 Inyectado (${liveStatus.horaInyeccion}h) · ⏳ <span data-countdown-pid="${p.id}">${liveStatus.remainingText}</span></div>`;
      } else {
        liveShortHtml = `<div style="margin-top:4px; font-size:0.72rem; color:var(--text-muted);">⚪ No inyectado</div>`;
      }

      if (liveStatus.tardiaOrder && liveStatus.tardiaOrder.requerida) {
        liveShortHtml += `<div style="margin-top:3px; font-size:0.71rem; font-weight:800; color:#b45309;">🎯 Tardía: ${escapeHTML(liveStatus.tardiaOrder.zonaNombre)}</div>`;
      } else if (liveStatus.altaMedicaAutorizada) {
        liveShortHtml += `<div style="margin-top:3px; font-size:0.71rem; font-weight:800; color:#15803d;">🟢 Alta autorizada</div>`;
      }

      let statusBadge = '';
      if (isUntriaged) {
        statusBadge = `
          <div style="background:#fee2e2; border:1px solid #f87171; border-radius:6px; padding:4px 8px; font-size:0.73rem;">
            <div style="font-weight:800; color:#b91c1c;">⚠️ NO TRIABLE</div>
            <div style="color:#7f1d1d; font-size:0.71rem; line-height:1.25; margin-top:2px;">${escapeHTML(p.motivoNoTriable || 'Requiere decisión')}</div>
          </div>`;
      } else if (isDone) {
        statusBadge = `<span style="display:inline-flex; align-items:center; gap:4px; font-weight:700; color:var(--sergas-navy); font-size:0.76rem; background:var(--protocol-ready-bg); padding:3px 8px; border-radius:6px; border:1px solid var(--sergas-light-border);">
             ✅ Listo (${p.protocoloMedico.uptakeTime || 60}m | ${getArmsShort(p.protocoloMedico.armsPosition)} | ${getRangeShort(p.protocoloMedico.scanRange)})
           </span>`;
      } else {
        statusBadge = `<span style="display:inline-flex; align-items:center; gap:4px; font-weight:700; color:var(--protocol-pending); font-size:0.76rem; background:var(--protocol-pending-bg); padding:3px 8px; border-radius:6px; border:1px dashed var(--protocol-pending);">
             ⏳ Pendiente
           </span>`;
      }

      let alertsShort = [];
      if (p.isDiabetic) alertsShort.push(`💉 Diabético`);
      if (p.contraindicacionContraste === 'Sí') alertsShort.push(`⚠️ Contraste`);
      if (p.movilidad !== 'Autónomo') alertsShort.push(`🦽 ${p.movilidad}`);

      return `
        <tr class="${isUntriaged ? 'is-untriaged-row' : ''}">
          <td><strong style="color:var(--sergas-navy);">${escapeHTML(p.horaCita)}</strong></td>
          <td>
            <div style="font-weight:700; color:var(--text-main);">${escapeHTML(p.nombre)}</div>
            <div style="font-size:0.75rem; color:var(--text-muted); font-family:'JetBrains Mono',monospace;">${escapeHTML(p.nhc)}</div>
          </td>
          <td style="font-size:0.8rem; color:var(--text-secondary);">
            ${p.edad}a · ${escapeHTML(p.sexo)}<br>${p.peso}kg / ${p.talla}cm
          </td>
          <td><span class="tracer-tag" style="font-size:0.7rem;">${escapeHTML(p.radiofarmaco)}</span></td>
          <td style="max-width:260px; font-size:0.82rem; line-height:1.3;">${escapeHTML(p.diagnostico)}</td>
          <td><span class="priority-pill ${prioClass}" style="font-size:0.68rem;">${escapeHTML(p.prioridad)}</span></td>
          <td style="font-size:0.72rem; color:var(--text-secondary);">${alertsShort.join(', ') || 'Normal'}</td>
          <td>${statusBadge}${liveShortHtml}</td>
          <td style="text-align: right; white-space:nowrap;">
            <button class="btn-card btn-card-sidi" style="display:inline-flex; padding:4px 9px; font-size:0.75rem; margin-right:4px;" onclick="window.consolaApp.openSidiModal('${p.id}')" title="Abrir SIDI (Sistema Integrado de Diagnóstico por Imaxe del SERGAS)">
              SIDI
            </button>
            <button class="btn-card-tardia" style="display:inline-flex; padding:4px 8px; font-size:0.75rem; margin-right:4px;" onclick="window.consolaApp.openModalPedirTardia('${p.id}')" title="Indicar si necesita Tardía y de qué zona">
              🕒 Tardía
            </button>
            <button class="btn-card btn-card-volante" style="display:inline-flex; padding:4px 8px; font-size:0.75rem; margin-right:4px;" onclick="window.consolaApp.openVolanteModal('${p.id}')">
              📄 Volante
            </button>
            <button class="btn-card btn-card-protocol ${isUntriaged ? 'btn-card-untriaged-action' : (isDone ? 'is-edit' : '')}" style="display:inline-flex; padding:4px 10px; font-size:0.75rem;" onclick="window.consolaApp.openProtocolModal('${p.id}')">
              ${isUntriaged ? '🩺 Triar / Pautar' : (isDone ? '✏️ Editar' : '🩺 Protocolizar')}
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================================================
  // MANIPULACIÓN DEL MODAL DE PROTOCOLIZACIÓN
  // ==========================================================================
  function openProtocolModal(patientId) {
    try {
      const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
      if (!patient) return;

      state.selectedPatient = patient;

    // Rellenar cabecera del modal
    elements.modalPatName.textContent = patient.nombre;
    elements.modalPatNHC.textContent = patient.nhc;
    elements.modalPatAge.textContent = `${patient.edad} años (${patient.sexo})`;
    elements.modalPatWeight.textContent = `${patient.peso} kg / ${patient.talla} cm`;
    elements.modalPatTracer.textContent = patient.radiofarmaco;
    elements.modalPatGlucose.textContent = `${patient.glucemia} mg/dL ${patient.isDiabetic ? '(Diabético)' : ''}`;

    // Obtener protocolo existente o recomendaciones clínicas inteligentes por defecto
    const existing = patient.protocoloMedico || getSmartDefaultProtocol(patient);
    state.editingProtocol = { ...existing };

    // Cargar valores en los controles
    setRadioOption('uptake', existing.uptakeTime || '60');
    if (['60', '90', '120', '45'].includes(String(existing.uptakeTime))) {
      elements.inputCustomUptake.value = '';
    } else {
      elements.inputCustomUptake.value = existing.uptakeTime || '';
    }

    // Sanitizar brazos (arriba, abajo, almohada)
    let armsVal = existing.armsPosition || 'arriba';
    if (armsVal === 'der_arriba_izq_abajo' || armsVal === 'izq_arriba_der_abajo') {
      armsVal = 'arriba';
    } else if (armsVal === 'abdominal') {
      armsVal = 'almohada';
    }
    setRadioOption('arms', armsVal);
    updateProtoFullBodyArms(armsVal);

    // Fase Vascular (si / no)
    const vascularVal = existing.vascularPhase === 'si' ? 'si' : 'no';
    setRadioOption('vascular', vascularVal);

    // Sanitizar rango y cargar límites Desde / Hasta en el visor Full Body
    let rangeVal = existing.scanRange || 'base_craneo_muslos';
    if (rangeVal === 'torax_4d' || rangeVal === 'columna') {
      rangeVal = 'base_craneo_muslos';
    }
    setRadioOption('range', rangeVal);

    setupProtoFullBodyPlanner();
    if (existing.scanFrom && existing.scanTo) {
      const selFrom = document.getElementById('selectProtoFrom');
      const selTo = document.getElementById('selectProtoTo');
      if (selFrom) selFrom.value = existing.scanFrom;
      if (selTo) selTo.value = existing.scanTo;
      if (typeof existing.scanBoxTop === 'number' && typeof existing.scanBoxBottom === 'number') {
        protoFullBodyState.topY = existing.scanBoxTop;
        protoFullBodyState.bottomY = existing.scanBoxBottom;
      } else {
        syncProtoBoxFromDropdowns();
      }
      renderProtoFullBodyBox();
    } else {
      applyProtoRangePresetToFullBody(rangeVal, false);
    }

    if (elements.wrapCustomRange) {
      elements.wrapCustomRange.style.display = 'flex';
    }
    if (elements.inputCustomRange && existing.customRangeDetails) {
      elements.inputCustomRange.value = existing.customRangeDetails;
    }

    // 3. Hidratación en box (box_si vs box_no)
    let hydVal = 'box_si';
    if (existing.hydration === 'box_no' || existing.hydration === 'restriccion' || existing.hydration === 'ayuno') {
      hydVal = 'box_no';
    }
    setRadioOption('hydration', hydVal);

    // 4. Medicación (Solo Diurético Post-Inyección) y Contraste (En máquina / IV en box / Sin contraste)
    // A) Diurético (Furosemida / Seguril 20 mg)
    let diurVal = 'no';
    if (existing.diuretic === 'si_20mg_post' || existing.diuretic === 'diur_post' || existing.diuretic === 'si_15min_antes' || existing.diuretic === 'diur_si') {
      diurVal = 'si_20mg_post';
    }
    setRadioOption('diuretic', diurVal);

    // B) Protocolo de Contraste: en_maquina, en_box, sin_contraste
    let contrastVal = 'sin_contraste';
    if (existing.contrastType === 'en_maquina' || existing.contrast === 'en_maquina' || existing.contrastGantry === 'civ_portal' || existing.contrast === 'civ_portal') {
      contrastVal = 'en_maquina';
    } else if (existing.contrastType === 'en_box' || existing.contrast === 'en_box' || existing.contrastPre === 'oral_gastrografin' || existing.contrastPre === 'oral_agua' || existing.contrast === 'oral_gastrografin_15min') {
      contrastVal = 'en_box';
    } else {
      contrastVal = 'sin_contraste';
    }
    setRadioOption('contrast', contrastVal);
    if (elements.inputContrastBoxMinutes) {
      elements.inputContrastBoxMinutes.value = existing.contrastBoxMinutes || existing.contrastPreMinutes || '15';
    }

if (elements.txtDoctorNotes) {
  let docNotes = existing.doctorNotes || '';
  if (patient.noTriable && !docNotes.includes('INCIDENCIA DE TRIAJE')) {
    docNotes = `[INCIDENCIA DE TRIAJE RESUELTA]: ${patient.motivoNoTriable}\n` + docNotes;
  }
  elements.txtDoctorNotes.value = docNotes;
}

// 5. Previsión de serie tardía y zona anatómica
let tardiaVal = 'no';
if (existing.tardia && existing.tardia !== 'no') {
  tardiaVal = existing.tardia;
} else if (existing.tardiaPautada && existing.tardiaPautada.requerida) {
  tardiaVal = existing.tardiaPautada.zona || 'pelvis_tardia';
}
setRadioOption('tardia', tardiaVal);
if (elements.txtTardiaInstructions) {
  elements.txtTardiaInstructions.value = existing.tardiaInstructions || (existing.tardiaPautada ? existing.tardiaPautada.indicaciones : '') || '';
}


    if (existing.doctorSign && elements.selectDoctorSign) {
      elements.selectDoctorSign.value = existing.doctorSign;
    }
    if (elements.displaySignTimestamp) {
      elements.displaySignTimestamp.value = existing.timestamp || formatCurrentDateTime();
    }

    // Abrir backdrop
    if (elements.protocolModalBackdrop) {
      elements.protocolModalBackdrop.classList.add('open');
    }
    document.body.style.overflow = 'hidden';

    // Resetear posición de scroll y pestaña activa a sección 1 (Full Body y Brazos)
    const modalBody = document.getElementById('protocolModalBody');
    if (modalBody) modalBody.scrollTop = 0;
    updateActiveNavTab('sectionArmsRange');
  } catch (err) {
    console.error('Error al abrir modal de protocolo:', err);
  }
  }

  function closeProtocolModal() {
    elements.protocolModalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
    state.selectedPatient = null;
    state.editingProtocol = null;
  }

  /**
   * Genera recomendaciones clínicas automáticas basadas en trazador y patología
   */
  function getSmartDefaultProtocol(p) {
    const diag = String(p.diagnostico || '').toLowerCase();
    const tracer = String(p.radiofarmaco || '').toLowerCase();

    let defUptake = '60';
    let defArms = 'arriba';
    let defVascular = 'no';
    let defRange = 'base_craneo_muslos';
    let defHydration = 'box_si';
    let defDiuretic = 'no';
    let defContrastType = 'sin_contraste';
    let defContrastBoxMinutes = 15;
    let doctorNotes = '';

    if (diag.includes('vasculitis') || diag.includes('injerto vascular') || diag.includes('fase vascular')) {
      defVascular = 'si';
    }

    // Cabeza y Cuello / Otorrino / Cavum -> Cabeza-Cuello + Cuerpo Entero con Brazos Abajo
    if (diag.includes('cabeza') || diag.includes('cuello') || diag.includes('laringe') || diag.includes('cavum') || diag.includes('lengua') || diag.includes('amigdala')) {
      defArms = 'abajo';
      defRange = 'cabeza_cuello_cuerpo';
      doctorNotes += 'Protocolo Cabeza y Cuello + Cuerpo Entero: Adquisición combinada en 2 fases con brazos abajo en 1ª fase para evitar artefactos en cadenas ganglionares. ';
    }

    // MMII / Miembros inferiores / extremidades
    if (diag.includes('mmii') || diag.includes('pierna') || diag.includes('pie') || diag.includes('femur') || diag.includes('tibia')) {
      defRange = 'mmii';
      defArms = 'almohada';
      doctorNotes += 'Protocolo MMII: Adquisición dedicada a extremidades inferiores con brazos en almohada. ';
    }

    // Próstata (PSMA o Colina) -> Uptake 45m, Furosemida 20mg IV post-inyección, Hidratación en box
    if (tracer.includes('psma') || tracer.includes('colina') || diag.includes('prostata')) {
      defUptake = '45';
      defDiuretic = 'si_20mg_post';
      defHydration = 'box_si';
      doctorNotes += 'Protocolo prostático: Administrar 20 mg Furosemida IV post-inyección. Vaciar vejiga justo antes de camilla. ';
    }

    // Melanoma o Sarcomas -> Cuerpo total extendido (vértice a pies)
    if (diag.includes('melanoma') || diag.includes('sarcoma') || diag.includes('mieloma')) {
      defRange = 'cuerpo_total';
      doctorNotes += 'Protocolo Cuerpo Total extendido (vértice craneal hasta plantas de los pies). ';
    }

    // Carcinomatosis peritoneal -> Contraste IV en Box 15 min antes
    if (diag.includes('carcinomatosis') || diag.includes('peritone') || diag.includes('ovario') || diag.includes('colon')) {
      defContrastType = 'en_box';
      defContrastBoxMinutes = 15;
      doctorNotes += 'Contraste IV en box 15 min antes de la prueba. ';
    }

    // Endocarditis / Infección -> 90 min uptake
    if (diag.includes('endocarditis') || diag.includes('infeccion') || diag.includes('vasculitis')) {
      defUptake = '90';
      doctorNotes += 'Protocolo inflamatorio/infeccioso: 90 min de captación para aclaramiento de pool vascular. ';
    }

    // Si tiene indicación de contraste intravenoso diagnóstico en PET CT
    if (diag.includes('hepato') || diag.includes('pancreas') || diag.includes('recidiva vascular')) {
      defContrastType = 'en_maquina';
      doctorNotes += 'Contraste iodado en máquina (fase portal en gantry). ';
    }

    // Contraindicación contraste
    if (p.contraindicacionContraste === 'Sí' || (p.alergia && p.alergia.toLowerCase().includes('yodo'))) {
      defContrastType = 'sin_contraste';
      doctorNotes += 'Contraindicación formal para contraste iodado IV (Alergia conocida / FG < 30). Solo Low-Dose CT en camilla. ';
    }

    return {
      uptakeTime: defUptake,
      armsPosition: defArms,
      vascularPhase: defVascular,
      scanRange: defRange,
      customRangeDetails: '',
      hydration: defHydration,
      diuretic: defDiuretic,
      contrastType: defContrastType,
      contrastBoxMinutes: defContrastBoxMinutes,
      // Retrocompatibilidad con vistas previas y hojas TSID
      contrast: defContrastType === 'en_maquina' ? 'civ_portal' : (defContrastType === 'en_box' ? 'oral_gastrografin_15min' : 'baja_dosis'),
      contrastGantry: defContrastType === 'en_maquina' ? 'civ_portal' : 'baja_dosis',
      contrastPre: defContrastType === 'en_box' ? 'oral_gastrografin' : 'sin_oral',
      contrastPreMinutes: defContrastBoxMinutes,
      doctorNotes: doctorNotes.trim(),
      doctorSign: 'Dr. Manuel Gómez Feijóo (Col. 36/08421)',
      timestamp: formatCurrentDateTime()
    };
  }

  function saveProtocolFromModal() {
    if (!state.selectedPatient) return;

    let uptake = getSelectedRadioValue('radioUptake') || '60';
    const customUptake = elements.inputCustomUptake ? elements.inputCustomUptake.value.trim() : '';
    if (customUptake && parseInt(customUptake, 10) > 0) {
      uptake = customUptake;
    }

    const arms = getSelectedRadioValue('radioArms') || 'arriba';
    const vascularPhase = getSelectedRadioValue('radioVascular') || 'no';
    const range = getSelectedRadioValue('radioRange') || 'base_craneo_muslos';
    const selFrom = document.getElementById('selectProtoFrom');
    const selTo = document.getElementById('selectProtoTo');
    const scanFrom = selFrom ? selFrom.value : 'base_craneo';
    const scanTo = selTo ? selTo.value : 'tercio_medio_muslos';
    const scanFromLabel = (selFrom && selFrom.options[selFrom.selectedIndex]) ? selFrom.options[selFrom.selectedIndex].text.replace(/\s*\(\d+\s*cm\)/, '') : 'Base de Cráneo';
    const scanToLabel = (selTo && selTo.options[selTo.selectedIndex]) ? selTo.options[selTo.selectedIndex].text.replace(/\s*\(\d+\s*cm\)/, '') : 'Tercio Medio de Muslos';
    const scanStartCm = Math.max(0, Math.round((protoFullBodyState.topY - 45) / 2.75));
    const scanEndCm = Math.max(scanStartCm + 15, Math.round((protoFullBodyState.bottomY - 45) / 2.75));
    const scanNumBeds = Math.max(1, Math.min(10, Math.round((protoFullBodyState.bottomY - protoFullBodyState.topY) / 48)));
    const autoRangeSummary = `Desde ${scanFromLabel} hasta ${scanToLabel} (${scanStartCm}-${scanEndCm} cm · ${scanNumBeds} camas)`;
    const customRangeDetails = (elements.inputCustomRange && elements.inputCustomRange.value.trim()) ? elements.inputCustomRange.value.trim() : autoRangeSummary;
    const hydration = getSelectedRadioValue('radioHydration') || 'box_si';

    // Diurético (Solo post-inyección o no diurético)
    const diuretic = getSelectedRadioValue('radioDiuretic') || 'no';

    // Contraste: en máquina, IV en box con minutos o sin contraste
    const contrastType = getSelectedRadioValue('radioContrast') || 'sin_contraste';
    const contrastBoxMinutes = elements.inputContrastBoxMinutes ? (parseInt(elements.inputContrastBoxMinutes.value, 10) || 15) : 15;

const tardia = getSelectedRadioValue('radioTardia') || 'no';
const tardiaInstructions = elements.txtTardiaInstructions ? elements.txtTardiaInstructions.value.trim() : '';

const doctorSign = elements.selectDoctorSign ? elements.selectDoctorSign.value : 'Dr. Manuel Gómez Feijóo (Col. 36/08421)';

    const notes = elements.txtDoctorNotes ? elements.txtDoctorNotes.value.trim() : '';
    const timestamp = formatCurrentDateTime();

    const protocolObj = {
      completed: true,
      patientId: state.selectedPatient.id,
      patientNHC: state.selectedPatient.nhc,
      patientName: state.selectedPatient.nombre,
      uptakeTime: uptake,
      armsPosition: arms,
      vascularPhase: vascularPhase,
      scanRange: range,
      scanFrom: scanFrom,
      scanTo: scanTo,
      scanFromLabel: scanFromLabel,
      scanToLabel: scanToLabel,
      scanStartCm: scanStartCm,
      scanEndCm: scanEndCm,
      scanBoxTop: protoFullBodyState.topY,
      scanBoxBottom: protoFullBodyState.bottomY,
      scanNumBeds: scanNumBeds,
      customRangeDetails: customRangeDetails,
      hydration: hydration,
      diuretic: diuretic,
      contrastType: contrastType,
      contrastBoxMinutes: contrastBoxMinutes,
      // Retrocompatibilidad con otros módulos y sistemas
      contrast: contrastType === 'en_maquina' ? 'civ_portal' : (contrastType === 'en_box' ? 'oral_gastrografin_15min' : 'baja_dosis'),
      contrastGantry: contrastType === 'en_maquina' ? 'civ_portal' : 'baja_dosis',
      contrastPre: contrastType === 'en_box' ? 'oral_gastrografin' : 'sin_oral',
      contrastPreMinutes: contrastBoxMinutes,
      doctorNotes: notes,
      doctorSign: doctorSign,
      doctorName: doctorSign.split('(')[0].trim(),
  tardia: tardia,
  tardiaInstructions: tardiaInstructions,
  timestamp: timestamp
};

if (tardia !== 'no') {
  const zoneNames = {
    pelvis_tardia: 'Pelvis / Vejiga / Próstata',
    higado_tardia: 'Hígado / Abdomen Superior',
    torax_tardia: 'Tórax / Mediastino / Cardíaca',
    cabeza_cuello_tardia: 'Cabeza y Cuello / Ganglionar',
    extremidades_tardia: 'Extremidades / Partes Blandas'
  };
  const prevTardia = state.selectedPatient.tardiaPautada;
  const presetInfo = TARDIA_ZONE_PRESETS[tardia] || TARDIA_ZONE_PRESETS.pelvis_tardia;
  const boxTopVal = (prevTardia && prevTardia.zona === tardia && typeof prevTardia.boxTop === 'number') ? prevTardia.boxTop : presetInfo.boxTop;
  const boxHeightVal = (prevTardia && prevTardia.zona === tardia && typeof prevTardia.boxHeight === 'number') ? prevTardia.boxHeight : presetInfo.boxHeight;
  const startCmVal = Math.max(0, Math.round((boxTopVal - 50) / 2.75));
  const endCmVal = Math.max(startCmVal + 15, Math.round((boxTopVal + boxHeightVal - 50) / 2.75));
  const numCamasVal = Math.max(1, Math.min(4, Math.round(boxHeightVal / 70)));

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  protocolObj.tardiaPautada = {
    requerida: true,
    zona: tardia,
    zonaNombre: `${zoneNames[tardia] || 'Pelvis / Vejiga'} (Z: ${startCmVal}-${endCmVal} cm)`,
    numCamas: numCamasVal,
    boxTop: boxTopVal,
    boxHeight: boxHeightVal,
    startCm: startCmVal,
    endCm: endCmVal,
    minutosEspera: (prevTardia && prevTardia.minutosEspera) || '20',
    indicaciones: tardiaInstructions || presetInfo.defaultInst || 'Foco tardío según protocolo.',
    medico: doctorSign.split('(')[0].trim(),
    horaOrden: timeStr,
    timestamp: Date.now()
  };
  state.selectedPatient.tardiaPautada = protocolObj.tardiaPautada;
} else {
  protocolObj.tardiaPautada = null;
  state.selectedPatient.tardiaPautada = null;
}


    state.protocols[state.selectedPatient.id] = protocolObj;
state.protocols[state.selectedPatient.nhc] = protocolObj;
state.selectedPatient.protocoloMedico = protocolObj;

// Si el paciente estaba marcado como No Triable, al protocolizarlo queda resuelto
if (state.selectedPatient.noTriable) {
  state.selectedPatient.noTriable = false;
  state.selectedPatient.estadoTriaje = 'Cita Asignada';
  if (state.selectedPatient.raw) {
    state.selectedPatient.raw.noTriable = false;
    state.selectedPatient.raw["Estado de Triaje"] = 'Cita Asignada';
  }
}

try {
  const storedMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
  if (protocolObj.tardiaPautada) {
    storedMap[state.selectedPatient.id] = protocolObj.tardiaPautada;
    if (state.selectedPatient.nhc) storedMap[state.selectedPatient.nhc] = protocolObj.tardiaPautada;
  } else {
    delete storedMap[state.selectedPatient.id];
    if (state.selectedPatient.nhc) delete storedMap[state.selectedPatient.nhc];
  }
  localStorage.setItem('PET_SHARED_LATE_SCAN_ORDERS_V1', JSON.stringify(storedMap));

  const tsidList = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
  tsidList.forEach(tp => {
    if (tp.id === state.selectedPatient.id || tp.nhc === state.selectedPatient.nhc) {
      tp.tardiaPautada = protocolObj.tardiaPautada;
      if (protocolObj.tardiaPautada) {
        tp.presetCajaCampos = protocolObj.tardiaPautada.zona;
      }
    }
  });
  localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(tsidList));
} catch(e) {}

saveStoredProtocols();


    // Notificar en tiempo real por BroadcastChannel a la Consola Técnica y Enfermería
    if (petClinicalBroadcast) {
      petClinicalBroadcast.postMessage({
        type: 'MEDICAL_PROTOCOL_UPDATED',
        patientId: state.selectedPatient.id,
        nhc: state.selectedPatient.nhc,
        nombre: state.selectedPatient.nombre,
        protocoloMedico: protocolObj,
        timestamp: Date.now()
      });
    }

    showToast(`✅ Protocolo médico validado para ${state.selectedPatient.nombre}`, 'success');
    closeProtocolModal();
    render();
  }

  // ==========================================================================
  // MODAL DEL VOLANTE DE PETICIÓN
  // ==========================================================================

// ==========================================================================
// MODAL RÁPIDO PARA INDICAR TARDÍA EN DIRECTO (CON IMAGEN DE PACIENTE Y CAJA ARRASTRABLE)
// ==========================================================================
const TARDIA_ZONE_PRESETS = {
  cabeza_cuello_tardia: {
    boxTop: 40,
    boxHeight: 110,
    shortLabel: 'CABEZA Y CUELLO',
    badgeText: '🎯 Cabeza y Cuello',
    title: 'Cabeza y Cuello / Ganglionar',
    defaultInst: '2 camas cervicales. Posicionar brazos abajo con cincha de confort.'
  },
  torax_tardia: {
    boxTop: 130,
    boxHeight: 140,
    shortLabel: 'TÓRAX / CORAZÓN',
    badgeText: '🎯 Tórax / Mediastino',
    title: 'Tórax / Mediastino / Cardíaca',
    defaultInst: '2 camas torácicas centradas en corazón y mediastino. Estudio tardío endocarditis/nódulo.'
  },
  higado_tardia: {
    boxTop: 195,
    boxHeight: 140,
    shortLabel: 'HÍGADO / ABDOMEN',
    badgeText: '🎯 Hígado / Abdomen',
    title: 'Hígado / Abdomen Superior',
    defaultInst: '2 camas centradas en hipocondrio derecho y epigastrio. Lavado hepatobiliar.'
  },
  pelvis_tardia: {
    boxTop: 290,
    boxHeight: 140,
    shortLabel: 'PELVIS / VEJIGA',
    badgeText: '🎯 Pelvis / Vejiga',
    title: 'Pelvis / Vejiga / Próstata',
    defaultInst: 'Forzar vaciado vesical completo antes de colocar en camilla. Centrar en foco pélvico.'
  },
  extremidades_tardia: {
    boxTop: 420,
    boxHeight: 140,
    shortLabel: 'EXTREMIDADES',
    badgeText: '🎯 Extremidades',
    title: 'Extremidades / Partes Blandas',
    defaultInst: '2 camas en extremidades inferiores centradas en la lesión osteomuscular.'
  }
};

const tardiaBoxState = {
  boxTop: 290,
  boxHeight: 140,
  activeZone: 'pelvis_tardia',
  isCustomPosition: false,
  dragBound: false
};

function detectTardiaZoneFromCenterY(centerY) {
  if (centerY < 130) return 'cabeza_cuello_tardia';
  if (centerY < 215) return 'torax_tardia';
  if (centerY < 305) return 'higado_tardia';
  if (centerY < 425) return 'pelvis_tardia';
  return 'extremidades_tardia';
}

function renderTardiaDraggableBox() {
  const top = Math.max(32, Math.min(585 - tardiaBoxState.boxHeight, Math.round(tardiaBoxState.boxTop)));
  const height = Math.max(70, Math.min(300, Math.round(tardiaBoxState.boxHeight)));
  tardiaBoxState.boxTop = top;
  tardiaBoxState.boxHeight = height;

  const midY = Math.round(top + height / 2);
  const bot = top + height;
  const preset = TARDIA_ZONE_PRESETS[tardiaBoxState.activeZone] || TARDIA_ZONE_PRESETS.pelvis_tardia;

  const rect = document.getElementById('tardiaBoxRect');
  if (rect) {
    rect.setAttribute('y', String(top));
    rect.setAttribute('height', String(height));
  }

  const midLine = document.getElementById('tardiaBoxMidLine');
  if (midLine) {
    midLine.setAttribute('y1', String(midY));
    midLine.setAttribute('y2', String(midY));
  }

  const bed1Text = document.getElementById('tardiaBoxBed1Text');
  if (bed1Text) {
    bed1Text.setAttribute('y', String(top + 18));
  }

  const bed2Text = document.getElementById('tardiaBoxBed2Text');
  if (bed2Text) {
    bed2Text.setAttribute('y', String(midY + 18));
  }

  const laserLine = document.getElementById('tardiaBoxLaserLine');
  if (laserLine) {
    laserLine.setAttribute('y1', String(midY));
    laserLine.setAttribute('y2', String(midY));
  }

  const laserDot = document.getElementById('tardiaBoxLaserDot');
  if (laserDot) {
    laserDot.setAttribute('cy', String(midY));
  }

  const cornerTL = document.getElementById('tardiaCornerTL');
  if (cornerTL) cornerTL.setAttribute('d', `M 54 ${top + 16} L 54 ${top - 4} L 74 ${top - 4}`);
  const cornerTR = document.getElementById('tardiaCornerTR');
  if (cornerTR) cornerTR.setAttribute('d', `M 330 ${top + 16} L 330 ${top - 4} L 310 ${top - 4}`);
  const cornerBL = document.getElementById('tardiaCornerBL');
  if (cornerBL) cornerBL.setAttribute('d', `M 54 ${bot - 16} L 54 ${bot + 4} L 74 ${bot + 4}`);
  const cornerBR = document.getElementById('tardiaCornerBR');
  if (cornerBR) cornerBR.setAttribute('d', `M 330 ${bot - 16} L 330 ${bot + 4} L 310 ${bot + 4}`);

  const dragPill = document.getElementById('tardiaBoxDragPill');
  if (dragPill) {
    dragPill.setAttribute('transform', `translate(195, ${midY})`);
  }

  const centerLabel = document.getElementById('tardiaBoxCenterLabel');
  if (centerLabel) {
    centerLabel.textContent = `✥ CAJA: ${preset.shortLabel}`;
  }

  const handleTop = document.getElementById('tardiaBoxHandleTop');
  if (handleTop) {
    const hRect = handleTop.querySelector('rect');
    const hLine = handleTop.querySelector('line');
    if (hRect) hRect.setAttribute('y', String(top - 8));
    if (hLine) {
      hLine.setAttribute('y1', String(top - 1));
      hLine.setAttribute('y2', String(top - 1));
    }
  }

  const handleBottom = document.getElementById('tardiaBoxHandleBottom');
  if (handleBottom) {
    const bRect = handleBottom.querySelector('rect');
    const bLine = handleBottom.querySelector('line');
    if (bRect) bRect.setAttribute('y', String(bot - 6));
    if (bLine) {
      bLine.setAttribute('y1', String(bot + 1));
      bLine.setAttribute('y2', String(bot + 1));
    }
  }

  const startCm = Math.max(0, Math.round((top - 50) / 2.75));
  const endCm = Math.max(startCm + 15, Math.round((bot - 50) / 2.75));
  const numBeds = Math.max(1, Math.min(4, Math.round(height / 70)));

  const readoutZ = document.getElementById('tardiaReadoutZ');
  if (readoutZ) readoutZ.textContent = `${startCm} cm – ${endCm} cm`;

  const readoutBeds = document.getElementById('tardiaReadoutBeds');
  if (readoutBeds) readoutBeds.textContent = `${numBeds} ${numBeds === 1 ? 'Cama' : 'Camas'}`;

  const liveBadge = document.getElementById('tardiaLiveZoneBadge');
  if (liveBadge) {
    liveBadge.textContent = `${preset.badgeText} (${startCm}-${endCm}cm)`;
  }
}

function setTardiaBoxPreset(zoneKey, updateInstructions) {
  const preset = TARDIA_ZONE_PRESETS[zoneKey] || TARDIA_ZONE_PRESETS.pelvis_tardia;
  tardiaBoxState.activeZone = zoneKey in TARDIA_ZONE_PRESETS ? zoneKey : 'pelvis_tardia';
  tardiaBoxState.boxTop = preset.boxTop;
  tardiaBoxState.boxHeight = preset.boxHeight;
  tardiaBoxState.isCustomPosition = false;

  setQuickTardiaRadio(tardiaBoxState.activeZone);
  renderTardiaDraggableBox();

  if (updateInstructions) {
    const inputInst = document.getElementById('inputQuickTardiaInstructions');
    if (inputInst) {
      inputInst.value = preset.defaultInst;
    }
  }
}

function setupTardiaPatientBoxDrag() {
  if (tardiaBoxState.dragBound) return;
  const svg = document.getElementById('tardiaPatientSvg');
  const boxGroup = document.getElementById('tardiaDraggableBoxGroup');
  const handleTop = document.getElementById('tardiaBoxHandleTop');
  const handleBottom = document.getElementById('tardiaBoxHandleBottom');
  const silhouette = document.getElementById('tardiaHumanSilhouette');
  if (!svg || !boxGroup) return;

  tardiaBoxState.dragBound = true;

  let dragMode = null; // 'move' | 'resize-top' | 'resize-bottom'
  let startSvgY = 0;
  let initialTop = 0;
  let initialHeight = 0;

  function clientYToSvgY(clientY) {
    const rect = svg.getBoundingClientRect();
    if (!rect.height) return 300;
    return ((clientY - rect.top) / rect.height) * 620;
  }

  function syncZoneFromCurrentBox() {
    const centerY = tardiaBoxState.boxTop + tardiaBoxState.boxHeight / 2;
    const detected = detectTardiaZoneFromCenterY(centerY);
    if (detected !== tardiaBoxState.activeZone) {
      tardiaBoxState.activeZone = detected;
      setQuickTardiaRadio(detected);
      const preset = TARDIA_ZONE_PRESETS[detected];
      const inputInst = document.getElementById('inputQuickTardiaInstructions');
      if (inputInst && preset) {
        const startCm = Math.max(0, Math.round((tardiaBoxState.boxTop - 50) / 2.75));
        const endCm = Math.max(startCm + 15, Math.round((tardiaBoxState.boxTop + tardiaBoxState.boxHeight - 50) / 2.75));
        inputInst.value = `${preset.defaultInst} (Caja en Z: ${startCm}-${endCm} cm).`;
      }
    } else {
      const preset = TARDIA_ZONE_PRESETS[tardiaBoxState.activeZone];
      const inputInst = document.getElementById('inputQuickTardiaInstructions');
      if (inputInst && preset && tardiaBoxState.isCustomPosition) {
        const startCm = Math.max(0, Math.round((tardiaBoxState.boxTop - 50) / 2.75));
        const endCm = Math.max(startCm + 15, Math.round((tardiaBoxState.boxTop + tardiaBoxState.boxHeight - 50) / 2.75));
        const baseInst = preset.defaultInst.replace(/\s*\(Caja en Z:.*$/, '');
        inputInst.value = `${baseInst} (Caja en Z: ${startCm}-${endCm} cm).`;
      }
    }
  }

  function onPointerDown(e, mode) {
    e.preventDefault();
    e.stopPropagation();
    dragMode = mode;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    startSvgY = clientYToSvgY(clientY);
    initialTop = tardiaBoxState.boxTop;
    initialHeight = tardiaBoxState.boxHeight;
    tardiaBoxState.isCustomPosition = true;
    boxGroup.style.cursor = mode === 'move' ? 'grabbing' : 'ns-resize';
  }

  if (handleTop) {
    handleTop.addEventListener('mousedown', (e) => onPointerDown(e, 'resize-top'));
    handleTop.addEventListener('touchstart', (e) => onPointerDown(e, 'resize-top'), { passive: false });
  }
  if (handleBottom) {
    handleBottom.addEventListener('mousedown', (e) => onPointerDown(e, 'resize-bottom'));
    handleBottom.addEventListener('touchstart', (e) => onPointerDown(e, 'resize-bottom'), { passive: false });
  }

  boxGroup.addEventListener('mousedown', (e) => {
    if (handleTop && handleTop.contains(e.target)) return;
    if (handleBottom && handleBottom.contains(e.target)) return;
    onPointerDown(e, 'move');
  });
  boxGroup.addEventListener('touchstart', (e) => {
    if (handleTop && handleTop.contains(e.target)) return;
    if (handleBottom && handleBottom.contains(e.target)) return;
    onPointerDown(e, 'move');
  }, { passive: false });

  // Si hace clic en cualquier parte de la silueta del paciente, centrar la caja ahí y permitir arrastrar
  if (silhouette) {
    const onSilhouetteDown = (e) => {
      e.preventDefault();
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const clickY = clientYToSvgY(clientY);
      tardiaBoxState.boxTop = Math.max(32, Math.min(585 - tardiaBoxState.boxHeight, clickY - tardiaBoxState.boxHeight / 2));
      tardiaBoxState.isCustomPosition = true;
      syncZoneFromCurrentBox();
      renderTardiaDraggableBox();
      onPointerDown(e, 'move');
    };
    silhouette.addEventListener('mousedown', onSilhouetteDown);
    silhouette.addEventListener('touchstart', onSilhouetteDown, { passive: false });
  }

  function onPointerMove(e) {
    if (!dragMode) return;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const currentSvgY = clientYToSvgY(clientY);
    const deltaY = currentSvgY - startSvgY;

    if (dragMode === 'move') {
      tardiaBoxState.boxTop = Math.max(32, Math.min(585 - initialHeight, initialTop + deltaY));
    } else if (dragMode === 'resize-top') {
      const bottomEdge = initialTop + initialHeight;
      const newTop = Math.max(32, Math.min(bottomEdge - 70, initialTop + deltaY));
      tardiaBoxState.boxTop = newTop;
      tardiaBoxState.boxHeight = Math.min(300, bottomEdge - newTop);
    } else if (dragMode === 'resize-bottom') {
      const newHeight = Math.max(70, Math.min(300, Math.min(585 - initialTop, initialHeight + deltaY)));
      tardiaBoxState.boxHeight = newHeight;
    }

    syncZoneFromCurrentBox();
    renderTardiaDraggableBox();
  }

  function onPointerUp() {
    if (!dragMode) return;
    dragMode = null;
    boxGroup.style.cursor = 'grab';
  }

  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('mouseup', onPointerUp);
  window.addEventListener('touchend', onPointerUp);
}

function openTardiaVisualFromProtocol() {
  if (!state.selectedPatient) return;
  const patId = state.selectedPatient.id;
  openModalPedirTardia(patId);
}

function openModalPedirTardia(patientId) {
  let patient = state.allPatients.find(p => String(p.id) === String(patientId) || String(p.nhc) === String(patientId));
  if (!patient && state.filteredPatients && state.filteredPatients.length > 0) {
    patient = state.filteredPatients.find(p => String(p.id) === String(patientId) || String(p.nhc) === String(patientId)) || state.filteredPatients[0];
  }
  if (!patient) return;

  state.tardiaTargetPatient = patient;
  try {
    const strip = document.getElementById('tardiaModalPatientStrip');
    if (strip) {
      strip.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:10px 14px;">
          <div>
            <strong style="color:#0f172a; font-size:1.05rem;">${patient.nombre}</strong>
            <span style="margin-left:8px; font-family:'JetBrains Mono',monospace; color:#b45309; font-weight:700;">${patient.nhc}</span>
            <span style="margin-left:8px; font-size:0.8rem; color:#64748b;">${patient.edad}a · ${patient.sexo} (${patient.peso}kg)</span>
          </div>
          <div style="display:flex; gap:6px; align-items:center;">
            <span style="font-size:0.75rem; background:#fef3c7; color:#92400e; padding:3px 8px; border-radius:4px; font-weight:800; border:1px solid #fde68a;">
              ${patient.radiofarmaco}
            </span>
            <span style="font-size:0.75rem; color:#475569;">Cita: <strong>${patient.horaCita}</strong></span>
          </div>
        </div>
      `;
    }

    let existingTardia = patient.tardiaPautada;
    if (!existingTardia) {
      try {
        const storedMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
        existingTardia = storedMap[patient.id] || storedMap[patient.nhc];
      } catch(e) {}
    }

    const btnCancel = document.getElementById('btnCancelTardiaOrder');
    const inputInst = document.getElementById('inputQuickTardiaInstructions');
    const selectWait = document.getElementById('selectQuickTardiaWaitTime');

    setupQuickTardiaCardListeners();
    setupTardiaPatientBoxDrag();

    const inlineSelect = document.getElementById(`quickZoneSelect_${patient.id}`);
    const defaultZone = inlineSelect ? inlineSelect.value : getRecommendedDefaultTardiaZone(patient);

    if (existingTardia && existingTardia.requerida) {
      if (btnCancel) btnCancel.style.display = 'inline-block';
      const zKey = existingTardia.zona || 'pelvis_tardia';
      setTardiaBoxPreset(zKey, false);
      if (typeof existingTardia.boxTop === 'number' && typeof existingTardia.boxHeight === 'number') {
        tardiaBoxState.boxTop = existingTardia.boxTop;
        tardiaBoxState.boxHeight = existingTardia.boxHeight;
        tardiaBoxState.isCustomPosition = Boolean(existingTardia.isCustomPosition);
        renderTardiaDraggableBox();
      }
      if (inputInst) inputInst.value = existingTardia.indicaciones || '';
      if (selectWait && existingTardia.minutosEspera) selectWait.value = String(existingTardia.minutosEspera);
    } else {
      if (btnCancel) btnCancel.style.display = 'none';
      setTardiaBoxPreset(defaultZone || 'pelvis_tardia', true);
      if (selectWait) selectWait.value = '20';
    }
  } catch (err) {
    console.error('Error preparando modal de tardía:', err);
  }

  const modal = document.getElementById('tardiaModalBackdrop');
  if (modal) {
    modal.style.display = 'flex';
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'auto';
    modal.style.zIndex = '10000';
    modal.classList.add('open');
  }
  document.body.style.overflow = 'hidden';
}

function setupQuickTardiaCardListeners() {
  const cards = document.querySelectorAll('#quickTardiaZonesGrid .tardia-zone-card');
  cards.forEach(card => {
    card.onclick = () => {
      const radio = card.querySelector('input[type="radio"]');
      const zoneVal = (radio && radio.value) || card.dataset.zone || 'pelvis_tardia';
      setTardiaBoxPreset(zoneVal, true);
    };
  });
}

function setQuickTardiaRadio(val) {
  const cards = document.querySelectorAll('#quickTardiaZonesGrid .tardia-zone-card');
  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    if (radio && radio.value === val) {
      card.classList.add('selected');
      radio.checked = true;
    } else {
      card.classList.remove('selected');
      if (radio) radio.checked = false;
    }
  });
}

function closeModalPedirTardia() {
  const modal = document.getElementById('tardiaModalBackdrop');
  if (modal) {
    modal.classList.remove('open');
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modal.style.display = 'none';
  }
  if (!elements.protocolModalBackdrop || !elements.protocolModalBackdrop.classList.contains('open')) {
    document.body.style.overflow = '';
  }
  state.tardiaTargetPatient = null;
}

function guardarPautaTardia() {
  const patient = state.tardiaTargetPatient;
  if (!patient) return;

  const selectedRadio = document.querySelector('input[name="quickTardiaZone"]:checked');
  const zoneKey = selectedRadio ? selectedRadio.value : (tardiaBoxState.activeZone || 'pelvis_tardia');
  const selectWait = document.getElementById('selectQuickTardiaWaitTime');
  const inputInst = document.getElementById('inputQuickTardiaInstructions');
  const waitVal = selectWait ? selectWait.value : '20';
  const instVal = inputInst ? inputInst.value.trim() : '';

  const zoneNames = {
    pelvis_tardia: 'Pelvis / Vejiga / Próstata',
    higado_tardia: 'Hígado / Abdomen Superior',
    torax_tardia: 'Tórax / Mediastino / Cardíaca',
    cabeza_cuello_tardia: 'Cabeza y Cuello / Ganglionar',
    extremidades_tardia: 'Extremidades / Partes Blandas'
  };

  const startCm = Math.max(0, Math.round((tardiaBoxState.boxTop - 50) / 2.75));
  const endCm = Math.max(startCm + 15, Math.round((tardiaBoxState.boxTop + tardiaBoxState.boxHeight - 50) / 2.75));
  const numCamas = Math.max(1, Math.min(4, Math.round(tardiaBoxState.boxHeight / 70)));

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const tardiaPautada = {
    requerida: true,
    zona: zoneKey,
    zonaNombre: `${zoneNames[zoneKey] || 'Pelvis / Vejiga'} (Z: ${startCm}-${endCm} cm)`,
    numCamas: numCamas,
    boxTop: tardiaBoxState.boxTop,
    boxHeight: tardiaBoxState.boxHeight,
    startCm: startCm,
    endCm: endCm,
    isCustomPosition: tardiaBoxState.isCustomPosition,
    minutosEspera: waitVal,
    indicaciones: instVal,
    medico: 'Dr. Manuel Gómez Feijóo',
    horaOrden: timeStr,
    timestamp: Date.now()
  };

  patient.tardiaPautada = tardiaPautada;
  if (!patient.protocoloMedico) {
    patient.protocoloMedico = getSmartDefaultProtocol(patient);
  }
  patient.protocoloMedico.tardia = zoneKey;
  patient.protocoloMedico.tardiaInstructions = instVal;
  patient.protocoloMedico.tardiaPautada = tardiaPautada;

  // Si el modal de protocolo completo estaba abierto para este paciente, sincronizar también sus radios
  if (state.selectedPatient && state.selectedPatient.id === patient.id) {
    setRadioOption('tardia', zoneKey);
    if (elements.txtTardiaInstructions) {
      elements.txtTardiaInstructions.value = instVal;
    }
  }

  try {
    const storedMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
    storedMap[patient.id] = tardiaPautada;
    if (patient.nhc) storedMap[patient.nhc] = tardiaPautada;
    localStorage.setItem('PET_SHARED_LATE_SCAN_ORDERS_V1', JSON.stringify(storedMap));

    const tsidList = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
    tsidList.forEach(tp => {
      if (tp.id === patient.id || tp.nhc === patient.nhc) {
        tp.tardiaPautada = tardiaPautada;
        tp.presetCajaCampos = zoneKey;
      }
    });
    localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(tsidList));
  } catch(e) {}

  saveStoredProtocols();

  if (petClinicalBroadcast) {
    petClinicalBroadcast.postMessage({
      type: 'LATE_SCAN_ORDERED',
      patientId: patient.id,
      nhc: patient.nhc,
      nombre: patient.nombre,
      tardiaPautada: tardiaPautada,
      timestamp: Date.now()
    });
  }

  closeModalPedirTardia();
  showToast(`🕒 Pauta de Tardía (${tardiaPautada.zonaNombre}) enviada a Técnicos para ${patient.nombre}`, 'warning');
  render();
}

function anularPautaTardia() {
  const patient = state.tardiaTargetPatient;
  if (!patient) return;

  const confirmed = confirm(`¿Anular la orden de adquisición tardía para ${patient.nombre}?`);
  if (!confirmed) return;

  patient.tardiaPautada = null;
  if (patient.protocoloMedico) {
    patient.protocoloMedico.tardia = 'no';
    patient.protocoloMedico.tardiaPautada = null;
  }

  try {
    const storedMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
    delete storedMap[patient.id];
    if (patient.nhc) delete storedMap[patient.nhc];
    localStorage.setItem('PET_SHARED_LATE_SCAN_ORDERS_V1', JSON.stringify(storedMap));

    const tsidList = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
    tsidList.forEach(tp => {
      if (tp.id === patient.id || tp.nhc === patient.nhc) {
        tp.tardiaPautada = null;
      }
    });
    localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(tsidList));
  } catch(e) {}

  saveStoredProtocols();

  if (petClinicalBroadcast) {
    petClinicalBroadcast.postMessage({
      type: 'LATE_SCAN_CANCELLED',
      patientId: patient.id,
      nhc: patient.nhc,
      nombre: patient.nombre,
      timestamp: Date.now()
    });
  }

  closeModalPedirTardia();
  showToast(`Orden de tardía anulada para ${patient.nombre}`, 'info');
  render();
}


  function openVolanteModal(patientId) {
    const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
    if (!patient) return;

    state.selectedPatient = patient;
    elements.volanteModalSubtitle.textContent = `Paciente: ${patient.nombre} (${patient.nhc}) · Estudio: ${patient.radiofarmaco}`;

    const volanteHtml = generatePatientVolanteHtml(patient, false);
    elements.volanteIframe.srcdoc = volanteHtml;

    elements.volanteModalBackdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeVolanteModal() {
    elements.volanteModalBackdrop.classList.remove('open');
    document.body.style.overflow = '';
  }

  function printVolanteFromViewer() {
    if (elements.volanteIframe && elements.volanteIframe.contentWindow) {
      elements.volanteIframe.contentWindow.focus();
      elements.volanteIframe.contentWindow.print();
    }
  }

  // ==========================================================================
  // MODAL VISOR DE IMÁGENES SIDI (SISTEMA INTEGRADO DE DIAGNÓSTICO POR IMAXE - SERGAS)
  // ==========================================================================
  function openSidiModal(patientId) {
    const patient = state.allPatients.find(p => p.id === patientId || p.nhc === patientId);
    if (!patient) return;

    state.selectedPatient = patient;
    if (elements.sidiModalSubtitle) {
      elements.sidiModalSubtitle.textContent = `Paciente: ${patient.nombre} (${patient.nhc}) · ${patient.edad} años (${patient.sexo}) · Estudio: ${patient.radiofarmaco}`;
    }

    if (elements.sidiIframe) {
      elements.sidiIframe.srcdoc = generateSidiViewerHtml(patient);
    }

    if (elements.sidiModalBackdrop) {
      elements.sidiModalBackdrop.classList.add('open');
    }
    document.body.style.overflow = 'hidden';
  }

  function closeSidiModal() {
    if (elements.sidiModalBackdrop) {
      elements.sidiModalBackdrop.classList.remove('open');
    }
    document.body.style.overflow = '';
  }

  function launchExternalSidi() {
    const p = state.selectedPatient;
    if (!p) return;
    const nhcClean = String(p.nhc || '').replace(/[^a-zA-Z0-9_-]/g, '');
    showToast(`🖥️ Conectando con estación local SIDI / PACS SERGAS para NHC ${p.nhc} (${p.nombre})...`, 'info');
    // Intento de apertura por protocolo local PACS/SIDI si está instalado o pestaña de visor dedicado
    const win = window.open('', '_blank', 'width=1360,height=900');
    if (win) {
      win.document.open();
      win.document.write(generateSidiViewerHtml(p));
      win.document.close();
      win.focus();
    }
  }

  function generateSidiViewerHtml(p) {
    const raw = p.raw || p;
    const nhc = escapeHTML(p.nhc || 'NHC-000000');
    const nombre = escapeHTML(p.nombre || 'Paciente');
    const edad = escapeHTML(p.edad || 65);
    const sexo = escapeHTML(p.sexo || 'Varón');
    const peso = escapeHTML(p.peso || 72);
    const talla = escapeHTML(p.talla || 170);
    const estudio = escapeHTML(p.radiofarmaco || '18F-FDG PET/CT');
    const diag = escapeHTML(p.diagnostico || 'Estudio Oncológico PET/CT');
    const servicio = escapeHTML(raw["Servicio Solicitante"] || 'Oncología Médica');
    const medicoSol = escapeHTML(raw["Médico Solicitante"] || 'Facultativo SERGAS');
    const fechaCita = escapeHTML(p.fechaCita || 'Hoy');
    const horaCita = escapeHTML(p.horaCita || '08:30 h');
    const accNum = 'SIDI-' + String(p.id || '1001').replace(/\D/g, '').padStart(6, '0');

    // Calcular dosis estimada y SUVmax según patología para realismo clínico
    const dosisMBq = Math.round((parseFloat(p.peso) || 72) * 3.7);
    const diagLower = String(p.diagnostico || '').toLowerCase();
    let lesionLocation = 'Mediastino / Hilio Pulmonar Derecho';
    let lesionCoords = { cx: 132, cy: 138, mipX: 138, mipY: 126 };
    let suvMaxActual = '8.4';
    let suvMaxPrev = '11.2';

    if (diagLower.includes('prostata') || String(p.radiofarmaco).toLowerCase().includes('psma') || String(p.radiofarmaco).toLowerCase().includes('colina')) {
      lesionLocation = 'Lecho Prostático / Cadena Ilíaca Interna';
      lesionCoords = { cx: 150, cy: 156, mipX: 148, mipY: 222 };
      suvMaxActual = '9.6';
      suvMaxPrev = '6.1';
    } else if (diagLower.includes('cabeza') || diagLower.includes('cuello') || diagLower.includes('laringe') || diagLower.includes('cavum')) {
      lesionLocation = 'Región Laterocervical Nivel II-III';
      lesionCoords = { cx: 142, cy: 145, mipX: 144, mipY: 78 };
      suvMaxActual = '7.8';
      suvMaxPrev = '10.4';
    } else if (diagLower.includes('higado') || diagLower.includes('hepato') || diagLower.includes('colon') || diagLower.includes('digestiv')) {
      lesionLocation = 'Parénquima Hepático Segmento VI/VII';
      lesionCoords = { cx: 124, cy: 146, mipX: 128, mipY: 162 };
      suvMaxActual = '6.9';
      suvMaxPrev = '9.1';
    } else if (diagLower.includes('cerebr') || diagLower.includes('demencia') || diagLower.includes('alzheimer') || diagLower.includes('epilepsia')) {
      lesionLocation = 'Corteza Temporoparietal Bilateral';
      lesionCoords = { cx: 150, cy: 140, mipX: 150, mipY: 46 };
      suvMaxActual = '5.2';
      suvMaxPrev = '5.8';
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>SIDI · SERGAS — ${nombre} (${nhc})</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; user-select: none; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #060a12;
      color: #e2e8f0;
      height: 100vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    /* BARRA DE HERRAMIENTAS PACS SIDI */
    .sidi-toolbar {
      background: #0f172a;
      border-bottom: 1px solid #1e293b;
      padding: 8px 14px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .tool-group {
      display: flex;
      align-items: center;
      gap: 6px;
      background: #090d16;
      padding: 4px 8px;
      border-radius: 6px;
      border: 1px solid #1e293b;
    }
    .tool-label {
      font-size: 11px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      margin-right: 4px;
    }
    .tool-btn {
      background: #1e293b;
      color: #cbd5e1;
      border: 1px solid #334155;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      transition: all 0.15s;
    }
    .tool-btn:hover, .tool-btn.active {
      background: #0284c7;
      color: #ffffff;
      border-color: #38bdf8;
    }
    .tool-select {
      background: #1e293b;
      color: #f8fafc;
      border: 1px solid #334155;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11.5px;
      font-weight: 600;
      outline: none;
    }
    .tool-slider {
      width: 95px;
      accent-color: #38bdf8;
      cursor: pointer;
    }
    /* LAYOUT CENTRAL: SIDEBAR DE SERIES + VIEWPORTS DICOM */
    .sidi-workspace {
      flex: 1;
      display: grid;
      grid-template-columns: 270px 1fr 260px;
      min-height: 0;
    }
    .sidi-sidebar {
      background: #0b111e;
      border-right: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 10px;
      gap: 10px;
    }
    .sidi-right-panel {
      background: #0b111e;
      border-left: 1px solid #1e293b;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      padding: 10px;
      gap: 10px;
    }
    .panel-title {
      font-size: 11px;
      font-weight: 800;
      color: #38bdf8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #1e293b;
      padding-bottom: 5px;
      margin-bottom: 4px;
    }
    .series-card {
      background: #111827;
      border: 1.5px solid #1f2937;
      border-radius: 6px;
      padding: 8px 10px;
      cursor: pointer;
      transition: all 0.15s;
    }
    .series-card:hover {
      border-color: #0284c7;
      background: #172554;
    }
    .series-card.active {
      border-color: #38bdf8;
      background: rgba(2, 132, 199, 0.18);
      box-shadow: inset 0 0 0 1px #38bdf8;
    }
    .series-tag {
      display: inline-block;
      font-size: 10px;
      font-weight: 800;
      padding: 1px 5px;
      border-radius: 3px;
      margin-bottom: 3px;
    }
    .tag-pet { background: #dc2626; color: #fff; }
    .tag-ct { background: #0284c7; color: #fff; }
    .tag-prev { background: #475569; color: #fff; }
    .series-name { font-size: 12px; font-weight: 700; color: #f8fafc; }
    .series-meta { font-size: 10.5px; color: #94a3b8; margin-top: 2px; }

    /* GRID 2x2 DE VIEWPORTS DICOM */
    .viewports-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 4px;
      background: #020617;
      padding: 4px;
      min-height: 0;
    }
    .viewports-grid.single-view {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr;
    }
    .viewport {
      position: relative;
      background: #000000;
      border: 1.5px solid #1e293b;
      border-radius: 4px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: crosshair;
    }
    .viewport.active-vp {
      border-color: #38bdf8;
    }
    .dicom-overlay-tl {
      position: absolute;
      top: 8px;
      left: 10px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #38bdf8;
      text-shadow: 0 1px 2px #000;
      pointer-events: none;
    }
    .dicom-overlay-tr {
      position: absolute;
      top: 8px;
      right: 10px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #e2e8f0;
      text-align: right;
      text-shadow: 0 1px 2px #000;
      pointer-events: none;
    }
    .dicom-overlay-bl {
      position: absolute;
      bottom: 8px;
      left: 10px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 11px;
      line-height: 1.35;
      color: #fbbf24;
      text-shadow: 0 1px 2px #000;
      pointer-events: none;
    }
    .dicom-overlay-br {
      position: absolute;
      bottom: 8px;
      right: 10px;
      font-family: "SFMono-Regular", Consolas, monospace;
      font-size: 11px;
      color: #94a3b8;
      text-align: right;
      text-shadow: 0 1px 2px #000;
      pointer-events: none;
    }
    /* ESCALA DE COLOR SUV LATERAL */
    .suv-colorbar {
      position: absolute;
      right: 12px;
      top: 55px;
      bottom: 45px;
      width: 12px;
      border: 1px solid #475569;
      border-radius: 2px;
      background: linear-gradient(to bottom, #ffffff 0%, #fef08a 20%, #f97316 50%, #dc2626 75%, #450a0a 92%, #000000 100%);
    }
    .roi-badge {
      background: rgba(15, 23, 42, 0.85);
      border: 1px solid #f59e0b;
      border-radius: 6px;
      padding: 8px;
      font-size: 11.5px;
    }
    .kv-row {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      padding: 3px 0;
      border-bottom: 1px dashed #1e293b;
    }
    .kv-lbl { color: #94a3b8; }
    .kv-val { color: #f8fafc; font-weight: 700; font-family: monospace; }
  </style>
</head>
<body>
  <!-- BARRA DE CONTROL SUPERIOR SIDI -->
  <div class="sidi-toolbar">
    <div class="tool-group">
      <span class="tool-label">Layout:</span>
      <button class="tool-btn active" id="btnLayout2x2" onclick="setLayout('2x2')">⊞ 2x2 MPR Fusión</button>
      <button class="tool-btn" id="btnLayout1x1" onclick="setLayout('1x1')">⬜ 1x1 Fusión Grande</button>
    </div>

    <div class="tool-group">
      <span class="tool-label">Corte Axial:</span>
      <input type="range" class="tool-slider" id="sliceSlider" min="1" max="240" value="118" oninput="updateSlice(this.value)">
      <span id="sliceLabel" style="font-family:monospace; font-size:11.5px; color:#38bdf8; min-width:55px;">118/240</span>
    </div>

    <div class="tool-group">
      <span class="tool-label">Fusión PET/CT:</span>
      <input type="range" class="tool-slider" id="fusionSlider" min="0" max="100" value="65" oninput="updateFusion(this.value)">
      <span id="fusionLabel" style="font-family:monospace; font-size:11.5px; color:#fbbf24; min-width:36px;">65%</span>
    </div>

    <div class="tool-group">
      <span class="tool-label">LUT PET:</span>
      <select class="tool-select" id="selectLut" onchange="updateLut(this.value)">
        <option value="hotiron">🔥 Hot Iron (Fusión SERGAS)</option>
        <option value="inverse">⚫ Escala Lineal Invertida (MIP)</option>
        <option value="rainbow">🌈 Spectrum / Rainbow</option>
      </select>
    </div>

    <div class="tool-group">
      <button class="tool-btn active" id="btnToggleRoi" onclick="toggleRoi()">🎯 ROI SUVmax</button>
      <button class="tool-btn" id="btnCineMip" onclick="toggleCineMip()">🔄 Rotar MIP 3D</button>
      <button class="tool-btn" onclick="resetViewer()">↺ Reset</button>
    </div>
  </div>

  <!-- ÁREA CENTRAL DEL VISOR SIDI -->
  <div class="sidi-workspace">
    <!-- PANEL IZQUIERDO: HISTORIAL DE IMÁGENES EN SIDI / IANUS -->
    <aside class="sidi-sidebar">
      <div class="panel-title">📂 Estudios del Paciente en SIDI</div>

      <div class="series-card active" onclick="selectSeries(this, 'actual_fusion')">
        <span class="series-tag tag-pet">PET/CT ACTUAL · HOY</span>
        <div class="series-name">${estudio}</div>
        <div class="series-meta">Serie 401 · Fusión AC + Low-Dose CT (240 cortes)</div>
      </div>

      <div class="series-card" onclick="selectSeries(this, 'actual_mip')">
        <span class="series-tag tag-pet">MIP 3D CORONAL</span>
        <div class="series-name">Proyección Máxima Intensidad (MIP)</div>
        <div class="series-meta">Serie 402 · 36 ángulos rotatorios · Cuerpo entero</div>
      </div>

      <div class="series-card" onclick="selectSeries(this, 'actual_tardia')">
        <span class="series-tag tag-pet" style="background:#d97706;">SERIE TARDÍA / FOCAL</span>
        <div class="series-name">Adquisición Tardía Dual-Point</div>
        <div class="series-meta">Serie 501 · 2 Camas · Lavado de pool vascular</div>
      </div>

      <div class="series-card" onclick="selectSeries(this, 'prev_ct')">
        <span class="series-tag tag-ct">TC DIAGNÓSTICO PREVIO · SIDI</span>
        <div class="series-name">TC Toraco-Abdomino-Pélvico CIV</div>
        <div class="series-meta">Radiodiagnóstico SERGAS · Comparativo previo</div>
      </div>

      <div class="series-card" onclick="selectSeries(this, 'prev_pet')">
        <span class="series-tag tag-prev">PET/CT CONTROL PREVIO</span>
        <div class="series-name">Estudio PET/CT Basal Comparativo</div>
        <div class="series-meta">Medicina Nuclear Galaria · Valoración PERCIST</div>
      </div>

      <div class="panel-title" style="margin-top:8px;">📋 Datos DICOM / IANUS</div>
      <div style="background:#111827; padding:8px; border-radius:6px; border:1px solid #1f2937;">
        <div class="kv-row"><span class="kv-lbl">Paciente:</span><span class="kv-val">${nombre}</span></div>
        <div class="kv-row"><span class="kv-lbl">NHC SERGAS:</span><span class="kv-val" style="color:#38bdf8;">${nhc}</span></div>
        <div class="kv-row"><span class="kv-lbl">Accession #:</span><span class="kv-val">${accNum}</span></div>
        <div class="kv-row"><span class="kv-lbl">Edad / Sexo:</span><span class="kv-val">${edad}a / ${sexo}</span></div>
        <div class="kv-row"><span class="kv-lbl">Peso / Talla:</span><span class="kv-val">${peso}kg / ${talla}cm</span></div>
        <div class="kv-row"><span class="kv-lbl">Dosis Inyectada:</span><span class="kv-val">${dosisMBq} MBq</span></div>
        <div class="kv-row"><span class="kv-lbl">Glucemia Basal:</span><span class="kv-val">${escapeHTML(p.glucemia || 96)} mg/dL</span></div>
        <div class="kv-row"><span class="kv-lbl">Servicio:</span><span class="kv-val">${servicio}</span></div>
      </div>
    </aside>

    <!-- CUADRÍCULA 2x2 DE IMÁGENES RADIOLÓGICAS Y MEDICINA NUCLEAR -->
    <main class="viewports-grid" id="viewportsGrid">
      <!-- VIEWPORT 1: AXIAL FUSIÓN PET/CT -->
      <div class="viewport active-vp" id="vp1">
        <div class="dicom-overlay-tl">
          <strong>[1] AXIAL FUSIÓN PET/CT (AC)</strong><br>
          ${nombre} · ${nhc}<br>
          ${estudio}
        </div>
        <div class="dicom-overlay-tr">
          GALARIA · H. MEIXOEIRO<br>
          Acc: ${accNum}<br>
          Fecha: ${fechaCita} ${horaCita}
        </div>
        <div class="suv-colorbar"></div>

        <!-- Representación Anatómica Axial CT + Fusión PET -->
        <svg id="svgAxial" width="290" height="290" viewBox="0 0 300 300">
          <defs>
            <radialGradient id="petHotspot" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#ffffff"/>
              <stop offset="28%" stop-color="#fef08a"/>
              <stop offset="60%" stop-color="#f97316"/>
              <stop offset="85%" stop-color="#dc2626" stop-opacity="0.75"/>
              <stop offset="100%" stop-color="#7f1d1d" stop-opacity="0"/>
            </radialGradient>
            <radialGradient id="petPhysio" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stop-color="#f97316" stop-opacity="0.75"/>
              <stop offset="65%" stop-color="#dc2626" stop-opacity="0.35"/>
              <stop offset="100%" stop-color="#000000" stop-opacity="0"/>
            </radialGradient>
          </defs>
          <!-- Camilla CT -->
          <path d="M 55 225 Q 150 245 245 225" fill="none" stroke="#475569" stroke-width="5"/>
          <!-- Contorno Corporal Axial CT -->
          <ellipse cx="150" cy="150" rx="105" ry="72" fill="#1e293b" stroke="#94a3b8" stroke-width="2.5"/>
          <!-- Campos pulmonares / parénquima -->
          <ellipse cx="112" cy="145" rx="38" ry="44" fill="#090d16" stroke="#475569" stroke-width="1.2"/>
          <ellipse cx="188" cy="145" rx="38" ry="44" fill="#090d16" stroke="#475569" stroke-width="1.2"/>
          <!-- Cuerpo vertebral y costillas (Hueso CT) -->
          <circle cx="150" cy="192" r="14" fill="#e2e8f0" stroke="#ffffff" stroke-width="1.5"/>
          <circle cx="150" cy="192" r="5" fill="#1e293b"/>
          <!-- Mediastino / Corazón -->
          <ellipse cx="154" cy="136" rx="24" ry="26" fill="#334155"/>
          <!-- Capa Fusión PET -->
          <g id="petLayerAxial" style="opacity: 0.78;">
            <circle cx="154" cy="136" r="22" fill="url(#petPhysio)"/>
            <circle id="axialLesionGlow" cx="${lesionCoords.cx}" cy="${lesionCoords.cy}" r="22" fill="url(#petHotspot)"/>
          </g>
          <!-- Marcador ROI SUVmax -->
          <g id="roiOverlayAxial">
            <circle cx="${lesionCoords.cx}" cy="${lesionCoords.cy}" r="16" fill="none" stroke="#22d3ee" stroke-width="1.5" stroke-dasharray="3,2"/>
            <line x1="${lesionCoords.cx - 22}" y1="${lesionCoords.cy}" x2="${lesionCoords.cx + 22}" y2="${lesionCoords.cy}" stroke="#22d3ee" stroke-width="0.8"/>
            <line x1="${lesionCoords.cx}" y1="${lesionCoords.cy - 22}" x2="${lesionCoords.cx}" y2="${lesionCoords.cy + 22}" stroke="#22d3ee" stroke-width="0.8"/>
            <text x="${lesionCoords.cx + 18}" y="${lesionCoords.cy - 12}" fill="#22d3ee" font-family="monospace" font-size="11" font-weight="bold">SUVmax: ${suvMaxActual}</text>
          </g>
        </svg>

        <div class="dicom-overlay-bl">
          Corte: <span id="vp1Slice">118 / 240</span> (Z: -42.5 mm)<br>
          SUVbw Max: <strong>${suvMaxActual} g/mL</strong> · Fusión: <span id="vp1Fusion">65%</span>
        </div>
        <div class="dicom-overlay-br">
          W: 350 L: 40<br>
          FOV: 600 mm
        </div>
      </div>

      <!-- VIEWPORT 2: CORONAL MIP 3D CUERPO ENTERO -->
      <div class="viewport" id="vp2">
        <div class="dicom-overlay-tl">
          <strong>[2] CORONAL PET · MIP 3D</strong><br>
          Escala SUV Lineal Invertida<br>
          Rango: Base Cráneo - Muslos
        </div>
        <div class="dicom-overlay-tr">
          SERIE 402 · 3D MIP<br>
          Ángulo: <span id="mipAngleLabel">0° (Anterior)</span>
        </div>

        <svg id="svgCoronalMip" width="275" height="290" viewBox="0 0 300 310" style="background:#f8fafc; border-radius:4px;">
          <g id="mipBodyGroup" transform="translate(0,0)">
            <!-- Silueta corporal MIP (escala gris médica invertida) -->
            <!-- Cabeza y Cerebro (alta captación fisiológica FDG) -->
            <ellipse cx="150" cy="46" rx="24" ry="28" fill="#cbd5e1" stroke="#94a3b8" stroke-width="1"/>
            <ellipse cx="150" cy="42" rx="19" ry="21" fill="#1e293b"/>
            <!-- Cuello -->
            <rect x="138" y="72" width="24" height="18" rx="4" fill="#cbd5e1"/>
            <!-- Tronco (Tórax y Abdomen) -->
            <path d="M 102 90 Q 150 84 198 90 L 192 225 Q 150 232 108 225 Z" fill="#e2e8f0" stroke="#cbd5e1" stroke-width="1.5"/>
            <!-- Brazos -->
            <path d="M 102 92 L 84 185 L 96 188 L 108 112 Z" fill="#e2e8f0"/>
            <path d="M 198 92 L 216 185 L 204 188 L 192 112 Z" fill="#e2e8f0"/>
            <!-- Muslos -->
            <rect x="112" y="222" width="32" height="72" rx="10" fill="#e2e8f0"/>
            <rect x="156" y="222" width="32" height="72" rx="10" fill="#e2e8f0"/>
            <!-- Corazón / Miocardio -->
            <ellipse cx="158" cy="132" rx="15" ry="12" fill="#475569" transform="rotate(-15 158 132)"/>
            <!-- Hígado (captación fisiológica moderada) -->
            <path d="M 114 148 Q 140 144 152 162 L 116 172 Z" fill="#94a3b8"/>
            <!-- Riñones (eliminación fisiológica) -->
            <ellipse cx="128" cy="180" rx="8" ry="13" fill="#334155"/>
            <ellipse cx="172" cy="180" rx="8" ry="13" fill="#334155"/>
            <!-- Vejiga urinaria (excreción radiotrazador) -->
            <ellipse cx="150" cy="218" rx="14" ry="10" fill="#0f172a"/>
            <!-- Foco hipermetabólico principal -->
            <circle cx="${lesionCoords.mipX}" cy="${lesionCoords.mipY}" r="9" fill="#dc2626"/>
            <circle cx="${lesionCoords.mipX}" cy="${lesionCoords.mipY}" r="15" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="3,2"/>
            <!-- Línea de corte axial actual -->
            <line id="mipSliceLine" x1="75" y1="138" x2="225" y2="138" stroke="#0284c7" stroke-width="1.5" stroke-dasharray="4,3"/>
          </g>
        </svg>

        <div class="dicom-overlay-bl" style="color:#0f172a; text-shadow:none; background:rgba(255,255,255,0.85); padding:2px 6px; border-radius:4px;">
          🎯 Foco: <strong>${lesionLocation}</strong> (SUVmax ${suvMaxActual})
        </div>
      </div>

      <!-- VIEWPORT 3: SAGITAL CT + FUSIÓN -->
      <div class="viewport" id="vp3">
        <div class="dicom-overlay-tl">
          <strong>[3] SAGITAL MPR FUSIÓN</strong><br>
          Corrección Atenuación CT<br>
          Columna / Mediastino / Pelvis
        </div>
        <div class="dicom-overlay-tr">
          120 kVp · 80 mAs<br>
          Espesor: 3.0 mm
        </div>

        <svg width="280" height="260" viewBox="0 0 300 280">
          <!-- Perfil Sagital -->
          <path d="M 115 30 Q 175 25 180 65 L 175 88 L 195 110 L 192 245 L 118 245 L 112 95 Z" fill="#1e293b" stroke="#64748b" stroke-width="2"/>
          <!-- Columna vertebral sagital -->
          <g fill="#cbd5e1">
            <rect x="126" y="88" width="14" height="10" rx="2"/>
            <rect x="125" y="102" width="14" height="10" rx="2"/>
            <rect x="124" y="116" width="14" height="10" rx="2"/>
            <rect x="124" y="130" width="14" height="10" rx="2"/>
            <rect x="125" y="144" width="14" height="10" rx="2"/>
            <rect x="126" y="158" width="14" height="10" rx="2"/>
            <rect x="128" y="172" width="15" height="11" rx="2"/>
            <rect x="130" y="187" width="15" height="11" rx="2"/>
            <rect x="132" y="202" width="15" height="11" rx="2"/>
          </g>
          <!-- Foco Sagital PET -->
          <circle cx="158" cy="138" r="18" fill="url(#petHotspot)"/>
          <line id="sagSliceLine" x1="85" y1="138" x2="225" y2="138" stroke="#38bdf8" stroke-width="1.2" stroke-dasharray="4,3"/>
        </svg>

        <div class="dicom-overlay-bl">
          Plano Sagital Medio · Matriz 512x512
        </div>
      </div>

      <!-- VIEWPORT 4: COMPARATIVO PREVIO EN SIDI & ANÁLISIS PERCIST -->
      <div class="viewport" id="vp4" style="flex-direction:column; align-items:stretch; justify-content:flex-start; padding:14px; background:#090d16;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #1e293b; padding-bottom:6px; margin-bottom:10px;">
          <span style="font-size:12px; font-weight:800; color:#38bdf8;">[4] COMPARATIVA EVOLUTIVA SIDI / IANUS (PERCIST 1.0)</span>
          <span style="font-size:10.5px; background:#065f46; color:#a7f3d0; padding:2px 7px; border-radius:4px; font-weight:700;">Sincronizado con PACS</span>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:10px;">
          <div style="background:#111827; border:1px solid #1e293b; border-radius:6px; padding:10px;">
            <div style="font-size:10.5px; color:#94a3b8; font-weight:700;">ESTUDIO ACTUAL (${fechaCita})</div>
            <div style="font-size:20px; font-weight:800; color:#fbbf24; font-family:monospace; margin-top:2px;">SUVmax: ${suvMaxActual}</div>
            <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">MTV: 4.2 cm³ · TLG: 21.8 g</div>
          </div>
          <div style="background:#111827; border:1px solid #1e293b; border-radius:6px; padding:10px;">
            <div style="font-size:10.5px; color:#94a3b8; font-weight:700;">ESTUDIO PREVIO EN SIDI</div>
            <div style="font-size:20px; font-weight:800; color:#94a3b8; font-family:monospace; margin-top:2px;">SUVmax: ${suvMaxPrev}</div>
            <div style="font-size:11px; color:#38bdf8; margin-top:2px;">Pool Hepático SUL: 1.8 g/mL</div>
          </div>
        </div>

        <div style="background:#111827; border:1px solid #1e293b; border-radius:6px; padding:10px; flex:1; display:flex; flex-direction:column; justify-content:space-between;">
          <div>
            <div style="font-size:11px; font-weight:700; color:#e2e8f0; margin-bottom:4px;">📍 Localización Diana Principal:</div>
            <div style="font-size:12px; color:#38bdf8; font-weight:700;">${lesionLocation}</div>
            <div style="font-size:11px; color:#94a3b8; margin-top:4px;">
              <strong>Diagnóstico / Indicación:</strong> ${diag}
            </div>
          </div>
          <div style="font-size:10.5px; color:#10b981; font-family:monospace; border-top:1px dashed #1e293b; padding-top:6px;">
            ✓ Control de Calidad de Imagen: Adquisición sin artefactos de movimiento · Vejiga evaluada.
          </div>
        </div>
      </div>
    </main>

    <!-- PANEL DERECHO: MEDICIONES SUV & INFORME RÁPIDO SIDI -->
    <aside class="sidi-right-panel">
      <div class="panel-title">🎯 Mediciones SUV / ROI</div>
      <div class="roi-badge">
        <div style="font-weight:800; color:#fbbf24; margin-bottom:4px;">ROI #1 — Lesión Diana</div>
        <div class="kv-row"><span class="kv-lbl">Región:</span><span class="kv-val">${lesionLocation.split('/')[0]}</span></div>
        <div class="kv-row"><span class="kv-lbl">SUVmax:</span><span class="kv-val" style="color:#fbbf24;">${suvMaxActual} g/mL</span></div>
        <div class="kv-row"><span class="kv-lbl">SUVmean:</span><span class="kv-val">5.1 g/mL</span></div>
        <div class="kv-row"><span class="kv-lbl">Diámetro CT:</span><span class="kv-val">18.4 mm</span></div>
        <div class="kv-row"><span class="kv-lbl">Densidad UH:</span><span class="kv-val">+42 HU</span></div>
      </div>

      <div class="roi-badge" style="border-color:#38bdf8;">
        <div style="font-weight:800; color:#38bdf8; margin-bottom:4px;">Referencia Fisiológica</div>
        <div class="kv-row"><span class="kv-lbl">Pool Mediastínico:</span><span class="kv-val">1.6 g/mL</span></div>
        <div class="kv-row"><span class="kv-lbl">Parénquima Hepático:</span><span class="kv-val">2.3 g/mL</span></div>
        <div class="kv-row"><span class="kv-lbl">Escala Deauville:</span><span class="kv-val">Score 4</span></div>
      </div>

      <div class="panel-title" style="margin-top:6px;">📝 Verificación de Salida</div>
      <div style="background:#111827; border:1px solid #1f2937; border-radius:6px; padding:9px; font-size:11.5px; line-height:1.45; color:#cbd5e1;">
        Revise en este visor <strong>SIDI</strong> si el paciente requiere una <strong>Serie Tardía</strong> (ej. lavado vesical o foco dudoso) antes de autorizar el <strong>Alta Médica</strong> en la barra inferior.
      </div>
    </aside>
  </div>

  <script>
    let cineTimer = null;
    let mipAngle = 0;

    function updateSlice(val) {
      document.getElementById('sliceLabel').textContent = val + '/240';
      document.getElementById('vp1Slice').textContent = val + ' / 240';
      const yPos = 45 + ((val / 240) * 210);
      const mipLine = document.getElementById('mipSliceLine');
      const sagLine = document.getElementById('sagSliceLine');
      if (mipLine) { mipLine.setAttribute('y1', yPos); mipLine.setAttribute('y2', yPos); }
      if (sagLine) { sagLine.setAttribute('y1', yPos); sagLine.setAttribute('y2', yPos); }
      const glow = document.getElementById('axialLesionGlow');
      if (glow) {
        const dist = Math.abs(val - 118);
        const r = Math.max(6, 24 - (dist * 0.25));
        glow.setAttribute('r', r);
      }
    }

    function updateFusion(val) {
      document.getElementById('fusionLabel').textContent = val + '%';
      document.getElementById('vp1Fusion').textContent = val + '%';
      const petLayer = document.getElementById('petLayerAxial');
      if (petLayer) {
        petLayer.style.opacity = (val / 100).toFixed(2);
      }
    }

    function updateLut(mode) {
      const svgAxial = document.getElementById('svgAxial');
      if (!svgAxial) return;
      if (mode === 'inverse') {
        svgAxial.style.filter = 'invert(1) hue-rotate(180deg)';
      } else if (mode === 'rainbow') {
        svgAxial.style.filter = 'hue-rotate(95deg) saturate(1.6)';
      } else {
        svgAxial.style.filter = 'none';
      }
    }

    function toggleRoi() {
      const roi = document.getElementById('roiOverlayAxial');
      const btn = document.getElementById('btnToggleRoi');
      if (!roi) return;
      const isHidden = roi.style.display === 'none';
      roi.style.display = isHidden ? 'block' : 'none';
      if (btn) btn.classList.toggle('active', isHidden);
    }

    function toggleCineMip() {
      const btn = document.getElementById('btnCineMip');
      const group = document.getElementById('mipBodyGroup');
      const lbl = document.getElementById('mipAngleLabel');
      if (cineTimer) {
        clearInterval(cineTimer);
        cineTimer = null;
        if (btn) btn.classList.remove('active');
        if (group) group.setAttribute('transform', 'translate(0,0) scale(1,1)');
        if (lbl) lbl.textContent = '0° (Anterior)';
        return;
      }
      if (btn) btn.classList.add('active');
      cineTimer = setInterval(() => {
        mipAngle = (mipAngle + 15) % 360;
        const rad = (mipAngle * Math.PI) / 180;
        const scaleX = Math.max(0.35, Math.abs(Math.cos(rad)));
        const offsetX = 150 * (1 - scaleX);
        if (group) group.setAttribute('transform', 'translate(' + offsetX.toFixed(1) + ',0) scale(' + scaleX.toFixed(2) + ',1)');
        if (lbl) lbl.textContent = mipAngle + '° (Rotación 3D)';
      }, 120);
    }

    function setLayout(mode) {
      const grid = document.getElementById('viewportsGrid');
      const vp2 = document.getElementById('vp2');
      const vp3 = document.getElementById('vp3');
      const vp4 = document.getElementById('vp4');
      document.getElementById('btnLayout2x2').classList.toggle('active', mode === '2x2');
      document.getElementById('btnLayout1x1').classList.toggle('active', mode === '1x1');
      if (mode === '1x1') {
        grid.classList.add('single-view');
        vp2.style.display = 'none';
        vp3.style.display = 'none';
        vp4.style.display = 'none';
      } else {
        grid.classList.remove('single-view');
        vp2.style.display = 'flex';
        vp3.style.display = 'flex';
        vp4.style.display = 'flex';
      }
    }

    function selectSeries(cardEl, seriesType) {
      document.querySelectorAll('.series-card').forEach(c => c.classList.remove('active'));
      cardEl.classList.add('active');
      if (seriesType === 'actual_mip') {
        setLayout('2x2');
        if (!cineTimer) toggleCineMip();
      } else if (seriesType === 'prev_ct') {
        updateFusion(0);
        document.getElementById('fusionSlider').value = 0;
      } else {
        updateFusion(65);
        document.getElementById('fusionSlider').value = 65;
      }
    }

    function resetViewer() {
      if (cineTimer) toggleCineMip();
      setLayout('2x2');
      document.getElementById('sliceSlider').value = 118;
      updateSlice(118);
      document.getElementById('fusionSlider').value = 65;
      updateFusion(65);
      document.getElementById('selectLut').value = 'hotiron';
      updateLut('hotiron');
    }
  <` + `/script>
</body>
</html>`;
  }

  // ==========================================================================
  // IMPRESIÓN DE LA HOJA TÉCNICA DEL TSID
  // ==========================================================================
  function printProtocolSheet() {
    if (!state.selectedPatient) return;
    const p = state.selectedPatient;
    const proto = state.selectedPatient.protocoloMedico || getSmartDefaultProtocol(p);

    const sheetHtml = generateProtocolSheetHtml(p, proto);
    const printWin = window.open('', '_blank', 'width=900,height=950');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(sheetHtml);
      printWin.document.close();
      printWin.focus();
    } else {
      showToast('Por favor, permita ventanas emergentes para imprimir la hoja técnica', 'warning');
    }
  }

  // ==========================================================================
  // GENERADOR DEL VOLANTE OFICIAL DE PETICIÓN (SERGAS · GALARIA)
  // ==========================================================================
  function generatePatientVolanteHtml(p, autoPrint = false) {
    if (!p) return '';
    const raw = p.raw || p;

    const subId = p.id || raw["Submission ID"] || "sub_0000";
    const idClean = String(subId).replace("sub_", "").replace("REQ-", "");

    const nombre = raw["Nombre del Paciente"] || raw["Nombre y Apellidos"] || p.nombre || "--";
    const nhc = raw["NHC / Historia Clínica"] || p.nhc || idClean || "--";
    const edad = raw["Edad"] || p.edad || "65";
    const sexo = raw["Sexo"] || p.sexo || "Varón";
    const peso = raw["Peso (kg)"] || p.peso || "74";
    const talla = raw["Talla (cm)"] || p.talla || "172";
    const movilidad = raw["Movilidad / Traslado"] || p.movilidad || "Autónomo";
    const sedacion = raw["¿Precisa sedación?"] || "No";

    let diabetes = p.isDiabetic ? 'Sí (Diabético)' : (raw["¿Tiene Diabetes Mellitus?"] || 'No');
    let glucemia = p.glucemia || raw["Glucemia (mg/dL)"] || (p.isDiabetic ? '142' : '98');

    const ingresado = raw["¿El paciente está ingresado?"] || "No (Ambulatorio)";
    const medico = raw["Médico Solicitante"] || "Dr. Fernando García";
    const servicio = raw["Servicio Solicitante"] || "Oncología Médica";
    const proxConsulta = raw["Fecha Próxima Consulta"] || "23/10/2026 (Comité de Tumores)";
    const fechaSol = raw["Fecha Solicitud"] || "15/10/2026";

    const estudio = p.radiofarmaco || raw["Tipo de Estudio PET Solicitado"] || "18F-FDG (Oncológico / Inflamatorio General)";
    const prioridad = p.prioridad || raw["Carácter de la Petición"] || "🟢 P3 - Ordinario";
    const diag = p.diagnostico || raw["Diagnóstico Clínico"] || "Estudio PET/CT Oncológico";
    const resumen = raw["Resumen Clínico"] || "Estudio PET/CT solicitado para estadificación, valoración de extensión y respuesta terapéutica según protocolo asistencial SERGAS.";

    const alergias = p.alergia || raw["Alergias Conocidas"] || "Ninguna";
    const contraste = p.contraindicacionContraste || raw["Contraindicación Contraste"] || "No";
    const metal = raw["Portador Objetos Metálicos"] || "No";

    const petPrevio = raw["¿Tiene estudio PET previo?"] || raw["PET Previo Realizado"] || (raw["Detalle PET Previo"] && !raw["Detalle PET Previo"].startsWith('No') ? 'Sí' : 'Non');
    const petPrevioDetalle = raw["Detalle PET Previo"] || (raw["Fecha PET Previo"] ? `${raw["Fecha PET Previo"]} (${raw["Centro PET Previo"] || 'SERGAS'})` : '');
    const isPetPrevioSi = String(petPrevio).toLowerCase().includes('s') || String(petPrevio).toLowerCase().includes('si');

    const fechaCita = p.fechaCita || raw["Fecha Cita Asignada"] || "19/10/2026";
    const horaCita = p.horaCita || raw["Hora Cita Asignada"] || "08:30 h";

    let protocolSection = '';
    if (p.protocoloMedico && p.protocoloMedico.completed) {
      const pr = p.protocoloMedico;
      const medsBadgeList = getMedicationsBadgeList(pr);

      protocolSection = `
        <div style="margin-top: 18px; border: 2px solid #007eb4; border-radius: 6px; padding: 14px; background: #f0f9ff;">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1.5px solid #007eb4; padding-bottom:6px; margin-bottom:10px;">
            <strong style="color:#004868; font-size:13px; text-transform:uppercase;">🩺 Protocolización Oficial de Adquisición (Validada en Medicina Nuclear)</strong>
            <span style="font-size:11px; color:#007eb4; font-weight:700;">${escapeHTML(pr.timestamp || '')}</span>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:11.5px;">
            <tr>
              <td style="padding:4px; width:25%;"><strong>⏱️ Tiempo a Máquina:</strong> ${escapeHTML(pr.uptakeTime)} min</td>
              <td style="padding:4px; width:25%;"><strong>🙆‍♂️ Posición Brazos:</strong> ${getArmsLabel(pr.armsPosition)}</td>
              <td style="padding:4px; width:25%;"><strong>📐 Rango / Tipo Prueba:</strong> ${getRangeLabel(pr.scanRange)}</td>
              <td style="padding:4px; width:25%;"><strong>💧 Hidratación Previa:</strong> ${getHydrationLabel(pr.hydration)}</td>
            </tr>
            <tr>
              <td style="padding:4px;" colspan="2"><strong>⚡ Diurético (Furosemida):</strong> ${getDiureticLabel(pr)}</td>
              <td style="padding:4px;" colspan="2"><strong>☢️ Protocolo de Contraste:</strong> ${getContrastLabel(pr)}</td>
            </tr>
            ${medsBadgeList ? `<tr><td style="padding:4px;" colspan="4"><strong>💊 Medicación Opcional Validada:</strong> ${medsBadgeList}</td></tr>` : ''}
            ${pr.doctorNotes ? `<tr><td style="padding:4px;" colspan="4"><strong>📝 Notas Facultativas para TSID:</strong> ${escapeHTML(pr.doctorNotes)}</td></tr>` : ''}
            <tr>
              <td style="padding:4px; padding-top:8px;" colspan="4">
                <strong>👨‍⚕️ Facultativo Validador:</strong> ${escapeHTML(pr.doctorSign || pr.doctorName || 'Dr. Manuel Gómez Feijóo')}
              </td>
            </tr>
          </table>
        </div>
      `;
    }

    const scriptPrintTag = autoPrint ? `<script>window.addEventListener('load', function() { setTimeout(function(){ window.print(); }, 250); });<` + `/script>` : '';

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Volante Oficial PET/CT - ${escapeHTML(nombre)} (${escapeHTML(nhc)})</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 14mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 16px;
    }
    .action-bar {
      max-width: 900px;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #004868;
      color: white;
      padding: 10px 18px;
      border-radius: 8px;
    }
    .btn-print {
      background: #007eb4;
      color: white;
      border: none;
      padding: 7px 14px;
      border-radius: 6px;
      font-weight: 700;
      cursor: pointer;
      font-size: 13px;
    }
    .official-sheet {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 2px solid #004868;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.08);
    }
    .sheet-header-box {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #004868;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .sheet-hospital-info {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .sheet-hospital-info img {
      height: 48px;
      object-fit: contain;
    }
    .sheet-title-badge {
      text-align: right;
    }
    .sheet-title-badge h1 {
      margin: 0;
      font-size: 15px;
      color: #004868;
      font-weight: 800;
    }
    .sheet-section {
      margin-bottom: 14px;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    .sheet-section-header {
      background: #f8fafc;
      padding: 6px 12px;
      font-weight: 800;
      font-size: 12px;
      color: #004868;
      border-bottom: 1px solid #cbd5e1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .sheet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    .sheet-table td {
      padding: 6px 10px;
      border-bottom: 1px solid #f1f5f9;
      vertical-align: top;
    }
    .field-lbl {
      color: #64748b;
      font-size: 11px;
      display: block;
      margin-bottom: 2px;
      font-weight: 600;
    }
    .field-val {
      color: #0f172a;
      font-weight: 700;
    }
    .signature-area {
      display: flex;
      justify-content: space-between;
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px dashed #cbd5e1;
      font-size: 11px;
      color: #475569;
    }
    @media print {
      body { background: white; padding: 0; }
      .action-bar { display: none !important; }
      .official-sheet { border: 1px solid #000; box-shadow: none; border-radius: 0; padding: 10px; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div><strong>SERGAS · Galaria</strong> | Volante de Petición Oficial PET/CT</div>
    <button class="btn-print" onclick="window.print()">🖨️ Imprimir Volante</button>
  </div>

  <div class="official-sheet">
    <div class="sheet-header-box">
      <div class="sheet-hospital-info">
        <img src="galaria_logo.jpg" alt="Galaria">
        <div>
          <h2 style="margin:0; font-size:14px; color:#004868; font-weight:800;">XUNTA DE GALICIA · CONSELLERÍA DE SANIDADE</h2>
          <p style="margin:2px 0 0 0; font-size:11px; color:#475569;">GALARIA · SERVIZO GALEGO DE SAÚDE (SERGAS) — MEDICINA NUCLEAR</p>
        </div>
      </div>
      <div class="sheet-title-badge">
        <h1>VOLANTE DE PETICIÓN CLÍNICA PET/CT</h1>
        <div style="font-family:'JetBrains Mono',monospace; font-size:11px; color:#007eb4; font-weight:700; margin-top:3px;">
          REF: ${escapeHTML(subId)}
        </div>
      </div>
    </div>

    <!-- 1. IDENTIFICACIÓN DO PACIENTE -->
    <div class="sheet-section">
      <div class="sheet-section-header">1. Identificación do Paciente e Parámetros Físicos</div>
      <table class="sheet-table">
        <tr>
          <td style="width: 35%;">
            <span class="field-lbl">Nome e Apelidos:</span>
            <span class="field-val" style="font-size: 13px; color:#004868;">${escapeHTML(nombre)}</span>
          </td>
          <td style="width: 25%;">
            <span class="field-lbl">NHC / Nº Historia:</span>
            <span class="field-val" style="font-family: monospace; font-size: 13px;">${escapeHTML(nhc)}</span>
          </td>
          <td style="width: 20%;">
            <span class="field-lbl">Idade / Sexo:</span>
            <span class="field-val">${escapeHTML(edad)} anos / ${escapeHTML(sexo)}</span>
          </td>
          <td style="width: 20%;">
            <span class="field-lbl">Peso e Talla:</span>
            <span class="field-val">${escapeHTML(peso)} kg (${escapeHTML(talla)} cm)</span>
          </td>
        </tr>
        <tr>
          <td>
            <span class="field-lbl">Mobilidade / Traslado:</span>
            <span class="field-val">${escapeHTML(movilidad)}</span>
          </td>
          <td>
            <span class="field-lbl">Precisa Sedación:</span>
            <span class="field-val">${escapeHTML(sedacion)}</span>
          </td>
          <td>
            <span class="field-lbl">¿Está Ingresado?:</span>
            <span class="field-val">${escapeHTML(ingresado)}</span>
          </td>
          <td>
            <span class="field-lbl">Glicemia Basal:</span>
            <span class="field-val" style="color: ${p.isDiabetic ? '#dc2626' : '#0f172a'};">
              ${escapeHTML(glucemia)} mg/dL (${escapeHTML(diabetes)})
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- 2. DATOS DA SOLICITUDE E CITA -->
    <div class="sheet-section">
      <div class="sheet-section-header">2. Servizo Solicitante e Citación Asignada</div>
      <table class="sheet-table">
        <tr>
          <td style="width: 30%;">
            <span class="field-lbl">Servizo Prescritor:</span>
            <span class="field-val">${escapeHTML(servicio)}</span>
          </td>
          <td style="width: 30%;">
            <span class="field-lbl">Facultativo Solicitante:</span>
            <span class="field-val">${escapeHTML(medico)}</span>
          </td>
          <td style="width: 20%;">
            <span class="field-lbl">Data da Solicitude:</span>
            <span class="field-val">${escapeHTML(fechaSol)}</span>
          </td>
          <td style="width: 20%;">
            <span class="field-lbl">Prioridade:</span>
            <span class="field-val">${escapeHTML(prioridad)}</span>
          </td>
        </tr>
        <tr style="background: #f0fdf4;">
          <td colspan="2">
            <span class="field-lbl">Cita Asignada no PET/CT:</span>
            <span class="field-val" style="color:#059669; font-size:13px;">📅 ${escapeHTML(fechaCita)} ás ${escapeHTML(horaCita)}</span>
          </td>
          <td colspan="2">
            <span class="field-lbl">Próxima Consulta / Comité:</span>
            <span class="field-val">${escapeHTML(proxConsulta)}</span>
          </td>
        </tr>
      </table>
    </div>

    <!-- 3. MOTIVO CLÍNICO E ESTUDO SOLICITADO -->
    <div class="sheet-section">
      <div class="sheet-section-header">3. Tipo de Estudo PET/CT e Xustificación Diagnóstica</div>
      <table class="sheet-table">
        <tr>
          <td colspan="2">
            <span class="field-lbl">Radiofármaco e Protocolo Solicitado:</span>
            <span class="field-val" style="color:#004868; font-size:13px;">${escapeHTML(estudio)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="field-lbl">Diagnóstico Clínico / Sospeita Oncolóxica:</span>
            <span class="field-val">${escapeHTML(diag)}</span>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="field-lbl">Resumo Clínico e Antecedentes Relevantes:</span>
            <div style="font-size:11.5px; color:#334155; line-height:1.5; margin-top:2px;">
              ${escapeHTML(resumen)}
            </div>
          </td>
        </tr>
        <tr>
          <td colspan="2">
            <span class="field-lbl">¿Estudo PET/CT Previo Realizado?:</span>
            <span class="field-val" style="color: ${isPetPrevioSi ? '#0284c7' : '#059669'}; font-size:12px;">
              ${isPetPrevioSi ? '🔵 Si (Revisar comparativa no SIDI / PACS): ' + escapeHTML(petPrevioDetalle || 'Consta estudo previo') : '🟢 Non (Estudo Basal / Primeiro PET)'}
            </span>
          </td>
        </tr>
        <tr>
          <td style="width: 50%;">
            <span class="field-lbl">Alerxias Coñecidas:</span>
            <span class="field-val">${escapeHTML(alergias)}</span>
          </td>
          <td style="width: 50%;">
            <span class="field-lbl">Contraindicación de Contraste / Metais:</span>
            <span class="field-val">Contraste: ${escapeHTML(contraste)} | Obxectos Metálicos: ${escapeHTML(metal)}</span>
          </td>
        </tr>
      </table>
    </div>

    ${protocolSection}

    <div class="signature-area">
      <div>
        <strong>Servizo Solicitante:</strong> ${escapeHTML(servicio)}<br>
        Facultativo: ${escapeHTML(medico)}
      </div>
      <div style="text-align: right;">
        <strong>Unidade PET/CT — Galaria / SERGAS</strong><br>
        Documento Asistencial Validado Telematicamente
      </div>
    </div>
  </div>

  ${scriptPrintTag}
</body>
</html>`;
  }

  // ==========================================================================
  // GENERADOR DE HOJA TÉCNICA DE ADQUISICIÓN PARA TSID (TÉCNICO DE MÁQUINA)
  // ==========================================================================
  function generateProtocolSheetHtml(p, proto) {
    const medsBadgeList = getMedicationsBadgeList(proto);

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Hoja Técnica PET/CT - ${escapeHTML(p.nombre)} (${escapeHTML(p.nhc)})</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      margin: 0;
      padding: 16px;
    }
    .sheet-card {
      max-width: 860px;
      margin: 0 auto;
      background: white;
      border: 2px solid #004868;
      border-radius: 8px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #004868;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .header-bar img { height: 46px; }
    .badge-alert-box {
      background: #fef2f2;
      border: 1.5px solid #f87171;
      padding: 10px 14px;
      border-radius: 6px;
      margin-bottom: 14px;
      font-weight: 700;
      color: #991b1b;
      font-size: 13px;
    }
    .param-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .param-box {
      border: 1.5px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      background: #f8fafc;
    }
    .param-box.highlight {
      border-color: #007eb4;
      background: #f0f9ff;
    }
    .param-title {
      font-size: 11px;
      text-transform: uppercase;
      font-weight: 800;
      color: #004868;
      margin-bottom: 4px;
    }
    .param-val {
      font-size: 15px;
      font-weight: 800;
      color: #0f172a;
    }
    .param-sub {
      font-size: 11px;
      color: #475569;
      margin-top: 2px;
    }
    .meds-alert-card {
      background: #fffbeb;
      border: 2px solid #f59e0b;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 16px;
    }
    .tsid-checklist {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .tsid-checklist label {
      display: block;
      margin-bottom: 6px;
      font-size: 12px;
      font-weight: 600;
    }
    @media print {
      body { background: white; padding: 0; }
      .sheet-card { border: 1.5px solid #000; box-shadow: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="sheet-card">
    <div class="header-bar">
      <div style="display:flex; align-items:center; gap:12px;">
        <img src="galaria_logo.jpg" alt="Galaria">
        <div>
          <h2 style="margin:0; font-size:14px; color:#004868; font-weight:800;">GALARIA · SERGAS — UNIDADE PET/CT</h2>
          <p style="margin:2px 0 0 0; font-size:11px; color:#475569;">HOJA DE PROTOCOLO DE ADQUISICIÓN PARA TSID / CONSOLA DE MÁQUINA</p>
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:12px; font-weight:800; color:#004868;">FECHA: ${escapeHTML(p.fechaCita)}</div>
        <div style="font-size:13px; font-weight:800; color:#007eb4;">HORA CITA: ${escapeHTML(p.horaCita)}</div>
      </div>
    </div>

    <!-- DATOS DEL PACIENTE -->
    <div style="background:#f1f5f9; padding:10px 14px; border-radius:6px; margin-bottom:14px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <div style="font-size:16px; font-weight:800; color:#004868;">${escapeHTML(p.nombre)}</div>
        <div style="font-size:12px; color:#475569; font-weight:600;">
          NHC: <strong>${escapeHTML(p.nhc)}</strong> | Edad: ${p.edad} años (${p.sexo}) | Peso: ${p.peso} kg | Talla: ${p.talla} cm
        </div>
      </div>
      <div style="text-align:right;">
        <div style="font-size:11px; color:#64748b; font-weight:700;">RADIOFÁRMACO:</div>
        <div style="font-size:13px; font-weight:800; color:#004868;">${escapeHTML(p.radiofarmaco)}</div>
      </div>
    </div>

    <!-- ALERTAS SI APLICAN -->
    ${p.isDiabetic || p.contraindicacionContraste === 'Sí' || p.movilidad !== 'Autónomo' ? `
      <div class="badge-alert-box">
        ⚠️ ALERTAS CLÍNICAS:
        ${p.isDiabetic ? `[DIABÉTICO: Glucemia basal ${p.glucemia} mg/dL] ` : ''}
        ${p.contraindicacionContraste === 'Sí' ? `[CONTRAINDICACIÓN CONTRASTE IODADO] ` : ''}
        ${p.movilidad !== 'Autónomo' ? `[MOVILIDAD: ${p.movilidad}] ` : ''}
      </div>
    ` : ''}

    <!-- PARÁMETROS CRÍTICOS DE ADQUISICIÓN -->
    <div class="param-grid">
      <div class="param-box highlight">
        <div class="param-title">⏱️ TIEMPO DE ESPERA / PASO A MÁQUINA</div>
        <div class="param-val">${escapeHTML(proto.uptakeTime || 60)} MINUTOS</div>
        <div class="param-sub">Tiempo mínimo de captación desde inyección IV del trazador</div>
      </div>

      <div class="param-box highlight">
        <div class="param-title">🙆‍♂️ POSICIÓN DE LOS BRAZOS</div>
        <div class="param-val">${getArmsLabel(proto.armsPosition)}</div>
        <div class="param-sub">${getArmsDescription(proto.armsPosition)}</div>
      </div>

      <div class="param-box highlight">
        <div class="param-title">🩸 FASE VASCULAR PARA LA PRUEBA</div>
        <div class="param-val" style="color: ${proto.vascularPhase === 'si' ? '#dc2626' : '#475569'};">
          ${proto.vascularPhase === 'si' ? '🩸 SÍ — REALIZAR FASE VASCULAR' : '❌ NO — SIN FASE VASCULAR (ESTÁNDAR)'}
        </div>
        <div class="param-sub">${proto.vascularPhase === 'si' ? 'Adquisición precoz / angiográfica vascular pautada por el facultativo' : 'Adquisición PET/CT estándar sin fase vascular precoz'}</div>
      </div>

      <div class="param-box highlight">
        <div class="param-title">📐 TIPO DE PRUEBA Y RANGO ANATÓMICO (SCOUT VIEW)</div>
        <div class="param-val">${getRangeLabel(proto.scanRange)}</div>
        <div class="param-sub">${proto.customRangeDetails ? escapeHTML(proto.customRangeDetails) : 'Longitud y cobertura axial de adquisición'}</div>
      </div>

      <div class="param-box">
        <div class="param-title">💧 PAUTA DE HIDRATACIÓN EN BOX</div>
        <div class="param-val">${getHydrationLabel(proto.hydration)}</div>
        <div class="param-sub">Pauta exclusiva de ingesta hídrica oral durante la espera en el box</div>
      </div>

      <div class="param-box highlight">
        <div class="param-title">⚡ DIURÉTICO (FUROSEMIDA / SEGURIL)</div>
        <div class="param-val" style="color: ${(proto.diuretic && proto.diuretic !== 'no') ? '#007eb4' : '#64748b'};">
          ${getDiureticLabel(proto)}
        </div>
        <div class="param-sub">${(proto.diuretic === 'si_20mg_post' || proto.diuretic === 'diur_post' || proto.diuretic === 'si_15min_antes') ? 'Administrar 20 mg IV lenta a los 15-20 min post-inyección' : 'No administrar diurético'}</div>
      </div>

      <div class="param-box highlight">
        <div class="param-title">☢️ PROTOCOLO DE CONTRASTE</div>
        <div class="param-val" style="color: ${(proto.contrastType === 'en_maquina' || proto.contrast === 'civ_portal') ? '#0284c7' : ((proto.contrastType === 'en_box' || proto.contrastPre === 'oral_gastrografin') ? '#059669' : '#475569')};">
          ${getContrastLabel(proto)}
        </div>
        <div class="param-sub">${(proto.contrastType === 'en_maquina' || proto.contrast === 'civ_portal') ? 'Inyección endovenosa de contraste iodado acoplada en máquina con inyector en camilla (fase portal)' : ((proto.contrastType === 'en_box' || proto.contrastPre === 'oral_gastrografin' || proto.contrast === 'oral_gastrografin_15min') ? `Administrar contraste IV en el box ${proto.contrastBoxMinutes || proto.contrastPreMinutes || 15} min antes de la prueba` : 'CT a baja dosis para corrección de atenuación sin contraste')}</div>
      </div>
    </div>

    <!-- MEDICACIÓN OPCIONAL Y SOPORTE CLÍNICO -->
    ${medsBadgeList ? `
      <div class="meds-alert-card">
        <div style="font-size:11px; font-weight:800; color:#b45309; text-transform:uppercase; margin-bottom:4px;">
          💊 MEDICAMENTOS OPCIONALES PAUTADOS POR EL FACULTATIVO:
        </div>
        <div style="font-size:13px; font-weight:700; color:#92400e;">
          ${medsBadgeList}
        </div>
      </div>
    ` : ''}

    <!-- INSTRUCCIONES ESPECÍFICAS DEL FACULTATIVO -->
    ${proto.doctorNotes ? `
      <div style="background:#fffbeb; border:1.5px solid #fde68a; border-radius:6px; padding:12px; margin-bottom:16px;">
        <div style="font-size:11px; font-weight:800; color:#b45309; text-transform:uppercase; margin-bottom:4px;">
          📝 OBSERVACIONES Y ÓRDENES ESPECÍFICAS DEL FACULTATIVO:
        </div>
        <div style="font-size:13px; font-weight:600; color:#78350f; line-height:1.4;">
          ${escapeHTML(proto.doctorNotes)}
        </div>
      </div>
    ` : ''}

    <!-- CHECKLIST TÉCNICO TSID -->
    <div class="tsid-checklist">
      <div style="font-size:11px; font-weight:800; color:#004868; text-transform:uppercase; margin-bottom:8px;">
        COMPROBACIONES TÉCNICAS TSID ANTES DE DISPARAR:
      </div>
      <label>◻️ Confirmar identidad inequívoca del paciente y NHC (${escapeHTML(p.nhc)})</label>
      <label>◻️ Micción previa forzada verificada (Vejiga vacía antes de posicionar en camilla)</label>
      <label>◻️ Retirada de objetos metálicos (botones, cremalleras, joyas en FOV)</label>
      <label>◻️ Colocación de brazos según pauta médica: <strong>${getArmsLabel(proto.armsPosition)}</strong></label>
      <label>◻️ Tipo de prueba y cobertura verificada: <strong>${getRangeLabel(proto.scanRange)}</strong></label>
      <label>◻️ Modalidad de contraste verificada: <strong>${getContrastLabel(proto)}</strong></label>
      <label>◻️ Pauta de diurético comprobada: <strong>${getDiureticLabel(proto)}</strong></label>
      <label>◻️ Comprobación de CT de corrección de atenuación sin artefactos de movimiento respiratorio</label>
    </div>

    <div style="display:flex; justify-content:space-between; align-items:center; margin-top:20px; font-size:11px; color:#475569; border-top:1px dashed #cbd5e1; padding-top:10px;">
      <div>
        <strong>Médico Validador:</strong> ${escapeHTML(proto.doctorSign || 'Dr. Manuel Gómez Feijóo')}<br>
        Firma Electrónica Galaria · SERGAS — ${escapeHTML(proto.timestamp || '')}
      </div>
      <div style="text-align:right;">
        Firma / Iniciales TSID: _____________________
      </div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() { window.print(); }, 200);
    });
  <` + `/script>
</body>
</html>`;
  }

  // ==========================================================================
  // PLANIFICADOR INTERACTIVO FULL BODY (SECCIÓN 2 DE PROTOCOLIZACIÓN)
  // ==========================================================================
  const protoFullBodyState = {
    topY: 84,
    bottomY: 380,
    arms: 'arriba',
    bound: false
  };

  const PROTO_FROM_LANDMARKS = [
    { key: 'vertice_craneal', y: 44, cm: 0, short: 'VÉRTICE CRANEAL', label: 'Vértice Craneal' },
    { key: 'orbitomeatal', y: 68, cm: 9, short: 'ÓRBITO-MEATAL', label: 'Línea Órbito-Meatal' },
    { key: 'base_craneo', y: 84, cm: 14, short: 'BASE DE CRÁNEO', label: 'Base de Cráneo' },
    { key: 'cuello_claviculas', y: 124, cm: 28, short: 'CUELLO / CLAVÍCULAS', label: 'Cuello Bajo / Clavículas' },
    { key: 'torax_superior', y: 148, cm: 37, short: 'OPÉRCULO TORÁCICO', label: 'Opérculo Torácico' },
    { key: 'diafragma_higado', y: 198, cm: 55, short: 'CÚPULA DIAFRAGMA', label: 'Cúpula Diafragmática' },
    { key: 'crestas_iliacas', y: 286, cm: 87, short: 'CRESTAS ILÍACAS', label: 'Crestas Ilíacas / Pelvis' },
    { key: 'muslos_proximales', y: 338, cm: 106, short: 'RAÍZ DE MUSLOS', label: 'Raíz de Muslos' }
  ];

  const PROTO_TO_LANDMARKS = [
    { key: 'base_craneo_fin', y: 112, cm: 24, short: 'BASE DE CRÁNEO', label: 'Base de Cráneo / Cuello Alto' },
    { key: 'diafragma_fin', y: 214, cm: 61, short: 'DIAFRAGMA', label: 'Bases Pulmonares / Diafragma' },
    { key: 'abdomen_inferior', y: 292, cm: 89, short: 'ABDOMEN INFERIOR', label: 'Abdomen Inferior' },
    { key: 'pelvis_sinfisis', y: 342, cm: 107, short: 'SUELO PÉLVICO', label: 'Sínfisis Púbica / Pelvis' },
    { key: 'tercio_medio_muslos', y: 380, cm: 118, short: '1/3 MEDIO MUSLOS', label: 'Tercio Medio de Muslos' },
    { key: 'rodillas', y: 456, cm: 148, short: 'RODILLAS', label: 'Rodillas / Hueco Poplíteo' },
    { key: 'tercio_medio_piernas', y: 520, cm: 171, short: '1/3 MEDIO PIERNAS', label: 'Tercio Medio de Piernas' },
    { key: 'tobillos_pies', y: 588, cm: 185, short: 'PLANTAS DE LOS PIES', label: 'Plantas de los Pies' }
  ];

  function findClosestLandmark(list, yVal) {
    let best = list[0];
    let minDiff = Math.abs(yVal - best.y);
    for (let i = 1; i < list.length; i++) {
      const d = Math.abs(yVal - list[i].y);
      if (d < minDiff) {
        minDiff = d;
        best = list[i];
      }
    }
    return best;
  }

  function updateProtoFullBodyArms(armsVal) {
    const cleanVal = (armsVal === 'abdominal') ? 'almohada' : (armsVal || 'arriba');
    protoFullBodyState.arms = cleanVal;

    const gArriba = document.getElementById('protoSvgArmsArriba');
    const gAbajo = document.getElementById('protoSvgArmsAbajo');
    const gAlmohada = document.getElementById('protoSvgArmsAlmohada');
    const armsBadge = document.getElementById('protoFullBodyArmsBadge');

    if (gArriba) gArriba.style.display = cleanVal === 'arriba' ? 'block' : 'none';
    if (gAbajo) gAbajo.style.display = cleanVal === 'abajo' ? 'block' : 'none';
    if (gAlmohada) gAlmohada.style.display = cleanVal === 'almohada' ? 'block' : 'none';

    if (armsBadge) {
      if (cleanVal === 'abajo') {
        armsBadge.textContent = '🙇‍♂️ Brazos Abajo';
        armsBadge.style.background = '#f3e8ff';
        armsBadge.style.color = '#6b21a8';
      } else if (cleanVal === 'almohada') {
        armsBadge.textContent = '🛏️ Brazos en Almohada';
        armsBadge.style.background = '#d1fae5';
        armsBadge.style.color = '#065f46';
      } else {
        armsBadge.textContent = '🙆‍♂️ Brazos Arriba';
        armsBadge.style.background = '#dbeafe';
        armsBadge.style.color = '#1e40af';
      }
    }
    updateProtoFullBodySummaryText();
  }

  function updateProtoFullBodySummaryText() {
    const selFrom = document.getElementById('selectProtoFrom');
    const selTo = document.getElementById('selectProtoTo');
    const fromLm = findClosestLandmark(PROTO_FROM_LANDMARKS, protoFullBodyState.topY);
    const toLm = findClosestLandmark(PROTO_TO_LANDMARKS, protoFullBodyState.bottomY);
    const fromLabel = (selFrom && selFrom.options[selFrom.selectedIndex])
      ? selFrom.options[selFrom.selectedIndex].text.replace(/\s*\(\d+\s*cm\)/, '')
      : fromLm.label;
    const toLabel = (selTo && selTo.options[selTo.selectedIndex])
      ? selTo.options[selTo.selectedIndex].text.replace(/\s*\(\d+\s*cm\)/, '')
      : toLm.label;

    const startCm = Math.max(0, Math.round((protoFullBodyState.topY - 45) / 2.75));
    const endCm = Math.max(startCm + 15, Math.round((protoFullBodyState.bottomY - 45) / 2.75));
    const numBeds = Math.max(1, Math.min(10, Math.round((protoFullBodyState.bottomY - protoFullBodyState.topY) / 48)));
    const armsShortText = getArmsShort(protoFullBodyState.arms);

    const summaryBadge = document.getElementById('protoFullBodySummaryBadge');
    if (summaryBadge) {
      summaryBadge.textContent = `📐 Desde ${fromLabel} hasta ${toLabel} (${numBeds} ${numBeds === 1 ? 'Cama' : 'Camas'} · ${armsShortText})`;
    }

    const inputCustom = document.getElementById('inputCustomRange');
    if (inputCustom) {
      inputCustom.value = `Desde ${fromLabel} hasta ${toLabel} (${startCm}-${endCm} cm · ${numBeds} ${numBeds === 1 ? 'cama' : 'camas'} · ${armsShortText})`;
    }
  }

  function renderProtoFullBodyBox() {
    const topY = Math.max(40, Math.min(540, Math.round(protoFullBodyState.topY)));
    const bottomY = Math.max(topY + 48, Math.min(592, Math.round(protoFullBodyState.bottomY)));
    protoFullBodyState.topY = topY;
    protoFullBodyState.bottomY = bottomY;
    const height = bottomY - topY;

    const boxRect = document.getElementById('protoFullBodyBoxRect');
    if (boxRect) {
      boxRect.setAttribute('y', String(topY));
      boxRect.setAttribute('height', String(height));
    }

    const fromLm = findClosestLandmark(PROTO_FROM_LANDMARKS, topY);
    const toLm = findClosestLandmark(PROTO_TO_LANDMARKS, bottomY);
    const startCm = Math.max(0, Math.round((topY - 45) / 2.75));
    const endCm = Math.max(startCm + 15, Math.round((bottomY - 45) / 2.75));
    const numBeds = Math.max(1, Math.min(10, Math.round(height / 48)));

    const topBg = document.getElementById('protoHandleTopBg');
    const topTxt = document.getElementById('protoHandleTopText');
    if (topBg) topBg.setAttribute('y', String(topY - 14));
    if (topTxt) {
      topTxt.setAttribute('y', String(topY - 2));
      topTxt.textContent = `🔼 DESDE: ${fromLm.short} (${startCm} cm)`;
    }

    const botBg = document.getElementById('protoHandleBottomBg');
    const botTxt = document.getElementById('protoHandleBottomText');
    if (botBg) botBg.setAttribute('y', String(bottomY - 4));
    if (botTxt) {
      botTxt.setAttribute('y', String(bottomY + 8));
      botTxt.textContent = `🔽 HASTA: ${toLm.short} (${endCm} cm)`;
    }

    // Dibujar camas internas dentro del FOV
    const bedsGroup = document.getElementById('protoFullBodyBedsGroup');
    if (bedsGroup) {
      const bedH = height / numBeds;
      let bedsHtml = '';
      for (let i = 0; i < numBeds; i++) {
        const by = Math.round(topY + i * bedH);
        if (i > 0) {
          bedsHtml += `<line x1="56" y1="${by}" x2="304" y2="${by}" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4,4" opacity="0.75"/>`;
        }
        if (bedH >= 26) {
          bedsHtml += `<text x="62" y="${by + 13}" font-family="'JetBrains Mono',monospace" font-size="7.5" font-weight="800" fill="#bae6fd" opacity="0.9">CAMA ${i + 1}</text>`;
        }
      }
      bedsGroup.innerHTML = bedsHtml;
    }

    const readoutCm = document.getElementById('protoFullBodyReadoutCm');
    if (readoutCm) readoutCm.textContent = `${startCm} cm – ${endCm} cm`;
    const readoutBeds = document.getElementById('protoFullBodyReadoutBeds');
    if (readoutBeds) readoutBeds.textContent = `${numBeds} ${numBeds === 1 ? 'Cama' : 'Camas'}`;

    updateProtoFullBodySummaryText();
  }

  function syncProtoBoxFromDropdowns() {
    const selFrom = document.getElementById('selectProtoFrom');
    const selTo = document.getElementById('selectProtoTo');
    if (!selFrom || !selTo) return;
    const fromOpt = selFrom.options[selFrom.selectedIndex];
    const toOpt = selTo.options[selTo.selectedIndex];
    let y1 = fromOpt ? parseInt(fromOpt.getAttribute('data-y') || '84', 10) : 84;
    let y2 = toOpt ? parseInt(toOpt.getAttribute('data-y') || '380', 10) : 380;
    if (y2 <= y1 + 35) {
      y2 = Math.min(588, y1 + 60);
    }
    protoFullBodyState.topY = y1;
    protoFullBodyState.bottomY = y2;
  }

  function applyProtoRangePresetToFullBody(rangeKey, syncRadio = true) {
    const selFrom = document.getElementById('selectProtoFrom');
    const selTo = document.getElementById('selectProtoTo');
    let fromVal = 'base_craneo';
    let toVal = 'tercio_medio_muslos';

    if (rangeKey === 'cuerpo_total') {
      fromVal = 'vertice_craneal';
      toVal = 'tobillos_pies';
    } else if (rangeKey === 'cabeza_cuello_cuerpo') {
      fromVal = 'vertice_craneal';
      toVal = 'tercio_medio_muslos';
    } else if (rangeKey === 'mmii') {
      fromVal = 'crestas_iliacas';
      toVal = 'tobillos_pies';
    } else if (rangeKey === 'cerebro') {
      fromVal = 'vertice_craneal';
      toVal = 'base_craneo_fin';
    } else if (rangeKey === 'base_craneo_muslos') {
      fromVal = 'base_craneo';
      toVal = 'tercio_medio_muslos';
    }

    if (rangeKey !== 'otro_rango') {
      if (selFrom) selFrom.value = fromVal;
      if (selTo) selTo.value = toVal;
      syncProtoBoxFromDropdowns();
    }
    if (syncRadio) {
      setRadioOption('range', rangeKey);
    }
    renderProtoFullBodyBox();
  }

  function detectMatchingRangePreset(fromKey, toKey) {
    if (fromKey === 'base_craneo' && toKey === 'tercio_medio_muslos') return 'base_craneo_muslos';
    if (fromKey === 'vertice_craneal' && toKey === 'tobillos_pies') return 'cuerpo_total';
    if (fromKey === 'vertice_craneal' && toKey === 'tercio_medio_muslos') return 'cabeza_cuello_cuerpo';
    if ((fromKey === 'crestas_iliacas' || fromKey === 'muslos_proximales') && toKey === 'tobillos_pies') return 'mmii';
    if (fromKey === 'vertice_craneal' && toKey === 'base_craneo_fin') return 'cerebro';
    return 'otro_rango';
  }

  function setupProtoFullBodyPlanner() {
    if (protoFullBodyState.bound) return;
    const svg = document.getElementById('protoFullBodySvg');
    const boxGroup = document.getElementById('protoFullBodyBoxGroup');
    const handleTop = document.getElementById('protoFullBodyHandleTop');
    const handleBottom = document.getElementById('protoFullBodyHandleBottom');
    const selFrom = document.getElementById('selectProtoFrom');
    const selTo = document.getElementById('selectProtoTo');
    if (!svg || !boxGroup) return;

    protoFullBodyState.bound = true;

    if (selFrom) {
      selFrom.addEventListener('change', () => {
        syncProtoBoxFromDropdowns();
        const preset = detectMatchingRangePreset(selFrom.value, selTo ? selTo.value : '');
        setRadioOption('range', preset);
        renderProtoFullBodyBox();
      });
    }
    if (selTo) {
      selTo.addEventListener('change', () => {
        syncProtoBoxFromDropdowns();
        const preset = detectMatchingRangePreset(selFrom ? selFrom.value : '', selTo.value);
        setRadioOption('range', preset);
        renderProtoFullBodyBox();
      });
    }

    let dragMode = null; // 'top' | 'bottom' | 'move'
    let startSvgY = 0;
    let initTop = 84;
    let initBot = 380;

    function clientYToSvgY(clientY) {
      const rect = svg.getBoundingClientRect();
      if (!rect.height) return 200;
      return ((clientY - rect.top) / rect.height) * 610;
    }

    function startDrag(e, mode) {
      e.preventDefault();
      e.stopPropagation();
      dragMode = mode;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      startSvgY = clientYToSvgY(clientY);
      initTop = protoFullBodyState.topY;
      initBot = protoFullBodyState.bottomY;
    }

    if (handleTop) {
      handleTop.addEventListener('mousedown', (e) => startDrag(e, 'top'));
      handleTop.addEventListener('touchstart', (e) => startDrag(e, 'top'), { passive: false });
    }
    if (handleBottom) {
      handleBottom.addEventListener('mousedown', (e) => startDrag(e, 'bottom'));
      handleBottom.addEventListener('touchstart', (e) => startDrag(e, 'bottom'), { passive: false });
    }
    boxGroup.addEventListener('mousedown', (e) => {
      if ((handleTop && handleTop.contains(e.target)) || (handleBottom && handleBottom.contains(e.target))) return;
      startDrag(e, 'move');
    });
    boxGroup.addEventListener('touchstart', (e) => {
      if ((handleTop && handleTop.contains(e.target)) || (handleBottom && handleBottom.contains(e.target))) return;
      startDrag(e, 'move');
    }, { passive: false });

    function onMove(e) {
      if (!dragMode) return;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const dy = clientYToSvgY(clientY) - startSvgY;

      if (dragMode === 'top') {
        protoFullBodyState.topY = Math.max(42, Math.min(initBot - 52, initTop + dy));
      } else if (dragMode === 'bottom') {
        protoFullBodyState.bottomY = Math.max(initTop + 52, Math.min(590, initBot + dy));
      } else if (dragMode === 'move') {
        const h = initBot - initTop;
        const newTop = Math.max(42, Math.min(590 - h, initTop + dy));
        protoFullBodyState.topY = newTop;
        protoFullBodyState.bottomY = newTop + h;
      }

      const fLm = findClosestLandmark(PROTO_FROM_LANDMARKS, protoFullBodyState.topY);
      const tLm = findClosestLandmark(PROTO_TO_LANDMARKS, protoFullBodyState.bottomY);
      if (selFrom) selFrom.value = fLm.key;
      if (selTo) selTo.value = tLm.key;
      const preset = detectMatchingRangePreset(fLm.key, tLm.key);
      setRadioOption('range', preset);
      renderProtoFullBodyBox();
    }

    function onEnd() {
      dragMode = null;
    }

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);
  }

  // ==========================================================================
  // HELPERS DE FORMATEO Y ETIQUETAS
  // ==========================================================================
  function getArmsLabel(val) {
    if (val === 'abajo') return 'Brazos Abajo (Arms Down)';
    if (val === 'almohada' || val === 'abdominal') return 'Brazos en Almohada (Soporte Toraco-Abdominal)';
    return 'Brazos Arriba (Arms Up)';
  }

  function getArmsShort(val) {
    if (val === 'abajo') return 'Brazos Abajo';
    if (val === 'almohada' || val === 'abdominal') return 'Brazos en Almohada';
    return 'Brazos Arriba';
  }

  function getArmsDescription(val) {
    if (val === 'abajo') return 'Obligatorio en cuello/cabeza o por hombro doloroso/prótesis';
    if (val === 'almohada' || val === 'abdominal') return 'Apoyados sobre almohada con cincha de confort';
    return 'Con apoyo cefálico para evitar corte de tórax/abdomen';
  }

  function getRangeLabel(val, proto) {
    if (proto && proto.scanFromLabel && proto.scanToLabel) {
      return `Desde ${proto.scanFromLabel} hasta ${proto.scanToLabel} (${proto.scanStartCm || 14}-${proto.scanEndCm || 118} cm · ${proto.scanNumBeds || 6} camas)`;
    }
    if (val === 'cabeza_cuello_cuerpo') return 'Cabeza-Cuello + Cuerpo Entero (Protocolo Combinado 2 Fases)';
    if (val === 'mmii') return 'MMII (Desde Pelvis/Muslos hasta Pies)';
    if (val === 'cuerpo_total') return 'Full Body / Cuerpo Total (Vértice a Pies)';
    if (val === 'cerebro') return 'Cerebro Dedicado (NeuroPET 3D)';
    if (val === 'otro_rango') return 'Rango Personalizado';
    return 'Base de Cráneo a Tercio Medio de Muslos (Estándar)';
  }

  function getRangeShort(valOrProto) {
    if (typeof valOrProto === 'object' && valOrProto) {
      if (valOrProto.scanFromLabel && valOrProto.scanToLabel) {
        return `${valOrProto.scanFromLabel} ➔ ${valOrProto.scanToLabel}`;
      }
      valOrProto = valOrProto.scanRange;
    }
    const val = valOrProto;
    if (val === 'cabeza_cuello_cuerpo') return 'Cabeza-Cuello + Cuerpo';
    if (val === 'mmii') return 'MMII (Cadera a Pies)';
    if (val === 'cuerpo_total') return 'Full Body (Vértice a Pies)';
    if (val === 'cerebro') return 'Cerebro 3D';
    if (val === 'otro_rango') return 'Rango Personalizado';
    return 'Base Cráneo ➔ Muslos';
  }

  function getHydrationLabel(val) {
    if (val === 'box_no' || val === 'restriccion' || val === 'ayuno') return '🚫 Sin Hidratación en Box (Restricción)';
    return '💧 Hidratación en Box (1.000 mL de agua oral)';
  }

  function getHydrationShort(val) {
    if (val === 'box_no' || val === 'restriccion' || val === 'ayuno') return 'Sin Hidratación Box';
    return 'Hidratación en Box';
  }

  function getDiureticLabel(protoOrVal) {
    const val = typeof protoOrVal === 'object' && protoOrVal ? protoOrVal.diuretic : protoOrVal;
    if (val === 'si_20mg_post' || val === 'diur_post' || val === 'si_15min_antes' || val === 'diur_si') {
      return '💉 SÍ: Furosemida 20 mg (Post-Inyección)';
    }
    return '❌ NO Administrar Diurético';
  }

  function getDiureticShort(protoOrVal) {
    const val = typeof protoOrVal === 'object' && protoOrVal ? protoOrVal.diuretic : protoOrVal;
    if (val === 'si_20mg_post' || val === 'diur_post' || val === 'si_15min_antes' || val === 'diur_si') {
      return 'Seguril post-inyección';
    }
    return 'Sin diurético';
  }

  function getContrastLabel(protoOrVal, minutes) {
    if (!protoOrVal) return 'Sin Contraste (CT Baja Dosis)';
    const type = typeof protoOrVal === 'object' && protoOrVal ? (protoOrVal.contrastType || protoOrVal.contrast) : protoOrVal;
    const mins = typeof protoOrVal === 'object' && protoOrVal ? (protoOrVal.contrastBoxMinutes || protoOrVal.contrastPreMinutes || 15) : (minutes || 15);

    if (type === 'en_maquina' || type === 'civ_portal') {
      return '💉 Contraste en Máquina (CT con CIV en Gantry)';
    }
    if (type === 'en_box' || type === 'oral_gastrografin' || type === 'oral_gastrografin_15min' || type === 'oral_agua') {
      return `💉 Contraste IV en Box (${mins} min antes de la prueba)`;
    }
    return '❌ Sin Contraste (CT Baja Dosis)';
  }

  function getContrastShort(protoOrVal) {
    if (!protoOrVal) return 'Sin contraste';
    const type = typeof protoOrVal === 'object' && protoOrVal ? (protoOrVal.contrastType || protoOrVal.contrast) : protoOrVal;
    const mins = typeof protoOrVal === 'object' && protoOrVal ? (protoOrVal.contrastBoxMinutes || protoOrVal.contrastPreMinutes || 15) : 15;

    if (type === 'en_maquina' || type === 'civ_portal') {
      return 'Contraste en máquina';
    }
    if (type === 'en_box' || type === 'oral_gastrografin' || type === 'oral_gastrografin_15min' || type === 'oral_agua') {
      return `Contraste IV box (${mins}m antes)`;
    }
    return 'Sin contraste';
  }

  function getContrastPreLabel(protoOrVal, minutes) {
    return getContrastLabel(protoOrVal, minutes);
  }

  function getContrastGantryLabel(protoOrVal) {
    return getContrastLabel(protoOrVal);
  }

  function getMedicationsBadgeList(proto) {
    if (!proto) return '';
    const list = [];
    if (proto.premedBrownFatPropranolol) list.push('⭐ Propranolol 20-40mg (1 HORA ANTES de FDG)');
    if (proto.premedBrownFatDiazepam) list.push('Diazepam 5mg (30-45m antes)');
    if (proto.ansiolitico) list.push('Lorazepam/Midazolam (30m antes)');
    if (proto.analgesico) list.push('Analgésico IV (20m antes)');
    if (proto.antiemetico) list.push('Antiemético IV');
    return list.join(' • ');
  }

  function getPriorityClass(prio) {
    const p = String(prio || '').toUpperCase();
    if (p.includes('P1') || p.includes('URG')) return 'is-p1 p1';
    if (p.includes('P2') || p.includes('PREF')) return 'is-p2 p2';
    return 'is-p3 p3';
  }

  function formatCurrentDateTime() {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins} h`;
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ==========================================================================
  // COMPORTAMIENTO DE RADIO CARDS INTERACTIVAS
  // ==========================================================================
  function setupInteractiveRadioCards() {
    const cardGroups = [
      'uptakeOptionsGrid',
      'armsOptionsGrid',
      'vascularOptionsGrid',
      'rangeOptionsGrid',
      'hydrationOptionsGrid',
      'diureticOptionsGrid',
      'contrastOptionsGrid',
      'tardiaOptionsGrid'
    ];

    cardGroups.forEach(groupId => {
      const container = document.getElementById(groupId);
      if (!container) return;

      container.addEventListener('click', (e) => {
        // Si el usuario hace clic o interactúa con el input de minutos o texto, asegurar selección de la tarjeta sin anular el foco
        if (e.target.tagName === 'INPUT' && (e.target.type === 'number' || e.target.type === 'text')) {
          const parentCard = e.target.closest('.option-radio-card');
          if (parentCard) {
            container.querySelectorAll('.option-radio-card').forEach(c => c.classList.remove('selected'));
            parentCard.classList.add('selected');
            const input = parentCard.querySelector('input[type="radio"]');
            if (input) input.checked = true;
          }
          return;
        }

        const card = e.target.closest('.option-radio-card');
        if (!card) return;

        container.querySelectorAll('.option-radio-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');

        const input = card.querySelector('input[type="radio"]');
        if (input) input.checked = true;

        if (groupId === 'uptakeOptionsGrid') {
          if (elements.inputCustomUptake) elements.inputCustomUptake.value = '';
        }

        if (groupId === 'armsOptionsGrid') {
          updateProtoFullBodyArms(card.dataset.val || 'arriba');
        }

        if (groupId === 'rangeOptionsGrid') {
          if (elements.wrapCustomRange) {
            elements.wrapCustomRange.style.display = 'flex';
          }
          applyProtoRangePresetToFullBody(card.dataset.val || 'base_craneo_muslos', false);
        }
      });
    });

    if (elements.inputCustomUptake) {
      elements.inputCustomUptake.addEventListener('input', () => {
        const val = elements.inputCustomUptake.value.trim();
        if (val) {
          const container = document.getElementById('uptakeOptionsGrid');
          if (container) {
            container.querySelectorAll('.option-radio-card').forEach(c => c.classList.remove('selected'));
            const checkedRadio = container.querySelector('input[type="radio"]:checked');
            if (checkedRadio) checkedRadio.checked = false;
          }
        }
      });
    }
  }

  function setRadioOption(fieldGroup, value) {
    let containerId = '';
    let radioName = '';

    if (fieldGroup === 'uptake') { containerId = 'uptakeOptionsGrid'; radioName = 'radioUptake'; }
    else if (fieldGroup === 'arms') { containerId = 'armsOptionsGrid'; radioName = 'radioArms'; }
    else if (fieldGroup === 'vascular') { containerId = 'vascularOptionsGrid'; radioName = 'radioVascular'; }
    else if (fieldGroup === 'range') { containerId = 'rangeOptionsGrid'; radioName = 'radioRange'; }
    else if (fieldGroup === 'hydration') { containerId = 'hydrationOptionsGrid'; radioName = 'radioHydration'; }
    else if (fieldGroup === 'diuretic') { containerId = 'diureticOptionsGrid'; radioName = 'radioDiuretic'; }
    else if (fieldGroup === 'contrast') { containerId = 'contrastOptionsGrid'; radioName = 'radioContrast'; }
    else if (fieldGroup === 'tardia') { containerId = 'tardiaOptionsGrid'; radioName = 'radioTardia'; }

    const container = document.getElementById(containerId);
    if (!container) return;

    container.querySelectorAll('.option-radio-card').forEach(card => {
      const cardVal = card.dataset.val;
      const isMatch = String(cardVal) === String(value);
      card.classList.toggle('selected', isMatch);
      const radio = card.querySelector(`input[name="${radioName}"]`);
      if (radio) radio.checked = isMatch;
    });
  }

  function getSelectedRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
  }

  // ==========================================================================
  // EVENT LISTENERS DE LA APLICACIÓN
  // ==========================================================================
  function setupEventListeners() {
    // Presets de fecha
    elements.btnDateToday.addEventListener('click', () => {
      setActiveDateFilter('today', elements.btnDateToday);
    });
    elements.btnDateTomorrow.addEventListener('click', () => {
      setActiveDateFilter('tomorrow', elements.btnDateTomorrow);
    });
    elements.btnDateAll.addEventListener('click', () => {
      setActiveDateFilter('all', elements.btnDateAll);
    });
    elements.inputCustomDate.addEventListener('change', () => {
      const val = elements.inputCustomDate.value;
      if (val) {
        document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        state.activeFilterDate = val;
        render();
      }
    });

    const btnPrevDay = document.getElementById('btnDatePrevDay');
    const btnNextDay = document.getElementById('btnDateNextDay');
    if (btnPrevDay) {
      btnPrevDay.addEventListener('click', () => stepDate(-1));
    }
    if (btnNextDay) {
      btnNextDay.addEventListener('click', () => stepDate(1));
    }

    // Alternadores de vista principal (Agenda vs Carpeta No Triables)
    if (elements.btnSwitchAgenda) {
      elements.btnSwitchAgenda.addEventListener('click', () => switchConsoleView('agenda'));
    }
    if (elements.btnSwitchUntriaged) {
      elements.btnSwitchUntriaged.addEventListener('click', () => switchConsoleView('untriaged_folder'));
    }

    // Pestañas de estado (Todos, Pendientes, Protocolizados, Carpeta No Triables)
    elements.statusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.dataset.status === 'untriaged') {
          switchConsoleView('untriaged_folder');
          return;
        }
        if (state.activeMainView !== 'agenda') {
          switchConsoleView('agenda');
        }
        elements.statusTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        state.activeFilterStatus = tab.dataset.status;
        render();
      });
    });

    // Filtro trazador
    elements.selectTracer.addEventListener('change', () => {
      state.activeFilterTracer = elements.selectTracer.value;
      render();
    });

    // Filtro tipo de prueba
    if (elements.selectTestType) {
      elements.selectTestType.addEventListener('change', () => {
        state.activeFilterTestType = elements.selectTestType.value;
        render();
      });
    }

    // Búsqueda en vivo
    elements.searchInput.addEventListener('input', () => {
      state.searchTerm = elements.searchInput.value.trim();
      render();
    });

    // Alternador de vistas
    elements.btnViewCards.addEventListener('click', () => {
      elements.btnViewCards.classList.add('active');
      elements.btnViewTable.classList.remove('active');
      state.currentView = 'cards';
      renderPatientList();
    });
    elements.btnViewTable.addEventListener('click', () => {
      elements.btnViewTable.classList.add('active');
      elements.btnViewCards.classList.remove('active');
      state.currentView = 'table';
      renderPatientList();
    });

    // Acciones del modal de protocolo
    elements.btnCloseProtocolModal.addEventListener('click', closeProtocolModal);
    elements.btnCancelProtocol.addEventListener('click', closeProtocolModal);
    elements.btnSaveProtocol.addEventListener('click', saveProtocolFromModal);
    elements.btnPrintProtocolSheet.addEventListener('click', printProtocolSheet);
    elements.btnViewVolanteFromModal.addEventListener('click', () => {
      if (state.selectedPatient) {
        openVolanteModal(state.selectedPatient.id);
      }
    });

    elements.protocolModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.protocolModalBackdrop) closeProtocolModal();
    });

    elements.btnCloseVolanteModal.addEventListener('click', closeVolanteModal);
    elements.btnCloseVolanteModalBtn.addEventListener('click', closeVolanteModal);
    elements.btnPrintVolanteFromViewer.addEventListener('click', printVolanteFromViewer);
    elements.volanteModalBackdrop.addEventListener('click', (e) => {
      if (e.target === elements.volanteModalBackdrop) closeVolanteModal();
    });

    // Eventos del Visor de Imágenes SIDI (SERGAS PACS)
    if (elements.btnViewSidiFromModal) {
      elements.btnViewSidiFromModal.addEventListener('click', () => {
        if (state.selectedPatient) {
          openSidiModal(state.selectedPatient.id);
        }
      });
    }
    if (elements.btnCloseSidiModal) {
      elements.btnCloseSidiModal.addEventListener('click', closeSidiModal);
    }
    if (elements.btnCloseSidiModalBtn) {
      elements.btnCloseSidiModalBtn.addEventListener('click', closeSidiModal);
    }
    if (elements.sidiModalBackdrop) {
      elements.sidiModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.sidiModalBackdrop) closeSidiModal();
      });
    }
    if (elements.btnLaunchExternalSidi) {
      elements.btnLaunchExternalSidi.addEventListener('click', launchExternalSidi);
    }
    if (elements.btnSidiOrderTardia) {
      elements.btnSidiOrderTardia.addEventListener('click', () => {
        const pat = state.selectedPatient;
        closeSidiModal();
        if (pat) openModalPedirTardia(pat.id);
      });
    }
    if (elements.btnSidiAuthorizeDischarge) {
      elements.btnSidiAuthorizeDischarge.addEventListener('click', () => {
        const pat = state.selectedPatient;
        if (pat) autorizarAltaPaciente(pat.id);
      });
    }
    if (elements.btnSidiOpenProtocol) {
      elements.btnSidiOpenProtocol.addEventListener('click', () => {
        const pat = state.selectedPatient;
        closeSidiModal();
        if (pat) openProtocolModal(pat.id);
      });
    }

    // Sincronización manual en red
    if (elements.btnSyncPatients) {
      elements.btnSyncPatients.addEventListener('click', () => reloadFromTriage());
    }

    // Escuchar cambios en vivo desde el Programa de Triaje (Storage y BroadcastChannel)
    window.addEventListener('storage', async (e) => {
      if (!e.key || e.key === 'PET_TRIAGE_CITED_PATIENTS_V1' || e.key === 'PET_DATABASE_MASTER_V4' || e.key === 'pet_ct_peonada_assignments') {
        loadStoredProtocols();
        await loadPatientsData(true);
        render();
      }
    });

    if (petClinicalBroadcast) {
      petClinicalBroadcast.addEventListener('message', async (ev) => {
        if (ev.data && (ev.data.type === 'TRIAGE_DATABASE_UPDATED' || ev.data.type === 'PETITION_CREATED_OR_UPDATED')) {
          loadStoredProtocols();
          await loadPatientsData(true);
          render();
        }
      });
    }

    // Sondeo periódico cada 15 segundos (solo si no hay modales ni desplegables abiertos)
    setInterval(async () => {
      if (!state.selectedPatient && !state.tardiaTargetPatient && (!document.activeElement || document.activeElement.tagName !== 'SELECT')) {
        await loadPatientsData();
        render();
      }
    }, 15000);
  }

  async function reloadFromTriage() {
    const icon1 = document.getElementById('syncIcon');
    const icon2 = document.getElementById('reloadTriageIcon');
    [icon1, icon2].forEach(icon => {
      if (icon) {
        icon.style.display = 'inline-block';
        icon.style.transform = 'rotate(360deg)';
        icon.style.transition = 'transform 0.6s ease';
      }
    });

    loadStoredProtocols();
    await loadPatientsData(true);

    const allCited = state.allPatients.filter(p => !p.noTriable && p.estadoTriaje !== 'No Triable' && p.fechaCita && p.fechaCita !== 'Pendiente de Triaje' && !String(p.fechaCita).includes('SIN AGENDAR'));
    if (allCited.length > 0) {
      const todayStr = getTodayStr();
      const tomorrowStr = getTomorrowStr();
      const targetDate = state.activeFilterDate === 'today' ? todayStr : (state.activeFilterDate === 'tomorrow' ? tomorrowStr : state.activeFilterDate);
      if (state.activeFilterDate !== 'all' && allCited.filter(p => p.fechaCita === targetDate).length === 0) {
        state.activeFilterDate = 'all';
        document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
        if (elements.btnDateAll) elements.btnDateAll.classList.add('active');
        if (elements.inputCustomDate) elements.inputCustomDate.value = '';
      }
    }

    render();

    setTimeout(() => {
      [icon1, icon2].forEach(icon => {
        if (icon) {
          icon.style.transform = 'none';
          icon.style.transition = 'none';
        }
      });
    }, 600);

    showToast(`✅ Recargados ${allCited.length} paciente(s) citado(s) desde el Programa de Triaje`, 'success');
  }

  function stepDate(delta) {
    let cur = state.activeFilterDate;
    if (cur === 'today') cur = getTodayStr();
    else if (cur === 'tomorrow') cur = getTomorrowStr();
    else if (cur === 'all' || !cur) cur = getTodayStr();

    const [y, m, d] = cur.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    const nextStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
    if (elements.inputCustomDate) elements.inputCustomDate.value = nextStr;
    state.activeFilterDate = nextStr;
    render();
  }

  function setActiveDateFilter(type, btnElement) {
    document.querySelectorAll('.date-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    elements.inputCustomDate.value = '';
    state.activeFilterDate = type;
    render();
  }

  // ==========================================================================
  // TOASTS Y NOTIFICACIONES
  // ==========================================================================
  function showToast(message, type = 'info') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // ==========================================================================
  // NAVEGACIÓN Y ACCESO DIRECTO ENTRE SECCIONES DEL PROTOCOLO
  // ==========================================================================
  function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    const body = document.getElementById('protocolModalBody');
    if (!section || !body) return;

    updateActiveNavTab(sectionId);

    // Calcular la posición relativa dentro del contenedor con scroll
    const bodyRect = body.getBoundingClientRect();
    const sectionRect = section.getBoundingClientRect();
    const targetScrollTop = body.scrollTop + (sectionRect.top - bodyRect.top) - 15;

    body.scrollTo({
      top: Math.max(0, targetScrollTop),
      behavior: 'smooth'
    });
  }

  function updateActiveNavTab(targetSectionId) {
    const tabBtns = document.querySelectorAll('.protocol-tab-btn');
    tabBtns.forEach(btn => {
      const isMatch = btn.dataset.target === targetSectionId;
      btn.classList.toggle('active', isMatch);
      if (isMatch) {
        btn.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
      }
    });
  }

  function setupProtocolNavTabs() {
    const tabBtns = document.querySelectorAll('.protocol-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = btn.dataset.target;
        if (targetId) {
          scrollToSection(targetId);
        }
      });
    });

    const modalBody = document.getElementById('protocolModalBody');
    if (modalBody) {
      const sectionIds = ['sectionUptake', 'sectionArmsRange', 'sectionHydration', 'sectionMedications', 'sectionTardia', 'sectionSignature'];

      let scrollTimeout;
      modalBody.addEventListener('scroll', () => {
        if (scrollTimeout) return;
        scrollTimeout = setTimeout(() => {
          scrollTimeout = null;
          const bodyTop = modalBody.getBoundingClientRect().top;
          let currentSectionId = sectionIds[0];

          for (let i = 0; i < sectionIds.length; i++) {
            const el = document.getElementById(sectionIds[i]);
            if (el) {
              const rect = el.getBoundingClientRect();
              if (rect.top - bodyTop <= 160) {
                currentSectionId = sectionIds[i];
              }
            }
          }
          updateActiveNavTab(currentSectionId);
        }, 80);
      }, { passive: true });
    }
  }

  // ==========================================================================
  // API GLOBAL EXPUESTA
  // ==========================================================================
  window.consolaApp = {
    openProtocolModal: openProtocolModal,
    openVolanteModal: openVolanteModal,
    openSidiModal: openSidiModal,
    closeSidiModal: closeSidiModal,
    openModalPedirTardia: openModalPedirTardia,
    openTardiaVisualFromProtocol: openTardiaVisualFromProtocol,
    closeModalPedirTardia: closeModalPedirTardia,
    guardarPautaTardia: guardarPautaTardia,
    anularPautaTardia: anularPautaTardia,
    pedirTardiaRapidaDesdeFila: pedirTardiaRapidaDesdeFila,
    anularTardiaRapidaDesdeFila: anularTardiaRapidaDesdeFila,
    autorizarAltaPaciente: autorizarAltaPaciente,

    // Carpeta de Peticiones No Triables
    switchConsoleView: switchConsoleView,
    selectFolderPriority: selectFolderPriority,
    sendUntriagedToTriage: sendUntriagedToTriage,
    reloadFromTriage: reloadFromTriage,

    scrollToSection: scrollToSection,
    resetFilters: () => {
      state.activeFilterDate = 'today';
      state.activeFilterStatus = 'all';
      state.activeFilterTracer = 'all';
      state.activeFilterTestType = 'all';
      state.searchTerm = '';
      elements.searchInput.value = '';
      elements.selectTracer.value = 'all';
      if (elements.selectTestType) elements.selectTestType.value = 'all';
      elements.btnDateToday.click();
      render();
    }
  };

})();
