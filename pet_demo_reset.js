/**
 * SISTEMA DE XESTIÓN E REINICIO AUTOMÁTICO 24H DA DEMO PET/CT — GALARIA · SERGAS
 * 
 * Funcións principais:
 * 1. Detección de cambio de día ou >24h transcorridas dende o último reinicio.
 * 2. Restablecemento automático dos datos de demostración a estado virxe:
 *    - Reasignación de citas activas para HOXE e MAÑÁ.
 *    - Peticións non triables limpas no seu cartafol sen citación.
 *    - Limpeza de altas hospitalarias, trazadores inxectados e ordes médicas de proba.
 * 3. Botón manual de "Reiniciar Demo" accesible para o xerente ou calquera avaliador.
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
    return;
  }

  const ONE_DAY_MS = 24 * 60 * 60 * 1000;

  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getTomorrowString() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  const STORAGE_KEYS_TO_CLEAR = [
    'PET_DATABASE_MASTER_V4',
    'PET_TRIAGE_CITED_PATIENTS_V1',
    'PET_DELETED_DEPARTED_PATIENTS_V1',
    'PET_MEDICAL_PROTOCOLS_V1',
    'PET_SHARED_TSID_STATUS_V1',
    'PET_TSID_WORKLIST_V1',
    'PET_SHARED_DISCHARGE_V1',
    'PET_SHARED_LATE_SCAN_ORDERS_V1',
    'PET_SHARED_INJECTIONS_AND_MOBILITY_V1',
    'pet_ct_confirmations',
    'pet_ct_peonada_assignments',
    'pet_ct_freed_slots',
    'pet_ct_audioguia_sent',
    'pet_enfermeria_patients_state',
    'pet_patient_discharge_log',
    'PET_SHARED_NURSING_DOUBTS_V1'
  ];

  function executeDemoReset(isManual = false) {
    const today = getTodayString();
    console.log('[PET Demo Reset] Aplicando reinicio de simulación para a data:', today);

    // Conservar peticións creadas hoxe polo usuario durante o reinicio automático
    let preservedTodayPetitions = [];
    if (!isManual) {
      try {
        const masterStr = localStorage.getItem('PET_DATABASE_MASTER_V4');
        if (masterStr) {
          const parsedMaster = JSON.parse(masterStr);
          if (Array.isArray(parsedMaster)) {
            preservedTodayPetitions = parsedMaster.filter(item =>
              item &&
              item["Fecha Solicitud"] === today &&
              String(item["Submission ID"] || '').startsWith('sub_')
            );
          }
        }
      } catch (e) {}
    }

    STORAGE_KEYS_TO_CLEAR.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Error limpando clave de simulación:', key, e);
      }
    });

    if (preservedTodayPetitions.length > 0) {
      try {
        localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(preservedTodayPetitions));
      } catch (e) {}
    }

    try {
      localStorage.setItem('PET_DEMO_RESET_DATE', today);
      localStorage.setItem('PET_DEMO_RESET_TIMESTAMP', String(Date.now()));
    } catch (e) {}

    if (isManual) {
      window.location.reload();
    }
  }

  // Comprobar se corresponde auto-reinicio ao cargar a páxina ou limpeza inicial sen citas ficticias
  const todayStr = getTodayString();
  const lastResetDate = localStorage.getItem('PET_DEMO_RESET_DATE');
  const lastResetTimestamp = parseInt(localStorage.getItem('PET_DEMO_RESET_TIMESTAMP') || '0', 10);
  const cleanV2 = localStorage.getItem('PET_CLEAN_NO_FAKE_CITAS_V2');
  const now = Date.now();

  if (cleanV2 !== 'true' || !lastResetDate || lastResetDate !== todayStr || (now - lastResetTimestamp) > ONE_DAY_MS) {
    executeDemoReset(false);
    try { localStorage.setItem('PET_CLEAN_NO_FAKE_CITAS_V2', 'true'); } catch (e) {}
  }

  // Función global para chamadas dende botóns ou consola
  window.petResetDemo = function (silent = false) {
    if (!silent) {
      const confirmMsg = "⚠️ ¿Desexas restablecer tódolos datos de proba da simulación?\n\n" +
        "• Reasignaranse os pacientes citados para HOXE (" + todayStr + ") e MAÑÁ (" + getTomorrowString() + ").\n" +
        "• As 4 peticións non triables volverán ao seu cartafol pendentes de priorizar polo médico.\n" +
        "• Borraranse altas de enfermaría, pautas e ordes de proba para comezar dende cero.";
      if (!confirm(confirmMsg)) return;
    }
    executeDemoReset(true);
  };

  window.PET_DEMO_INFO = {
    today: todayStr,
    tomorrow: getTomorrowString(),
    lastResetDate: lastResetDate || todayStr,
    reset: window.petResetDemo
  };
})();
