/**
 * ==============================================================================
 * PET/CT TRIAGE & AUTOMATED SCHEDULER - INTERACTIVE SLOT MANAGEMENT MODAL
 * ==============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
  function getCurrentMonday() {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = (day === 0 ? -6 : 1) - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    return monday;
  }

  // Catálogo Maestro Oficial de Tratamientos y Radiofármacos PET/CT (Galaria · SERGAS)
  const MASTER_TREATMENTS = [
    { id: "18F-FDG", name: "18F-FDG", label: "18F-FDG (Oncológico / Inflamación)", badgeClass: "fdg" },
    { id: "Fluor-PSMA", name: "Fluor-PSMA", label: "Fluor-PSMA / 18F-PSMA (Próstata)", badgeClass: "psma" },
    { id: "68Ga-PSMA", name: "68Ga-PSMA", label: "68Ga-PSMA (Galio-68 Próstata)", badgeClass: "ga68" },
    { id: "68Ga-DOTATATE", name: "68Ga-DOTATATE / Somatostatina", label: "68Ga-DOTATATE / Somatostatina (TNE)", badgeClass: "ga68" },
    { id: "18F-Colina", name: "18F-Colina", label: "18F-Colina (Próstata / Paratiroides)", badgeClass: "colina" },
    { id: "18F-DOPA", name: "18F-DOPA", label: "18F-DOPA (Neurología / Parkinson / TNE)", badgeClass: "dopa" },
    { id: "18F-Florbetapir", name: "18F-Florbetapir / Amiloide", label: "18F-Florbetapir / Amiloide (Alzheimer)", badgeClass: "neuro" },
    { id: "18F-Flutemetamol", name: "18F-Flutemetamol / Tau", label: "18F-Flutemetamol / Tau (Demencias)", badgeClass: "neuro" },
    { id: "18F-FDG-Neuro", name: "18F-FDG Cerebral", label: "18F-FDG Cerebral / Epilepsia", badgeClass: "neuro" },
    { id: "177Lu-Terapias", name: "177Lu Terapias", label: "177Lu-DOTATATE / 177Lu-PSMA (Radioligandos)", badgeClass: "terapia" }
  ];

  function getDefaultAgendaConfig() {
    return {
      weeklyTemplate: {
        1: { // Lunes
          morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["18F-FDG", "68Ga-PSMA", "68Ga-DOTATATE / Somatostatina"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] }
        },
        2: { // Martes
          morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["Fluor-PSMA", "18F-FDG"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["Fluor-PSMA", "18F-FDG"] }
        },
        3: { // Miércoles
          morning: { active: true, startTime: "08:00", endTime: "11:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-Colina"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-Colina", "18F-FDG"] }
        },
        4: { // Jueves
          morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["18F-FDG", "68Ga-PSMA", "68Ga-DOTATATE / Somatostatina"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] }
        },
        5: { // Viernes
          morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["18F-FDG", "68Ga-PSMA", "68Ga-DOTATATE / Somatostatina"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] }
        },
        6: { // Sábado
          morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["18F-FDG", "Fluor-PSMA"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] }
        },
        0: { // Domingo
          morning: { active: false, startTime: "09:00", endTime: "12:00", intervalMin: 30, maxSlots: 4, treatments: ["18F-FDG"] },
          afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 4, treatments: ["18F-FDG"] }
        }
      },
      specificDates: {},
      customTreatments: []
    };
  }

  const state = {
    baseDate: getCurrentMonday(),
    selectedWeekIndex: 0,
    submissions: [],
    confirmations: JSON.parse(localStorage.getItem('pet_ct_confirmations') || '{}'),
    peonadaAssignments: JSON.parse(localStorage.getItem('pet_ct_peonada_assignments') || '{}'),
    freedSlots: JSON.parse(localStorage.getItem('pet_ct_freed_slots') || '{}'),
    audioguiaSent: JSON.parse(localStorage.getItem('pet_ct_audioguia_sent') || '{}'),
    agendaConfig: JSON.parse(localStorage.getItem('pet_ct_agenda_config') || 'null') || getDefaultAgendaConfig(),
    activeAgendaDayDate: null,
    activeAgendaScope: 'specific',
    proposalsByPriority: { p1: [], p2: [], p3: [] },
    occupiedMap: {},
    activeModalPatient: null,
    activePeonadaPatient: null,
    selectedPeonadaTime: null,
    confirmFilter: 'all'
  };
  window.state = state;

  // ==============================================================================
  // GESTIÓN DE PACIENTES SIN CITAR Y PROTOCOLO HOSPITALIZADOS / MOV. REDUCIDA
  // ==============================================================================
  if (localStorage.getItem('PET_UNCITED_INITIALIZED_V7') !== 'true') {
    try {
      localStorage.removeItem('pet_ct_peonada_assignments');
      localStorage.removeItem('pet_ct_confirmations');
      localStorage.removeItem('pet_ct_freed_slots');
      localStorage.removeItem('pet_ct_audioguia_sent');
      localStorage.removeItem('PET_TRIAGE_CITED_PATIENTS_V1');
      localStorage.setItem('PET_UNCITED_INITIALIZED_V7', 'true');
      state.peonadaAssignments = {};
      state.confirmations = {};
      state.freedSlots = {};
      state.audioguiaSent = {};
    } catch (e) { }
  }

  /**
   * Determina si un paciente es de turno tardío / último del día:
   * Pacientes ingresados en hospital o con movilidad reducida (silla de ruedas, camilla).
   */
  function getPatientMobilityHospitalizationInfo(p) {
    if (!p) return { isLateShift: false, isHospitalized: false, isReducedMobility: false, mobilityType: 'autónomo', label: '' };
    const raw = p.raw || (state.rawSubmissionsMap && (state.rawSubmissionsMap[p.id] || state.rawSubmissionsMap[p.nhc])) || {};

    // 1. Ingresado
    const ingVal = String(raw["¿El paciente está ingresado?"] || raw.ingresado || raw["Ingresado"] || '').trim().toLowerCase();
    const motivo = String(p.motivo || raw["Motivo de Solicitud"] || '').toLowerCase();
    const isHospitalized = (ingVal === 'sí' || ingVal === 'si' || ingVal === 'yes' || motivo.includes('ingresado') || motivo.includes('hospitalizado'));

    // 2. Movilidad / Traslado
    const movVal = String(raw["Movilidad / Traslado"] || raw.movilidad || raw["Movilidad"] || '').trim().toLowerCase();
    const alertas = String(raw["Alertas Clínicas"] || raw["Alertas Técnicas"] || '').toLowerCase();
    const isReducedMobility = (
      movVal.includes('silla') ||
      movVal.includes('camilla') ||
      movVal.includes('reducida') ||
      movVal.includes('ambulancia') ||
      alertas.includes('silla') ||
      alertas.includes('camilla')
    );

    const isLateShift = isHospitalized || isReducedMobility;
    let label = '';
    if (isHospitalized && isReducedMobility) {
      label = movVal.includes('camilla') ? '🏥 Ingresado / 🛏️ En Camilla' : '🏥 Ingresado / ♿ Silla de ruedas';
    } else if (isHospitalized) {
      label = '🏥 Paciente Ingresado';
    } else if (isReducedMobility) {
      label = movVal.includes('camilla') ? '🛏️ Traslado en Camilla' : '♿ Movilidad Reducida (Silla)';
    }

    return {
      isLateShift,
      isHospitalized,
      isReducedMobility,
      mobilityType: movVal || (isReducedMobility ? 'reducida' : 'autónomo'),
      label
    };
  }

  /**
   * Comprueba si una cita asignada corresponde al primer hueco del turno o día (<= 08:30 h).
   */
  function isFirstSlotOfDayOrShift(dateStr, timeStr) {
    if (!timeStr) return false;
    const m = String(timeStr).match(/(\d{2}:\d{2})/);
    if (!m) return false;
    const time = m[1];
    const isAfternoon = String(timeStr).toLowerCase().includes('tarde') || parseInt(time) >= 14;
    if (!isAfternoon && time <= "08:30") {
      return true;
    }
    if (isAfternoon && time <= "15:00") {
      return true;
    }
    if (dateStr && typeof getDayAgendaConfig === 'function') {
      const cfg = getDayAgendaConfig(dateStr);
      if (cfg) {
        if (!isAfternoon && cfg.morning && cfg.morning.startTime === time) return true;
        if (isAfternoon && cfg.afternoon && cfg.afternoon.startTime === time) return true;
      }
    }
    return false;
  }

  /**
   * Desagenda a todos los pacientes dejándolos en lista de espera (sin citar).
   */
  function resetAllPatientCitations(suppressConfirm = false) {
    if (!suppressConfirm) {
      const ok = confirm("¿Deseas desagendar a TODOS los pacientes de la agenda y dejarlos 'Pendientes de Triaje' (sin citar)?\n\nPodrás ir citándolos tú automáticamente o manualmente según prioridad clínica.");
      if (!ok) return;
    }

    state.peonadaAssignments = {};
    state.confirmations = {};
    state.freedSlots = {};
    state.occupiedMap = {};
    try {
      localStorage.removeItem('pet_ct_peonada_assignments');
      localStorage.removeItem('pet_ct_confirmations');
      localStorage.removeItem('pet_ct_freed_slots');
      localStorage.removeItem('pet_ct_audioguia_sent');
      localStorage.removeItem('PET_DATABASE_MASTER_V4');
      localStorage.removeItem('PET_TRIAGE_CITED_PATIENTS_V1');
      localStorage.setItem('PET_UNCITED_INITIALIZED_V7', 'true');
    } catch (e) { }

    // Resetear en memoria todos los pacientes
    state.submissions.forEach(s => {
      s.fechaCita = "SIN AGENDAR";
      s.horaCita = "Pendiente de Triaje";
      s.requiresProposal = true;
      if (s.raw) {
        s.raw["Fecha Cita Asignada"] = "";
        s.raw["Hora Cita Asignada"] = "";
        s.raw["Estado de Triaje"] = "Pendiente de Triaje";
        s.raw["Estado Confirmación"] = "Pendiente";
        s.raw["Audioguía Enviada"] = "No";
        s.raw["audioguia_enviada"] = false;
        s.raw["Fecha Envío Audioguía"] = "";
      }
    });

    const cleanRawList = state.submissions.map(s => s.raw || s);
    try {
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(cleanRawList));
      localStorage.setItem('PET_TRIAGE_CITED_PATIENTS_V1', JSON.stringify([]));
    } catch (e) { }

    // ¡SINCRONIZAR AL SERVIDOR PARA QUE NO VUELVAN A APARECER EN EL PRÓXIMO POLLING!
    const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
    fetch(`${baseUrl}/api/sync-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanRawList)
    }).catch(err => console.warn("Error enviando reset al servidor:", err));

    persistTriageCitedPatientsSnapshot();
    notifyClinicalEcosystemUpdated();

    updateProposalsLists();
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    updateAgendaCapacityStats();

    if (!suppressConfirm) {
      alert("✅ Todos los pacientes (" + state.submissions.length + ") están ahora sin citar en la lista de espera.\n\nPuedes verlos en el panel 'Lista de Espera' y citarlos manualmente desde los huecos libres o con el botón '⚡ Rellenar Agenda con Triaje' (dejando siempre hospitalizados y movilidad reducida de últimos).");
    }
  }

  /**
   * Desagenda a todos los pacientes citados en una fecha específica (dateStr)
   * dejándolos en la lista de espera (sin citar / Pendientes de Triaje).
   */
  function resetDayPatientCitations(dateStr, suppressConfirm = false) {
    if (!dateStr) return;

    const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);

    if (dayPatients.length === 0) {
      alert("ℹ️ No hay pacientes citados para el día " + dateStr + ".");
      return;
    }

    if (!suppressConfirm) {
      const ok = confirm("¿Deseas desagendar a los " + dayPatients.length + " paciente(s) citados para el día " + dateStr + "?\n\nTodos los cupos quedarán liberados y los pacientes volverán a quedar 'Pendientes de Triaje' (sin citar) en la lista de espera.");
      if (!ok) return;
    }

    // Desagendar a cada paciente del día en memoria
    dayPatients.forEach(p => {
      if (state.peonadaAssignments && state.peonadaAssignments[p.id]) {
        delete state.peonadaAssignments[p.id];
      }
      if (state.confirmations && state.confirmations[p.id]) {
        delete state.confirmations[p.id];
      }

      p.fechaCita = "SIN AGENDAR";
      p.horaCita = "Pendiente de Triaje";
      p.requiresProposal = true;
      if (p.raw) {
        p.raw["Fecha Cita Asignada"] = "";
        p.raw["Hora Cita Asignada"] = "";
        p.raw["Estado de Triaje"] = "Pendiente de Triaje";
        p.raw["Estado Confirmación"] = "Pendiente";
        p.raw["Audioguía Enviada"] = "No";
        p.raw["audioguia_enviada"] = false;
        p.raw["Fecha Envío Audioguía"] = "";
      }
    });

    // Limpiar posibles huecos liberados de este día
    if (state.freedSlots) {
      Object.keys(state.freedSlots).forEach(k => {
        if (k.startsWith(dateStr)) {
          delete state.freedSlots[k];
        }
      });
    }

    try {
      localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
      localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
      localStorage.setItem('pet_ct_freed_slots', JSON.stringify(state.freedSlots));
    } catch (e) { }

    const cleanRawList = state.submissions.map(s => s.raw || s);
    try {
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(cleanRawList));
      localStorage.setItem('PET_TRIAGE_CITED_PATIENTS_V1', JSON.stringify([]));
    } catch (e) { }

    // Sincronizar al servidor para que el polling de 12s no restaure las citas
    const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
    fetch(`${baseUrl}/api/sync-database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanRawList)
    }).catch(err => console.warn("Error enviando reset de fecha al servidor:", err));

    persistTriageCitedPatientsSnapshot();
    notifyClinicalEcosystemUpdated();

    updateProposalsLists();
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    updateAgendaCapacityStats();

    if (!suppressConfirm) {
      alert("✅ Se han desagendado " + dayPatients.length + " paciente(s) del día " + dateStr + ".\n\nTodos los cupos del día han quedado liberados y los pacientes están en lista de espera.");
    }
  }

  window.getPatientMobilityHospitalizationInfo = getPatientMobilityHospitalizationInfo;
  window.isFirstSlotOfDayOrShift = isFirstSlotOfDayOrShift;
  window.resetAllPatientCitations = resetAllPatientCitations;
  window.resetDayPatientCitations = resetDayPatientCitations;

  const petClinicalBroadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pet_clinical_channel') : null;

  function notifyClinicalEcosystemUpdated() {
    if (petClinicalBroadcast) {
      try {
        petClinicalBroadcast.postMessage({ type: 'TRIAGE_DATABASE_UPDATED', timestamp: Date.now() });
      } catch (e) { }
    }
  }

  function isPatientDiabetic(p) {
    if (!p) return false;
    const raw = p.raw || p;

    // 1. Campo directo de diabetes
    const tieneDiab = raw['¿Tiene Diabetes Mellitus?'] || raw['Diabetes'] || raw['diabetes'] || raw['Diabético'] || raw['diabetico'] || raw['es_diabetico'] || p['¿Tiene Diabetes Mellitus?'] || p.diabetes || p.diabetico || p.es_diabetico;
    if (tieneDiab === true || tieneDiab === 1) return true;
    if (typeof tieneDiab === 'string') {
      const val = tieneDiab.trim().toLowerCase();
      if (val === 'sí' || val === 'si' || val === 'yes' || val === 'true' || val === '1' || val.includes('diabétic') || val.includes('diabetic')) {
        return true;
      }
    }

    // 2. Glucemia analítica previa elevada
    const glucVal = parseFloat(raw['Glucemia (mg/dL)'] || raw['glucemia'] || p.glucemia || 0);
    if (!isNaN(glucVal) && glucVal >= 160) {
      return true;
    }

    // 3. Alertas técnicas
    const alertasToCheck = [p.alertas, p.alertas_tecnicas, raw['Alertas Técnicas'], raw.alertas_tecnicas, raw.alertas, p['Alertas Técnicas']];
    for (const aItem of alertasToCheck) {
      if (!aItem) continue;
      if (Array.isArray(aItem)) {
        if (aItem.some(a => a && (a.type === 'diabetes' || (typeof a.text === 'string' && (a.text.toLowerCase().includes('diabet') || a.text.toLowerCase().includes('glucemia'))) || (typeof a === 'string' && (a.toLowerCase().includes('diabet') || a.toLowerCase().includes('glucemia')))))) {
          return true;
        }
      } else if (typeof aItem === 'string') {
        const aLow = aItem.toLowerCase();
        if (aLow.includes('diabetes') || aLow.includes('diabético') || aLow.includes('diabetico') || aLow.includes('glucemia crítica') || aLow.includes('insulina') || aLow.includes('metformina')) {
          return true;
        }
      }
    }

    // 4. Resumen clínico o comorbilidades
    const textosClinicos = [
      raw['Resumen Clínico'], raw.resumen_clinico, p.resumen_clinico, p['Resumen Clínico'],
      raw['Diagnóstico Clínico'], raw.diagnostico, p.diagnostico, p['Diagnóstico Clínico'],
      raw['Comorbilidades'], raw.comorbilidades, p.comorbilidades, p['Comorbilidades'],
      raw['Observaciones'], raw.observaciones, p.observaciones, p['Observaciones'],
      raw['Pauta Preparación'], p.pauta_prep
    ];
    for (const txt of textosClinicos) {
      if (!txt) continue;
      const str = String(txt).toLowerCase();
      if (str.includes('diabético') || str.includes('diabetico') || str.includes('diabetes mellitus') || str.includes('dm tipo') || str.includes('dm1') || str.includes('dm2') || str.includes('insulina')) {
        return true;
      }
    }
    return false;
  }

  function getAudioguiaFilenameForTest(rf, patient = null) {
    const s = (rf || '').toLowerCase();
    if (s.includes('psma')) {
      return '../psma/index.html';
    }
    if (s.includes('vasculitis') || s.includes('takayasu') || s.includes('arteritis')) {
      return 'indexFDG_Vasculitis.html';
    }
    if (s.includes('endocarditis') || s.includes('hep')) {
      return 'indexFDG_Endocarditis.html';
    }
    if (s.includes('contraste') || s.includes('iodado') || s.includes('yodado')) {
      return '../FDG+contraste/index.html';
    }
    if ((s.includes('ga68') || s.includes('68ga') || s.includes('ga 68')) && s.includes('psma')) {
      return '../psma/index.html';
    }
    if (s.includes('dotatoc') || s.includes('dotatate') || s.includes('somatostatina') || (s.includes('ga') && s.includes('neuroendocrin'))) {
      return 'indexga68DOTATOC.html';
    }
    if (s.includes('paratiroides') || (s.includes('colina') && s.includes('paratiroid'))) {
      return '../colina_paratiroides/index.html';
    }
    if (s.includes('colina') || s.includes('fch')) {
      return '../colina_prostata/index.html';
    }
    if (s.includes('neurofisioneuro') || s.includes('neurofisio') || s.includes('eeg')) {
      return 'indexFDG_Neurofisioneurologia.html';
    }
    if (s.includes('neuro') || s.includes('cerebral')) {
      return 'indexFDG_Neurologico.html';
    }
    // Para FDG general/oncológico:
    // Si el paciente es diabético, remitir la audioguía con control y reporte de glucemia capilar
    // Si NO es diabético, remitir la audioguía estándar libre del formulario de glucemia
    if (patient && isPatientDiabetic(patient)) {
      return 'indexFDG.html'; // Versión Diabéticos (con reporte a enfermería)
    }
    return 'indexFDG_NoDiabetico.html'; // Versión No Diabéticos (sin formulario de glucemia)
  }

  function getAudioguiaBaseUrl(rf, patient = null) {
    const s = String(rf || '').toLowerCase();

    // PET 18F-Colina Paratiroides (programa interactivo dedicado)
    const isColinaParatiroides = s.includes('paratiroides') || (s.includes('colina') && (s.includes('paratiroid') || s.includes('adenoma') || s.includes('pth')));
    if (isColinaParatiroides) {
      if (window.location.protocol === 'file:') {
        return `../../colina_paratiroides/index.html`;
      }
      try {
        const curPath = window.location.pathname;
        const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
        const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
        return `${window.location.origin}${cleanRoot}/colina_paratiroides/index.html`;
      } catch (e) {
        return `../../colina_paratiroides/index.html`;
      }
    }

    // PET 18F-Colina Próstata (programa interactivo dedicado)
    const isColinaProstata = (s.includes('colina') || s.includes('fch')) && !isColinaParatiroides;
    if (isColinaProstata) {
      if (window.location.protocol === 'file:') {
        return `../../colina_prostata/index.html`;
      }
      try {
        const curPath = window.location.pathname;
        const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
        const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
        return `${window.location.origin}${cleanRoot}/colina_prostata/index.html`;
      } catch (e) {
        return `../../colina_prostata/index.html`;
      }
    }

    // PET PSMA (programa interactivo dedicado)
    const isPsma = s.includes('psma');
    if (isPsma) {
      if (window.location.protocol === 'file:') {
        return `../../psma/index.html`;
      }
      try {
        const curPath = window.location.pathname;
        const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
        const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
        return `${window.location.origin}${cleanRoot}/psma/index.html`;
      } catch (e) {
        return `../../psma/index.html`;
      }
    }

    // FDG Vasculitis (programa interactivo dedicado)
    const isVasculitis = s.includes('vasculitis') || s.includes('takayasu') || s.includes('arteritis');
    if (isVasculitis) {
      if (window.location.protocol === 'file:') {
        return `../../fdg_vasculitis/index.html`;
      }
      try {
        const curPath = window.location.pathname;
        const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
        const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
        return `${window.location.origin}${cleanRoot}/fdg_vasculitis/index.html`;
      } catch (e) {
        return `../../fdg_vasculitis/index.html`;
      }
    }

    const isGa68 = s.includes('ga68') || s.includes('68ga') || s.includes('ga 68') || s.includes('galio') || s.includes('dotatoc') || s.includes('dotatate') || s.includes('somatostatina') || (s.includes('ga') && s.includes('neuroendocrin'));

    if (isGa68) {
      if (window.location.protocol === 'file:') {
        return `../../audioguia_ga68/index.html`;
      }
      try {
        const curPath = window.location.pathname;
        const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
        const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
        return `${window.location.origin}${cleanRoot}/audioguia_ga68/index.html`;
      } catch (e) {
        return `../../audioguia_ga68/index.html`;
      }
    }

    const isContraste = s.includes('contraste') || s.includes('iodado') || s.includes('yodado');
    if (isContraste) {
      if (window.location.protocol === 'file:') {
        return `../../FDG+contraste/index.html`;
      }
      try {
        const curPath = window.location.pathname;
        const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
        const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
        return `${window.location.origin}${cleanRoot}/FDG+contraste/index.html`;
      } catch (e) {
        return `../../FDG+contraste/index.html`;
      }
    }

    const specificFile = getAudioguiaFilenameForTest(rf, patient);
    const saved = localStorage.getItem('pet_audioguia_base_url');
    if (saved && saved.trim()) {
      try {
        const u = new URL(saved.trim(), window.location.href);
        const basePath = u.pathname.substring(0, u.pathname.lastIndexOf('/') + 1);
        return `${u.origin}${basePath}${specificFile}`;
      } catch (e) {
        return `http://localhost:8000/pet_prep_page/${specificFile}`;
      }
    }
    if (window.location.protocol === 'file:') {
      return `../../pet_prep_page/${specificFile}`;
    }
    // Detección automática en Internet (GitHub Pages, Render, dominios o servidor local)
    try {
      const curPath = window.location.pathname;
      const rootPath = curPath.replace(/\/pet_ct_triage\/web_app\/.*$/, '').replace(/\/pet_ct_triage\/.*$/, '');
      const cleanRoot = rootPath.endsWith('/') ? rootPath.slice(0, -1) : rootPath;
      return `${window.location.origin}${cleanRoot}/pet_prep_page/${specificFile}`;
    } catch (e) {
      return `../../pet_prep_page/${specificFile}`;
    }
  }

  function setAudioguiaBaseUrl(url) {
    if (url && url.trim()) {
      localStorage.setItem('pet_audioguia_base_url', url.trim());
    } else {
      localStorage.removeItem('pet_audioguia_base_url');
    }
  }

  function buildPatientAudioguiaUrl(cleanName, nhcVal, fecha, hora, rf, tel, patientObj = null) {
    let resolvedPatient = patientObj;
    if (!resolvedPatient && state && state.submissions) {
      if (nhcVal && nhcVal !== 'NHC-PENDIENTE' && nhcVal !== 'N/A') {
        resolvedPatient = state.submissions.find(s =>
          s.id === nhcVal || s.nhc === nhcVal ||
          (s.raw && (s.raw['Nº Historia'] === nhcVal || s.raw['NHC'] === nhcVal || s.raw['NHC / Historia Clínica'] === nhcVal || String(s.raw['Paciente'] || '').includes(nhcVal))) ||
          String(s.nombre || '').includes(nhcVal)
        );
      }
      if (!resolvedPatient && cleanName && cleanName !== 'Paciente') {
        resolvedPatient = state.submissions.find(s => {
          const sName = String(s.nombre || (s.raw && (s.raw['Paciente'] || s.raw['Nombre del Paciente'])) || '');
          return sName === cleanName || sName.startsWith(cleanName) || sName.includes(cleanName);
        });
      }
    }

    const base = getAudioguiaBaseUrl(rf, resolvedPatient);
    const sep = base.includes('?') ? '&' : '?';
    const params = new URLSearchParams();
    if (cleanName) params.set('nombre', cleanName);
    if (nhcVal) params.set('nhc', nhcVal);
    if (fecha) params.set('fecha', fecha);
    if (hora) params.set('hora', hora);
    if (rf) params.set('rf', rf);
    if (tel) params.set('tel', tel);
    params.set('openChat', '1');
    return `${base}${sep}${params.toString()}`;
  }

  const AUDIOGUIA_URL = getAudioguiaBaseUrl('FDG');
  const DRIVE_GOOGLE_URL = AUDIOGUIA_URL;

  const URLS = {
    FDG_NO_DIABETICO: "http://localhost:8000/pet_prep_page/indexFDG_NoDiabetico.html",
    FDG_DIABETICO: "http://localhost:8000/pet_prep_page/indexFDG.html",
    FDG_ESTANDAR: "http://localhost:8000/pet_prep_page/indexFDG_NoDiabetico.html",
    FDG_CONTRASTE: "http://localhost:8000/FDG+contraste/index.html",
    FDG_ENDOCARDITIS: "http://localhost:8000/pet_prep_page/indexFDG_Endocarditis.html",
    FDG_VASCULITIS: "http://localhost:8000/fdg_vasculitis/index.html",
    PSMA: "http://localhost:8000/psma/index.html",
    F18_PSMA: "http://localhost:8000/psma/index.html",
    GA68_PSMA: "http://localhost:8000/psma/index.html",
    GA68_DOTATOC: "http://localhost:8000/audioguia_ga68/index.html",
    COLINA: "http://localhost:8000/colina_prostata/index.html",
    COLINA_PROSTATA: "http://localhost:8000/colina_prostata/index.html",
    PARATIROIDES: "http://localhost:8000/colina_paratiroides/index.html",
    COLINA_PARATIROIDES: "http://localhost:8000/colina_paratiroides/index.html",
    FDG_NEURO: "http://localhost:8000/indexFDG_Neurologico.html",
    FDG_NEURO_EEG: "http://localhost:8000/indexFDG_Neurofisioneurologia.html",
    GENERAL: "http://localhost:8000/index.html"
  };

  function resolvePatientRadiofarmaco(p, defaultRf = '18F-FDG') {
    if (!p) return defaultRf;
    const rf = p.radiofarmaco || p.tipoEstudio || p.tipo_estudio || defaultRf;
    const s = String(rf).toLowerCase();
    if (s.includes('vasculitis') || s.includes('takayasu') || s.includes('arteritis')) {
      return rf.includes('18F-') ? rf : '18F-FDG Vasculitis';
    }
    if (s.includes('psma')) {
      return rf.includes('68ga') || rf.includes('ga68') ? '68Ga-PSMA' : '18F-PSMA';
    }
    if (s.includes('paratiroides') || (s.includes('colina') && (s.includes('paratiroid') || s.includes('adenoma') || s.includes('pth')))) {
      return '18F-Paratiroides';
    }
    if (s.includes('colina') || s.includes('fch')) {
      return '18F-Colina';
    }
    const diag = String(p.motivo || p.diagnostico || p['Diagnóstico Clínico'] || p.indicacion || (p.raw && (p.raw['Diagnóstico Clínico'] || p.raw['Motivo de Solicitud'])) || '').toLowerCase();
    if (diag.includes('vasculitis') || diag.includes('takayasu') || diag.includes('arteritis')) {
      return '18F-FDG Vasculitis';
    }
    if (diag.includes('psma') || (diag.includes('prostata') && (diag.includes('recidiva') || diag.includes('psa')))) {
      return '18F-PSMA';
    }
    if (diag.includes('paratiroides') || diag.includes('paratiroid') || diag.includes('hiperparatiroidismo') || diag.includes('adenoma paratiroideo')) {
      return '18F-Paratiroides';
    }
    if (diag.includes('endocarditis')) {
      return '18F-FDG Endocarditis';
    }
    return rf;
  }

  function extractPatientNameAndNhc(patient) {
    if (!patient) return { cleanName: 'Paciente', nhcVal: 'NHC-PENDIENTE' };
    let rawName = patient.cleanNombre || patient.nombre || 'Paciente';
    let nhcVal = patient.nhc || '';
    let cleanName = rawName;

    if (typeof rawName === 'string' && rawName.includes('(NHC:')) {
      const parts = rawName.split('(NHC:');
      cleanName = parts[0].trim();
      if (!nhcVal) nhcVal = parts[1].replace(')', '').trim();
    } else if (typeof rawName === 'string' && rawName.includes('(') && rawName.includes(')')) {
      const m = rawName.match(/\(([^)]+)\)/);
      if (m && m[1]) {
        if (!nhcVal) nhcVal = m[1].trim();
        cleanName = rawName.replace(/\([^)]+\)/, '').trim();
      }
    }

    if (!nhcVal) {
      nhcVal = patient.id || 'NHC-PENDIENTE';
    }

    return { cleanName, nhcVal };
  }

  // DOM Elements
  const btnSyncSheet = document.getElementById('btn-sync-sheet');
  const syncStatus = document.getElementById('sync-status');
  const weekSelector = document.getElementById('week-selector');

  const kpiP1 = document.getElementById('kpi-p1');
  const kpiP2 = document.getElementById('kpi-p2');
  const kpiP3 = document.getElementById('kpi-p3');
  const kpiProposals = document.getElementById('kpi-proposals');
  const kpiConfirmed = document.getElementById('kpi-confirmed');
  const kpiTotal = document.getElementById('kpi-total');

  const countNavConfirmed = document.getElementById('count-nav-confirmed');
  const countNavProposals = document.getElementById('count-nav-proposals');

  const countPropP1 = document.getElementById('count-prop-p1');
  const countPropP2 = document.getElementById('count-prop-p2');
  const countPropP3 = document.getElementById('count-prop-p3');

  const tbodyPropP1 = document.getElementById('tbody-prop-p1');
  const tbodyPropP2 = document.getElementById('tbody-prop-p2');
  const tbodyPropP3 = document.getElementById('tbody-prop-p3');

  const tbodyConfirmPending = document.getElementById('tbody-confirm-pending');
  const tbodyConfirmDone = document.getElementById('tbody-confirm-done');
  const tbodyConfirmAll = document.getElementById('tbody-confirm-all');
  const countConfirmPending = document.getElementById('count-confirm-pending');
  const countConfirmDone = document.getElementById('count-confirm-done');
  const countConfirmAll = document.getElementById('count-confirm-all');
  const weeklyGrid = document.getElementById('weekly-grid');
  const submissionsTableBody = document.querySelector('#submissions-table tbody');

  // Search Elements
  const patientSearchInput = document.getElementById('patient-search-input');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const searchResultsContainer = document.getElementById('search-results-container');
  const searchResultsCounter = document.getElementById('search-results-counter');

  // Slot Modal Elements
  const slotModal = document.getElementById('slot-modal');
  const btnCloseModal = document.getElementById('btn-close-modal');
  const modalPatientInfo = document.getElementById('modal-patient-info');
  const selectReplacement = document.getElementById('modal-select-replacement');
  const btnFreeSlot = document.getElementById('btn-free-slot');
  const btnSwapPatient = document.getElementById('btn-swap-patient');

  // Peonada Modal Elements
  const peonadaModal = document.getElementById('peonada-modal');
  const btnClosePeonadaModal = document.getElementById('btn-close-peonada-modal');
  const peonadaPatientInfo = document.getElementById('peonada-patient-info');
  const peonadaDatePicker = document.getElementById('peonada-date-picker');
  const peonadaDayTypeBadge = document.getElementById('peonada-day-type-badge');
  const peonadaTimeSlots = document.getElementById('peonada-time-slots');
  const btnConfirmPeonada = document.getElementById('btn-confirm-peonada');
  const btnCancelPeonada = document.getElementById('btn-cancel-peonada');

  // Populate Annual Weeks (52 Weeks)
  populateAnnualWeekSelector();

  // Helper para fusionar siempre datos base con cambios en vivo de localStorage (dando prioridad a localStorage)
  function mergeWithLocalMasterDb(baseList) {
    let result = Array.isArray(baseList) ? JSON.parse(JSON.stringify(baseList)) : [];
    try {
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (result.length === 0) {
            result = parsed;
          } else {
            const idxMap = new Map();
            result.forEach((r, idx) => {
              const k = r["Submission ID"] || r.id || r.paciente_id || r["NHC / Historia Clínica"] || r.nhc;
              if (k) idxMap.set(k, idx);
            });
            const extraItems = [];
            parsed.forEach(item => {
              const k = item["Submission ID"] || item.id || item.paciente_id || item["NHC / Historia Clínica"] || item.nhc;
              if (k && idxMap.has(k)) {
                result[idxMap.get(k)] = Object.assign({}, result[idxMap.get(k)], item);
              } else if (k) {
                extraItems.push(item);
              }
            });
            if (extraItems.length > 0) {
              result = extraItems.concat(result);
            }
          }
        }
      }

      // Fusionar peticiones creadas por el usuario (copia ligera dedicada PET_USER_CREATED_PETITIONS_V1)
      const userCreatedRaw = localStorage.getItem('PET_USER_CREATED_PETITIONS_V1');
      if (userCreatedRaw) {
        const createdList = JSON.parse(userCreatedRaw);
        if (Array.isArray(createdList) && createdList.length > 0) {
          const idxMap = new Map();
          result.forEach((r, idx) => {
            const k = r["Submission ID"] || r.id || r.paciente_id;
            if (k) idxMap.set(k, idx);
          });
          const extraCreated = [];
          createdList.forEach(item => {
            const k = item["Submission ID"] || item.id || item.paciente_id;
            if (k && idxMap.has(k)) {
              result[idxMap.get(k)] = Object.assign({}, item, result[idxMap.get(k)]);
            } else if (k) {
              extraCreated.push(item);
            }
          });
          if (extraCreated.length > 0) {
            result = extraCreated.concat(result);
          }
        }
      }

      // Aplicar siempre las citaciones activas de Triaje (PET_TRIAGE_CITED_PATIENTS_V1 y pet_ct_peonada_assignments)
      const citedSnapshotRaw = localStorage.getItem('PET_TRIAGE_CITED_PATIENTS_V1');
      if (citedSnapshotRaw) {
        const citedList = JSON.parse(citedSnapshotRaw);
        if (Array.isArray(citedList) && citedList.length > 0) {
          const idxMap = new Map();
          result.forEach((r, idx) => {
            const k1 = r["Submission ID"] || r.id || r.paciente_id;
            const k2 = r["NHC / Historia Clínica"] || r.nhc;
            if (k1) idxMap.set(k1, idx);
            if (k2) idxMap.set(k2, idx);
          });
          const extraCited = [];
          citedList.forEach(cItem => {
            const k1 = cItem["Submission ID"] || cItem.id || cItem.paciente_id;
            const k2 = cItem["NHC / Historia Clínica"] || cItem.nhc;
            const foundIdx = (k1 && idxMap.has(k1)) ? idxMap.get(k1) : ((k2 && idxMap.has(k2)) ? idxMap.get(k2) : -1);
            if (foundIdx !== -1) {
              result[foundIdx] = Object.assign({}, result[foundIdx], cItem);
            } else {
              extraCited.push(cItem);
            }
          });
          if (extraCited.length > 0) {
            result = extraCited.concat(result);
          }
        }
      }

      const peonadaMap = JSON.parse(localStorage.getItem('pet_ct_peonada_assignments') || '{}');
      if (peonadaMap && Object.keys(peonadaMap).length > 0) {
        result.forEach((r, idx) => {
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

      // Filtrar pacientes eliminados registrados en PET_DELETED_PETITION_IDS_V1
      const deletedRaw = localStorage.getItem('PET_DELETED_PETITION_IDS_V1');
      if (deletedRaw) {
        const deletedList = JSON.parse(deletedRaw);
        if (Array.isArray(deletedList) && deletedList.length > 0) {
          const delSet = new Set(deletedList.map(x => String(x).toLowerCase().trim()));
          result = result.filter(item => {
            if (!item) return false;
            const s1 = String(item["Submission ID"] || '').toLowerCase().trim();
            const s2 = String(item.id || '').toLowerCase().trim();
            const s3 = String(item.paciente_id || '').toLowerCase().trim();
            const s4 = String(item["NHC / Historia Clínica"] || item.nhc || '').toLowerCase().trim();
            if (s1 && delSet.has(s1)) return false;
            if (s2 && delSet.has(s2)) return false;
            if (s3 && delSet.has(s3)) return false;
            if (s4 && delSet.has(s4) && (delSet.has(s1) || delSet.has(s2))) return false;
            return true;
          });
        }
      }
    } catch (e) { }
    return result;
  }

  /**
   * Guarda una instantánea directa y autoritativa de todos los pacientes citados en Triaje
   * en 'PET_TRIAGE_CITED_PATIENTS_V1' y sincroniza 'PET_DATABASE_MASTER_V4' para que
   * Consola Médica, Enfermería y Técnicos TSID los carguen de forma inmediata y exacta.
   */
  function persistTriageCitedPatientsSnapshot() {
    try {
      if (!state.submissions || !Array.isArray(state.submissions)) return;

      const citedRecords = [];
      state.submissions.forEach(s => {
        const fCita = String(s.fechaCita || '').trim();
        const isCited = !s.requiresProposal && fCita !== '' && !fCita.includes('SIN AGENDAR') && !fCita.includes('Pendiente');
        const rawObj = Object.assign({}, s.raw || {});
        const extracted = extractPatientNameAndNhc(s);
        const cleanName = extracted.cleanName || s.cleanNombre || s.nombre || 'Paciente';
        const nhcVal = extracted.nhcVal || s.nhc || rawObj["NHC / Historia Clínica"] || s.id;

        rawObj["Submission ID"] = s.id || rawObj["Submission ID"];
        rawObj.id = s.id || rawObj.id;
        rawObj["NHC / Historia Clínica"] = nhcVal;
        rawObj.nhc = nhcVal;
        if (!rawObj["Nombre del Paciente"]) rawObj["Nombre del Paciente"] = cleanName;
        if (!rawObj["Nombre y Apellidos"]) rawObj["Nombre y Apellidos"] = cleanName;
        rawObj["Tipo de Estudio PET Solicitado"] = s.radiofarmaco || s.tipoEstudio || rawObj["Tipo de Estudio PET Solicitado"] || "18F-FDG";
        rawObj["Prioridad Calculada"] = s.prioridad || rawObj["Prioridad Calculada"] || "🟢 P3";
        rawObj["Carácter de la Petición"] = s.prioridad || rawObj["Carácter de la Petición"] || "🟢 P3";
        if (s.motivo && !rawObj["Diagnóstico Clínico"]) rawObj["Diagnóstico Clínico"] = s.motivo;
        if (s.motivo && !rawObj["Motivo de Solicitud"]) rawObj["Motivo de Solicitud"] = s.motivo;

        if (isCited) {
          rawObj["Fecha Cita Asignada"] = fCita;
          rawObj["Hora Cita Asignada"] = s.horaCita || "08:30 h";
          rawObj["Estado de Triaje"] = "Cita Asignada";
          rawObj["Estado Confirmación"] = (state.confirmations && state.confirmations[s.id]) ? "Confirmada" : "Pendiente";
          citedRecords.push(rawObj);
        } else {
          rawObj["Fecha Cita Asignada"] = "";
          rawObj["Hora Cita Asignada"] = "Pendiente de Triaje";
          if (rawObj["Estado de Triaje"] !== "No Triable") {
            rawObj["Estado de Triaje"] = "Pendiente de Triaje";
          }
        }
        s.raw = rawObj;
      });

      localStorage.setItem('PET_TRIAGE_CITED_PATIENTS_V1', JSON.stringify(citedRecords));

      // Sincronizar también sobre PET_DATABASE_MASTER_V4
      let masterList = [];
      const storedMaster = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (storedMaster) {
        try {
          masterList = JSON.parse(storedMaster) || [];
        } catch (e) {
          masterList = [];
        }
      }
      if (!Array.isArray(masterList) || masterList.length === 0) {
        masterList = state.submissions.map(s => s.raw || s);
      } else {
        const mapById = new Map();
        masterList.forEach((item, idx) => {
          const k1 = item["Submission ID"] || item.id || item.paciente_id || `sub_${idx + 1}`;
          const k2 = item["NHC / Historia Clínica"] || item.nhc;
          if (k1) mapById.set(k1, idx);
          if (k2) mapById.set(k2, idx);
        });

        citedRecords.forEach(cRec => {
          const k1 = cRec["Submission ID"] || cRec.id;
          const k2 = cRec["NHC / Historia Clínica"] || cRec.nhc;
          const idx = (k1 && mapById.has(k1)) ? mapById.get(k1) : ((k2 && mapById.has(k2)) ? mapById.get(k2) : -1);
          if (idx !== -1) {
            masterList[idx] = Object.assign({}, masterList[idx], cRec);
          } else {
            masterList.unshift(cRec);
          }
        });
      }

      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(masterList));
    } catch (err) {
      console.warn("Error guardando instantánea de pacientes citados de Triaje:", err);
    }
  }

  // CARGA SÍNCRONA INMEDIATA DE PACIENTES PARA DISPONIBILIDAD INSTANTÁNEA (0 ms de espera)
  function loadInitialSynchronousData() {
    let baseList = null;
    if (window.PETICIONES_DATABASE_SEED && Array.isArray(window.PETICIONES_DATABASE_SEED) && window.PETICIONES_DATABASE_SEED.length > 0) {
      baseList = window.PETICIONES_DATABASE_SEED;
    }
    const initialList = mergeWithLocalMasterDb(baseList);
    if (initialList && initialList.length > 0) {
      const { filtered } = applyOneMonthAutoPurge(initialList);
      const mappedItems = mapDatabaseRecords(filtered);
      processFetchedItems(mappedItems);
      if (syncStatus) {
        syncStatus.textContent = `● Base de Datos Cargada (${filtered.length} pacientes | En Vivo)`;
      }
    }
  }

  // Ejecución síncrona inmediata en boot
  loadInitialSynchronousData();

  // ============================================================================
  // CONTROL DE ACCESO ASISTENCIAL Y AUTENTICACIÓN (TRIAJE PET/CT)
  // ============================================================================
  let syncIntervalId = null;

  function isTriageAuthenticated() {
    const token = sessionStorage.getItem('pet_triage_token') || localStorage.getItem('pet_triage_token');
    const user = sessionStorage.getItem('pet_triage_user') || localStorage.getItem('pet_triage_user');
    return !!(token && user);
  }

  function startPeriodicSync() {
    if (syncIntervalId) clearInterval(syncIntervalId);
    syncIntervalId = setInterval(() => {
      if (isTriageAuthenticated()) {
        syncClinicalDatabase(false);
      }
    }, 12000);
  }

  function stopPeriodicSync() {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  }

  function completeTriageLogin(authUser) {
    const finalUser = (authUser && String(authUser).trim()) ? String(authUser).trim() : 'TRIAJE';
    const token = `pet_triage_session_${Date.now()}`;
    try {
      sessionStorage.setItem('pet_triage_token', token);
      sessionStorage.setItem('pet_triage_user', finalUser);
      localStorage.setItem('pet_triage_token', token);
      localStorage.setItem('pet_triage_user', finalUser);
    } catch (e) {
      console.warn("Storage warning:", e);
    }

    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.classList.add('hidden');
      loginScreen.style.display = 'none';
    }
    const activeUserName = document.getElementById('active-user-name');
    if (activeUserName) activeUserName.textContent = finalUser.toUpperCase();

    try {
      syncClinicalDatabase(true);
    } catch (err) {
      console.warn("Aviso en sync tras login:", err);
    }
    startPeriodicSync();
  }

  function checkTriageAuth() {
    const loginScreen = document.getElementById('loginScreen');
    const activeUserName = document.getElementById('active-user-name');

    // Autenticación automática garantizada para acceso clínico directo
    let user = sessionStorage.getItem('pet_triage_user') || localStorage.getItem('pet_triage_user') || 'TRIAJE';
    let token = sessionStorage.getItem('pet_triage_token') || localStorage.getItem('pet_triage_token') || `pet_triage_session_${Date.now()}`;
    try {
      sessionStorage.setItem('pet_triage_token', token);
      sessionStorage.setItem('pet_triage_user', user);
      localStorage.setItem('pet_triage_token', token);
      localStorage.setItem('pet_triage_user', user);
    } catch (e) { }

    if (loginScreen) {
      loginScreen.classList.add('hidden');
      loginScreen.style.display = 'none';
    }
    if (activeUserName) activeUserName.textContent = user.toUpperCase();
    try {
      syncClinicalDatabase(false);
    } catch (e) { }
    startPeriodicSync();
  }

  window.completeTriageLogin = completeTriageLogin;

  window.handleTriageLoginSubmit = async function (event) {
    if (event) {
      try { event.preventDefault(); } catch (e) { }
    }
    const userField = document.getElementById('loginUser');
    const passField = document.getElementById('loginPass');
    const user = (userField ? userField.value : '').trim() || 'triaje';
    const pass = (passField ? passField.value : '').trim() || 'triaje2026';
    const errBox = document.getElementById('loginError');
    if (errBox) errBox.classList.remove('visible');

    // Notificación en segundo plano al servidor sin bloquear la entrada del usuario
    try {
      const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
      fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario: user, password: pass })
      }).catch(() => { });
    } catch (apiErr) { }

    // Entrada asistencial autorizada universalmente
    completeTriageLogin(user);
  };

  window.bypassTriageLogin = function () {
    const userField = document.getElementById('loginUser');
    const u = (userField ? userField.value : '').trim() || 'triaje';
    completeTriageLogin(u);
  };

  window.cerrarSesionTriaje = function () {
    sessionStorage.removeItem('pet_triage_token');
    sessionStorage.removeItem('pet_triage_user');
    localStorage.removeItem('pet_triage_token');
    localStorage.removeItem('pet_triage_user');
    stopPeriodicSync();
    const loginScreen = document.getElementById('loginScreen');
    if (loginScreen) {
      loginScreen.classList.remove('hidden');
      loginScreen.style.display = 'flex';
      const loginUser = document.getElementById('loginUser');
      if (loginUser) loginUser.value = 'triaje';
      const loginPass = document.getElementById('loginPass');
      if (loginPass) {
        loginPass.value = 'triaje2026';
        loginPass.focus();
      }
    }
  };

  window.toggleTriagePasswordVisibility = function () {
    const input = document.getElementById('loginPass');
    if (input) {
      input.type = input.type === 'password' ? 'text' : 'password';
    }
  };

  window.fillTriageDemoCredentials = function (autoSubmit = false) {
    const u = document.getElementById('loginUser');
    const p = document.getElementById('loginPass');
    const errBox = document.getElementById('loginError');
    if (u) u.value = 'triaje';
    if (p) p.value = 'triaje2026';
    if (errBox) errBox.classList.remove('visible');
    if (autoSubmit) {
      completeTriageLogin('triaje');
    }
  };

  // Inicializar verificación de autenticación
  checkTriageAuth();

  // Escucha cambios en tiempo real desde el portal de peticiones (pet_peticion_medica)
  window.addEventListener('storage', (e) => {
    if (e.key === 'PET_DATABASE_MASTER_V4' && isTriageAuthenticated()) {
      console.log('🔄 Sincronización en tiempo real detectada desde pet_peticion_medica.');
      syncClinicalDatabase(false);
    }
  });

  if (petClinicalBroadcast) {
    petClinicalBroadcast.addEventListener('message', (ev) => {
      if (ev.data && (ev.data.type === 'PETITION_CREATED_OR_UPDATED' || ev.data.type === 'TRIAGE_DATABASE_UPDATED')) {
        console.log('🔄 Sincronización BroadcastChannel detectada:', ev.data.type);
        syncClinicalDatabase(false);
      }
    });
  }

  // Event Listeners
  btnSyncSheet.addEventListener('click', () => syncClinicalDatabase(true));

  weekSelector.addEventListener('change', (e) => {
    state.selectedWeekIndex = parseInt(e.target.value) || 0;
    renderWeeklyGrid();
  });

  // Modal Event Listeners
  btnCloseModal.addEventListener('click', closeModal);
  slotModal.addEventListener('click', (e) => {
    if (e.target === slotModal) closeModal();
  });

  btnFreeSlot.addEventListener('click', handleFreeSlot);
  btnSwapPatient.addEventListener('click', handleSwapPatient);

  // Peonada Modal Event Listeners
  btnClosePeonadaModal.addEventListener('click', closePeonadaModal);
  btnCancelPeonada.addEventListener('click', closePeonadaModal);
  peonadaModal.addEventListener('click', (e) => {
    if (e.target === peonadaModal) closePeonadaModal();
  });
  peonadaDatePicker.addEventListener('change', renderPeonadaTimeSlots);
  btnConfirmPeonada.addEventListener('click', handleConfirmPeonada);

  if (patientSearchInput) {
    patientSearchInput.addEventListener('input', (e) => renderSearchResults(e.target.value));
  }
  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      if (patientSearchInput) patientSearchInput.value = '';
      renderSearchResults('');
    });
  }

  // ==============================================================================
  /**
   * Identifica el proveedor oficial de un radiofármaco según el protocolo:
   * - 18F-FDG Glucosa y 18F-Colina: CICLOTRÓN
   * - Galio 68 (68Ga-PSMA, 68Ga-DOTATATE, 68Ga-DOTATOC, Galio Dotatote, Somatostatina): RADIOFARMACIA
   * - 18F-PSMA (Flúor-18 PSMA): CURIUM MADRID
   */
  function getRadiofarmacoSupplierInfo(rf) {
    const s = String(rf || '').toLowerCase();
    // 1. Galio-68 (incluyendo Galio-PSMA y Galio-Dotatote / Somatostatina) -> RADIOFARMACIA HOSPITALARIA
    const isGallium = /(?:68\s*ga|ga\s*68|ga-68|galio|dotat|somatostatina)/i.test(s);
    if (isGallium) {
      return { name: 'Radiofarmacia', badgeClass: 'radiofarmacia', icon: '🧪' };
    }
    // 2. PSMA (Flúor-18 PSMA / sin galio) -> CURIUM MADRID
    if (s.includes('psma')) {
      return { name: 'Curium Madrid', badgeClass: 'curium', icon: '🏢' };
    }
    // 3. FDG Glucosa y Colina -> CICLOTRÓN
    if (s.includes('colina') || s.includes('fch')) {
      return { name: 'Ciclotrón', badgeClass: 'ciclotron', icon: '🏭' };
    }
    if (s.includes('fdg') || s.includes('glucosa') || s.includes('dopa') || s.includes('florbetapir')) {
      return { name: 'Ciclotrón', badgeClass: 'ciclotron', icon: '🏭' };
    }
    return { name: 'Ciclotrón / Estándar', badgeClass: 'ciclotron', icon: '🏭' };
  }

  // Lista en memoria de huecos individuales configurados para el día activo en el modal
  let currentDayCustomSlots = [];

  function generateDefaultCustomSlotsForDay(dayConfig) {
    const slots = [];
    const mConfig = dayConfig?.morning || { active: true, startTime: '08:00', endTime: '12:00', intervalMin: 30, maxSlots: 8, treatments: ['18F-FDG'] };
    const defaultMorningRf = (mConfig.treatments && mConfig.treatments[0]) || '18F-FDG';

    if (mConfig.active !== false) {
      const morningTimes = generateShiftSlotTimes(mConfig);
      morningTimes.forEach((t, i) => {
        slots.push({
          id: `slot_m_${i}_${Date.now()}`,
          time: t,
          radiofarmaco: defaultMorningRf,
          shift: 'morning'
        });
      });
    }

    const aftConfig = dayConfig?.afternoon;
    if (aftConfig && aftConfig.active) {
      const defaultAftRf = (aftConfig.treatments && aftConfig.treatments[0]) || '18F-FDG';
      const aftTimes = generateShiftSlotTimes(aftConfig);
      aftTimes.forEach((t, i) => {
        slots.push({
          id: `slot_a_${i}_${Date.now()}`,
          time: t,
          radiofarmaco: defaultAftRf,
          shift: 'afternoon'
        });
      });
    }
    return slots;
  }

  function renderCustomSlotsTable(dateStr = state.activeAgendaDayDate) {
    const tbody = document.getElementById('custom-slots-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Ordenar cronológicamente por hora
    currentDayCustomSlots.sort((a, b) => String(a.time).localeCompare(String(b.time)));

    const dayPatients = dateStr ? state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal) : [];

    const rfOptions = [
      { val: '18F-FDG', label: '18F-FDG (Ciclotrón - Glucosa)', group: 'Ciclotrón' },
      { val: '18F-Colina', label: '18F-Colina (Ciclotrón - Próstata/Paratiroides)', group: 'Ciclotrón' },
      { val: '68Ga-DOTATOC', label: '68Ga-DOTATOC (Radiofarmacia - TNE)', group: 'Radiofarmacia' },
      { val: '68Ga-PSMA', label: '68Ga-PSMA (Radiofarmacia - Galio 68)', group: 'Radiofarmacia' },
      { val: '18F-PSMA', label: '18F-PSMA (Curium Madrid - Próstata)', group: 'Curium Madrid' },
      { val: '18F-DOPA', label: '18F-DOPA (Ciclotrón - Neuroendocrino)', group: 'Ciclotrón' },
      { val: '18F-Florbetapir', label: '18F-Florbetapir (Ciclotrón - Neuro)', group: 'Ciclotrón' },
      { val: 'Flexible', label: 'Cualquiera / Flexible', group: 'General' }
    ];

    if (currentDayCustomSlots.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td colspan="7" style="text-align:center; padding:1.2rem; color:#64748b;">
          No hay huecos configurados aún para este día. Utiliza el formulario superior para añadir huecos a la carta o pulsa en <strong>⚡ Cargar Huecos Estándar (30 min)</strong>.
        </td>
      `;
      tbody.appendChild(tr);
    } else {
      currentDayCustomSlots.forEach((slot, idx) => {
        const tr = document.createElement('tr');
        tr.className = 'slot-row-item';

        const isMorning = slot.shift === 'morning' || (parseInt(slot.time) < 14);
        const shiftBadge = isMorning
          ? `<span style="background:#e0f2fe; color:#0369a1; font-weight:700; font-size:0.72rem; padding:2px 6px; border-radius:4px;">☀️ Mañana</span>`
          : `<span style="background:#fef3c7; color:#b45309; font-weight:700; font-size:0.72rem; padding:2px 6px; border-radius:4px;">🌆 Tarde</span>`;

        // Buscar si ya hay un paciente asignado en este horario exacto
        const assignedPat = dayPatients.find(p => String(p.horaCita).includes(slot.time));
        const statusHtml = assignedPat
          ? `<span style="color:#0284c7; font-weight:700;" title="Paciente asignado: ${assignedPat.nombre}">👤 ${assignedPat.nombre}</span>`
          : `<span style="color:#059669; font-weight:700;">🟢 Disponible</span>`;

        const supp = getRadiofarmacoSupplierInfo(slot.radiofarmaco);
        const suppHtml = `<span class="badge-supplier-${supp.badgeClass}">${supp.icon} ${supp.name}</span>`;

        // Generar options del select para poder cambiar el fármaco directamente
        let optsHtml = '';
        let hasMatched = false;
        rfOptions.forEach(opt => {
          const isSel = (opt.val.toLowerCase() === String(slot.radiofarmaco).toLowerCase());
          if (isSel) hasMatched = true;
          optsHtml += `<option value="${opt.val}" ${isSel ? 'selected' : ''}>${opt.label}</option>`;
        });
        if (!hasMatched && slot.radiofarmaco) {
          optsHtml += `<option value="${slot.radiofarmaco}" selected>✏️ ${slot.radiofarmaco}</option>`;
        }

        tr.innerHTML = `
          <td style="padding:0.45rem 0.65rem; color:#64748b; font-weight:700;">${idx + 1}</td>
          <td style="padding:0.45rem 0.65rem;">⏰ <strong>${slot.time} h</strong></td>
          <td style="padding:0.45rem 0.65rem;">${shiftBadge}</td>
          <td style="padding:0.45rem 0.65rem;">
            <select class="select-slot-rf-inline" data-id="${slot.id}" style="font-weight:700; width:100%; max-width:240px; padding:3px 6px; border-radius:6px; border:1px solid #94a3b8;">
              ${optsHtml}
            </select>
          </td>
          <td style="padding:0.45rem 0.65rem;" class="supplier-cell-${slot.id}">${suppHtml}</td>
          <td style="padding:0.45rem 0.65rem;">${statusHtml}</td>
          <td style="padding:0.45rem 0.65rem; text-align:center;">
            <button type="button" class="btn btn-outline btn-delete-custom-slot" data-id="${slot.id}" title="Eliminar este hueco" style="padding:2px 7px; color:#ef4444; border-color:#fca5a5; font-size:0.75rem; border-radius:4px; cursor:pointer;">
              🗑️
            </button>
          </td>
        `;

        // Event listener para cambiar el radiofármaco del hueco directamente
        const selectRf = tr.querySelector('.select-slot-rf-inline');
        if (selectRf) {
          selectRf.addEventListener('change', (e) => {
            slot.radiofarmaco = e.target.value;
            const newSupp = getRadiofarmacoSupplierInfo(slot.radiofarmaco);
            const suppCell = tr.querySelector(`.supplier-cell-${slot.id}`);
            if (suppCell) {
              suppCell.innerHTML = `<span class="badge-supplier-${newSupp.badgeClass}">${newSupp.icon} ${newSupp.name}</span>`;
            }
          });
        }

        // Event listener para borrar el hueco
        const btnDel = tr.querySelector('.btn-delete-custom-slot');
        if (btnDel) {
          btnDel.addEventListener('click', () => {
            currentDayCustomSlots = currentDayCustomSlots.filter(s => s.id !== slot.id);
            renderCustomSlotsTable(dateStr);
          });
        }

        tbody.appendChild(tr);
      });
    }

    // Actualizar contadores
    const mCount = currentDayCustomSlots.filter(s => s.shift === 'morning' || parseInt(s.time) < 14).length;
    const aCount = currentDayCustomSlots.filter(s => s.shift === 'afternoon' || parseInt(s.time) >= 14).length;
    const countBadge = document.getElementById('custom-slots-badge-total');
    if (countBadge) {
      countBadge.textContent = `${currentDayCustomSlots.length} huecos (☀️ Mañana: ${mCount} | 🌆 Tarde: ${aCount})`;
    }
  }

  window.getRadiofarmacoSupplierInfo = getRadiofarmacoSupplierInfo;
  window.renderCustomSlotsTable = renderCustomSlotsTable;



  // Main Nav Tab Switcher
  document.querySelectorAll('.main-nav-tabs .nav-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      document.querySelectorAll('.main-nav-tabs .nav-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.app-container .nav-content').forEach(c => c.classList.add('hidden'));

      e.target.classList.add('active');
      const targetNav = e.target.getAttribute('data-nav');
      document.getElementById(targetNav).classList.remove('hidden');

      if (targetNav === 'nav-search' && patientSearchInput) {
        patientSearchInput.focus();
        renderSearchResults(patientSearchInput.value);
      }
    });
  });

  // Proposal Sub-Tabs Switcher (Strictly scoped to .proposals-card)
  document.querySelectorAll('.proposals-card .proposal-tabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.tab-btn');
      if (!targetBtn) return;
      document.querySelectorAll('.proposals-card .proposal-tabs .tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.proposals-card .tab-content').forEach(c => c.classList.add('hidden'));

      targetBtn.classList.add('active');
      const targetTab = targetBtn.getAttribute('data-tab');
      const targetEl = targetTab ? document.getElementById(targetTab) : null;
      if (targetEl) targetEl.classList.remove('hidden');
    });
  });

  // Confirmation Sub-Tabs Switcher & Manager
  function switchConfirmSubTab(targetTabId) {
    document.querySelectorAll('.confirm-subtabs .tab-btn').forEach(btn => {
      const matches = btn.getAttribute('data-confirm-tab') === targetTabId;
      btn.classList.toggle('active', matches);
    });
    document.querySelectorAll('.confirm-view-content').forEach(view => {
      if (view.id === targetTabId) {
        view.classList.remove('hidden');
      } else {
        view.classList.add('hidden');
      }
    });
  }

  document.querySelectorAll('.confirm-subtabs .tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('.tab-btn');
      if (!targetBtn) return;
      const targetTab = targetBtn.getAttribute('data-confirm-tab');
      if (targetTab) {
        switchConfirmSubTab(targetTab);
      }
    });
  });

  // Soporte para apertura directa mediante URL hash o query (?tab=confirm)
  function handleUrlDeepLink() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = (window.location.hash || '').toLowerCase();
      if (urlParams.get('tab') === 'confirm' || urlParams.get('tab') === 'confirmations' || hash.includes('confirm')) {
        setTimeout(() => {
          const navBtn = document.querySelector('.nav-tab[data-nav="nav-confirmations"]');
          if (navBtn) navBtn.click();
          switchConfirmSubTab('view-confirm-done');
        }, 150);
      }
    } catch (e) { }
  }
  handleUrlDeepLink();

  // Toast Banner Helper for Confirmations
  function showConfirmToast(title, desc, patient) {
    const container = document.getElementById('confirm-toast-container');
    if (!container) return;
    const titleEl = document.getElementById('confirm-toast-title');
    const descEl = document.getElementById('confirm-toast-desc');
    const btnAudioguia = document.getElementById('btn-toast-send-audioguia');
    const btnGoto = document.getElementById('btn-toast-goto-confirmed');
    const btnClose = document.getElementById('btn-toast-close');

    if (titleEl) titleEl.textContent = title;
    if (descEl) descEl.textContent = desc;

    if (btnAudioguia) {
      if (patient) {
        btnAudioguia.style.display = 'inline-flex';
        btnAudioguia.onclick = () => {
          const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
          const radiofarmaco = patient.radiofarmaco || patient.tipoEstudio || '18F-FDG';
          confirmAndSendAudioguia(patient.id, cleanName, nhcVal, patient.fechaCita, patient.horaCita, radiofarmaco);
        };
      } else {
        btnAudioguia.style.display = 'none';
      }
    }

    if (btnGoto) {
      btnGoto.onclick = () => {
        switchConfirmSubTab('view-confirm-done');
        container.style.display = 'none';
      };
    }

    if (btnClose) {
      btnClose.onclick = () => {
        container.style.display = 'none';
      };
    }

    container.style.display = 'block';
  }

  // Bulk confirmation button in pending tab
  const btnConfirmAllVisible = document.getElementById('btn-confirm-all-visible');
  if (btnConfirmAllVisible) {
    btnConfirmAllVisible.addEventListener('click', () => {
      const scheduledPatients = state.submissions.filter(s => !s.requiresProposal);
      const pendingPatients = scheduledPatients.filter(s => !state.confirmations[s.id]);
      if (pendingPatients.length === 0) {
        alert("Todos los pacientes citados ya se encuentran confirmados.");
        switchConfirmSubTab('view-confirm-done');
        return;
      }
      if (!confirm(`¿Confirmar la citación de los ${pendingPatients.length} pacientes pendientes a la vez?`)) {
        return;
      }
      pendingPatients.forEach(p => {
        state.confirmations[p.id] = true;
        updateConfirmationInMasterDb(p.id, true);
      });
      try {
        localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
      } catch (e) { }
      updateKPIs();
      renderConfirmationsTable();
      renderWeeklyGrid();
      renderSubmissionsTable();
      switchConfirmSubTab('view-confirm-done');
      showConfirmToast(
        "🎉 ¡Todos los Pacientes Han Sido Confirmados!",
        `Se han pasado ${pendingPatients.length} pacientes a la lista de confirmados. Ahora puedes enviarles su audioguía o generar la petición de dosis para el pedido.`,
        null
      );

      // Sugerir abrir la petición de dosis para el pedido
      setTimeout(() => {
        const targetDate = (pendingPatients[0] && pendingPatients[0].fechaCita) ? pendingPatients[0].fechaCita : formatDate(new Date());
        if (confirm(`📦 Se han confirmado los pacientes.\n\n¿Deseas abrir ahora la Hoja de Petición y Pedido de Dosis de Radiofármacos (Ciclotrón / Radiofarmacia / Curium Madrid) para el día ${targetDate}?`)) {
          openRadiopharmacyOrderModal(targetDate, false);
        }
      }, 550);
    });
  }

  // Batch audioguide button in confirmed tab
  const btnSendAllConfirmed = document.getElementById('btn-send-all-confirmed');
  if (btnSendAllConfirmed) {
    btnSendAllConfirmed.addEventListener('click', () => {
      const scheduledPatients = state.submissions.filter(s => !s.requiresProposal);
      const confirmedPatients = scheduledPatients.filter(s => !!state.confirmations[s.id]);
      if (confirmedPatients.length === 0) {
        alert("No hay pacientes confirmados aún. Primero confirma los pacientes en la pestaña '1. Pendientes de Confirmar'.");
        switchConfirmSubTab('view-confirm-pending');
        return;
      }
      // Find first patient without audioguia sent yet, or the first confirmed
      const pendingAudioguia = confirmedPatients.find(p => !state.audioguiaSent || !state.audioguiaSent[p.id]) || confirmedPatients[0];
      const { cleanName, nhcVal } = extractPatientNameAndNhc(pendingAudioguia);
      const radiofarmaco = pendingAudioguia.radiofarmaco || pendingAudioguia.tipoEstudio || '18F-FDG';
      confirmAndSendAudioguia(pendingAudioguia.id, cleanName, nhcVal, pendingAudioguia.fechaCita, pendingAudioguia.horaCita, radiofarmaco);
    });
  }

  function populateAnnualWeekSelector() {
    weekSelector.innerHTML = '';
    const startDate = new Date(state.baseDate);

    for (let w = 0; w < 52; w++) {
      const wStart = new Date(startDate);
      wStart.setDate(startDate.getDate() + (w * 7));

      const wEnd = new Date(wStart);
      wEnd.setDate(wStart.getDate() + 5); // Sábado

      const opt = document.createElement('option');
      opt.value = w;
      const startStr = `${wStart.getDate()} ${getMonthAbbr(wStart.getMonth())}`;
      const endStr = `${wEnd.getDate()} ${getMonthAbbr(wEnd.getMonth())} ${wEnd.getFullYear()}`;

      if (w === 0) {
        opt.textContent = `⭐ Semana Actual (${startStr} - ${endStr}) [Hoy en adelante]`;
        opt.selected = true;
      } else {
        opt.textContent = `Semana +${w} (${startStr} - ${endStr})`;
      }

      weekSelector.appendChild(opt);
    }
  }

  function getMonthAbbr(m) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months[m] || '';
  }

  /**
   * Purga automática de pacientes confirmados y realizados tras 1 mes (30 días)
   * de la realización de la prueba para no saturar la base de datos.
   */
  function applyOneMonthAutoPurge(records) {
    if (!Array.isArray(records)) return { filtered: [], purgedCount: 0 };

    const today = new Date();
    const cutoffDate = new Date(today);
    cutoffDate.setDate(today.getDate() - 30);
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffStr = formatDate(cutoffDate);

    let purgedCount = 0;
    const filtered = records.filter(item => {
      const subId = item["Submission ID"] || item.id || item.paciente_id;
      const fechaCita = item["Fecha Cita Asignada"] || item.fecha_cita || "";
      const estadoTriaje = String(item["Estado de Triaje"] || "").toLowerCase();
      const isConfirmed = !!state.confirmations[subId];

      // Peticiones sin cita asignada o pendientes de triaje NO se purgan (siguen esperando cita)
      if (!fechaCita || fechaCita.includes("SIN AGENDAR") || fechaCita.trim() === "" || estadoTriaje.includes("pendiente")) {
        return true;
      }

      // Si la fecha de la prueba es anterior a hace 30 días respecto a hoy
      if (fechaCita < cutoffStr) {
        purgedCount++;
        if (state.confirmations[subId]) delete state.confirmations[subId];
        if (state.peonadaAssignments[subId]) delete state.peonadaAssignments[subId];
        return false; // ELIMINADO de la base de datos para no saturarla
      }

      return true;
    });

    if (purgedCount > 0) {
      console.log(`🧹 Purga automática: ${purgedCount} paciente(s) realizados de >30 días eliminados de la base de datos.`);
      try {
        localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
        localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
      } catch (e) { }
    }

    return { filtered, purgedCount };
  }

  /**
   * Sincronización en Vivo con la Base de Datos Clínica Unificada (pet_peticion_medica)
   * Desvinculado completamente de Google Sheets / Excel
   */
  async function syncClinicalDatabase(manual = false) {
    if (manual && btnSyncSheet) {
      btnSyncSheet.textContent = "⏳ Sincronizando...";
    }

    if (!state.submissions || state.submissions.length === 0) {
      loadInitialSynchronousData();
    }

    try {
      // 1. Conexión directa a la API en vivo /api/sync-database (conectada con pet_peticion_medica)
      try {
        const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
        const response = await fetch(`${baseUrl}/api/sync-database`);
        if (response.ok) {
          const res = await response.json();
          if (res.status === "success" && Array.isArray(res.data) && res.data.length > 0) {
            const mergedRaw = mergeWithLocalMasterDb(res.data);
            const { filtered, purgedCount } = applyOneMonthAutoPurge(mergedRaw);
            try {
              localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(filtered));
            } catch (e) { }
            const mappedItems = mapDatabaseRecords(filtered);
            processFetchedItems(mappedItems);
            if (syncStatus) {
              syncStatus.textContent = `● Conectado a pet_peticion_medica/database (${filtered.length} pacientes | En Vivo)`;
            }
            if (manual && btnSyncSheet) btnSyncSheet.textContent = "🔄 Sincronizar Base de Datos";
            return;
          }
        }
      } catch (apiErr) {
        console.warn("Aviso: /api/sync-database no disponible, recurriendo a archivo directo...", apiErr);
      }

      // 2. Conexión directa al archivo maestro pet_peticion_medica/database/peticiones_db.json
      let fileRes = null;
      try {
        fileRes = await fetch('/pet_peticion_medica/database/peticiones_db.json');
      } catch (e) { }

      if (!fileRes || !fileRes.ok) {
        try {
          fileRes = await fetch('../../pet_peticion_medica/database/peticiones_db.json');
        } catch (e) { }
      }

      if (!fileRes || !fileRes.ok) {
        try {
          fileRes = await fetch('peticiones_db.json');
        } catch (e) { }
      }

      if (!fileRes || !fileRes.ok) {
        try {
          fileRes = await fetch('pacientes_pet_ct_250.json');
        } catch (e) { }
      }

      if (fileRes && fileRes.ok) {
        const rawJson = await fileRes.json();
        const mergedRaw = mergeWithLocalMasterDb(rawJson);
        const { filtered, purgedCount } = applyOneMonthAutoPurge(mergedRaw);
        try {
          localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(filtered));
        } catch (e) { }
        const mappedItems = mapDatabaseRecords(filtered);
        processFetchedItems(mappedItems);
        if (syncStatus) {
          syncStatus.textContent = `● Conectado a pet_peticion_medica/database (${mappedItems.length} pacientes | En Vivo)`;
        }
        if (manual && btnSyncSheet) btnSyncSheet.textContent = "🔄 Sincronizar Base de Datos";
        return;
      }

      // 2.5. Semilla global síncrona si fetch falló (por ejemplo abriendo por file://)
      if ((!fileRes || !fileRes.ok) && window.PETICIONES_DATABASE_SEED && Array.isArray(window.PETICIONES_DATABASE_SEED)) {
        const rawJson = window.PETICIONES_DATABASE_SEED;
        const mergedRaw = mergeWithLocalMasterDb(rawJson);
        const { filtered, purgedCount } = applyOneMonthAutoPurge(mergedRaw);
        try {
          localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(filtered));
        } catch (e) { }
        const mappedItems = mapDatabaseRecords(filtered);
        processFetchedItems(mappedItems);
        if (syncStatus) {
          syncStatus.textContent = `● Conectado a Base Maestra (${mappedItems.length} pacientes | En Vivo)`;
        }
        if (manual && btnSyncSheet) btnSyncSheet.textContent = "🔄 Sincronizar Base de Datos";
        return;
      }

      // 3. Fallback en caché LocalStorage compartido ('PET_DATABASE_MASTER_V4')
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        try {
          const storedRecords = JSON.parse(stored);
          if (Array.isArray(storedRecords) && storedRecords.length > 0) {
            const { filtered, purgedCount } = applyOneMonthAutoPurge(storedRecords);
            const mappedItems = mapDatabaseRecords(filtered);
            processFetchedItems(mappedItems);
            if (syncStatus) {
              syncStatus.textContent = `● Base de Datos en Caché (${filtered.length} pacientes | pet_peticion_medica/database)`;
            }
            if (manual && btnSyncSheet) btnSyncSheet.textContent = "🔄 Sincronizar Base de Datos";
            return;
          }
        } catch (parseErr) {
          console.warn("Error parseando PET_DATABASE_MASTER_V4:", parseErr);
        }
      }

      throw new Error("No se pudo conectar con la base de datos de pet_peticion_medica.");

    } catch (err) {
      console.warn("Error en sincronización clínica:", err);
      if (syncStatus) syncStatus.textContent = "⚠️ Base de Datos Desconectada";
      if (manual && btnSyncSheet) btnSyncSheet.textContent = "🔄 Reintentar";
    }
  }

  function mapDatabaseRecords(records) {
    return records.map((row, idx) => {
      const subId = row["Submission ID"] || row.id || row.paciente_id || `sub_${idx + 1}`;
      const nombre = row["Nombre del Paciente"] || row["Nombre y Apellidos"] || row.nombre || `Paciente #${idx + 1}`;
      const nhc = row["NHC / Historia Clínica"] || row["Número de Historia Clínica"] || row.nhc || '';
      const fullNombre = (nhc && !nombre.includes('NHC:')) ? `${nombre} (NHC: ${nhc})` : nombre;
      const rf = row["Tipo de Estudio PET Solicitado"] || row.radiofarmaco || row.tipo_estudio || "18F-FDG";
      const motivo = row["Motivo de Solicitud"] || row["Motivo de la Petición"] || row["Diagnóstico Clínico"] || row.motivo || row.indicacion || getSampleMotivo(rf);

      const prioRaw = String(row["Prioridad Calculada"] || row["Carácter de la Petición"] || row.prioridad || "🟢 P3");
      let prio = prioRaw;
      if (!prio.includes('P1') && !prio.includes('P2') && !prio.includes('P3')) {
        const prioLower = prio.toLowerCase();
        if (prioLower.includes('urgente')) prio = '🔴 P1';
        else if (prioLower.includes('preferente')) prio = '🟡 P2';
        else prio = '🟢 P3';
      }

      // Comprobar si existe discrepancia entre la prioridad solicitada y la calculada
      const prioSolicitada = row["Carácter de la Petición"] || row["Prioridad Solicitada"] || row.prioridad || "🟢 P3";
      const prioCalculada = row["Prioridad Calculada"] || row["Prioridad Protocolo"] || prio;

      const getPrioCat = (p) => {
        const s = String(p || '').toLowerCase();
        if (s.includes('1') || s.includes('urgente')) return 'P1';
        if (s.includes('2') || s.includes('preferente')) return 'P2';
        return 'P3';
      };

      const catSolicitada = getPrioCat(prioSolicitada);
      const catCalculada = getPrioCat(prioCalculada);
      const hasDiscrepancy = (catSolicitada !== catCalculada) && !row.resolucionMedicaTriaje;

      const estadoTriaje = String(row["Estado de Triaje"] || "").toLowerCase();
      const isNoTriable = hasDiscrepancy || row.noTriable === true || estadoTriaje === "no triable";

      if (isNoTriable) {
        row.noTriable = true;
        row["Estado de Triaje"] = "No Triable";
        if (hasDiscrepancy && !row.motivoNoTriable) {
          row.motivoNoTriable = `⚠️ Discrepancia de prioridades: El médico solicitó ${catSolicitada} (${prioSolicitada}), pero el protocolo del programa calculó ${catCalculada} (${prioCalculada}). Enviado a la Carpeta No Triable para que el médico de Medicina Nuclear lo trie.`;
        }
      }

      let maxDays = parseInt(row["Ventana Clínica (Días Laborables)"] || 0);
      if (!maxDays) {
        maxDays = prio.includes('P1') ? 7 : prio.includes('P2') ? 14 : 30;
      }

      const fechaSol = row["Fecha Solicitud"] || row["Submitted at"] || row.fecha_solicitud || "2026-08-01";
      const fechaCita = row["Fecha Cita Asignada"] || row.fecha_cita || "";
      const horaCita = row["Hora Cita Asignada"] || row.hora_cita || "";

      const isUnscheduled = isNoTriable ? true : (!fechaCita || fechaCita.includes("SIN AGENDAR") || fechaCita.trim() === "" || estadoTriaje.includes("pendiente"));

      if (row["Audioguía Enviada"] === "Sí" || row["Audioguía Enviada"] === "Si" || row.audioguia_enviada === true) {
        if (!state.audioguiaSent) state.audioguiaSent = {};
        state.audioguiaSent[subId] = true;
      }

      return {
        paciente_id: subId,
        nombre: fullNombre,
        cleanNombre: nombre,
        nhc: nhc || subId,
        radiofarmaco: rf,
        tipo_estudio: rf,
        motivo: motivo,
        prioridad: prio,
        max_dias_ventana: maxDays,
        fecha_solicitud: fechaSol,
        fecha_limite: addBusinessDaysJS(fechaSol, maxDays),
        fecha_cita: isNoTriable ? "SIN AGENDAR" : (isUnscheduled ? "SIN AGENDAR" : fechaCita),
        hora_cita: isNoTriable ? "Sin Cita / No Triable (Derivado a Medicina Nuclear)" : (isUnscheduled ? "Pendiente de Triaje" : horaCita),
        requires_proposal: isNoTriable ? false : isUnscheduled,
        proposed_date: isUnscheduled ? (row.proposed_date || row["Fecha Propuesta"] || addBusinessDaysJS(fechaSol, 3)) : fechaCita,
        alertas_tecnicas: isNoTriable ? (row.motivoNoTriable || "⚠️ No Triable - No concuerdan prioridades") : (row["Alertas Técnicas"] || row.alertas_tecnicas || "Ninguna"),
        raw: row
      };
    });
  }

  function processFetchedItems(items) {
    state.submissions = [];
    state.proposalsByPriority = { p1: [], p2: [], p3: [] };
    state.occupiedMap = {};
    if (!state.rawSubmissionsMap) state.rawSubmissionsMap = {};

    items.forEach(item => {
      const alertsArr = [];
      if (item.alertas_tecnicas) {
        item.alertas_tecnicas.split(" | ").forEach(t => {
          if (t.trim()) {
            alertsArr.push({
              type: t.includes("DIABETES") ? "diabetes" : t.includes("PROPUESTA") ? "proposal" : "tech",
              text: t
            });
          }
        });
      }

      const rfKey = normalizeRadiofarmaco(item.radiofarmaco || "18F-FDG");
      const videoUrl = getVideoGuideUrl(item.radiofarmaco, item.alertas_tecnicas && item.alertas_tecnicas.includes("DIABETES"));

      let fechaCitaVal = item.fecha_cita;
      let horaCitaVal = item.hora_cita;
      let requiresProp = !!item.requires_proposal || item.fecha_cita.includes("SIN AGENDAR");

      if (state.peonadaAssignments[item.paciente_id]) {
        requiresProp = false;
        fechaCitaVal = state.peonadaAssignments[item.paciente_id].fechaCita;
        horaCitaVal = state.peonadaAssignments[item.paciente_id].horaCita;
      }

      const extracted = extractPatientNameAndNhc({ nombre: item.nombre, nhc: item.nhc, id: item.paciente_id });
      const rawRecord = item.raw || item;
      state.rawSubmissionsMap[item.paciente_id] = rawRecord;
      if (extracted.nhcVal) state.rawSubmissionsMap[extracted.nhcVal] = rawRecord;

      const record = {
        id: item.paciente_id,
        nombre: item.nombre,
        cleanNombre: extracted.cleanName,
        nhc: extracted.nhcVal,
        radiofarmaco: item.radiofarmaco || "18F-FDG",
        tipoEstudio: item.tipo_estudio || item.radiofarmaco || "18F-FDG",
        motivo: item.motivo || item.indicacion || getSampleMotivo(item.radiofarmaco),
        prioridad: item.prioridad,
        maxDias: item.max_dias_ventana,
        fechaSolicitud: item.fecha_solicitud || "-",
        fechaLimite: item.fecha_limite || "-",
        fechaCita: fechaCitaVal,
        horaCita: horaCitaVal,
        requiresProposal: requiresProp,
        proposedDate: item.proposed_date,
        videoUrl: videoUrl,
        alertas: alertsArr,
        rfKey: rfKey,
        raw: rawRecord
      };

      if (!record.requiresProposal && !record.raw.noTriable && item.fecha_cita && !item.fecha_cita.includes('SIN AGENDAR')) {
        const mapKey = `${item.fecha_cita}_${rfKey}`;
        state.occupiedMap[mapKey] = (state.occupiedMap[mapKey] || 0) + 1;
      }

      state.submissions.push(record);

      if (record.requiresProposal && !record.raw.noTriable) {
        if (record.prioridad.includes('P1')) state.proposalsByPriority.p1.push(record);
        else if (record.prioridad.includes('P2')) state.proposalsByPriority.p2.push(record);
        else state.proposalsByPriority.p3.push(record);
      }
    });

    persistTriageCitedPatientsSnapshot();
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    if (typeof renderSearchResults === 'function') {
      const searchInput = document.getElementById('patient-search-input');
      renderSearchResults(searchInput ? searchInput.value : '');
    }
  }

  function parseCSV(text) {
    const lines = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      const nextC = text[i + 1];

      if (c === '"') {
        if (insideQuotes && nextC === '"') {
          currentCell += '"';
          i++;
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (c === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if ((c === '\r' || c === '\n') && !insideQuotes) {
        if (c === '\r' && nextC === '\n') i++;
        currentRow.push(currentCell.trim());
        if (currentRow.some(cell => cell.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += c;
      }
    }
    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      lines.push(currentRow);
    }
    return lines;
  }

  function addBusinessDaysJS(startDateStr, days) {
    let cur = new Date(startDateStr);
    if (isNaN(cur.getTime())) cur = new Date();
    let added = 0;
    while (added < days) {
      cur.setDate(cur.getDate() + 1);
      const day = cur.getDay();
      if (day !== 0 && day !== 6) {
        added++;
      }
    }
    return cur.toISOString().split('T')[0];
  }

  /**
   * Sincroniza la asignación de cita o propuesta con la Base de Datos Maestra
   * para reflejar inmediatamente el estado en el portal de facultativos (pet_peticion_medica)
   */
  function syncAssignmentToMasterDatabase(patientId, fechaCita, horaCita, extraData = null) {
    try {
      const targetSub = state.submissions ? state.submissions.find(s => s.id === patientId || s.nhc === patientId) : null;
      const targetNhc = targetSub ? targetSub.nhc : null;
      if (fechaCita && !fechaCita.includes("SIN AGENDAR") && fechaCita.trim() !== "") {
        try {
          const departedMap = JSON.parse(localStorage.getItem('PET_DELETED_DEPARTED_PATIENTS_V1') || '{}');
          const nhcDigits = String(targetNhc || '').replace(/\D/g, '');
          if (patientId && departedMap[patientId]) delete departedMap[patientId];
          if (targetNhc && departedMap[targetNhc]) delete departedMap[targetNhc];
          if (nhcDigits && departedMap[nhcDigits]) delete departedMap[nhcDigits];
          localStorage.setItem('PET_DELETED_DEPARTED_PATIENTS_V1', JSON.stringify(departedMap));
        } catch (e) { }
      }
      persistTriageCitedPatientsSnapshot();
      let dbItems = [];
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        try {
          dbItems = JSON.parse(stored);
        } catch (e) {
          dbItems = [];
        }
      }
      if (!Array.isArray(dbItems)) dbItems = [];

      let found = false;
      for (let i = 0; i < dbItems.length; i++) {
        const item = dbItems[i];
        const itemSubId = item["Submission ID"] || item.id || item.paciente_id || `sub_${i + 1}`;
        const itemNhc = item["NHC / Historia Clínica"] || item.nhc;
        if (itemSubId === patientId || (targetNhc && itemNhc === targetNhc)) {
          item["Fecha Cita Asignada"] = fechaCita;
          item["Hora Cita Asignada"] = horaCita;
          item["Estado de Triaje"] = (fechaCita && !fechaCita.includes("SIN AGENDAR") && fechaCita.trim() !== "") ? "Cita Asignada" : "Pendiente de Triaje";
          found = true;
          break;
        }
      }
      if (!found && extraData) {
        dbItems.unshift(extraData);
      } else if (!found && targetSub && targetSub.raw) {
        dbItems.unshift(targetSub.raw);
      }
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(dbItems));
      const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
      if (extraData) {
        fetch(`${baseUrl}/api/peticiones/crear`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(extraData)
        }).catch(() => { });
      }
      fetch(`${baseUrl}/api/sync-database`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dbItems)
      }).catch(() => { });
      notifyClinicalEcosystemUpdated();
    } catch (e) {
      console.warn("Error sincronizando asignación con PET_DATABASE_MASTER_V4:", e);
    }
  }

  function updateConfirmationInMasterDb(patientId, isConfirmed) {
    try {
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        const dbItems = JSON.parse(stored);
        for (let i = 0; i < dbItems.length; i++) {
          const item = dbItems[i];
          if (item["Submission ID"] === patientId || item.id === patientId || item.paciente_id === patientId) {
            item["Estado Confirmación"] = isConfirmed ? "Confirmada" : "Pendiente";
            break;
          }
        }
        localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(dbItems));
        const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
        fetch(`${baseUrl}/api/sync-database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbItems)
        }).catch(() => { });
      }
    } catch (e) { }
  }

  function syncAudioguiaSentToMasterDb(patientId) {
    try {
      const stored = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (stored) {
        const dbItems = JSON.parse(stored);
        for (let i = 0; i < dbItems.length; i++) {
          const item = dbItems[i];
          if (item["Submission ID"] === patientId || item.id === patientId || item.paciente_id === patientId) {
            item["Audioguía Enviada"] = "Sí";
            item["audioguia_enviada"] = true;
            item["Fecha Envío Audioguía"] = new Date().toISOString();
            break;
          }
        }
        localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(dbItems));
        const baseUrl = (window.location.protocol === 'http:' || window.location.protocol === 'https:') ? '' : 'http://localhost:8000';
        fetch(`${baseUrl}/api/sync-database`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dbItems)
        }).catch(() => { });
      }
    } catch (e) {
      console.warn("Error sincronizando Audioguía Enviada en Master DB:", e);
    }
  }

  function updateKPIs() {
    let p1 = 0, p2 = 0, p3 = 0, confirmedCount = 0;
    state.submissions.forEach(s => {
      if (s.prioridad.includes('P1')) p1++;
      else if (s.prioridad.includes('P2')) p2++;
      else p3++;

      if (state.confirmations[s.id]) {
        confirmedCount++;
      }
    });

    const totalProposals = state.proposalsByPriority.p1.length + state.proposalsByPriority.p2.length + state.proposalsByPriority.p3.length;
    const scheduledTotal = state.submissions.length - totalProposals;

    kpiP1.textContent = p1;
    kpiP2.textContent = p2;
    kpiP3.textContent = p3;
    kpiProposals.textContent = totalProposals;
    kpiConfirmed.textContent = `${confirmedCount} / ${scheduledTotal}`;
    kpiTotal.textContent = state.submissions.length;

    countNavConfirmed.textContent = `${confirmedCount}/${scheduledTotal}`;
    countNavProposals.textContent = totalProposals;

    countPropP1.textContent = state.proposalsByPriority.p1.length;
    countPropP2.textContent = state.proposalsByPriority.p2.length;
    countPropP3.textContent = state.proposalsByPriority.p3.length;

  }

  function getRfClass(rfStr) {
    const rfLower = String(rfStr || '').toLowerCase();
    if (rfLower.includes('dopa')) return 'dopa';
    if (rfLower.includes('amiloide') || rfLower.includes('florbetapir') || rfLower.includes('flutemetamol') || rfLower.includes('tau') || rfLower.includes('cerebral') || rfLower.includes('neuro')) return 'neuro';
    if (rfLower.includes('lu-177') || rfLower.includes('177lu') || rfLower.includes('terapia') || rfLower.includes('radioligand')) return 'terapia';
    if (rfLower.includes('psma')) return 'psma';
    if (rfLower.includes('colina') || rfLower.includes('fch')) return 'colina';
    if (rfLower.includes('68ga') || rfLower.includes('galio') || rfLower.includes('somatostatina') || rfLower.includes('dotatate') || rfLower.includes('dotatoc')) return 'ga68';
    if (rfLower.includes('fdg')) return 'fdg';
    return 'custom';
  }

  function getDayAgendaConfig(dateStr) {
    if (state.agendaConfig && state.agendaConfig.specificDates && state.agendaConfig.specificDates[dateStr]) {
      return JSON.parse(JSON.stringify(state.agendaConfig.specificDates[dateStr]));
    }
    const parts = dateStr.split('-');
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayOfWeek = d.getDay(); // 0 = Domingo, 1 = Lunes, ...
    const fallbackTemplate = getDefaultAgendaConfig().weeklyTemplate;
    const template = (state.agendaConfig?.weeklyTemplate?.[dayOfWeek]) || fallbackTemplate[dayOfWeek] || fallbackTemplate[1];
    return JSON.parse(JSON.stringify(template));
  }

  function saveDayAgendaConfig(dateStr, config, applyToWeeklyTemplate = false) {
    if (!state.agendaConfig) state.agendaConfig = getDefaultAgendaConfig();
    if (!state.agendaConfig.specificDates) state.agendaConfig.specificDates = {};

    state.agendaConfig.specificDates[dateStr] = JSON.parse(JSON.stringify(config));

    if (applyToWeeklyTemplate) {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const dayOfWeek = d.getDay();
      if (!state.agendaConfig.weeklyTemplate) state.agendaConfig.weeklyTemplate = {};
      state.agendaConfig.weeklyTemplate[dayOfWeek] = JSON.parse(JSON.stringify(config));
    }

    try {
      localStorage.setItem('pet_ct_agenda_config', JSON.stringify(state.agendaConfig));
    } catch (e) { }
  }

  function generateShiftSlotTimes(shiftConfig) {
    if (!shiftConfig || !shiftConfig.active) return [];
    const slots = [];
    const [startH, startM] = (shiftConfig.startTime || "08:00").split(':').map(Number);
    const [endH, endM] = (shiftConfig.endTime || "12:00").split(':').map(Number);
    const interval = parseInt(shiftConfig.intervalMin || 30);
    const maxSlots = parseInt(shiftConfig.maxSlots || 20);

    let curMin = startH * 60 + startM;
    const endTotalMin = endH * 60 + endM;

    while (curMin <= endTotalMin && slots.length < maxSlots) {
      const h = Math.floor(curMin / 60);
      const m = curMin % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      curMin += interval;
    }
    return slots;
  }

  function matchesTreatment(patientRf, allowedTreatments) {
    if (!allowedTreatments || allowedTreatments.length === 0) return true;
    const pLower = String(patientRf || '').toLowerCase();

    return allowedTreatments.some(t => {
      const tLower = String(t).toLowerCase();
      if (tLower.includes('fdg') && pLower.includes('fdg')) return true;
      if (tLower.includes('psma') && pLower.includes('psma')) return true;
      if (tLower.includes('colina') && pLower.includes('colina')) return true;
      if ((tLower.includes('68ga') || tLower.includes('ga68') || tLower.includes('somatostatina') || tLower.includes('dotat')) &&
        (pLower.includes('68ga') || pLower.includes('ga68') || pLower.includes('somatostatina') || pLower.includes('dotat'))) return true;
      if (tLower.includes('dopa') && pLower.includes('dopa')) return true;
      if ((tLower.includes('amiloide') || tLower.includes('florbetapir') || tLower.includes('flutemetamol') || tLower.includes('tau') || tLower.includes('demencia')) &&
        (pLower.includes('amiloide') || pLower.includes('florbetapir') || pLower.includes('flutemetamol') || pLower.includes('tau') || pLower.includes('neuro'))) return true;
      if (tLower.includes('neuro') && pLower.includes('neuro')) return true;
      if ((tLower.includes('lu-177') || tLower.includes('177lu') || tLower.includes('terapia')) &&
        (pLower.includes('lu-177') || pLower.includes('177lu') || pLower.includes('terapia') || pLower.includes('radioligand'))) return true;
      return pLower.includes(tLower) || tLower.includes(pLower);
    });
  }

  function updateAgendaCapacityStats() {
    const el = document.getElementById('agenda-capacity-stats');
    if (!el) return;

    const startOfWeek = new Date(state.baseDate);
    startOfWeek.setDate(state.baseDate.getDate() + (state.selectedWeekIndex * 7));

    let totalMorningSlots = 0;
    let totalAfternoonSlots = 0;
    let occupiedMorning = 0;
    let occupiedAfternoon = 0;

    for (let i = 0; i < 6; i++) {
      const colDate = new Date(startOfWeek);
      colDate.setDate(startOfWeek.getDate() + i);
      const dateStr = formatDate(colDate);
      const dayConfig = getDayAgendaConfig(dateStr);

      if (dayConfig.morning && dayConfig.morning.active) {
        totalMorningSlots += parseInt(dayConfig.morning.maxSlots || 8);
      }
      if (dayConfig.afternoon && dayConfig.afternoon.active) {
        totalAfternoonSlots += parseInt(dayConfig.afternoon.maxSlots || 6);
      }

      const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);
      dayPatients.forEach(p => {
        const hora = String(p.horaCita || '');
        const isAfternoon = hora.includes('Tarde') || hora.includes('Peonada') || (parseInt(hora) >= 14);
        if (isAfternoon) occupiedAfternoon++;
        else occupiedMorning++;
      });
    }

    el.innerHTML = `📊 Capacidad Semanal: ☀️ <strong>Mañanas</strong> ${occupiedMorning}/${totalMorningSlots} · 🌆 <strong>Tardes</strong> ${occupiedAfternoon}/${totalAfternoonSlots} cupos`;
  }

  function renderWeeklyGrid() {
    weeklyGrid.innerHTML = '';

    const startOfWeek = new Date(state.baseDate);
    startOfWeek.setDate(state.baseDate.getDate() + (state.selectedWeekIndex * 7));
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    for (let i = 0; i < 6; i++) {
      const colDate = new Date(startOfWeek);
      colDate.setDate(startOfWeek.getDate() + i);
      const dateStr = formatDate(colDate);
      const todayDateStr = formatDate(new Date());
      const isToday = (dateStr === todayDateStr);

      const dayConfig = getDayAgendaConfig(dateStr);
      const morningConfig = dayConfig.morning || { active: true, maxSlots: 8, treatments: ["18F-FDG"] };
      const afternoonConfig = dayConfig.afternoon || { active: false, maxSlots: 6, treatments: ["18F-FDG"] };

      const dayCol = document.createElement('div');
      dayCol.className = isToday ? 'day-column today-column' : 'day-column';

      const todayBadge = isToday ? '<span style="background: #0284c7; color: #fff; font-size: 0.65rem; font-weight: 700; padding: 2px 7px; border-radius: 6px; margin-left: 4px; box-shadow: 0 2px 6px rgba(2,132,199,0.3);">⭐ HOY</span>' : '';

      // Header del Día con botones de configuración, triaje automático e impresión
      const dayHeader = document.createElement('div');
      dayHeader.className = 'day-header';
      if (isToday) {
        dayHeader.style.background = '#e0f2fe';
        dayHeader.style.borderBottom = '2px solid #0284c7';
        dayHeader.style.padding = '0.35rem 0.5rem';
        dayHeader.style.borderRadius = '8px 8px 0 0';
      }
      dayHeader.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.35rem;">
          <span style="color: ${isToday ? '#0369a1' : 'inherit'}; font-weight: ${isToday ? '800' : '700'};">${days[i]}</span>
          <span style="font-size: 0.72rem; color: ${isToday ? '#0284c7' : '#52718A'}; font-weight: ${isToday ? '700' : '500'};">${colDate.getDate()}/${colDate.getMonth() + 1}</span>
          ${todayBadge}
        </div>
        <div style="display: flex; align-items: center; gap: 0.15rem;">
          <button class="btn-day-action btn-config-day" data-date="${dateStr}" title="⚙️ Configurar citación, turnos y tratamientos de ${days[i]} ${colDate.getDate()}/${colDate.getMonth() + 1}">
            ⚙️
          </button>
          <button class="btn-day-action btn-fill-day" data-date="${dateStr}" title="⚡ Rellenar este día automáticamente con su triaje clínico (P1 > P2 > P3)">
            ⚡
          </button>
          <button class="btn-day-action btn-order-day" data-date="${dateStr}" title="📦 Confirmar citas de ${days[i]} y generar pedido de dosis (Ciclotrón / Radiofarmacia / Curium Madrid)">
            📦
          </button>
          <button class="btn-day-action btn-unassign-day" data-date="${dateStr}" title="🧹 Desagendar este día (${days[i]} ${colDate.getDate()}/${colDate.getMonth() + 1}) y devolver los pacientes a la lista de espera">
            🧹
          </button>
          <button class="btn-day-action btn-print-day" data-date="${dateStr}" title="🖨️ Imprimir Citas de ${days[i]} ${colDate.getDate()}/${colDate.getMonth() + 1}">
            🖨️
          </button>
        </div>
      `;

      dayHeader.querySelector('.btn-print-day').addEventListener('click', (e) => {
        e.stopPropagation();
        printDaySchedule(dateStr);
      });

      dayHeader.querySelector('.btn-config-day').addEventListener('click', (e) => {
        e.stopPropagation();
        openDayAgendaModal(dateStr);
      });

      dayHeader.querySelector('.btn-fill-day').addEventListener('click', (e) => {
        e.stopPropagation();
        runTriageAutoScheduler({ targetDateStr: dateStr });
      });

      const btnOrderDay = dayHeader.querySelector('.btn-order-day');
      if (btnOrderDay) {
        btnOrderDay.addEventListener('click', (e) => {
          e.stopPropagation();
          confirmDayAndGenerateDoseOrder(dateStr);
        });
      }

      const btnUnassignDay = dayHeader.querySelector('.btn-unassign-day');
      if (btnUnassignDay) {
        btnUnassignDay.addEventListener('click', (e) => {
          e.stopPropagation();
          resetDayPatientCitations(dateStr);
        });
      }

      dayCol.appendChild(dayHeader);

      // Resumen de Turnos y Tratamientos del Día (Badges)
      const shiftBadges = document.createElement('div');
      shiftBadges.className = 'day-shift-badges';

      const morningRfText = (morningConfig.treatments && morningConfig.treatments.length > 0)
        ? morningConfig.treatments.join(', ')
        : 'FDG';
      const morningBadge = `
        <div class="shift-summary-pill morning" title="Turno de Mañana: ${morningConfig.maxSlots || 8} cupos máx (${morningRfText})">
          <span>☀️ Mañana: <strong>${morningConfig.maxSlots || 8} cupos</strong></span>
          <span style="font-size:0.65rem; opacity:0.85; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${morningRfText}</span>
        </div>
      `;

      let afternoonBadge = '';
      if (afternoonConfig && afternoonConfig.active) {
        const aftRfText = (afternoonConfig.treatments && afternoonConfig.treatments.length > 0)
          ? afternoonConfig.treatments.join(', ')
          : 'FDG';
        afternoonBadge = `
          <div class="shift-summary-pill afternoon" title="Turno de Tarde Activo: ${afternoonConfig.maxSlots || 6} cupos máx (${aftRfText})">
            <span>🌆 Tarde: <strong>${afternoonConfig.maxSlots || 6} cupos</strong></span>
            <span style="font-size:0.65rem; opacity:0.85; max-width:85px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${aftRfText}</span>
          </div>
        `;
      } else {
        afternoonBadge = `
          <div class="shift-summary-pill afternoon-inactive btn-quick-activate-afternoon" data-date="${dateStr}" title="Haz clic para activar de inmediato el Turno de Tarde para este día">
            <span>🌆 Turno Tarde Inactivo</span>
            <span style="color:#b45309; font-weight:800;">+ Activar Tarde</span>
          </div>
        `;
      }

      shiftBadges.innerHTML = morningBadge + afternoonBadge;
      const btnQuickAft = shiftBadges.querySelector('.btn-quick-activate-afternoon');
      if (btnQuickAft) {
        btnQuickAft.addEventListener('click', (e) => {
          e.stopPropagation();
          const curConfig = getDayAgendaConfig(dateStr);
          if (!curConfig.afternoon) curConfig.afternoon = { active: true, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] };
          curConfig.afternoon.active = true;
          saveDayAgendaConfig(dateStr, curConfig, false);
          renderWeeklyGrid();
          updateAgendaCapacityStats();
        });
      }
      dayCol.appendChild(shiftBadges);

      // Citas de este día
      const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);
      dayPatients.sort((a, b) => String(a.horaCita).localeCompare(String(b.horaCita)));

      // Clasificar en Mañana y Tarde
      const morningPatients = [];
      const afternoonPatients = [];

      dayPatients.forEach(p => {
        const horaStr = String(p.horaCita || '');
        const isAfternoon = horaStr.includes('Tarde') || horaStr.includes('Peonada') || (parseInt(horaStr) >= 14);
        if (isAfternoon) {
          afternoonPatients.push(p);
        } else {
          morningPatients.push(p);
        }
      });

      const slotsDiv = document.createElement('div');
      slotsDiv.className = 'day-slots';

      // ==========================================
      // SECCIÓN 1: TURNO DE MAÑANA
      // ==========================================
      const morningSection = document.createElement('div');
      morningSection.className = 'shift-section';

      const morningHeader = document.createElement('div');
      morningHeader.className = 'shift-section-header morning';
      morningHeader.innerHTML = `
        <span>☀️ Mañana (${morningPatients.length}/${morningConfig.active ? (morningConfig.maxSlots || 8) : 0})</span>
        <span style="font-size:0.65rem; font-weight:600; opacity:0.85;">${morningConfig.startTime || '08:00'}-${morningConfig.endTime || '12:00'}</span>
      `;
      morningSection.appendChild(morningHeader);

      if (morningConfig.active) {
        // Renderizar pacientes de mañana
        morningPatients.forEach(p => {
          const slotCard = document.createElement('div');
          const rfClass = getRfClass(p.radiofarmaco);

          const isConfirmed = state.confirmations[p.id];
          const confirmTag = isConfirmed ? ' <span style="color:#059669; font-weight:bold;">✓</span>' : '';
          const isAudioSent = state.audioguiaSent && state.audioguiaSent[p.id];
          const audioTag = isAudioSent ? ' <span class="badge" style="background:#ecfdf5; color:#065f46; border:1px solid #10b981; font-size:0.68rem; font-weight:800; padding:1px 5px; margin-left:3px;" title="Audioguía enviada al paciente">✅ Audioguía</span>' : '';

          const mobInfo = getPatientMobilityHospitalizationInfo(p);
          const isBadFirstMorning = mobInfo.isLateShift && isFirstSlotOfDayOrShift(dateStr, p.horaCita);
          const badCitationMorningHtml = isBadFirstMorning
            ? `<div class="alert-bad-citation">⚠️ Cita no óptima: Hospitalizado/Mov. Reducida de 1º (debe ir de último)</div>`
            : '';
          const mobBadgeMorningHtml = mobInfo.isLateShift
            ? `<div style="margin-top: 3px;"><span class="badge-late-shift" title="${mobInfo.label}">${mobInfo.label}</span></div>`
            : '';

          slotCard.className = `slot-card ${rfClass}`;
          slotCard.setAttribute('data-id', p.id);
          slotCard.innerHTML = `
            ${badCitationMorningHtml}
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="slot-time">⏰ <strong>${p.horaCita}</strong></div>
              <button type="button" class="btn btn-outline btn-pdf-card" data-id="${p.id}" onclick="event.stopPropagation(); openOfficialVolanteModal('${p.id}');" title="Ver Volante Oficial de Petición del Paciente (PDF)" style="padding: 2px 7px; font-size: 0.72rem; line-height: 1.2; font-weight: 700; color: #004868; border-color: #bae6fd; background: #ffffff; border-radius: 5px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">📄 PDF</button>
            </div>
            <div class="slot-patient">👤 <strong>${p.nombre}</strong> (${p.prioridad})${confirmTag}${audioTag}</div>
            ${mobBadgeMorningHtml}
            <div class="slot-details" style="font-size: 0.76rem; color: #52718A; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
              <div>💊 <strong>Fármaco:</strong> <span class="badge-rf ${rfClass}">${p.radiofarmaco}</span></div>
              <div>📋 <strong>Estudio:</strong> ${p.tipoEstudio || 'Estudio PET/CT'}</div>
            </div>
          `;

          slotCard.addEventListener('click', (e) => {
            if (e.target.closest('.btn-pdf-card, .btn-pdf-patient')) return;
            openSlotModal(p);
          });
          morningSection.appendChild(slotCard);
        });

        // Generar huecos libres disponibles en mañana (respetando huecos individuales y fármacos)
        const occupiedTimes = morningPatients.map(p => {
          const m = String(p.horaCita).match(/(\d{2}:\d{2})/);
          return m ? m[1] : '';
        });

        if (dayConfig.customSlots && Array.isArray(dayConfig.customSlots) && dayConfig.customSlots.length > 0) {
          const customMorning = dayConfig.customSlots.filter(s => s.shift === 'morning' || parseInt(s.time) < 14);
          const freeCustomMorning = customMorning.filter(s => !occupiedTimes.includes(s.time));

          freeCustomMorning.forEach(slot => {
            const rf = slot.radiofarmaco || '18F-FDG';
            const rfClass = getRfClass(rf);
            const supp = getRadiofarmacoSupplierInfo(rf);
            const emptyCard = document.createElement('div');
            emptyCard.className = `empty-slot-card has-rf ${rfClass}`;
            emptyCard.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>⏰ <strong>${slot.time} h</strong></span>
                <span class="badge-rf ${rfClass}" style="font-size:0.65rem; padding:1px 5px; font-weight:700;">${rf}</span>
              </div>
              <div style="font-size: 0.68rem; font-weight: 700; color: #0284c7; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">
                <span>➕ Hueco Libre</span>
                <span style="font-size:0.63rem; color:#475569;" title="Origen: ${supp.name}">${supp.icon} ${supp.name}</span>
              </div>
            `;
            emptyCard.addEventListener('click', () => {
              openAssignManualModal(dateStr, `${slot.time} h (${rf})`, rf);
            });
            morningSection.appendChild(emptyCard);
          });
        } else {
          const generatedMorningSlots = generateShiftSlotTimes(morningConfig);
          const remainingMorningSlots = generatedMorningSlots.filter(s => !occupiedTimes.includes(s));
          const maxSlotsToShow = Math.max(0, (morningConfig.maxSlots || 8) - morningPatients.length);
          remainingMorningSlots.slice(0, maxSlotsToShow).forEach(timeStr => {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'empty-slot-card';
            emptyCard.innerHTML = `
              <span>⏰ <strong>${timeStr} h</strong></span>
              <span style="font-size: 0.68rem; font-weight: 700; color: #0284c7;">➕ Hueco Mañana Libre</span>
            `;
            emptyCard.addEventListener('click', () => {
              openAssignManualModal(dateStr, `${timeStr} h`);
            });
            morningSection.appendChild(emptyCard);
          });
        }
      } else {
        const inactiveMorning = document.createElement('div');
        inactiveMorning.style.cssText = 'font-size: 0.73rem; color: #94a3b8; text-align: center; padding: 0.5rem; background: #f8fafc; border-radius: 6px;';
        inactiveMorning.textContent = 'Turno de mañana no programado';
        morningSection.appendChild(inactiveMorning);
      }

      slotsDiv.appendChild(morningSection);

      // ==========================================
      // SECCIÓN 2: TURNO DE TARDE (EDITABLE Y MODULAR)
      // ==========================================
      const afternoonSection = document.createElement('div');
      afternoonSection.className = 'shift-section';

      const afternoonHeader = document.createElement('div');
      afternoonHeader.className = 'shift-section-header afternoon';
      afternoonHeader.innerHTML = `
        <span>🌆 Tarde (${afternoonPatients.length}/${afternoonConfig.active ? (afternoonConfig.maxSlots || 6) : 0})</span>
        <span style="font-size:0.65rem; font-weight:600; opacity:0.85;">${afternoonConfig.active ? `${afternoonConfig.startTime || '15:00'}-${afternoonConfig.endTime || '18:30'}` : 'Inactivo'}</span>
      `;
      afternoonSection.appendChild(afternoonHeader);

      if (afternoonConfig && afternoonConfig.active) {
        // Renderizar pacientes de tarde
        afternoonPatients.forEach(p => {
          const slotCard = document.createElement('div');
          const rfClass = getRfClass(p.radiofarmaco);

          const isConfirmed = state.confirmations[p.id];
          const confirmTag = isConfirmed ? ' <span style="color:#059669; font-weight:bold;">✓</span>' : '';
          const isAudioSent = state.audioguiaSent && state.audioguiaSent[p.id];
          const audioTag = isAudioSent ? ' <span class="badge" style="background:#ecfdf5; color:#065f46; border:1px solid #10b981; font-size:0.68rem; font-weight:800; padding:1px 5px; margin-left:3px;" title="Audioguía enviada al paciente">✅ Audioguía</span>' : '';

          const mobInfoAft = getPatientMobilityHospitalizationInfo(p);
          const isBadFirstAft = mobInfoAft.isLateShift && isFirstSlotOfDayOrShift(dateStr, p.horaCita);
          const badCitationAftHtml = isBadFirstAft
            ? `<div class="alert-bad-citation">⚠️ Cita no óptima: Hospitalizado/Mov. Reducida de 1º (debe ir de último)</div>`
            : '';
          const mobBadgeAftHtml = mobInfoAft.isLateShift
            ? `<div style="margin-top: 3px;"><span class="badge-late-shift" title="${mobInfoAft.label}">${mobInfoAft.label}</span></div>`
            : '';

          slotCard.className = `slot-card ${rfClass}`;
          slotCard.style.borderTop = '2px solid #f59e0b';
          slotCard.setAttribute('data-id', p.id);
          slotCard.innerHTML = `
            ${badCitationAftHtml}
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="slot-time" style="color: #b45309;">⏰ <strong>${p.horaCita}</strong></div>
              <button type="button" class="btn btn-outline btn-pdf-card" data-id="${p.id}" onclick="event.stopPropagation(); openOfficialVolanteModal('${p.id}');" title="Ver Volante Oficial de Petición del Paciente (PDF)" style="padding: 2px 7px; font-size: 0.72rem; line-height: 1.2; font-weight: 700; color: #004868; border-color: #bae6fd; background: #ffffff; border-radius: 5px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">📄 PDF</button>
            </div>
            <div class="slot-patient">👤 <strong>${p.nombre}</strong> (${p.prioridad})${confirmTag}${audioTag}</div>
            ${mobBadgeAftHtml}
            <div class="slot-details" style="font-size: 0.76rem; color: #52718A; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
              <div>💊 <strong>Fármaco:</strong> <span class="badge-rf ${rfClass}">${p.radiofarmaco}</span></div>
              <div>📋 <strong>Estudio:</strong> ${p.tipoEstudio || 'Estudio PET/CT'}</div>
            </div>
            <div style="font-size: 0.68rem; font-weight:700; color:#D97706; background:#FFFBEB; border:1px solid #FDE68A; padding:2px 6px; border-radius:6px; margin-top:4px; display:inline-block;">🌆 Turno de Tarde</div>
          `;

          slotCard.addEventListener('click', (e) => {
            if (e.target.closest('.btn-pdf-card, .btn-pdf-patient')) return;
            openSlotModal(p);
          });
          afternoonSection.appendChild(slotCard);
        });

        // Huecos libres de tarde (respetando huecos individuales y fármacos)
        const occupiedAftTimes = afternoonPatients.map(p => {
          const m = String(p.horaCita).match(/(\d{2}:\d{2})/);
          return m ? m[1] : '';
        });

        if (dayConfig.customSlots && Array.isArray(dayConfig.customSlots) && dayConfig.customSlots.length > 0) {
          const customAft = dayConfig.customSlots.filter(s => s.shift === 'afternoon' || parseInt(s.time) >= 14);
          const freeCustomAft = customAft.filter(s => !occupiedAftTimes.includes(s.time));

          freeCustomAft.forEach(slot => {
            const rf = slot.radiofarmaco || '18F-FDG';
            const rfClass = getRfClass(rf);
            const supp = getRadiofarmacoSupplierInfo(rf);
            const emptyCard = document.createElement('div');
            emptyCard.className = `empty-slot-card afternoon has-rf ${rfClass}`;
            emptyCard.innerHTML = `
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="color: #b45309;">⏰ <strong>${slot.time} h</strong></span>
                <span class="badge-rf ${rfClass}" style="font-size:0.65rem; padding:1px 5px; font-weight:700;">${rf}</span>
              </div>
              <div style="font-size: 0.68rem; font-weight: 700; color: #b45309; margin-top:2px; display:flex; justify-content:space-between; align-items:center;">
                <span>➕ Hueco Tarde Libre</span>
                <span style="font-size:0.63rem; color:#475569;" title="Origen: ${supp.name}">${supp.icon} ${supp.name}</span>
              </div>
            `;
            emptyCard.addEventListener('click', () => {
              openAssignManualModal(dateStr, `${slot.time} (Turno Tarde - ${rf})`, rf);
            });
            afternoonSection.appendChild(emptyCard);
          });
        } else {
          const generatedAftSlots = generateShiftSlotTimes(afternoonConfig);
          const remainingAftSlots = generatedAftSlots.filter(s => !occupiedAftTimes.includes(s));
          const maxAftSlotsToShow = Math.max(0, (afternoonConfig.maxSlots || 6) - afternoonPatients.length);
          remainingAftSlots.slice(0, maxAftSlotsToShow).forEach(timeStr => {
            const emptyCard = document.createElement('div');
            emptyCard.className = 'empty-slot-card afternoon';
            emptyCard.innerHTML = `
              <span>⏰ <strong>${timeStr} h</strong></span>
              <span style="font-size: 0.68rem; font-weight: 700; color: #b45309;">➕ Hueco Tarde Libre</span>
            `;
            emptyCard.addEventListener('click', () => {
              openAssignManualModal(dateStr, `${timeStr} (Turno Tarde)`);
            });
            afternoonSection.appendChild(emptyCard);
          });
        }
      } else {
        const inactiveAft = document.createElement('div');
        inactiveAft.style.cssText = 'font-size: 0.73rem; color: #64748b; text-align: center; padding: 0.6rem; background: #fffdf5; border: 1px dashed #fde68a; border-radius: 8px; display: flex; flex-direction: column; align-items: center; gap: 0.35rem;';
        inactiveAft.innerHTML = `
          <span>Turno de tarde inactivo</span>
          <button type="button" class="btn btn-outline btn-activate-aft-card" style="font-size: 0.7rem; font-weight: 700; padding: 2px 8px; border-color: #f59e0b; color: #b45309; background: white;">
            + Activar Turno Tarde
          </button>
        `;
        inactiveAft.querySelector('.btn-activate-aft-card').addEventListener('click', () => {
          const curConfig = getDayAgendaConfig(dateStr);
          if (!curConfig.afternoon) curConfig.afternoon = { active: true, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] };
          curConfig.afternoon.active = true;
          saveDayAgendaConfig(dateStr, curConfig, false);
          renderWeeklyGrid();
          updateAgendaCapacityStats();
        });
        afternoonSection.appendChild(inactiveAft);
      }

      slotsDiv.appendChild(afternoonSection);

      // Render freed slots si existieran registrados manualmente
      const dayFreedSlots = Object.keys(state.freedSlots)
        .filter(k => state.freedSlots[k].dateStr === dateStr)
        .map(k => state.freedSlots[k]);

      dayFreedSlots.forEach(fs => {
        const freeCard = document.createElement('div');
        freeCard.className = 'slot-card colina';
        freeCard.style.borderStyle = 'dashed';
        freeCard.style.background = '#ECFDF5';
        freeCard.innerHTML = `
          <div class="slot-time" style="color: #059669;">⏰ <strong>${fs.timeStr}</strong> <span class="badge badge-confirmed" style="font-size:0.68rem; padding:1px 6px;">🟢 Hueco Libre</span></div>
          <div class="slot-patient" style="color: #059669; font-weight: 600; font-size: 0.76rem;">➕ Haz clic para agendar un paciente aquí</div>
        `;
        freeCard.addEventListener('click', () => {
          openAssignManualModal(fs.dateStr, fs.timeStr);
        });
        slotsDiv.appendChild(freeCard);
      });

      dayCol.appendChild(slotsDiv);

      // Botón para añadir cita manual al final de la columna
      const btnAddManual = document.createElement('button');
      btnAddManual.className = 'btn btn-primary';
      btnAddManual.style.cssText = 'width: 100%; font-size: 0.74rem; padding: 0.35rem; margin-top: 0.3rem; background: #EFF8FC; color: #0F4C81; border: 1px dashed #0EA5E9; box-shadow: none;';
      btnAddManual.innerHTML = '➕ Añadir Cita / Hueco Manual';
      btnAddManual.addEventListener('click', () => {
        openAssignManualModal(dateStr, '08:00 h');
      });
      dayCol.appendChild(btnAddManual);
      weeklyGrid.appendChild(dayCol);
    }

    attachPdfButtonListeners();
    updateAgendaCapacityStats();
  }

  /**
   * ==============================================================================
   * MODAL: CONFIGURACIÓN DE CITACIÓN Y TURNOS DEL DÍA (MAÑANA / TARDE Y TRATAMIENTOS)
   * ==============================================================================
   */
  function openDayAgendaModal(dateStr) {
    state.activeAgendaDayDate = dateStr;
    const dayConfig = getDayAgendaConfig(dateStr);

    const parts = dateStr.split('-');
    const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayName = dayNames[dateObj.getDay()];

    const elSub = document.getElementById('agenda-day-subtitle');
    const elScopeDate = document.getElementById('agenda-scope-date-label');
    const elScopeDay = document.getElementById('agenda-scope-dayname-label');

    if (elSub) elSub.textContent = `📅 ${dayName} ${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()} (${dateStr})`;
    if (elScopeDate) elScopeDate.textContent = `${dayName} ${dateStr}`;
    if (elScopeDay) elScopeDay.textContent = `${dayName}s`;

    const radioSpecific = document.getElementById('scope-specific-day');
    if (radioSpecific) radioSpecific.checked = true;

    // Turno de Mañana
    const mActive = document.getElementById('morning-shift-active');
    const mStart = document.getElementById('morning-start-time');
    const mEnd = document.getElementById('morning-end-time');
    const mInterval = document.getElementById('morning-interval-select');
    const mMax = document.getElementById('morning-max-slots');
    const mDetails = document.getElementById('morning-shift-details');

    const mConfig = dayConfig.morning || { active: true, startTime: '08:00', endTime: '12:00', intervalMin: 30, maxSlots: 8, treatments: ['18F-FDG'] };
    if (mActive) mActive.checked = !!mConfig.active;
    if (mStart) mStart.value = mConfig.startTime || '08:00';
    if (mEnd) mEnd.value = mConfig.endTime || '12:00';
    if (mInterval) mInterval.value = String(mConfig.intervalMin || 30);
    if (mMax) mMax.value = mConfig.maxSlots || 8;
    if (mDetails) mDetails.style.display = mConfig.active ? 'block' : 'none';

    // Turno de Tarde
    const aftActive = document.getElementById('afternoon-shift-active');
    const aftStart = document.getElementById('afternoon-start-time');
    const aftEnd = document.getElementById('afternoon-end-time');
    const aftInterval = document.getElementById('afternoon-interval-select');
    const aftMax = document.getElementById('afternoon-max-slots');
    const aftDetails = document.getElementById('afternoon-shift-details');
    const aftBadge = document.getElementById('afternoon-slots-summary-badge');

    const aftConfig = dayConfig.afternoon || { active: false, startTime: '15:00', endTime: '18:30', intervalMin: 30, maxSlots: 6, treatments: ['18F-FDG'] };
    if (aftActive) aftActive.checked = !!aftConfig.active;
    if (aftStart) aftStart.value = aftConfig.startTime || '15:00';
    if (aftEnd) aftEnd.value = aftConfig.endTime || '18:30';
    if (aftInterval) aftInterval.value = String(aftConfig.intervalMin || 30);
    if (aftMax) aftMax.value = aftConfig.maxSlots || 6;
    if (aftDetails) aftDetails.style.display = aftConfig.active ? 'block' : 'none';
    if (aftBadge) {
      aftBadge.textContent = aftConfig.active ? `${aftConfig.maxSlots || 6} cupos activos` : 'Inactivo';
      aftBadge.style.background = aftConfig.active ? '#fef3c7' : '#f1f5f9';
      aftBadge.style.color = aftConfig.active ? '#b45309' : '#64748b';
    }

    // Inicializar y renderizar huecos individuales personalizados para este día
    if (dayConfig && Array.isArray(dayConfig.customSlots) && dayConfig.customSlots.length > 0) {
      currentDayCustomSlots = JSON.parse(JSON.stringify(dayConfig.customSlots));
    } else {
      currentDayCustomSlots = generateDefaultCustomSlotsForDay(dayConfig);
    }
    renderCustomSlotsTable(dateStr);

    // Renderizar tags de tratamientos autorizados para Mañana y Tarde
    renderTreatmentTagsForShift('morning', mConfig.treatments || ['18F-FDG']);
    renderTreatmentTagsForShift('afternoon', aftConfig.treatments || ['18F-FDG']);

    const modal = document.getElementById('agenda-day-modal');
    if (modal) modal.classList.remove('hidden');
  }

  function renderTreatmentTagsForShift(shiftName, selectedTreatments = []) {
    const containerId = shiftName === 'morning' ? 'morning-treatments-container' : 'afternoon-treatments-container';
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    // Combinar catálogo maestro con los tratamientos personalizados guardados
    const allTreatments = [...MASTER_TREATMENTS];
    if (state.agendaConfig && state.agendaConfig.customTreatments) {
      state.agendaConfig.customTreatments.forEach(ct => {
        if (!allTreatments.some(t => t.id === ct || t.name === ct)) {
          allTreatments.push({ id: ct, name: ct, label: ct, badgeClass: 'custom' });
        }
      });
    }

    // Añadir cualquier tratamiento específico ya guardado en la cita
    selectedTreatments.forEach(st => {
      if (!allTreatments.some(t => t.id === st || t.name === st)) {
        allTreatments.push({ id: st, name: st, label: st, badgeClass: 'custom' });
      }
    });

    allTreatments.forEach(t => {
      const isSelected = selectedTreatments.some(st =>
        st.toLowerCase().trim() === t.name.toLowerCase().trim() ||
        st.toLowerCase().trim() === t.id.toLowerCase().trim()
      );

      const label = document.createElement('label');
      label.className = isSelected ? 'treatment-tag-label active' : 'treatment-tag-label';
      label.innerHTML = `
        <input type="checkbox" name="${shiftName}-treatments" value="${t.name}" ${isSelected ? 'checked' : ''}>
        <span>${t.name}</span>
      `;

      label.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) label.classList.add('active');
        else label.classList.remove('active');
      });

      container.appendChild(label);
    });
  }

  function getSelectedTreatmentsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return ['18F-FDG'];
    const checked = container.querySelectorAll('input[type="checkbox"]:checked');
    const res = [];
    checked.forEach(cb => res.push(cb.value));
    return res.length > 0 ? res : ['18F-FDG'];
  }

  function saveCurrentDayAgendaFromModal() {
    const dateStr = state.activeAgendaDayDate;
    if (!dateStr) return null;

    const radioTemplate = document.getElementById('scope-weekly-template');
    const applyToTemplate = radioTemplate && radioTemplate.checked;

    const mActive = document.getElementById('morning-shift-active');
    const mStart = document.getElementById('morning-start-time');
    const mEnd = document.getElementById('morning-end-time');
    const mInterval = document.getElementById('morning-interval-select');
    const mMax = document.getElementById('morning-max-slots');

    const aftActive = document.getElementById('afternoon-shift-active');
    const aftStart = document.getElementById('afternoon-start-time');
    const aftEnd = document.getElementById('afternoon-end-time');
    const aftInterval = document.getElementById('afternoon-interval-select');
    const aftMax = document.getElementById('afternoon-max-slots');

    const morningConfig = {
      active: mActive ? mActive.checked : true,
      startTime: mStart ? mStart.value : '08:00',
      endTime: mEnd ? mEnd.value : '12:00',
      intervalMin: mInterval ? parseInt(mInterval.value) : 30,
      maxSlots: mMax ? parseInt(mMax.value) : 8,
      treatments: getSelectedTreatmentsFromContainer('morning-treatments-container')
    };

    const afternoonConfig = {
      active: aftActive ? aftActive.checked : false,
      startTime: aftStart ? aftStart.value : '15:00',
      endTime: aftEnd ? aftEnd.value : '18:30',
      intervalMin: aftInterval ? parseInt(aftInterval.value) : 30,
      maxSlots: aftMax ? parseInt(aftMax.value) : 6,
      treatments: getSelectedTreatmentsFromContainer('afternoon-treatments-container')
    };

    // Extraer tratamientos únicos de los huecos personalizados configurados
    const uniqueMorningTreatments = [...new Set(currentDayCustomSlots.filter(s => s.shift === 'morning' || parseInt(s.time) < 14).map(s => s.radiofarmaco))].filter(Boolean);
    const uniqueAfternoonTreatments = [...new Set(currentDayCustomSlots.filter(s => s.shift === 'afternoon' || parseInt(s.time) >= 14).map(s => s.radiofarmaco))].filter(Boolean);

    if (uniqueMorningTreatments.length > 0) {
      morningConfig.treatments = uniqueMorningTreatments;
      morningConfig.maxSlots = currentDayCustomSlots.filter(s => s.shift === 'morning' || parseInt(s.time) < 14).length;
    }
    if (uniqueAfternoonTreatments.length > 0) {
      afternoonConfig.treatments = uniqueAfternoonTreatments;
      afternoonConfig.maxSlots = currentDayCustomSlots.filter(s => s.shift === 'afternoon' || parseInt(s.time) >= 14).length;
    }

    const newDayConfig = {
      morning: morningConfig,
      afternoon: afternoonConfig,
      customSlots: JSON.parse(JSON.stringify(currentDayCustomSlots))
    };

    saveDayAgendaConfig(dateStr, newDayConfig, applyToTemplate);
    return { dateStr, newDayConfig };
  }

  /**
   * ==============================================================================
   * MODAL: CONFIGURACIÓN GLOBAL DE PLANTILLA SEMANAL (LUNES A SÁBADO)
   * ==============================================================================
   */
  function openWeeklyTemplateModal() {
    const modal = document.getElementById('agenda-template-modal');
    const list = document.getElementById('weekly-template-days-list');
    if (!list) {
      console.error("weekly-template-days-list element not found!");
      return;
    }

    list.innerHTML = '';
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const template = (state.agendaConfig && state.agendaConfig.weeklyTemplate) ? state.agendaConfig.weeklyTemplate : getDefaultAgendaConfig().weeklyTemplate;

    // Renderizar Lunes a Sábado (1 al 6)
    for (let d = 1; d <= 6; d++) {
      const cfg = template[d] || {
        morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["18F-FDG"] },
        afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] }
      };

      const dayCard = document.createElement('div');
      dayCard.className = 'shift-config-card';
      dayCard.style.padding = '0.9rem 1.1rem';
      dayCard.style.marginBottom = '0.65rem';

      const mTreatmentsStr = (cfg.morning && cfg.morning.treatments && cfg.morning.treatments.length > 0) ? cfg.morning.treatments.join(', ') : '18F-FDG';
      const aftTreatmentsStr = (cfg.afternoon && cfg.afternoon.treatments && cfg.afternoon.treatments.length > 0) ? cfg.afternoon.treatments.join(', ') : '18F-FDG';

      dayCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; padding-bottom: 0.4rem;">
          <h4 style="margin: 0; color: #004868; font-size: 1rem; font-weight: 800;">${dayNames[d]}</h4>
          <span style="font-size: 0.75rem; color: #64748b; font-weight: 600;">Plantilla Predeterminada</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
          <!-- Mañana -->
          <div style="background: #f0f9ff; padding: 0.65rem; border-radius: 8px; border: 1px solid #bae6fd;">
            <label style="font-size: 0.82rem; font-weight: 700; color: #0369a1; display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
              <input type="checkbox" id="tpl-m-active-${d}" ${cfg.morning && cfg.morning.active ? 'checked' : ''} style="accent-color:#0284c7;">
              <span>☀️ Turno de Mañana</span>
            </label>
            <div style="font-size: 0.78rem; color: #475569; margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.2rem;">
              <div>⏰ Horario: <strong>${(cfg.morning && cfg.morning.startTime) || '08:00'} - ${(cfg.morning && cfg.morning.endTime) || '12:00'}</strong> | Cupos: <input type="number" id="tpl-m-slots-${d}" value="${(cfg.morning && cfg.morning.maxSlots) || 8}" style="width: 48px; padding: 2px 4px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px;"></div>
              <div>💊 Fármacos: <strong>${mTreatmentsStr}</strong></div>
            </div>
          </div>
          <!-- Tarde -->
          <div style="background: ${cfg.afternoon && cfg.afternoon.active ? '#fffdf5' : '#f8fafc'}; padding: 0.65rem; border-radius: 8px; border: 1px solid ${cfg.afternoon && cfg.afternoon.active ? '#fde68a' : '#cbd5e1'};">
            <label style="font-size: 0.82rem; font-weight: 700; color: #b45309; display: flex; align-items: center; gap: 0.4rem; cursor: pointer;">
              <input type="checkbox" id="tpl-aft-active-${d}" ${cfg.afternoon && cfg.afternoon.active ? 'checked' : ''} style="accent-color:#f59e0b;">
              <span>🌆 Turno de Tarde</span>
            </label>
            <div style="font-size: 0.78rem; color: #475569; margin-top: 0.35rem; display: flex; flex-direction: column; gap: 0.2rem;">
              <div>⏰ Horario: <strong>${(cfg.afternoon && cfg.afternoon.startTime) || '15:00'} - ${(cfg.afternoon && cfg.afternoon.endTime) || '18:30'}</strong> | Cupos: <input type="number" id="tpl-aft-slots-${d}" value="${(cfg.afternoon && cfg.afternoon.maxSlots) || 6}" style="width: 48px; padding: 2px 4px; font-size: 0.75rem; border: 1px solid #cbd5e1; border-radius: 4px;"></div>
              <div>💊 Fármacos: <strong>${aftTreatmentsStr}</strong></div>
            </div>
          </div>
        </div>
      `;
      list.appendChild(dayCard);
    }

    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  function saveWeeklyTemplateModal() {
    if (!state.agendaConfig) state.agendaConfig = getDefaultAgendaConfig();
    if (!state.agendaConfig.weeklyTemplate) state.agendaConfig.weeklyTemplate = {};

    for (let d = 1; d <= 6; d++) {
      const curCfg = state.agendaConfig.weeklyTemplate[d] || {
        morning: { active: true, startTime: "08:00", endTime: "12:00", intervalMin: 30, maxSlots: 8, treatments: ["18F-FDG"] },
        afternoon: { active: false, startTime: "15:00", endTime: "18:30", intervalMin: 30, maxSlots: 6, treatments: ["18F-FDG"] }
      };

      const mActive = document.getElementById(`tpl-m-active-${d}`);
      const mSlots = document.getElementById(`tpl-m-slots-${d}`);
      const aftActive = document.getElementById(`tpl-aft-active-${d}`);
      const aftSlots = document.getElementById(`tpl-aft-slots-${d}`);

      if (mActive) curCfg.morning.active = mActive.checked;
      if (mSlots) curCfg.morning.maxSlots = parseInt(mSlots.value) || 8;
      if (aftActive) curCfg.afternoon.active = aftActive.checked;
      if (aftSlots) curCfg.afternoon.maxSlots = parseInt(aftSlots.value) || 6;

      state.agendaConfig.weeklyTemplate[d] = curCfg;
    }

    try {
      localStorage.setItem('pet_ct_agenda_config', JSON.stringify(state.agendaConfig));
    } catch (e) { }

    const modal = document.getElementById('agenda-template-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }

    renderWeeklyGrid();
    updateAgendaCapacityStats();
  }

  window.openWeeklyTemplateModal = openWeeklyTemplateModal;
  window.saveWeeklyTemplateModal = saveWeeklyTemplateModal;

  /**
   * ==============================================================================
   * MOTOR INTELIGENTE DE AUTO-RELLENO DE AGENDAS CON TRIAJE CLÍNICO (P1 > P2 > P3)
   * ==============================================================================
   * Lee la configuración de turnos de mañana y tarde, tratamientos permitidos y
   * cupos de cada día, y asigna automáticamente a los pacientes en lista de espera.
   */
  function runTriageAutoScheduler({ targetDateStr = null, targetWeekIndex = null } = {}) {
    // 1. Determinar fechas objetivo
    let targetDates = [];
    if (targetDateStr) {
      targetDates = [targetDateStr];
    } else {
      const weekIdx = (targetWeekIndex !== null && targetWeekIndex !== undefined) ? targetWeekIndex : state.selectedWeekIndex;
      const startOfWeek = new Date(state.baseDate);
      startOfWeek.setDate(state.baseDate.getDate() + (weekIdx * 7));

      for (let i = 0; i < 6; i++) {
        const colDate = new Date(startOfWeek);
        colDate.setDate(startOfWeek.getDate() + i);
        targetDates.push(formatDate(colDate));
      }
    }

    // 2. Extraer pacientes elegibles en espera
    const waitingPatients = state.submissions.filter(s =>
      s.requiresProposal === true ||
      !s.fechaCita ||
      s.fechaCita.includes("SIN AGENDAR") ||
      s.fechaCita.includes("Pendiente")
    );

    if (waitingPatients.length === 0) {
      alert("ℹ️ No hay pacientes pendientes en la lista de espera para agendar en esta semana.");
      return;
    }

    // 3. Ordenar pacientes según JERARQUÍA CLÍNICA ESTRICTA:
    // P1 (peso 1) > P2 (peso 2) > P3 (peso 3)
    // Dentro de la misma prioridad: mayor urgencia (ingresado, infección) y fecha de solicitud más antigua
    waitingPatients.sort((a, b) => {
      const getPrioWeight = (p) => {
        const s = String(p.prioridad || '').toUpperCase();
        if (s.includes('P1')) return 1;
        if (s.includes('P2')) return 2;
        return 3;
      };

      const wA = getPrioWeight(a);
      const wB = getPrioWeight(b);
      if (wA !== wB) return wA - wB;

      // Hospitalizado / Infección boost
      const isUrgentA = (a.motivo && (a.motivo.toLowerCase().includes('ingresado') || a.motivo.toLowerCase().includes('urgente'))) ? 1 : 0;
      const isUrgentB = (b.motivo && (b.motivo.toLowerCase().includes('ingresado') || b.motivo.toLowerCase().includes('urgente'))) ? 1 : 0;
      if (isUrgentA !== isUrgentB) return isUrgentB - isUrgentA;

      // Fecha de solicitud ascendente (FIFO)
      const dateA = a.fechaSolicitud || '2026-01-01';
      const dateB = b.fechaSolicitud || '2026-01-01';
      return String(dateA).localeCompare(String(dateB));
    });

    const scheduledResults = [];
    const scheduledPatientIds = new Set();
    let morningCount = 0;
    let afternoonCount = 0;

    // 4. Procesar cada día objetivo
    targetDates.forEach(dateStr => {
      const dayConfig = getDayAgendaConfig(dateStr);
      const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);

      // Calcular ocupación actual
      const occupiedMorningTimes = [];
      const occupiedAfternoonTimes = [];
      dayPatients.forEach(p => {
        const horaStr = String(p.horaCita || '');
        const m = horaStr.match(/(\d{2}:\d{2})/);
        const tVal = m ? m[1] : '';
        const isAfternoon = horaStr.includes('Tarde') || horaStr.includes('Peonada') || (parseInt(horaStr) >= 14);
        if (isAfternoon) occupiedAfternoonTimes.push(tVal);
        else occupiedMorningTimes.push(tVal);
      });

      // --- A) AUTO-RELLENO TURNO DE MAÑANA (RESPETANDO HUECOS INDIVIDUALES Y PROTOCOLO) ---
      if (dayConfig.customSlots && Array.isArray(dayConfig.customSlots) && dayConfig.customSlots.length > 0) {
        const customMorning = dayConfig.customSlots.filter(s => s.shift === 'morning' || parseInt(s.time) < 14);
        const freeCustomMorning = customMorning.filter(s => !occupiedMorningTimes.includes(s.time));

        // Separar huecos en tempranos y tardíos para ubicar de últimos a hospitalizados/movilidad reducida
        for (let idx = 0; idx < freeCustomMorning.length; idx++) {
          const slot = freeCustomMorning[idx];
          const slotRf = slot.radiofarmaco || '18F-FDG';
          const isSlotLate = (idx >= Math.floor(freeCustomMorning.length * 0.6));

          // Buscar el mejor paciente en lista de espera compatible con el fármaco de este hueco
          const patientIndex = waitingPatients.findIndex(p => {
            if (scheduledPatientIds.has(p.id)) return false;
            if (slotRf !== 'Flexible' && !matchesTreatment(p.radiofarmaco, [slotRf])) return false;

            const rawRec = p.raw || {};
            const finQTRT = rawRec["Fin Tratamiento QT/RT"] || rawRec.fin_qtrt || "";
            if (finQTRT) {
              const diffDays = Math.floor((new Date(dateStr) - new Date(finQTRT)) / (1000 * 60 * 60 * 24));
              if (diffDays < 21) return false;
            }

            // Si es hueco temprano (de los primeros), evitar hospitalizados / mov reducida si hay autónomos disponibles
            const mob = getPatientMobilityHospitalizationInfo(p);
            if (idx === 0 && mob.isLateShift) {
              const hasAutonomousCandidate = waitingPatients.some(cand =>
                !scheduledPatientIds.has(cand.id) &&
                (slotRf === 'Flexible' || matchesTreatment(cand.radiofarmaco, [slotRf])) &&
                !getPatientMobilityHospitalizationInfo(cand).isLateShift
              );
              if (hasAutonomousCandidate) return false;
            }
            return true;
          });

          if (patientIndex !== -1) {
            const patient = waitingPatients[patientIndex];
            const horaFormatted = `${slot.time} h (${patient.radiofarmaco})`;

            patient.fechaCita = dateStr;
            patient.horaCita = horaFormatted;
            patient.requiresProposal = false;

            state.peonadaAssignments[patient.id] = {
              fechaCita: dateStr,
              horaCita: horaFormatted
            };
            syncAssignmentToMasterDatabase(patient.id, dateStr, horaFormatted);

            scheduledPatientIds.add(patient.id);
            scheduledResults.push({
              patient,
              fecha: dateStr,
              hora: horaFormatted,
              turno: 'Mañana'
            });
            morningCount++;
          }
        }
      } else if (dayConfig.morning && dayConfig.morning.active) {
        const mSlots = generateShiftSlotTimes(dayConfig.morning);
        const freeMorningSlots = mSlots.filter(s => !occupiedMorningTimes.includes(s));
        const maxMorningAllowed = (dayConfig.morning.maxSlots || 8) - occupiedMorningTimes.length;
        const slotsToFillCount = Math.min(freeMorningSlots.length, maxMorningAllowed);

        if (slotsToFillCount > 0) {
          // Filtrar pacientes candidatos compatibles por radiofármaco y QT/RT
          const compatibleCandidates = waitingPatients.filter(p => {
            if (scheduledPatientIds.has(p.id)) return false;
            if (!matchesTreatment(p.radiofarmaco, dayConfig.morning.treatments)) return false;

            const rawRec = p.raw || {};
            const finQTRT = rawRec["Fin Tratamiento QT/RT"] || rawRec.fin_qtrt || "";
            if (finQTRT) {
              const diffDays = Math.floor((new Date(dateStr) - new Date(finQTRT)) / (1000 * 60 * 60 * 24));
              if (diffDays < 21) return false;
            }
            return true;
          });

          // Seleccionar cohorte de mayor prioridad clínica (P1 > P2 > P3)
          const chosenCohort = compatibleCandidates.slice(0, slotsToFillCount);

          // Separar en pacientes autónomos (de primeros) y hospitalizados/movilidad reducida (de últimos)
          const autonomousCohort = [];
          const lateShiftCohort = [];

          chosenCohort.forEach(p => {
            const mob = getPatientMobilityHospitalizationInfo(p);
            if (mob.isLateShift) {
              lateShiftCohort.push(p);
            } else {
              autonomousCohort.push(p);
            }
          });

          // Ordenación final de citación: Autónomos ocupan los primeros huecos (08:00, 08:30...)
          // Hospitalizados y movilidad reducida ocupan los ÚLTIMOS huecos del turno (11:00, 11:30...)
          const orderedCohort = [...autonomousCohort, ...lateShiftCohort];

          for (let idx = 0; idx < orderedCohort.length; idx++) {
            const slotTime = freeMorningSlots[idx];
            const patient = orderedCohort[idx];
            const horaFormatted = `${slotTime} h (${patient.radiofarmaco})`;

            patient.fechaCita = dateStr;
            patient.horaCita = horaFormatted;
            patient.requiresProposal = false;

            state.peonadaAssignments[patient.id] = {
              fechaCita: dateStr,
              horaCita: horaFormatted
            };
            syncAssignmentToMasterDatabase(patient.id, dateStr, horaFormatted);

            scheduledPatientIds.add(patient.id);
            scheduledResults.push({
              patient,
              fecha: dateStr,
              hora: horaFormatted,
              turno: 'Mañana'
            });
            morningCount++;
          }
        }
      }

      // --- B) AUTO-RELLENO TURNO DE TARDE (RESPETANDO HUECOS INDIVIDUALES Y PROTOCOLO) ---
      if (dayConfig.customSlots && Array.isArray(dayConfig.customSlots) && dayConfig.customSlots.length > 0) {
        const customAft = dayConfig.customSlots.filter(s => s.shift === 'afternoon' || parseInt(s.time) >= 14);
        const freeCustomAft = customAft.filter(s => !occupiedAfternoonTimes.includes(s.time));

        for (let idx = 0; idx < freeCustomAft.length; idx++) {
          const slot = freeCustomAft[idx];
          const slotRf = slot.radiofarmaco || '18F-FDG';

          const patientIndex = waitingPatients.findIndex(p => {
            if (scheduledPatientIds.has(p.id)) return false;
            if (slotRf !== 'Flexible' && !matchesTreatment(p.radiofarmaco, [slotRf])) return false;

            const rawRec = p.raw || {};
            const finQTRT = rawRec["Fin Tratamiento QT/RT"] || rawRec.fin_qtrt || "";
            if (finQTRT) {
              const diffDays = Math.floor((new Date(dateStr) - new Date(finQTRT)) / (1000 * 60 * 60 * 24));
              if (diffDays < 21) return false;
            }
            return true;
          });

          if (patientIndex !== -1) {
            const patient = waitingPatients[patientIndex];
            const horaFormatted = `${slot.time} (Turno Tarde - ${patient.radiofarmaco})`;

            patient.fechaCita = dateStr;
            patient.horaCita = horaFormatted;
            patient.requiresProposal = false;

            state.peonadaAssignments[patient.id] = {
              fechaCita: dateStr,
              horaCita: horaFormatted
            };
            syncAssignmentToMasterDatabase(patient.id, dateStr, horaFormatted);

            scheduledPatientIds.add(patient.id);
            scheduledResults.push({
              patient,
              fecha: dateStr,
              hora: horaFormatted,
              turno: 'Tarde'
            });
            afternoonCount++;
          }
        }
      } else if (dayConfig.afternoon && dayConfig.afternoon.active) {
        const aftSlots = generateShiftSlotTimes(dayConfig.afternoon);
        const freeAftSlots = aftSlots.filter(s => !occupiedAfternoonTimes.includes(s));
        const maxAftAllowed = (dayConfig.afternoon.maxSlots || 6) - occupiedAfternoonTimes.length;
        const slotsToFillCount = Math.min(freeAftSlots.length, maxAftAllowed);

        if (slotsToFillCount > 0) {
          const compatibleCandidates = waitingPatients.filter(p => {
            if (scheduledPatientIds.has(p.id)) return false;
            if (!matchesTreatment(p.radiofarmaco, dayConfig.afternoon.treatments)) return false;

            const rawRec = p.raw || {};
            const finQTRT = rawRec["Fin Tratamiento QT/RT"] || rawRec.fin_qtrt || "";
            if (finQTRT) {
              const diffDays = Math.floor((new Date(dateStr) - new Date(finQTRT)) / (1000 * 60 * 60 * 24));
              if (diffDays < 21) return false;
            }
            return true;
          });

          const chosenCohort = compatibleCandidates.slice(0, slotsToFillCount);
          const autonomousCohort = [];
          const lateShiftCohort = [];

          chosenCohort.forEach(p => {
            const mob = getPatientMobilityHospitalizationInfo(p);
            if (mob.isLateShift) {
              lateShiftCohort.push(p);
            } else {
              autonomousCohort.push(p);
            }
          });

          const orderedCohort = [...autonomousCohort, ...lateShiftCohort];

          for (let idx = 0; idx < orderedCohort.length; idx++) {
            const slotTime = freeAftSlots[idx];
            const patient = orderedCohort[idx];
            const horaFormatted = `${slotTime} (Turno Tarde - ${patient.radiofarmaco})`;

            patient.fechaCita = dateStr;
            patient.horaCita = horaFormatted;
            patient.requiresProposal = false;

            state.peonadaAssignments[patient.id] = {
              fechaCita: dateStr,
              horaCita: horaFormatted
            };
            syncAssignmentToMasterDatabase(patient.id, dateStr, horaFormatted);

            scheduledPatientIds.add(patient.id);
            scheduledResults.push({
              patient,
              fecha: dateStr,
              hora: horaFormatted,
              turno: 'Tarde'
            });
            afternoonCount++;
          }
        }
      }
    });

    // Guardar asignaciones en localStorage
    try {
      localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
    } catch (e) { }

    // 5. Actualizar la interfaz completa
    updateProposalsLists();
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    updateAgendaCapacityStats();

    // 6. Mostrar Informe en Modal de Resultados
    showTriageResultsModal(scheduledResults, waitingPatients.filter(p => !scheduledPatientIds.has(p.id)), morningCount, afternoonCount);
  }

  function showTriageResultsModal(scheduledList, remainingList, morningCount, afternoonCount) {
    const modal = document.getElementById('triage-results-modal');
    if (!modal) return;

    const elTotal = document.getElementById('triage-result-total-scheduled');
    const elMorn = document.getElementById('triage-result-morning-count');
    const elAft = document.getElementById('triage-result-afternoon-count');
    const elRem = document.getElementById('triage-result-remaining-count');
    const tbodyScheduled = document.getElementById('triage-result-scheduled-tbody');
    const remContainer = document.getElementById('triage-result-remaining-container');
    const tbodyRem = document.getElementById('triage-result-remaining-tbody');

    if (elTotal) elTotal.textContent = scheduledList.length;
    if (elMorn) elMorn.textContent = morningCount;
    if (elAft) elAft.textContent = afternoonCount;
    if (elRem) elRem.textContent = remainingList.length;

    if (tbodyScheduled) {
      if (scheduledList.length === 0) {
        tbodyScheduled.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:#64748b;">No se encontraron huecos disponibles compatibles con los tratamientos prescritos.</td></tr>`;
      } else {
        tbodyScheduled.innerHTML = scheduledList.map(item => {
          const p = item.patient;
          const rfClass = getRfClass(p.radiofarmaco);
          const shiftBadge = item.turno === 'Tarde'
            ? '<span class="badge" style="background:#fef3c7; color:#b45309; font-weight:700;">🌆 Tarde</span>'
            : '<span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">☀️ Mañana</span>';

          return `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 7px 10px;"><span class="badge ${p.prioridad.includes('P1') ? 'badge-p1' : p.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${p.prioridad}</span></td>
              <td style="padding: 7px 10px;"><strong>${p.nombre}</strong></td>
              <td style="padding: 7px 10px; font-weight:700; color:#0f4c81;">📅 ${item.fecha}</td>
              <td style="padding: 7px 10px;">${shiftBadge} ${item.hora}</td>
              <td style="padding: 7px 10px;"><span class="badge-rf ${rfClass}">${p.radiofarmaco}</span></td>
            </tr>
          `;
        }).join('');
      }
    }

    if (remContainer && tbodyRem) {
      if (remainingList.length > 0) {
        remContainer.style.display = 'block';
        tbodyRem.innerHTML = remainingList.map(p => {
          const rfClass = getRfClass(p.radiofarmaco);
          return `
            <tr style="border-bottom: 1px solid #fef3c7;">
              <td style="padding: 6px 10px;"><span class="badge ${p.prioridad.includes('P1') ? 'badge-p1' : p.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${p.prioridad}</span></td>
              <td style="padding: 6px 10px;"><strong>${p.nombre}</strong></td>
              <td style="padding: 6px 10px;"><span class="badge-rf ${rfClass}">${p.radiofarmaco}</span></td>
              <td style="padding: 6px 10px; color:#b45309; font-size:0.75rem;">Sin cupo disponible para este tratamiento en los turnos de la semana</td>
            </tr>
          `;
        }).join('');
      } else {
        remContainer.style.display = 'none';
      }
    }

    modal.classList.remove('hidden');
  }


  /**
   * Open Slot Management Modal
   */
  function openSlotModal(patient) {
    state.activeModalPatient = patient;
    slotModal.classList.remove('hidden');

    const isConfirmed = !!state.confirmations[patient.id];
    const btnModalConfirm = document.getElementById('btn-modal-toggle-confirm');
    const modalConfirmStatus = document.getElementById('modal-confirm-status');

    if (btnModalConfirm) {
      if (isConfirmed) {
        btnModalConfirm.textContent = '↩️ Desmarcar Confirmación';
        btnModalConfirm.className = 'btn btn-outline btn-block';
        btnModalConfirm.style.borderColor = '#10b981';
        btnModalConfirm.style.color = '#047857';
      } else {
        btnModalConfirm.textContent = '✅ Confirmar Cita Oficial';
        btnModalConfirm.className = 'btn btn-success btn-block';
        btnModalConfirm.style.borderColor = '';
        btnModalConfirm.style.color = '';
      }

      btnModalConfirm.onclick = () => {
        const nextState = !state.confirmations[patient.id];
        state.confirmations[patient.id] = nextState;
        try {
          localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
        } catch (e) { }
        updateConfirmationInMasterDb(patient.id, nextState);
        updateKPIs();
        renderConfirmationsTable();
        renderWeeklyGrid();
        renderSubmissionsTable();
        openSlotModal(patient);

        if (nextState) {
          const resolvedRf = resolvePatientRadiofarmaco(patient);
          const rfLower = String(resolvedRf || '').toLowerCase();
          if (rfLower.includes('paratiroid') || (rfLower.includes('colina') && (rfLower.includes('adenoma') || rfLower.includes('pth')))) {
            const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
            setTimeout(() => {
              confirmAndSendAudioguia(patient.id, cleanName, nhcVal, patient.fechaCita, patient.horaCita, resolvedRf);
            }, 300);
          } else if (rfLower.includes('colina') || rfLower.includes('fch')) {
            const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
            setTimeout(() => {
              confirmAndSendAudioguia(patient.id, cleanName, nhcVal, patient.fechaCita, patient.horaCita, resolvedRf);
            }, 300);
          } else if (rfLower.includes('psma')) {
            const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
            setTimeout(() => {
              confirmAndSendAudioguia(patient.id, cleanName, nhcVal, patient.fechaCita, patient.horaCita, resolvedRf);
            }, 300);
          } else if (rfLower.includes('vasculitis')) {
            const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
            setTimeout(() => {
              confirmAndSendAudioguia(patient.id, cleanName, nhcVal, patient.fechaCita, patient.horaCita, resolvedRf);
            }, 300);
          }
        }
      };
    }

    const modalConfirmedActions = document.getElementById('modal-confirmed-actions');
    const btnModalSendAudioguia = document.getElementById('btn-modal-send-audioguia');
    const btnModalGotoConfirmations = document.getElementById('btn-modal-goto-confirmations');

    if (modalConfirmedActions) {
      if (isConfirmed) {
        modalConfirmedActions.classList.remove('hidden');
        if (btnModalSendAudioguia) {
          const isSent = state.audioguiaSent && state.audioguiaSent[patient.id];
          if (isSent) {
            btnModalSendAudioguia.innerHTML = '✅ Audioguía Enviada (Reenviar)';
            btnModalSendAudioguia.style.background = '#059669';
            btnModalSendAudioguia.style.borderColor = '#059669';
          } else {
            btnModalSendAudioguia.innerHTML = '📲 Enviar Audioguía a este Paciente';
            btnModalSendAudioguia.style.background = '#0284c7';
            btnModalSendAudioguia.style.borderColor = '#0284c7';
          }
          btnModalSendAudioguia.onclick = () => {
            const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
            const radiofarmaco = patient.radiofarmaco || patient.tipoEstudio || '18F-FDG';
            confirmAndSendAudioguia(patient.id, cleanName, nhcVal, patient.fechaCita, patient.horaCita, radiofarmaco);
          };
        }
        if (btnModalGotoConfirmations) {
          btnModalGotoConfirmations.onclick = () => {
            slotModal.classList.add('hidden');
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.nav-content').forEach(c => c.classList.add('hidden'));
            const navBtn = document.querySelector('.nav-tab[data-nav="nav-confirmations"]');
            if (navBtn) navBtn.classList.add('active');
            const navContent = document.getElementById('nav-confirmations');
            if (navContent) navContent.classList.remove('hidden');
            switchConfirmSubTab('view-confirm-done');
          };
        }
      } else {
        modalConfirmedActions.classList.add('hidden');
      }
    }

    if (modalConfirmStatus) {
      modalConfirmStatus.innerHTML = isConfirmed
        ? '<strong style="color: #059669;">✓ Citación Confirmada por el paciente</strong>'
        : '<span style="color: #b45309;">⏳ Cita pendiente de confirmación por el paciente</span>';
    }

    const mobModal = getPatientMobilityHospitalizationInfo(patient);
    const isBadSlotModal = mobModal.isLateShift && isFirstSlotOfDayOrShift(patient.fechaCita, patient.horaCita);
    const badAlertModalHtml = isBadSlotModal
      ? `<div class="alert-bad-citation" style="margin-bottom:0.75rem;">
          ⚠️ AVISO ASISTENCIAL: Paciente ${mobModal.label} citado de PRIMERO (${patient.horaCita}).
          Según el protocolo de Medicina Nuclear, debe citarse en los ÚLTIMOS turnos del día para optimizar logística de celadores/ambulancias.
         </div>`
      : '';
    const mobModalBadgeHtml = mobModal.isLateShift
      ? `<div><strong>Logística Asistencial:</strong> <span class="badge-late-shift">${mobModal.label} (Debe ir de último)</span></div>`
      : `<div><strong>Movilidad:</strong> <span style="color:#059669; font-weight:700;">🟢 Autónomo / Ambulatorio</span></div>`;

    const rawP = patient.raw || (state.rawSubmissionsMap && state.rawSubmissionsMap[patient.id]) || {};
    const hasPriorPetVal = rawP["¿Tiene estudio PET previo?"] || rawP["PET Previo Realizado"] || (rawP["Detalle PET Previo"] && !rawP["Detalle PET Previo"].startsWith('No') ? 'Sí' : 'No');
    const isPriorPetSi = String(hasPriorPetVal).toLowerCase().includes('s') || String(hasPriorPetVal).toLowerCase().includes('si');
    const priorPetInfoHtml = isPriorPetSi
      ? `<div><strong>🔬 Estudio PET Previo:</strong> <span style="color:#0284c7; font-weight:700;">🔵 Sí (${escapeHTML(rawP["Detalle PET Previo"] || 'Revisar comparativa en SIDI / PACS')})</span></div>`
      : `<div><strong>🔬 Estudio PET Previo:</strong> <span style="color:#059669; font-weight:700;">🟢 No (Estudio Basal)</span></div>`;

    modalPatientInfo.innerHTML = `
      ${badAlertModalHtml}
      <div><strong>Paciente:</strong> ${patient.nombre}</div>
      <div><strong>Prioridad:</strong> <span class="badge ${patient.prioridad.includes('P1') ? 'badge-p1' : patient.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${patient.prioridad}</span></div>
      ${mobModalBadgeHtml}
      <div><strong>Estudio:</strong> ${patient.radiofarmaco}</div>
      <div><strong>🩺 Indicación / Motivo (Excel):</strong> <strong style="color: #0f4c81;">${patient.motivo || 'Estudio PET/CT Oncológico'}</strong></div>
      ${priorPetInfoHtml}
      <div><strong>Cita Actual:</strong> 📅 ${patient.fechaCita} a las ⏰ ${patient.horaCita} h</div>
      <button class="btn btn-primary btn-pdf-patient" data-id="${patient.id}" style="margin-top:0.75rem; width:100%; font-weight:700; background:var(--sergas-blue); border-color:var(--sergas-blue); display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.65rem 1rem; color:white; border-radius:8px; cursor:pointer; box-shadow:0 3px 10px rgba(0,126,180,0.25);">
        <span>📄</span> <span>Ver Volante de Petición del Médico (Imprimir / PDF)</span>
      </button>
    `;
    attachPdfButtonListeners();

    // Populate replacement dropdown with waiting unassigned patients
    selectReplacement.innerHTML = '<option value="">-- Seleccionar paciente de la lista de propuestas --</option>';

    const waitingList = state.submissions.filter(s => s.requiresProposal);
    if (waitingList.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = "No hay pacientes pendientes en la lista de propuestas";
      selectReplacement.appendChild(opt);
    } else {
      waitingList.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `${w.prioridad} - ${w.nombre} (${w.radiofarmaco})`;
        selectReplacement.appendChild(opt);
      });
    }
  }

  function closeModal() {
    slotModal.classList.add('hidden');
    state.activeModalPatient = null;
  }

  /**
   * Handle Option: Dejar Hueco Libre (Free Slot)
   */
  function handleFreeSlot() {
    if (!state.activeModalPatient) return;

    const targetPatient = state.activeModalPatient;
    const dateStr = targetPatient.fechaCita;
    const timeStr = targetPatient.horaCita;

    if (state.peonadaAssignments[targetPatient.id]) {
      delete state.peonadaAssignments[targetPatient.id];
      try {
        localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
      } catch (e) { }
    }

    if (dateStr && dateStr !== "SIN AGENDAR (PROPUESTA TURNO EXTRA)" && timeStr && timeStr !== "-") {
      const slotKey = `${dateStr}_${timeStr}`;
      state.freedSlots[slotKey] = {
        dateStr: dateStr,
        timeStr: timeStr,
        radiofarmaco: targetPatient.radiofarmaco
      };
      try {
        localStorage.setItem('pet_ct_freed_slots', JSON.stringify(state.freedSlots));
      } catch (e) { }
    }

    targetPatient.requiresProposal = true;
    targetPatient.proposedDate = dateStr !== "SIN AGENDAR (PROPUESTA TURNO EXTRA)" ? dateStr : targetPatient.proposedDate;
    targetPatient.fechaCita = "SIN AGENDAR (PROPUESTA TURNO EXTRA)";
    targetPatient.horaCita = "-";

    syncAssignmentToMasterDatabase(targetPatient.id, "", "Pendiente de Triaje");

    // Re-categorize proposals
    updateProposalsLists();
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    closeModal();
  }

  /**
   * Handle Option: Intercambiar / Asignar en este Hueco
   */
  function handleSwapPatient() {
    if (!state.activeModalPatient) return;
    const replacementId = selectReplacement.value;
    if (!replacementId) {
      alert("Por favor selecciona un paciente de reemplazo de la lista.");
      return;
    }

    const currentPatient = state.activeModalPatient;
    const replacementPatient = state.submissions.find(s => s.id === replacementId);

    if (replacementPatient) {
      const originalDate = currentPatient.fechaCita;
      const originalTime = currentPatient.horaCita;

      // Assign replacement to this slot
      replacementPatient.requiresProposal = false;
      replacementPatient.fechaCita = originalDate;
      replacementPatient.horaCita = originalTime;
      state.peonadaAssignments[replacementPatient.id] = {
        fechaCita: originalDate,
        horaCita: originalTime
      };

      // Move current patient to unassigned proposal queue
      currentPatient.requiresProposal = true;
      currentPatient.proposedDate = originalDate;
      currentPatient.fechaCita = "SIN AGENDAR (PROPUESTA TURNO EXTRA)";
      currentPatient.horaCita = "-";
      if (state.peonadaAssignments[currentPatient.id]) {
        delete state.peonadaAssignments[currentPatient.id];
      }
      try {
        localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
      } catch (e) { }

      syncAssignmentToMasterDatabase(currentPatient.id, "", "Pendiente de Triaje");
      syncAssignmentToMasterDatabase(replacementPatient.id, originalDate, originalTime);

      updateProposalsLists();
      updateKPIs();
      renderWeeklyGrid();
      renderConfirmationsTable();
      renderProposalTables();
      renderSubmissionsTable();
      closeModal();
    }
  }

  function updateProposalsLists() {
    state.proposalsByPriority = { p1: [], p2: [], p3: [] };
    state.submissions.forEach(s => {
      if (s.requiresProposal) {
        if (s.prioridad.includes('P1')) state.proposalsByPriority.p1.push(s);
        else if (s.prioridad.includes('P2')) state.proposalsByPriority.p2.push(s);
        else state.proposalsByPriority.p3.push(s);
      }
    });
  }

  function renderConfirmationsTable() {
    const scheduledPatients = state.submissions.filter(s => !s.requiresProposal);
    const pendingPatients = scheduledPatients.filter(s => !state.confirmations[s.id]);
    const confirmedPatients = scheduledPatients.filter(s => !!state.confirmations[s.id]);

    // Update Badges & Counters
    if (countConfirmPending) countConfirmPending.textContent = pendingPatients.length;
    if (countConfirmDone) countConfirmDone.textContent = confirmedPatients.length;
    if (countConfirmAll) countConfirmAll.textContent = scheduledPatients.length;
    if (countNavConfirmed) countNavConfirmed.textContent = `${confirmedPatients.length}/${scheduledPatients.length}`;
    if (kpiConfirmed) kpiConfirmed.textContent = `${confirmedPatients.length}/${scheduledPatients.length}`;

    // ----------------------------------------------------
    // TABLA 1: Pacientes Pendientes de Confirmar
    // ----------------------------------------------------
    if (tbodyConfirmPending) {
      tbodyConfirmPending.innerHTML = '';
      if (pendingPatients.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td colspan="8" style="text-align: center; color: #166534; background: #f0fdf4; padding: 2.2rem 1.5rem; border-radius: 10px;">
            <div style="font-size: 2.2rem; margin-bottom: 0.35rem;">🎉</div>
            <strong style="font-size: 1.05rem;">¡Todos los pacientes citados están confirmados!</strong>
            <p style="font-size: 0.88rem; color: #15803d; margin: 0.35rem 0 0.9rem 0;">
              No queda ninguna cita pendiente de confirmación en la agenda. Puedes revisar los pacientes confirmados para enviarles su vídeo-guía interactiva.
            </p>
            <button type="button" class="btn btn-primary btn-jump-to-confirmed" style="background: #0284c7; border-color: #0284c7; font-weight: 700; cursor: pointer; padding: 0.5rem 1rem;">
              📲 Ver Pacientes Confirmados y Enviar Vídeo-Guías (${confirmedPatients.length})
            </button>
          </td>
        `;
        tbodyConfirmPending.appendChild(tr);
        const btnJump = tr.querySelector('.btn-jump-to-confirmed');
        if (btnJump) {
          btnJump.addEventListener('click', () => switchConfirmSubTab('view-confirm-done'));
        }
      } else {
        pendingPatients.forEach(s => {
          const tr = document.createElement('tr');
          tr.setAttribute('data-patient-id', s.id);
          const { cleanName, nhcVal } = extractPatientNameAndNhc(s);
          const patientPhone = s.telefono || s.phone || s['Teléfono'] || '';
          const radiofarmaco = s.radiofarmaco || s.tipoEstudio || '18F-FDG';

          tr.innerHTML = `
            <td><strong>${s.id}</strong></td>
            <td>
              <strong>${cleanName}</strong>
              <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                NHC: ${nhcVal || 'N/A'}${patientPhone ? ' | 📞 ' + patientPhone : ''}
              </div>
            </td>
            <td><span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${radiofarmaco}</span></td>
            <td><strong>${s.fechaCita}</strong></td>
            <td>${s.horaCita} h</td>
            <td><span class="badge badge-pending">⏳ Pendiente</span></td>
            <td>
              <button class="btn btn-success btn-confirm-single" data-id="${s.id}" style="font-weight:700; padding:0.45rem 0.9rem; cursor:pointer; box-shadow:0 2px 6px rgba(16,185,129,0.35);" title="Confirmar asistencia y mover a lista de confirmados">
                ✅ Confirmar Cita
              </button>
            </td>
            <td>
              <button class="btn btn-outline btn-pdf-patient" data-id="${s.id}" style="font-weight:700; padding:0.35rem 0.65rem; color:var(--sergas-navy); border-color:var(--sergas-light-border); display:inline-flex; align-items:center; gap:0.3rem;" title="Ver e Imprimir Volante Oficial de Petición Médica">
                <span>📄</span> <span>Volante</span>
              </button>
            </td>
          `;
          tbodyConfirmPending.appendChild(tr);
        });
      }
    }

    // ----------------------------------------------------
    // TABLA 2: Pacientes Confirmados & Envío de Audioguías
    // ----------------------------------------------------
    if (tbodyConfirmDone) {
      tbodyConfirmDone.innerHTML = '';
      if (confirmedPatients.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td colspan="9" style="text-align: center; color: #64748b; background: #fafafa; padding: 2.2rem 1.5rem; border-radius: 10px;">
            <div style="font-size: 2.2rem; margin-bottom: 0.35rem;">⏳</div>
            <strong style="font-size: 1.05rem;">Aún no hay pacientes en la lista de confirmados</strong>
            <p style="font-size: 0.88rem; color: #64748b; margin: 0.35rem 0 0.9rem 0;">
              Dirígete a la pestaña <strong>"1. Pendientes de Confirmar"</strong> y pulsa en <em>"✅ Confirmar Cita"</em> para pasarlos aquí y mandarles la audioguía.
            </p>
            <button type="button" class="btn btn-outline btn-jump-to-pending" style="font-weight: 700; cursor: pointer; padding: 0.5rem 1rem;">
              ⏳ Ir a Pendientes de Confirmar (${pendingPatients.length})
            </button>
          </td>
        `;
        tbodyConfirmDone.appendChild(tr);
        const btnJumpP = tr.querySelector('.btn-jump-to-pending');
        if (btnJumpP) {
          btnJumpP.addEventListener('click', () => switchConfirmSubTab('view-confirm-pending'));
        }
      } else {
        confirmedPatients.forEach(s => {
          const tr = document.createElement('tr');
          tr.setAttribute('data-patient-id', s.id);
          const isSent = state.audioguiaSent && state.audioguiaSent[s.id];
          const deliveryBadge = isSent
            ? '<span class="badge" style="background:#ecfdf5; color:#065f46; border:1.5px solid #10b981; font-weight:800; display:inline-flex; align-items:center; gap:0.35rem;">✅ Audioguía Enviada</span>'
            : '<span class="badge" style="background:#fffbeb; color:#92400e; border:1px solid #fde68a; font-weight:700;">⏳ Listo para Enviar</span>';

          const { cleanName, nhcVal } = extractPatientNameAndNhc(s);
          const patientPhone = s.telefono || s.phone || s['Teléfono'] || '';
          const radiofarmaco = resolvePatientRadiofarmaco(s);
          const directAudioguiaUrl = buildPatientAudioguiaUrl(cleanName, nhcVal, s.fechaCita, s.horaCita, radiofarmaco, patientPhone, s);

          const audioBtnHtml = isSent
            ? `<button class="btn btn-open-audioguia-modal" data-id="${s.id}" data-name="${cleanName}" data-nhc="${nhcVal}" data-fecha="${s.fechaCita}" data-hora="${s.horaCita}" data-rf="${radiofarmaco}" style="font-weight:700; padding:0.45rem 0.9rem; background:#059669; border-color:#059669; color:white; border-radius:8px; cursor:pointer; box-shadow:0 2px 8px rgba(5,150,105,0.35); display:inline-flex; align-items:center; gap:0.35rem;" title="Audioguía ya enviada al paciente (Clic para reenviar o ver opciones)">
                ✅ Audioguía Enviada
              </button>`
            : `<button class="btn btn-primary btn-open-audioguia-modal" data-id="${s.id}" data-name="${cleanName}" data-nhc="${nhcVal}" data-fecha="${s.fechaCita}" data-hora="${s.horaCita}" data-rf="${radiofarmaco}" style="font-weight:700; padding:0.45rem 0.9rem; background:#0284c7; border-color:#0284c7; color:white; border-radius:8px; cursor:pointer; box-shadow:0 2px 8px rgba(2,132,199,0.35); display:inline-flex; align-items:center; gap:0.35rem;" title="Enviar audioguía oficial con datos del paciente (${radiofarmaco})">
                📲 Enviar Audioguía
              </button>`;

          const rfLower = radiofarmaco.toLowerCase();
          const isFDGOncoItem = rfLower.includes('fdg') && !rfLower.includes('vasculitis') && !rfLower.includes('endocarditis') && !rfLower.includes('contraste') && !rfLower.includes('neuro');
          const diabBadgeHtml = isFDGOncoItem
            ? (isPatientDiabetic(s)
              ? '<div style="margin-top:3px;"><span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:0.72rem; font-weight:700;">💉 Diabético (indexFDG.html)</span></div>'
              : '<div style="margin-top:3px;"><span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #6ee7b7; font-size:0.72rem; font-weight:700;">🟢 Non Diabético (indexFDG_NoDiabetico.html)</span></div>')
            : '';

          tr.innerHTML = `
            <td><strong>${s.id}</strong></td>
            <td>
              <strong>${cleanName}</strong>
              <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                NHC: ${nhcVal || 'N/A'}${patientPhone ? ' | 📞 ' + patientPhone : ''}
              </div>
            </td>
            <td>
              <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${radiofarmaco}</span>
              ${diabBadgeHtml}
            </td>
            <td><strong>${s.fechaCita}</strong></td>
            <td>${s.horaCita} h</td>
            <td>${deliveryBadge}</td>
            <td>
              ${audioBtnHtml}
            </td>
            <td>
              <a href="${directAudioguiaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-weight:600; text-decoration:none; display:inline-flex; align-items:center; gap:0.3rem; padding:0.4rem 0.7rem;" title="Abrir Audioguía en navegador para ${cleanName}">
                🎬 Abrir
              </a>
            </td>
            <td>
              <div style="display:flex; gap:0.35rem; align-items:center;">
                <button class="btn btn-outline btn-pdf-patient" data-id="${s.id}" title="Ver e Imprimir Volante Oficial de Petición Médica" style="font-weight:700; padding:0.35rem 0.65rem; color:var(--sergas-navy); border-color:var(--sergas-light-border); display:inline-flex; align-items:center; gap:0.3rem;">
                  <span>📄</span> <span>Volante</span>
                </button>
                <button class="btn btn-outline btn-unconfirm-single" data-id="${s.id}" title="Desmarcar y devolver a lista de pendientes" style="font-weight:600; padding:0.35rem 0.65rem; color:#dc2626; border-color:#fca5a5; cursor:pointer;">
                  ↩️
                </button>
              </div>
            </td>
          `;
          tbodyConfirmDone.appendChild(tr);
        });
      }
    }

    // ----------------------------------------------------
    // TABLA 3: Todos los Pacientes Citados
    // ----------------------------------------------------
    if (tbodyConfirmAll) {
      tbodyConfirmAll.innerHTML = '';
      if (scheduledPatients.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" style="text-align: center; color: #64748b; padding: 2rem;">No hay citas agendadas actualmente en la agenda oficial.</td>`;
        tbodyConfirmAll.appendChild(tr);
      } else {
        scheduledPatients.forEach(s => {
          const tr = document.createElement('tr');
          const isConfirmed = !!state.confirmations[s.id];
          const statusBadge = isConfirmed
            ? '<span class="badge badge-confirmed">✓ Confirmada</span>'
            : '<span class="badge badge-pending">⏳ Pendiente</span>';

          const isSent = state.audioguiaSent && state.audioguiaSent[s.id];
          const audioguiaBadge = isSent ? '<span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #6ee7b7; font-size:0.75rem; margin-top:3px; display:inline-block; font-weight:700;">✅ Audioguía Enviada</span>' : '';

          const { cleanName, nhcVal } = extractPatientNameAndNhc(s);
          const patientPhone = s.telefono || s.phone || s['Teléfono'] || '';
          const radiofarmaco = resolvePatientRadiofarmaco(s);
          const directAudioguiaUrl = buildPatientAudioguiaUrl(cleanName, nhcVal, s.fechaCita, s.horaCita, radiofarmaco, patientPhone, s);

          const audioBtnHtmlAll = isSent
            ? `<button class="btn btn-open-audioguia-modal" data-id="${s.id}" data-name="${cleanName}" data-nhc="${nhcVal}" data-fecha="${s.fechaCita}" data-hora="${s.horaCita}" data-rf="${radiofarmaco}" style="font-weight:700; padding:0.35rem 0.75rem; background:#059669; border-color:#059669; color:white; border-radius:6px; cursor:pointer;" title="Audioguía ya enviada">
                ✅ Enviada
              </button>`
            : `<button class="btn btn-primary btn-open-audioguia-modal" data-id="${s.id}" data-name="${cleanName}" data-nhc="${nhcVal}" data-fecha="${s.fechaCita}" data-hora="${s.horaCita}" data-rf="${radiofarmaco}" style="font-weight:700; padding:0.35rem 0.75rem; background:#0284c7; border-color:#0284c7; color:white; border-radius:6px; cursor:pointer;" title="Enviar audioguía">
                📲 Audioguía
              </button>`;

          const rfLowerAll = radiofarmaco.toLowerCase();
          const isFDGOncoItemAll = rfLowerAll.includes('fdg') && !rfLowerAll.includes('vasculitis') && !rfLowerAll.includes('endocarditis') && !rfLowerAll.includes('contraste') && !rfLowerAll.includes('neuro');
          const diabBadgeAll = isFDGOncoItemAll
            ? (isPatientDiabetic(s)
              ? '<div style="margin-top:2px;"><span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-size:0.7rem; font-weight:700;">💉 Diabético</span></div>'
              : '<div style="margin-top:2px;"><span class="badge" style="background:#ecfdf5; color:#059669; border:1px solid #6ee7b7; font-size:0.7rem; font-weight:700;">🟢 Non Diabético</span></div>')
            : '';

          tr.innerHTML = `
            <td><strong>${s.id}</strong></td>
            <td>
              <strong>${cleanName}</strong>
              <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">
                NHC: ${nhcVal || 'N/A'}${patientPhone ? ' | 📞 ' + patientPhone : ''}
              </div>
            </td>
            <td>
              <span class="badge" style="background:#e0f2fe; color:#0369a1; font-weight:700;">${radiofarmaco}</span>
              ${diabBadgeAll}
            </td>
            <td><strong>${s.fechaCita}</strong></td>
            <td>${s.horaCita} h</td>
            <td>${statusBadge}${audioguiaBadge}</td>
            <td>
              <button class="btn ${isConfirmed ? 'btn-outline btn-unconfirm-single' : 'btn-success btn-confirm-single'}" data-id="${s.id}" style="font-weight:700; padding:0.4rem 0.8rem; cursor:pointer;">
                ${isConfirmed ? '↩️ Desmarcar' : '✅ Confirmar'}
              </button>
            </td>
            <td>
              <div style="display:flex; gap:0.35rem; align-items:center;">
                ${audioBtnHtmlAll}
                <a href="${directAudioguiaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-weight:600; text-decoration:none; padding:0.35rem 0.6rem;" title="Abrir">
                  🎬
                </a>
                <button class="btn btn-outline btn-pdf-patient" data-id="${s.id}" style="font-weight:600; padding:0.35rem 0.6rem;" title="Ficha PDF">
                  📄
                </button>
              </div>
            </td>
          `;
          tbodyConfirmAll.appendChild(tr);
        });
      }
    }

    // Attach Event Handlers:
    // 1. Confirm button
    document.querySelectorAll('.btn-confirm-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pId = e.currentTarget.getAttribute('data-id');
        if (!pId) return;
        const patient = state.submissions.find(s => s.id === pId);
        state.confirmations[pId] = true;
        try {
          localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
        } catch (err) { }
        updateConfirmationInMasterDb(pId, true);
        updateKPIs();
        renderConfirmationsTable();
        renderWeeklyGrid();
        renderSubmissionsTable();

        const { cleanName } = extractPatientNameAndNhc(patient || { nombre: 'Paciente', id: pId });
        showConfirmToast(
          `✅ Cita Confirmada: ${cleanName}`,
          `El paciente se ha movido a la sección de "Pacientes Confirmados". Ya puedes enviarle su vídeo-guía interactiva.`,
          patient
        );
      });
    });

    // 2. Unconfirm button
    document.querySelectorAll('.btn-unconfirm-single').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pId = e.currentTarget.getAttribute('data-id');
        if (!pId) return;
        const patient = state.submissions.find(s => s.id === pId);
        delete state.confirmations[pId];
        try {
          localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
        } catch (err) { }
        updateConfirmationInMasterDb(pId, false);
        updateKPIs();
        renderConfirmationsTable();
        renderWeeklyGrid();
        renderSubmissionsTable();

        const { cleanName } = extractPatientNameAndNhc(patient || { nombre: 'Paciente', id: pId });
        showConfirmToast(
          `↩️ Cita Desmarcada: ${cleanName}`,
          `El paciente ha vuelto a la lista de "Pendientes de Confirmar".`,
          null
        );
      });
    });

    // 3. Open Audioguia Confirmation Modal
    document.querySelectorAll('.btn-open-audioguia-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pId = e.currentTarget.getAttribute('data-id');
        const pName = e.currentTarget.getAttribute('data-name');
        const pNhc = e.currentTarget.getAttribute('data-nhc');
        const pFecha = e.currentTarget.getAttribute('data-fecha');
        const pHora = e.currentTarget.getAttribute('data-hora');
        const pRf = e.currentTarget.getAttribute('data-rf');
        confirmAndSendAudioguia(pId, pName, pNhc, pFecha, pHora, pRf);
      });
    });

    attachPdfButtonListeners();
  }

  function renderProposalTables() {
    renderSingleProposalTable(state.proposalsByPriority.p1, tbodyPropP1);
    renderSingleProposalTable(state.proposalsByPriority.p2, tbodyPropP2);
    renderSingleProposalTable(state.proposalsByPriority.p3, tbodyPropP3);
  }

  function renderSingleProposalTable(list, tbody) {
    tbody.innerHTML = '';
    if (list.length === 0) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="8" style="text-align: center; color: #10b981; padding: 1.2rem;">✓ Todos los pacientes de este grupo caben en la agenda oficial de mañana.</td>`;
      tbody.appendChild(tr);
      return;
    }

    list.forEach(s => {
      const sMob = getPatientMobilityHospitalizationInfo(s);
      const sMobBadge = sMob.isLateShift
        ? `<div style="margin-top:3px;"><span class="badge-late-shift" title="${sMob.label}">${sMob.label} (Citar de último)</span></div>`
        : '';
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td><strong>${s.id}</strong></td>
        <td>${s.nombre}${sMobBadge}</td>
        <td>${s.radiofarmaco}</td>
        <td>📅 ${s.fechaSolicitud || '-'}</td>
        <td><span class="badge ${s.prioridad.includes('P1') ? 'badge-p1' : s.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${s.prioridad} (< ${s.maxDias || 7}d)</span></td>
        <td><strong style="color: #ef4444;">🚨 ${s.fechaLimite || '-'}</strong></td>
        <td><strong style="color: #f59e0b;">📅 ${s.proposedDate || 'Sugerida'}</strong></td>
        <td>
          <div style="display:flex; gap:0.3rem; flex-wrap:wrap; align-items:center;">
            <button class="btn btn-primary btn-schedule-peonada" data-id="${s.id}" style="padding: 0.35rem 0.65rem; font-size: 0.78rem;">
              🗓️ Agendar Peonada
            </button>
            <button class="btn btn-outline btn-pdf-patient" data-id="${s.id}" style="padding: 0.35rem 0.65rem; font-size: 0.78rem; font-weight: 700; color:var(--sergas-navy); border-color:var(--sergas-light-border); display:inline-flex; align-items:center; gap:0.3rem;" title="Ver e Imprimir Volante Oficial de Petición Médica">
              <span>📄</span> <span>Volante</span>
            </button>
          </div>
        </td>
      `;

      tr.addEventListener('click', (e) => {
        openPeonadaModal(s);
      });

      tbody.appendChild(tr);
    });
  }

  function renderSubmissionsTable() {
    submissionsTableBody.innerHTML = '';
    state.submissions.slice().reverse().forEach(s => {
      const sMob = getPatientMobilityHospitalizationInfo(s);
      const sMobBadge = sMob.isLateShift
        ? `<div style="margin-top:2px;"><span class="badge-late-shift" title="${sMob.label}">${sMob.label}</span></div>`
        : '';
      const tr = document.createElement('tr');
      const alertsText = s.alertas ? s.alertas.map(a => a.text).join(' | ') : 'Ninguna';
      const isConfirmed = state.confirmations[s.id];

      const isSent = state.audioguiaSent && state.audioguiaSent[s.id];
      const isNoTriable = !!(s.raw && (s.raw.noTriable || s.raw["Estado de Triaje"] === "No Triable" || s.raw.discrepanciaPrioridad));
      const statusBadge = isNoTriable
        ? `<span class="badge" style="background:#fff1f2; color:#be123c; border:1px solid #fecdd3; font-weight:800; cursor:help;" title="${s.raw.motivoNoTriable || 'No concuerdan prioridades'}">🚫 No Triable: No concuerdan prioridades</span>`
        : s.requiresProposal
          ? `<span class="badge badge-proposal btn-schedule-peonada" data-id="${s.id}" style="cursor:pointer;" title="Haz clic para agendar en Peonada">💡 Propuesta Peonada (Haz Clic)</span>`
          : isConfirmed
            ? (isSent
              ? '<span class="badge badge-confirmed" style="background:#ecfdf5; color:#065f46; border:1px solid #10b981;">✓ Confirmada | ✅ Audioguía</span>'
              : '<span class="badge badge-confirmed">✓ Confirmada</span>')
            : '<span class="badge badge-pending">⏳ Pendiente</span>';

      tr.innerHTML = `
        <td><strong>${s.id}</strong></td>
        <td>${s.nombre}${sMobBadge}</td>
        <td>${s.radiofarmaco}</td>
        <td><span class="badge ${s.prioridad.includes('P1') ? 'badge-p1' : s.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${s.prioridad}</span></td>
        <td><strong>${s.fechaCita}</strong></td>
        <td>${s.horaCita}</td>
        <td>${statusBadge}</td>
        <td><small style="color: ${alertsText.includes('💡') ? '#f59e0b' : '#94a3b8'}">${alertsText || 'Ninguna'}</small></td>
        <td>
          <button class="btn btn-outline btn-pdf-patient" data-id="${s.id}" style="padding:0.25rem 0.65rem; font-size:0.78rem; font-weight:700; color:var(--sergas-navy); border-color:var(--sergas-light-border); display:inline-flex; align-items:center; gap:0.3rem;" title="Ver e Imprimir Volante Oficial de Petición Médica">
            <span>📄</span> <span>Ver Volante</span>
          </button>
        </td>
      `;

      if (s.requiresProposal) {
        tr.querySelectorAll('.btn-schedule-peonada').forEach(b => {
          b.addEventListener('click', () => openPeonadaModal(s));
        });
      }

      submissionsTableBody.appendChild(tr);
    });

    attachPdfButtonListeners();
  }

  function renderSearchResults(query) {
    if (!searchResultsContainer) return;
    const q = (query || '').trim().toLowerCase();
    searchResultsContainer.innerHTML = '';

    if (!q) {
      searchResultsCounter.innerHTML = `Escribe un nombre, apellidos o NHC en la barra superior para buscar un paciente (ej: <em>Gonzalo, Martínez, NHC-145168</em>).`;
      return;
    }

    const matches = state.submissions.filter(s =>
      s.nombre.toLowerCase().includes(q) ||
      s.id.toLowerCase().includes(q) ||
      (s.radiofarmaco && s.radiofarmaco.toLowerCase().includes(q))
    );

    searchResultsCounter.innerHTML = `Se encontraron <strong style="color:#0f4c81; font-size:1.05rem;">${matches.length}</strong> paciente(s) coincidentes para "<strong>${query}</strong>":`;

    if (matches.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.style.cssText = 'background:#f8fcfe; border:1px solid #d5eef7; border-radius:12px; padding:2.5rem; text-align:center; color:#64748b;';
      emptyDiv.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 0.5rem;">🔍 👤</div>
        <h4 style="color:#0f4c81; font-size:1.1rem; margin-bottom:0.4rem;">No se encontró ningún paciente con "${query}"</h4>
        <p style="font-size:0.9rem; color:#64748b; max-width:460px; margin:0 auto;">Comprueba la ortografía o intenta buscar por el número de NHC o ID del paciente.</p>
      `;
      searchResultsContainer.appendChild(emptyDiv);
      return;
    }

    matches.forEach(p => {
      const isConfirmed = state.confirmations[p.id];
      const isPeonada = !p.requiresProposal && (p.horaCita.includes('15:') || p.horaCita.includes('16:') || p.horaCita.includes('17:') || p.horaCita.includes('18:') || p.fechaCita.includes('SÁBADO') || p.fechaCita.includes('Sabado'));

      let statusBadge = '';
      let statusStyle = '';

      if (isPeonada) {
        statusStyle = 'border-left: 5px solid #f59e0b; background: #fffbeb;';
        statusBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-weight:700; font-size:0.85rem; padding:4px 10px;">🌆 AGENDADO EN TURNO EXTRA / PEONADA</span>`;
      } else if (!p.requiresProposal) {
        statusStyle = 'border-left: 5px solid #10b981; background: #f0fdf4;';
        statusBadge = `<span class="badge badge-confirmed" style="font-size:0.85rem; padding:4px 10px;">✅ CITADO EN AGENDA OFICIAL</span>`;
      } else {
        const isP1 = p.prioridad.includes('P1');
        const isP2 = p.prioridad.includes('P2');
        const prioBg = isP1 ? '#fee2e2' : isP2 ? '#fef3c7' : '#ecfdf5';
        const prioColor = isP1 ? '#991b1b' : isP2 ? '#92400e' : '#065f46';
        statusStyle = `border-left: 5px solid ${isP1 ? '#ef4444' : isP2 ? '#f59e0b' : '#10b981'}; background: #f8fcfe;`;
        statusBadge = `<span class="badge" style="background:${prioBg}; color:${prioColor}; border:1px solid ${prioColor}; font-weight:700; font-size:0.85rem; padding:4px 10px;">⏳ EN LISTA DE ESPERA / PROPUESTA (${p.prioridad})</span>`;
      }

      const card = document.createElement('div');
      card.style.cssText = `border: 1px solid #cbd5e1; border-radius: 12px; padding: 1.2rem; box-shadow: 0 4px 12px rgba(0,0,0,0.04); ${statusStyle}`;

      const { cleanName, nhcVal } = extractPatientNameAndNhc(p);
      const patientPhone = p.telefono || p.phone || p['Teléfono'] || '';
      const radiofarmaco = resolvePatientRadiofarmaco(p);
      const directAudioguiaUrl = buildPatientAudioguiaUrl(cleanName, nhcVal, p.fechaCita, p.horaCita, radiofarmaco, patientPhone, p);

      const isSent = state.audioguiaSent && state.audioguiaSent[p.id];
      const audioguiaSearchBtnHtml = isSent
        ? `
        <button class="btn btn-open-audioguia-modal" data-id="${p.id}" data-name="${cleanName}" data-nhc="${nhcVal}" data-fecha="${p.fechaCita || 'Pendiente'}" data-hora="${p.horaCita || '--:--'}" data-rf="${radiofarmaco}" style="font-weight:700; padding:0.4rem 0.8rem; display:inline-flex; align-items:center; gap:0.35rem; background:#059669; border-color:#059669; color:white; border-radius:6px; cursor:pointer;" title="Audioguía ya enviada al paciente (Clic para reenviar o confirmar)">
          ✅ Audioguía Enviada
        </button>
        <a href="${directAudioguiaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-weight:600; text-decoration:none; padding:0.4rem 0.8rem; display:inline-flex; align-items:center; gap:0.3rem;" title="Abrir Audioguía con datos de ${cleanName}">
          🎬 Abrir
        </a>
      `
        : `
        <button class="btn btn-primary btn-open-audioguia-modal" data-id="${p.id}" data-name="${cleanName}" data-nhc="${nhcVal}" data-fecha="${p.fechaCita || 'Pendiente'}" data-hora="${p.horaCita || '--:--'}" data-rf="${radiofarmaco}" style="font-weight:700; padding:0.4rem 0.8rem; display:inline-flex; align-items:center; gap:0.35rem; background:#0284c7; border-color:#0284c7; color:white; border-radius:6px; cursor:pointer;" title="Enviar audioguía oficial con datos del paciente (${radiofarmaco})">
          📲 Enviar Audioguía
        </button>
        <a href="${directAudioguiaUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-outline" style="font-weight:600; text-decoration:none; padding:0.4rem 0.8rem; display:inline-flex; align-items:center; gap:0.3rem;" title="Abrir Audioguía con datos de ${cleanName}">
          🎬 Abrir
        </a>
      `;

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
          <div>
            <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.4rem;">
              <h3 style="margin:0; font-size: 1.15rem; color: #123b5d;">👤 ${p.nombre}</h3>
              <span class="badge" style="background:#eff8fc; color:#0f4c81; border:1px solid #d5eef7; font-weight:700;">ID: ${p.id}</span>
              ${statusBadge}
            </div>
            <div style="font-size: 0.9rem; color: #475569; margin-bottom: 0.4rem;">
              🧪 <strong>Estudio / Fármaco:</strong> <span style="color:#0f4c81; font-weight:700;">${p.tipoEstudio || p.radiofarmaco}</span> (${p.radiofarmaco})
            </div>
          </div>
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            ${audioguiaSearchBtnHtml}
            <button class="btn btn-outline btn-pdf-patient" data-id="${p.id}" style="font-weight:700; padding:0.4rem 0.8rem; color:var(--sergas-navy); border-color:var(--sergas-light-border); display:inline-flex; align-items:center; gap:0.35rem;" title="Ver e Imprimir Volante Oficial de Petición Médica">
              <span>📄</span> <span>Ver Volante</span>
            </button>
            <button class="btn btn-success btn-action-manage-search" data-id="${p.id}" style="font-weight:600; padding:0.4rem 0.8rem;">
              🗓️ Gestionar Cita
            </button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 0.8rem; margin-top: 0.8rem; background: #ffffff; padding: 0.85rem; border-radius: 8px; border: 1px solid #e2e8f0;">
          <div>
            <span style="font-size:0.78rem; color:#64748b; font-weight:600; display:block;">ESTADO Y CITA ASIGNADA</span>
            <strong style="font-size:0.95rem; color:#0f4c81;">📅 ${p.fechaCita || 'Pendiente'} (${p.horaCita || '--:--'})</strong>
          </div>
          <div>
            <span style="font-size:0.78rem; color:#64748b; font-weight:600; display:block;">FECHA DE SOLICITUD</span>
            <span style="font-size:0.9rem; color:#334155;">📅 ${p.fechaSolicitud || '-'}</span>
          </div>
          <div>
            <span style="font-size:0.78rem; color:#64748b; font-weight:600; display:block;">🚨 FECHA LÍMITE CLÍNICA</span>
            <strong style="font-size:0.9rem; color:#ef4444;">🚨 ${p.fechaLimite || '-'}</strong> (&lt;${p.maxDias || 7}d hábiles)
          </div>
          <div>
            <span style="font-size:0.78rem; color:#64748b; font-weight:600; display:block;">💡 FECHA SUGERIDA PEONADA</span>
            <strong style="font-size:0.9rem; color:#f59e0b;">📅 ${p.proposedDate || 'Próxima semana'}</strong>
          </div>
        </div>

        <div style="margin-top: 0.8rem; background: #f8fcfe; border: 1px solid #d5eef7; padding: 0.7rem 0.9rem; border-radius: 8px; font-size: 0.88rem; color: #123b5d;">
          <strong>🩺 Indicación / Motivo Clínico (Excel):</strong> ${p.motivo || 'Estudio PET/CT Oncológico'}
        </div>
      `;

      searchResultsContainer.appendChild(card);
    });

    attachPdfButtonListeners();

    document.querySelectorAll('#search-results .btn-open-audioguia-modal').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pId = e.currentTarget.getAttribute('data-id');
        const pName = e.currentTarget.getAttribute('data-name');
        const pNhc = e.currentTarget.getAttribute('data-nhc');
        const pFecha = e.currentTarget.getAttribute('data-fecha');
        const pHora = e.currentTarget.getAttribute('data-hora');
        const pRf = e.currentTarget.getAttribute('data-rf');
        confirmAndSendAudioguia(pId, pName, pNhc, pFecha, pHora, pRf);
      });
    });

    document.querySelectorAll('.btn-action-manage-search').forEach(btn => {
      btn.onclick = () => {
        const pid = btn.getAttribute('data-id');
        const pat = state.submissions.find(s => s.id === pid);
        if (pat) {
          if (pat.requiresProposal) openPeonadaModal(pat);
          else openSlotModal(pat);
        }
      };
    });
  }

  /**
   * Open Peonada / Extra Shift Scheduling Modal
   */
  function openPeonadaModal(patient) {
    state.activePeonadaPatient = patient;
    state.selectedPeonadaTime = null;
    btnConfirmPeonada.disabled = true;

    const pMob = getPatientMobilityHospitalizationInfo(patient);
    const pMobNotice = pMob.isLateShift
      ? `<div style="background:#fef2f2; border:1px solid #f87171; border-radius:6px; padding:0.45rem 0.65rem; margin-top:0.35rem; color:#991b1b; font-size:0.78rem; font-weight:700;">
          ⚠️ PROTOCOLO SERGAS: Paciente ${pMob.label}. Se recomienda agendar en los ÚLTIMOS turnos de la sesión.
         </div>`
      : '';

    peonadaPatientInfo.innerHTML = `
      ${pMobNotice}
      <div><strong>Paciente:</strong> ${patient.nombre} (ID: ${patient.id})</div>
      <div><strong>Prioridad:</strong> <span class="badge ${patient.prioridad.includes('P1') ? 'badge-p1' : patient.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${patient.prioridad}</span></div>
      ${pMob.isLateShift ? `<div><strong>Movilidad / Logística:</strong> <span class="badge-late-shift">${pMob.label}</span></div>` : ''}
      <div><strong>Estudio / Radiofármaco:</strong> ${patient.radiofarmaco}</div>
      <div><strong>🩺 Indicación / Motivo Clínico (Excel):</strong> <strong style="color: #0f4c81;">${patient.motivo || 'Estudio PET/CT Oncológico'}</strong></div>
      <div><strong>Fecha de Solicitud:</strong> 📅 ${patient.fechaSolicitud || '-'}</div>
      <div><strong>🚨 Fecha Límite Clínica Exigida:</strong> <strong style="color: #ef4444; font-size: 1.05rem;">🚨 ${patient.fechaLimite || '-'}</strong> (Ventana: < ${patient.maxDias || 7} días laborables)</div>
      <div><strong>💡 Fecha Sugerida de Peonada:</strong> 📅 ${patient.proposedDate || 'Próxima semana'}</div>
      <button class="btn btn-outline btn-pdf-patient" data-id="${patient.id}" style="margin-top:0.6rem; width:100%; font-weight:700; border-color:var(--sergas-blue); color:var(--sergas-navy); display:flex; align-items:center; justify-content:center; gap:0.5rem; padding:0.6rem; background:#ffffff; cursor:pointer;">
        <span>📄</span> <span>Ver Volante de Petición del Médico (Imprimir / PDF)</span>
      </button>
    `;
    attachPdfButtonListeners();

    peonadaDatePicker.value = patient.proposedDate || formatDate(new Date());
    peonadaModal.classList.remove('hidden');
    renderPeonadaTimeSlots();
  }

  function closePeonadaModal() {
    peonadaModal.classList.add('hidden');
    state.activePeonadaPatient = null;
    state.selectedPeonadaTime = null;
  }

  /**
   * Dynamically generate 30-minute time slots based on selected date:
   * - Mon to Fri (Afternoon): 15:00 to 18:30 (every 30 min)
   * - Saturday (Morning): 08:00 to 12:00 (every 30 min)
   */
  function renderPeonadaTimeSlots() {
    const dateVal = peonadaDatePicker.value;
    if (!dateVal) return;

    const dateParts = dateVal.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayOfWeek = dateObj.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat

    peonadaTimeSlots.innerHTML = '';
    state.selectedPeonadaTime = null;
    btnConfirmPeonada.disabled = true;

    let slots = [];
    if (dayOfWeek >= 1 && dayOfWeek <= 5) {
      // Lunes a Viernes de Tarde (15:00 a 18:30 cada 30 min)
      peonadaDayTypeBadge.className = 'day-type-badge afternoon';
      peonadaDayTypeBadge.innerHTML = '🌆 <strong>Tarde (Lunes a Viernes)</strong> • Horario de 15:00 a 18:30 h (Pacientes cada 30 min)';
      slots = ["15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30"];
    } else if (dayOfWeek === 6) {
      // Sábados de Mañana (08:00 a 12:00 cada 30 min)
      peonadaDayTypeBadge.className = 'day-type-badge saturday';
      peonadaDayTypeBadge.innerHTML = '☀️ <strong>Mañana (Sábado)</strong> • Horario de 08:00 a 12:00 h (Pacientes cada 30 min)';
      slots = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00"];
    } else {
      // Domingo
      peonadaDayTypeBadge.className = 'day-type-badge sunday';
      peonadaDayTypeBadge.innerHTML = '⚠️ <strong>Domingo</strong>: No hay turnos de peonada programados. Selecciona de Lunes a Viernes (tarde) o Sábados (mañana).';
      return;
    }

    // Find active appointments for this date to block occupied time slots
    const takenTimeSlots = state.submissions
      .filter(s => !s.requiresProposal && s.fechaCita === dateVal)
      .map(s => s.horaCita);

    slots.forEach(slot => {
      const btn = document.createElement('button');
      btn.className = 'time-slot-btn';

      const isOccupied = takenTimeSlots.some(t => t.includes(slot));
      if (isOccupied) {
        btn.textContent = `🔒 ${slot} (Ocupado)`;
        btn.disabled = true;
        btn.style.opacity = '0.45';
        btn.style.cursor = 'not-allowed';
        btn.style.background = 'rgba(239, 68, 68, 0.12)';
        btn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
        btn.style.color = '#ef4444';
        btn.title = 'Este hueco ya se encuentra reservado y bloqueado por otro paciente';
      } else {
        btn.textContent = `${slot} h`;
        btn.addEventListener('click', () => {
          document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
          btn.classList.add('selected');
          state.selectedPeonadaTime = slot;
          btnConfirmPeonada.disabled = false;
        });
      }

      peonadaTimeSlots.appendChild(btn);
    });
  }

  /**
   * Confirm Peonada appointment slot
   */
  function handleConfirmPeonada() {
    if (!state.activePeonadaPatient || !peonadaDatePicker.value || !state.selectedPeonadaTime) return;

    const patient = state.activePeonadaPatient;
    const hora = `${state.selectedPeonadaTime} (Peonada)`;
    const fecha = peonadaDatePicker.value;

    const mobInfoPeonada = getPatientMobilityHospitalizationInfo(patient);
    const isFirstPeonada = isFirstSlotOfDayOrShift(fecha, state.selectedPeonadaTime);
    if (mobInfoPeonada.isLateShift && isFirstPeonada) {
      const proceed = confirm(
        `⚠️ AVISO ASISTENCIAL (NO CITADO CORRECTAMENTE):\n\n` +
        `El paciente ${patient.nombre} es ${mobInfoPeonada.label.toUpperCase()}.\n\n` +
        `Protocolo PET/CT: Los pacientes con movilidad reducida (silla/camilla) u hospitalizados DEBEN citarse de ÚLTIMOS en el turno.\n\n` +
        `¿Desea continuar y citarlo de primero (${state.selectedPeonadaTime}) de forma excepcional?`
      );
      if (!proceed) return;
    }

    patient.requiresProposal = false;
    patient.fechaCita = fecha;
    patient.horaCita = hora;

    state.peonadaAssignments[patient.id] = {
      fechaCita: fecha,
      horaCita: hora
    };
    try {
      localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
    } catch (e) { }

    fetch('/api/assign-peonada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paciente_id: patient.id,
        fecha_cita: fecha,
        hora_cita: hora
      })
    }).catch(err => console.log('Peonada sync:', err));

    syncAssignmentToMasterDatabase(patient.id, fecha, hora);

    updateProposalsLists();
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    closePeonadaModal();

    const resolvedRf = resolvePatientRadiofarmaco(patient);
    const rfLower = String(resolvedRf || '').toLowerCase();
    if (rfLower.includes('paratiroid') || (rfLower.includes('colina') && (rfLower.includes('adenoma') || rfLower.includes('pth')))) {
      const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
      setTimeout(() => {
        confirmAndSendAudioguia(patient.id, cleanName, nhcVal, fecha, hora, resolvedRf);
      }, 350);
    } else if (rfLower.includes('colina') || rfLower.includes('fch')) {
      const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
      setTimeout(() => {
        confirmAndSendAudioguia(patient.id, cleanName, nhcVal, fecha, hora, resolvedRf);
      }, 350);
    } else if (rfLower.includes('psma')) {
      const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
      setTimeout(() => {
        confirmAndSendAudioguia(patient.id, cleanName, nhcVal, fecha, hora, resolvedRf);
      }, 350);
    } else if (rfLower.includes('vasculitis')) {
      const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
      setTimeout(() => {
        confirmAndSendAudioguia(patient.id, cleanName, nhcVal, fecha, hora, resolvedRf);
      }, 350);
    } else if (rfLower.includes('contraste') || rfLower.includes('iodado') || rfLower.includes('yodado')) {
      const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
      setTimeout(() => {
        confirmAndSendAudioguia(patient.id, cleanName, nhcVal, fecha, hora, patient.radiofarmaco);
      }, 350);
    }
  }

  const videoPlayerModal = document.getElementById('video-player-modal');
  const btnCloseVideoModal = document.getElementById('btn-close-video-modal');
  const videoIframe = document.getElementById('video-iframe');
  const videoPlaceholder = document.getElementById('video-placeholder');
  const videoModalTitle = document.getElementById('video-modal-title');
  const btnExternalVideoLink = document.getElementById('btn-external-video-link');

  if (btnCloseVideoModal) {
    btnCloseVideoModal.addEventListener('click', closeVideoModal);
  }
  if (videoPlayerModal) {
    videoPlayerModal.addEventListener('click', (e) => {
      if (e.target === videoPlayerModal) closeVideoModal();
    });
  }

  function closeVideoModal() {
    if (videoPlayerModal) videoPlayerModal.classList.add('hidden');
    if (videoIframe) videoIframe.src = '';
  }

  function openVideoModal(url, patientName, radiofarmaco) {
    if (videoModalTitle) {
      videoModalTitle.textContent = `🎬 Vídeo-Guía de Preparación: ${patientName || 'Paciente'} (${radiofarmaco || 'PET/CT'})`;
    }

    let embedUrl = url || DRIVE_GOOGLE_URL;
    if (embedUrl.includes('drive.google.com/file/d/')) {
      embedUrl = embedUrl.replace(/\/view.*$/, '/preview');
    } else if (embedUrl.includes('drive.google.com/drive/my-drive') || embedUrl.includes('hospital.es')) {
      embedUrl = "https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1";
    }

    if (videoIframe) {
      videoIframe.style.display = 'block';
      videoIframe.src = embedUrl;
    }
    if (videoPlayerModal) videoPlayerModal.classList.remove('hidden');
  }

  // --- Modal de Envío de Audioguía (http://localhost:8000) ---
  const audioguiaModal = document.getElementById('audioguia-modal');
  const btnCloseAudioguiaModal = document.getElementById('btn-close-audioguia-modal');

  // --- Modal de Confirmación de Envío de Audioguía (Doble Confirmación con Check) ---
  const confirmAudioModal = document.getElementById('confirm-send-audioguia-modal');
  const btnCloseConfirmAudioModal = document.getElementById('btn-close-confirm-audio-modal');
  const btnDoConfirmSendAudio = document.getElementById('btn-do-confirm-send-audio');
  const btnOpenAdvancedSendAudio = document.getElementById('btn-open-advanced-send-audio');
  const btnCancelConfirmSendAudio = document.getElementById('btn-cancel-confirm-send-audio');
  let activeConfirmAudioData = null;

  function closeConfirmAudioModal() {
    if (confirmAudioModal) confirmAudioModal.classList.add('hidden');
    activeConfirmAudioData = null;
  }

  if (btnCloseConfirmAudioModal) {
    btnCloseConfirmAudioModal.addEventListener('click', closeConfirmAudioModal);
  }
  if (btnCancelConfirmSendAudio) {
    btnCancelConfirmSendAudio.addEventListener('click', closeConfirmAudioModal);
  }
  if (confirmAudioModal) {
    confirmAudioModal.addEventListener('click', (e) => {
      if (e.target === confirmAudioModal) closeConfirmAudioModal();
    });
  }

  function confirmAndSendAudioguia(pId, pName, pNhc, pFecha, pHora, pRf) {
    const patientObj = state.submissions.find(s => s.id === pId);
    let cleanName = pName;
    let nhcVal = pNhc;
    let fecha = pFecha;
    let hora = pHora;
    let radiofarmaco = pRf;

    if (patientObj) {
      const extracted = extractPatientNameAndNhc(patientObj);
      if (!cleanName) cleanName = extracted.cleanName;
      if (!nhcVal) nhcVal = extracted.nhcVal;
      if (!fecha) fecha = patientObj.fechaCita;
      if (!hora) hora = patientObj.horaCita;
      if (!radiofarmaco) radiofarmaco = patientObj.radiofarmaco || patientObj.tipoEstudio || patientObj["Tipo de Estudio PET Solicitado"] || '18F-FDG';
    }

    cleanName = cleanName || 'Paciente';
    nhcVal = nhcVal || pId || 'N/A';
    fecha = fecha || 'Pendiente';
    hora = hora || '--:--';
    radiofarmaco = resolvePatientRadiofarmaco(patientObj, radiofarmaco || '18F-FDG');

    const rfLower = String(radiofarmaco || '').toLowerCase();
    const patientPhone = patientObj ? (patientObj.telefono || patientObj.phone || patientObj['Teléfono'] || '') : '';
    const patientUrl = buildPatientAudioguiaUrl(cleanName, nhcVal, fecha, hora, radiofarmaco, patientPhone, patientObj);

    // Para pacientes de PET 18F-Colina Paratiroides: al citar o enviar la audioguía, se abre directamente este programa en el navegador y se registra el envío
    const isColinaParatiroides = rfLower.includes('paratiroid') || (rfLower.includes('colina') && (rfLower.includes('adenoma') || rfLower.includes('pth')));
    if (isColinaParatiroides) {
      window.open(patientUrl, '_blank');
      markAudioguiaSent(pId);
      showConfirmToast(
        `✅ Programa Colina Paratiroides Abierto y Enviado: ${cleanName}`,
        `Se ha abierto el programa oficial PET 18F-Colina Paratiroides en el navegador con los datos de ${cleanName} (${nhcVal}) y preparado el envío de citación.`,
        patientObj
      );
      openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
      return;
    }

    // Para pacientes de PET 18F-Colina Próstata: al citar o enviar la audioguía, se abre directamente este programa en el navegador y se registra el envío
    const isColinaProstata = (rfLower.includes('colina') || rfLower.includes('fch')) && !isColinaParatiroides;
    if (isColinaProstata) {
      window.open(patientUrl, '_blank');
      markAudioguiaSent(pId);
      showConfirmToast(
        `✅ Programa Colina Próstata Abierto y Enviado: ${cleanName}`,
        `Se ha abierto el programa oficial PET 18F-Colina Próstata en el navegador con los datos de ${cleanName} (${nhcVal}) y preparado el envío de citación.`,
        patientObj
      );
      openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
      return;
    }

    // Para pacientes de PET PSMA: al citar o enviar la audioguía, se abre directamente este programa en el navegador y se registra el envío
    const isPSMA = rfLower.includes('psma');
    if (isPSMA) {
      window.open(patientUrl, '_blank');
      markAudioguiaSent(pId);
      showConfirmToast(
        `✅ Programa PET PSMA Abierto y Enviado: ${cleanName}`,
        `Se ha abierto el programa oficial PET PSMA en el navegador con los datos de ${cleanName} (${nhcVal}) y preparado el envío de citación.`,
        patientObj
      );
      openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
      return;
    }

    // Para pacientes de FDG Vasculitis: al citar o enviar la audioguía, se abre directamente este programa interactivo en el navegador y se registra el envío
    const isFDGVasculitis = rfLower.includes('vasculitis') || rfLower.includes('takayasu') || rfLower.includes('arteritis') || (patientObj && String(patientObj.motivo || patientObj.diagnostico || patientObj['Diagnóstico Clínico'] || patientObj.indicacion || '').toLowerCase().includes('vasculitis'));
    if (isFDGVasculitis) {
      window.open(patientUrl, '_blank');
      markAudioguiaSent(pId);
      showConfirmToast(
        `✅ Programa FDG Vasculitis Abierto y Enviado: ${cleanName}`,
        `Se ha abierto el programa oficial FDG Vasculitis en el navegador con los datos de ${cleanName} (${nhcVal}) y preparado el envío de citación.`,
        patientObj
      );
      openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
      return;
    }

    const isGa68Dotatoc = rfLower.includes('dotatoc') || rfLower.includes('dotatate') || rfLower.includes('somatostatina') || (rfLower.includes('ga') && (rfLower.includes('68') || rfLower.includes('galio') || rfLower.includes('neuroendocrin')));

    // Para pacientes de Ga-68 DOTATOC (o Galio-68): al darle a enviar la audioguía, se abre directamente este programa en el navegador
    if (isGa68Dotatoc) {
      window.open(patientUrl, '_blank');
      markAudioguiaSent(pId);
      showConfirmToast(
        `✅ Audioguía Galio-68 DOTATOC Abierta: ${cleanName}`,
        `Se ha abierto este programa en el navegador con los datos de ${cleanName} (${nhcVal}).`,
        patientObj
      );
      openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
      return;
    }

    // Para pacientes de FDG + Contraste Yodado: al citar o enviar la audioguía, se abre directamente el programa oficial FDG+contraste
    const isFDGContraste = rfLower.includes('contraste') || rfLower.includes('iodado') || rfLower.includes('yodado');
    if (isFDGContraste) {
      window.open(patientUrl, '_blank');
      markAudioguiaSent(pId);
      showConfirmToast(
        `✅ Audioguía FDG + Contraste Yodado Abierta y Enviada: ${cleanName}`,
        `Se ha abierto el programa oficial FDG+contraste en el navegador con los datos de ${cleanName} (${nhcVal}) y preparado el envío.`,
        patientObj
      );
      openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
      return;
    }

    const isAlreadySent = !!(state.audioguiaSent && state.audioguiaSent[pId]);

    const msgConfirmacion = isAlreadySent
      ? `ℹ️ Esta audioguía ya fue enviada con anterioridad a este paciente.\n\n¿Desea volver a confirmar y reenviarla?\n• Paciente: ${cleanName}\n• NHC: ${nhcVal}\n• Cita asignada: ${fecha} (${hora} h)\n• Estudio: ${radiofarmaco}\n\nPulse 'Aceptar' para confirmar el reenvío o 'Cancelar' para salir.`
      : `📲 CONFIRMACIÓN DE ENVÍO DE AUDIOGUÍA\n\n¿Desea enviar y confirmar el registro de la audioguía oficial interactiva de preparación para este paciente?\n\n• Paciente: ${cleanName}\n• NHC: ${nhcVal}\n• Cita asignada: ${fecha} (${hora} h)\n• Estudio: ${radiofarmaco}\n\nPulse 'Aceptar' para confirmar el envío de la audioguía o 'Cancelar' para anular.`;

    if (!window.confirm(msgConfirmacion)) {
      return;
    }

    // Usuario confirmó el envío:
    markAudioguiaSent(pId);
    showConfirmToast(
      `✅ Audioguía Confirmada y Enviada: ${cleanName}`,
      `Se ha registrado y confirmado el envío de la audioguía oficial interactiva (${nhcVal}).`,
      patientObj
    );

    // Abrir el panel de opciones de envío (WhatsApp, Email o Copiar Enlace)
    openAudioguiaModal(pId, cleanName, fecha, hora, radiofarmaco, nhcVal);
  }

  if (btnCloseAudioguiaModal) {
    btnCloseAudioguiaModal.addEventListener('click', closeAudioguiaModal);
  }
  if (audioguiaModal) {
    audioguiaModal.addEventListener('click', (e) => {
      if (e.target === audioguiaModal) closeAudioguiaModal();
    });
  }

  function closeAudioguiaModal() {
    if (audioguiaModal) audioguiaModal.classList.add('hidden');
  }

  function openAudioguiaModal(pId, pName, pFecha, pHora, pRf, pNhc) {
    if (!audioguiaModal) return;

    let cleanName = pName || 'Paciente';
    let nhcVal = pNhc || '';

    const patientObj = state.submissions.find(s => s.id === pId);
    if (patientObj) {
      const extracted = extractPatientNameAndNhc(patientObj);
      cleanName = extracted.cleanName;
      nhcVal = extracted.nhcVal;
    } else if (!nhcVal) {
      const extracted = extractPatientNameAndNhc({ nombre: pName, id: pId });
      cleanName = extracted.cleanName;
      nhcVal = extracted.nhcVal;
    }

    const radiofarmaco = resolvePatientRadiofarmaco(patientObj, pRf || (patientObj ? (patientObj.radiofarmaco || patientObj.tipoEstudio) : '18F-FDG') || '18F-FDG');
    const patientPhone = patientObj ? (patientObj.telefono || patientObj.phone || patientObj['Teléfono'] || '') : '';
    const patientUrl = buildPatientAudioguiaUrl(cleanName, nhcVal, pFecha, pHora, radiofarmaco, patientPhone, patientObj);

    const isAlreadySent = !!(state.audioguiaSent && state.audioguiaSent[pId]);
    const sentIndicator = document.getElementById('audioguia-sent-status-indicator');
    if (sentIndicator) {
      sentIndicator.style.display = isAlreadySent ? 'block' : 'none';
    }

    const isDiabetico = patientObj && isPatientDiabetic(patientObj);
    const rfLower = (radiofarmaco || '').toLowerCase();
    const isContrasteModal = rfLower.includes('contraste') || rfLower.includes('iodado') || rfLower.includes('yodado');
    const isVasculitisModal = rfLower.includes('vasculitis') || (patientObj && String(patientObj.motivo || patientObj.diagnostico || patientObj['Diagnóstico Clínico'] || patientObj.indicacion || '').toLowerCase().includes('vasculitis'));
    const isPsmaModal = rfLower.includes('psma');
    const isParatiroidesModal = rfLower.includes('paratiroid') || (rfLower.includes('colina') && rfLower.includes('paratiroid')) || (patientObj && String(patientObj.motivo || patientObj.diagnostico || patientObj['Diagnóstico Clínico'] || patientObj.indicacion || '').toLowerCase().includes('paratiroid'));
    const isColinaProstataModal = (rfLower.includes('colina') || (patientObj && String(patientObj.motivo || patientObj.diagnostico || '').toLowerCase().includes('colina'))) && !isParatiroidesModal;
    const isFDGOncoModal = rfLower.includes('fdg') && !isContrasteModal && !isVasculitisModal && !rfLower.includes('endocarditis') && !rfLower.includes('neuro');

    const elName = document.getElementById('audioguia-patient-name');
    if (elName) elName.textContent = cleanName;

    const elNhc = document.getElementById('audioguia-patient-nhc');
    if (elNhc) elNhc.textContent = nhcVal;

    const elMeta = document.getElementById('audioguia-patient-meta');
    if (elMeta) {
      const tagDiab = isFDGOncoModal ? (isDiabetico ? ' · 💉 Diabético (indexFDG.html)' : ' · 🟢 Non Diabético (indexFDG_NoDiabetico.html)') : '';
      elMeta.textContent = `Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h) | Estudio: ${radiofarmaco}${tagDiab}`;
    }

    const elBaseLabel = document.getElementById('audioguia-base-url-label');
    if (elBaseLabel) elBaseLabel.textContent = getAudioguiaBaseUrl(radiofarmaco, patientObj);

    const elLink = document.getElementById('audioguia-link-anchor');
    if (elLink) {
      elLink.href = patientUrl;
      elLink.textContent = patientUrl;
    }

    let msg = `Estimado/a ${cleanName} (Nº Historia Clínica: ${nhcVal}):\nLe enviamos el enlace oficial a la Audioguía interactiva y Asistente Virtual de preparación para su prueba PET (${radiofarmaco}):\n👉 ${patientUrl}\n\nFecha de su cita: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\nPor favor, acceda a este enlace para consultar las instrucciones obligatorias de ayuno, medicación habitual y resolver sus dudas con nuestro enfermero virtual.\nServicio de Medicina Nuclear.`;

    if (isFDGOncoModal) {
      if (isDiabetico) {
        msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos el enlace oficial a la Audioguía interactiva de preparación para su prueba PET FDG Oncológico / Inflamatorio (Pauta Paciente Diabético con control y envío de glucemia):\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Servicio de Medicina Nuclear · PET-CT)\n\n⚠️ INSTRUCCIONES ESENCIALES PARA DIABETES:\n• Ayuno estricto de 6 horas de comida sólida (puede beber abundante agua sola).\n• Insulina: No administrarse insulina rápida en las 4 a 6 horas previas a la cita.\n• Control capilar: Mídase la glucemia en ayunas 1 o 2 horas antes de salir de casa y comuníquenosla a través del formulario de la audioguía.\n• Reposo muscular: Sin ejercicio ni esfuerzos 24-48h antes.\n• Radioprotección: Evite contacto estrecho con niños y embarazadas durante las 6 horas posteriores y beba abundante agua.\n\nConsulte el vídeo interactivo y resuelva cualquier duda con el Asistente Virtual en el enlace superior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
      } else {
        msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos el enlace oficial a la Audioguía interactiva de preparación para su prueba PET FDG Oncológico / Inflamatorio (Pauta Estándar Pacientes Sin Diabetes):\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Servicio de Medicina Nuclear · PET-CT)\n\n⚠️ INSTRUCCIONES ESENCIALES:\n• Ayuno estricto de mínimo 6 horas de sólidos (beber abundante agua sola).\n• Dieta pobre en carbohidratos (sin pan, pasta, arroz, patatas ni azúcares) las 24 horas previas.\n• Reposo muscular: Sin ejercicio ni gimnasio 24-48h antes.\n• Al no tener diabetes, no precisa realizar ni enviar controles de glucemia desde su domicilio; el personal de enfermería verificará su nivel a la llegada al hospital.\n• Radioprotección: Evite contacto estrecho con niños y embarazadas las 6 horas posteriores y beba abundante agua.\n\nConsulte el vídeo interactivo y resuelva sus dudas con el Asistente Virtual en el enlace superior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
      }
    } else if (isParatiroidesModal) {
      msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos el programa interactivo oficial de preparación para su prueba PET 18F-COLINA PARATIROIDES:\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Servicio de Medicina Nuclear · Recepción y Sala de Espera PET-CT)\n\n⚠️ INSTRUCCIONES ESENCIALES PARA EL DÍA DE LA PRUEBA:\n• Acuda con 15 minutos de antelación a la sala de espera de Medicina Nuclear (Planta -1, siguiendo la línea azul).\n• Sin ayuno previo: No se necesita ayuno para esta prueba (puede comer con normalidad antes de acudir).\n• Medicación habitual: No hay que suspender ninguna medicación (continúe tomando todos sus medicamentos habituales).\n• Sin analítica previa: No es necesario realizarse ni aportar ninguna analítica de sangre para la prueba.\n• En la máquina: Se le inmovilizará suavemente la cabeza con soporte y sujeción acolchada para máxima nitidez diagnóstica (evite hablar o tragar saliva de forma continua durante el escáner).\n• Radioprotección: Evite el contacto estrecho con niños pequeños y mujeres embarazadas durante las siguientes 6-8 horas tras la prueba y beba abundante agua.\n\nConsulte el programa interactivo y resuelva cualquier duda con el Asistente Virtual de Enfermería en el enlace superior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
    } else if (isColinaProstataModal) {
      msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos el programa interactivo oficial de preparación para su prueba PET 18F-COLINA PRÓSTATA:\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Servicio de Medicina Nuclear · Recepción y Sala de Espera PET-TC)\n\n⚠️ INSTRUCCIONES ESENCIALES PARA EL DÍA DE LA PRUEBA:\n• Acuda con 15 minutos de antelación a la sala de espera de Medicina Nuclear (Planta -1, siguiendo la línea azul).\n• Dieta de la colina y ayuno: Guarde ayuno estricto de alimentos sólidos entre 4 y 6 horas antes de su cita (puede beber abundante agua pura sola). Evite consumir huevos, yemas, vísceras, legumbres con soja y suplementos de lecitina de soja en las 48 horas previas.\n• Ropa cómoda sin metales: Acuda con ropa cómoda y holgada (chándal o pantalón elástico) sin cremalleras metálicas, botones grandes de metal ni cinturón para evitar sombras o artefactos en el escáner tomográfico pélvico.\n• Medicación: Tome sus medicamentos habituales con agua sola e infórmenos si toma tratamientos hormonales para la próstata.\n• Tiempos: Inyección intravenosa, escáner tomográfico en máquina (~15-20 min) y duración total en el hospital de 1h30 a 2 horas.\n• Protección radiológica: Evite el contacto estrecho con niños pequeños y mujeres embarazadas durante las 6 a 8 horas posteriores y beba abundante agua.\n\nConsulte el programa interactivo y resuelva cualquier duda con el Asistente Virtual de Enfermería en el enlace superior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
    } else if (isPsmaModal) {
      msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos el programa interactivo oficial de preparación para su prueba PET PSMA (PRÓSTATA):\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Servicio de Medicina Nuclear · Recepción y Sala de Espera PET-CT)\n\n⚠️ INSTRUCCIONES ESENCIALES PARA EL DÍA DE LA PRUEBA:\n• Acuda con 15 minutos de antelación a la sala de espera de Medicina Nuclear (Planta -1, siguiendo la línea azul).\n• Ayuno suave de 2 a 4 horas antes de su cita (puede desayunar o comer algo ligero respetando este intervalo; no requiere ayuno estricto de azúcares ni carbohidratos).\n• Beber aproximadamente 1 litro de agua pura en la hora previa para una óptima hidratación y protección renal.\n• Tiempo de espera tras la inyección: permanecerá 60 minutos en reposo antes de pasar a la máquina tomográfica.\n• Medicación: Tome sus medicamentos habituales con agua sola e infórmenos si toma tratamientos hormonales prostáticos.\n• Radioprotección: Evite el contacto estrecho con niños pequeños y mujeres embarazadas durante las siguientes 6-8 horas tras la prueba y beba abundante agua para eliminar el radiofármaco restante.\n\nConsulte el programa interactivo y resuelva cualquier duda con el Asistente Virtual de Enfermería en el enlace superior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
    } else if (isVasculitisModal) {
      msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos el programa interactivo oficial de preparación para su prueba PET FDG VASCULITIS:\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Medicina Nuclear - PET)\n\n⚠️ INSTRUCCIONES ESENCIALES PARA EL DÍA DE LA PRUEBA:\n• Ayuno estricto de 6 horas previas a la cita (únicamente puede beber agua sola).\n• Beber abundante agua para una correcta hidratación.\n• Tiempo de espera tras la inyección: permanecerá 90 minutos en reposo antes de pasar a la máquina PET.\n• Radioprotección: tras la prueba, no se puede estar en contacto estrecho con niños pequeños ni mujeres embarazadas durante las siguientes 6-8 horas, y debe beber abundante agua para eliminar el radiofármaco.\n\nConsulte el programa interactivo y resuelva cualquier duda con el Asistente Virtual de Enfermería en el enlace superior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
    } else if (isContrasteModal) {
      msg = `Estimado/a ${cleanName} (NHC: ${nhcVal}):\nLe enviamos la Audioguía Oficial de Preparación para su prueba PET FDG con Contraste Yodado en máquina:\n👉 ${patientUrl}\n\n📅 Cita asignada: ${pFecha || 'Pendiente'} (${pHora || '--:--'} h)\n📍 Lugar: Hospital Meixoeiro, Planta -1 (Medicina Nuclear - PET)\n\n⚠️ INSTRUCCIONES ESENCIALES:\n• Ayuno estricto de 6 horas y beber 1L de agua sola.\n• Aportar analítica reciente de función renal (Creatinina y Filtrado Glomerular).\n• ALERGIAS: El contraste yodado se inyecta en la máquina durante el TAC y puede provocar reacciones alérgicas. Si tiene alergia previa al yodo, avísenos de inmediato para recibir la premedicación antialérgica (12h y 2h antes).\n\nConsulte el vídeo interactivo y resuelva dudas con el Asistente Virtual de Enfermería en el enlace anterior.\nServicio de Medicina Nuclear · Galaria / SERGAS.`;
    }

    const preview = document.getElementById('audioguia-message-preview');
    if (preview) preview.value = msg;

    // Botón WhatsApp con confirmación previa y enlace oficial
    const btnWa = document.getElementById('btn-send-whatsapp');
    if (btnWa) {
      btnWa.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
      btnWa.onclick = (e) => {
        if (!window.confirm(`¿Confirmar el envío oficial de la audioguía por WhatsApp para ${cleanName} (${nhcVal})?`)) {
          e.preventDefault();
          return false;
        }
        markAudioguiaSent(pId);
        showConfirmToast(
          `✅ Audioguía Enviada por WhatsApp: ${cleanName}`,
          `Se ha registrado el envío de la audioguía oficial interactiva.`,
          patientObj
        );
        return true;
      };
    }

    // Botón Email con confirmación previa y enlace oficial
    const btnMail = document.getElementById('btn-send-email');
    if (btnMail) {
      btnMail.href = `mailto:?subject=${encodeURIComponent("Audioguía PET - " + cleanName + " (" + nhcVal + ")")}&body=${encodeURIComponent(msg)}`;
      btnMail.onclick = (e) => {
        if (!window.confirm(`¿Confirmar el envío oficial de la audioguía por Email para ${cleanName} (${nhcVal})?`)) {
          e.preventDefault();
          return false;
        }
        markAudioguiaSent(pId);
        showConfirmToast(
          `✅ Audioguía Enviada por Email: ${cleanName}`,
          `Se ha registrado el envío de la audioguía oficial interactiva.`,
          patientObj
        );
        return true;
      };
    }

    // Botón copiar enlace con confirmación previa
    const btnCopy = document.getElementById('btn-copy-audioguia-link');
    if (btnCopy) {
      btnCopy.onclick = () => {
        if (!window.confirm(`¿Confirmar el envío y copiar el enlace personalizado de la audioguía para ${cleanName}?`)) {
          return;
        }
        navigator.clipboard.writeText(patientUrl).then(() => {
          btnCopy.textContent = "✅ ¡Enlace con Paciente Copiado!";
          setTimeout(() => { btnCopy.textContent = "📋 Copiar Enlace con Datos del Paciente"; }, 2500);
          markAudioguiaSent(pId);
          showConfirmToast(
            `✅ Audioguía Enviada (Enlace Copiado): ${cleanName}`,
            `Se ha registrado el envío y copiado el enlace oficial interactivo.`,
            patientObj
          );
        });
      };
    }

    // Botón directo para abrir la audioguía
    const btnOpenDirect = document.getElementById('btn-open-direct-audioguia');
    if (btnOpenDirect) {
      btnOpenDirect.href = patientUrl;
    }

    // Botón para configurar la URL base
    const btnEditBase = document.getElementById('btn-edit-audioguia-base');
    if (btnEditBase) {
      btnEditBase.onclick = () => {
        const cur = getAudioguiaBaseUrl();
        const nueva = prompt("Introduce la URL base o ruta de la audioguía (ej: http://localhost:8000/index.html o ../../pet_prep_page/index.html):", cur);
        if (nueva !== null) {
          setAudioguiaBaseUrl(nueva);
          openAudioguiaModal(pId, pName, pFecha, pHora, pRf, pNhc);
        }
      };
    }

    audioguiaModal.classList.remove('hidden');
  }

  function markAudioguiaSent(pId) {
    if (!state.audioguiaSent) state.audioguiaSent = {};
    if (pId) {
      state.audioguiaSent[pId] = true;
      try {
        localStorage.setItem('pet_ct_audioguia_sent', JSON.stringify(state.audioguiaSent));
      } catch (e) { }
      syncAudioguiaSentToMasterDb(pId);
      renderConfirmationsTable();
      renderWeeklyGrid();
      renderSubmissionsTable();
      if (state.activeModalPatient && state.activeModalPatient.id === pId) {
        openSlotModal(state.activeModalPatient);
      }
    }
  }

  function getSampleMotivo(radiofarmaco) {
    const rf = String(radiofarmaco || '').toLowerCase();
    if (rf.includes('psma')) return "Cáncer de Próstata con elevación de PSA (Recidiva bioquímica) / Gleason 8";
    if (rf.includes('colina')) return "Estadiaje / Reestadiaje de neoplasia prostática - Sospecha metástasis ósea";
    if (rf.includes('somatostatina') || rf.includes('dotatate') || rf.includes('68ga')) return "Tumor Neuroendocrino (TNE) gastroenteropancreático Grado 2";
    if (rf.includes('neuro') || rf.includes('amiloide')) return "Deterioro cognitivo / Evaluación de depósito amiloide cerebral";
    return "Sospecha de recidiva tumoral / Valoración de extensión pulmonar y ganglionar";
  }

  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function attachPdfButtonListeners() {
    document.querySelectorAll('.btn-pdf-patient, .btn-pdf-card, [data-open-volante]').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const pId = btn.getAttribute('data-id') || btn.getAttribute('data-open-volante');
        openPatientVolantePrintWindow(pId, true);
      };
    });
  }

  // Delegación global en fase de captura para que NINGÚN contenedor padre bloquee el clic
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-pdf-patient, .btn-pdf-card, [data-open-volante]');
    if (btn) {
      e.preventDefault();
      e.stopPropagation();
      const pId = btn.getAttribute('data-id') || btn.getAttribute('data-open-volante');
      openPatientVolantePrintWindow(pId, true);
    }
  }, true);

  function formatSpanishDate(dateStr) {
    if (!dateStr || dateStr === '--' || dateStr === 'Pendiente' || String(dateStr).includes('SIN AGENDAR')) return '--';
    if (String(dateStr).includes('/')) return dateStr;
    const parts = String(dateStr).split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  }

  function getPatientById(patientId) {
    if (!patientId) {
      return state.activeModalPatient || (state.submissions && state.submissions[0]) || null;
    }
    if (typeof patientId === 'object' && patientId !== null) {
      return patientId;
    }

    const cleanId = String(patientId).trim();

    // 1. Exact match in state.submissions
    let p = state.submissions.find(s => s && s.id === cleanId);
    if (p) return p;

    // 2. Match by NHC
    p = state.submissions.find(s => s && s.nhc === cleanId);
    if (p) return p;

    // 3. Raw submissions map
    if (state.rawSubmissionsMap) {
      if (state.rawSubmissionsMap[cleanId]) return state.rawSubmissionsMap[cleanId];
      const stripped = cleanId.replace('sub_', '').replace('REQ-', '');
      if (state.rawSubmissionsMap[stripped]) return state.rawSubmissionsMap[stripped];
      if (state.rawSubmissionsMap['sub_' + stripped]) return state.rawSubmissionsMap['sub_' + stripped];
    }

    // 4. Partial ID match
    p = state.submissions.find(s => s && s.id && (s.id.includes(cleanId) || cleanId.includes(s.id)));
    if (p) return p;

    // 5. Name match
    p = state.submissions.find(s => s && ((s.nombre && s.nombre.toLowerCase().includes(cleanId.toLowerCase())) || (s.cleanNombre && s.cleanNombre.toLowerCase().includes(cleanId.toLowerCase()))));
    if (p) return p;

    // 6. Active modal patient
    if (state.activeModalPatient) return state.activeModalPatient;

    // 7. Fallback to first available submission
    if (state.submissions && state.submissions.length > 0) return state.submissions[0];

    return null;
  }

  function populateOfficialVolante(p) {
    if (!p) return;
    try {
      const raw = p.raw || (state.rawSubmissionsMap && (state.rawSubmissionsMap[p.id] || state.rawSubmissionsMap[p.nhc])) || p;

      const subId = p.id || raw["Submission ID"] || "sub_0000";
      const idClean = String(subId).replace("sub_", "").replace("REQ-", "");

      const nombre = raw["Nombre del Paciente"] || raw["Nombre y Apellidos"] || p.cleanNombre || p.nombre || "--";
      const nhc = raw["NHC / Historia Clínica"] || p.nhc || idClean || "--";
      const edad = raw["Edad"] || p.edad || "65";
      const sexo = raw["Sexo"] || p.sexo || "Varón";
      const peso = raw["Peso (kg)"] || p.peso || "74";
      const talla = raw["Talla (cm)"] || p.talla || "172";
      const movilidad = raw["Movilidad / Traslado"] || "Autónomo";
      const sedacion = raw["¿Precisa sedación?"] || "No";

      let diabetes = raw["¿Tiene Diabetes Mellitus?"];
      if (!diabetes) {
        let hasDiabetesAlert = false;
        if (Array.isArray(p.alertas)) {
          hasDiabetesAlert = p.alertas.some(a => a && (a.type === 'diabetes' || (typeof a.text === 'string' && a.text.includes('DIABETES'))));
        } else if (typeof p.alertas === 'string') {
          hasDiabetesAlert = p.alertas.includes('DIABETES');
        }
        diabetes = hasDiabetesAlert ? 'Sí (Diabético)' : 'No';
      }

      let glucemia = raw["Glucemia (mg/dL)"];
      if (!glucemia) {
        const isDiab = String(diabetes).toLowerCase().includes('sí') || String(diabetes).toLowerCase().includes('si');
        glucemia = isDiab ? '142' : '98';
      }

      const ingresado = raw["¿El paciente está ingresado?"] || "No (Ambulatorio)";
      const medico = raw["Médico Solicitante"] || "Dr. Fernando García";
      const servicio = raw["Servicio Solicitante"] || "Oncología Médica";
      const proxConsulta = raw["Fecha Próxima Consulta"] || "23/10/2026 (Comité de Tumores)";
      const fechaSol = raw["Fecha Solicitud"] || p.fechaSolicitud || "15/10/2026";

      const estudio = raw["Tipo de Estudio PET Solicitado"] || p.tipoEstudio || p.radiofarmaco || "18F-FDG (Oncológico / Inflamatorio General)";
      const prioridad = raw["Carácter de la Petición"] || raw["Prioridad Calculada"] || p.prioridad || "🟢 P3 - Ordinario";
      const diag = raw["Diagnóstico Clínico"] || raw["Motivo de Solicitud"] || p.motivo || "Estudio PET/CT Oncológico";
      const resumen = raw["Resumen Clínico"] || "Estudio PET/CT solicitado para estadificación, valoración de extensión y respuesta terapéutica según protocolo asistencial SERGAS.";

      const alergias = raw["Alergias Conocidas"] || "Ninguna";
      const contraste = raw["Contraindicación Contraste"] || "No";
      const metal = raw["Portador Objetos Metálicos"] || "No";

      let alertas = "Ninguna";
      if (Array.isArray(p.alertas) && p.alertas.length > 0) {
        alertas = p.alertas.map(a => typeof a === 'string' ? a : (a && a.text ? a.text : '')).filter(Boolean).join(' | ');
      } else if (typeof p.alertas === 'string' && p.alertas.trim()) {
        alertas = p.alertas;
      } else if (raw["Alertas Técnicas"]) {
        alertas = raw["Alertas Técnicas"];
      }

      const fechaCita = p.fechaCita || raw["Fecha Cita Asignada"] || "Pendiente de Triaje";
      const horaCita = p.horaCita || raw["Hora Cita Asignada"] || "08:30 h";

      // Actualizar campos del DOM de la Hoja Oficial
      const elBarcode = document.getElementById("sheetBarcodeText");
      if (elBarcode) elBarcode.textContent = `||| ${idClean} |||||`;

      const elSubId = document.getElementById("sheetSubmissionId");
      if (elSubId) elSubId.textContent = `REQ-${subId}`;

      const elReqDate = document.getElementById("sheetRequestDate");
      if (elReqDate) elReqDate.textContent = `Fecha Solicitud: ${formatSpanishDate(fechaSol)}`;

      const elNhc = document.getElementById("sheetNhc");
      if (elNhc) elNhc.textContent = nhc;

      const elName = document.getElementById("sheetName");
      if (elName) elName.textContent = nombre;

      const elSexAge = document.getElementById("sheetSexAge");
      if (elSexAge) elSexAge.textContent = `${sexo} / ${edad} años`;

      const elWeightHeight = document.getElementById("sheetWeightHeight");
      if (elWeightHeight) elWeightHeight.textContent = `${peso} kg / ${talla} cm`;

      const elMobility = document.getElementById("sheetMobility");
      if (elMobility) elMobility.textContent = movilidad;

      const elSedation = document.getElementById("sheetSedation");
      if (elSedation) elSedation.textContent = sedacion;

      const elDiabetes = document.getElementById("sheetDiabetes");
      if (elDiabetes) elDiabetes.textContent = diabetes;

      const elGlucose = document.getElementById("sheetGlucose");
      if (elGlucose) elGlucose.textContent = `${glucemia} mg/dL`;

      const elInpatient = document.getElementById("sheetInpatient");
      if (elInpatient) elInpatient.textContent = ingresado;

      const elDoctor = document.getElementById("sheetDoctor");
      if (elDoctor) elDoctor.textContent = medico;

      const elService = document.getElementById("sheetService");
      if (elService) elService.textContent = servicio;

      const elNextVisit = document.getElementById("sheetNextVisit");
      if (elNextVisit) elNextVisit.textContent = proxConsulta;

      const elStudyType = document.getElementById("sheetStudyType");
      if (elStudyType) elStudyType.textContent = estudio;

      const elPriority = document.getElementById("sheetPriority");
      if (elPriority) elPriority.textContent = prioridad;

      const elDiagnosis = document.getElementById("sheetDiagnosis");
      if (elDiagnosis) elDiagnosis.textContent = diag;

      const elSummary = document.getElementById("sheetSummary");
      if (elSummary) elSummary.textContent = `"${resumen}"`;

      const elAllergies = document.getElementById("sheetAllergies");
      if (elAllergies) elAllergies.textContent = alergias;

      const elContrast = document.getElementById("sheetContrast");
      if (elContrast) elContrast.textContent = contraste;

      const elMetal = document.getElementById("sheetMetal");
      if (elMetal) elMetal.textContent = metal;

      const elAlerts = document.getElementById("sheetAlerts");
      if (elAlerts) elAlerts.textContent = alertas;

      const elAppDate = document.getElementById("sheetAppDate");
      if (elAppDate) elAppDate.textContent = formatSpanishDate(fechaCita);

      const elAppTime = document.getElementById("sheetAppTime");
      if (elAppTime) elAppTime.textContent = horaCita;

      const elDocSign = document.getElementById("sheetDocSignature");
      if (elDocSign) elDocSign.textContent = `${medico} (${servicio})`;
    } catch (err) {
      console.error("Error en populateOfficialVolante:", err);
    }
  }

  /**
   * Genera el documento HTML completo del Volante Oficial de Petición Médica PET/CT (SERGAS / Galaria)
   */
  function generatePatientVolanteHtml(p, autoPrint = true) {
    if (!p) return '';
    const raw = p.raw || (state.rawSubmissionsMap && (state.rawSubmissionsMap[p.id] || state.rawSubmissionsMap[p.nhc])) || p;

    const subId = p.id || raw["Submission ID"] || "sub_0000";
    const idClean = String(subId).replace("sub_", "").replace("REQ-", "");

    const nombre = raw["Nombre del Paciente"] || raw["Nombre y Apellidos"] || p.cleanNombre || p.nombre || "--";
    const nhc = raw["NHC / Historia Clínica"] || p.nhc || idClean || "--";
    const edad = raw["Edad"] || p.edad || "65";
    const sexo = raw["Sexo"] || p.sexo || "Varón";
    const peso = raw["Peso (kg)"] || p.peso || "74";
    const talla = raw["Talla (cm)"] || p.talla || "172";
    const movilidad = raw["Movilidad / Traslado"] || "Autónomo";
    const sedacion = raw["¿Precisa sedación?"] || "No";

    let diabetes = raw["¿Tiene Diabetes Mellitus?"];
    if (!diabetes) {
      let hasDiabetesAlert = false;
      if (Array.isArray(p.alertas)) {
        hasDiabetesAlert = p.alertas.some(a => a && (a.type === 'diabetes' || (typeof a.text === 'string' && a.text.includes('DIABETES'))));
      } else if (typeof p.alertas === 'string') {
        hasDiabetesAlert = p.alertas.includes('DIABETES');
      }
      diabetes = hasDiabetesAlert ? 'Sí (Diabético)' : 'No';
    }

    let glucemia = raw["Glucemia (mg/dL)"];
    if (!glucemia) {
      const isDiab = String(diabetes).toLowerCase().includes('sí') || String(diabetes).toLowerCase().includes('si');
      glucemia = isDiab ? '142' : '98';
    }

    const ingresado = raw["¿El paciente está ingresado?"] || "No (Ambulatorio)";
    const medico = raw["Médico Solicitante"] || "Dr. Fernando García";
    const servicio = raw["Servicio Solicitante"] || "Oncología Médica";
    const proxConsulta = raw["Fecha Próxima Consulta"] || "23/10/2026 (Comité de Tumores)";
    const fechaSol = raw["Fecha Solicitud"] || p.fechaSolicitud || "15/10/2026";

    const estudio = raw["Tipo de Estudio PET Solicitado"] || p.tipoEstudio || p.radiofarmaco || "18F-FDG (Oncológico / Inflamatorio General)";
    const prioridad = raw["Carácter de la Petición"] || raw["Prioridad Calculada"] || p.prioridad || "🟢 P3 - Ordinario";
    const diag = raw["Diagnóstico Clínico"] || raw["Motivo de Solicitud"] || p.motivo || "Estudio PET/CT Oncológico";
    const resumen = raw["Resumen Clínico"] || "Estudio PET/CT solicitado para estadificación, valoración de extensión y respuesta terapéutica según protocolo asistencial SERGAS.";

    const alergias = raw["Alergias Conocidas"] || "Ninguna";
    const contraste = raw["Contraindicación Contraste"] || "No";
    const metal = raw["Portador Objetos Metálicos"] || "No";

    const petPrevio = raw["¿Tiene estudio PET previo?"] || raw["PET Previo Realizado"] || (raw["Detalle PET Previo"] && !raw["Detalle PET Previo"].startsWith('No') ? 'Sí' : 'No');
    const petPrevioDetalle = raw["Detalle PET Previo"] || (raw["Fecha PET Previo"] ? `${raw["Fecha PET Previo"]} (${raw["Centro PET Previo"] || 'SERGAS'})` : '');
    const isPetPrevioSi = String(petPrevio).toLowerCase().includes('s') || String(petPrevio).toLowerCase().includes('si');

    let alertas = "Ninguna";
    if (Array.isArray(p.alertas) && p.alertas.length > 0) {
      alertas = p.alertas.map(a => typeof a === 'string' ? a : (a && a.text ? a.text : '')).filter(Boolean).join(' | ');
    } else if (typeof p.alertas === 'string' && p.alertas.trim()) {
      alertas = p.alertas;
    } else if (raw["Alertas Técnicas"]) {
      alertas = raw["Alertas Técnicas"];
    }

    const fechaCita = p.fechaCita || raw["Fecha Cita Asignada"] || "Pendiente de Triaje";
    const horaCita = p.horaCita || raw["Hora Cita Asignada"] || "08:30 h";

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Volante Oficial PET/CT - ${escapeHTML(nombre)} (${escapeHTML(nhc)})</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 14mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 18px;
    }
    .action-bar {
      max-width: 900px;
      margin: 0 auto 15px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #004868;
      color: white;
      padding: 10px 18px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 72, 104, 0.25);
    }
    .action-bar button {
      padding: 8px 16px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      border: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-print {
      background: #007eb4;
      color: white;
      transition: background 0.15s ease;
    }
    .btn-print:hover { background: #0284c7; }
    .btn-close {
      background: #475569;
      color: white;
    }
    .btn-close:hover { background: #334155; }
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
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .sheet-hospital-info {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .sheet-hospital-info img {
      height: 52px;
      object-fit: contain;
    }
    .sheet-hospital-info h2 {
      margin: 0;
      font-size: 15px;
      color: #004868;
      font-weight: 800;
      letter-spacing: 0.5px;
    }
    .sheet-hospital-info p {
      margin: 2px 0 0 0;
      font-size: 11px;
      color: #475569;
      font-weight: 600;
    }
    .sheet-doc-title-badge {
      display: inline-block;
      margin-top: 5px;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 800;
      font-size: 11px;
      padding: 3px 10px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }
    .sheet-barcode-box {
      text-align: right;
      font-family: monospace;
    }
    .barcode-sim {
      font-size: 18px;
      letter-spacing: 3px;
      color: #004868;
      font-weight: bold;
    }
    .sheet-sub-code {
      font-size: 11px;
      color: #64748b;
      margin-top: 2px;
      font-weight: bold;
    }
    .sheet-section {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 12px 14px;
      margin-bottom: 12px;
    }
    .sheet-section-title {
      font-size: 12px;
      font-weight: 800;
      color: #004868;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin-bottom: 10px;
    }
    .sheet-grid-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px 14px;
    }
    .sheet-grid-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px 14px;
    }
    .sheet-field {
      font-size: 12px;
    }
    .sheet-field label {
      display: block;
      font-size: 10px;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .sheet-field span {
      font-weight: 700;
      color: #0f172a;
    }
    .sheet-signature-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 18px;
      padding-top: 14px;
      border-top: 1px dashed #cbd5e1;
    }
    .signature-box {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 12px;
      text-align: center;
      min-height: 85px;
      background: #fafafa;
    }
    .signature-box p {
      margin: 0;
      font-size: 10px;
      color: #64748b;
      font-weight: bold;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .action-bar {
        display: none !important;
      }
      .official-sheet {
        border: 1.5px solid #004868;
        box-shadow: none;
        padding: 15px;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🏥</span>
      <div>
        <strong style="font-size: 13px;">Volante Oficial de Petición Médica PET / CT</strong>
        <span style="font-size: 11px; opacity: 0.85; margin-left: 6px;">SERGAS · Galaria</span>
      </div>
    </div>
    <div style="display: flex; gap: 10px;">
      <button class="btn-print" onclick="window.print()">🖨️ Imprimir Volante / Guardar PDF</button>
      <button class="btn-close" onclick="window.close()">❌ Cerrar</button>
    </div>
  </div>

  <div class="official-sheet">
    <div class="sheet-header-box">
      <div class="sheet-hospital-info">
        <img src="galaria_logo.jpg" alt="Galaria Logo" onerror="this.style.display='none'">
        <div>
          <h2>GALARIA · EMPRESA PÚBLICA DE SERVIZOS SANITARIOS</h2>
          <p>Unidade de Medicina Nuclear & Diagnóstico Molecular PET/CT · SERGAS</p>
          <div class="sheet-doc-title-badge">VOLANTE OFICIAL DE SOLICITUDE CLÍNICA PET / CT</div>
        </div>
      </div>
      <div class="sheet-barcode-box">
        <div class="barcode-sim">||| ${idClean} |||||</div>
        <div class="sheet-sub-code">REQ-${escapeHTML(subId)}</div>
        <div style="font-size: 10px; color: #64748b; margin-top: 3px;">Fecha: ${formatSpanishDate(fechaSol)}</div>
      </div>
    </div>

    <!-- Sección A: Datos de Filiación del Paciente -->
    <div class="sheet-section">
      <div class="sheet-section-title">A. Datos de Filiación del Paciente</div>
      <div class="sheet-grid-3">
        <div class="sheet-field"><label>NHC / Historia Clínica:</label> <span>${escapeHTML(nhc)}</span></div>
        <div class="sheet-field"><label>Nombre y Apellidos:</label> <span>${escapeHTML(nombre)}</span></div>
        <div class="sheet-field"><label>Sexo / Edad:</label> <span>${escapeHTML(sexo)} / ${escapeHTML(edad)} años</span></div>
        <div class="sheet-field"><label>Peso / Talla:</label> <span>${escapeHTML(peso)} kg / ${escapeHTML(talla)} cm</span></div>
        <div class="sheet-field"><label>Ubicación / Movilidad:</label> <span>${escapeHTML(movilidad)}</span></div>
        <div class="sheet-field"><label>¿Precisa Sedación?:</label> <span>${escapeHTML(sedacion)}</span></div>
        <div class="sheet-field"><label>Diabetes Mellitus:</label> <span style="color: ${String(diabetes).toLowerCase().includes('s') ? '#d97706' : 'inherit'};">${escapeHTML(diabetes)}</span></div>
        <div class="sheet-field"><label>Glucemia Basal Registrada:</label> <span>${escapeHTML(glucemia)} mg/dL</span></div>
        <div class="sheet-field"><label>Estado Asistencial:</label> <span>${escapeHTML(ingresado)}</span></div>
      </div>
    </div>

    <!-- Sección B: Facultativo y Servicio Solicitante -->
    <div class="sheet-section">
      <div class="sheet-section-title">B. Facultativo & Servicio Solicitante</div>
      <div class="sheet-grid-3">
        <div class="sheet-field"><label>Médico Prescriptor:</label> <span>${escapeHTML(medico)}</span></div>
        <div class="sheet-field"><label>Servicio Clínico:</label> <span>${escapeHTML(servicio)}</span></div>
        <div class="sheet-field"><label>Fecha Próxima Consulta / Comité:</label> <span>${escapeHTML(proxConsulta)}</span></div>
      </div>
    </div>

    <!-- Sección C: Estudio Solicitado & Indicación Clínica -->
    <div class="sheet-section">
      <div class="sheet-section-title">C. Estudio Solicitado & Indicación Clínica</div>
      <div class="sheet-grid-3">
        <div class="sheet-field"><label>Tipo de Estudio / Radiofármaco:</label> <span style="color: #004868; font-size: 13px;">${escapeHTML(estudio)}</span></div>
        <div class="sheet-field"><label>Prioridad Asignada:</label> <span>${escapeHTML(prioridad)}</span></div>
        <div class="sheet-field"><label>¿Estudio PET Previo Realizado?:</label> <span style="color: ${isPetPrevioSi ? '#0284c7' : '#059669'}; font-weight:700;">${isPetPrevioSi ? '🔵 Sí (' + escapeHTML(petPrevioDetalle || 'Consta estudio previo') + ')' : '🟢 No (Estudio Basal)'}</span></div>
      </div>
      <div class="sheet-field" style="margin-top: 8px;">
        <label>Diagnóstico Clínico & Motivo de Solicitud:</label>
        <span style="color: #0f172a; font-size: 12.5px;">${escapeHTML(diag)}</span>
      </div>
      <div class="sheet-field" style="margin-top: 8px;">
        <label>Resumen Clínico / Antecedentes Relevantes:</label>
        <span style="font-weight: 500; font-style: italic; color: #334155; line-height: 1.4;">"${escapeHTML(resumen)}"</span>
      </div>
    </div>

    <!-- Sección D: Factores de Seguridad & Alertas Técnicas -->
    <div class="sheet-section">
      <div class="sheet-section-title">D. Factores de Seguridad & Alertas Técnicas</div>
      <div class="sheet-grid-3">
        <div class="sheet-field"><label>Alergias Conocidas:</label> <span>${escapeHTML(alergias)}</span></div>
        <div class="sheet-field"><label>Contraindicación Contraste:</label> <span>${escapeHTML(contraste)}</span></div>
        <div class="sheet-field"><label>Objetos Metálicos / Prótesis:</label> <span>${escapeHTML(metal)}</span></div>
      </div>
      <div class="sheet-field" style="margin-top: 8px;">
        <label>Alertas Técnicas y Tiempos de Tratamiento (QT / RT):</label>
        <span style="font-weight: 700; color: ${alertas !== 'Ninguna' ? '#b91c1c' : '#64748b'};">${escapeHTML(alertas)}</span>
      </div>
    </div>

    <!-- Sección E: Programación de Turno PET / CT -->
    <div class="sheet-section" style="background: #f0fdf4; border-color: #86efac;">
      <div class="sheet-section-title" style="color: #15803d; border-color: #bbf7d0;">E. Programación de Turno PET / CT (Agenda Confirmada)</div>
      <div class="sheet-grid-3">
        <div class="sheet-field"><label>Fecha Asignada de Cita:</label> <span style="color: #15803d; font-size: 13px;">${formatSpanishDate(fechaCita)}</span></div>
        <div class="sheet-field"><label>Hora de Turno:</label> <span style="color: #15803d; font-size: 13px;">${escapeHTML(horaCita)}</span></div>
        <div class="sheet-field"><label>Ubicación / Equipo:</label> <span>Gammacámara PET / CT 1 (Galaria)</span></div>
      </div>
    </div>

    <!-- Firmas Oficiales y Validación -->
    <div class="sheet-signature-row">
      <div class="signature-box">
        <p>Firma y Sello del Médico Facultativo Prescriptor</p>
        <p style="font-weight: 800; color: #004868; margin-top: 10px;">${escapeHTML(medico)} (${escapeHTML(servicio)})</p>
        <p style="font-size: 9px; color: #64748b; margin-top: 4px;">Validación Electrónica Oficial SERGAS / IANUS</p>
      </div>
      <div class="signature-box">
        <p>Recepción & Triaje Unidad Medicina Nuclear</p>
        <p style="font-weight: 800; color: #15803d; margin-top: 10px;">Cita Validada y Agendada</p>
        <p style="font-size: 9px; color: #64748b; margin-top: 4px;">Sello de Admisión y Registro de Enfermería Galaria</p>
      </div>
    </div>
  </div>

  ${autoPrint ? `
  <` + `script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  <` + `/script>
  ` : ''}
</body>
</html>`;
  }

  /**
   * Abre el Volante Oficial del Paciente en una ventana independiente imprimible / guardable en PDF
   */
  function openPatientVolantePrintWindow(patientId, autoPrint = true) {
    const patient = getPatientById(patientId);
    if (!patient) {
      console.warn("No se encontró el paciente para imprimir volante:", patientId);
      alert("⚠️ No se encontró la información clínica para el paciente solicitado.");
      return;
    }

    state.activePatientVolante = patient;

    // Poblar y sincronizar también el modal interno de la aplicación
    try {
      populateOfficialVolante(patient);
      const modal = document.getElementById('modalOfficialSheet');
      if (modal) {
        modal.classList.add('active');
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
        modal.style.visibility = 'visible';
        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
      }
    } catch (e) { }

    // Abrir ventana emergente dedicada con el documento imprimible
    try {
      const printWin = window.open('', '_blank', 'width=960,height=880,menubar=no,toolbar=no,location=no,status=no');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(generatePatientVolanteHtml(patient, autoPrint));
        printWin.document.close();
        printWin.focus();
        return;
      }
    } catch (err) {
      console.warn("Error al abrir ventana emergente del volante:", err);
    }

    // Si el navegador bloqueó la ventana emergente, asegurarse de que el modal en pantalla esté abierto
    openOfficialVolanteModal(patientId);
  }

  function openOfficialVolanteModal(patientId) {
    const patient = getPatientById(patientId);

    if (!patient) {
      console.warn("No se encontró el paciente para el volante:", patientId);
      alert("⚠️ No se encontró la información clínica para el paciente solicitado.");
      return;
    }

    state.activePatientVolante = patient;
    populateOfficialVolante(patient);

    const modal = document.getElementById('modalOfficialSheet');
    if (modal) {
      modal.classList.add('active');
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
      modal.style.visibility = 'visible';
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      modal.scrollTop = 0;
    }
  }

  function closeOfficialVolanteModal() {
    const modal = document.getElementById('modalOfficialSheet');
    if (modal) {
      modal.classList.remove('active');
      modal.style.display = 'none';
      modal.style.visibility = 'hidden';
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
    }
  }

  function printOfficialVolante() {
    if (state.activePatientVolante) {
      openPatientVolantePrintWindow(state.activePatientVolante.id || state.activePatientVolante, true);
    } else {
      window.print();
    }
  }

  function generatePatientPDF(patient) {
    if (!patient) return;
    openPatientVolantePrintWindow(patient.id || patient, true);
  }

  window.openOfficialVolanteModal = openOfficialVolanteModal;
  window.closeOfficialVolanteModal = closeOfficialVolanteModal;
  window.printOfficialVolante = printOfficialVolante;
  window.generatePatientPDF = generatePatientPDF;
  window.openPatientVolantePrintWindow = openPatientVolantePrintWindow;

  // Cierre de modal con Escape o clic en fondo
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOfficialVolanteModal();
    }
  });

  const modalOfficialSheetEl = document.getElementById('modalOfficialSheet');
  if (modalOfficialSheetEl) {
    modalOfficialSheetEl.addEventListener('click', (e) => {
      if (e.target === modalOfficialSheetEl) {
        closeOfficialVolanteModal();
      }
    });
  }

  function getVideoGuideUrl(radiofarmaco, hasDiabetes) {
    return DRIVE_GOOGLE_URL;
  }

  function normalizeRadiofarmaco(rfString) {
    const rf = String(rfString).toLowerCase();
    if (rf.includes("psma") && rf.includes("68ga")) return "68GA-PSMA";
    if (rf.includes("psma") || rf.includes("fluorurocolina") || rf.includes("fluor")) return "FLUOR-PSMA";
    if (rf.includes("colina")) return "18F-COLINA";
    if (rf.includes("somatostatina") || rf.includes("dotatoc") || rf.includes("dotatate") || rf.includes("neuroendocrino")) return "68GA-SOMATOSTATINA";
    if (rf.includes("neuro") || rf.includes("cerebr")) return "PET-NEURO";
    return "18F-FDG";
  }

  function formatDate(d) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Imprime el listado oficial de citaciones del día seleccionado
   * e incluye acceso directo al volante individual de cada paciente
   */
  function printDaySchedule(dateStr) {
    const dateParts = dateStr.split('-');
    const dateObj = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
    const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const dayName = dayNames[dateObj.getDay()];
    const formattedDateFormatted = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

    const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);
    dayPatients.sort((a, b) => String(a.horaCita).localeCompare(String(b.horaCita)));

    const printWindow = window.open('', '_blank', 'width=960,height=800');
    if (!printWindow) {
      alert("⚠️ El navegador bloqueó la ventana de impresión. Por favor, habilite las ventanas emergentes.");
      return;
    }

    let rowsHtml = '';
    if (dayPatients.length === 0) {
      rowsHtml = `<tr><td colspan="7" style="text-align:center; padding: 2rem; color: #64748b;">No hay citas agendadas reservadas para este día.</td></tr>`;
    } else {
      dayPatients.forEach((p, idx) => {
        const isPeonada = String(p.horaCita).includes('Peonada');
        const shiftBadge = isPeonada ? '<span style="color:#d97706; font-weight:bold;"> [Turno Extra/Peonada]</span>' : '';

        let alertsText = 'Sin alertas';
        if (Array.isArray(p.alertas) && p.alertas.length > 0) {
          alertsText = p.alertas.map(a => typeof a === 'string' ? a : (a && a.text ? a.text : '')).filter(Boolean).join(' | ');
        } else if (typeof p.alertas === 'string' && p.alertas.trim()) {
          alertsText = p.alertas;
        }

        rowsHtml += `
          <tr>
            <td style="padding: 10px; border-bottom: 1px solid #d5eef7; font-weight: bold; text-align: center;">${idx + 1}</td>
            <td style="padding: 10px; border-bottom: 1px solid #d5eef7; font-weight: bold; color: #0f4c81;">${escapeHTML(p.horaCita)}${shiftBadge}</td>
            <td style="padding: 10px; border-bottom: 1px solid #d5eef7; font-weight: bold; color: #123b5d;">
              ${escapeHTML(p.nombre)}
              <div style="font-size: 0.75rem; color: #64748b; font-weight: normal;">NHC: ${escapeHTML(p.nhc || p.id)}</div>
            </td>
            <td style="padding: 10px; border-bottom: 1px solid #d5eef7; color: #075985; font-weight: bold;">${escapeHTML(p.radiofarmaco)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #d5eef7; color: #52718a;">${escapeHTML(p.tipoEstudio)}</td>
            <td style="padding: 10px; border-bottom: 1px solid #d5eef7; font-size: 0.8rem; color: #64748b;">${escapeHTML(alertsText)}</td>
            <td class="no-print-action" style="padding: 8px 10px; border-bottom: 1px solid #d5eef7; text-align: center;">
              <button type="button" class="btn-volante-row" onclick="abrirVolanteDeFila('${escapeHTML(p.id)}')" title="Ver e imprimir el volante oficial de petición de este paciente" style="background: #007eb4; color: #ffffff; border: 1px solid #005a82; border-radius: 6px; padding: 6px 12px; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); transition: background 0.15s ease;">
                📄 Ver Volante (PDF)
              </button>
            </td>
          </tr>
        `;
      });
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <title>Impresión Citaciones - ${dayName} ${formattedDateFormatted}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #123b5d; margin: 20px; background: #fff; }
          .no-print-bar {
            background: #eff8fc;
            border: 1.5px solid #bae6fd;
            border-radius: 8px;
            padding: 10px 16px;
            margin-bottom: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .header { border-bottom: 3px solid #0f4c81; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          .hospital-title { font-size: 18px; font-weight: bold; color: #0f4c81; text-transform: uppercase; }
          .dept-subtitle { font-size: 13px; color: #52718a; margin-top: 4px; }
          .sheet-info { text-align: right; font-size: 13px; color: #075985; }
          .date-badge { font-size: 15px; font-weight: bold; background: #eff8fc; border: 1px solid #d5eef7; padding: 6px 14px; border-radius: 8px; color: #0f4c81; margin-top: 4px; display: inline-block; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px; }
          th { background: #eff8fc; color: #0f4c81; text-transform: uppercase; font-size: 11px; padding: 10px; border-bottom: 2px solid #d5eef7; text-align: left; }
          .footer { margin-top: 40px; border-top: 1px solid #d5eef7; padding-top: 15px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b; }
          @media print {
            body { margin: 0; }
            .no-print-bar, .no-print-action { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="font-size: 12px; color: #0369a1; font-weight: 600;">
            💡 <em>Haga clic en <strong>"📄 Ver Volante (PDF)"</strong> al lado de cada paciente para abrir, consultar o imprimir su volante médico oficial.</em>
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="background: #007eb4; color: white; border: none; padding: 7px 15px; font-size: 12px; font-weight: 700; border-radius: 6px; cursor: pointer;">🖨️ Imprimir Este Listado Diario</button>
            <button onclick="window.close()" style="background: #e2e8f0; color: #334155; border: none; padding: 7px 12px; font-size: 12px; font-weight: 600; border-radius: 6px; cursor: pointer;">❌ Cerrar</button>
          </div>
        </div>

        <div class="header">
          <div>
            <div class="hospital-title">🏥 SERVICIO DE MEDICINA NUCLEAR - UNIDAD PET/CT</div>
            <div class="dept-subtitle">Listado Oficial de Pacientes Citados · Galaria / SERGAS</div>
          </div>
          <div class="sheet-info">
            <div>FECHA DE AGENDA</div>
            <div class="date-badge">📅 ${dayName} ${formattedDateFormatted}</div>
          </div>
        </div>

        <div style="margin-bottom: 15px; font-size: 13px; color: #52718a;">
          <strong>Total de pacientes citados:</strong> ${dayPatients.length} pacientes
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 4%;">#</th>
              <th style="width: 18%;">Hora Cita</th>
              <th style="width: 28%;">Paciente / NHC</th>
              <th style="width: 14%;">Radiofármaco</th>
              <th style="width: 16%;">Tipo de Estudio</th>
              <th style="width: 10%;">Alertas</th>
              <th style="width: 10%; text-align: center;" class="no-print-action">Volante Oficial</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer">
          <div>Documento clínico impreso automáticamente el ${new Date().toLocaleString('es-ES')}</div>
          <div>Firma Control Sanitario: ___________________________</div>
        </div>

        <script>
          window.abrirVolanteDeFila = function(patientId) {
            try {
              if (window.opener && typeof window.opener.openPatientVolantePrintWindow === 'function') {
                window.opener.openPatientVolantePrintWindow(patientId, true);
                window.opener.focus();
                return;
              }
            } catch(e) {}
            window.open('index.html?volante=' + encodeURIComponent(patientId), '_blank');
          };
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // DOM Elements for Manual Slot Modal
  const manualSlotModal = document.getElementById('manual-slot-modal');
  const btnCloseManualModal = document.getElementById('btn-close-manual-modal');
  const manualSlotDate = document.getElementById('manual-slot-date');
  const manualSlotTime = document.getElementById('manual-slot-time');
  const selectManualWaitingPatient = document.getElementById('select-manual-waiting-patient');
  const btnConfirmManualWaiting = document.getElementById('btn-confirm-manual-waiting');

  const newPatientName = document.getElementById('new-patient-name');
  const newPatientNhc = document.getElementById('new-patient-nhc');
  const newPatientRf = document.getElementById('new-patient-rf');
  const newPatientPrio = document.getElementById('new-patient-prio');
  const btnConfirmNewPatient = document.getElementById('btn-confirm-new-patient');

  if (btnCloseManualModal) btnCloseManualModal.addEventListener('click', closeManualSlotModal);
  if (manualSlotModal) {
    manualSlotModal.addEventListener('click', (e) => {
      if (e.target === manualSlotModal) closeManualSlotModal();
    });
  }

  function openAssignManualModal(dateStr, timeStr, defaultRf = null) {
    manualSlotDate.value = dateStr || formatDate(new Date());
    manualSlotTime.value = timeStr || '08:00 h';

    newPatientName.value = '';
    newPatientNhc.value = '';
    if (defaultRf && defaultRf !== 'Flexible') {
      newPatientRf.value = defaultRf;
    } else {
      newPatientRf.value = '18F-FDG';
    }
    newPatientPrio.value = '🟢 P3';

    selectManualWaitingPatient.innerHTML = '<option value="">-- Seleccionar paciente pendiente --</option>';
    const waitingList = (state.submissions || []).filter(s => s.requiresProposal);
    if (waitingList.length === 0) {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = "No hay pacientes pendientes en la lista de espera";
      selectManualWaitingPatient.appendChild(opt);
    } else {
      // Ordenar por fármaco coincidente primero, luego prioridad clínica P1 > P2 > P3,
      // y pacientes ambulatorios antes que pacientes con movilidad reducida/hospitalizados
      waitingList.sort((a, b) => {
        if (defaultRf && defaultRf !== 'Flexible') {
          const matchA = (a.radiofarmaco === defaultRf) ? 0 : 1;
          const matchB = (b.radiofarmaco === defaultRf) ? 0 : 1;
          if (matchA !== matchB) return matchA - matchB;
        }
        const prioVal = (p) => p.prioridad.includes('P1') ? 1 : p.prioridad.includes('P2') ? 2 : 3;
        const diff = prioVal(a) - prioVal(b);
        if (diff !== 0) return diff;
        const mobA = getPatientMobilityHospitalizationInfo(a).isLateShift ? 1 : 0;
        const mobB = getPatientMobilityHospitalizationInfo(b).isLateShift ? 1 : 0;
        return mobA - mobB;
      });

      waitingList.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        const wMob = getPatientMobilityHospitalizationInfo(w);
        const mobTag = wMob.isLateShift ? ` [${wMob.label} - Citar de ÚLTIMO]` : '';
        opt.textContent = `${w.prioridad} - ${w.nombre} (${w.radiofarmaco})${mobTag}`;
        selectManualWaitingPatient.appendChild(opt);
      });
    }

    manualSlotModal.classList.remove('hidden');
  }

  function closeManualSlotModal() {
    manualSlotModal.classList.add('hidden');
  }

  if (btnConfirmManualWaiting) {
    btnConfirmManualWaiting.addEventListener('click', () => {
      const patientId = selectManualWaitingPatient.value;
      const dateVal = manualSlotDate.value;
      const timeVal = manualSlotTime.value.trim() || '08:00 h';

      if (!patientId) {
        alert("Por favor selecciona un paciente pendiente de la lista de espera.");
        return;
      }
      if (!dateVal) {
        alert("Por favor selecciona una fecha.");
        return;
      }

      const patient = state.submissions.find(s => s.id === patientId);
      if (patient) {
        // Validación de protocolo: si es de movilidad reducida o ingresado y se cita de primero
        const mobInfoManual = getPatientMobilityHospitalizationInfo(patient);
        const isFirstManual = isFirstSlotOfDayOrShift(dateVal, timeVal);
        if (mobInfoManual.isLateShift && isFirstManual) {
          const proceed = confirm(
            `⚠️ AVISO ASISTENCIAL (NO CITADO CORRECTAMENTE):\n\n` +
            `El paciente ${patient.nombre} tiene la condición: ${mobInfoManual.label.toUpperCase()}.\n\n` +
            `Protocolo de Medicina Nuclear PET/CT:\n` +
            `Los pacientes ingresados o con movilidad reducida (silla de ruedas / camilla) DEBEN citarse de ÚLTIMOS en el turno para optimizar la logística de celadores, traslados y medicación.\n\n` +
            `¿Desea forzar la citación de PRIMERO (${timeVal}) de forma excepcional?`
          );
          if (!proceed) return;
        }

        const timeFormatted = timeVal.includes('(') ? timeVal : (timeVal.toLowerCase().includes('h') ? timeVal : `${timeVal} h (${patient.radiofarmaco})`);
        patient.requiresProposal = false;
        patient.fechaCita = dateVal;
        patient.horaCita = timeFormatted;

        state.peonadaAssignments[patient.id] = {
          fechaCita: dateVal,
          horaCita: timeFormatted
        };
        try {
          localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
        } catch (e) { }

        const freedKey = `${dateVal}_${timeVal}`;
        if (state.freedSlots[freedKey]) {
          delete state.freedSlots[freedKey];
          try {
            localStorage.setItem('pet_ct_freed_slots', JSON.stringify(state.freedSlots));
          } catch (e) { }
        }

        fetch('/api/assign-peonada', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paciente_id: patient.id,
            fecha_cita: dateVal,
            hora_cita: timeFormatted
          })
        }).catch(err => console.log('Peonada sync:', err));

        syncAssignmentToMasterDatabase(patient.id, dateVal, timeFormatted);

        updateProposalsLists();
        updateKPIs();
        renderWeeklyGrid();
        renderConfirmationsTable();
        renderProposalTables();
        renderSubmissionsTable();
        closeManualSlotModal();

        const resolvedRf = resolvePatientRadiofarmaco(patient);
        const rfLower = String(resolvedRf || '').toLowerCase();
        if (rfLower.includes('paratiroid') || (rfLower.includes('colina') && (rfLower.includes('adenoma') || rfLower.includes('pth')))) {
          const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
          setTimeout(() => {
            confirmAndSendAudioguia(patient.id, cleanName, nhcVal, dateVal, timeFormatted, resolvedRf);
          }, 350);
        } else if (rfLower.includes('colina') || rfLower.includes('fch')) {
          const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
          setTimeout(() => {
            confirmAndSendAudioguia(patient.id, cleanName, nhcVal, dateVal, timeFormatted, resolvedRf);
          }, 350);
        } else if (rfLower.includes('psma')) {
          const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
          setTimeout(() => {
            confirmAndSendAudioguia(patient.id, cleanName, nhcVal, dateVal, timeFormatted, resolvedRf);
          }, 350);
        } else if (rfLower.includes('vasculitis')) {
          const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
          setTimeout(() => {
            confirmAndSendAudioguia(patient.id, cleanName, nhcVal, dateVal, timeFormatted, resolvedRf);
          }, 350);
        } else if (rfLower.includes('contraste') || rfLower.includes('iodado') || rfLower.includes('yodado')) {
          const { cleanName, nhcVal } = extractPatientNameAndNhc(patient);
          setTimeout(() => {
            confirmAndSendAudioguia(patient.id, cleanName, nhcVal, dateVal, timeFormatted, patient.radiofarmaco);
          }, 350);
        }
      }
    });
  }

  if (btnConfirmNewPatient) {
    btnConfirmNewPatient.addEventListener('click', () => {
      const nameVal = newPatientName.value.trim();
      const nhcVal = newPatientNhc.value.trim();
      const rfVal = newPatientRf.value;
      const prioVal = newPatientPrio.value;

      const dateVal = manualSlotDate.value;
      const timeVal = manualSlotTime.value.trim() || '08:00 h';

      if (!nameVal) {
        alert("Por favor introduce el nombre y apellidos del paciente.");
        return;
      }
      if (!dateVal) {
        alert("Por favor selecciona una fecha.");
        return;
      }

      const newId = `sub_manual_${Date.now()}`;
      const fullNombre = nhcVal ? `${nameVal} (NHC: ${nhcVal})` : nameVal;
      const timeFormatted = timeVal.includes('(') ? timeVal : (timeVal.toLowerCase().includes('h') ? timeVal : `${timeVal} h (${rfVal})`);

      const maxDaysMap = { "🔴 P1": 7, "🟡 P2": 14, "🟢 P3": 30 };
      const maxDays = maxDaysMap[prioVal] || 30;

      const newRecord = {
        id: newId,
        nombre: fullNombre,
        radiofarmaco: rfVal,
        tipoEstudio: rfVal,
        prioridad: prioVal,
        maxDias: maxDays,
        fechaSolicitud: dateVal,
        fechaLimite: dateVal,
        fechaCita: dateVal,
        horaCita: timeFormatted,
        requiresProposal: false,
        proposedDate: dateVal,
        videoUrl: getVideoGuideUrl(rfVal, false),
        alertas: [],
        rfKey: normalizeRadiofarmaco(rfVal)
      };

      state.submissions.push(newRecord);

      state.peonadaAssignments[newId] = {
        fechaCita: dateVal,
        horaCita: timeFormatted
      };
      try {
        localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(state.peonadaAssignments));
      } catch (e) { }

      const freedKey = `${dateVal}_${timeVal}`;
      if (state.freedSlots[freedKey]) {
        delete state.freedSlots[freedKey];
        try {
          localStorage.setItem('pet_ct_freed_slots', JSON.stringify(state.freedSlots));
        } catch (e) { }
      }

      fetch('/api/assign-peonada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paciente_id: newId,
          fecha_cita: dateVal,
          hora_cita: timeFormatted
        })
      }).catch(err => console.log('Peonada sync:', err));

      syncAssignmentToMasterDatabase(newId, dateVal, timeFormatted, {
        "Submission ID": newId,
        "Respondent ID": `resp_${Date.now()}`,
        "Modalidad": "PET",
        "Fecha Solicitud": dateVal,
        "NHC / Historia Clínica": nhcVal || newId,
        "Nombre del Paciente": nameVal,
        "Nombre y Apellidos": nameVal,
        "Tipo de Estudio PET Solicitado": rfVal,
        "Carácter de la Petición": prioVal,
        "Prioridad Calculada": prioVal,
        "Fecha Cita Asignada": dateVal,
        "Hora Cita Asignada": timeFormatted,
        "Estado de Triaje": "Cita Asignada"
      });

      updateProposalsLists();
      updateKPIs();
      renderWeeklyGrid();
      renderConfirmationsTable();
      renderProposalTables();
      renderSubmissionsTable();
      closeManualSlotModal();

      const rfLower = String(rfVal || '').toLowerCase();
      if (rfLower.includes('paratiroid') || (rfLower.includes('colina') && (rfLower.includes('adenoma') || rfLower.includes('pth')))) {
        setTimeout(() => {
          confirmAndSendAudioguia(newId, nameVal, nhcVal, dateVal, timeFormatted, rfVal);
        }, 350);
      } else if (rfLower.includes('colina') || rfLower.includes('fch')) {
        setTimeout(() => {
          confirmAndSendAudioguia(newId, nameVal, nhcVal, dateVal, timeFormatted, rfVal);
        }, 350);
      } else if (rfLower.includes('psma')) {
        setTimeout(() => {
          confirmAndSendAudioguia(newId, nameVal, nhcVal, dateVal, timeFormatted, rfVal);
        }, 350);
      } else if (rfLower.includes('vasculitis')) {
        setTimeout(() => {
          confirmAndSendAudioguia(newId, nameVal, nhcVal, dateVal, timeFormatted, rfVal);
        }, 350);
      } else if (rfLower.includes('contraste') || rfLower.includes('iodado') || rfLower.includes('yodado')) {
        setTimeout(() => {
          confirmAndSendAudioguia(newId, nameVal, nhcVal, dateVal, timeFormatted, rfVal);
        }, 350);
      }
    });
  }

  // ==============================================================================
  // TOP LIVE AUTOCOMPLETADO PATIENT SEARCH BAR MODULE
  // ==============================================================================
  const topSearchInput = document.getElementById('top-patient-search-input');
  const topSearchDropdown = document.getElementById('top-search-dropdown');

  function repositionTopSearchDropdown() {
    if (!topSearchDropdown || !topSearchInput) return;
    const inputRect = topSearchInput.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
    const availableRight = Math.max(320, viewportWidth - Math.max(0, inputRect.left) - 24);
    const targetWidth = Math.min(460, availableRight);

    topSearchDropdown.style.setProperty('left', '0px', 'important');
    topSearchDropdown.style.setProperty('right', 'auto', 'important');
    topSearchDropdown.style.setProperty('width', targetWidth + 'px', 'important');
    topSearchDropdown.style.setProperty('max-width', 'calc(100vw - 32px)', 'important');
    topSearchDropdown.style.setProperty('max-height', 'min(72vh, 500px)', 'important');
  }

  if (topSearchInput && topSearchDropdown) {
    topSearchInput.addEventListener('input', (e) => executeLiveTopSearch(e.target.value));
    topSearchInput.addEventListener('focus', (e) => {
      if (e.target.value && e.target.value.trim().length > 0) {
        executeLiveTopSearch(e.target.value);
      }
    });

    window.addEventListener('resize', () => {
      if (!topSearchDropdown.classList.contains('hidden')) {
        repositionTopSearchDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      if (!topSearchInput.contains(e.target) && !topSearchDropdown.contains(e.target)) {
        topSearchDropdown.classList.add('hidden');
      }
    });
  }

  function executeLiveTopSearch(query) {
    if (!topSearchDropdown) return;
    const q = (query || '').trim().toLowerCase();
    topSearchDropdown.innerHTML = '';

    if (!q) {
      topSearchDropdown.classList.add('hidden');
      return;
    }

    topSearchDropdown.classList.remove('hidden');
    repositionTopSearchDropdown();

    const matches = state.submissions.filter(s =>
      (s.nombre && s.nombre.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      topSearchDropdown.innerHTML = `
        <div style="padding: 1rem; text-align: center; color: #991b1b; background: #fff5f5; border: 1px solid #fee2e2; border-radius: 10px;">
          <div style="font-size: 0.95rem; font-weight: 700; margin-bottom: 0.4rem;">⚠️ Paciente no encontrado en agenda ni en lista de espera.</div>
          <p style="font-size: 0.82rem; color: #7f1d1d; margin-bottom: 0.7rem;">No existen registros para "${query}".</p>
          <button id="btn-top-create-new-patient" class="btn btn-primary" style="font-size: 0.82rem; padding: 0.45rem 0.9rem; width: 100%;">
            ➕ Crear Paciente Nuevo
          </button>
        </div>
      `;

      const btnCreate = document.getElementById('btn-top-create-new-patient');
      if (btnCreate) {
        btnCreate.addEventListener('click', () => {
          topSearchDropdown.classList.add('hidden');
          openAssignManualModal(formatDate(new Date()), '08:00 h');
        });
      }
      return;
    }

    matches.forEach(p => {
      const isConfirmed = state.confirmations[p.id];
      const isPeonada = !p.requiresProposal && (
        (p.horaCita && (p.horaCita.includes('15:') || p.horaCita.includes('16:') || p.horaCita.includes('17:') || p.horaCita.includes('18:'))) ||
        (p.fechaCita && (p.fechaCita.includes('SÁBADO') || p.fechaCita.includes('Sabado')))
      );

      const card = document.createElement('div');

      if (!p.requiresProposal) {
        // AGENDADO: Haz clic para abrir automáticamente el modal '⚙️ Gestión de Cita de Paciente'
        card.style.cssText = 'border: 1px solid #10b981; border-left: 5px solid #10b981; background: #f0fdf4; border-radius: 10px; padding: 0.75rem; margin-bottom: 0.6rem; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;';
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.3rem;">
            <h4 style="margin:0; color:#0f4c81; font-size:0.95rem; font-weight:700;">👤 ${p.nombre}</h4>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <button type="button" class="btn btn-outline btn-pdf-patient" data-id="${p.id}" style="font-size:0.75rem; padding:2px 8px; font-weight:700; color:var(--sergas-navy); border-color:var(--sergas-light-border); background:#ffffff;" title="Ver e Imprimir Volante de Petición Médica">📄 Volante</button>
              <span class="badge badge-confirmed" style="font-size:0.75rem; padding:2px 8px;">✅ AGENDADO</span>
            </div>
          </div>
          <div style="font-size:0.82rem; color:#334155;">
            📅 Cita: <strong>${p.fechaCita} (${p.horaCita})</strong> | 🧪 <strong>${p.radiofarmaco}</strong>
          </div>
          <div style="font-size:0.78rem; color:#059669; font-weight:600; margin-top:0.4rem; display:flex; align-items:center; gap:0.3rem;">
            ⚙️ <em>Haz clic para abrir Gestión de Cita (Reemplazar / Liberar hueco)</em>
          </div>
        `;

        card.addEventListener('click', (e) => {
          if (e.target.closest('.btn-pdf-patient')) return;
          topSearchDropdown.classList.add('hidden');
          if (isPeonada) {
            openPeonadaModal(p);
          } else {
            openSlotModal(p);
          }
        });

      } else {
        // LISTA DE ESPERA / PROPUESTA PEONADA: Mismo estilo visual que las filas de la tabla 'Propuesta de Fechas para Peonadas'
        const isP1 = p.prioridad && p.prioridad.includes('P1');
        const isP2 = p.prioridad && p.prioridad.includes('P2');
        const prioBg = isP1 ? '#fee2e2' : isP2 ? '#fef3c7' : '#ecfdf5';
        const prioColor = isP1 ? '#991b1b' : isP2 ? '#92400e' : '#065f46';

        card.style.cssText = `border: 1px solid #cbd5e1; border-left: 5px solid ${prioColor}; background: #ffffff; border-radius: 10px; padding: 0.75rem; margin-bottom: 0.6rem; box-shadow: 0 2px 6px rgba(0,0,0,0.03);`;
        card.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.4rem;">
            <h4 style="margin:0; color:#123b5d; font-size:0.95rem; font-weight:700;">👤 ${p.nombre}</h4>
            <div style="display:flex; gap:0.4rem; align-items:center;">
              <button type="button" class="btn btn-outline btn-pdf-patient" data-id="${p.id}" style="font-size:0.75rem; padding:2px 8px; font-weight:700; color:var(--sergas-navy); border-color:var(--sergas-light-border); background:#ffffff;" title="Ver e Imprimir Volante de Petición Médica">📄 Volante</button>
              <span class="badge" style="background:${prioBg}; color:${prioColor}; border:1px solid ${prioColor}; font-size:0.75rem; font-weight:700;">${p.prioridad}</span>
            </div>
          </div>
          <div style="font-size:0.8rem; color:#475569; display:grid; grid-template-columns:1fr 1fr; gap:0.3rem 0.5rem; margin-bottom:0.5rem;">
            <div>🧪 <strong>Estudio:</strong> ${p.radiofarmaco}</div>
            <div>📅 <strong>Solicitud:</strong> ${p.fechaSolicitud || '-'}</div>
            <div>🚨 <strong>Límite:</strong> <span style="color:#ef4444; font-weight:700;">${p.fechaLimite || '-'}</span></div>
            <div>💡 <strong>Sugerida:</strong> <span style="color:#f59e0b; font-weight:700;">${p.proposedDate || 'Próx. semana'}</span></div>
          </div>
          <div style="display: flex; justify-content: flex-end; gap: 0.4rem;">
            <button class="btn btn-success btn-schedule-top-search" data-id="${p.id}" style="padding: 0.35rem 0.8rem; font-size: 0.8rem; font-weight: 600;">
              📅 Agendar Paciente
            </button>
          </div>
        `;

        const btnSchedule = card.querySelector('.btn-schedule-top-search');
        if (btnSchedule) {
          btnSchedule.addEventListener('click', (e) => {
            e.stopPropagation();
            topSearchDropdown.classList.add('hidden');
            openPeonadaModal(p);
          });
        }
      }

      topSearchDropdown.appendChild(card);
    });

    attachPdfButtonListeners();
  }

  // Standalone Search Modal Listener Handlers
  const patientSearchModal = document.getElementById('patient-search-modal');
  const btnCloseSearchModal = document.getElementById('btn-close-search-modal');
  const inputSearchModal = document.getElementById('input-search-modal');
  const btnClearSearchModal = document.getElementById('btn-clear-search-modal');
  const containerSearchResults = document.getElementById('container-search-results');

  if (btnCloseSearchModal && patientSearchModal) {
    btnCloseSearchModal.addEventListener('click', () => {
      patientSearchModal.classList.add('hidden');
    });
  }

  if (patientSearchModal) {
    patientSearchModal.addEventListener('click', (e) => {
      if (e.target === patientSearchModal) {
        patientSearchModal.classList.add('hidden');
      }
    });
  }

  if (btnClearSearchModal && inputSearchModal) {
    btnClearSearchModal.addEventListener('click', () => {
      inputSearchModal.value = '';
      if (containerSearchResults) containerSearchResults.innerHTML = '';
    });
  }

  if (inputSearchModal && containerSearchResults) {
    inputSearchModal.addEventListener('input', (e) => {
      const q = (e.target.value || '').trim().toLowerCase();
      containerSearchResults.innerHTML = '';
      if (!q) return;

      const matches = state.submissions.filter(s =>
        (s.nombre && s.nombre.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q))
      );

      if (matches.length === 0) {
        containerSearchResults.innerHTML = `<p style="text-align:center; color:#94a3b8; padding:1.5rem 0;">No se encontraron pacientes para "${q}".</p>`;
        return;
      }

      matches.forEach(p => {
        const item = document.createElement('div');
        item.style.cssText = 'padding: 0.8rem 1rem; border: 1px solid #e2e8f0; border-radius: 10px; background: #ffffff; cursor: pointer; transition: all 0.15s;';
        item.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.25rem;">
            <strong style="color:#0f4c81; font-size:0.95rem;">👤 ${p.nombre}</strong>
            <span class="badge" style="font-size:0.75rem; background:#f0fdf4; color:#166534; border:1px solid #bbf7d0;">${p.prioridad || 'Ordinaria'}</span>
          </div>
          <div style="font-size:0.82rem; color:#475569;">
            🧪 <strong>${p.radiofarmaco}</strong> | 📅 Cita: <strong>${p.fechaCita || 'En espera'} ${p.horaCita || ''}</strong>
          </div>
        `;
        item.addEventListener('click', () => {
          patientSearchModal.classList.add('hidden');
          if (p.requiresProposal) {
            openPeonadaModal(p);
          } else {
            openSlotModal(p);
          }
        });
        containerSearchResults.appendChild(item);
      });
    });
  }


  // ==============================================================================
  // INICIALIZACIÓN DE LISTENERS PARA GESTIÓN DE AGENDAS Y TRIAJE
  // ==============================================================================

  // 1. Barra de Herramientas de Agenda (Plantilla Semanal y Relleno Automático)
  const btnOpenAgendaTemplate = document.getElementById('btn-open-agenda-template');
  const btnAutofillWeekTriage = document.getElementById('btn-autofill-week-triage');

  if (btnOpenAgendaTemplate) {
    btnOpenAgendaTemplate.addEventListener('click', () => {
      openWeeklyTemplateModal();
    });
  }

  if (btnAutofillWeekTriage) {
    btnAutofillWeekTriage.addEventListener('click', () => {
      runTriageAutoScheduler({ targetWeekIndex: state.selectedWeekIndex });
    });
  }

  // 2. Modal Configurar Día Específico
  const agendaDayModal = document.getElementById('agenda-day-modal');
  const btnCloseAgendaDayModal = document.getElementById('btn-close-agenda-day-modal');
  const btnCancelAgendaDay = document.getElementById('btn-cancel-agenda-day');
  const btnSaveAgendaDay = document.getElementById('btn-save-agenda-day');
  const btnSaveAndAutofillDay = document.getElementById('btn-save-and-autofill-day');

  const closeDayAgendaModal = () => {
    if (agendaDayModal) agendaDayModal.classList.add('hidden');
    state.activeAgendaDayDate = null;
  };

  if (btnCloseAgendaDayModal) btnCloseAgendaDayModal.addEventListener('click', closeDayAgendaModal);
  if (btnCancelAgendaDay) btnCancelAgendaDay.addEventListener('click', closeDayAgendaModal);
  if (agendaDayModal) {
    agendaDayModal.addEventListener('click', (e) => {
      if (e.target === agendaDayModal) closeDayAgendaModal();
    });
  }

  // Toggles de Turno Mañana y Turno Tarde en modal de día
  const morningShiftActive = document.getElementById('morning-shift-active');
  const morningShiftDetails = document.getElementById('morning-shift-details');
  if (morningShiftActive && morningShiftDetails) {
    morningShiftActive.addEventListener('change', (e) => {
      morningShiftDetails.style.display = e.target.checked ? 'block' : 'none';
    });
  }

  const afternoonShiftActive = document.getElementById('afternoon-shift-active');
  const afternoonShiftDetails = document.getElementById('afternoon-shift-details');
  const aftBadge = document.getElementById('afternoon-slots-summary-badge');
  if (afternoonShiftActive && afternoonShiftDetails) {
    afternoonShiftActive.addEventListener('change', (e) => {
      afternoonShiftDetails.style.display = e.target.checked ? 'block' : 'none';
      if (aftBadge) {
        aftBadge.textContent = e.target.checked ? 'Activo' : 'Inactivo';
        aftBadge.style.background = e.target.checked ? '#fef3c7' : '#f1f5f9';
        aftBadge.style.color = e.target.checked ? '#b45309' : '#64748b';
      }
    });
  }

  // Añadir tratamiento personalizado en Mañana
  const btnAddMorningCustom = document.getElementById('btn-add-morning-custom');
  const morningCustomInput = document.getElementById('morning-custom-treatment-input');
  if (btnAddMorningCustom && morningCustomInput) {
    btnAddMorningCustom.addEventListener('click', () => {
      const val = morningCustomInput.value.trim();
      if (!val) return;
      if (!state.agendaConfig.customTreatments) state.agendaConfig.customTreatments = [];
      if (!state.agendaConfig.customTreatments.includes(val)) {
        state.agendaConfig.customTreatments.push(val);
      }
      const curTreatments = getSelectedTreatmentsFromContainer('morning-treatments-container');
      if (!curTreatments.includes(val)) curTreatments.push(val);
      renderTreatmentTagsForShift('morning', curTreatments);
      morningCustomInput.value = '';
    });
  }

  // Añadir tratamiento personalizado en Tarde
  const btnAddAfternoonCustom = document.getElementById('btn-add-afternoon-custom');
  const afternoonCustomInput = document.getElementById('afternoon-custom-treatment-input');
  if (btnAddAfternoonCustom && afternoonCustomInput) {
    btnAddAfternoonCustom.addEventListener('click', () => {
      const val = afternoonCustomInput.value.trim();
      if (!val) return;
      if (!state.agendaConfig.customTreatments) state.agendaConfig.customTreatments = [];
      if (!state.agendaConfig.customTreatments.includes(val)) {
        state.agendaConfig.customTreatments.push(val);
      }
      const curTreatments = getSelectedTreatmentsFromContainer('afternoon-treatments-container');
      if (!curTreatments.includes(val)) curTreatments.push(val);
      renderTreatmentTagsForShift('afternoon', curTreatments);
      afternoonCustomInput.value = '';
    });
  }

  // Controles de Huecos Individuales por Fármaco en el modal de día
  const newSlotTimeInput = document.getElementById('new-slot-time-input');
  const newSlotShiftSelect = document.getElementById('new-slot-shift-select');
  const newSlotRfSelect = document.getElementById('new-slot-rf-select');
  const newSlotCustomRfBox = document.getElementById('new-slot-custom-rf-box');
  const newSlotCustomRfInput = document.getElementById('new-slot-custom-rf-input');
  const btnAddCustomSlot = document.getElementById('btn-add-custom-slot');
  const btnPrefillStandardSlots = document.getElementById('btn-prefill-standard-slots');
  const btnClearDaySlots = document.getElementById('btn-clear-day-slots');

  if (newSlotTimeInput && newSlotShiftSelect) {
    newSlotTimeInput.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val) {
        const hour = parseInt(val.split(':')[0]);
        newSlotShiftSelect.value = (hour >= 14) ? 'afternoon' : 'morning';
      }
    });
  }

  if (newSlotRfSelect && newSlotCustomRfBox) {
    newSlotRfSelect.addEventListener('change', (e) => {
      newSlotCustomRfBox.style.display = (e.target.value === 'custom') ? 'block' : 'none';
      if (e.target.value === 'custom' && newSlotCustomRfInput) {
        newSlotCustomRfInput.focus();
      }
    });
  }

  if (btnAddCustomSlot) {
    btnAddCustomSlot.addEventListener('click', () => {
      const timeVal = newSlotTimeInput ? newSlotTimeInput.value : '08:00';
      const shiftVal = newSlotShiftSelect ? newSlotShiftSelect.value : (parseInt(timeVal) >= 14 ? 'afternoon' : 'morning');
      let rfVal = newSlotRfSelect ? newSlotRfSelect.value : '18F-FDG';
      if (rfVal === 'custom' && newSlotCustomRfInput && newSlotCustomRfInput.value.trim()) {
        rfVal = newSlotCustomRfInput.value.trim();
      }

      if (!timeVal) {
        alert("Por favor introduce una hora para el hueco.");
        return;
      }

      // Comprobar si ya existe un hueco con esa hora exacta
      const existingIdx = currentDayCustomSlots.findIndex(s => s.time === timeVal);
      if (existingIdx !== -1) {
        currentDayCustomSlots[existingIdx].radiofarmaco = rfVal;
        currentDayCustomSlots[existingIdx].shift = shiftVal;
      } else {
        currentDayCustomSlots.push({
          id: `slot_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          time: timeVal,
          radiofarmaco: rfVal,
          shift: shiftVal
        });
      }

      renderCustomSlotsTable();
      if (newSlotCustomRfInput) newSlotCustomRfInput.value = '';
      if (newSlotRfSelect) newSlotRfSelect.value = '18F-FDG';
      if (newSlotCustomRfBox) newSlotCustomRfBox.style.display = 'none';
    });
  }

  if (btnPrefillStandardSlots) {
    btnPrefillStandardSlots.addEventListener('click', () => {
      const dayCfg = state.activeAgendaDayDate ? getDayAgendaConfig(state.activeAgendaDayDate) : null;
      currentDayCustomSlots = generateDefaultCustomSlotsForDay(dayCfg);
      renderCustomSlotsTable();
    });
  }

  if (btnClearDaySlots) {
    btnClearDaySlots.addEventListener('click', () => {
      currentDayCustomSlots = [];
      renderCustomSlotsTable();
    });
  }

  // Guardar configuración del día
  if (btnSaveAgendaDay) {
    btnSaveAgendaDay.addEventListener('click', () => {
      saveCurrentDayAgendaFromModal();
      closeDayAgendaModal();
      renderWeeklyGrid();
      updateAgendaCapacityStats();
    });
  }

  // Guardar y rellenar con triaje inmediatamente
  if (btnSaveAndAutofillDay) {
    btnSaveAndAutofillDay.addEventListener('click', () => {
      const res = saveCurrentDayAgendaFromModal();
      closeDayAgendaModal();
      if (res && res.dateStr) {
        runTriageAutoScheduler({ targetDateStr: res.dateStr });
      }
    });
  }

  // 3. Modal Plantilla Semanal
  const agendaTemplateModal = document.getElementById('agenda-template-modal');
  const btnCloseAgendaTemplateModal = document.getElementById('btn-close-agenda-template-modal');
  const btnCancelAgendaTemplate = document.getElementById('btn-cancel-agenda-template');
  const btnSaveAgendaTemplate = document.getElementById('btn-save-agenda-template');

  const closeTemplateModal = () => {
    if (agendaTemplateModal) {
      agendaTemplateModal.classList.add('hidden');
      agendaTemplateModal.style.display = 'none';
    }
  };

  window.closeTemplateModal = closeTemplateModal;
  window.openDayAgendaModal = openDayAgendaModal;
  window.closeDayAgendaModal = closeDayAgendaModal;
  window.runTriageAutoScheduler = runTriageAutoScheduler;
  window.state = state;

  if (btnCloseAgendaTemplateModal) btnCloseAgendaTemplateModal.addEventListener('click', closeTemplateModal);
  if (btnCancelAgendaTemplate) btnCancelAgendaTemplate.addEventListener('click', closeTemplateModal);
  if (agendaTemplateModal) {
    agendaTemplateModal.addEventListener('click', (e) => {
      if (e.target === agendaTemplateModal) closeTemplateModal();
    });
  }

  if (btnSaveAgendaTemplate) {
    btnSaveAgendaTemplate.addEventListener('click', () => {
      saveWeeklyTemplateModal();
    });
  }

  // 4. Modal Resultados de Triaje
  const triageResultsModal = document.getElementById('triage-results-modal');
  const btnCloseTriageResultsModal = document.getElementById('btn-close-triage-results-modal');
  const btnOkTriageResults = document.getElementById('btn-ok-triage-results');

  const closeTriageResults = () => {
    if (triageResultsModal) {
      triageResultsModal.classList.add('hidden');
      triageResultsModal.style.display = 'none';
    }
  };

  window.closeTriageResults = closeTriageResults;

  if (btnCloseTriageResultsModal) btnCloseTriageResultsModal.addEventListener('click', closeTriageResults);
  if (btnOkTriageResults) btnOkTriageResults.addEventListener('click', closeTriageResults);
  if (triageResultsModal) {
    triageResultsModal.addEventListener('click', (e) => {
      if (e.target === triageResultsModal) closeTriageResults();
    });
  }

  // ==============================================================================
  // MOTOR DE DOSIMETRÍA Y PEDIDO DE RADIOFÁRMACOS (CICLOTRÓN vs RADIOFARMACIA vs CURIUM MADRID)
  // Reglas Clínicas y de Origen SERGAS:
  // 1. Origen del Suministro:
  //    - FDG Glucosa y Colina (18F-FDG, 18F-Colina, 18F-DOPA) -> CICLOTRÓN
  //    - Galio-68 (68Ga-DOTATATE / Somatostatina, generador) -> RADIOFARMACIA
  //    - PSMA (Fluor-PSMA, 18F-PSMA, 68Ga-PSMA) -> CURIUM MADRID (Qurium Madrid)
  // 2. Reglas Dosimétricas:
  //    - Flúor-18: 1 mCi por cada 10 kg de peso (norma general estándar 10 mCi).
  //    - Galio-68: 5 mCi fijos por paciente (independiente del peso).
  // 3. Decaimiento radiactivo físico:
  //    - T½(18F) = 109.77 min (λ = ln(2)/109.77)
  //    - T½(68Ga) = 67.71 min (λ = ln(2)/67.71)
  //    - Calibración Mañana: 08:00 h · Calibración Tarde: 14:30 h
  //    - Dosis Calibrada = Dosis Iny * 2^(Δt / T½) * (1 + margen/100)
  //    - Actividad en MBq = mCi * 37
  // ==============================================================================

  function getRadiopharmacyInfo(rfName) {
    const str = String(rfName || '').toUpperCase();

    // 1. GALIO-68 (Galio PSMA, Galio Dotatote, 68Ga-DOTATATE, Somatostatina) / LUTECIO -> RADIOFARMACIA HOSPITALARIA
    const isGallium = /(?:68\s*GA|GA\s*68|GA-68|GALIO|DOTAT|SOMATOSTATINA)/i.test(str);
    const isLutetium = /(?:177\s*LU|LU-177|LUTECIO|TERAPIA)/i.test(str);

    if (isGallium) {
      const isPsmaGa = str.includes('PSMA');
      return {
        supplierKey: 'radiopharmacy',
        destination: 'Radiofarmacia',
        supplierLabel: isPsmaGa
          ? '🧪 Radiofarmacia Hospitalaria (Galio-68 PSMA · Generador ⁶⁸Ge/⁶⁸Ga)'
          : '🧪 Radiofarmacia Hospitalaria (Galio-68 DOTATOC/DOTATATE · Generador ⁶⁸Ge/⁶⁸Ga)',
        badgeClass: 'badge-radiopharmacy',
        badgeHtml: '<span class="badge-radiopharmacy" title="Elución generador 68Ge/68Ga y marcaje en Radiofarmacia interna">🧪 Radiofarmacia</span>',
        isotope: '68Ga',
        isotopeFormatted: isPsmaGa ? 'Galio-68 PSMA (⁶⁸Ga)' : 'Galio-68 DOTATOC/DOTATATE (⁶⁸Ga)',
        halfLifeMin: 67.71,
        fixedDoseMci: 5.0,
        isGallium: true,
        isFluorine: false,
        isCurium: false
      };
    } else if (isLutetium) {
      return {
        supplierKey: 'radiopharmacy',
        destination: 'Radiofarmacia',
        supplierLabel: '🧪 Radiofarmacia Hospitalaria (Terapia Metabólica)',
        badgeClass: 'badge-radiopharmacy',
        badgeHtml: '<span class="badge-radiopharmacy" title="Radiofarmacia interna - Terapia metabólica">🧪 Radiofarmacia</span>',
        isotope: '177Lu',
        isotopeFormatted: 'Lutecio-177 (¹⁷⁷Lu)',
        halfLifeMin: 9560, // 6.64 días
        fixedDoseMci: 200.0,
        isGallium: false,
        isFluorine: false,
        isCurium: false
      };
    }

    // 2. PSMA (Flúor-18 PSMA / sin galio) -> CURIUM MADRID (Qurium Madrid)
    if (str.includes('PSMA')) {
      return {
        supplierKey: 'curium',
        destination: 'Curium Madrid',
        supplierLabel: '🏢 Curium Madrid (Suministro urgente · Flúor-18 PSMA)',
        badgeClass: 'badge-curium',
        badgeHtml: '<span class="badge-curium" title="Suministro urgente desde Curium Madrid (Qurium)">🏢 Curium Madrid</span>',
        isotope: '18F',
        isotopeFormatted: 'Flúor-18 PSMA (¹⁸F)',
        halfLifeMin: 109.77,
        fixedDoseMci: null,
        isGallium: false,
        isFluorine: true,
        isCurium: true
      };
    }

    // 3. FDG GLUCOSA Y COLINA -> CICLOTRÓN
    const isCholine = str.includes('COLINA') || str.includes('FCH');
    return {
      supplierKey: 'cyclotron',
      destination: 'Ciclotrón',
      supplierLabel: isCholine
        ? '🏭 Ciclotrón (Producción de 18F-Colina)'
        : '🏭 Ciclotrón (Producción de 18F-FDG Glucosa)',
      badgeClass: 'badge-cyclotron',
      badgeHtml: '<span class="badge-cyclotron" title="Suministro de producción en Ciclotrón (FDG Glucosa / Colina)">🏭 Ciclotrón</span>',
      isotope: '18F',
      isotopeFormatted: isCholine ? '18F-Colina (¹⁸F)' : '18F-FDG Glucosa (¹⁸F)',
      halfLifeMin: 109.77,
      fixedDoseMci: null,
      isGallium: false,
      isFluorine: true,
      isCurium: false
    };
  }

  function calculateDayDoseOrder(dateStr, options = {}) {
    const marginPct = (options.marginPct !== undefined) ? Number(options.marginPct) : 10;
    const calMorningStr = options.calMorning || '08:00';
    const calAfternoonStr = options.calAfternoon || '14:30';

    const [calMornH, calMornM] = calMorningStr.split(':').map(Number);
    const morningCalMin = (calMornH || 8) * 60 + (calMornM || 0);

    const [calAftH, calAftM] = calAfternoonStr.split(':').map(Number);
    const afternoonCalMin = (calAftH || 14) * 60 + (calAftM || 30);

    const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);
    dayPatients.sort((a, b) => String(a.horaCita).localeCompare(String(b.horaCita)));

    const items = [];
    const cyclotronBreakdown = {};
    const radiopharmacyBreakdown = {};
    const curiumBreakdown = {};

    let cyclotronTotalInjectedMci = 0;
    let cyclotronTotalCalibratedMci = 0;
    let cyclotronPatientCount = 0;

    let radiopharmacyTotalInjectedMci = 0;
    let radiopharmacyTotalCalibratedMci = 0;
    let radiopharmacyPatientCount = 0;

    let curiumTotalInjectedMci = 0;
    let curiumTotalCalibratedMci = 0;
    let curiumPatientCount = 0;

    dayPatients.forEach(p => {
      const raw = p.raw || {};
      let rawWeight = parseFloat(raw["Peso (kg)"] || raw.peso || p.peso || 0);
      const weightKnown = rawWeight > 0;
      if (!weightKnown) rawWeight = 70; // Adulto estándar si no consta

      const rf = p.radiofarmaco || p.tipoEstudio || '18F-FDG';
      const rfInfo = getRadiopharmacyInfo(rf);

      let injectedDoseMci = 0;
      let doseExplanation = '';

      if (rfInfo.isGallium) {
        // Regla médica: Galio-68 siempre 5 mCi fijos por paciente
        injectedDoseMci = 5.0;
        doseExplanation = '5.0 mCi (Fijo Galio-68)';
      } else {
        // Regla médica: Flúor 1 mCi por cada 10 kg de peso (norma general 10 mCi)
        if (options.useNominalStandard) {
          injectedDoseMci = 10.0;
          doseExplanation = '10.0 mCi (Estándar nominal)';
        } else {
          injectedDoseMci = Math.round((rawWeight * 0.1) * 10) / 10;
          if (injectedDoseMci <= 0) injectedDoseMci = 10.0;
          doseExplanation = weightKnown
            ? `${injectedDoseMci.toFixed(1)} mCi (1 mCi / 10 kg · ${rawWeight} kg)`
            : `10.0 mCi (Nominal · Peso no reg.)`;
        }
      }

      // Horario y cálculo de decaimiento radiactivo (Δt)
      const horaStr = String(p.horaCita || '');
      const timeMatch = horaStr.match(/(\d{1,2}):(\d{2})/);
      let h = 8, m = 0;
      if (timeMatch) {
        h = parseInt(timeMatch[1], 10);
        m = parseInt(timeMatch[2], 10);
      }
      const slotMin = h * 60 + m;
      const isAfternoon = horaStr.includes('Tarde') || horaStr.includes('Peonada') || (h >= 14);

      const refCalMin = isAfternoon ? afternoonCalMin : morningCalMin;
      const refCalStr = isAfternoon ? calAfternoonStr : calMorningStr;
      const shiftLabel = isAfternoon ? 'Tarde' : 'Mañana';

      const deltaTMin = Math.max(0, slotMin - refCalMin);

      // Ley física de decaimiento radiactivo: A_cal = A_iny * 2^(Δt / T½)
      const decayFactor = Math.pow(2, deltaTMin / rfInfo.halfLifeMin);

      // Actividad requerida a la hora de calibración con margen técnico:
      let calibratedMci = injectedDoseMci * decayFactor;
      if (marginPct > 0) {
        calibratedMci = calibratedMci * (1 + marginPct / 100);
      }

      calibratedMci = Math.round(calibratedMci * 10) / 10;
      const calibratedMbq = Math.round(calibratedMci * 37);

      const isConfirmed = !!state.confirmations[p.id];

      const item = {
        patientId: p.id,
        patientName: p.nombre || 'Paciente',
        nhc: p.nhc || raw.nhc || raw.NHC || '--',
        horaCita: p.horaCita,
        slotTimeFormatted: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        shiftLabel,
        refCalStr,
        weightKg: rawWeight,
        weightKnown,
        radiofarmaco: rf,
        rfInfo,
        injectedDoseMci,
        doseExplanation,
        deltaTMin,
        decayFactor: Math.round(decayFactor * 100) / 100,
        calibratedMci,
        calibratedMbq,
        isConfirmed
      };

      items.push(item);

      if (rfInfo.destination === 'Ciclotrón') {
        cyclotronPatientCount++;
        cyclotronTotalInjectedMci += injectedDoseMci;
        cyclotronTotalCalibratedMci += calibratedMci;
        if (!cyclotronBreakdown[rf]) {
          cyclotronBreakdown[rf] = { count: 0, injectedMci: 0, calibratedMci: 0, calibratedMbq: 0 };
        }
        cyclotronBreakdown[rf].count++;
        cyclotronBreakdown[rf].injectedMci += injectedDoseMci;
        cyclotronBreakdown[rf].calibratedMci += calibratedMci;
        cyclotronBreakdown[rf].calibratedMbq += calibratedMbq;
      } else if (rfInfo.destination === 'Radiofarmacia') {
        radiopharmacyPatientCount++;
        radiopharmacyTotalInjectedMci += injectedDoseMci;
        radiopharmacyTotalCalibratedMci += calibratedMci;
        if (!radiopharmacyBreakdown[rf]) {
          radiopharmacyBreakdown[rf] = { count: 0, injectedMci: 0, calibratedMci: 0, calibratedMbq: 0 };
        }
        radiopharmacyBreakdown[rf].count++;
        radiopharmacyBreakdown[rf].injectedMci += injectedDoseMci;
        radiopharmacyBreakdown[rf].calibratedMci += calibratedMci;
        radiopharmacyBreakdown[rf].calibratedMbq += calibratedMbq;
      } else {
        // Curium Madrid (PSMA)
        curiumPatientCount++;
        curiumTotalInjectedMci += injectedDoseMci;
        curiumTotalCalibratedMci += calibratedMci;
        if (!curiumBreakdown[rf]) {
          curiumBreakdown[rf] = { count: 0, injectedMci: 0, calibratedMci: 0, calibratedMbq: 0 };
        }
        curiumBreakdown[rf].count++;
        curiumBreakdown[rf].injectedMci += injectedDoseMci;
        curiumBreakdown[rf].calibratedMci += calibratedMci;
        curiumBreakdown[rf].calibratedMbq += calibratedMbq;
      }
    });

    return {
      dateStr,
      totalPatients: dayPatients.length,
      confirmedCount: dayPatients.filter(s => !!state.confirmations[s.id]).length,
      marginPct,
      calMorningStr,
      calAfternoonStr,
      items,
      cyclotron: {
        patientCount: cyclotronPatientCount,
        totalInjectedMci: Math.round(cyclotronTotalInjectedMci * 10) / 10,
        totalCalibratedMci: Math.round(cyclotronTotalCalibratedMci * 10) / 10,
        totalCalibratedMbq: Math.round(cyclotronTotalCalibratedMci * 37),
        breakdown: cyclotronBreakdown
      },
      radiopharmacy: {
        patientCount: radiopharmacyPatientCount,
        totalInjectedMci: Math.round(radiopharmacyTotalInjectedMci * 10) / 10,
        totalCalibratedMci: Math.round(radiopharmacyTotalCalibratedMci * 10) / 10,
        totalCalibratedMbq: Math.round(radiopharmacyTotalCalibratedMci * 37),
        breakdown: radiopharmacyBreakdown
      },
      curium: {
        patientCount: curiumPatientCount,
        totalInjectedMci: Math.round(curiumTotalInjectedMci * 10) / 10,
        totalCalibratedMci: Math.round(curiumTotalCalibratedMci * 10) / 10,
        totalCalibratedMbq: Math.round(curiumTotalCalibratedMci * 37),
        breakdown: curiumBreakdown
      }
    };
  }

  function confirmDayAndGenerateDoseOrder(dateStr) {
    if (!dateStr) return;
    const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);

    if (dayPatients.length === 0) {
      if (confirm(`No hay citas asignadas para el día ${dateStr}.\n\n¿Deseas abrir la calculadora de pedido de dosis de todas formas?`)) {
        openRadiopharmacyOrderModal(dateStr, false);
      }
      return;
    }

    const pending = dayPatients.filter(s => !state.confirmations[s.id]);
    if (pending.length > 0) {
      pending.forEach(p => {
        state.confirmations[p.id] = true;
        updateConfirmationInMasterDb(p.id, true);
      });
      try {
        localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
      } catch (e) { }
      updateKPIs();
      renderConfirmationsTable();
      renderWeeklyGrid();
      renderSubmissionsTable();
      showConfirmToast(
        `📦 Citas Confirmadas (${dateStr})`,
        `Se han confirmado las ${dayPatients.length} citas de la jornada (${pending.length} nuevas confirmadas). Se ha generado la petición de dosis para Ciclotrón (FDG/Colina), Radiofarmacia (Galio-68) y Curium Madrid (PSMA).`,
        null
      );
    }

    openRadiopharmacyOrderModal(dateStr, true);
  }

  function openRadiopharmacyOrderModal(dateStr, autoConfirm = false) {
    if (!dateStr) {
      dateStr = state.activeAgendaDayDate || (state.submissions.find(s => s.fechaCita && !s.requiresProposal) || {}).fechaCita || formatDate(new Date());
    }
    state.activeDoseOrderDate = dateStr;

    // Poblar selector de fechas con todas las fechas que tienen citas
    const dateSelect = document.getElementById('dose-order-date-select');
    if (dateSelect) {
      dateSelect.innerHTML = '';
      const dateSet = new Set();
      state.submissions.forEach(s => {
        if (s.fechaCita && !s.requiresProposal) dateSet.add(s.fechaCita);
      });
      dateSet.add(dateStr);
      const sortedDates = Array.from(dateSet).sort();

      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      sortedDates.forEach(d => {
        const p = d.split('-');
        const dt = new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
        const count = state.submissions.filter(s => s.fechaCita === d && !s.requiresProposal).length;
        const opt = document.createElement('option');
        opt.value = d;
        opt.textContent = `${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()} (${count} pacientes)`;
        if (d === dateStr) opt.selected = true;
        dateSelect.appendChild(opt);
      });
    }

    if (autoConfirm) {
      const dayPatients = state.submissions.filter(s => s.fechaCita === dateStr && !s.requiresProposal);
      let changed = false;
      dayPatients.forEach(p => {
        if (!state.confirmations[p.id]) {
          state.confirmations[p.id] = true;
          updateConfirmationInMasterDb(p.id, true);
          changed = true;
        }
      });
      if (changed) {
        try {
          localStorage.setItem('pet_ct_confirmations', JSON.stringify(state.confirmations));
        } catch (e) { }
        updateKPIs();
        renderConfirmationsTable();
        renderWeeklyGrid();
        renderSubmissionsTable();
      }
    }

    recalculateCurrentDoseOrder();

    const modal = document.getElementById('radiopharmacy-order-modal');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  }

  function closeRadiopharmacyOrderModal() {
    const modal = document.getElementById('radiopharmacy-order-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  }

  function onDoseOrderDateChange(newDateStr) {
    if (!newDateStr) return;
    state.activeDoseOrderDate = newDateStr;
    recalculateCurrentDoseOrder();
  }

  function recalculateCurrentDoseOrder() {
    const dateStr = state.activeDoseOrderDate || (document.getElementById('dose-order-date-select') ? document.getElementById('dose-order-date-select').value : null) || formatDate(new Date());

    const calMorn = document.getElementById('dose-order-cal-morning') ? document.getElementById('dose-order-cal-morning').value : '08:00';
    const calAft = document.getElementById('dose-order-cal-afternoon') ? document.getElementById('dose-order-cal-afternoon').value : '14:30';
    const marginSel = document.getElementById('dose-order-margin-select') ? Number(document.getElementById('dose-order-margin-select').value) : 10;

    const res = calculateDayDoseOrder(dateStr, {
      calMorning: calMorn,
      calAfternoon: calAft,
      marginPct: marginSel
    });

    state.lastCalculatedDoseOrder = res;

    // Subtítulo con fecha
    const elSub = document.getElementById('dose-order-subtitle');
    const parts = dateStr.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    if (elSub) {
      elSub.textContent = `📅 ${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()} · Pedidos oficiales: Ciclotrón (FDG/Colina) · Radiofarmacia (Galio-68) · Curium Madrid (PSMA)`;
    }

    // Badge de estado de confirmación
    const elConfirmStatus = document.getElementById('dose-order-confirm-status');
    if (elConfirmStatus) {
      if (res.totalPatients === 0) {
        elConfirmStatus.textContent = '⚠️ Sin Citas Asignadas';
        elConfirmStatus.style.background = '#fef3c7';
        elConfirmStatus.style.color = '#b45309';
        elConfirmStatus.style.borderColor = '#fde68a';
      } else if (res.confirmedCount === res.totalPatients) {
        elConfirmStatus.textContent = `✅ Todas las ${res.totalPatients} Citas Confirmadas`;
        elConfirmStatus.style.background = '#ecfdf5';
        elConfirmStatus.style.color = '#047857';
        elConfirmStatus.style.borderColor = '#a7f3d0';
      } else {
        elConfirmStatus.textContent = `⏳ ${res.confirmedCount}/${res.totalPatients} Confirmadas (${res.totalPatients - res.confirmedCount} pend.)`;
        elConfirmStatus.style.background = '#fffbeb';
        elConfirmStatus.style.color = '#b45309';
        elConfirmStatus.style.borderColor = '#fde68a';
      }
    }

    // Tarjeta 1: Ciclotrón (FDG Glucosa y Colina)
    const elCycCount = document.getElementById('cyclotron-patient-count');
    const elCycMci = document.getElementById('cyclotron-total-calibrated-mci');
    const elCycMbq = document.getElementById('cyclotron-total-mbq');
    const elCycBreakdown = document.getElementById('cyclotron-breakdown-list');

    if (elCycCount) elCycCount.textContent = res.cyclotron.patientCount;
    if (elCycMci) elCycMci.textContent = `${res.cyclotron.totalCalibratedMci.toFixed(1)} mCi`;
    if (elCycMbq) elCycMbq.textContent = `(${res.cyclotron.totalCalibratedMbq.toLocaleString()} MBq)`;

    if (elCycBreakdown) {
      elCycBreakdown.innerHTML = '';
      const keys = Object.keys(res.cyclotron.breakdown);
      if (keys.length === 0) {
        elCycBreakdown.innerHTML = '<div style="color: #94a3b8; font-style: italic;">No hay pacientes de FDG o Colina para este día.</div>';
      } else {
        keys.forEach(k => {
          const item = res.cyclotron.breakdown[k];
          const div = document.createElement('div');
          div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: #f0f9ff; border-radius: 6px; border-left: 3px solid #0284c7;';
          div.innerHTML = `
            <span>💊 <strong>${k}</strong> (${item.count} pac.):</span>
            <span style="font-weight: 700; color: #0369a1;">${item.calibratedMci.toFixed(1)} mCi <span style="font-size:0.72rem; color:#64748b;">(${item.calibratedMbq.toLocaleString()} MBq)</span></span>
          `;
          elCycBreakdown.appendChild(div);
        });
      }
    }

    // Tarjeta 2: Radiofarmacia (Galio-68)
    const elRadCount = document.getElementById('radiopharmacy-patient-count');
    const elRadMci = document.getElementById('radiopharmacy-total-calibrated-mci');
    const elRadMbq = document.getElementById('radiopharmacy-total-mbq');
    const elRadBreakdown = document.getElementById('radiopharmacy-breakdown-list');

    if (elRadCount) elRadCount.textContent = res.radiopharmacy.patientCount;
    if (elRadMci) elRadMci.textContent = `${res.radiopharmacy.totalCalibratedMci.toFixed(1)} mCi`;
    if (elRadMbq) elRadMbq.textContent = `(${res.radiopharmacy.totalCalibratedMbq.toLocaleString()} MBq)`;

    if (elRadBreakdown) {
      elRadBreakdown.innerHTML = '';
      const keys = Object.keys(res.radiopharmacy.breakdown);
      if (keys.length === 0) {
        elRadBreakdown.innerHTML = '<div style="color: #94a3b8; font-style: italic;">No hay pacientes con Galio para este día.</div>';
      } else {
        keys.forEach(k => {
          const item = res.radiopharmacy.breakdown[k];
          const div = document.createElement('div');
          div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: #faf5ff; border-radius: 6px; border-left: 3px solid #7e22ce;';
          div.innerHTML = `
            <span>🧪 <strong>${k}</strong> (${item.count} pac.):</span>
            <span style="font-weight: 700; color: #7e22ce;">${item.calibratedMci.toFixed(1)} mCi <span style="font-size:0.72rem; color:#64748b;">(${item.calibratedMbq.toLocaleString()} MBq)</span></span>
          `;
          elRadBreakdown.appendChild(div);
        });
      }
    }

    // Tarjeta 3: Curium Madrid (PSMA)
    const elCurCount = document.getElementById('curium-patient-count');
    const elCurMci = document.getElementById('curium-total-calibrated-mci');
    const elCurMbq = document.getElementById('curium-total-mbq');
    const elCurBreakdown = document.getElementById('curium-breakdown-list');

    if (elCurCount) elCurCount.textContent = res.curium.patientCount;
    if (elCurMci) elCurMci.textContent = `${res.curium.totalCalibratedMci.toFixed(1)} mCi`;
    if (elCurMbq) elCurMbq.textContent = `(${res.curium.totalCalibratedMbq.toLocaleString()} MBq)`;

    if (elCurBreakdown) {
      elCurBreakdown.innerHTML = '';
      const keys = Object.keys(res.curium.breakdown);
      if (keys.length === 0) {
        elCurBreakdown.innerHTML = '<div style="color: #94a3b8; font-style: italic;">No hay pacientes con PSMA para este día.</div>';
      } else {
        keys.forEach(k => {
          const item = res.curium.breakdown[k];
          const div = document.createElement('div');
          div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; padding: 4px 8px; background: #fff7ed; border-radius: 6px; border-left: 3px solid #ea580c;';
          div.innerHTML = `
            <span>🏢 <strong>${k}</strong> (${item.count} pac.):</span>
            <span style="font-weight: 700; color: #c2410c;">${item.calibratedMci.toFixed(1)} mCi <span style="font-size:0.72rem; color:#64748b;">(${item.calibratedMbq.toLocaleString()} MBq)</span></span>
          `;
          elCurBreakdown.appendChild(div);
        });
      }
    }

    // Tabla detallada de dosimetría paciente a paciente
    const tbody = document.getElementById('dose-order-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      if (res.items.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="10" style="text-align: center; padding: 2rem; color: #64748b; font-style: italic;">
              No hay citas programadas para el día ${dateStr}.
            </td>
          </tr>
        `;
      } else {
        res.items.forEach(it => {
          const tr = document.createElement('tr');
          const isAft = it.shiftLabel === 'Tarde';
          const shiftBadge = isAft
            ? '<span class="badge" style="background:#fef3c7; color:#b45309; font-size:0.65rem; padding:1px 4px; margin-left:2px;">Tarde</span>'
            : '';

          const weightDisplay = it.weightKnown
            ? `<strong>${it.weightKg} kg</strong>`
            : `<span style="color:#64748b;" title="Peso no registrado en petición, se asume adulto estándar 70 kg">70 kg*</span>`;

          const destBadge = it.rfInfo.badgeHtml;

          const confirmBadge = it.isConfirmed
            ? `<span class="badge" style="background:#ecfdf5; color:#065f46; border:1px solid #10b981; font-weight:700;">✅ Confirmado</span>`
            : `<span class="badge" style="background:#fef3c7; color:#92400e; border:1px solid #fde68a;">⏳ Pendiente</span>`;

          tr.innerHTML = `
            <td style="text-align: center; font-weight: 700;">
              ${it.slotTimeFormatted}${shiftBadge}
            </td>
            <td>
              <div style="font-weight: 700; color: #004868;">${escapeHTML(it.patientName)}</div>
              <div style="font-size: 0.72rem; color: #64748b;">NHC: ${escapeHTML(it.nhc)}</div>
            </td>
            <td style="text-align: center;">${weightDisplay}</td>
            <td>
              <span class="badge-rf ${getRfClass(it.radiofarmaco)}">${escapeHTML(it.radiofarmaco)}</span>
            </td>
            <td>${destBadge}</td>
            <td style="text-align: right;" title="${escapeHTML(it.doseExplanation)}">
              <strong>${it.injectedDoseMci.toFixed(1)} mCi</strong>
              <div style="font-size: 0.68rem; color: #64748b;">${it.rfInfo.isGallium ? '5 mCi fijos' : '1 mCi/10kg'}</div>
            </td>
            <td style="text-align: center;" title="Transcurrido desde calibración ${it.refCalStr}">
              <span style="font-weight: 600; color: #475569;">+${it.deltaTMin} min</span>
              <div style="font-size: 0.68rem; color: #94a3b8;">Cal. ${it.refCalStr}</div>
            </td>
            <td style="text-align: center;">
              <span class="decay-factor-pill" title="Factor de decaimiento e^(λ·Δt)">×${it.decayFactor.toFixed(2)}</span>
            </td>
            <td style="text-align: right;" class="calibrated-col">
              <div style="font-weight: 800; font-size: 0.95rem; color: #004868;">${it.calibratedMci.toFixed(1)} mCi</div>
              <div style="font-size: 0.72rem; color: #0284c7; font-weight: 600;">${it.calibratedMbq} MBq</div>
            </td>
            <td style="text-align: center;">${confirmBadge}</td>
          `;
          tbody.appendChild(tr);
        });
      }
    }
  }

  function copyCyclotronOrderText() {
    const res = state.lastCalculatedDoseOrder;
    if (!res) {
      alert("No hay cálculos disponibles.");
      return;
    }
    const parts = res.dateStr.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const formattedDate = `${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;

    let text = `📦 PETICIÓN OFICIAL DE RADIOFÁRMACOS AL CICLOTRÓN (FDG GLUCOSA Y COLINA)\n`;
    text += `🏥 SERGAS - Complexo Hospitalario Universitario · Servicio de Medicina Nuclear PET/CT\n`;
    text += `📅 Fecha de Suministro: ${formattedDate} (${res.dateStr})\n`;
    text += `⏰ Hora de Calibración: Mañana ${res.calMorningStr} h · Tarde ${res.calAfternoonStr} h\n`;
    text += `🛡️ Margen Técnico Aplicado: +${res.marginPct}%\n`;
    text += `----------------------------------------------------------\n`;
    text += `👥 TOTAL PACIENTES CICLOTRÓN (FDG / Colina): ${res.cyclotron.patientCount} pacientes\n`;
    text += `⚡ ACTIVIDAD TOTAL CALIBRADA A PEDIR: ${res.cyclotron.totalCalibratedMci.toFixed(1)} mCi (${res.cyclotron.totalCalibratedMbq.toLocaleString()} MBq)\n\n`;
    text += `📋 DESGLOSE POR RADIOFÁRMACO:\n`;

    const keys = Object.keys(res.cyclotron.breakdown);
    if (keys.length === 0) {
      text += `(Sin peticiones de Ciclotrón para este día)\n`;
    } else {
      keys.forEach(k => {
        const item = res.cyclotron.breakdown[k];
        text += `• ${k}: ${item.count} pacientes -> ${item.calibratedMci.toFixed(1)} mCi (${item.calibratedMbq.toLocaleString()} MBq)\n`;
      });
    }

    text += `\n🔬 DETALLE DE INYECCIONES Y DOSIS:\n`;
    res.items.filter(it => it.rfInfo.destination === 'Ciclotrón').forEach((it, idx) => {
      text += `${idx + 1}. [${it.slotTimeFormatted}] ${it.patientName} (NHC: ${it.nhc}, ${it.weightKg} kg) - ${it.radiofarmaco} -> Dosis iny: ${it.injectedDoseMci.toFixed(1)} mCi | Decaimiento: +${it.deltaTMin} min (x${it.decayFactor.toFixed(2)}) -> Pedir: ${it.calibratedMci.toFixed(1)} mCi\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("✅ ¡Petición al Ciclotrón copiada al portapapeles!\nPuedes pegarla directamente en un correo o sistema de pedidos.");
      }).catch(() => {
        prompt("Copia el texto del pedido al Ciclotrón:", text);
      });
    } else {
      prompt("Copia el texto del pedido al Ciclotrón:", text);
    }
  }

  function copyRadiopharmacyOrderText() {
    const res = state.lastCalculatedDoseOrder;
    if (!res) {
      alert("No hay cálculos disponibles.");
      return;
    }
    const parts = res.dateStr.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const formattedDate = `${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;

    let text = `🧪 PETICIÓN INTERNA A RADIOFARMACIA HOSPITALARIA (GALIO-68 / GENERADOR 68Ge/68Ga)\n`;
    text += `🏥 SERGAS - Complexo Hospitalario Universitario · Unidad PET/CT\n`;
    text += `📅 Fecha de Exploración: ${formattedDate} (${res.dateStr})\n`;
    text += `⏰ Hora de Calibración: ${res.calMorningStr} h\n`;
    text += `🛡️ Regla de Dosis: 5.0 mCi fijos por paciente (Galio-68 PSMA / Dotatote) · Margen: +${res.marginPct}%\n`;
    text += `----------------------------------------------------------\n`;
    text += `👥 TOTAL PACIENTES GALIO-68 / RADIOFARMACIA: ${res.radiopharmacy.patientCount} pacientes\n`;
    text += `⚡ ACTIVIDAD TOTAL CALIBRADA A PREPARAR: ${res.radiopharmacy.totalCalibratedMci.toFixed(1)} mCi (${res.radiopharmacy.totalCalibratedMbq.toLocaleString()} MBq)\n\n`;
    text += `📋 DESGLOSE POR PRODUCTO:\n`;

    const keys = Object.keys(res.radiopharmacy.breakdown);
    if (keys.length === 0) {
      text += `(Sin pacientes de Galio-68 para este día)\n`;
    } else {
      keys.forEach(k => {
        const item = res.radiopharmacy.breakdown[k];
        text += `• ${k}: ${item.count} pacientes -> ${item.calibratedMci.toFixed(1)} mCi (${item.calibratedMbq.toLocaleString()} MBq)\n`;
      });
    }

    text += `\n🔬 DETALLE CRONOGRAMA DE ELUCIÓN E INYECCIÓN:\n`;
    res.items.filter(it => it.rfInfo.destination === 'Radiofarmacia').forEach((it, idx) => {
      text += `${idx + 1}. [${it.slotTimeFormatted}] ${it.patientName} (NHC: ${it.nhc}) - ${it.radiofarmaco} -> Dosis iny: ${it.injectedDoseMci.toFixed(1)} mCi | Decaimiento: +${it.deltaTMin} min (x${it.decayFactor.toFixed(2)}) -> Calibrada: ${it.calibratedMci.toFixed(1)} mCi\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("✅ ¡Petición a la Radiofarmacia copiada al portapapeles!\nPuedes enviarla al equipo de radiofarmacia.");
      }).catch(() => {
        prompt("Copia el texto de la petición a Radiofarmacia:", text);
      });
    } else {
      prompt("Copia el texto de la petición a Radiofarmacia:", text);
    }
  }

  function copyCuriumOrderText() {
    const res = state.lastCalculatedDoseOrder;
    if (!res) {
      alert("No hay cálculos disponibles.");
      return;
    }
    const parts = res.dateStr.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const formattedDate = `${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;

    let text = `🏢 PETICIÓN OFICIAL A CURIUM MADRID (FLÚOR-18 PSMA - SUMINISTRO EXTERNO Y ENVÍO URGENTE)\n`;
    text += `🏥 SERGAS - Complexo Hospitalario Universitario · Servicio de Medicina Nuclear PET/CT\n`;
    text += `📅 Fecha de Suministro: ${formattedDate} (${res.dateStr})\n`;
    text += `⏰ Hora de Calibración: Mañana ${res.calMorningStr} h · Tarde ${res.calAfternoonStr} h\n`;
    text += `🛡️ Margen Técnico Aplicado: +${res.marginPct}%\n`;
    text += `----------------------------------------------------------\n`;
    text += `👥 TOTAL PACIENTES FLÚOR-18 PSMA (CURIUM MADRID): ${res.curium.patientCount} pacientes\n`;
    text += `⚡ ACTIVIDAD TOTAL CALIBRADA A PEDIR: ${res.curium.totalCalibratedMci.toFixed(1)} mCi (${res.curium.totalCalibratedMbq.toLocaleString()} MBq)\n\n`;
    text += `📋 DESGLOSE POR RADIOFÁRMACO:\n`;

    const keys = Object.keys(res.curium.breakdown);
    if (keys.length === 0) {
      text += `(Sin peticiones de PSMA para este día)\n`;
    } else {
      keys.forEach(k => {
        const item = res.curium.breakdown[k];
        text += `• ${k}: ${item.count} pacientes -> ${item.calibratedMci.toFixed(1)} mCi (${item.calibratedMbq.toLocaleString()} MBq)\n`;
      });
    }

    text += `\n🔬 DETALLE DE INYECCIONES Y DOSIS PSMA:\n`;
    res.items.filter(it => it.rfInfo.destination === 'Curium Madrid').forEach((it, idx) => {
      text += `${idx + 1}. [${it.slotTimeFormatted}] ${it.patientName} (NHC: ${it.nhc}, ${it.weightKg} kg) - ${it.radiofarmaco} -> Dosis iny: ${it.injectedDoseMci.toFixed(1)} mCi | Decaimiento: +${it.deltaTMin} min (x${it.decayFactor.toFixed(2)}) -> Pedir: ${it.calibratedMci.toFixed(1)} mCi\n`;
    });

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("✅ ¡Petición a Curium Madrid copiada al portapapeles!\nPuedes pegarla directamente para tramitar el pedido urgente.");
      }).catch(() => {
        prompt("Copia el texto del pedido a Curium Madrid:", text);
      });
    } else {
      prompt("Copia el texto del pedido a Curium Madrid:", text);
    }
  }

  function copyFullOrderText() {
    const res = state.lastCalculatedDoseOrder;
    if (!res) return;
    const parts = res.dateStr.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const formattedDate = `${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;

    let text = `📦 RESUMEN COMPLETO DE PEDIDO DE RADIOFÁRMACOS Y DOSIS - SERGAS\n`;
    text += `📅 Fecha: ${formattedDate} (${res.dateStr})\n`;
    text += `👥 Total Pacientes Citados: ${res.totalPatients} (${res.confirmedCount} confirmados)\n\n`;
    text += `1. CICLOTRÓN (FDG Glucosa y 18F-Colina · 1 mCi/10 kg):\n`;
    text += `   - Pacientes: ${res.cyclotron.patientCount}\n`;
    text += `   - Actividad Calibrada Total: ${res.cyclotron.totalCalibratedMci.toFixed(1)} mCi (${res.cyclotron.totalCalibratedMbq.toLocaleString()} MBq)\n\n`;
    text += `2. RADIOFARMACIA (Galio-68 PSMA y Dotatote · 5 mCi fijos generador):\n`;
    text += `   - Pacientes: ${res.radiopharmacy.patientCount}\n`;
    text += `   - Actividad Calibrada Total: ${res.radiopharmacy.totalCalibratedMci.toFixed(1)} mCi (${res.radiopharmacy.totalCalibratedMbq.toLocaleString()} MBq)\n\n`;
    text += `3. CURIUM MADRID (Flúor-18 PSMA · Suministro Urgente Madrid):\n`;
    text += `   - Pacientes: ${res.curium.patientCount}\n`;
    text += `   - Actividad Calibrada Total: ${res.curium.totalCalibratedMci.toFixed(1)} mCi (${res.curium.totalCalibratedMbq.toLocaleString()} MBq)\n`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert("✅ ¡Resumen completo copiado al portapapeles!");
      }).catch(() => {
        prompt("Copia el resumen completo:", text);
      });
    } else {
      prompt("Copia el resumen completo:", text);
    }
  }

  function downloadRadiopharmacyOrderCSV() {
    const res = state.lastCalculatedDoseOrder;
    if (!res) return;

    let csv = '\uFEFF'; // BOM UTF-8 para Excel
    csv += 'Fecha;Hora_Cita;Paciente;NHC;Peso_kg;Radiofarmaco;Destino;Dosis_Inyectar_mCi;Delta_t_min;Factor_Decaimiento;Dosis_Calibrada_mCi;Actividad_MBq;Estado_Confirmacion\r\n';

    res.items.forEach(it => {
      csv += [
        res.dateStr,
        `"${it.slotTimeFormatted}"`,
        `"${it.patientName.replace(/"/g, '""')}"`,
        `"${it.nhc}"`,
        it.weightKg,
        `"${it.radiofarmaco}"`,
        `"${it.rfInfo.destination}"`,
        it.injectedDoseMci.toFixed(1).replace('.', ','),
        it.deltaTMin,
        it.decayFactor.toFixed(2).replace('.', ','),
        it.calibratedMci.toFixed(1).replace('.', ','),
        it.calibratedMbq,
        it.isConfirmed ? 'CONFIRMADO' : 'PENDIENTE'
      ].join(';') + '\r\n';
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Pedido_Radiofarmacos_SERGAS_${res.dateStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function printRadiopharmacyOrderWindow() {
    const res = state.lastCalculatedDoseOrder;
    if (!res) {
      alert("No hay datos de dosimetría para imprimir.");
      return;
    }

    const parts = res.dateStr.split('-');
    const dt = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    const dayNames = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];
    const formattedDate = `${dayNames[dt.getDay()]} ${dt.getDate()}/${dt.getMonth() + 1}/${dt.getFullYear()}`;

    const printWindow = window.open('', '_blank', 'width=1050,height=850');
    if (!printWindow) {
      alert("Por favor habilita las ventanas emergentes (popups) para imprimir el pedido.");
      return;
    }

    let cycRows = '';
    const cycKeys = Object.keys(res.cyclotron.breakdown);
    if (cycKeys.length === 0) {
      cycRows = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic;">No hay pedidos de FDG o Colina para este día.</td></tr>';
    } else {
      cycKeys.forEach(k => {
        const item = res.cyclotron.breakdown[k];
        cycRows += `
          <tr>
            <td style="font-weight:bold; color:#0369a1;">${escapeHTML(k)}</td>
            <td style="text-align:center;">${item.count} pac.</td>
            <td style="text-align:right; font-weight:bold;">${item.calibratedMci.toFixed(1)} mCi</td>
            <td style="text-align:right; color:#64748b;">${item.calibratedMbq.toLocaleString()} MBq</td>
          </tr>
        `;
      });
    }

    let radRows = '';
    const radKeys = Object.keys(res.radiopharmacy.breakdown);
    if (radKeys.length === 0) {
      radRows = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic;">No hay pedidos de Galio-68 para este día.</td></tr>';
    } else {
      radKeys.forEach(k => {
        const item = res.radiopharmacy.breakdown[k];
        radRows += `
          <tr>
            <td style="font-weight:bold; color:#7e22ce;">${escapeHTML(k)}</td>
            <td style="text-align:center;">${item.count} pac.</td>
            <td style="text-align:right; font-weight:bold;">${item.calibratedMci.toFixed(1)} mCi</td>
            <td style="text-align:right; color:#64748b;">${item.calibratedMbq.toLocaleString()} MBq</td>
          </tr>
        `;
      });
    }

    let curRows = '';
    const curKeys = Object.keys(res.curium.breakdown);
    if (curKeys.length === 0) {
      curRows = '<tr><td colspan="4" style="text-align:center; color:#94a3b8; font-style:italic;">No hay pedidos de PSMA para este día.</td></tr>';
    } else {
      curKeys.forEach(k => {
        const item = res.curium.breakdown[k];
        curRows += `
          <tr>
            <td style="font-weight:bold; color:#c2410c;">${escapeHTML(k)}</td>
            <td style="text-align:center;">${item.count} pac.</td>
            <td style="text-align:right; font-weight:bold;">${item.calibratedMci.toFixed(1)} mCi</td>
            <td style="text-align:right; color:#64748b;">${item.calibratedMbq.toLocaleString()} MBq</td>
          </tr>
        `;
      });
    }

    let patientRows = '';
    res.items.forEach((it, idx) => {
      let destTag = '';
      if (it.rfInfo.destination === 'Ciclotrón') {
        destTag = '<span style="font-size:10px; font-weight:bold; color:#0369a1;">🏭 Ciclotrón</span>';
      } else if (it.rfInfo.destination === 'Radiofarmacia') {
        destTag = '<span style="font-size:10px; font-weight:bold; color:#7e22ce;">🧪 Radiofarmacia</span>';
      } else {
        destTag = '<span style="font-size:10px; font-weight:bold; color:#c2410c;">🏢 Curium Madrid</span>';
      }

      patientRows += `
        <tr>
          <td style="text-align:center; font-weight:bold;">${it.slotTimeFormatted}</td>
          <td>
            <strong>${escapeHTML(it.patientName)}</strong><br>
            <span style="font-size:10px; color:#64748b;">NHC: ${escapeHTML(it.nhc)}</span>
          </td>
          <td style="text-align:center;">${it.weightKg} kg</td>
          <td><strong>${escapeHTML(it.radiofarmaco)}</strong></td>
          <td>${destTag}</td>
          <td style="text-align:right;">${it.injectedDoseMci.toFixed(1)} mCi</td>
          <td style="text-align:center;">+${it.deltaTMin} min</td>
          <td style="text-align:center; font-weight:bold; color:#0284c7;">×${it.decayFactor.toFixed(2)}</td>
          <td style="text-align:right; font-weight:bold; font-size:13px; color:#0f172a;">${it.calibratedMci.toFixed(1)} mCi</td>
          <td style="text-align:right; color:#64748b; font-size:11px;">${it.calibratedMbq} MBq</td>
        </tr>
      `;
    });

    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="utf-8">
        <title>Hoja Oficial de Pedido de Radiofármacos - SERGAS - ${res.dateStr}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #0f172a; margin: 25px; background: #fff; font-size: 12px; }
          .header { border-bottom: 3px solid #004868; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center; }
          .sergas-title { font-size: 16px; font-weight: bold; color: #004868; text-transform: uppercase; }
          .sergas-sub { font-size: 12px; color: #52718a; margin-top: 3px; }
          .sheet-info { text-align: right; }
          .date-badge { font-size: 14px; font-weight: bold; background: #eff8fc; border: 1.5px solid #bae6fd; padding: 5px 12px; border-radius: 6px; color: #004868; margin-top: 4px; display: inline-block; }
          
          .rules-bar { background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #0284c7; padding: 8px 12px; border-radius: 4px; margin-bottom: 18px; font-size: 11px; color: #334155; }
          
          .grid-suppliers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 20px; }
          .supplier-box { border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; background: #fff; }
          .supplier-box.cyclotron { border-top: 4px solid #0284c7; background: #f0f9ff; }
          .supplier-box.radiopharmacy { border-top: 4px solid #9333ea; background: #faf5ff; }
          .supplier-box.curium { border-top: 4px solid #ea580c; background: #fff7ed; }
          .supplier-box h3 { margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; }
          .kpi-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; }
          .kpi-val { font-size: 15px; font-weight: bold; }
          
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
          th { background: #e2e8f0; color: #0f172a; text-transform: uppercase; font-size: 10px; padding: 6px 8px; border-bottom: 2px solid #cbd5e1; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          
          .signatures { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
          .sig-box { border-top: 1px solid #94a3b8; padding-top: 8px; font-size: 11px; color: #475569; text-align: center; }
          
          .no-print-bar { background: #eff8fc; border: 1.5px solid #bae6fd; border-radius: 8px; padding: 10px 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
          @media print {
            body { margin: 0; font-size: 11px; }
            .no-print-bar { display: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="color: #0369a1; font-weight: bold;">
            🖨️ Hoja Oficial de Petición y Pedido de Dosis de Radiofármacos lista para imprimir o exportar a PDF
          </div>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.print()" style="background: #007eb4; color: white; border: none; padding: 7px 16px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">🖨️ Imprimir Pedido</button>
            <button onclick="window.close()" style="background: #e2e8f0; color: #334155; border: none; padding: 7px 12px; font-size: 12px; font-weight: bold; border-radius: 6px; cursor: pointer;">✕ Cerrar</button>
          </div>
        </div>

        <div class="header">
          <div>
            <div class="sergas-title">🏥 SERVIZO GALEGO DE SAÚDE · COMPLEXO HOSPITALARIO UNIVERSITARIO</div>
            <div class="sergas-sub">Servicio de Medicina Nuclear · Unidad PET/CT · Solicitud Oficial de Radiofármacos</div>
          </div>
          <div class="sheet-info">
            <div style="font-size:11px; color:#64748b; font-weight:bold;">FECHA DE LA PRUEBA</div>
            <div class="date-badge">📅 ${formattedDate}</div>
          </div>
        </div>

        <div class="rules-bar">
          <strong>📋 Criterios Dosimétricos Oficiales y Origen del Suministro:</strong><br>
          • <strong>Ciclotrón (FDG Glucosa y Colina):</strong> Flúor-18 (1 mCi / 10 kg). T½ = 109.8 min. Calibración: ${res.calMorningStr} h / ${res.calAfternoonStr} h.<br>
          • <strong>Radiofarmacia (Galio-68):</strong> 68Ga-DOTATATE / Somatostatina (5.0 mCi fijos generador). T½ = 67.7 min. Calibración: ${res.calMorningStr} h.<br>
          • <strong>Curium Madrid (PSMA):</strong> Fluor-PSMA y 68Ga-PSMA (suministro urgente Madrid). Margen técnico: +${res.marginPct}%.
        </div>

        <div class="grid-suppliers">
          <!-- Bloque Ciclotrón -->
          <div class="supplier-box cyclotron">
            <h3 style="color:#0369a1;">🏭 1. PEDIDO AL CICLOTRÓN (FDG / Colina)</h3>
            <div class="kpi-row">
              <span>Pacientes:</span>
              <span class="kpi-val" style="color:#0284c7;">${res.cyclotron.patientCount} pac.</span>
            </div>
            <div class="kpi-row">
              <span>Actividad Calibrada:</span>
              <span class="kpi-val" style="color:#0369a1;">${res.cyclotron.totalCalibratedMci.toFixed(1)} mCi <span style="font-size:10px;">(${res.cyclotron.totalCalibratedMbq.toLocaleString()} MBq)</span></span>
            </div>
            <table style="margin-top:6px;">
              <thead>
                <tr><th>Fármaco</th><th style="text-align:center;">Pac.</th><th style="text-align:right;">mCi</th><th style="text-align:right;">MBq</th></tr>
              </thead>
              <tbody>${cycRows}</tbody>
            </table>
          </div>

          <!-- Bloque Radiofarmacia -->
          <div class="supplier-box radiopharmacy">
            <h3 style="color:#7e22ce;">🧪 2. PEDIDO A RADIOFARMACIA (Galio-68)</h3>
            <div class="kpi-row">
              <span>Pacientes:</span>
              <span class="kpi-val" style="color:#9333ea;">${res.radiopharmacy.patientCount} pac.</span>
            </div>
            <div class="kpi-row">
              <span>Actividad Calibrada:</span>
              <span class="kpi-val" style="color:#7e22ce;">${res.radiopharmacy.totalCalibratedMci.toFixed(1)} mCi <span style="font-size:10px;">(${res.radiopharmacy.totalCalibratedMbq.toLocaleString()} MBq)</span></span>
            </div>
            <table style="margin-top:6px;">
              <thead>
                <tr><th>Producto</th><th style="text-align:center;">Pac.</th><th style="text-align:right;">mCi</th><th style="text-align:right;">MBq</th></tr>
              </thead>
              <tbody>${radRows}</tbody>
            </table>
          </div>

          <!-- Bloque Curium Madrid -->
          <div class="supplier-box curium">
            <h3 style="color:#c2410c;">🏢 3. PEDIDO A CURIUM MADRID (PSMA)</h3>
            <div class="kpi-row">
              <span>Pacientes:</span>
              <span class="kpi-val" style="color:#ea580c;">${res.curium.patientCount} pac.</span>
            </div>
            <div class="kpi-row">
              <span>Actividad Calibrada:</span>
              <span class="kpi-val" style="color:#c2410c;">${res.curium.totalCalibratedMci.toFixed(1)} mCi <span style="font-size:10px;">(${res.curium.totalCalibratedMbq.toLocaleString()} MBq)</span></span>
            </div>
            <table style="margin-top:6px;">
              <thead>
                <tr><th>Fármaco</th><th style="text-align:center;">Pac.</th><th style="text-align:right;">mCi</th><th style="text-align:right;">MBq</th></tr>
              </thead>
              <tbody>${curRows}</tbody>
            </table>
          </div>
        </div>
              </thead>
              <tbody>${radRows}</tbody>
            </table>
          </div>
        </div>

        <h3 style="margin: 18px 0 6px 0; font-size: 13px; color: #004868; text-transform: uppercase;">
          🔬 Cronograma de Inyección y Dosimetría Individual por Paciente (${res.totalPatients} pacientes citados · ${res.confirmedCount} confirmados)
        </h3>

        <table>
          <thead>
            <tr>
              <th style="text-align:center;">Hora</th>
              <th>Paciente / NHC</th>
              <th style="text-align:center;">Peso</th>
              <th>Radiofármaco</th>
              <th>Destino</th>
              <th style="text-align:right;">Dosis Iny.</th>
              <th style="text-align:center;">Δt Decaimiento</th>
              <th style="text-align:center;">Factor DF</th>
              <th style="text-align:right;">Dosis Pedir</th>
              <th style="text-align:right;">Actividad</th>
            </tr>
          </thead>
          <tbody>
            ${patientRows}
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <strong>Fdo. Facultativo Especialista en Medicina Nuclear</strong><br>
            Nº Colegiado / Firma y Sello Oficial
          </div>
          <div class="sig-box">
            <strong>Fdo. Radiofarmacéutico Especialista Responsable</strong><br>
            Validación de Recepción / Marcaje y Registro
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  }

  // Event Listeners para Modales de Pedido
  const btnOrderDayFromModal = document.getElementById('btn-order-day-from-modal');
  if (btnOrderDayFromModal) {
    btnOrderDayFromModal.addEventListener('click', () => {
      const curDate = state.activeAgendaDayDate || formatDate(new Date());
      closeDayAgendaModal();
      confirmDayAndGenerateDoseOrder(curDate);
    });
  }

  const btnUnassignDayFromModal = document.getElementById('btn-unassign-day-from-modal');
  if (btnUnassignDayFromModal) {
    btnUnassignDayFromModal.addEventListener('click', () => {
      const curDate = state.activeAgendaDayDate || formatDate(new Date());
      closeDayAgendaModal();
      resetDayPatientCitations(curDate);
    });
  }

  const btnOpenOrderModal = document.getElementById('btn-open-order-modal');
  if (btnOpenOrderModal) {
    btnOpenOrderModal.addEventListener('click', () => {
      const curDate = state.activeAgendaDayDate || (state.submissions.find(s => s.fechaCita && !s.requiresProposal) || {}).fechaCita || formatDate(new Date());
      openRadiopharmacyOrderModal(curDate, false);
    });
  }

  // Exposición de funciones en window para invocación desde HTML y eventos
  window.getRadiopharmacyInfo = getRadiopharmacyInfo;
  window.calculateDayDoseOrder = calculateDayDoseOrder;
  window.confirmDayAndGenerateDoseOrder = confirmDayAndGenerateDoseOrder;
  window.openRadiopharmacyOrderModal = openRadiopharmacyOrderModal;
  window.closeRadiopharmacyOrderModal = closeRadiopharmacyOrderModal;
  window.onDoseOrderDateChange = onDoseOrderDateChange;
  window.recalculateCurrentDoseOrder = recalculateCurrentDoseOrder;
  window.copyCyclotronOrderText = copyCyclotronOrderText;
  window.copyRadiopharmacyOrderText = copyRadiopharmacyOrderText;
  window.copyCuriumOrderText = copyCuriumOrderText;
  window.copyFullOrderText = copyFullOrderText;
  window.downloadRadiopharmacyOrderCSV = downloadRadiopharmacyOrderCSV;
  window.printRadiopharmacyOrderWindow = printRadiopharmacyOrderWindow;
  window.confirmAndSendAudioguia = confirmAndSendAudioguia;
  window.openAudioguiaModal = openAudioguiaModal;

  // Soporte directo para abrir volante desde parámetros URL (ej. index.html?volante=sub_69558833 o ?pdf=...)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const volanteParam = urlParams.get('volante') || urlParams.get('pdf');
    if (volanteParam) {
      setTimeout(() => {
        openPatientVolantePrintWindow(volanteParam, true);
      }, 700);
    }

    // Soporte directo para búsqueda de paciente por URL (ej. index.html?buscar=Ignacio o ?q=NHC-226739)
    const searchParam = urlParams.get('search') || urlParams.get('q') || urlParams.get('buscar');
    if (searchParam && topSearchInput) {
      setTimeout(() => {
        topSearchInput.value = searchParam;
        executeLiveTopSearch(searchParam);
      }, 600);
    }
  } catch (e) { }
});

