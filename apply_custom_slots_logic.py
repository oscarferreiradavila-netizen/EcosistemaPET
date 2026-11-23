import sys
import re

app_path = 'pet_ct_triage/web_app/app.js'
with open(app_path, 'r', encoding='utf-8') as f:
    content = f.read()

print("Original app.js length:", len(content))

# 1. Supplier helper function and currentDayCustomSlots state
anchor_supplier = "  // PROTOCOLO ASISTENCIAL SERGAS: HOSPITALIZADOS Y MOVILIDAD REDUCIDA"
if anchor_supplier not in content:
    anchor_supplier = "  // ==============================================================================\n  // GESTIÓN DE PACIENTES SIN CITAR"

supplier_code = """  /**
   * Identifica el proveedor oficial de un radiofármaco según el protocolo:
   * - 18F-FDG Glucosa y 18F-Colina: CICLOTRÓN
   * - Galio 68 (68Ga-DOTATOC, 68Ga-PSMA): RADIOFARMACIA
   * - 18F-PSMA: CURIUM MADRID
   */
  function getRadiofarmacoSupplierInfo(rf) {
    const s = String(rf || '').toLowerCase();
    if (s.includes('psma') && !s.includes('68ga') && !s.includes('galio')) {
      return { name: 'Curium Madrid', badgeClass: 'curium', icon: '🏢' };
    }
    if (s.includes('68ga') || s.includes('galio') || s.includes('dotat') || s.includes('somatostatina')) {
      return { name: 'Radiofarmacia', badgeClass: 'radiofarmacia', icon: '🧪' };
    }
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
\n"""

content = content.replace(anchor_supplier, supplier_code + anchor_supplier, 1)
print("✓ Added getRadiofarmacoSupplierInfo and renderCustomSlotsTable")

# 2. Update openDayAgendaModal to initialize and render custom slots
target_open_modal = """    // Renderizar tags de tratamientos autorizados para Mañana y Tarde
    renderTreatmentTagsForShift('morning', mConfig.treatments || ['18F-FDG']);
    renderTreatmentTagsForShift('afternoon', aftConfig.treatments || ['18F-FDG']);

    const modal = document.getElementById('agenda-day-modal');"""

replacement_open_modal = """    // Inicializar y renderizar huecos individuales personalizados para este día
    if (dayConfig && Array.isArray(dayConfig.customSlots) && dayConfig.customSlots.length > 0) {
      currentDayCustomSlots = JSON.parse(JSON.stringify(dayConfig.customSlots));
    } else {
      currentDayCustomSlots = generateDefaultCustomSlotsForDay(dayConfig);
    }
    renderCustomSlotsTable(dateStr);

    // Renderizar tags de tratamientos autorizados para Mañana y Tarde
    renderTreatmentTagsForShift('morning', mConfig.treatments || ['18F-FDG']);
    renderTreatmentTagsForShift('afternoon', aftConfig.treatments || ['18F-FDG']);

    const modal = document.getElementById('agenda-day-modal');"""

if target_open_modal in content:
    content = content.replace(target_open_modal, replacement_open_modal, 1)
    print("✓ Updated openDayAgendaModal to load custom slots")
else:
    print("ERROR: target_open_modal not found!")
    sys.exit(1)

# 3. Update saveCurrentDayAgendaFromModal to save custom slots
target_save_modal = """    const newDayConfig = {
      morning: morningConfig,
      afternoon: afternoonConfig
    };

    saveDayAgendaConfig(dateStr, newDayConfig, applyToTemplate);"""

replacement_save_modal = """    // Extraer tratamientos únicos de los huecos personalizados configurados
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

    saveDayAgendaConfig(dateStr, newDayConfig, applyToTemplate);"""

if target_save_modal in content:
    content = content.replace(target_save_modal, replacement_save_modal, 1)
    print("✓ Updated saveCurrentDayAgendaFromModal to store customSlots")
else:
    print("ERROR: target_save_modal not found!")
    sys.exit(1)

# 4. Bind event listeners for custom slots UI controls
target_listeners_anchor = """  // Guardar configuración del día
  if (btnSaveAgendaDay) {"""

new_listeners_code = """  // Controles de Huecos Individuales por Fármaco en el modal de día
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
          id: `slot_${Date.now()}_${Math.random().toString(36).substr(2,4)}`,
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
  if (btnSaveAgendaDay) {"""

if target_listeners_anchor in content:
    content = content.replace(target_listeners_anchor, new_listeners_code, 1)
    print("✓ Added custom slots event listeners")
else:
    print("ERROR: target_listeners_anchor not found!")
    sys.exit(1)

# 5. Update renderWeeklyGrid morning empty slots to render custom slots with RF badge
target_morning_empty = """        // Generar huecos libres disponibles en mañana si hay capacidad
        const generatedMorningSlots = generateShiftSlotTimes(morningConfig);
        const occupiedTimes = morningPatients.map(p => {
          const m = String(p.horaCita).match(/(\\d{2}:\\d{2})/);
          return m ? m[1] : '';
        });

        const remainingMorningSlots = generatedMorningSlots.filter(s => !occupiedTimes.includes(s));
        // Mostrar hasta 3 huecos libres o todos los liberados
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
        });"""

replacement_morning_empty = """        // Generar huecos libres disponibles en mañana (respetando huecos individuales y fármacos)
        const occupiedTimes = morningPatients.map(p => {
          const m = String(p.horaCita).match(/(\\d{2}:\\d{2})/);
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
        }"""

if target_morning_empty in content:
    content = content.replace(target_morning_empty, replacement_morning_empty, 1)
    print("✓ Updated renderWeeklyGrid morning empty slots with customSlots")
else:
    print("ERROR: target_morning_empty not found!")
    sys.exit(1)

# 6. Update renderWeeklyGrid afternoon empty slots to render custom slots with RF badge
target_aft_empty = """        // Huecos libres de tarde
        const generatedAftSlots = generateShiftSlotTimes(afternoonConfig);
        const occupiedAftTimes = afternoonPatients.map(p => {
          const m = String(p.horaCita).match(/(\\d{2}:\\d{2})/);
          return m ? m[1] : '';
        });

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
        });"""

replacement_aft_empty = """        // Huecos libres de tarde (respetando huecos individuales y fármacos)
        const occupiedAftTimes = afternoonPatients.map(p => {
          const m = String(p.horaCita).match(/(\\d{2}:\\d{2})/);
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
        }"""

if target_aft_empty in content:
    content = content.replace(target_aft_empty, replacement_aft_empty, 1)
    print("✓ Updated renderWeeklyGrid afternoon empty slots with customSlots")
else:
    print("ERROR: target_aft_empty not found!")
    sys.exit(1)

# 7. Update runTriageAutoScheduler to match patients specifically to custom slots
target_auto_morning = """      // --- A) AUTO-RELLENO TURNO DE MAÑANA (PROTOCOLO: HOSPITALIZADOS/MOV. REDUCIDA DE ÚLTIMOS) ---
      if (dayConfig.morning && dayConfig.morning.active) {"""

replacement_auto_morning = """      // --- A) AUTO-RELLENO TURNO DE MAÑANA (RESPETANDO HUECOS INDIVIDUALES Y PROTOCOLO) ---
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
      } else if (dayConfig.morning && dayConfig.morning.active) {"""

if target_auto_morning in content:
    content = content.replace(target_auto_morning, replacement_auto_morning, 1)
    print("✓ Updated runTriageAutoScheduler morning with custom slots")
else:
    print("ERROR: target_auto_morning not found!")
    sys.exit(1)

# 8. Update runTriageAutoScheduler afternoon
target_auto_aft = """      // --- B) AUTO-RELLENO TURNO DE TARDE (PROTOCOLO: HOSPITALIZADOS/MOV. REDUCIDA DE ÚLTIMOS) ---
      if (dayConfig.afternoon && dayConfig.afternoon.active) {"""

replacement_auto_aft = """      // --- B) AUTO-RELLENO TURNO DE TARDE (RESPETANDO HUECOS INDIVIDUALES Y PROTOCOLO) ---
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
      } else if (dayConfig.afternoon && dayConfig.afternoon.active) {"""

if target_auto_aft in content:
    content = content.replace(target_auto_aft, replacement_auto_aft, 1)
    print("✓ Updated runTriageAutoScheduler afternoon with custom slots")
else:
    print("ERROR: target_auto_aft not found!")
    sys.exit(1)

# 9. Update openAssignManualModal to accept defaultRf and prioritize matching candidates
target_open_manual = """  function openAssignManualModal(dateStr, timeStr) {
    manualSlotDate.value = dateStr || formatDate(new Date());
    manualSlotTime.value = timeStr || '08:00 h';

    newPatientName.value = '';
    newPatientNhc.value = '';
    newPatientRf.value = '18F-FDG';
    newPatientPrio.value = '🟢 P3';"""

replacement_open_manual = """  function openAssignManualModal(dateStr, timeStr, defaultRf = null) {
    manualSlotDate.value = dateStr || formatDate(new Date());
    manualSlotTime.value = timeStr || '08:00 h';

    newPatientName.value = '';
    newPatientNhc.value = '';
    if (defaultRf && defaultRf !== 'Flexible') {
      newPatientRf.value = defaultRf;
    } else {
      newPatientRf.value = '18F-FDG';
    }
    newPatientPrio.value = '🟢 P3';"""

if target_open_manual in content:
    content = content.replace(target_open_manual, replacement_open_manual, 1)
    print("✓ Updated openAssignManualModal signature and pre-selection")
else:
    print("ERROR: target_open_manual not found!")
    sys.exit(1)

with open(app_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("SUCCESS: app.js updated. New length:", len(content))
