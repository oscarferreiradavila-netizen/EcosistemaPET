/**
 * ==============================================================================
 * SISTEMA DE TRIAJE Y AGENDAMIENTO AUTOMÁTICO PET/CT (TALLY INTEGRATION)
 * Agendamiento Anual (52 Semanas), Confirmación de Citas y Envío de Vídeo-Guías
 * ==============================================================================
 */

const CONFIG = {
  OUTPUT_HEADERS: [
    "Prioridad Calculada",
    "Fecha Cita Asignada",
    "Hora Cita Asignada",
    "Estado Confirmación",
    "Alertas Técnicas"
  ],
  URLS: {
    FDG_ESTANDAR: "http://localhost:8000",
    FDG_DIABETES: "http://localhost:8000",
    PSMA: "http://localhost:8000",
    COLINA: "http://localhost:8000",
    SOMATOSTATINA: "http://localhost:8000",
    NEURO: "http://localhost:8000",
    GENERAL: "http://localhost:8000"
  }
};

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('🏥 PET/CT Triaje')
    .addItem('⚡ Procesar / Actualizar Todas las Filas', 'processAllRows')
    .addItem('🎲 Generar 250 Pacientes Reales (Julio 2026 - Hoy)', 'generate250PatientsSheet')
    .addItem('🛠️ Verificar Encabezados de Salida', 'ensureHeaders')
    .addItem('📊 Ver Ocupación y Capacidad Semanal', 'showOccupancyReport')
    .addItem('⏰ Instalar Trigger Automático (FormSubmit)', 'installTrigger')
    .addToUi();
}

function onFormSubmitTrigger(e) {
  const sheet = e && e.range ? e.range.getSheet() : SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const row = e && e.range ? e.range.getRow() : sheet.getLastRow();
  processSingleRow(sheet, row);
}

function ensureHeaders() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  CONFIG.OUTPUT_HEADERS.forEach(header => {
    if (headers.indexOf(header) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(header).setFontWeight('bold').setBackground('#e8f0fe');
      headers.push(header);
    }
  });
}

function processAllRows() {
  ensureHeaders();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    SpreadsheetApp.getUi().alert("No hay filas de respuestas para procesar.");
    return;
  }

  let processedCount = 0;
  for (let r = 1; r < data.length; r++) {
    const rowValues = data[r];
    if (rowValues.some(val => val !== "")) {
      processSingleRow(sheet, r + 1, data);
      processedCount++;
    }
  }

  SpreadsheetApp.getUi().alert(`✅ ¡Completado! Se han procesado y actualizado ${processedCount} fila(s) en la hoja.`);
}

function getColumnIndexes(headers) {
  const map = {};
  headers.forEach((h, i) => {
    map[String(h).trim()] = i;
  });
  return map;
}

function extractRowData(headers, rowValues) {
  const getVal = (keywords) => {
    for (let i = 0; i < headers.length; i++) {
      const hText = String(headers[i]).toLowerCase();
      if (keywords.some(kw => hText.includes(kw.toLowerCase()))) {
        return String(rowValues[i] || "").trim();
      }
    }
    return "";
  };

  const ingresado = getVal(["¿el paciente está ingresado?", "ingresado"]);
  const habitacion = getVal(["habitación", "habitacion"]);
  const traslado = getVal(["tipo de traslado", "traslado"]);
  const movilidadVal = getVal(["movilidad del paciente", "movilidad"]);
  const sedacion = getVal(["¿precisa sedación?", "sedacion", "sedación"]);
  const caracter = getVal(["carácter de la petición", "caracter", "carácter"]);

  const motivoBase = getVal(["motivo de la petición", "motivo", "indicación clínica", "indicacion clinica", "especifique el motivo"]);
  const motivoFull = (caracter.toLowerCase() === "urgente" ? "🔴 Urgente | " : "") + motivoBase;

  const radiofarmaco = getVal(["tipo de estudio pet solicitado", "radiofármaco", "radiofarmaco", "trazador"]);
  const infeccion = getVal(["proceso infeccioso o inflamatorio", "infección", "infeccion", "inflamatorio"]);
  const psa = getVal(["situación clínica en cáncer de próstata", "valor de psa", "psa", "gleason"]);
  const diabetes = getVal(["¿el paciente tiene diabetes mellitus?", "diabetes", "glucemia"]);
  const qtrt = getVal(["tratamiento quimioterápico", "tratamiento radioterápico", "quimioterapia", "radioterapia"]);

  let glucemiaNum = parseFloat(diabetes) || 0;
  if (diabetes.toLowerCase() === "sí" || diabetes.toLowerCase() === "si") {
    glucemiaNum = 195;
  }

  const isIngresado = ingresado.toLowerCase() === "sí" || ingresado.toLowerCase() === "si" || habitacion.length > 0;
  const isSedacion = sedacion.toLowerCase() === "sí" || sedacion.toLowerCase() === "si";

  const ubicacionResult = isIngresado ? "Ingresado en Planta" : "Ambulatorio";
  const movilidadResult = isSedacion ? "Sedación" : (traslado || movilidadVal || "Autónomo");

  return {
    ubicacion: ubicacionResult,
    motivo: motivoFull,
    radiofarmaco: radiofarmaco,
    infeccion: infeccion,
    psaDuplicacion: psa,
    terapiaEspecial: getVal(["terapia", "lu-177", "radioligandos", "psma rescate"]),
    patologiaEspecial: getVal(["patología", "patologia", "paratiroides", "epilepsia", "paratiroides"]),
    tipoCancer: getVal(["diagnóstico oncológico", "diagnostico oncologico", "cáncer", "cancer", "estadio"]),
    finQTRT: qtrt,
    glucemia: glucemiaNum,
    movilidad: movilidadResult
  };
}

function evaluateTriage(data) {
  const ub = data.ubicacion.toLowerCase();
  const mot = data.motivo.toLowerCase();
  const inf = data.infeccion.toLowerCase();
  const psa = data.psaDuplicacion.toLowerCase();

  const isP1 = 
    ub.includes("ingresado") || ub.includes("planta") ||
    mot.includes("urgente") || mot.includes("peligro vital") || mot.includes("cambio quirúrgico") || mot.includes("recidiva agudizada") ||
    inf.includes("endocarditis") || inf.includes("vasculitis") || inf.includes("prótesis") || inf.includes("protesis") || inf.includes("fod") ||
    psa.includes("< 3 meses") || psa.includes("rápida") || psa.includes("rapida");

  if (isP1) return { priority: "🔴 P1", maxDays: 7 };

  const isP2 = 
    mot.includes("estadificación inicial") || mot.includes("reestadificación") || mot.includes("preferente") ||
    mot.includes("respuesta") || mot.includes("recidiva bioquímica") || mot.includes("paratiroides") || mot.includes("epilepsia");

  if (isP2) return { priority: "🟡 P2", maxDays: 14 };

  return { priority: "🟢 P3", maxDays: 30 };
}

function evaluateTechnicalAlerts(data) {
  const alerts = [];
  let minStartDate = new Date();

  if (data.finQTRT) {
    const finDate = new Date(data.finQTRT);
    if (!isNaN(finDate.getTime())) {
      const today = new Date();
      const diffDays = Math.floor((today - finDate) / (1000 * 60 * 60 * 24));
      if (diffDays < 21) {
        alerts.push("⚠️ ALERTA TÉCNICA: QT/RT RECIENTE (<21 días)");
        const safeDate = new Date(finDate);
        safeDate.setDate(safeDate.getDate() + 21);
        if (safeDate > minStartDate) minStartDate = safeDate;
      }
    }
  }

  if (data.glucemia > 180) {
    alerts.push("⚠️ PROTOCOLO DIABETES (Glucemia > 180 mg/dL)");
  }

  return {
    alertsText: alerts.join(" | "),
    hasDiabetes: data.glucemia > 180,
    minStartDate: minStartDate
  };
}

function normalizeRadiofarmaco(rfString) {
  const rf = String(rfString).toLowerCase();
  if (rf.includes("psma") && rf.includes("68ga")) return "68GA-PSMA";
  if (rf.includes("psma") || rf.includes("fluor")) return "FLUOR-PSMA";
  if (rf.includes("colina")) return "18F-COLINA";
  if (rf.includes("somatostatina") || rf.includes("dotatate")) return "68GA-SOMATOSTATINA";
  return "18F-FDG";
}

function addBusinessDays(startDate, numDays) {
  let current = new Date(startDate);
  let added = 0;
  while (added < numDays) {
    current.setDate(current.getDate() + 1);
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Excluir Domingo (0) y Sábado (6)
      added++;
    }
  }
  return current;
}

function resolveAppointmentSlot(radiofarmaco, priorityObj, techAlerts, data, occupiedSlotsMap) {
  const rfKey = normalizeRadiofarmaco(radiofarmaco);
  const minStartDate = techAlerts.minStartDate;
  
  let startSearch = new Date(minStartDate);
  startSearch.setDate(startSearch.getDate() + 1);

  // Fecha límite calculada estrictamente en DÍAS LABORABLES (Lunes a Viernes)
  const deadlineDate = addBusinessDays(startSearch, priorityObj.maxDays);

  let searchDate = new Date(startSearch);
  let assignedDateStr = null;
  let assignedTimeStr = null;

  while (searchDate <= deadlineDate) {
    const dayOfWeek = searchDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      if (isRadiofarmacoAllowedOnDay(rfKey, dayOfWeek)) {
        const dateStr = formatDate(searchDate);
        const morningKey = `${dateStr}_${rfKey}`;
        const currentCount = occupiedSlotsMap[morningKey] || 0;
        const maxCap = getMaxMorningCapacity(rfKey, dayOfWeek);

        if (currentCount < maxCap) {
          occupiedSlotsMap[morningKey] = currentCount + 1;
          assignedDateStr = dateStr;
          assignedTimeStr = assignMorningTimeSlot(rfKey, dayOfWeek, data.movilidad, data.ubicacion, currentCount);
          break;
        }
      }
    }
    searchDate.setDate(searchDate.getDate() + 1);
  }

  let requiresProposal = false;
  let proposedDateStr = null;

  if (!assignedDateStr) {
    requiresProposal = true;
    let proposalSearch = new Date(startSearch);
    while (proposalSearch <= deadlineDate) {
      const dayOfWeek = proposalSearch.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && isRadiofarmacoAllowedOnDay(rfKey, dayOfWeek)) {
        proposedDateStr = formatDate(proposalSearch);
        break;
      }
      proposalSearch.setDate(proposalSearch.getDate() + 1);
    }

    if (!proposedDateStr) {
      proposedDateStr = formatDate(deadlineDate);
    }

    assignedDateStr = "SIN AGENDAR (PROPUESTA PEONADA)";
    assignedTimeStr = "-";
  }

  return { 
    dateStr: assignedDateStr, 
    timeStr: assignedTimeStr, 
    requiresProposal: requiresProposal,
    proposedDate: proposedDateStr 
  };
}

function isRadiofarmacoAllowedOnDay(rfKey, dayOfWeek) {
  if (rfKey === "18F-FDG") return dayOfWeek === 1 || dayOfWeek === 2 || dayOfWeek === 4 || dayOfWeek === 5;
  if (rfKey === "68GA-PSMA" || rfKey === "68GA-SOMATOSTATINA") return dayOfWeek === 1 || dayOfWeek === 4 || dayOfWeek === 5;
  if (rfKey === "FLUOR-PSMA") return dayOfWeek === 2;
  if (rfKey === "18F-COLINA") return dayOfWeek === 3;
  return true;
}

function getMaxMorningCapacity(rfKey, dayOfWeek) {
  if (rfKey === "18F-FDG") return dayOfWeek === 2 ? 4 : 7;
  if (rfKey === "FLUOR-PSMA") return 4;
  if (rfKey === "18F-COLINA") return 6;
  if (rfKey === "68GA-PSMA" || rfKey === "68GA-SOMATOSTATINA") return 1;
  return 4;
}

function assignMorningTimeSlot(rfKey, dayOfWeek, movilidad, ubicacion, index) {
  if (rfKey === "68GA-PSMA" || rfKey === "68GA-SOMATOSTATINA") return "10:30";

  const mob = (movilidad + " " + ubicacion).toLowerCase();

  if (mob.includes("sedación") || mob.includes("sedacion") || mob.includes("anestesia")) {
    return index % 2 === 0 ? "11:00" : "11:20";
  }

  if (mob.includes("ingresado") || mob.includes("planta") || mob.includes("cama") || mob.includes("silla") || mob.includes("reducida")) {
    return index % 2 === 0 ? "10:00" : "10:30";
  }

  const defaultSlots = ["08:00", "08:20", "08:40", "09:00", "09:20", "09:40"];
  return defaultSlots[index % defaultSlots.length];
}

function processSingleRow(sheet, rowIndex, cachedData) {
  const data = cachedData || sheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = getColumnIndexes(headers);
  const rowValues = data[rowIndex - 1];

  const parsed = extractRowData(headers, rowValues);
  const triage = evaluateTriage(parsed);
  const techAlerts = evaluateTechnicalAlerts(parsed);

  const occupiedMap = buildOccupancyMapFromSheet(data, colMap);
  const appointment = resolveAppointmentSlot(parsed.radiofarmaco, triage, techAlerts, parsed, occupiedMap);

  let alertsFinal = techAlerts.alertsText;
  if (appointment.requiresProposal) {
    const propMsg = `💡 PROPUESTA PEONADA/TARDE: Fecha sugerida ${appointment.proposedDate} (Límite ${triage.priority})`;
    alertsFinal = (alertsFinal ? alertsFinal + " | " : "") + propMsg;
  }

  const estadoConfirmacion = appointment.requiresProposal ? "-" : "⏳ Pendiente";

  const horaConEstudio = appointment.timeStr !== "-" ? (appointment.timeStr.includes("(") ? appointment.timeStr : `${appointment.timeStr} h (${parsed.radiofarmaco})`) : "-";

  setColumnValue(sheet, headers, rowIndex, "Prioridad Calculada", triage.priority);
  setColumnValue(sheet, headers, rowIndex, "Fecha Cita Asignada", appointment.dateStr);
  setColumnValue(sheet, headers, rowIndex, "Hora Cita Asignada", horaConEstudio);
  setColumnValue(sheet, headers, rowIndex, "Estado Confirmación", estadoConfirmacion);
  setColumnValue(sheet, headers, rowIndex, "Alertas Técnicas", alertsFinal);
}

function setColumnValue(sheet, headers, rowIndex, colName, value) {
  let colIdx = headers.indexOf(colName) + 1;
  if (colIdx === 0) {
    ensureHeaders();
    const updatedHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    colIdx = updatedHeaders.indexOf(colName) + 1;
  }
  sheet.getRange(rowIndex, colIdx).setValue(value);
}

function buildOccupancyMapFromSheet(data, colMap) {
  const map = {};
  const fechaIdx = colMap["Fecha Cita Asignada"];
  const rfIdx = colMap["Tipo de Estudio PET Solicitado"] || colMap["Radiofármaco"] || colMap["Radiofarmaco"];

  if (fechaIdx === undefined || rfIdx === undefined) return map;

  for (let r = 1; r < data.length; r++) {
    const fecha = String(data[r][fechaIdx] || "");
    const rf = data[r][rfIdx];
    if (fecha && !fecha.includes("SIN AGENDAR") && rf) {
      const rfKey = normalizeRadiofarmaco(rf);
      const key = `${fecha}_${rfKey}`;
      map[key] = (map[key] || 0) + 1;
    }
  }
  return map;
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function installTrigger() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet();
  ScriptApp.newTrigger('onFormSubmitTrigger')
    .forSpreadsheet(sheet)
    .onFormSubmit()
    .create();
  
  SpreadsheetApp.getUi().alert("Trigger de Formulario instalado con éxito.");
}

function showOccupancyReport() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const colMap = getColumnIndexes(headers);
  const map = buildOccupancyMapFromSheet(data, colMap);

  let msg = "📊 RESUMEN DE OCUPACIÓN DE AGENDA PET/CT:\n\n";
  for (let k in map) {
    msg += `• [${k}]: ${map[k]} cita(s)\n`;
  }
  if (Object.keys(map).length === 0) msg += "No hay citas reservadas aún.";

  SpreadsheetApp.getUi().alert(msg);
}
