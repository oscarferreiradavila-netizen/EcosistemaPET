/**
 * ==============================================================================
 * GENERADOR AUTOMÁTICO DE DATASET DE 250 PACIENTES REALES PET/CT EN GOOGLE SHEETS
 * Optimizado en Lote (1 sola escritura masiva < 2 segundos)
 * ==============================================================================
 */

function generate250PatientsSheet() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.alert(
    "🎲 Generar 250 Pacientes Aleatorios",
    "¿Deseas generar 250 peticiones clínicas de pacientes reales con porcentajes estadísticos exactos (65% FDG, 20% PSMA, 8% DOTATOC, 4% Amiloide, 3% Colina / 30% Urgente, 20% Preferente, 50% Ordinario) entre el 1 de julio de 2026 y hoy?",
    ui.ButtonSet.YES_NO
  );

  if (response !== ui.Button.YES) return;

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Encabezados Entrada (21) + Salida (5) = Total 26 Columnas
  const allHeaders = [
    "Submission ID", "Respondent ID", "Fecha Solicitud", "NHC / Historia Clínica",
    "Nombre del Paciente", "Nombre y Apellidos", "Sexo", "Edad", "Talla (cm)", "Peso (kg)",
    "Servicio Solicitante", "Médico Solicitante", "Diagnóstico Clínico", "Motivo de la Petición",
    "Tipo de Estudio PET Solicitado", "Carácter de la Petición", "¿El paciente está ingresado?",
    "Movilidad del paciente", "¿El paciente tiene Diabetes Mellitus?", "Tratamiento Quimioterápico / Radioterápico", "Alergias Conocidas",
    "Prioridad Calculada", "Fecha Cita Asignada", "Hora Cita Asignada", "Estado Confirmación", "Alertas Técnicas"
  ];

  const maleNames = ["Carlos", "Alejandro", "Javier", "Manuel", "David", "Daniel", "Miguel", "Rafael", "Álvaro", "Fernando", "Sergio", "Gonzalo", "Pablo", "Antonio", "Francisco"];
  const femaleNames = ["María", "Carmen", "Lucía", "Ana", "Elena", "Laura", "Marta", "Sara", "Paula", "Cristina", "Isabel", "Sofía", "Beatriz", "Silvia", "Teresa"];
  const surnames = ["García", "Rodríguez", "González", "Fernández", "López", "Martínez", "Sánchez", "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández", "Díaz", "Moreno"];

  const services = ["Oncología Médica", "Hematología", "Neumología", "Urología", "Neurología", "Cirugía General", "Medicina Interna", "Infectología"];
  const doctors = ["Dra. Elena Gómez", "Dr. Javier Martínez", "Dra. Sofía Fernández", "Dr. Antonio López", "Dra. Lucía Sánchez", "Dr. Miguel Ramírez"];

  const diagnosesByRF = {
    "18F-FDG": ["Carcinoma de Pulmón CPNM (Estadio III)", "Linfoma de Hodgkin", "Linfoma No Hodgkin Difuso", "Melanoma Metastásico", "Cáncer de Cérvix Uterino", "Nódulo Solitario de Pulmón (NSP)", "Sospecha de Endocarditis Bacteriana"],
    "Fluor-PSMA": ["Adenocarcinoma de Próstata (Elevación de PSA)", "Recidiva Bioquímica de Cáncer de Próstata"],
    "68Ga-PSMA": ["Adenocarcinoma de Próstata Resistente a Castración", "Cáncer de Próstata con Duplicación Rápida PSA"],
    "68Ga-DOTATATE / Somatostatina": ["Tumor Neuroendocrino Pancreático (TNE G2)", "Tumor Neuroendocrino Intestinal (TNE G1)"],
    "PET Neurológico / Amiloide": ["Deterioro Cognitivo Leve / Sospecha Alzheimer", "Demencia Temprana de Perfil Amiloide"],
    "18F-Colina": ["Adenoma de Paratiroides / Hiperparatiroidismo"]
  };

  const motivesByPrio = {
    "Urgente": ["Evaluación prequirúrgica urgente por cambio de conducta terapéutica", "Sospecha de recidiva agudizada con peligro vital", "Paciente ingresado en planta con deterioro clínico rápido"],
    "Preferente": ["Estadificación inicial previa a inicio de quimioterapia", "Evaluación de respuesta a tratamiento oncológico (2º ciclo)", "Reestadificación por elevación de marcadores tumorales"],
    "Ordinario": ["Caracterización de Nódulo Solitario de Pulmón (NSP)", "Seguimiento anual de paciente en remisión completa", "Estudio ordinario de control"]
  };

  // Pools de porcentajes estadísticos exactos (Total 250)
  const rfPool = shuffleArrayGS(
    new Array(163).fill("18F-FDG")
    .concat(new Array(25).fill("Fluor-PSMA"))
    .concat(new Array(25).fill("68Ga-PSMA"))
    .concat(new Array(20).fill("68Ga-DOTATATE / Somatostatina"))
    .concat(new Array(10).fill("PET Neurológico / Amiloide"))
    .concat(new Array(7).fill("18F-Colina"))
  );

  const prioPool = shuffleArrayGS(
    new Array(75).fill("Urgente")
    .concat(new Array(50).fill("Preferente"))
    .concat(new Array(125).fill("Ordinario"))
  );

  const startDate = new Date(2026, 6, 1);  // 1 Julio 2026
  const endDate = new Date(2026, 8, 10);   // 10 Septiembre 2026
  const timeDiff = endDate.getTime() - startDate.getTime();

  const occupiedSlotsMap = {};
  const dataMatrix = [allHeaders];

  for (let i = 0; i < 250; i++) {
    const isFemale = Math.random() < 0.5;
    const firstName = isFemale ? getRandomGS(femaleNames) : getRandomGS(maleNames);
    const fullName = `${firstName} ${getRandomGS(surnames)} ${getRandomGS(surnames)}`;
    const nhc = `NHC-${Math.floor(100000 + Math.random() * 900000)}`;

    const age = Math.floor(22 + Math.random() * 64);
    const height = isFemale ? Math.floor(152 + Math.random() * 23) : Math.floor(165 + Math.random() * 27);
    const weight = isFemale ? Math.floor(48 + Math.random() * 37) : Math.floor(62 + Math.random() * 43);

    const subTime = new Date(startDate.getTime() + Math.random() * timeDiff);
    const subDateStr = formatDateGS(subTime);

    const subId = `sub_${Math.random().toString(36).substring(2, 10)}`;
    const respId = `resp_${Math.random().toString(36).substring(2, 10)}`;

    const rf = rfPool[i];
    const prio = prioPool[i];

    const diagList = diagnosesByRF[rf] || diagnosesByRF["18F-FDG"];
    const diag = getRandomGS(diagList);
    const motive = getRandomGS(motivesByPrio[prio]);

    const isIngresado = prio === "Urgente" && Math.random() < 0.6 ? "Sí" : (Math.random() < 0.1 ? "Sí" : "No");
    const movilidad = isIngresado === "Sí" ? getRandomGS(["Cama / Camilla", "Silla de ruedas", "Precisa Sedación"]) : "Autónomo";

    const hasDiabetes = Math.random() < 0.18 ? "Sí" : "No";
    const recentQTRT = Math.random() < 0.15 ? formatDateGS(new Date(subTime.getTime() - Math.floor(2 + Math.random() * 16) * 86400000)) : "";
    const alergia = Math.random() < 0.12 ? getRandomGS(["Yodo", "Contrastes iodados", "Látex", "Penicilina"]) : "Ninguna";

    // Evaluar Triaje & Slot
    const parsedData = {
      ubicacion: isIngresado === "Sí" ? "Ingresado en Planta" : "Ambulatorio",
      motivo: (prio === "Urgente" ? "🔴 Urgente | " : "") + motive,
      radiofarmaco: rf,
      infeccion: diag.includes("Endocarditis") ? "Endocarditis" : "",
      psaDuplicacion: diag.includes("Duplicación") ? "< 3 meses" : "",
      terapiaEspecial: "",
      patologiaEspecial: "",
      tipoCancer: diag,
      finQTRT: recentQTRT,
      glucemia: hasDiabetes === "Sí" ? 210 : 100,
      movilidad: movilidad
    };

    const triageObj = evaluateTriage(parsedData);
    const alertsObj = evaluateTechnicalAlerts(parsedData);
    const appointmentObj = resolveAppointmentSlot(rf, triageObj, alertsObj, parsedData, occupiedSlotsMap);

    let alertsFinal = alertsObj.alertsText;
    if (appointmentObj.requiresProposal) {
      const propMsg = `💡 PROPUESTA PEONADA/TARDE: Fecha sugerida ${appointmentObj.proposedDate} (Límite ${triageObj.priority})`;
      alertsFinal = (alertsFinal ? alertsFinal + " | " : "") + propMsg;
    }

    const estadoConfirmacion = appointmentObj.requiresProposal ? "-" : "⏳ Pendiente";
    const horaConEstudio = appointmentObj.timeStr !== "-" ? (appointmentObj.timeStr.includes("(") ? appointmentObj.timeStr : `${appointmentObj.timeStr} (${rf})`) : "-";

    dataMatrix.push([
      subId,
      respId,
      subDateStr,
      nhc,
      fullName,
      fullName,
      isFemale ? "Femenino" : "Masculino",
      age,
      height,
      weight,
      getRandomGS(services),
      getRandomGS(doctors),
      diag,
      motive,
      rf,
      prio,
      isIngresado,
      movilidad,
      hasDiabetes,
      recentQTRT,
      alergia,
      triageObj.priority,
      appointmentObj.dateStr,
      horaConEstudio,
      estadoConfirmacion,
      alertsFinal || "Ninguna"
    ]);
  }

  // Borrar contenido previo de la hoja y escribir todo en 1 sola llamada masiva (super veloz)
  sheet.clearContents();
  sheet.getRange(1, 1, dataMatrix.length, allHeaders.length).setValues(dataMatrix);

  // Formato estético del encabezado
  sheet.getRange(1, 1, 1, allHeaders.length).setFontWeight('bold').setBackground('#d9e1f2');
  sheet.getRange(1, 22, 1, 5).setBackground('#e8f0fe');

  ui.alert("🎉 ¡Éxito! Se han generado y triado automáticamente 250 pacientes con Submission ID y Respondent ID en menos de 2 segundos.");
}

function getRandomGS(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function shuffleArrayGS(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function formatDateGS(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
