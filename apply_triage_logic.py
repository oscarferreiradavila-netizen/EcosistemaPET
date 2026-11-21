import sys
import re

app_path = 'pet_ct_triage/web_app/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Original file length:", len(content))

# 1. Add Helper Functions and Cache Reset check near beginning (after state definition)
anchor_helper = "  window.state = state;"
replacement_helper = """  window.state = state;

  // ==============================================================================
  // GESTIÓN DE PACIENTES SIN CITAR Y PROTOCOLO HOSPITALIZADOS / MOV. REDUCIDA
  // ==============================================================================
  if (localStorage.getItem('PET_UNCITED_INITIALIZED_V6') !== 'true') {
    try {
      localStorage.removeItem('pet_ct_peonada_assignments');
      localStorage.removeItem('pet_ct_confirmations');
      localStorage.removeItem('pet_ct_freed_slots');
      localStorage.removeItem('pet_ct_audioguia_sent');
      localStorage.removeItem('PET_DATABASE_MASTER_V4');
      localStorage.setItem('PET_UNCITED_INITIALIZED_V6', 'true');
      state.peonadaAssignments = {};
      state.confirmations = {};
      state.freedSlots = {};
      state.audioguiaSent = {};
    } catch(e) {}
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
    const m = String(timeStr).match(/(\\d{2}:\\d{2})/);
    if (!m) return false;
    const time = m[1];
    const isAfternoon = String(timeStr).toLowerCase().includes('tarde') || parseInt(time) >= 14;
    if (!isAfternoon && time <= "08:30") {
      return true;
    }
    if (dateStr && typeof getDayAgendaConfig === 'function') {
      const cfg = getDayAgendaConfig(dateStr);
      if (cfg && cfg.morning && cfg.morning.startTime === time) {
        return true;
      }
    }
    return false;
  }

  /**
   * Desagenda a todos los pacientes dejándolos en lista de espera (sin citar).
   */
  function resetAllPatientCitations(suppressConfirm = false) {
    if (!suppressConfirm) {
      const ok = confirm("¿Deseas desagendar a TODOS los pacientes de la agenda y dejarlos 'Pendientes de Triaje' (sin citar)?\\n\\nPodrás ir citándolos tú automáticamente o manualmente según prioridad clínica.");
      if (!ok) return;
    }

    state.peonadaAssignments = {};
    state.confirmations = {};
    state.freedSlots = {};
    try {
      localStorage.removeItem('pet_ct_peonada_assignments');
      localStorage.removeItem('pet_ct_confirmations');
      localStorage.removeItem('pet_ct_freed_slots');
      localStorage.removeItem('pet_ct_audioguia_sent');
      localStorage.removeItem('PET_DATABASE_MASTER_V4');
      localStorage.setItem('PET_UNCITED_INITIALIZED_V6', 'true');
    } catch(e) {}

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
      }
    });

    try {
      const cleanRawList = state.submissions.map(s => s.raw || s);
      localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(cleanRawList));
    } catch(e) {}

    updateProposalsLists();
    state.occupiedMap = {};
    updateKPIs();
    renderWeeklyGrid();
    renderConfirmationsTable();
    renderProposalTables();
    renderSubmissionsTable();
    updateAgendaCapacityStats();

    if (!suppressConfirm) {
      alert("✅ Todos los pacientes (500) están ahora sin citar en la lista de espera.\\n\\nPuedes citarlos manualmente o utilizar el 'Triaje Inteligente' (dejando siempre hospitalizados y movilidad reducida de últimos).");
    }
  }

  window.getPatientMobilityHospitalizationInfo = getPatientMobilityHospitalizationInfo;
  window.isFirstSlotOfDayOrShift = isFirstSlotOfDayOrShift;
  window.resetAllPatientCitations = resetAllPatientCitations;"""

if anchor_helper in content:
    content = content.replace(anchor_helper, replacement_helper, 1)
    print("✓ Added Helper Functions & resetAllPatientCitations")
else:
    print("ERROR: anchor_helper not found!")
    sys.exit(1)

# 2. Update renderWeeklyGrid morning patient card
target_morning_card = """          slotCard.className = `slot-card ${rfClass}`;
          slotCard.setAttribute('data-id', p.id);
          slotCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="slot-time">⏰ <strong>${p.horaCita}</strong></div>
              <button type="button" class="btn btn-outline btn-pdf-card" data-id="${p.id}" onclick="event.stopPropagation(); openOfficialVolanteModal('${p.id}');" title="Ver Volante Oficial de Petición del Paciente (PDF)" style="padding: 2px 7px; font-size: 0.72rem; line-height: 1.2; font-weight: 700; color: #004868; border-color: #bae6fd; background: #ffffff; border-radius: 5px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">📄 PDF</button>
            </div>
            <div class="slot-patient">👤 <strong>${p.nombre}</strong> (${p.prioridad})${confirmTag}${audioTag}</div>
            <div class="slot-details" style="font-size: 0.76rem; color: #52718A; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
              <div>💊 <strong>Fármaco:</strong> <span class="badge-rf ${rfClass}">${p.radiofarmaco}</span></div>
              <div>📋 <strong>Estudio:</strong> ${p.tipoEstudio || 'Estudio PET/CT'}</div>
            </div>
          `;"""

replacement_morning_card = """          const mobInfo = getPatientMobilityHospitalizationInfo(p);
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
          `;"""

if target_morning_card in content:
    content = content.replace(target_morning_card, replacement_morning_card, 1)
    print("✓ Updated Morning Slot Card in renderWeeklyGrid")
else:
    print("ERROR: target_morning_card not found!")
    sys.exit(1)

# 3. Update renderWeeklyGrid afternoon patient card
target_afternoon_card = """          slotCard.className = `slot-card ${rfClass}`;
          slotCard.style.borderTop = '2px solid #f59e0b';
          slotCard.setAttribute('data-id', p.id);
          slotCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <div class="slot-time" style="color: #b45309;">⏰ <strong>${p.horaCita}</strong></div>
              <button type="button" class="btn btn-outline btn-pdf-card" data-id="${p.id}" onclick="event.stopPropagation(); openOfficialVolanteModal('${p.id}');" title="Ver Volante Oficial de Petición del Paciente (PDF)" style="padding: 2px 7px; font-size: 0.72rem; line-height: 1.2; font-weight: 700; color: #004868; border-color: #bae6fd; background: #ffffff; border-radius: 5px; cursor: pointer; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">📄 PDF</button>
            </div>
            <div class="slot-patient">👤 <strong>${p.nombre}</strong> (${p.prioridad})${confirmTag}${audioTag}</div>
            <div class="slot-details" style="font-size: 0.76rem; color: #52718A; margin-top: 3px; display: flex; flex-direction: column; gap: 2px;">
              <div>💊 <strong>Fármaco:</strong> <span class="badge-rf ${rfClass}">${p.radiofarmaco}</span></div>
              <div>📋 <strong>Estudio:</strong> ${p.tipoEstudio || 'Estudio PET/CT'}</div>
            </div>
            <div style="font-size: 0.68rem; font-weight:700; color:#D97706; background:#FFFBEB; border:1px solid #FDE68A; padding:2px 6px; border-radius:6px; margin-top:4px; display:inline-block;">🌆 Turno de Tarde</div>
          `;"""

replacement_afternoon_card = """          const mobInfoAft = getPatientMobilityHospitalizationInfo(p);
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
          `;"""

if target_afternoon_card in content:
    content = content.replace(target_afternoon_card, replacement_afternoon_card, 1)
    print("✓ Updated Afternoon Slot Card in renderWeeklyGrid")
else:
    print("ERROR: target_afternoon_card not found!")
    sys.exit(1)

# 4. Update runTriageAutoScheduler to place autonomous first, hospitalized/reduced mobility LAST
target_autoscheduler_shifts = """      // --- A) AUTO-RELLENO TURNO DE MAÑANA ---
      if (dayConfig.morning && dayConfig.morning.active) {
        const mSlots = generateShiftSlotTimes(dayConfig.morning);
        const freeMorningSlots = mSlots.filter(s => !occupiedMorningTimes.includes(s));
        const maxMorningAllowed = (dayConfig.morning.maxSlots || 8) - occupiedMorningTimes.length;

        for (let idx = 0; idx < Math.min(freeMorningSlots.length, maxMorningAllowed); idx++) {
          const slotTime = freeMorningSlots[idx];

          // Buscar el paciente de mayor prioridad compatible
          const patientIndex = waitingPatients.findIndex(p => {
            if (scheduledPatientIds.has(p.id)) return false;
            if (!matchesTreatment(p.radiofarmaco, dayConfig.morning.treatments)) return false;

            // Comprobar alerta de QT/RT reciente (< 21 días)
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

      // --- B) AUTO-RELLENO TURNO DE TARDE (SI ESTÁ ACTIVO) ---
      if (dayConfig.afternoon && dayConfig.afternoon.active) {
        const aftSlots = generateShiftSlotTimes(dayConfig.afternoon);
        const freeAftSlots = aftSlots.filter(s => !occupiedAfternoonTimes.includes(s));
        const maxAftAllowed = (dayConfig.afternoon.maxSlots || 6) - occupiedAfternoonTimes.length;

        for (let idx = 0; idx < Math.min(freeAftSlots.length, maxAftAllowed); idx++) {
          const slotTime = freeAftSlots[idx];

          // Buscar el paciente de mayor prioridad compatible con la tarde
          const patientIndex = waitingPatients.findIndex(p => {
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

          if (patientIndex !== -1) {
            const patient = waitingPatients[patientIndex];
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
      }"""

replacement_autoscheduler_shifts = """      // --- A) AUTO-RELLENO TURNO DE MAÑANA (PROTOCOLO: HOSPITALIZADOS/MOV. REDUCIDA DE ÚLTIMOS) ---
      if (dayConfig.morning && dayConfig.morning.active) {
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

      // --- B) AUTO-RELLENO TURNO DE TARDE (PROTOCOLO: HOSPITALIZADOS/MOV. REDUCIDA DE ÚLTIMOS) ---
      if (dayConfig.afternoon && dayConfig.afternoon.active) {
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
      }"""

if target_autoscheduler_shifts in content:
    content = content.replace(target_autoscheduler_shifts, replacement_autoscheduler_shifts, 1)
    print("✓ Updated runTriageAutoScheduler with late-shift ordering")
else:
    print("ERROR: target_autoscheduler_shifts not found!")
    sys.exit(1)

# 5. Update openSlotModal to display warning if cited in first slot
target_slot_modal_info = """    modalPatientInfo.innerHTML = `
      <div><strong>Paciente:</strong> ${patient.nombre}</div>
      <div><strong>Prioridad:</strong> <span class="badge ${patient.prioridad.includes('P1') ? 'badge-p1' : patient.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${patient.prioridad}</span></div>
      <div><strong>Estudio:</strong> ${patient.radiofarmaco}</div>
      <div><strong>🩺 Indicación / Motivo (Excel):</strong> <strong style="color: #0f4c81;">${patient.motivo || 'Estudio PET/CT Oncológico'}</strong></div>
      <div><strong>Cita Actual:</strong> 📅 ${patient.fechaCita} a las ⏰ ${patient.horaCita} h</div>"""

replacement_slot_modal_info = """    const mobModal = getPatientMobilityHospitalizationInfo(patient);
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

    modalPatientInfo.innerHTML = `
      ${badAlertModalHtml}
      <div><strong>Paciente:</strong> ${patient.nombre}</div>
      <div><strong>Prioridad:</strong> <span class="badge ${patient.prioridad.includes('P1') ? 'badge-p1' : patient.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${patient.prioridad}</span></div>
      ${mobModalBadgeHtml}
      <div><strong>Estudio:</strong> ${patient.radiofarmaco}</div>
      <div><strong>🩺 Indicación / Motivo (Excel):</strong> <strong style="color: #0f4c81;">${patient.motivo || 'Estudio PET/CT Oncológico'}</strong></div>
      <div><strong>Cita Actual:</strong> 📅 ${patient.fechaCita} a las ⏰ ${patient.horaCita} h</div>"""

if target_slot_modal_info in content:
    content = content.replace(target_slot_modal_info, replacement_slot_modal_info, 1)
    print("✓ Updated openSlotModal info and alerts")
else:
    print("ERROR: target_slot_modal_info not found!")
    sys.exit(1)

# 6. Update manual scheduling (btnConfirmManualWaiting) with confirmation check
target_confirm_manual = """      const patient = state.submissions.find(s => s.id === patientId);
      if (patient) {
        const timeFormatted = timeVal.includes('(') ? timeVal : (timeVal.toLowerCase().includes('h') ? timeVal : `${timeVal} h (${patient.radiofarmaco})`);
        patient.requiresProposal = false;"""

replacement_confirm_manual = """      const patient = state.submissions.find(s => s.id === patientId);
      if (patient) {
        // Validación de protocolo: si es de movilidad reducida o ingresado y se cita de primero
        const mobInfoManual = getPatientMobilityHospitalizationInfo(patient);
        const isFirstManual = isFirstSlotOfDayOrShift(dateVal, timeVal);
        if (mobInfoManual.isLateShift && isFirstManual) {
          const proceed = confirm(
            `⚠️ AVISO ASISTENCIAL (NO CITADO CORRECTAMENTE):\\n\\n` +
            `El paciente ${patient.nombre} tiene la condición: ${mobInfoManual.label.toUpperCase()}.\\n\\n` +
            `Protocolo de Medicina Nuclear PET/CT:\\n` +
            `Los pacientes ingresados o con movilidad reducida (silla de ruedas / camilla) DEBEN citarse de ÚLTIMOS en el turno para optimizar la logística de celadores, traslados y medicación.\\n\\n` +
            `¿Desea forzar la citación de PRIMERO (${timeVal}) de forma excepcional?`
          );
          if (!proceed) return;
        }

        const timeFormatted = timeVal.includes('(') ? timeVal : (timeVal.toLowerCase().includes('h') ? timeVal : `${timeVal} h (${patient.radiofarmaco})`);
        patient.requiresProposal = false;"""

if target_confirm_manual in content:
    content = content.replace(target_confirm_manual, replacement_confirm_manual, 1)
    print("✓ Updated btnConfirmManualWaiting with confirmation alert")
else:
    print("ERROR: target_confirm_manual not found!")
    sys.exit(1)

# 7. Update dropdown in openAssignManualModal to show mobility tag
target_manual_dropdown = """      waitingList.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        opt.textContent = `${w.prioridad} - ${w.nombre} (${w.radiofarmaco})`;
        selectManualWaitingPatient.appendChild(opt);
      });"""

replacement_manual_dropdown = """      waitingList.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w.id;
        const wMob = getPatientMobilityHospitalizationInfo(w);
        const mobTag = wMob.isLateShift ? ` [${wMob.label} - Citar de último]` : '';
        opt.textContent = `${w.prioridad} - ${w.nombre} (${w.radiofarmaco})${mobTag}`;
        selectManualWaitingPatient.appendChild(opt);
      });"""

if target_manual_dropdown in content:
    content = content.replace(target_manual_dropdown, replacement_manual_dropdown, 1)
    print("✓ Updated selectManualWaitingPatient options in openAssignManualModal")
else:
    print("ERROR: target_manual_dropdown not found!")
    sys.exit(1)

# 8. Update openPeonadaModal and handleConfirmPeonada
target_peonada_modal = """    peonadaPatientInfo.innerHTML = `
      <div><strong>Paciente:</strong> ${patient.nombre} (ID: ${patient.id})</div>
      <div><strong>Prioridad:</strong> <span class="badge ${patient.prioridad.includes('P1') ? 'badge-p1' : patient.prioridad.includes('P2') ? 'badge-p2' : 'badge-p3'}">${patient.prioridad}</span></div>
      <div><strong>Estudio / Radiofármaco:</strong> ${patient.radiofarmaco}</div>"""

replacement_peonada_modal = """    const pMob = getPatientMobilityHospitalizationInfo(patient);
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
      <div><strong>Estudio / Radiofármaco:</strong> ${patient.radiofarmaco}</div>"""

if target_peonada_modal in content:
    content = content.replace(target_peonada_modal, replacement_peonada_modal, 1)
    print("✓ Updated openPeonadaModal notice")
else:
    print("ERROR: target_peonada_modal not found!")
    sys.exit(1)

target_peonada_confirm = """    const patient = state.activePeonadaPatient;
    const hora = `${state.selectedPeonadaTime} (Peonada)`;
    const fecha = peonadaDatePicker.value;

    patient.requiresProposal = false;"""

replacement_peonada_confirm = """    const patient = state.activePeonadaPatient;
    const hora = `${state.selectedPeonadaTime} (Peonada)`;
    const fecha = peonadaDatePicker.value;

    const mobInfoPeonada = getPatientMobilityHospitalizationInfo(patient);
    const isFirstPeonada = isFirstSlotOfDayOrShift(fecha, state.selectedPeonadaTime);
    if (mobInfoPeonada.isLateShift && isFirstPeonada) {
      const proceed = confirm(
        `⚠️ AVISO ASISTENCIAL (NO CITADO CORRECTAMENTE):\\n\\n` +
        `El paciente ${patient.nombre} es ${mobInfoPeonada.label.toUpperCase()}.\\n\\n` +
        `Protocolo PET/CT: Los pacientes con movilidad reducida (silla/camilla) u hospitalizados DEBEN citarse de ÚLTIMOS en el turno.\\n\\n` +
        `¿Desea continuar y citarlo de primero (${state.selectedPeonadaTime}) de forma excepcional?`
      );
      if (!proceed) return;
    }

    patient.requiresProposal = false;"""

if target_peonada_confirm in content:
    content = content.replace(target_peonada_confirm, replacement_peonada_confirm, 1)
    print("✓ Updated handleConfirmPeonada with confirmation alert")
else:
    print("ERROR: target_peonada_confirm not found!")
    sys.exit(1)

# 9. Update renderSingleProposalTable to show badge-late-shift
target_proposal_table = """        <td><strong>${s.id}</strong></td>
        <td>${s.nombre}</td>
        <td>${s.radiofarmaco}</td>"""

replacement_proposal_table = """        const sMob = getPatientMobilityHospitalizationInfo(s);
        const sMobBadge = sMob.isLateShift
          ? `<div style="margin-top:2px;"><span class="badge-late-shift" title="${sMob.label}">${sMob.label}</span></div>`
          : '';

        tr.innerHTML = `
        <td><strong>${s.id}</strong></td>
        <td>${s.nombre}${sMobBadge}</td>
        <td>${s.radiofarmaco}</td>"""

# In renderSingleProposalTable:
target_prop_tr = """    list.forEach(s => {
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td><strong>${s.id}</strong></td>
        <td>${s.nombre}</td>
        <td>${s.radiofarmaco}</td>"""

replacement_prop_tr = """    list.forEach(s => {
      const sMob = getPatientMobilityHospitalizationInfo(s);
      const sMobBadge = sMob.isLateShift
        ? `<div style="margin-top:3px;"><span class="badge-late-shift" title="${sMob.label}">${sMob.label} (Citar de último)</span></div>`
        : '';
      const tr = document.createElement('tr');
      tr.style.cursor = 'pointer';
      tr.innerHTML = `
        <td><strong>${s.id}</strong></td>
        <td>${s.nombre}${sMobBadge}</td>
        <td>${s.radiofarmaco}</td>"""

if target_prop_tr in content:
    content = content.replace(target_prop_tr, replacement_prop_tr, 1)
    print("✓ Updated renderSingleProposalTable with late-shift badge")
else:
    print("ERROR: target_prop_tr not found!")
    sys.exit(1)

# 10. Update renderSubmissionsTable to show badge-late-shift
target_sub_tr = """    state.submissions.slice().reverse().forEach(s => {
      const tr = document.createElement('tr');
      const alertsText = s.alertas ? s.alertas.map(a => a.text).join(' | ') : 'Ninguna';"""

replacement_sub_tr = """    state.submissions.slice().reverse().forEach(s => {
      const sMob = getPatientMobilityHospitalizationInfo(s);
      const sMobBadge = sMob.isLateShift
        ? `<div style="margin-top:2px;"><span class="badge-late-shift" title="${sMob.label}">${sMob.label}</span></div>`
        : '';
      const tr = document.createElement('tr');
      const alertsText = s.alertas ? s.alertas.map(a => a.text).join(' | ') : 'Ninguna';"""

if target_sub_tr in content:
    content = content.replace(target_sub_tr, replacement_sub_tr, 1)
    # Also update td name in submissions table
    old_sub_td = "        <td>${s.nombre}</td>"
    new_sub_td = "        <td>${s.nombre}${sMobBadge}</td>"
    # only replace in renderSubmissionsTable
    idx_sub = content.find("function renderSubmissionsTable")
    if idx_sub != -1:
        idx_td = content.find("        <td>${s.nombre}</td>", idx_sub)
        if idx_td != -1:
            content = content[:idx_td] + "        <td>${s.nombre}${sMobBadge}</td>" + content[idx_td + len("        <td>${s.nombre}</td>"):]
            print("✓ Updated renderSubmissionsTable with late-shift badge")

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: app.js updated. New file length:", len(content))
