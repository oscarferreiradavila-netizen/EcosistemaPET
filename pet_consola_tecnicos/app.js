/**
 * CONSOLA TÉCNICA TSID PET/CT — GALARIA · SERGAS
 * Módulo 6 del Ecosistema Digital PET/CT
 * Citación del día, tiempos en pasar a máquina, diagramas visuales de posición, campos de adquisición y contrastes
 */

(function () {
  'use strict';

  // 1. BASE DE DATOS PREDETERMINADA DE PACIENTES PARA LA CONSOLA TÉCNICA
  const DEFAULT_TSID_PATIENTS = [
    {
      id: "TSID-01",
      nhc: "NHC-131362",
      nombre: "Manuel Gómez Suárez",
      edad: 68,
      sexo: "M",
      horaCita: "08:00",
      horaInyeccion: "08:15",
      tiempoProtocoloMin: 90,
      protocolo: "PET FDG Endocarditis Infecciosa",
      radiofarmaco: "18F-FDG",
      dosisMBq: 295,
      estado: "uptake", // waiting, uptake, ready, scanning, done
      posicionBrazos: "arriba", // arriba, abajo
      orientacion: "HFS", // Head First Supine
      centradoLaser: "Horquilla esternal (Manubrio)",
      rangoCampos: "Base de cráneo a tercio medio de muslos",
      numCamas: 6,
      tiempoPorCama: "2.5 min/cama",
      tipoAdquisicion: "Step & Shoot 3D (TOF + OSEM 3i/21s)",
      contrasteIV: true,
      tipoContraste: "Iomeron 350 mgI/mL (Iodado No Iónico)",
      volumenContraste: "85 mL a 2.8 mL/s + 30 mL SF",
      faseContraste: "Fase Arterial Precoz (25-30s) + Fase Tardía Cardíaca",
      viaRequerida: "18G / 20G en flexura antecubital derecha",
      contrasteOral: "1000 mL de agua fraccionada previa (sin contraste iodado oral)",
      glucemia: "104 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "16 horas estricto (Endocarditis)",
      dietaPrevia: "Carne y grasa estricta cumplida (cero hidratos)",
      heparinaIV: "Heparina sódica 50 UI/kg IV administrada 15 min antes de FDG",
      movilidad: "Autónomo, camina sin ayuda",
      trasladoModo: "autonomo",
      sondaVesical: false,
      protesisMetal: "Prótesis valvular aórtica mecánica metálica (activar O-MAR en CT)",
      claustrofobia: "No refiere",
      vaciadoVejiga: "Pendiente de orinar antes de tumbarse",
      notasFacultativo: "Sospecha de endocarditis sobre válvula protésica. Imprescindible verificar 90 min exactos para aclaramiento sanguíneo.",
      notasTecnico: "Vía permeable 18G en brazo dcho. Tolerancia perfecta a brazos arriba."
    },
    {
      id: "TSID-02",
      nhc: "NHC-240918",
      nombre: "Carmen Rodríguez Silva",
      edad: 73,
      sexo: "F",
      horaCita: "08:30",
      horaInyeccion: "08:45",
      tiempoProtocoloMin: 90,
      protocolo: "PET FDG Vasculitis de Grandes Vasos",
      radiofarmaco: "18F-FDG",
      dosisMBq: 280,
      estado: "uptake",
      posicionBrazos: "abajo", // Brazos pegados para troncos supraaórticos y temporal
      orientacion: "HFS",
      centradoLaser: "Línea órbito-meatal / Horquilla esternal",
      rangoCampos: "Cuerpo entero (Vértice craneal a dedos de los pies)",
      numCamas: 9,
      tiempoPorCama: "2.0 min/cama (3.0 min en cabeza/cuello)",
      tipoAdquisicion: "Continuous Bed Motion (1.2 mm/s)",
      contrasteIV: true,
      tipoContraste: "Omnipaque 350 mgI/mL",
      volumenContraste: "90 mL a 3.5 mL/s + 40 mL SF",
      faseContraste: "Angio-CT troncos supraaórticos y aorta (Bolus Tracking en aorta)",
      viaRequerida: "18G flexura antecubital izquierda",
      contrasteOral: "Agua sola 1 Litro",
      glucemia: "118 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "6 horas cumplidas",
      dietaPrevia: "Pobre en hidratos el día previo",
      heparinaIV: "No aplica",
      movilidad: "En silla de ruedas",
      trasladoModo: "silla",
      sondaVesical: true,
      sondaTipo: "Sonda vesical Foley con bolsa colectora",
      protesisMetal: "Sin prótesis metálicas",
      claustrofobia: "Leve (solicita no tapar la cara)",
      vaciadoVejiga: "Orinó a las 09:15h",
      notasFacultativo: "Sospecha de arteritis de células gigantes y afectación de aorta torácica. BRAZOS ABAJO para evitar artefactos en troncos supraaórticos.",
      notasTecnico: "Brazos sujetos con banda de velcro confortable. Cojín lumbar colocado."
    },
    {
      id: "TSID-03",
      nhc: "NHC-391084",
      nombre: "Carlos Varela Pereira",
      edad: 54,
      sexo: "M",
      horaCita: "09:00",
      horaInyeccion: "09:10",
      tiempoProtocoloMin: 60,
      protocolo: "PET FDG Oncológico — Linfoma Hodgkin",
      radiofarmaco: "18F-FDG",
      dosisMBq: 320,
      estado: "ready", // ¡Listo para pasar a máquina!
      posicionBrazos: "arriba",
      orientacion: "HFS",
      centradoLaser: "Escotadura yugular / Horquilla esternal",
      rangoCampos: "Vértice craneal a tercio medio de muslos",
      numCamas: 6,
      tiempoPorCama: "2.0 min/cama",
      tipoAdquisicion: "Step & Shoot 3D (TOF + PSF)",
      contrasteIV: false,
      tipoContraste: "Sin contraste iodado IV (CT Ultra-Low Dose para AC)",
      volumenContraste: "0 mL",
      faseContraste: "CT Baja Dosis (120 kVp, 30 mAs modulados)",
      viaRequerida: "20G / 22G periférica",
      contrasteOral: "1000 mL de agua fraccionada en 45 min",
      glucemia: "96 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "6 horas estricto",
      dietaPrevia: "Sin hidratos de carbono 24h",
      heparinaIV: "No aplica",
      movilidad: "Autónomo",
      protesisMetal: "Empastes dentales (no interfieren)",
      claustrofobia: "No refiere",
      vaciadoVejiga: "Acaba de orinar (10:05h)",
      notasFacultativo: "Estadificación inicial de linfoma. Adquisición estándar de 6 camas con brazos arriba.",
      notasTecnico: "Paciente muy colaborador. Listo en sillón 3."
    },
    {
      id: "TSID-04",
      nhc: "NHC-481920",
      nombre: "Lucía Fernández Vidal",
      edad: 71,
      sexo: "F",
      horaCita: "09:30",
      horaInyeccion: "09:40",
      tiempoProtocoloMin: 40,
      protocolo: "PET FDG Neurológico Normal — Deterioro Cognitivo",
      radiofarmaco: "18F-FDG",
      dosisMBq: 185,
      estado: "uptake",
      posicionBrazos: "abajo",
      orientacion: "HFS",
      centradoLaser: "Línea órbito-meatal (OM) / Nasion",
      rangoCampos: "Encéfalo dedicado (Cráneo exclusivo)",
      numCamas: 1,
      tiempoPorCama: "15 min adquisición estática 3D",
      tipoAdquisicion: "3D High-Resolution Brain Matrix 400x400",
      contrasteIV: false,
      tipoContraste: "Sin contraste iodado IV (CT Neuro Baja Dosis)",
      volumenContraste: "0 mL",
      faseContraste: "CT craneal de localización 120 kVp",
      viaRequerida: "20G periférica",
      contrasteOral: "No requiere",
      glucemia: "102 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "6 horas sin alimentos sólidos",
      dietaPrevia: "Sin estimulantes (café, té, chocolate) 24h",
      heparinaIV: "No aplica",
      movilidad: "Autónoma con acompañante (hija)",
      protesisMetal: "Sin implantes metálicos",
      claustrofobia: "No",
      vaciadoVejiga: "Orinó antes de la inyección",
      notasFacultativo: "Sospecha de enfermedad de Alzheimer. Imprescindible reposo sensorial en penumbra y silencio total durante la captación.",
      notasTecnico: "En box de reposo 1 en penumbra sin móvil ni lectura."
    },
    {
      id: "TSID-05",
      nhc: "NHC-519203",
      nombre: "Antonio Castro Pereira",
      edad: 66,
      sexo: "M",
      horaCita: "10:00",
      horaInyeccion: "10:15",
      tiempoProtocoloMin: 55,
      protocolo: "PET 18F-Colina — Recidiva Bioquímica de Próstata",
      radiofarmaco: "18F-Colina",
      dosisMBq: 260,
      estado: "uptake",
      posicionBrazos: "arriba",
      orientacion: "HFS",
      centradoLaser: "Horquilla esternal y sínfisis púbica",
      rangoCampos: "Base de cráneo a muslos + Paso tardío de pelvis",
      numCamas: 6,
      tiempoPorCama: "2.5 min/cama (pelvis tardía 3 min)",
      tipoAdquisicion: "Step & Shoot + Pelvis tardía tras vaciado",
      contrasteIV: false,
      tipoContraste: "Sin contraste iodado IV",
      volumenContraste: "0 mL",
      faseContraste: "CT de baja dosis para AC",
      viaRequerida: "20G flexura antecubital",
      contrasteOral: "500 mL de agua previa",
      glucemia: "110 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "4 horas de ayuno suave",
      dietaPrevia: "Evitar alimentos ricos en colina (huevos, hígado) 48h",
      heparinaIV: "No aplica",
      movilidad: "Autónomo",
      protesisMetal: "Prótesis de cadera izquierda (activar O-MAR)",
      claustrofobia: "No refiere",
      vaciadoVejiga: "OBLIGATORIO orinar 5 min antes de entrar a máquina",
      notasFacultativo: "Elevación de PSA tras prostatectomía (PSA 1.8 ng/mL). Realizar paso pélvico tardío.",
      notasTecnico: "Recordar al paciente orinar justo antes de entrar a la sala."
    },
    {
      id: "TSID-06",
      nhc: "NHC-604182",
      nombre: "Francisco Javier Blanco",
      edad: 69,
      sexo: "M",
      horaCita: "10:30",
      horaInyeccion: "10:45",
      tiempoProtocoloMin: 60,
      protocolo: "PET 18F-PSMA — Cáncer de Próstata",
      radiofarmaco: "18F-PSMA-1007",
      dosisMBq: 250,
      estado: "waiting", // en espera de inyección
      posicionBrazos: "arriba",
      orientacion: "HFS",
      centradoLaser: "Escotadura esternal / Xifoides",
      rangoCampos: "Vértice craneal a tercio medio de muslos",
      numCamas: 6,
      tiempoPorCama: "2.0 min/cama",
      tipoAdquisicion: "Step & Shoot 3D TOF",
      contrasteIV: true,
      tipoContraste: "Iomeron 350 mgI/mL",
      volumenContraste: "85 mL a 2.5 mL/s + 30 mL SF",
      faseContraste: "Fase Portal Abdominal (~70s)",
      viaRequerida: "18G o 20G periférica",
      contrasteOral: "1000 mL de agua",
      glucemia: "98 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "4 horas sin alimentos sólidos",
      dietaPrevia: "Normal",
      heparinaIV: "No aplica",
      movilidad: "Encamado / En camilla",
      trasladoModo: "encamado",
      sondaVesical: true,
      sondaTipo: "Sonda vesical Foley con bolsa colectora",
      protesisMetal: "Sin implantes metálicos",
      claustrofobia: "No",
      vaciadoVejiga: "Vaciar vejiga antes de tumbarse",
      notasFacultativo: "Estadificación de alto riesgo (Gleason 8). CT con contraste iodado para estadificación ganglionar retroperitoneal.",
      notasTecnico: "Comprobar filtrado glomerular antes de inyectar contraste (eGFR > 60)."
    },
    {
      id: "TSID-07",
      nhc: "NHC-719340",
      nombre: "José Luis Domínguez Ramos",
      edad: 61,
      sexo: "M",
      horaCita: "11:00",
      horaInyeccion: "11:15",
      tiempoProtocoloMin: 50,
      protocolo: "PET 68Ga-DOTATOC — Tumor Neuroendocrino",
      radiofarmaco: "68Ga-DOTATOC",
      dosisMBq: 170,
      estado: "waiting",
      posicionBrazos: "arriba",
      orientacion: "HFS",
      centradoLaser: "Horquilla esternal",
      rangoCampos: "Base de cráneo a sínfisis púbica",
      numCamas: 5,
      tiempoPorCama: "3.0 min/cama (por vida media de 68Ga)",
      tipoAdquisicion: "Step & Shoot 3D alta sensibilidad",
      contrasteIV: false,
      tipoContraste: "Sin contraste iodado IV",
      volumenContraste: "0 mL",
      faseContraste: "CT Baja Dosis",
      viaRequerida: "20G periférica",
      contrasteOral: "Abundante hidratación con agua (1 L)",
      glucemia: "106 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "Sin ayuno estricto",
      dietaPrevia: "Comida ligera",
      heparinaIV: "No aplica",
      movilidad: "En silla de ruedas",
      trasladoModo: "silla",
      sondaVesical: false,
      protesisMetal: "Sin implantes",
      claustrofobia: "No",
      vaciadoVejiga: "Orinar antes de la prueba",
      notasFacultativo: "Sospecha de metástasis hepáticas de TNE ileal. Dosis calibrada de Galio-68 eluido hoy en radiofarmacia.",
      notasTecnico: "Ajustar ventana de adquisición a pico de 68Ga (511 keV)."
    },
    {
      id: "TSID-08",
      nhc: "NHC-820193",
      nombre: "María Teresa Souto Loureiro",
      edad: 64,
      sexo: "F",
      horaCita: "11:30",
      horaInyeccion: "11:45",
      tiempoProtocoloMin: 60,
      protocolo: "PET FDG Oncológico + Contraste IV — Cáncer de Colon",
      radiofarmaco: "18F-FDG",
      dosisMBq: 310,
      estado: "waiting",
      posicionBrazos: "arriba",
      orientacion: "HFS",
      centradoLaser: "Escotadura esternal",
      rangoCampos: "Base de cráneo a tercio medio de muslos",
      numCamas: 6,
      tiempoPorCama: "2.0 min/cama",
      tipoAdquisicion: "Step & Shoot 3D (TOF + PSF)",
      contrasteIV: true,
      tipoContraste: "Iomeron 350 mgI/mL",
      volumenContraste: "90 mL a 3.0 mL/s + 30 mL SF",
      faseContraste: "Fase Portal Venosa Abdominal (~70s delay)",
      viaRequerida: "18G antecubital",
      contrasteOral: "1000 mL de agua fraccionada",
      glucemia: "128 mg/dL",
      glucemiaEstado: "optima",
      ayunoCumplido: "6 horas estricto",
      dietaPrevia: "Dieta baja en hidratos 24h",
      heparinaIV: "No aplica",
      movilidad: "Autónoma",
      protesisMetal: "Sin prótesis",
      claustrofobia: "No",
      vaciadoVejiga: "Pendiente",
      notasFacultativo: "Reestadificación post-quimioterapia por adenocarcinoma de colon. CT diagnóstico con contraste portal indispensable.",
      notasTecnico: "Comprobar retorno venoso de la vía 18G antes de conectar al inyector de doble cabezal."
    }
  ];

  // 2. ESTADO GLOBAL
  const state = {
    patients: [],
    selectedPatient: null,
    filterStatus: 'all',
    filterTracer: 'all',
    searchTerm: '',
    selectedDate: 'today',
    speechRecognition: null,
    isListening: false
  };

  // 3. INICIALIZACIÓN
  document.addEventListener('DOMContentLoaded', initApp);

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

  function updateDateButtons() {
    const hoyStr = getTodayStr();
    const mananaStr = getTomorrowStr();
    const [, hm, hd] = hoyStr.split('-');
    const [, mm, md] = mananaStr.split('-');

    const btnToday = document.querySelector('.date-pill-btn[data-date="today"]');
    const btnTomorrow = document.querySelector('.date-pill-btn[data-date="tomorrow"]');
    const btnAll = document.querySelector('.date-pill-btn[data-date="all"]');

    const countToday = state.patients.filter(p => (p.fechaCita || hoyStr) === hoyStr).length;
    const countTomorrow = state.patients.filter(p => (p.fechaCita || hoyStr) === mananaStr).length;
    const countAll = state.patients.length;

    if (btnToday) {
      btnToday.innerHTML = `📅 Citas de Hoy (${hd}/${hm}) <span style="background:rgba(0,0,0,0.12); padding:1px 7px; border-radius:10px; font-size:0.75rem; margin-left:4px;">${countToday}</span>`;
    }
    if (btnTomorrow) {
      btnTomorrow.innerHTML = `📅 Mañana (${md}/${mm}) <span style="background:rgba(0,0,0,0.12); padding:1px 7px; border-radius:10px; font-size:0.75rem; margin-left:4px;">${countTomorrow}</span>`;
    }
    if (btnAll) {
      btnAll.innerHTML = `🌐 Ver Todos <span style="background:rgba(0,0,0,0.12); padding:1px 7px; border-radius:10px; font-size:0.75rem; margin-left:4px;">${countAll}</span>`;
    }
  }

  async function initApp() {
    loadPatients();
    setupEventListeners();
    setupSpeechRecognition();
    updateDateButtons();
    renderWorklist();

    const currentFiltered = getFilteredPatients();
    if (currentFiltered.length > 0) {
      selectPatient(currentFiltered[0].id);
    }

    // Sincronización asíncrona con la base de datos de peticiones / triaje
    await syncWithMasterDatabase();

    // Iniciar temporizador en vivo (actualiza cronómetros cada segundo)
    setInterval(updateTimersAndStatus, 1000);
  }

  // Función para mapear el rango pautado por el médico al preset de la caja de campos
  function mapDoctorRangeToPreset(doctorRange) {
    if (!doctorRange) return 'standard';
    const r = String(doctorRange).toLowerCase();
    if (r === 'base_craneo_muslos' || r.includes('base') || r.includes('cráneo a muslos') || r.includes('craneo a muslos')) {
      return 'standard';
    } else if (r === 'cuerpo_total' || r.includes('total') || r.includes('vértice a pies') || r.includes('vertice a pies')) {
      return 'whole';
    } else if (r === 'cabeza_cuello_cuerpo' || r.includes('cuello') || r.includes('combinado')) {
      return 'whole';
    } else if (r === 'torax_abdomen' || r.includes('tórax') || r.includes('torax') || r.includes('abdomen')) {
      return 'torax_abdomen';
    } else if (r === 'cerebro' || r.includes('cerebr') || r.includes('encéfalo') || r.includes('encefalo') || r.includes('neuro')) {
      return 'brain';
    } else if (r === 'pelvis_tardia' || r.includes('pelvis') || r.includes('tardía') || r.includes('tardia')) {
      return 'pelvis_tardia';
    } else if (r === 'mmii' || r.includes('mmii') || r.includes('miembros inferiores') || r.includes('piernas')) {
      return 'whole';
    }
    return 'standard';
  }

  // 4. CARGA Y PERSISTENCIA DE PACIENTES
  function loadPatients() {
    const hoyStr = getTodayStr();
    const mananaStr = getTomorrowStr();

    // Guardar modificaciones locales previas de los técnicos
    const localTechMap = {};
    try {
      const stored = localStorage.getItem('PET_TSID_WORKLIST_V1');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach(p => {
            const keys = [p.id, p.nhc].filter(Boolean);
            keys.forEach(key => {
              localTechMap[key] = {
                estado: p.estado,
                horaInyeccion: p.horaInyeccion,
                notasTecnico: p.notasTecnico,
                sondaVesical: p.sondaVesical,
                trasladoModo: p.trasladoModo,
                movilidad: p.movilidad,
                altaMedicaAutorizada: p.altaMedicaAutorizada,
                horaAltaMedica: p.horaAltaMedica,
                altaDoctor: p.altaDoctor,
                boxAsignado: p.boxAsignado,
                boxAnterior: p.boxAnterior,
                boxCambiado: p.boxCambiado,
                boxVerificado: p.boxVerificado,
                horaCambioBox: p.horaCambioBox,
                horaVerificacionBox: p.horaVerificacionBox,
                requiereFaseVascular: p.requiereFaseVascular,
                faseVascularIniciada: p.faseVascularIniciada,
                horaInicioFaseVascular: p.horaInicioFaseVascular
              };
            });
          });
        }
      }
    } catch (e) { }

    // Base inicial limpia: solo se muestran pacientes realmente citados en Triaje / Master DB
    state.patients = [];

    // 1. Fusionar tanto la semilla síncrona como PET_DATABASE_MASTER_V4 y PET_TRIAGE_CITED_PATIENTS_V1
    if (window.PETICIONES_DATABASE_SEED && Array.isArray(window.PETICIONES_DATABASE_SEED) && window.PETICIONES_DATABASE_SEED.length > 0) {
      mergeMasterDatabaseItems(window.PETICIONES_DATABASE_SEED);
    }
    try {
      const storedMaster = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (storedMaster) {
        const parsedMaster = JSON.parse(storedMaster);
        if (Array.isArray(parsedMaster) && parsedMaster.length > 0) {
          mergeMasterDatabaseItems(parsedMaster);
        }
      }
      const storedTriageCited = localStorage.getItem('PET_TRIAGE_CITED_PATIENTS_V1');
      if (storedTriageCited) {
        const parsedTriageCited = JSON.parse(storedTriageCited);
        if (Array.isArray(parsedTriageCited) && parsedTriageCited.length > 0) {
          mergeMasterDatabaseItems(parsedTriageCited);
        }
      }
    } catch (e) { }

    // Si en la fecha activa (ej. Hoy) hay 0 pacientes citados pero existen pacientes citados en Triaje en otra fecha, mostrar todos automáticamente
    if (state.patients.length > 0 && state.selectedDate !== 'all') {
      const hoyStr = getTodayStr();
      const mananaStr = getTomorrowStr();
      const targetD = state.selectedDate === 'today' ? hoyStr : (state.selectedDate === 'tomorrow' ? mananaStr : state.selectedDate);
      const countForTarget = state.patients.filter(p => (p.fechaCita || hoyStr) === targetD).length;
      if (countForTarget === 0) {
        state.selectedDate = 'all';
        document.querySelectorAll('.date-pill-btn').forEach(b => b.classList.remove('active'));
        const btnAll = document.querySelector('.date-pill-btn[data-date="all"]');
        if (btnAll) btnAll.classList.add('active');
        const customInput = document.getElementById('inputCustomDate');
        if (customInput) customInput.value = '';
      }
    }

    // Re-vincular modificaciones locales del técnico
    state.patients.forEach(p => {
      const s = localTechMap[p.id] || localTechMap[p.nhc];
      if (s) {
        if (s.horaInyeccion) p.horaInyeccion = s.horaInyeccion;
        if (s.estado && s.estado !== 'waiting') {
          p.estado = p.horaInyeccion ? s.estado : 'waiting';
        }
        if (s.notasTecnico) p.notasTecnico = s.notasTecnico;
        if (s.sondaVesical !== undefined) p.sondaVesical = s.sondaVesical;
        if (s.trasladoModo) p.trasladoModo = s.trasladoModo;
        if (s.movilidad) p.movilidad = s.movilidad;
        if (s.altaMedicaAutorizada) {
          p.altaMedicaAutorizada = s.altaMedicaAutorizada;
          p.horaAltaMedica = s.horaAltaMedica;
          p.altaDoctor = s.altaDoctor;
        }
        if (s.boxAsignado !== undefined) p.boxAsignado = s.boxAsignado;
        if (s.boxAnterior !== undefined) p.boxAnterior = s.boxAnterior;
        if (s.boxCambiado !== undefined) p.boxCambiado = s.boxCambiado;
        if (s.boxVerificado !== undefined) p.boxVerificado = s.boxVerificado;
        if (s.horaCambioBox !== undefined) p.horaCambioBox = s.horaCambioBox;
        if (s.horaVerificacionBox !== undefined) p.horaVerificacionBox = s.horaVerificacionBox;
        if (s.requiereFaseVascular !== undefined) p.requiereFaseVascular = s.requiereFaseVascular;
        if (s.faseVascularIniciada !== undefined) p.faseVascularIniciada = s.faseVascularIniciada;
        if (s.horaInicioFaseVascular !== undefined) p.horaInicioFaseVascular = s.horaInicioFaseVascular;
      }
    });

    mergeLateScanOrders();
    mergeNursingData();
    mergeDischargeData();
    savePatients();
  }

  function mergeDischargeData() {
    try {
      const dischargeMap = JSON.parse(localStorage.getItem('PET_SHARED_DISCHARGE_V1') || '{}');
      state.patients.forEach(p => {
        const d = dischargeMap[p.id] || dischargeMap[p.nhc];
        if (d && d.altaMedicaAutorizada) {
          p.altaMedicaAutorizada = true;
          p.horaAltaMedica = d.horaAltaMedica || d.horaAlta || p.horaAltaMedica || '--:--';
          p.altaDoctor = d.doctor || p.altaDoctor || 'Dr. Manuel Gómez Feijóo';
        }
      });
    } catch (e) { }
  }

  function mergeMasterDatabaseItems(masterList) {
    if (!Array.isArray(masterList) || masterList.length === 0) return;
    const hoyStr = getTodayStr();

    // Cargar protocolos médicos, asignaciones de Triaje y pacientes eliminados si existen en almacenamiento
    let storedProtocols = {};
    let peonadaMap = {};
    let departedMap = {};
    try {
      const rawProtocols = localStorage.getItem('PET_MEDICAL_PROTOCOLS_V1');
      if (rawProtocols) storedProtocols = JSON.parse(rawProtocols) || {};
      const rawPeonada = localStorage.getItem('pet_ct_peonada_assignments');
      if (rawPeonada) peonadaMap = JSON.parse(rawPeonada) || {};
      const rawDeparted = localStorage.getItem('PET_DELETED_DEPARTED_PATIENTS_V1');
      if (rawDeparted) departedMap = JSON.parse(rawDeparted) || {};
    } catch (e) { }

    const cited = [];
    masterList.forEach((p, idx) => {
      const copyP = Object.assign({}, p);
      const subId = String(copyP["Submission ID"] || copyP.id || copyP.paciente_id || `sub_${idx + 1}`).trim();
      const nhc = String(copyP["NHC / Historia Clínica"] || copyP.nhc || '').trim();
      const nhcDigits = nhc.replace(/\D/g, '');
      if (departedMap[subId] || (nhc && departedMap[nhc]) || (nhcDigits && departedMap[nhcDigits])) {
        return;
      }
      const assign = peonadaMap[subId] || (nhc ? peonadaMap[nhc] : null);
      if (assign && assign.fechaCita) {
        copyP["Fecha Cita Asignada"] = assign.fechaCita;
        copyP["Hora Cita Asignada"] = assign.horaCita || copyP["Hora Cita Asignada"] || '08:30 h';
      }
      const fecha = String(copyP["Fecha Cita Asignada"] || copyP.fechaCita || '').trim();
      if (fecha && fecha !== 'Pendiente de Triaje' && !fecha.includes('SIN AGENDAR')) {
        cited.push(copyP);
      }
    });

    cited.forEach((cp, idx) => {
      const subId = cp["Submission ID"] || cp.id;
      const nhc = cp["NHC / Historia Clínica"] || cp.nhc;
      const fechaCita = cp["Fecha Cita Asignada"] || cp.fechaCita || hoyStr;
      const hora = cp["Hora Cita Asignada"] ? cp["Hora Cita Asignada"].split(' ')[0] : `08:${String(15 + (idx % 16) * 15).padStart(2, '0')}`;
      const savedProto = cp.protocoloMedico || storedProtocols[subId] || storedProtocols[nhc] || null;

      const existing = state.patients.find(x => (subId && x.id === subId) || (nhc && x.nhc === nhc));
      if (existing) {
        existing.fechaCita = fechaCita;
        if (hora && (!existing.horaCita || existing.horaCita === '--:--')) {
          existing.horaCita = hora;
        }
        if (savedProto && savedProto.completed) {
          existing.protocoloMedico = savedProto;
          if (savedProto.armsPosition) existing.posicionBrazos = savedProto.armsPosition;
          if (savedProto.scanRange) {
            existing.rangoCampos = savedProto.scanRange;
            existing.presetCajaCampos = mapDoctorRangeToPreset(savedProto.scanRange);
          }
          if (savedProto.uptakeTime) existing.tiempoProtocoloMin = parseInt(savedProto.uptakeTime, 10) || existing.tiempoProtocoloMin;
          if (savedProto.doctorNotes) existing.notasFacultativo = savedProto.doctorNotes;
          if (savedProto.doctorName) existing.medicoProtocolizador = savedProto.doctorName;
          if (savedProto.contrastType) existing.contrasteIV = (savedProto.contrastType === 'en_maquina' || savedProto.contrastType === 'en_box');
          if (savedProto.vascularPhase !== undefined) existing.requiereFaseVascular = (savedProto.vascularPhase === 'si');
        }
      } else {
        const rf = cp["Tipo de Estudio PET Solicitado"] || "18F-FDG";
        const diag = cp["Diagnóstico Clínico"] || cp["Motivo de Solicitud"] || "Estudio PET/CT";
        const isEndo = diag.toLowerCase().includes('endocarditis');
        const isVasc = diag.toLowerCase().includes('vasculitis');
        const isNeuro = diag.toLowerCase().includes('cerebral') || diag.toLowerCase().includes('neuro') || diag.toLowerCase().includes('demencia');

        const newPatient = {
          id: subId || `TSID-GEN-${idx + 10}`,
          nhc: nhc || `NHC-${200000 + idx}`,
          nombre: cp["Nombre del Paciente"] || cp["Nombre y Apellidos"] || `Paciente ${idx + 1}`,
          edad: parseInt(cp["Edad"] || 65, 10),
          sexo: (cp["Sexo"] || "Varón").startsWith("M") ? "M" : "F",
          fechaCita: fechaCita,
          horaCita: hora,
          horaInyeccion: "",
          tiempoProtocoloMin: isEndo || isVasc ? 90 : (isNeuro ? 40 : 60),
          protocolo: diag,
          radiofarmaco: rf.split(' ')[0],
          dosisMBq: 280,
          estado: cp["Estado de Triaje"] === "Realizado" ? "done" : "waiting",
          posicionBrazos: isVasc || isNeuro ? "abajo" : "arriba",
          orientacion: "HFS",
          centradoLaser: isNeuro ? "Línea órbito-meatal" : "Horquilla esternal (Manubrio)",
          rangoCampos: isVasc ? "Cuerpo entero" : (isNeuro ? "Encéfalo dedicado" : "Base de cráneo a tercio medio de muslos"),
          numCamas: isNeuro ? 1 : (isVasc ? 9 : 6),
          tiempoPorCama: isNeuro ? "15 min estático" : "2.0 min/cama",
          tipoAdquisicion: isNeuro ? "3D High-Res Brain" : "Step & Shoot 3D (TOF + PSF)",
          contrasteIV: cp["Contraindicación Contraste"] !== "Sí" && rf.toLowerCase().includes('contraste'),
          tipoContraste: "Iomeron 350 mgI/mL",
          volumenContraste: "85 mL",
          faseContraste: "Fase Portal / Arterial",
          viaRequerida: "18G / 20G flexura antecubital",
          contrasteOral: "1000 mL de agua",
          glucemia: `${cp["Glucemia (mg/dL)"] || 95} mg/dL`,
          glucemiaEstado: (cp["Glucemia (mg/dL)"] || 95) >= 200 ? "critica" : ((cp["Glucemia (mg/dL)"] || 95) >= 140 ? "limite" : "optima"),
          ayunoCumplido: isEndo ? "16 horas estricto" : "6 horas cumplidas",
          dietaPrevia: isEndo ? "Carne y grasa estricta" : "Pobre en hidratos",
          heparinaIV: isEndo ? "Heparina sódica 50 UI/kg IV administrada" : "No aplica",
          movilidad: cp["Movilidad / Traslado"] || "Autónomo",
          trasladoModo: (cp["Movilidad / Traslado"] || "").toLowerCase().includes("silla") ? "silla" : ((cp["Movilidad / Traslado"] || "").toLowerCase().includes("camilla") ? "encamado" : "autonomo"),
          sondaVesical: false,
          protesisMetal: cp["Portador Objetos Metálicos"] || "No",
          claustrofobia: "No refiere",
          vaciadoVejiga: "Pendiente",
          notasFacultativo: cp["Resumen Clínico"] || "",
          notasTecnico: "",
          protocoloMedico: null
        };

        if (savedProto && savedProto.completed) {
          newPatient.protocoloMedico = savedProto;
          if (savedProto.armsPosition) newPatient.posicionBrazos = savedProto.armsPosition;
          if (savedProto.scanRange) {
            newPatient.rangoCampos = savedProto.scanRange;
            newPatient.presetCajaCampos = mapDoctorRangeToPreset(savedProto.scanRange);
          }
          if (savedProto.uptakeTime) newPatient.tiempoProtocoloMin = parseInt(savedProto.uptakeTime, 10) || newPatient.tiempoProtocoloMin;
          if (savedProto.doctorNotes) newPatient.notasFacultativo = savedProto.doctorNotes;
          if (savedProto.doctorName) newPatient.medicoProtocolizador = savedProto.doctorName;
          if (savedProto.contrastType) newPatient.contrasteIV = (savedProto.contrastType === 'en_maquina' || savedProto.contrastType === 'en_box');
          if (savedProto.vascularPhase !== undefined) newPatient.requiereFaseVascular = (savedProto.vascularPhase === 'si');
        }

        state.patients.push(newPatient);
      }
    });
  }

  function mergeLateScanOrders() {
    try {
      const lateScansMap = JSON.parse(localStorage.getItem('PET_SHARED_LATE_SCAN_ORDERS_V1') || '{}');
      state.patients.forEach(p => {
        const tardia = lateScansMap[p.id] || lateScansMap[p.nhc];
        if (tardia && tardia.requerida) {
          p.tardiaPautada = tardia;
          if (!p.presetCajaCamposManual) {
            p.presetCajaCampos = tardia.zona || 'pelvis_tardia';
          }
        } else {
          p.tardiaPautada = null;
        }
      });
    } catch (e) { }
  }

  function getMobilityTextTsid(modo) {
    if (modo === 'encamado') return 'Encamado / En camilla';
    if (modo === 'silla') return 'En silla de ruedas';
    if (modo === 'ayuda') return 'Necesita ayuda / Asistencia';
    return 'Autónomo';
  }

  function mergeNursingData() {
    try {
      const sharedMap = JSON.parse(localStorage.getItem('PET_SHARED_INJECTIONS_AND_MOBILITY_V1') || '{}');
      state.patients.forEach((p, idx) => {
        const s = sharedMap[p.id] || sharedMap[p.nhc];
        if (s) {
          if (s.horaInyeccion !== undefined && s.horaInyeccion !== '') p.horaInyeccion = s.horaInyeccion;
          if (s.glucemia !== undefined && s.glucemia !== '') {
            const gNum = parseInt(String(s.glucemia).replace(/[^\d]/g, ''), 10);
            if (!isNaN(gNum) && gNum > 0) {
              p.glucemia = `${gNum} mg/dL`;
              p.glucemiaEstado = gNum >= 200 ? 'critica' : (gNum >= 140 ? 'alerta' : 'optima');
            }
          }
          if (s.trasladoModo) {
            p.trasladoModo = s.trasladoModo;
            p.movilidad = getMobilityTextTsid(s.trasladoModo);
          }
          if (s.sondaVesical !== undefined) p.sondaVesical = s.sondaVesical;
          if (s.boxAsignado !== undefined) p.boxAsignado = s.boxAsignado;
          if (s.boxAnterior !== undefined) p.boxAnterior = s.boxAnterior;
          if (s.boxCambiado !== undefined) p.boxCambiado = s.boxCambiado;
          if (s.boxVerificado !== undefined) p.boxVerificado = s.boxVerificado;
          if (s.horaCambioBox !== undefined) p.horaCambioBox = s.horaCambioBox;
          if (s.horaVerificacionBox !== undefined) p.horaVerificacionBox = s.horaVerificacionBox;
          if (p.horaInyeccion && (!p.estado || p.estado === 'waiting')) {
            p.estado = 'uptake';
          } else if (!p.horaInyeccion && (p.estado === 'uptake' || p.estado === 'ready')) {
            p.estado = 'waiting';
          }
        } else if (!p.horaInyeccion && (p.estado === 'uptake' || p.estado === 'ready')) {
          p.estado = 'waiting';
        }
      });
    } catch (e) { }
  }

  async function syncWithMasterDatabase() {
    let masterList = [];

    // 1. Probar API en vivo del servidor
    try {
      const res = await fetch('/api/sync-database');
      if (res.ok) {
        const json = await res.json();
        const data = json.data || (Array.isArray(json) ? json : []);
        if (Array.isArray(data) && data.length > 0) {
          masterList = data;
        }
      }
    } catch (e) { }

    // 2. Probar JSON estático si no hubo respuesta de API
    if (!masterList || masterList.length === 0) {
      try {
        const res2 = await fetch('../pet_ct_triage/web_app/peticiones_db.json?t=' + Date.now());
        if (res2.ok) {
          const data2 = await res2.json();
          if (Array.isArray(data2) && data2.length > 0) masterList = data2;
        }
      } catch (e) { }
    }

    if (!masterList || masterList.length === 0) {
      try {
        const res3 = await fetch('../pet_peticion_medica/database/peticiones_db.json?t=' + Date.now());
        if (res3.ok) {
          const data3 = await res3.json();
          if (Array.isArray(data3) && data3.length > 0) masterList = data3;
        }
      } catch (e) { }
    }

    if (Array.isArray(masterList) && masterList.length > 0) {
      mergeMasterDatabaseItems(masterList);
    }
    try {
      const storedMaster = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (storedMaster) {
        const parsedMaster = JSON.parse(storedMaster);
        if (Array.isArray(parsedMaster) && parsedMaster.length > 0) mergeMasterDatabaseItems(parsedMaster);
      }
      const storedTriageCited = localStorage.getItem('PET_TRIAGE_CITED_PATIENTS_V1');
      if (storedTriageCited) {
        const parsedTriageCited = JSON.parse(storedTriageCited);
        if (Array.isArray(parsedTriageCited) && parsedTriageCited.length > 0) mergeMasterDatabaseItems(parsedTriageCited);
      }
    } catch (e) { }

    mergeLateScanOrders();
    mergeNursingData();
    mergeDischargeData();
    savePatients();
    updateDateButtons();
    renderWorklist();
    updateKpis();
  }

  async function recargarPacientesDesdeTriajeTsid() {
    const icon = document.getElementById('reloadTriageTsidIcon');
    if (icon) {
      icon.style.display = 'inline-block';
      icon.style.transform = 'rotate(360deg)';
      icon.style.transition = 'transform 0.6s ease';
    }
    loadPatients();
    await syncWithMasterDatabase();
    const currentFiltered = getFilteredPatients();
    if (currentFiltered.length > 0 && (!state.selectedPatient || !currentFiltered.some(p => p.id === state.selectedPatient.id))) {
      selectPatient(currentFiltered[0].id);
    }
    setTimeout(() => {
      if (icon) {
        icon.style.transform = 'none';
        icon.style.transition = 'none';
      }
    }, 600);
    if (typeof showToast === 'function') {
      showToast(`✅ Recargados ${state.patients.length} paciente(s) citado(s) desde el Programa de Triaje`, 'success');
    }
  }
  window.recargarPacientesDesdeTriajeTsid = recargarPacientesDesdeTriajeTsid;

  function savePatients() {
    try {
      localStorage.setItem('PET_TSID_WORKLIST_V1', JSON.stringify(state.patients));
    } catch (e) { }
  }

  // 5. EVENT LISTENERS
  function setupEventListeners() {
    // Búsqueda
    const searchInput = document.getElementById('searchPatientInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.searchTerm = e.target.value.toLowerCase().trim();
        renderWorklist();
      });
    }

    // Filtro por Estado
    const statusSelect = document.getElementById('filterStatusSelect');
    if (statusSelect) {
      statusSelect.addEventListener('change', (e) => {
        state.filterStatus = e.target.value;
        renderWorklist();
      });
    }

    // Filtro por Radiofármaco
    const tracerSelect = document.getElementById('filterTracerSelect');
    if (tracerSelect) {
      tracerSelect.addEventListener('change', (e) => {
        state.filterTracer = e.target.value;
        renderWorklist();
      });
    }

    // Presets de fecha (Hoy, Mañana, Ver Todos)
    const dateBtns = document.querySelectorAll('.date-pill-btn[data-date]');
    dateBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.date-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const customInput = document.getElementById('inputCustomDate');
        if (customInput) customInput.value = '';
        state.selectedDate = btn.dataset.date || 'today';
        renderWorklist();

        const currentFiltered = getFilteredPatients();
        if (currentFiltered.length > 0) {
          if (!state.selectedPatient || !currentFiltered.some(p => p.id === state.selectedPatient.id)) {
            selectPatient(currentFiltered[0].id);
          }
        }
      });
    });

    // Selector de fecha personalizada
    const customDateInput = document.getElementById('inputCustomDate');
    if (customDateInput) {
      customDateInput.addEventListener('change', () => {
        const val = customDateInput.value;
        if (val) {
          document.querySelectorAll('.date-pill-btn').forEach(b => b.classList.remove('active'));
          state.selectedDate = val;
          renderWorklist();
          const currentFiltered = getFilteredPatients();
          if (currentFiltered.length > 0) {
            selectPatient(currentFiltered[0].id);
          }
        }
      });
    }

    // Botones Navegación Día Anterior / Día Siguiente
    const btnPrev = document.getElementById('btnPrevDay');
    const btnNext = document.getElementById('btnNextDay');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => stepDateTech(-1));
    }
    if (btnNext) {
      btnNext.addEventListener('click', () => stepDateTech(1));
    }

    // Botón Imprimir Hoja de Trabajo
    const btnPrint = document.getElementById('btnPrintWorksheet');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        window.print();
      });
    }

    // Botón Avanzar Estado
    const btnAdvance = document.getElementById('btnAdvanceStatus');
    if (btnAdvance) {
      btnAdvance.addEventListener('click', advanceCurrentPatientStatus);
    }

    // Botón Registrar Inyección Ahora
    const btnInjectNow = document.getElementById('btnInjectNow');
    if (btnInjectNow) {
      btnInjectNow.addEventListener('click', registerInjectionNow);
    }

    // Guardar Notas del Técnico en vivo
    const txtNotes = document.getElementById('tsidPatientNotes');
    if (txtNotes) {
      txtNotes.addEventListener('input', (e) => {
        if (state.selectedPatient) {
          state.selectedPatient.notasTecnico = e.target.value;
          savePatients();
        }
      });
    }

    // Botón Micrófono para Dictar Notas del Técnico
    const micBtn = document.getElementById('tsidMicBtn');
    if (micBtn) {
      micBtn.addEventListener('click', toggleTsidSpeechRecognition);
    }
  }

  // Avanzar o retroceder fecha día a día
  function stepDateTech(delta) {
    let cur = state.selectedDate;
    if (cur === 'today') cur = getTodayStr();
    else if (cur === 'tomorrow') cur = getTomorrowStr();
    else if (cur === 'all' || !cur) cur = getTodayStr();

    const [y, m, d] = cur.split('-').map(Number);
    const dt = new Date(y, m - 1, d + delta);
    const nextStr = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;

    document.querySelectorAll('.date-pill-btn').forEach(b => b.classList.remove('active'));
    const customInput = document.getElementById('inputCustomDate');
    if (customInput) customInput.value = nextStr;
    state.selectedDate = nextStr;
    renderWorklist();

    const currentFiltered = getFilteredPatients();
    if (currentFiltered.length > 0) {
      selectPatient(currentFiltered[0].id);
    }
  }

  // Helper para filtrar pacientes con criterios activos
  function getFilteredPatients() {
    const hoyStr = getTodayStr();
    const mananaStr = getTomorrowStr();

    const res = state.patients.filter(p => {
      // 1. Filtro por Fecha
      const pFecha = p.fechaCita || hoyStr;
      if (state.selectedDate === 'today') {
        if (pFecha !== hoyStr) return false;
      } else if (state.selectedDate === 'tomorrow') {
        if (pFecha !== mananaStr) return false;
      } else if (state.selectedDate !== 'all') {
        if (pFecha !== state.selectedDate) return false;
      }

      // 2. Filtro texto de búsqueda
      if (state.searchTerm) {
        const matchName = (p.nombre || '').toLowerCase().includes(state.searchTerm);
        const matchNhc = (p.nhc || '').toLowerCase().includes(state.searchTerm);
        const matchProto = (p.protocolo || '').toLowerCase().includes(state.searchTerm);
        if (!matchName && !matchNhc && !matchProto) return false;
      }

      // 3. Filtro estado (incluye filtros rápidos de protocolo médico)
      if (state.filterStatus === 'proto_pending') {
        if (p.protocoloMedico && p.protocoloMedico.completed) return false;
      } else if (state.filterStatus === 'proto_done') {
        if (!p.protocoloMedico || !p.protocoloMedico.completed) return false;
      } else if (state.filterStatus !== 'all' && p.estado !== state.filterStatus) {
        return false;
      }

      // 4. Filtro radiofármaco
      if (state.filterTracer !== 'all') {
        if (!(p.radiofarmaco || '').toLowerCase().includes(state.filterTracer.toLowerCase())) {
          return false;
        }
      }

      return true;
    });

    // Ordenar cronológicamente por hora de cita
    res.sort((a, b) => {
      const timeA = String(a.horaCita || '99:99').slice(0, 5);
      const timeB = String(b.horaCita || '99:99').slice(0, 5);
      return timeA.localeCompare(timeB);
    });

    return res;
  }

  // 6. RENDERIZADO DE LA AGENDA (WORKLIST) Y PANEL EN VIVO DE LOS 5 BOXES
  function renderFiveBoxesSummaryTsid() {
    const stripEl = document.getElementById('tsidFiveBoxesSummaryStrip');
    if (!stripEl) return;

    const hoyStr = getTodayStr();
    const activePatients = state.patients.filter(p => {
      const pFecha = p.fechaCita || hoyStr;
      if (state.selectedDate === 'today') return pFecha === hoyStr;
      if (state.selectedDate === 'tomorrow') return pFecha === getTomorrowStr();
      if (state.selectedDate !== 'all') return pFecha === state.selectedDate;
      return true;
    });

    const boxNames = ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'];
    const cardsHtml = boxNames.map(bName => {
      const occupant = activePatients.find(p => p.boxAsignado === bName && p.estado !== 'done');
      const isOccupied = !!occupant;
      const isPendingVerify = isOccupied && occupant.boxCambiado && !occupant.boxVerificado;
      const isSelected = isOccupied && state.selectedPatient && state.selectedPatient.id === occupant.id;

      return `
        <div class="tsid-box-summary-card" onclick="${isOccupied ? `selectPatientTsidById('${occupant.id}')` : ''}"
             style="background:${isOccupied ? (isPendingVerify ? '#fffbeb' : '#f0f9ff') : '#f8fafc'}; border:2px solid ${isOccupied ? (isPendingVerify ? '#f59e0b' : (isSelected ? '#004868' : '#0284c7')) : '#cbd5e1'}; border-radius:10px; padding:0.55rem 0.7rem; display:flex; flex-direction:column; gap:3px; cursor:${isOccupied ? 'pointer' : 'default'}; box-shadow:${isSelected ? '0 0 0 3px rgba(2,132,199,0.22)' : 'none'}; transition:all 0.15s;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:0.84rem; color:${isOccupied ? '#0c4a6e' : '#64748b'};">🚪 ${bName.toUpperCase()}</span>
            <span style="font-size:0.65rem; font-weight:800; padding:1px 6px; border-radius:10px; background:${isOccupied ? (isPendingVerify ? '#fef3c7' : '#bae6fd') : '#e2e8f0'}; color:${isOccupied ? (isPendingVerify ? '#b45309' : '#0369a1') : '#64748b'};">
              ${isOccupied ? (isPendingVerify ? '⚠️ VERIFICAR CAMBIO' : 'OCUPADO') : 'LIBRE'}
            </span>
          </div>
          ${isOccupied ? `
            <div style="font-weight:800; font-size:0.78rem; color:#0f172a; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${occupant.nombre}">${occupant.nombre}</div>
            <div style="font-size:0.68rem; color:#475569; font-weight:700;">
              ${occupant.nhc} ${occupant.horaInyeccion ? `· 💉 ${occupant.horaInyeccion}` : ''}
              ${occupant.boxCambiado ? `<span style="display:block; color:${occupant.boxVerificado ? '#15803d' : '#b45309'}; font-weight:800; margin-top:1px;">🔄 De ${occupant.boxAnterior || 'Box previo'} ➔ ${bName} (${occupant.boxVerificado ? '✅ Verificado' : '⚠️ Sin verificar'})</span>` : ''}
            </div>
          ` : `
            <div style="font-size:0.74rem; color:#94a3b8; font-style:italic; padding:4px 0;">Disponible</div>
          `}
        </div>
      `;
    }).join('');

    stripEl.innerHTML = `
      <div style="background:#ffffff; border:1.5px solid #bae6fd; border-radius:12px; padding:0.75rem 1rem; box-shadow:0 2px 8px rgba(2,132,199,0.06);">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:0.55rem;">
          <div style="font-family:'Outfit',sans-serif; font-weight:800; font-size:0.88rem; color:#0369a1; display:flex; align-items:center; gap:6px;">
            <span>🚪</span> ESTADO EN VIVO DE LOS 5 BOXES DE INYECCIÓN Y REPOSO (SINCRONIZADO CON ENFERMERÍA)
          </div>
          <span style="font-size:0.72rem; font-weight:700; color:#0284c7; background:#e0f2fe; padding:2px 8px; border-radius:12px;">
            Capacidad máxima: 5 Boxes · Haz clic en un Box ocupado para abrir la ficha del paciente
          </span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(5, minmax(130px, 1fr)); gap:8px;">
          ${cardsHtml}
        </div>
      </div>
    `;
  }

  function renderWorklist() {
    const container = document.getElementById('patientCardsList');
    if (!container) return;

    const filtered = getFilteredPatients();

    // Actualizar contadores KPIs, 5 Boxes y badges de botones
    updateKpis();
    updateDateButtons();
    renderFiveBoxesSummaryTsid();

    container.innerHTML = '';

    if (filtered.length === 0) {
      const hoyStr = getTodayStr();
      const mananaStr = getTomorrowStr();
      let msgFecha = 'la fecha seleccionada';
      if (state.selectedDate === 'today') msgFecha = `Hoy (${hoyStr})`;
      if (state.selectedDate === 'tomorrow') msgFecha = `Mañana (${mananaStr})`;

      container.innerHTML = `
        <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: #ffffff; border-radius: var(--radius-md); border: 1.5px dashed #cbd5e1;">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <div style="font-weight: 700;">No hay pacientes citados para ${msgFecha}</div>
          <div style="font-size: 0.8rem; margin-top: 4px; margin-bottom: 0.85rem;">Si acaba de citar pacientes en el Programa de Triaje, pulse el botón inferior para cargarlos:</div>
          <button type="button" onclick="window.recargarPacientesDesdeTriajeTsid && window.recargarPacientesDesdeTriajeTsid()"
            style="background: linear-gradient(135deg, #0284c7, #0369a1); color: #ffffff; border: 1.5px solid #0369a1; border-radius: 8px; padding: 7px 14px; font-size: 0.8rem; font-weight: 800; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; box-shadow: 0 3px 10px rgba(2, 132, 199, 0.25);">
            🔄 Recargar Pacientes de Triaje
          </button>
        </div>
      `;
      return;
    }

    filtered.forEach(p => {
      const isSelected = state.selectedPatient && (String(state.selectedPatient.id) === String(p.id) || (p.nhc && String(state.selectedPatient.nhc) === String(p.nhc)));
      const card = document.createElement('article');
      card.className = `tech-patient-card ${isSelected ? 'selected' : ''}`;
      card.dataset.patientId = p.id;
      card.dataset.patientNhc = p.nhc || '';
      card.onclick = () => selectPatient(p.id);

      // Ningún paciente puede aparecer en reposo ni listo para máquina si aún no ha sido inyectado
      if (!p.horaInyeccion && (p.estado === 'uptake' || p.estado === 'ready')) {
        p.estado = 'waiting';
      }

      // Cálculo de hora a máquina y estado del temporizador
      const timeInfo = calculateUptakeTiming(p);
      const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);

      // Estado badge label
      let statusLabel = 'En Espera';
      let statusClass = 'waiting';
      if (hasVascularOrder && !p.faseVascularIniciada && p.estado === 'waiting') {
        statusLabel = '🩸 Hacer Fase Vascular';
        statusClass = 'vascular-alert';
      } else if (p.estado === 'uptake' && p.horaInyeccion) {
        statusLabel = hasVascularOrder
          ? '⏳ Desc. 2ª Fase (' + timeInfo.remainingText + ')'
          : '⏳ Reposo (' + timeInfo.remainingText + ')';
        statusClass = 'uptake';
      } else if (p.estado === 'ready' && p.horaInyeccion) {
        statusLabel = hasVascularOrder ? '🟢 Listo 2ª Fase' : '🟢 ¡A Máquina!';
        statusClass = 'ready';
      } else if (p.estado === 'scanning') {
        statusLabel = '🟣 En Escáner';
        statusClass = 'scanning';
      } else if (p.estado === 'done') {
        statusLabel = '✅ Completado';
        statusClass = 'done';
      }

      const isProtoCompleted = !!(p.protocoloMedico && p.protocoloMedico.completed);
      const protoDocName = (p.protocoloMedico && p.protocoloMedico.doctorName) || p.medicoProtocolizador || '';
      const protoTag = isProtoCompleted
        ? `<span class="quick-tag" style="background:#dcfce7; color:#166534; border:1px solid #86efac; font-weight:800;" title="Protocolizado por ${protoDocName}">🩺 PROTOCOLIZADO (${protoDocName || 'MÉDICO'})</span>`
        : `<span class="quick-tag" style="background:#fef3c7; color:#92400e; border:1px solid #fcd34d; font-weight:700;" title="Protocolo técnico estándar aplicado por defecto">⏳ PROTOCOLO ESTÁNDAR (Pdte. Médico)</span>`;

      const vascularTag = hasVascularOrder
        ? (p.faseVascularIniciada
          ? `<span class="quick-tag" style="background:#dcfce7; color:#166534; border:1.5px solid #10b981; font-weight:800;">🩸 Fase Vascular (${p.horaInicioFaseVascular || p.horaInyeccion}h) ➔ ⏳ 2ª Fase</span>`
          : `<span class="quick-tag" style="background:#fef2f2; color:#b91c1c; border:1.5px solid #ef4444; font-weight:800;">🩸 HACER FASE VASCULAR (1ª FASE)</span>`)
        : '';

      // Quick tags
      const contrastTag = p.contrasteIV
        ? `<span class="quick-tag tag-contrast-yes">💉 CON CONTRASTE</span>`
        : `<span class="quick-tag tag-contrast-no">🚫 SIN CONTRASTE</span>`;

      const armsTag = p.posicionBrazos === 'arriba'
        ? `<span class="quick-tag tag-arms-up">🙌 Brazos Arriba</span>`
        : `<span class="quick-tag tag-arms-down">👇 Brazos Abajo</span>`;

      const mobilityTag = p.trasladoModo === 'silla'
        ? `<span class="quick-tag tag-mobility-silla">♿ EN SILLA</span>`
        : (p.trasladoModo === 'encamado'
          ? `<span class="quick-tag tag-mobility-encamado">🛏️ ENCAMADO</span>`
          : (p.trasladoModo === 'ayuda'
            ? `<span class="quick-tag" style="background:#fffbeb; color:#b45309; border:1.5px solid #f59e0b; font-weight:800;">🤝 NECESITA AYUDA</span>`
            : `<span class="quick-tag" style="background:#f0fdf4; color:#15803d; border:1px solid #86efac; font-weight:700;">🚶 AUTÓNOMO</span>`));

      const sondaTag = p.sondaVesical
        ? `<span class="quick-tag tag-catheter-sonda">🩺 BOLSA DE ORINA</span>`
        : '';

      const boxTag = p.boxAsignado
        ? `<span class="quick-tag" style="background:${p.boxCambiado && !p.boxVerificado ? '#fef3c7' : '#e0f2fe'}; color:${p.boxCambiado && !p.boxVerificado ? '#b45309' : '#0369a1'}; border:1.5px solid ${p.boxCambiado && !p.boxVerificado ? '#f59e0b' : '#38bdf8'}; font-weight:800;">
               🚪 ${p.boxAsignado.toUpperCase()}${p.boxCambiado ? (p.boxVerificado ? ` (🔄 De ${p.boxAnterior} ✅)` : ` (⚠️ Cambio de ${p.boxAnterior} sin verificar)`) : ''}
             </span>`
        : `<span class="quick-tag" style="background:#f1f5f9; color:#64748b; border:1px dashed #cbd5e1; font-weight:700;">🚪 Sin Box</span>`;

      const dischargeTag = p.altaMedicaAutorizada
        ? `<span class="quick-tag" style="background:#dcfce7; color:#065f46; border:1.5px solid #10b981; font-weight:800;">🟢 PUEDE IRSE</span>`
        : '';

      const tardiaTag = (p.tardiaPautada && p.tardiaPautada.requerida)
        ? `<span class="quick-tag" style="background:#fef3c7; color:#92400e; border:1.5px solid #f59e0b; font-weight:800;">🕒 TARDÍA PAUTADA: ${String(p.tardiaPautada.zonaNombre || 'Pelvis').split('(')[0].trim()}</span>`
        : '';

      card.innerHTML = `
        <div class="card-top-row">
          <div class="patient-times-badge">
            ${p.fechaCita ? `<span style="font-size:0.75rem; font-weight:800; color:#0369a1; background:#e0f2fe; padding:2px 6px; border-radius:4px; margin-right:4px;">${p.fechaCita.slice(5).replace('-', '/')}</span>` : ''}
            <span class="time-slot" title="Hora de cita">${p.horaCita}</span>
            <span>➔</span>
            <span class="time-scan-target" title="Hora calculada a máquina">⏱️ ${timeInfo.targetMachineTime}</span>
          </div>
          <span class="status-badge ${statusClass}">${statusLabel}</span>
        </div>

        <div>
          <div class="card-patient-name">${p.nombre}</div>
          <div class="card-patient-meta">
            <span><strong>${p.nhc}</strong></span>
            <span>·</span>
            <span>${p.edad} años (${p.sexo})</span>
            <span>·</span>
            <span style="font-weight:700; color:var(--sergas-navy);">${p.radiofarmaco}</span>
          </div>
        </div>

        <div class="card-protocol-title">
          <span>📋</span> ${p.protocolo}
        </div>

        <div class="card-quick-tags">
          ${boxTag}
          ${vascularTag}
          ${tardiaTag}
          ${dischargeTag}
          ${protoTag}
          ${contrastTag}
          ${armsTag}
          ${mobilityTag}
          ${sondaTag}
          <span class="quick-tag tag-alert-glucose">🩸 ${p.glucemia}</span>
        </div>

        ${hasVascularOrder && !p.faseVascularIniciada && p.estado === 'waiting' ? `
          <button type="button"
                  onclick="event.stopPropagation(); iniciarFaseVascularPaciente('${p.id}')"
                  style="margin-top:4px; width:100%; background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:#ffffff; border:none; border-radius:7px; padding:7px 10px; font-family:'Outfit',sans-serif; font-size:0.8rem; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:6px; box-shadow:0 3px 8px rgba(220,38,38,0.3);">
            🩸 Empezar Fase Vascular ➔ Descontar ${p.tiempoProtocoloMin || 60}m (2ª Fase)
          </button>
        ` : ''}

        ${p.estado === 'uptake' ? `
          <div class="uptake-mini-progress">
            <div class="mini-bar-bg">
              <div class="mini-bar-fill" style="width: ${timeInfo.percentDone}%;"></div>
            </div>
            <span class="mini-time-text">${hasVascularOrder ? '2ª Fase: ' : ''}${timeInfo.remainingText}</span>
          </div>
        ` : ''}
      `;

      container.appendChild(card);
    });
  }

  // 7. CÁLCULO DE TIEMPOS DE REPOSO (UPTAKE TO MACHINE)
  function calculateUptakeTiming(patient) {
    const totalProtocolMin = Number(patient.tiempoProtocoloMin) || 60;
    if (!patient.horaInyeccion) {
      return {
        targetMachineTime: '--:--',
        remainingText: '-- min',
        remainingSeconds: totalProtocolMin * 60,
        percentDone: 0,
        isOvertime: false
      };
    }

    const [injH, injM] = patient.horaInyeccion.split(':').map(Number);

    // Calcular hora objetivo a máquina
    let targetM = injM + totalProtocolMin;
    let targetH = injH + Math.floor(targetM / 60);
    targetM = targetM % 60;
    targetH = targetH % 24;
    const targetMachineTime = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;

    // Simulación del reloj actual
    const now = new Date();
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentS = now.getSeconds();

    const currentTotalSec = (currentH * 3600) + (currentM * 60) + currentS;
    const targetTotalSec = (targetH * 3600) + (targetM * 60);

    const diffSec = targetTotalSec - currentTotalSec;

    if (diffSec <= 0) {
      const overtimeSec = Math.abs(diffSec);
      const overtimeMin = Math.floor(overtimeSec / 60);
      return {
        targetMachineTime,
        remainingText: overtimeMin > 0 ? `+${overtimeMin}m (Listo)` : '¡A Máquina!',
        remainingSeconds: diffSec,
        percentDone: 100,
        isOvertime: overtimeMin >= 10
      };
    } else {
      const remMin = Math.floor(diffSec / 60);
      const remSec = diffSec % 60;
      const totalSecSpan = totalProtocolMin * 60;
      const elapsedSec = totalSecSpan - diffSec;
      const percent = Math.min(100, Math.max(0, Math.round((elapsedSec / totalSecSpan) * 100)));

      return {
        targetMachineTime,
        remainingText: `${remMin}m ${remSec}s`,
        remainingSeconds: diffSec,
        percentDone: percent,
        isOvertime: false
      };
    }
  }

  // 8. SELECCIÓN DE PACIENTE Y RENDERIZADO DEL DETALLE TÉCNICO
  function selectPatient(patientId) {
    if (!patientId) return;
    const pat = state.patients.find(p => String(p.id) === String(patientId) || String(p.nhc) === String(patientId));
    if (!pat) return;

    state.selectedPatient = pat;

    // Actualizar selección visual de tarjetas e indicadores de 5 Boxes sin destruir el scroll de la lista
    const cards = document.querySelectorAll('#patientCardsList .tech-patient-card');
    if (cards.length > 0) {
      cards.forEach(c => {
        if (String(c.dataset.patientId) === String(pat.id) || (pat.nhc && String(c.dataset.patientNhc) === String(pat.nhc))) {
          c.classList.add('selected');
        } else {
          c.classList.remove('selected');
        }
      });
      renderFiveBoxesSummaryTsid();
    } else {
      renderWorklist();
    }

    renderPatientDetail(pat);
  }

  function renderPatientDetail(p) {
    if (!p) return;
    // 1. Títulos y Metas
    document.getElementById('detailPatName').textContent = p.nombre || 'Paciente';
    document.getElementById('detailPatNHC').textContent = `${p.nhc || 'NHC'} · Cita: ${p.fechaCita || 'Hoy'} (${p.horaCita || '--:--'})`;
    document.getElementById('detailPatAge').textContent = `${p.edad || '--'} años (${p.sexo || 'M'})`;
    document.getElementById('detailPatTracer').textContent = `${p.radiofarmaco || '18F-FDG'} (${p.dosisMBq || 280} MBq)`;
    document.getElementById('detailPatProtocol').textContent = p.protocolo || 'Estudio PET/CT';

    // Botones de acción: avance de estado, tardía y eliminar
    try { updateAdvanceStatusButton(p); } catch (e) { console.error(e); }

    // Banner de Alta Médica (si el facultativo la ha autorizado)
    try { renderDischargeStatusBanner(p); } catch (e) { console.error(e); }

    // 2. Cronómetro y Hitos de Reposo
    try { renderUptakeSection(p); } catch (e) { console.error(e); }

    // 2B. Caja Sincronizada de Box del Paciente (Boxes 1 a 5) y Verificación de Cambio de Box
    try { renderPatientBoxSyncCardTsid(p); } catch (e) { console.error(e); }

    // 3. Diagrama Visual Vertical SVG con Caja de Adquisición de Campos
    try { renderVerticalPositioningAndScanBoxSvg(p); } catch (e) { console.error(e); }

    // GENERADOR DEL ESQUEMA CORONAL DE LA TARDÍA ENVIADA POR EL MÉDICO (CON LA CAJA EXACTA)
    function buildDoctorTardiaSvgHtml(tardia, svgHeight = 290) {
      const presetMap = {
        cabeza_cuello_tardia: { boxTop: 40, boxHeight: 110, shortLabel: 'CABEZA Y CUELLO' },
        torax_tardia: { boxTop: 130, boxHeight: 140, shortLabel: 'TÓRAX / CORAZÓN' },
        higado_tardia: { boxTop: 195, boxHeight: 140, shortLabel: 'HÍGADO / ABDOMEN' },
        pelvis_tardia: { boxTop: 290, boxHeight: 140, shortLabel: 'PELVIS / VEJIGA' },
        extremidades_tardia: { boxTop: 420, boxHeight: 140, shortLabel: 'EXTREMIDADES' }
      };
      const zKey = (tardia && tardia.zona) || 'pelvis_tardia';
      const defPreset = presetMap[zKey] || presetMap.pelvis_tardia;
      const top = (tardia && typeof tardia.boxTop === 'number') ? Math.round(tardia.boxTop) : defPreset.boxTop;
      const height = (tardia && typeof tardia.boxHeight === 'number') ? Math.round(tardia.boxHeight) : defPreset.boxHeight;
      const midY = Math.round(top + height / 2);
      const bot = top + height;
      const startCm = (tardia && typeof tardia.startCm === 'number') ? tardia.startCm : Math.max(0, Math.round((top - 50) / 2.75));
      const endCm = (tardia && typeof tardia.endCm === 'number') ? tardia.endCm : Math.max(startCm + 15, Math.round((bot - 50) / 2.75));
      const numCamas = (tardia && tardia.numCamas) || Math.max(1, Math.min(4, Math.round(height / 70)));
      const shortLabel = defPreset.shortLabel;

      const rulerMarks = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180].map((cm, idx) => {
        const y = 50 + (idx * 55);
        return `<line x1="36" y1="${y}" x2="44" y2="${y}" stroke="#64748b" stroke-width="1.5"/>
              <text x="32" y="${y + 3}" font-family="'JetBrains Mono',monospace" font-size="8.5" fill="#94a3b8" text-anchor="end">${cm}</text>`;
      }).join('');

      return `
      <svg viewBox="0 0 340 620" width="100%" height="${svgHeight}" style="display:block; background:#0f172a; border-radius:10px; border:2px solid #f59e0b; box-shadow:0 6px 18px rgba(15,23,42,0.35);" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="tsidTardiaBodyGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.88"/>
            <stop offset="50%" stop-color="#e0f2fe" stop-opacity="0.95"/>
            <stop offset="100%" stop-color="#93c5fd" stop-opacity="0.88"/>
          </linearGradient>
        </defs>

        <!-- Fondo oscuro estilo escáner PET/CT -->
        <rect x="0" y="0" width="340" height="620" fill="#0f172a" rx="10"/>

        <!-- Regla Eje Z -->
        <g stroke="#334155" stroke-width="1">
          <line x1="44" y1="25" x2="44" y2="595"/>
          ${rulerMarks}
          <text x="26" y="18" font-family="'Outfit',sans-serif" font-size="8.5" font-weight="800" fill="#38bdf8">Z(cm)</text>
        </g>

        <!-- Camilla Tomográfica -->
        <rect x="115" y="25" width="160" height="580" rx="18" fill="#1e293b" stroke="#334155" stroke-width="2" opacity="0.85"/>

        <!-- Silueta Anatómica del Paciente con Órganos de Referencia -->
        <g>
          <!-- Brazos elevados -->
          <path d="M 152 145 C 130 130, 126 70, 155 34 C 160 28, 168 32, 164 42 C 145 74, 148 120, 166 142 Z" fill="#93c5fd" stroke="#38bdf8" stroke-width="1.8" opacity="0.85"/>
          <path d="M 238 145 C 260 130, 264 70, 235 34 C 230 28, 222 32, 226 42 C 245 74, 242 120, 224 142 Z" fill="#93c5fd" stroke="#38bdf8" stroke-width="1.8" opacity="0.85"/>

          <!-- Cabeza y Encéfalo -->
          <ellipse cx="195" cy="72" rx="28" ry="34" fill="url(#tsidTardiaBodyGrad)" stroke="#38bdf8" stroke-width="2"/>
          <ellipse cx="195" cy="64" rx="21" ry="20" fill="#7dd3fc" stroke="#0284c7" stroke-width="1.2" opacity="0.85"/>
          <path d="M 195 45 L 195 83 M 178 64 Q 195 58 212 64" stroke="#0369a1" stroke-width="1" opacity="0.5" fill="none"/>

          <!-- Cuello y Tiroides -->
          <rect x="186" y="104" width="18" height="26" rx="4" fill="url(#tsidTardiaBodyGrad)" stroke="#38bdf8" stroke-width="2"/>
          <path d="M 190 114 Q 195 120 200 114 Q 202 123 198 125 Q 195 121 192 125 Q 188 123 190 114 Z" fill="#f472b6" opacity="0.75"/>

          <!-- Tronco -->
          <path d="M 152 135 L 238 135 Q 245 190 236 240 Q 244 285 232 340 L 158 340 Q 146 285 154 240 Q 145 190 152 135 Z" fill="url(#tsidTardiaBodyGrad)" stroke="#38bdf8" stroke-width="2"/>

          <!-- Pulmones y Corazón -->
          <path d="M 188 144 C 170 144, 160 165, 160 195 C 160 202, 178 200, 188 194 Z" fill="#93c5fd" stroke="#0284c7" stroke-width="1.2" opacity="0.8"/>
          <path d="M 202 144 C 220 144, 230 165, 230 195 C 230 202, 212 200, 202 194 Z" fill="#93c5fd" stroke="#0284c7" stroke-width="1.2" opacity="0.8"/>
          <path d="M 193 166 C 188 162, 182 170, 186 182 C 190 190, 202 192, 205 184 C 208 175, 200 165, 193 166 Z" fill="#ef4444" opacity="0.75"/>

          <!-- Hígado y Estómago -->
          <path d="M 158 205 C 175 202, 202 208, 208 218 C 200 228, 175 242, 160 245 Z" fill="#b45309" opacity="0.65" stroke="#78350f" stroke-width="1"/>
          <path d="M 205 212 C 218 210, 228 220, 224 236 C 218 242, 206 235, 205 224 Z" fill="#fb923c" opacity="0.55"/>

          <!-- Riñones -->
          <ellipse cx="176" cy="262" rx="7" ry="12" fill="#a855f7" opacity="0.6"/>
          <ellipse cx="214" cy="264" rx="7" ry="12" fill="#a855f7" opacity="0.6"/>

          <!-- Pelvis y Vejiga / Próstata -->
          <path d="M 158 295 Q 170 288 182 308 L 182 332 Q 165 328 158 308 Z" fill="#cbd5e1" opacity="0.7"/>
          <path d="M 232 295 Q 220 288 208 308 L 208 332 Q 225 328 232 308 Z" fill="#cbd5e1" opacity="0.7"/>
          <ellipse cx="195" cy="322" rx="13" ry="11" fill="#eab308" stroke="#ca8a04" stroke-width="1.5" opacity="0.9"/>
          <circle cx="195" cy="334" r="6" fill="#f97316" opacity="0.85"/>

          <!-- Piernas y Fémures -->
          <path d="M 160 340 L 190 340 L 186 470 L 182 585 L 160 585 L 164 470 Z" fill="url(#tsidTardiaBodyGrad)" stroke="#38bdf8" stroke-width="2"/>
          <path d="M 200 340 L 230 340 L 226 470 L 230 585 L 208 585 L 204 470 Z" fill="url(#tsidTardiaBodyGrad)" stroke="#38bdf8" stroke-width="2"/>
          <line x1="175" y1="348" x2="173" y2="462" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
          <line x1="215" y1="348" x2="215" y2="462" stroke="#e2e8f0" stroke-width="4" stroke-linecap="round" opacity="0.7"/>

          <!-- Pies -->
          <ellipse cx="170" cy="590" rx="14" ry="7" fill="#93c5fd" stroke="#38bdf8" stroke-width="1.5"/>
          <ellipse cx="220" cy="590" rx="14" ry="7" fill="#93c5fd" stroke="#38bdf8" stroke-width="1.5"/>
        </g>

        <!-- Etiquetas Anatómicas Derecha -->
        <g font-family="'Outfit',sans-serif" font-size="8.5" font-weight="700" fill="#94a3b8">
          <text x="332" y="75" text-anchor="end">Cabeza/Cuello</text>
          <text x="332" y="175" text-anchor="end">Tórax/Corazón</text>
          <text x="332" y="230" text-anchor="end">Hígado/Abdomen</text>
          <text x="332" y="325" text-anchor="end">Pelvis/Vejiga</text>
          <text x="332" y="455" text-anchor="end">Extremidades</text>
        </g>

        <!-- CAJA DE TARDÍA ENVIADA POR EL MÉDICO -->
        <g>
          <rect x="58" y="${top}" width="268" height="${height}" rx="8"
                fill="rgba(69, 26, 3, 0.72)" stroke="#f59e0b" stroke-width="3"
                stroke-dasharray="8,4"/>
          <line x1="62" y1="${midY}" x2="322" y2="${midY}" stroke="#fbbf24" stroke-width="1.4" stroke-dasharray="4,4" opacity="0.9"/>
          <text x="68" y="${top + 18}" font-family="'JetBrains Mono',monospace" font-size="9" font-weight="800" fill="#fef08a">CAMA 1 TARDÍA (${startCm}cm)</text>
          <text x="68" y="${midY + 18}" font-family="'JetBrains Mono',monospace" font-size="9" font-weight="800" fill="#fef08a">CAMA ${numCamas} TARDÍA (${endCm}cm)</text>

          <!-- Láser Central -->
          <line x1="52" y1="${midY}" x2="332" y2="${midY}" stroke="#ef4444" stroke-width="1.8" stroke-dasharray="5,3"/>
          <circle cx="195" cy="${midY}" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>

          <!-- Esquinas reforzadas -->
          <path d="M 54 ${top + 16} L 54 ${top - 4} L 74 ${top - 4}" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M 330 ${top + 16} L 330 ${top - 4} L 310 ${top - 4}" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M 54 ${bot - 16} L 54 ${bot + 4} L 74 ${bot + 4}" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>
          <path d="M 330 ${bot - 16} L 330 ${bot + 4} L 310 ${bot + 4}" fill="none" stroke="#fbbf24" stroke-width="3.5" stroke-linecap="round"/>

          <!-- Etiqueta Central de la Caja -->
          <g transform="translate(195, ${midY})">
            <rect x="-86" y="-13" width="172" height="24" rx="12" fill="#451a03" stroke="#fbbf24" stroke-width="1.8" opacity="0.96"/>
            <text x="0" y="3" font-family="'Outfit',sans-serif" font-size="9" font-weight="800" fill="#fef08a" text-anchor="middle">
              🎯 CAJA: ${shortLabel} (${startCm}-${endCm}cm)
            </text>
          </g>
        </g>
      </svg>
    `;
    }

    function abrirModalImagenTardiaTsid(patientId) {
      const p = state.patients.find(x => String(x.id) === String(patientId) || String(x.nhc) === String(patientId)) || state.selectedPatient;
      if (!p || !p.tardiaPautada || !p.tardiaPautada.requerida) return;
      mostrarModalImagenTardiaRecibida(p, p.tardiaPautada);
    }
    window.abrirModalImagenTardiaTsid = abrirModalImagenTardiaTsid;
    window.buildDoctorTardiaSvgHtml = buildDoctorTardiaSvgHtml;

    const tardiaBanner = document.getElementById('tardiaMedicalOrderBanner');
    if (tardiaBanner) {
      if (p.tardiaPautada && p.tardiaPautada.requerida) {
        tardiaBanner.style.display = 'flex';
        const zonaNombre = p.tardiaPautada.zonaNombre || 'Pelvis / Foco Tardío';
        const zonaCorta = String(zonaNombre).split('/')[0].split('(')[0].trim();
        const numCamasTardia = p.tardiaPautada.numCamas || 2;
        const esperaStr = p.tardiaPautada.minutosEspera === 'inmediata' ? 'Inmediata tras micción' : `+${p.tardiaPautada.minutosEspera || 20} min`;
        const startCmVal = p.tardiaPautada.startCm !== undefined ? p.tardiaPautada.startCm : '--';
        const endCmVal = p.tardiaPautada.endCm !== undefined ? p.tardiaPautada.endCm : '--';

        tardiaBanner.innerHTML = `
          <div style="display:grid; grid-template-columns:195px 1fr; gap:16px; align-items:stretch; width:100%;">
            <!-- COLUMNA IZQUIERDA: IMAGEN DE LA TARDÍA ENVIADA POR EL MÉDICO -->
            <div onclick="abrirModalImagenTardiaTsid('${p.id}')" title="Haz clic para ver la imagen de la tardía en grande" style="cursor:pointer; display:flex; flex-direction:column; gap:5px;">
              ${buildDoctorTardiaSvgHtml(p.tardiaPautada, 290)}
              <div style="text-align:center; font-size:0.73rem; font-weight:800; color:#92400e; background:#fde68a; padding:3px 6px; border-radius:6px;">
                🔍 Ampliar Imagen Tardía
              </div>
            </div>

            <!-- COLUMNA DERECHA: DATOS DE LA ORDEN MÉDICA Y ACCIONES -->
            <div style="display:flex; flex-direction:column; justify-content:space-between; gap:10px;">
              <div>
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.5rem;">🕒</span>
                    <div>
                      <div style="font-family:'Outfit',sans-serif; font-size:1rem; font-weight:800; color:#92400e; text-transform:uppercase; letter-spacing:0.3px;">
                        IMAGEN Y ORDEN MÉDICA DE ADQUISICIÓN TARDÍA
                      </div>
                      <div style="font-size:0.86rem; color:#78350f; margin-top:2px;">
                        Zona seleccionada por el Médico en la imagen: <strong style="color:#b45309; font-size:0.92rem; background:#fde68a; padding:2px 8px; border-radius:5px;">${zonaNombre}</strong>
                      </div>
                    </div>
                  </div>
                  <span style="font-size:0.76rem; color:#065f46; font-weight:800; background:#dcfce7; padding:4px 10px; border-radius:6px; border:1px solid #86efac;">
                    🩺 Pautado por ${p.tardiaPautada.medico || 'Médico Nuclear'} (${p.tardiaPautada.horaOrden || '--:--'}h)
                  </span>
                </div>

                <!-- Coordenadas exactas de la caja enviada por el médico -->
                <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(135px, 1fr)); gap:8px; margin-top:10px;">
                  <div style="background:#ffffff; border:1.5px solid #fcd34d; border-radius:8px; padding:7px 10px;">
                    <div style="font-size:0.68rem; font-weight:800; color:#92400e; text-transform:uppercase;">📐 Rango Eje Z (Caja Médico)</div>
                    <div style="font-family:'JetBrains Mono',monospace; font-size:0.92rem; font-weight:800; color:#0f172a; margin-top:2px;">${startCmVal} cm – ${endCmVal} cm</div>
                  </div>
                  <div style="background:#ffffff; border:1.5px solid #fcd34d; border-radius:8px; padding:7px 10px;">
                    <div style="font-size:0.68rem; font-weight:800; color:#92400e; text-transform:uppercase;">🛏️ Camas a Adquirir</div>
                    <div style="font-family:'JetBrains Mono',monospace; font-size:0.92rem; font-weight:800; color:#b45309; margin-top:2px;">${numCamasTardia} ${numCamasTardia === 1 ? 'Cama' : 'Camas'} (3 min/cama)</div>
                  </div>
                  <div style="background:#ffffff; border:1.5px solid #fcd34d; border-radius:8px; padding:7px 10px;">
                    <div style="font-size:0.68rem; font-weight:800; color:#92400e; text-transform:uppercase;">⏱️ Momento Tardía</div>
                    <div style="font-family:'Outfit',sans-serif; font-size:0.9rem; font-weight:800; color:#0369a1; margin-top:2px;">${esperaStr}</div>
                  </div>
                </div>

                <div style="font-size:0.84rem; color:#451a03; background:#ffffff; border:1.5px dashed #f59e0b; border-radius:8px; padding:9px 12px; margin-top:10px;">
                  📝 <strong>Indicaciones Médicas para el Técnico TSID:</strong> ${p.tardiaPautada.indicaciones || 'Realizar adquisición focal tardía en la caja marcada en la imagen.'}
                </div>
              </div>

              <div style="display:flex; align-items:center; justify-content:flex-end; gap:10px; flex-wrap:wrap; margin-top:4px;">
                <button type="button" onclick="abrirModalImagenTardiaTsid('${p.id}')" style="background:#ffffff; color:#92400e; border:1.5px solid #f59e0b; padding:7px 14px; border-radius:8px; font-family:'Outfit',sans-serif; font-weight:800; font-size:0.82rem; cursor:pointer;">
                  🔍 Ver Imagen de Tardía en Grande
                </button>
                ${p.estado !== 'tardia' ? `
                  <button type="button" class="btn-advance-status" style="background:#d97706; padding:8px 16px; font-size:0.85rem;" onclick="solicitarTardiaPaciente()">
                    ▶️ Aplicar Caja e Iniciar Tardía de ${zonaCorta}
                  </button>
                ` : `
                  <span style="background:#d97706; color:#ffffff; font-weight:800; font-size:0.82rem; padding:7px 14px; border-radius:8px;">
                    🟣 Adquisición Tardía en Curso
                  </span>
                `}
              </div>
            </div>
          </div>
        `;
      } else {
        tardiaBanner.style.display = 'none';
        tardiaBanner.innerHTML = '';
      }
    }

    // 3C. Banner de Orden Médica de Fase Vascular (1ª Fase) + Descuento para la 2ª Fase
    try { renderVascularPhaseOrderBanner(p); } catch (e) { console.error(e); }

    // 4. Contraste IV y Parámetros Técnicos
    try { renderContrastAndTechnicalSpecs(p); } catch (e) { console.error(e); }

    // 5. Indicaciones a mayores y notas clínicas
    try { renderClinicalAlertsAndNotes(p); } catch (e) { console.error(e); }
  }

  // BANNER DE ALTA MÉDICA EN DETALLE DEL PACIENTE
  function renderDischargeStatusBanner(p) {
    let banner = document.getElementById('tsidDischargeBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'tsidDischargeBanner';
      banner.className = 'discharge-authorized-banner';
      const detailBody = document.querySelector('.detail-body');
      if (detailBody && detailBody.parentNode) {
        detailBody.parentNode.insertBefore(banner, detailBody);
      }
    }

    if (p.altaMedicaAutorizada) {
      banner.style.display = 'flex';
      banner.innerHTML = `
        <div style="font-size:1.8rem; line-height:1;">🟢</div>
        <div style="flex:1;">
          <div style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1rem; color:#065f46; letter-spacing:0.5px;">
            🟢 PUEDE IRSE — ¡ALTA MÉDICA AUTORIZADA!
          </div>
          <div style="font-size:0.85rem; color:#047857; margin-top:2px;">
            El facultativo <strong>${p.altaDoctor || 'Dr. Manuel Gómez Feijóo'}</strong> ha validado las imágenes a las <strong>${p.horaAltaMedica || '--:--'}</strong>.
            El paciente <strong>${p.nombre}</strong> ya puede irse.
          </div>
        </div>
        <span class="status-badge" style="background:#10b981; color:#ffffff; font-weight:800; font-size:0.85rem;">🟢 PUEDE IRSE</span>
      `;
    } else {
      banner.style.display = 'none';
    }
  }

  // BANNER DE ORDEN MÉDICA DE FASE VASCULAR (1ª FASE) Y DESCUENTO AUTOMÁTICO PARA LA 2ª FASE
  function renderVascularPhaseOrderBanner(p) {
    const vascBanner = document.getElementById('vascularMedicalOrderBanner');
    if (!vascBanner || !p) return;

    const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);
    if (!hasVascularOrder) {
      vascBanner.style.display = 'none';
      vascBanner.innerHTML = '';
      return;
    }

    const docName = (p.protocoloMedico && p.protocoloMedico.doctorName) || p.medicoProtocolizador || 'Dr. Manuel Gómez Feijóo';
    const uptakeMin = Number((p.protocoloMedico && p.protocoloMedico.uptakeTime) || p.tiempoProtocoloMin || 60);
    const timeInfo = calculateUptakeTiming(p);

    vascBanner.style.display = 'block';

    if (!p.faseVascularIniciada) {
      vascBanner.innerHTML = `
        <div style="background:linear-gradient(135deg, #fef2f2 0%, #ffe4e6 100%); border:2.5px solid #ef4444; border-radius:12px; padding:1rem 1.2rem; display:flex; flex-direction:column; gap:10px; box-shadow:0 6px 18px rgba(239,68,68,0.18);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.85rem; line-height:1;">🩸</span>
              <div>
                <div style="font-family:'Outfit',sans-serif; font-size:1.02rem; font-weight:800; color:#991b1b; text-transform:uppercase; letter-spacing:0.3px;">
                  ORDEN MÉDICA: REALIZAR 1ª FASE VASCULAR (ADQUISICIÓN PRECOZ EN ESCÁNER)
                </div>
                <div style="font-size:0.84rem; color:#7f1d1d; margin-top:2px;">
                  El facultativo (<strong>${docName}</strong>) ha protocolizado <strong>Fase Vascular</strong> previa. Indique cuándo empieza la Fase Vascular para iniciar automáticamente el descuento de <strong>${uptakeMin} minutos</strong> hacia la <strong>2ª Fase (Adquisición Estándar / Metabólica)</strong>.
                </div>
              </div>
            </div>
            <span style="background:#dc2626; color:#ffffff; font-family:'Outfit',sans-serif; font-weight:800; font-size:0.78rem; padding:5px 12px; border-radius:20px; white-space:nowrap;">
              🚨 PENDIENTE 1ª FASE VASCULAR
            </span>
          </div>

          <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px; background:#ffffff; border:1.5px dashed #f87171; border-radius:9px; padding:10px 14px;">
            <div style="font-size:0.83rem; color:#1e293b;">
              ⏱️ <strong>Flujo de 2 Fases:</strong> 1º Adquisición de Fase Vascular precoz ➔ 2º Cuenta atrás automática de <strong>${uptakeMin} min</strong> para pasar a la 2ª Fase.
            </div>
            <button type="button"
                    onclick="iniciarFaseVascularPaciente('${p.id}')"
                    style="background:linear-gradient(135deg, #dc2626 0%, #b91c1c 100%); color:#ffffff; border:none; border-radius:8px; padding:9px 18px; font-family:'Outfit',sans-serif; font-weight:800; font-size:0.88rem; cursor:pointer; box-shadow:0 4px 12px rgba(220,38,38,0.35); display:inline-flex; align-items:center; gap:7px;">
              🩸 Empezar Fase Vascular Ahora (Iniciar Descuento ${uptakeMin}m para 2ª Fase)
            </button>
          </div>
        </div>
      `;
    } else {
      const isReady2nd = timeInfo.remainingSeconds <= 0;
      vascBanner.innerHTML = `
        <div style="background:${isReady2nd ? 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)' : 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)'}; border:2.5px solid ${isReady2nd ? '#10b981' : '#0284c7'}; border-radius:12px; padding:1rem 1.2rem; display:flex; flex-direction:column; gap:10px; box-shadow:0 4px 14px rgba(2,132,199,0.14);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.75rem; line-height:1;">${isReady2nd ? '🟢' : '⏳'}</span>
              <div>
                <div style="font-family:'Outfit',sans-serif; font-size:1rem; font-weight:800; color:${isReady2nd ? '#065f46' : '#0c4a6e'}; text-transform:uppercase; letter-spacing:0.3px;">
                  1ª FASE VASCULAR INICIADA (${p.horaInicioFaseVascular || p.horaInyeccion}h) — ${isReady2nd ? '¡LISTO PARA LA 2ª FASE EN MÁQUINA!' : 'DESCONTANDO TIEMPO PARA LA 2ª FASE'}
                </div>
                <div style="font-size:0.83rem; color:${isReady2nd ? '#047857' : '#0369a1'}; margin-top:2px;">
                  Inicio Fase Vascular: <strong>${p.horaInicioFaseVascular || p.horaInyeccion} h</strong> · Pauta de espera hasta 2ª Fase: <strong>${uptakeMin} min</strong> · Hora prevista 2ª Fase: <strong>${timeInfo.targetMachineTime} h</strong>
                </div>
              </div>
            </div>

            <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
              <span id="vascularBannerCountdownBadge" style="background:${isReady2nd ? '#16a34a' : '#0284c7'}; color:#ffffff; font-family:'JetBrains Mono',monospace; font-weight:800; font-size:0.9rem; padding:6px 14px; border-radius:8px;">
                ${isReady2nd ? '🟢 00:00 (PASAR A 2ª FASE)' : `⏳ 2ª Fase en: ${timeInfo.remainingText}`}
              </span>
              <button type="button"
                      onclick="iniciarFaseVascularPaciente('${p.id}')"
                      style="background:#ffffff; color:#334155; border:1.5px solid #cbd5e1; border-radius:7px; padding:6px 11px; font-size:0.76rem; font-weight:700; cursor:pointer;"
                      title="Actualizar la hora de inicio de la Fase Vascular a la hora actual">
                🔄 Reiniciar Hora 1ª Fase
              </button>
            </div>
          </div>
        </div>
      `;
    }
  }

  // CAJA SINCRONIZADA DE BOX (BOX 1 A BOX 5) Y VERIFICACIÓN DE CAMBIO DE BOX (ENFERMERÍA ⇄ TSID)
  function renderPatientBoxSyncCardTsid(p) {
    const container = document.getElementById('tsidPatientBoxSyncCard');
    if (!container || !p) return;

    const hoyStr = getTodayStr();
    const boxAsignado = p.boxAsignado || '';
    const boxAnterior = p.boxAnterior || '';
    const boxCambiado = !!p.boxCambiado;
    const boxVerificado = p.boxVerificado !== undefined ? p.boxVerificado : true;
    const horaCambioBox = p.horaCambioBox || '';
    const horaVerificacionBox = p.horaVerificacionBox || '';

    const boxNames = ['Box 1', 'Box 2', 'Box 3', 'Box 4', 'Box 5'];
    const buttonsHtml = boxNames.map(bName => {
      const isSelected = boxAsignado === bName;
      const occupant = state.patients.find(other => other.id !== p.id && (other.fechaCita || hoyStr) === (p.fechaCita || hoyStr) && other.boxAsignado === bName && other.estado !== 'done');
      const isOccupiedByOther = !!occupant;

      let bg = '#ffffff';
      let color = '#1e293b';
      let border = '1.5px solid #cbd5e1';
      let labelExtra = '';

      if (isSelected) {
        if (boxCambiado && !boxVerificado) {
          bg = '#f59e0b';
          color = '#ffffff';
          border = '2px solid #b45309';
          labelExtra = ' ⚠️';
        } else {
          bg = '#0284c7';
          color = '#ffffff';
          border = '2px solid #0369a1';
          labelExtra = ' ✓';
        }
      } else if (isOccupiedByOther) {
        bg = '#f1f5f9';
        color = '#94a3b8';
        border = '1.5px dashed #cbd5e1';
        const firstName = (occupant.nombre || 'Ocupado').split(' ')[0];
        labelExtra = ` (${firstName})`;
      }

      return `
        <button type="button"
                onclick="seleccionarBoxPacienteTsid('${bName}')"
                title="${isOccupiedByOther ? `Ocupado actualmente por ${occupant.nombre}` : `Asignar o cambiar a ${bName}`}"
                style="padding:7px 14px; border-radius:8px; font-family:'Outfit',sans-serif; font-size:0.84rem; font-weight:800; cursor:pointer; background:${bg}; color:${color}; border:${border}; transition:all 0.15s; box-shadow:${isSelected ? '0 3px 8px rgba(2,132,199,0.25)' : 'none'};">
          🚪 ${bName}${labelExtra}
        </button>
      `;
    }).join('');

    container.innerHTML = `
      <div style="background:${boxCambiado && !boxVerificado ? '#fffbeb' : '#f0f9ff'}; border:2px solid ${boxCambiado && !boxVerificado ? '#f59e0b' : '#bae6fd'}; border-radius:12px; padding:0.85rem 1rem; display:flex; flex-direction:column; gap:0.65rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-size:1.25rem;">🚪</span>
            <div>
              <div style="font-family:'Outfit',sans-serif; font-size:0.88rem; font-weight:800; color:#0c4a6e; text-transform:uppercase; letter-spacing:0.3px;">
                BOX DE REPOSO / INYECCIÓN DEL PACIENTE (SINCRONIZADO EN VIVO CON ENFERMERÍA · SOLO 5 BOXES)
              </div>
              <div style="font-size:0.75rem; color:#475569;">
                Selecciona el Box (1 al 5) en el que está el paciente. Si se cambia de Box, Enfermería y Técnicos TSID pueden verificar el cambio.
              </div>
            </div>
          </div>

          <div style="display:flex; align-items:center; gap:6px;">
            ${boxAsignado ? `
              <span style="background:${boxCambiado && !boxVerificado ? '#fef3c7' : '#0284c7'}; color:${boxCambiado && !boxVerificado ? '#92400e' : '#ffffff'}; border:1.5px solid ${boxCambiado && !boxVerificado ? '#f59e0b' : '#0369a1'}; font-family:'Outfit',sans-serif; font-size:0.85rem; font-weight:800; padding:4px 12px; border-radius:20px;">
                🚪 UBICACIÓN ACTUAL: ${boxAsignado.toUpperCase()}
              </span>
            ` : `
              <span style="background:#f1f5f9; color:#64748b; border:1px solid #cbd5e1; font-size:0.78rem; font-weight:700; padding:4px 10px; border-radius:20px;">
                Sin Box asignado
              </span>
            `}
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
          ${buttonsHtml}
          <button type="button"
                  onclick="seleccionarBoxPacienteTsid('')"
                  style="padding:7px 12px; border-radius:8px; font-size:0.76rem; font-weight:700; cursor:pointer; background:${!boxAsignado ? '#e2e8f0' : '#ffffff'}; color:#475569; border:1px solid #cbd5e1;">
            ⚪ Liberar Box
          </button>
        </div>

        ${boxCambiado ? `
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; padding:8px 12px; border-radius:8px; background:${boxVerificado ? '#dcfce7' : '#fef3c7'}; border:1.5px solid ${boxVerificado ? '#22c55e' : '#f59e0b'};">
            <div style="display:flex; align-items:center; gap:8px; font-size:0.82rem; font-weight:800; color:${boxVerificado ? '#166534' : '#92400e'};">
              <span style="font-size:1.1rem;">${boxVerificado ? '✅' : '⚠️'}</span>
              <div>
                <span>CAMBIO DE BOX DETECTADO: De <strong>${boxAnterior || 'Box previo'}</strong> ➔ a <strong>${boxAsignado}</strong> ${horaCambioBox ? `(${horaCambioBox}h)` : ''}</span>
                <span style="display:inline-block; margin-left:8px; padding:2px 8px; border-radius:12px; font-size:0.72rem; background:${boxVerificado ? '#16a34a' : '#d97706'}; color:#ffffff;">
                  ${boxVerificado ? `VERIFICADO ${horaVerificacionBox ? `(${horaVerificacionBox}h)` : ''}` : 'PENDIENTE DE VERIFICAR'}
                </span>
              </div>
            </div>
            ${!boxVerificado ? `
              <button type="button"
                      onclick="verificarCambioBoxTsid()"
                      style="background:#16a34a; color:#ffffff; border:none; border-radius:7px; padding:6px 14px; font-family:'Outfit',sans-serif; font-size:0.8rem; font-weight:800; cursor:pointer; box-shadow:0 2px 6px rgba(22,163,74,0.3); display:inline-flex; align-items:center; gap:5px;">
                ✅ Verificar Cambio de Box
              </button>
            ` : `
              <span style="font-size:0.76rem; font-weight:800; color:#15803d;">✓ Cambio confirmado con Enfermería</span>
            `}
          </div>
        ` : ''}

        <!-- SELECTOR SINCRONIZADO DE POSICIÓN / TRASLADO / NECESIDAD DE AYUDA (ENFERMERÍA ⇄ TSID) -->
        <div style="border-top:1.5px dashed #bae6fd; padding-top:0.65rem; margin-top:0.15rem; display:flex; flex-direction:column; gap:0.5rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
            <span style="font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:800; color:#0c4a6e;">
              🚨 POSICIÓN / TRASLADO Y NECESIDAD DE AYUDA (SINCRONIZADO CON ENFERMERÍA):
            </span>
            <span style="font-size:0.75rem; font-weight:800; color:#0369a1;">
              Estado actual: ${getMobilityTextTsid(p.trasladoModo || 'autonomo')}${p.sondaVesical ? ' · 🩺 Bolsa de orina' : ''}
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <button type="button"
                    onclick="seleccionarTrasladoTsid('autonomo')"
                    style="padding:7px 13px; border-radius:8px; font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:800; cursor:pointer; border:2px solid ${(p.trasladoModo || 'autonomo') === 'autonomo' ? '#16a34a' : '#cbd5e1'}; background:${(p.trasladoModo || 'autonomo') === 'autonomo' ? '#dcfce7' : '#ffffff'}; color:${(p.trasladoModo || 'autonomo') === 'autonomo' ? '#166534' : '#334155'};">
              🚶 Autónomo / Camina${(p.trasladoModo || 'autonomo') === 'autonomo' ? ' ✓' : ''}
            </button>
            <button type="button"
                    onclick="seleccionarTrasladoTsid('ayuda')"
                    style="padding:7px 13px; border-radius:8px; font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:800; cursor:pointer; border:2px solid ${p.trasladoModo === 'ayuda' ? '#d97706' : '#cbd5e1'}; background:${p.trasladoModo === 'ayuda' ? '#fef3c7' : '#ffffff'}; color:${p.trasladoModo === 'ayuda' ? '#92400e' : '#334155'};">
              🤝 Necesita Ayuda / Asistencia${p.trasladoModo === 'ayuda' ? ' ✓' : ''}
            </button>
            <button type="button"
                    onclick="seleccionarTrasladoTsid('silla')"
                    style="padding:7px 13px; border-radius:8px; font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:800; cursor:pointer; border:2px solid ${p.trasladoModo === 'silla' ? '#9333ea' : '#cbd5e1'}; background:${p.trasladoModo === 'silla' ? '#f3e8ff' : '#ffffff'}; color:${p.trasladoModo === 'silla' ? '#6b21a8' : '#334155'};">
              ♿ En Silla de Ruedas${p.trasladoModo === 'silla' ? ' ✓' : ''}
            </button>
            <button type="button"
                    onclick="seleccionarTrasladoTsid('encamado')"
                    style="padding:7px 13px; border-radius:8px; font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:800; cursor:pointer; border:2px solid ${p.trasladoModo === 'encamado' ? '#e11d48' : '#cbd5e1'}; background:${p.trasladoModo === 'encamado' ? '#ffe4e6' : '#ffffff'}; color:${p.trasladoModo === 'encamado' ? '#9f1239' : '#334155'};">
              🛏️ Encamado / En Camilla${p.trasladoModo === 'encamado' ? ' ✓' : ''}
            </button>
            <button type="button"
                    onclick="toggleSondaTsid()"
                    style="padding:7px 13px; border-radius:8px; font-family:'Outfit',sans-serif; font-size:0.82rem; font-weight:800; cursor:pointer; border:2px solid ${p.sondaVesical ? '#0891b2' : '#cbd5e1'}; background:${p.sondaVesical ? '#cffafe' : '#ffffff'}; color:${p.sondaVesical ? '#0e7490' : '#334155'};">
              🩺 ${p.sondaVesical ? '☑️ Bolsa de orina' : '⬜ Bolsa de orina'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function seleccionarTrasladoTsid(modo) {
    const p = state.selectedPatient;
    if (!p) return;
    p.trasladoModo = modo;
    p.movilidad = getMobilityTextTsid(modo);

    try {
      const masterRaw = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (masterRaw) {
        const masterList = JSON.parse(masterRaw);
        if (Array.isArray(masterList)) {
          const item = masterList.find(x => (x["Submission ID"] || x.id) === p.id || (x["NHC / Historia Clínica"] || x.nhc) === p.nhc);
          if (item) {
            item.trasladoModo = modo;
            item["Movilidad / Traslado"] = getMobilityTextTsid(modo);
            localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(masterList));
          }
        }
      }
    } catch (e) { }

    sincronizarBoxConEnfermeria(p);
    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
  }

  function toggleSondaTsid() {
    const p = state.selectedPatient;
    if (!p) return;
    p.sondaVesical = !p.sondaVesical;

    try {
      const masterRaw = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (masterRaw) {
        const masterList = JSON.parse(masterRaw);
        if (Array.isArray(masterList)) {
          const item = masterList.find(x => (x["Submission ID"] || x.id) === p.id || (x["NHC / Historia Clínica"] || x.nhc) === p.nhc);
          if (item) {
            item.sondaVesical = p.sondaVesical;
            localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(masterList));
          }
        }
      }
    } catch (e) { }

    sincronizarBoxConEnfermeria(p);
    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
  }

  function seleccionarBoxPacienteTsid(nuevoBox) {
    const p = state.selectedPatient;
    if (!p) return;

    const hoyStr = getTodayStr();
    if (nuevoBox) {
      const otroOcupante = state.patients.find(other =>
        other.id !== p.id &&
        (other.fechaCita || hoyStr) === (p.fechaCita || hoyStr) &&
        other.boxAsignado === nuevoBox &&
        other.estado !== 'done'
      );
      if (otroOcupante) {
        alert(`⚠️ El ${nuevoBox} ya está ocupado actualmente por ${otroOcupante.nombre} (${otroOcupante.nhc}). Libere primero ese Box o elija otro de los 5 Boxes disponibles.`);
        return;
      }
    }

    const boxPrevio = p.boxAsignado || '';
    if (boxPrevio === nuevoBox) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    const esCambioDeBox = Boolean(boxPrevio && nuevoBox && boxPrevio !== nuevoBox);

    p.boxAsignado = nuevoBox;
    if (esCambioDeBox) {
      p.boxAnterior = boxPrevio;
      p.boxCambiado = true;
      p.boxVerificado = false;
      p.horaCambioBox = timeStr;
      p.horaVerificacionBox = '';
    } else if (!nuevoBox) {
      p.boxAnterior = '';
      p.boxCambiado = false;
      p.boxVerificado = true;
      p.horaCambioBox = '';
      p.horaVerificacionBox = '';
    } else {
      p.boxAnterior = '';
      p.boxCambiado = false;
      p.boxVerificado = true;
      p.horaCambioBox = timeStr;
      p.horaVerificacionBox = timeStr;
    }

    sincronizarBoxConEnfermeria(p);
    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
  }

  function verificarCambioBoxTsid() {
    const p = state.selectedPatient;
    if (!p) return;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hh}:${mm}`;

    p.boxVerificado = true;
    p.horaVerificacionBox = timeStr;

    sincronizarBoxConEnfermeria(p);
    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
  }

  function sincronizarBoxConEnfermeria(p) {
    if (!p) return;
    const timeInfo = calculateUptakeTiming(p);
    const payload = {
      type: 'INJECTION_UPDATED',
      patientId: p.id,
      nhc: p.nhc,
      nombre: p.nombre,
      horaInyeccion: p.horaInyeccion || '',
      horaPasoMaquina: timeInfo.targetMachineTime || '--:--',
      tiempoProtocoloMin: p.tiempoProtocoloMin || 60,
      trasladoModo: p.trasladoModo || 'autonomo',
      sondaVesical: !!p.sondaVesical,
      boxAsignado: p.boxAsignado || '',
      boxAnterior: p.boxAnterior || '',
      boxCambiado: !!p.boxCambiado,
      boxVerificado: p.boxVerificado !== undefined ? p.boxVerificado : true,
      horaCambioBox: p.horaCambioBox || '',
      horaVerificacionBox: p.horaVerificacionBox || '',
      timestamp: Date.now()
    };

    try {
      const sharedKey = 'PET_SHARED_INJECTIONS_AND_MOBILITY_V1';
      const sharedMap = JSON.parse(localStorage.getItem(sharedKey) || '{}');
      sharedMap[p.id] = payload;
      if (p.nhc) sharedMap[p.nhc] = payload;
      localStorage.setItem(sharedKey, JSON.stringify(sharedMap));
    } catch (e) { }

    if (petClinicalChannel) {
      petClinicalChannel.postMessage(payload);
    }
  }

  // ACTUALIZAR BOTÓN DE AVANCE DE ESTADO Y BOTONES DE TARDÍA / ELIMINAR
  function updateAdvanceStatusButton(p) {
    const btn = document.getElementById('btnAdvanceStatus');
    const btnTardia = document.getElementById('btnTardiaAction');
    const btnDelete = document.getElementById('btnDeleteAction');

    if (!btn) return;
    if (btnDelete) btnDelete.style.display = 'inline-flex';

    const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);

    if (p.estado === 'waiting') {
      if (hasVascularOrder && !p.faseVascularIniciada) {
        btn.innerHTML = `🩸 Empezar Fase Vascular (Descontar 2ª Fase)`;
        btn.style.background = '#dc2626';
      } else {
        btn.innerHTML = `💉 Registrar Inyección y Reposo`;
        btn.style.background = '#0284c7';
      }
      if (btnTardia) btnTardia.style.display = 'none';
    } else if (p.estado === 'uptake') {
      btn.innerHTML = hasVascularOrder
        ? `🔔 Llamar Paciente a Sala (2ª Fase)`
        : `🔔 Llamar Paciente a Sala PET/CT`;
      btn.style.background = '#16a34a';
      if (btnTardia) btnTardia.style.display = 'none';
    } else if (p.estado === 'ready') {
      btn.innerHTML = hasVascularOrder
        ? `▶️ Iniciar 2ª Fase en Escáner`
        : `▶️ Iniciar Adquisición en Escáner`;
      btn.style.background = '#9333ea';
      if (btnTardia) btnTardia.style.display = 'none';
    } else if (p.estado === 'scanning') {
      btn.innerHTML = `⏹️ Finalizar y Descargar Estudio`;
      btn.style.background = '#0d9488';
      if (btnTardia) btnTardia.style.display = 'none';
    } else if (p.estado === 'tardia') {
      btn.innerHTML = `⏹️ Finalizar Adquisición Tardía`;
      btn.style.background = '#d97706';
      if (btnTardia) btnTardia.style.display = 'none';
    } else {
      // Estado: done (Completado)
      btn.innerHTML = `✅ Estudio Completado`;
      btn.style.background = '#475569';
      if (btnTardia) {
        btnTardia.style.display = 'inline-flex';
        if (p.tardiaPautada && p.tardiaPautada.requerida) {
          const z = String(p.tardiaPautada.zonaNombre || 'Pelvis').split('/')[0].trim();
          btnTardia.innerHTML = `🕒 Iniciar Tardía de ${z}`;
          btnTardia.style.background = '#d97706';
        } else {
          btnTardia.innerHTML = `🕒 Iniciar Tardía`;
          btnTardia.style.background = '#d97706';
        }
      }
    }
  }

  function iniciarFaseVascularPaciente(customPatientId) {
    const p = customPatientId
      ? (state.patients.find(x => String(x.id) === String(customPatientId) || String(x.nhc) === String(customPatientId)) || state.selectedPatient)
      : state.selectedPatient;
    if (!p) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    p.requiereFaseVascular = true;
    p.faseVascularIniciada = true;
    p.horaInicioFaseVascular = timeStr;
    p.horaInyeccion = timeStr;
    if (p.protocoloMedico && p.protocoloMedico.uptakeTime) {
      p.tiempoProtocoloMin = parseInt(p.protocoloMedico.uptakeTime, 10) || p.tiempoProtocoloMin || 60;
    } else {
      p.tiempoProtocoloMin = p.tiempoProtocoloMin || 60;
    }
    p.estado = 'uptake';

    state.selectedPatient = p;
    sincronizarBoxConEnfermeria(p);
    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
    updateKpis();
  }

  function advanceCurrentPatientStatus() {
    const p = state.selectedPatient;
    if (!p) return;

    const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);
    if (p.estado === 'waiting' && hasVascularOrder && !p.faseVascularIniciada) {
      iniciarFaseVascularPaciente(p.id);
      return;
    }

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (p.estado === 'waiting') {
      p.estado = 'uptake';
      p.horaInyeccion = p.horaInyeccion || timeStr;
    } else if (p.estado === 'uptake') {
      p.estado = 'ready';
    } else if (p.estado === 'ready') {
      p.estado = 'scanning';
      p.horaEntradaMaquina = timeStr;
    } else if (p.estado === 'scanning') {
      p.estado = 'done';
      p.horaSalidaMaquina = timeStr;
    } else if (p.estado === 'tardia') {
      p.estado = 'done';
      p.horaSalidaTardia = timeStr;
    }

    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
    updateKpis();
  }

  // ACCIÓN DE ADQUISICIÓN TARDÍA (SOLICITADA POR EL USUARIO)
  function solicitarTardiaPaciente() {
    const p = state.selectedPatient;
    if (!p) return;

    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const tardia = p.tardiaPautada;
    p.estado = 'tardia';
    p.horaEntradaTardia = timeStr;
    p.presetCajaCampos = (tardia && tardia.zona) || 'pelvis_tardia';
    p.presetCajaCamposManual = false;
    p.rangoCampos = (tardia && tardia.zonaNombre) || 'Pelvis / Foco Tardío tras Vaciado';
    p.numCamas = (tardia && tardia.numCamas) || 2;
    p.tiempoPorCama = '3.0 min/cama';

    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
    updateKpis();
  }

  // ACCIÓN DE ELIMINAR PACIENTE DE LA LISTA (SINCRONIZADA SIMULTÁNEAMENTE CON ENFERMERÍA)
  function eliminarPacienteActual(customId, customNhc, customNombre, skipConfirm) {
    const p = customId
      ? (state.patients.find(x => String(x.id) === String(customId) || (customNhc && String(x.nhc) === String(customNhc))) || { id: customId, nhc: customNhc || '', nombre: customNombre || 'Paciente' })
      : state.selectedPatient;
    if (!p) return;

    if (!skipConfirm) {
      const confirmed = confirm(`¿Está seguro de eliminar al paciente "${p.nombre}" (${p.nhc})?\n\nSe eliminará simultáneamente de la Consola Técnica TSID y de la Consola de Enfermería.`);
      if (!confirmed) return;
    }

    const deletedId = String(p.id || '').trim();
    const deletedNhc = String(p.nhc || '').trim();
    const deletedNombre = p.nombre || 'Paciente';
    const nhcDigits = deletedNhc.replace(/\D/g, '');

    const matchesPatient = (idVal, nhcVal) => {
      if (deletedId && idVal && String(idVal).trim() === deletedId) return true;
      if (deletedNhc && nhcVal && String(nhcVal).trim() === deletedNhc) return true;
      if (nhcDigits && nhcVal && String(nhcVal).replace(/\D/g, '') === nhcDigits) return true;
      return false;
    };

    // 0. Guardar en registro compartido de pacientes eliminados (para que Enfermería y TSID no lo vuelvan a cargar)
    try {
      const deletedMap = JSON.parse(localStorage.getItem('PET_DELETED_DEPARTED_PATIENTS_V1') || '{}');
      if (deletedId) deletedMap[deletedId] = true;
      if (deletedNhc) deletedMap[deletedNhc] = true;
      if (nhcDigits) deletedMap[nhcDigits] = true;
      localStorage.setItem('PET_DELETED_DEPARTED_PATIENTS_V1', JSON.stringify(deletedMap));
    } catch (e) {}

    // 1. Eliminar de state.patients y guardar PET_TSID_WORKLIST_V1
    state.patients = state.patients.filter(x => !matchesPatient(x.id, x.nhc));
    if (state.patients.length > 0) {
      if (!state.selectedPatient || matchesPatient(state.selectedPatient.id, state.selectedPatient.nhc)) {
        state.selectedPatient = state.patients[0];
      }
    } else {
      state.selectedPatient = null;
    }
    savePatients();

    // 2. Eliminar de PET_DATABASE_MASTER_V4, PET_TRIAGE_CITED_PATIENTS_V1 y pet_ct_peonada_assignments
    try {
      const masterDb = JSON.parse(localStorage.getItem('PET_DATABASE_MASTER_V4') || '[]');
      if (Array.isArray(masterDb)) {
        const filteredMaster = masterDb.filter(item => {
          const pId = item["Submission ID"] || item.id || "";
          const pNhc = item["NHC / Historia Clínica"] || item.nhc || "";
          return !matchesPatient(pId, pNhc);
        });
        localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(filteredMaster));
        fetch('/api/sync-database', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: filteredMaster })
        }).catch(() => {});
      }
    } catch (e) {}

    try {
      const triageCited = JSON.parse(localStorage.getItem('PET_TRIAGE_CITED_PATIENTS_V1') || '[]');
      if (Array.isArray(triageCited)) {
        const filteredTriageCited = triageCited.filter(item => {
          const pId = item["Submission ID"] || item.id || "";
          const pNhc = item["NHC / Historia Clínica"] || item.nhc || "";
          return !matchesPatient(pId, pNhc);
        });
        localStorage.setItem('PET_TRIAGE_CITED_PATIENTS_V1', JSON.stringify(filteredTriageCited));
      }
    } catch (e) {}

    try {
      const peonadaMap = JSON.parse(localStorage.getItem('pet_ct_peonada_assignments') || '{}');
      [deletedId, deletedNhc, nhcDigits].forEach(k => {
        if (k && peonadaMap[k]) delete peonadaMap[k];
      });
      for (const k of Object.keys(peonadaMap)) {
        const item = peonadaMap[k];
        if (item && matchesPatient(item.id || k, item.nhc)) {
          delete peonadaMap[k];
        }
      }
      localStorage.setItem('pet_ct_peonada_assignments', JSON.stringify(peonadaMap));
    } catch (e) {}

    // 3. Limpiar diccionarios compartidos (altas, inyecciones/boxes, estados TSID, tardías)
    ['PET_SHARED_DISCHARGE_V1', 'PET_SHARED_INJECTIONS_AND_MOBILITY_V1', 'PET_SHARED_TSID_STATUS_V1', 'PET_SHARED_LATE_SCAN_ORDERS_V1'].forEach(storageKey => {
      try {
        const mapObj = JSON.parse(localStorage.getItem(storageKey) || '{}');
        [deletedId, deletedNhc, nhcDigits].forEach(k => {
          if (k && mapObj[k]) delete mapObj[k];
        });
        for (const k of Object.keys(mapObj)) {
          const item = mapObj[k];
          if (item && matchesPatient(item.patientId || item.id, item.nhc)) {
            delete mapObj[k];
          }
        }
        localStorage.setItem(storageKey, JSON.stringify(mapObj));
      } catch (e) {}
    });

    // 4. Cerrar modal de alta si estuviera abierto
    const alertModal = document.getElementById('modalAltaMedicaAlertTsid');
    if (alertModal) alertModal.remove();

    // 5. Notificar en tiempo real a Enfermería y resto de consolas
    if (petClinicalChannel) {
      petClinicalChannel.postMessage({
        type: 'TSID_PATIENT_DELETED',
        patientId: deletedId,
        nhc: deletedNhc,
        nombre: deletedNombre,
        source: 'TSID',
        timestamp: Date.now()
      });
    }

    renderWorklist();
    if (state.selectedPatient) {
      renderPatientDetail(state.selectedPatient);
    }
    updateKpis();
  }

  function registerInjectionNow() {
    const p = state.selectedPatient;
    if (!p) return;
    const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);
    if (hasVascularOrder) {
      iniciarFaseVascularPaciente(p.id);
      return;
    }
    const now = new Date();
    p.horaInyeccion = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    p.estado = 'uptake';
    sincronizarBoxConEnfermeria(p);
    savePatients();
    broadcastPatientState(p);
    renderWorklist();
    renderPatientDetail(p);
  }

  function broadcastPatientState(p) {
    if (!p) return;
    const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);
    if (petClinicalChannel) {
      petClinicalChannel.postMessage({
        type: 'TSID_PATIENT_STATUS_CHANGED',
        patientId: p.id,
        nhc: p.nhc,
        nombre: p.nombre,
        estado: p.estado,
        horaInyeccion: p.horaInyeccion,
        horaEntradaMaquina: p.horaEntradaMaquina,
        horaSalidaMaquina: p.horaSalidaMaquina,
        horaEntradaTardia: p.horaEntradaTardia,
        horaSalidaTardia: p.horaSalidaTardia,
        tiempoProtocoloMin: p.tiempoProtocoloMin,
        requiereFaseVascular: hasVascularOrder,
        faseVascularIniciada: !!p.faseVascularIniciada,
        horaInicioFaseVascular: p.horaInicioFaseVascular || '',
        altaMedicaAutorizada: p.altaMedicaAutorizada,
        horaAltaMedica: p.horaAltaMedica,
        boxAsignado: p.boxAsignado || '',
        boxAnterior: p.boxAnterior || '',
        boxCambiado: !!p.boxCambiado,
        boxVerificado: p.boxVerificado !== undefined ? p.boxVerificado : true,
        horaCambioBox: p.horaCambioBox || '',
        horaVerificacionBox: p.horaVerificacionBox || '',
        timestamp: Date.now()
      });
    }
    try {
      const syncKey = 'PET_SHARED_TSID_STATUS_V1';
      const existing = JSON.parse(localStorage.getItem(syncKey) || '{}');
      existing[p.id] = {
        patientId: p.id,
        nhc: p.nhc,
        nombre: p.nombre,
        estado: p.estado,
        horaInyeccion: p.horaInyeccion,
        horaEntradaMaquina: p.horaEntradaMaquina,
        horaSalidaMaquina: p.horaSalidaMaquina,
        horaEntradaTardia: p.horaEntradaTardia,
        horaSalidaTardia: p.horaSalidaTardia,
        tiempoProtocoloMin: p.tiempoProtocoloMin,
        requiereFaseVascular: hasVascularOrder,
        faseVascularIniciada: !!p.faseVascularIniciada,
        horaInicioFaseVascular: p.horaInicioFaseVascular || '',
        altaMedicaAutorizada: p.altaMedicaAutorizada,
        horaAltaMedica: p.horaAltaMedica,
        boxAsignado: p.boxAsignado || '',
        boxAnterior: p.boxAnterior || '',
        boxCambiado: !!p.boxCambiado,
        boxVerificado: p.boxVerificado !== undefined ? p.boxVerificado : true,
        horaCambioBox: p.horaCambioBox || '',
        horaVerificacionBox: p.horaVerificacionBox || '',
        timestamp: Date.now()
      };
      if (p.nhc) existing[p.nhc] = existing[p.id];
      localStorage.setItem(syncKey, JSON.stringify(existing));
    } catch (e) { }
  }

  // 9. PANEL DE CRONÓMETRO DE TIEMPO EN PASAR A MÁQUINA
  function renderUptakeSection(p) {
    const timeInfo = calculateUptakeTiming(p);
    const hasVascularOrder = Boolean((p.protocoloMedico && p.protocoloMedico.vascularPhase === 'si') || p.requiereFaseVascular);
    const digitsEl = document.getElementById('uptakeCountdownDigits');
    const labelEl = document.getElementById('uptakeCountdownLabel');
    const milestoneInj = document.getElementById('milestoneInjectionTime');
    const milestoneInjLabel = document.getElementById('milestoneInjectionLabel');
    const milestoneTarget = document.getElementById('milestoneTargetTime');
    const milestoneTargetLabel = document.getElementById('milestoneTargetLabel');
    const milestoneProtocol = document.getElementById('milestoneProtocolDuration');
    const btnInjectNow = document.getElementById('btnInjectNow');

    if (milestoneInjLabel) {
      milestoneInjLabel.textContent = hasVascularOrder ? '🩸 Inicio Fase Vascular:' : '💉 Hora Inyección:';
    }
    if (milestoneTargetLabel) {
      milestoneTargetLabel.textContent = hasVascularOrder ? '🎯 Hora 2ª Fase Máquina:' : '🎯 Hora Exacta Máquina:';
    }
    if (milestoneInj) milestoneInj.textContent = (hasVascularOrder && p.horaInicioFaseVascular) ? p.horaInicioFaseVascular : (p.horaInyeccion || '--:--');
    if (milestoneTarget) milestoneTarget.textContent = timeInfo.targetMachineTime;
    if (milestoneProtocol) milestoneProtocol.textContent = `${p.tiempoProtocoloMin} minutos${hasVascularOrder ? ' (a 2ª Fase)' : ''}`;

    if (btnInjectNow) {
      if (hasVascularOrder && !p.faseVascularIniciada) {
        btnInjectNow.innerHTML = '🩸 Indicar Inicio Fase Vascular (Descontar 2ª Fase)';
        btnInjectNow.style.background = '#dc2626';
      } else if (hasVascularOrder && p.faseVascularIniciada) {
        btnInjectNow.innerHTML = '🔄 Reiniciar Hora Fase Vascular';
        btnInjectNow.style.background = '#0284c7';
      } else {
        btnInjectNow.innerHTML = '💉 Registrar Inyección Ahora';
        btnInjectNow.style.background = '#0284c7';
      }
    }

    const vascBadge = document.getElementById('vascularBannerCountdownBadge');
    if (vascBadge && hasVascularOrder && p.faseVascularIniciada) {
      if (timeInfo.remainingSeconds <= 0) {
        vascBadge.textContent = '🟢 00:00 (PASAR A 2ª FASE)';
        vascBadge.style.background = '#16a34a';
      } else {
        vascBadge.textContent = `⏳ 2ª Fase en: ${timeInfo.remainingText}`;
        vascBadge.style.background = '#0284c7';
      }
    }

    if (digitsEl) {
      digitsEl.className = 'clock-display-digits';
      if (p.estado === 'waiting' || !p.horaInyeccion) {
        digitsEl.textContent = `${p.tiempoProtocoloMin}:00`;
        if (labelEl) {
          labelEl.textContent = hasVascularOrder
            ? '🩸 Pendiente de iniciar 1ª Fase Vascular para descontar tiempo hacia la 2ª Fase'
            : 'En espera de inyección del trazador';
        }
      } else if (p.estado === 'done') {
        digitsEl.textContent = '00:00';
        if (labelEl) labelEl.textContent = 'Estudio finalizado';
      } else if (timeInfo.remainingSeconds <= 0) {
        digitsEl.textContent = timeInfo.remainingText;
        digitsEl.classList.add('ready');
        if (timeInfo.isOvertime) digitsEl.classList.add('overtime');
        if (labelEl) {
          labelEl.textContent = hasVascularOrder
            ? '🟢 ¡TIEMPO PARA 2ª FASE CUMPLIDO — PASAR A MÁQUINA (2ª FASE)!'
            : '¡TIEMPO DE CAPTACIÓN CUMPLIDO — PASAR A MÁQUINA!';
        }
      } else {
        const remMin = Math.floor(timeInfo.remainingSeconds / 60);
        const remSec = timeInfo.remainingSeconds % 60;
        digitsEl.textContent = `${String(remMin).padStart(2, '0')}:${String(remSec).padStart(2, '0')}`;
        if (labelEl) {
          labelEl.textContent = hasVascularOrder
            ? `🩸 Fase Vascular hecha (${p.horaInicioFaseVascular || p.horaInyeccion}h) · Descontando para 2ª Fase (${timeInfo.percentDone}%)`
            : `Cuenta atrás en sillón de reposo (${timeInfo.percentDone}%)`;
        }
      }
    }
  }

  // 10. CAMBIO DINÁMICO DE LA CAJA DE CAMPOS VERTICAL (SOLICITADO POR EL USUARIO)
  function cambiarCajaCamposVertical(presetKey) {
    const p = state.selectedPatient;
    if (!p) return;
    p.presetCajaCampos = presetKey;
    p.presetCajaCamposManual = true;
    savePatients();
    broadcastPatientState(p);
    renderVerticalPositioningAndScanBoxSvg(p);
  }

  // 11. DIBUJO ANATÓMICO EN VERTICAL Y CAJA DE CAMPOS QUE SE QUIERAN COGER (SOLICITUD EXPRESA)
  // El diagrama del paciente muestra exactamente la posición de brazos y la caja de adquisición elegidas por el médico
  function renderVerticalPositioningAndScanBoxSvg(p) {
    const container = document.getElementById('svgVerticalBodyContainer');
    const tagEl = document.getElementById('activePositionTag');
    const rangeTextEl = document.getElementById('scanRangeTextDisplay');
    const notesEl = document.getElementById('verticalDrawingNotesFooter');
    if (!container) return;

    // 1. Postura de brazos: Prioridad absoluta a la elección del médico en el protocolo
    let armsPosition = p.posicionBrazos || 'arriba';
    if (p.protocoloMedico && p.protocoloMedico.armsPosition) {
      armsPosition = p.protocoloMedico.armsPosition;
      p.posicionBrazos = armsPosition;
    }

    // 2. Preset de caja de campos: Prioridad a la Tardía enviada por el médico, o al rango del protocolo médico
    let activePreset = p.presetCajaCampos;
    if (p.tardiaPautada && p.tardiaPautada.requerida && !p.presetCajaCamposManual) {
      activePreset = p.tardiaPautada.zona || 'pelvis_tardia';
      p.presetCajaCampos = activePreset;
    } else if (p.protocoloMedico && p.protocoloMedico.scanRange && !p.presetCajaCamposManual) {
      activePreset = mapDoctorRangeToPreset(p.protocoloMedico.scanRange);
      p.presetCajaCampos = activePreset;
    } else if (!activePreset) {
      if (p.estado === 'tardia' || (p.tardiaPautada && p.tardiaPautada.requerida)) {
        activePreset = (p.tardiaPautada && p.tardiaPautada.zona) || 'pelvis_tardia';
      } else if (p.protocoloMedico && p.protocoloMedico.scanRange) {
        activePreset = mapDoctorRangeToPreset(p.protocoloMedico.scanRange);
      } else if (p.rangoCampos && (p.rangoCampos.toLowerCase().includes('encéfalo') || p.numCamas === 1)) {
        activePreset = 'brain';
      } else if (p.rangoCampos && (p.rangoCampos.toLowerCase().includes('dedos') || p.rangoCampos.toLowerCase().includes('total') || p.numCamas >= 8)) {
        activePreset = 'whole';
      } else if (p.rangoCampos && p.rangoCampos.toLowerCase().includes('tórax') && p.rangoCampos.toLowerCase().includes('abdomen') && !p.rangoCampos.toLowerCase().includes('base')) {
        activePreset = 'torax_abdomen';
      } else {
        activePreset = 'standard';
      }
    }

    // Actualizar botones de preset en la barra superior
    ['standard', 'whole', 'torax_abdomen', 'pelvis_tardia', 'brain'].forEach(k => {
      const btn = document.getElementById('btnRange_' + k);
      if (btn) {
        const isTardiaBtnMatch = (k === 'pelvis_tardia' && String(activePreset || '').endsWith('_tardia'));
        if (k === activePreset || isTardiaBtnMatch) {
          btn.classList.add('active');
        } else {
          btn.classList.remove('active');
        }
      }
    });

    // Configuración geométrica de la caja según preset (SVG 560 x 640)
    let boxTop = 60;
    let boxHeight = 410;
    let bedCount = 6;
    let bedDuration = p.tiempoPorCama || "2.5 min/cama";
    let boxTitle = "6 CAMAS — CRÁNEO A MUSLOS";
    let boxStroke = "#0284c7";
    let boxFill = "rgba(2, 132, 199, 0.16)";
    let bedNames = ["Cama 1: Vértice / Cuello", "Cama 2: Tórax Superior", "Cama 3: Tórax / Abdomen", "Cama 4: Abdomen Medio", "Cama 5: Pelvis", "Cama 6: Fémures Proximales"];

    if (activePreset === 'whole') {
      boxTop = 40;
      boxHeight = 560;
      bedCount = 9;
      boxTitle = "9 CAMAS — CUERPO ENTERO VERTICAL";
      boxStroke = "#7c3aed";
      boxFill = "rgba(124, 58, 237, 0.15)";
      bedNames = ["Cama 1: Cabeza", "Cama 2: Cuello/Hombros", "Cama 3: Tórax", "Cama 4: Abdomen Sup", "Cama 5: Pelvis", "Cama 6: Muslos", "Cama 7: Rodillas", "Cama 8: Piernas", "Cama 9: Tobillos / Pies"];
    } else if (activePreset === 'torax_abdomen') {
      boxTop = 135;
      boxHeight = 240;
      bedCount = 4;
      boxTitle = "4 CAMAS — TÓRAX Y ABDOMEN";
      boxStroke = "#0d9488";
      boxFill = "rgba(13, 148, 136, 0.18)";
      bedNames = ["Cama 1: Vértice Torácico", "Cama 2: Mediastino y Cardíaco", "Cama 3: Abdomen Superior", "Cama 4: Pelvis Alta"];
    } else if (activePreset === 'pelvis_tardia') {
      boxTop = 290;
      boxHeight = 140;
      bedCount = 2;
      boxTitle = "2 CAMAS — FOCO TARDÍO DE PELVIS / VEJIGA";
      boxStroke = "#d97706";
      boxFill = "rgba(217, 119, 6, 0.22)";
      bedDuration = "3.0 min/cama";
      bedNames = ["Cama 1 Tardía: Foco Pélvico Superior", "Cama 2 Tardía: Foco Prostático / Vejiga"];
    } else if (activePreset === 'higado_tardia') {
      boxTop = 195;
      boxHeight = 140;
      bedCount = 2;
      boxTitle = "2 CAMAS — FOCO TARDÍO HEPATO-BILIAR";
      boxStroke = "#d97706";
      boxFill = "rgba(217, 119, 6, 0.22)";
      bedDuration = "3.0 min/cama";
      bedNames = ["Cama 1 Tardía: Cúpula Hepática y Vía Biliar", "Cama 2 Tardía: Lóbulo Hepático Inferior / Páncreas"];
    } else if (activePreset === 'torax_tardia') {
      boxTop = 130;
      boxHeight = 140;
      bedCount = 2;
      boxTitle = "2 CAMAS — FOCO TARDÍO DE TÓRAX / CARDÍACO";
      boxStroke = "#d97706";
      boxFill = "rgba(217, 119, 6, 0.22)";
      bedDuration = "3.0 min/cama";
      bedNames = ["Cama 1 Tardía: Vértices y Mediastino Superior", "Cama 2 Tardía: Silueta Cardíaca y Bases Pulmonares"];
    } else if (activePreset === 'cabeza_cuello_tardia') {
      boxTop = 40;
      boxHeight = 110;
      bedCount = 2;
      boxTitle = "2 CAMAS — FOCO TARDÍO DE CABEZA Y CUELLO";
      boxStroke = "#d97706";
      boxFill = "rgba(217, 119, 6, 0.22)";
      bedDuration = "3.0 min/cama";
      bedNames = ["Cama 1 Tardía: Base Craneal y Orofaringe", "Cama 2 Tardía: Cadenas Ganglionares Cervicales"];
    } else if (activePreset === 'extremidades_tardia') {
      boxTop = 420;
      boxHeight = 140;
      bedCount = 2;
      boxTitle = "2 CAMAS — FOCO TARDÍO DE EXTREMIDADES";
      boxStroke = "#d97706";
      boxFill = "rgba(217, 119, 6, 0.22)";
      bedDuration = "3.0 min/cama";
      bedNames = ["Cama 1 Tardía: Muslos Proximales", "Cama 2 Tardía: Rodillas / Foco Lesional"];
    } else if (activePreset === 'brain') {
      boxTop = 40;
      boxHeight = 85;
      bedCount = 1;
      boxTitle = "1 CAMA — ENCÉFALO DEDICADO 3D";
      boxStroke = "#ea580c";
      boxFill = "rgba(234, 88, 12, 0.22)";
      bedDuration = "15 min estático";
      bedNames = ["Cama 1: NeuroPET 3D Alta Resolución"];
    }

    // Si el médico colocó la caja de tardía con el ratón en una posición específica, usar sus coordenadas exactas
    const isDoctorTardiaActive = Boolean(String(activePreset || '').endsWith('_tardia') && p.tardiaPautada && p.tardiaPautada.requerida);
    // Si el médico definió coordenadas exactas en el Planificador Full Body (y no estamos en tardía activa)
    if (!isDoctorTardiaActive && p.protocoloMedico) {
      if (typeof p.protocoloMedico.scanBoxTop === 'number' && typeof p.protocoloMedico.scanBoxBottom === 'number') {
        boxTop = p.protocoloMedico.scanBoxTop;
        boxHeight = Math.max(45, p.protocoloMedico.scanBoxBottom - p.protocoloMedico.scanBoxTop);
      }
      if (typeof p.protocoloMedico.scanNumBeds === 'number' && p.protocoloMedico.scanNumBeds > 0) {
        bedCount = p.protocoloMedico.scanNumBeds;
      }
      if (p.protocoloMedico.scanFromLabel && p.protocoloMedico.scanToLabel) {
        const sCm = p.protocoloMedico.scanStartCm !== undefined ? p.protocoloMedico.scanStartCm : Math.max(0, Math.round((boxTop - 50) / 2.75));
        const eCm = p.protocoloMedico.scanEndCm !== undefined ? p.protocoloMedico.scanEndCm : Math.max(sCm + 15, Math.round((boxTop + boxHeight - 50) / 2.75));
        boxTitle = `${bedCount} CAMAS — DESDE ${p.protocoloMedico.scanFromLabel.toUpperCase()} HASTA ${p.protocoloMedico.scanToLabel.toUpperCase()} (${sCm}-${eCm}cm)`;
      }
    }

    if (isDoctorTardiaActive) {
      if (typeof p.tardiaPautada.boxTop === 'number' && typeof p.tardiaPautada.boxHeight === 'number') {
        boxTop = p.tardiaPautada.boxTop;
        boxHeight = p.tardiaPautada.boxHeight;
      }
      if (p.tardiaPautada.numCamas) {
        bedCount = p.tardiaPautada.numCamas;
      }
      const sCm = p.tardiaPautada.startCm !== undefined ? p.tardiaPautada.startCm : Math.max(0, Math.round((boxTop - 50) / 2.75));
      const eCm = p.tardiaPautada.endCm !== undefined ? p.tardiaPautada.endCm : Math.max(sCm + 15, Math.round((boxTop + boxHeight - 50) / 2.75));
      boxTitle = `${bedCount} CAMAS — TARDÍA MÉDICA (${sCm}-${eCm}cm)`;
      boxFill = "rgba(120, 53, 15, 0.34)";
    }

    // Configurar Etiquetas de postura y pauta médica
    let armsLabel = '🙌 BRAZOS ARRIBA (DECÚBITO SUPINO)';
    let armsPillColor = '#1e40af';
    let armsPillBg = '#dbeafe';
    let armsSvg = '';

    if (armsPosition === 'arriba') {
      armsLabel = '🙌 BRAZOS ARRIBA (PAUTA MÉDICA)';
      armsPillColor = '#1e40af';
      armsPillBg = '#dbeafe';
      armsSvg = `
      <!-- SOPORTE CURVO CEFÁLICO -->
      <path d="M 140 28 Q 195 10 250 28" fill="none" stroke="#64748b" stroke-width="6" stroke-linecap="round"/>
      <rect x="155" y="14" width="80" height="12" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="1.5"/>
      <text x="195" y="23" font-family="'Outfit',sans-serif" font-size="8" font-weight="800" fill="#334155" text-anchor="middle">SOPORTE ANATÓMICO</text>

      <!-- Brazo Izquierdo Elevado hacia arriba -->
      <path d="M 152 145 C 130 130, 126 70, 155 34 C 160 28, 168 32, 164 42 C 145 74, 148 120, 166 142 Z" fill="#93c5fd" stroke="#0284c7" stroke-width="2"/>
      
      <!-- Brazo Derecho Elevado hacia arriba -->
      <path d="M 238 145 C 260 130, 264 70, 235 34 C 230 28, 222 32, 226 42 C 245 74, 242 120, 224 142 Z" fill="#93c5fd" stroke="#0284c7" stroke-width="2"/>

      <!-- Etiqueta Brazos Arriba -->
      <rect x="120" y="5" width="150" height="18" rx="4" fill="#dbeafe" stroke="#3b82f6" stroke-width="1"/>
      <text x="195" y="17" font-family="'Outfit',sans-serif" font-size="9" font-weight="800" fill="#1e40af" text-anchor="middle">🙌 BRAZOS ARRIBA EN SOPORTE</text>
    `;
    } else if (armsPosition === 'almohada' || armsPosition === 'abdominal') {
      armsLabel = '🛏️ BRAZOS EN ALMOHADA (PAUTA MÉDICA)';
      armsPillColor = '#065f46';
      armsPillBg = '#d1fae5';
      armsSvg = `
      <!-- Almohada de confort toraco-abdominal -->
      <rect x="142" y="205" width="106" height="34" rx="10" fill="#a7f3d0" stroke="#059669" stroke-width="2" opacity="0.95"/>
      <rect x="148" y="210" width="94" height="24" rx="7" fill="#d1fae5" stroke="#10b981" stroke-width="1" stroke-dasharray="3,2"/>

      <!-- Brazo Izquierdo apoyado en almohada -->
      <path d="M 152 145 C 138 165, 138 205, 155 220 L 200 220 L 200 208 L 165 208 C 155 196, 155 165, 166 145 Z" fill="#6ee7b7" stroke="#059669" stroke-width="2"/>

      <!-- Brazo Derecho apoyado en almohada -->
      <path d="M 238 145 C 252 165, 252 205, 235 230 L 190 230 L 190 218 L 225 218 C 235 196, 235 165, 224 145 Z" fill="#6ee7b7" stroke="#059669" stroke-width="2"/>

      <text x="195" y="226" font-family="'Outfit',sans-serif" font-size="8.5" font-weight="800" fill="#065f46" text-anchor="middle">🛏️ APOYO EN ALMOHADA</text>
    `;
    } else {
      // armsPosition === 'abajo'
      armsLabel = '👇 BRAZOS ABAJO (PAUTA MÉDICA)';
      armsPillColor = '#6b21a8';
      armsPillBg = '#f3e8ff';
      armsSvg = `
      <!-- Brazo Izquierdo pegado al tronco -->
      <rect x="128" y="145" width="18" height="150" rx="9" fill="#e9d5ff" stroke="#9333ea" stroke-width="2"/>
      
      <!-- Brazo Derecho pegado al tronco -->
      <rect x="244" y="145" width="18" height="150" rx="9" fill="#e9d5ff" stroke="#9333ea" stroke-width="2"/>

      <!-- BANDA DE SUJECIÓN CON VELCRO -->
      <rect x="120" y="200" width="150" height="24" rx="5" fill="#fef08a" stroke="#ca8a04" stroke-width="1.8" opacity="0.95"/>
      <line x1="120" y1="212" x2="270" y2="212" stroke="#a16207" stroke-width="1.5" stroke-dasharray="4,3"/>
      <text x="195" y="216" font-family="'Outfit',sans-serif" font-size="8.5" font-weight="800" fill="#854d0e" text-anchor="middle">🔒 CINCHA SUJECIÓN BRAZOS</text>
    `;
    }

    if (tagEl) {
      tagEl.textContent = armsLabel;
      tagEl.style.background = armsPillBg;
      tagEl.style.color = armsPillColor;
    }

    if (rangeTextEl) {
      const docName = (p.protocoloMedico && p.protocoloMedico.doctorName) || p.medicoProtocolizador || '';
      const docTag = docName ? ` · Médico: ${docName}` : '';
      rangeTextEl.textContent = `${bedCount} CAMAS · ${boxTitle.split('—')[1] || boxTitle}${docTag}`;
    }

    if (notesEl) {
      const isProtoDone = !!(p.protocoloMedico && p.protocoloMedico.completed);
      const docName = (p.protocoloMedico && p.protocoloMedico.doctorName) || p.medicoProtocolizador || 'Facultativo de Medicina Nuclear';
      const fromToNote = (p.protocoloMedico && p.protocoloMedico.scanFromLabel && p.protocoloMedico.scanToLabel)
        ? `<div style="margin-bottom:6px; padding:5px 10px; background:#eff6ff; border-radius:6px; border:1px solid #bfdbfe; color:#1e40af; font-size:0.8rem; font-weight:800;">
             📏 Rango Full Body Pautado: Desde <u>${p.protocoloMedico.scanFromLabel}</u> hasta <u>${p.protocoloMedico.scanToLabel}</u> (${p.protocoloMedico.scanStartCm || 0}–${p.protocoloMedico.scanEndCm || 100} cm · ${bedCount} camas)
           </div>`
        : '';
      const vascNote = (p.protocoloMedico && p.protocoloMedico.completed)
        ? (p.protocoloMedico.vascularPhase === 'si'
          ? `<div style="margin-bottom:6px; padding:5px 10px; background:#fef2f2; border-radius:6px; border:1.5px solid #f87171; color:#b91c1c; font-size:0.8rem; font-weight:800;">
               🩸 Fase Vascular Pautada: <u>SÍ</u> — Realizar adquisición precoz / fase vascular según pauta médica
             </div>`
          : `<div style="margin-bottom:6px; padding:4px 10px; background:#f8fafc; border-radius:6px; border:1px solid #cbd5e1; color:#475569; font-size:0.78rem; font-weight:700;">
               🩸 Fase Vascular: <strong>NO</strong> (Adquisición estándar sin fase vascular precoz)
             </div>`)
        : '';
      const docBadge = isProtoDone
        ? `<div style="margin-bottom:8px; padding:6px 10px; background:#dcfce7; border-radius:6px; border:1px solid #86efac; color:#065f46; font-size:0.8rem; font-weight:800;">
           🩺 Pauta Médica Validada por: ${docName}
         </div>${fromToNote}${vascNote}`
        : `<div style="margin-bottom:8px; padding:6px 10px; background:#fef3c7; border-radius:6px; border:1px solid #fcd34d; color:#92400e; font-size:0.8rem; font-weight:700;">
           ⏳ Protocolo Pendiente de Validación Médica · Aplicando Pauta Técnica Estándar por defecto (${p.protocolo}). Los técnicos pueden proceder con la preparación y adquisición normalmente.
         </div>`;
      notesEl.innerHTML = docBadge + (armsPosition === 'arriba'
        ? `<strong>Indicación de Postura:</strong> Paciente colocado en decúbito supino con <strong>brazos elevados en vertical</strong> sobre el soporte curvo superior. <em>Caja de adquisición configurada según protocolo médico para cubrir ${bedCount} camas sin artefacto de atenuación braquial</em>.`
        : ((armsPosition === 'almohada' || armsPosition === 'abdominal')
          ? `<strong>Indicación de Postura:</strong> Paciente colocado en decúbito supino con <strong>brazos apoyados en almohada</strong> de confort y cincha de sujeción. <em>Pautado expresamente por el médico para hombro doloroso, cifosis o limitación de movilidad</em>.`
          : `<strong>Indicación de Postura:</strong> Paciente colocado en decúbito supino con <strong>brazos extendidos hacia abajo</strong> a los costados del cuerpo con banda de velcro. <em>Caja de adquisición ajustada para ${bedCount} camas óptimas en cabeza, cuello o evaluación de troncos supraaórticos</em>.`));
    }

    // Camas individuales dentro de la caja de campos
    const bedHeight = boxHeight / bedCount;
    let bedsSvg = '';
    for (let i = 0; i < bedCount; i++) {
      const bY = boxTop + (i * bedHeight);
      const name = bedNames[i] || `Cama ${i + 1}`;
      bedsSvg += `
      <!-- Corte Cama ${i + 1} -->
      <line x1="80" y1="${bY}" x2="310" y2="${bY}" stroke="${boxStroke}" stroke-width="1.2" stroke-dasharray="4,4" opacity="0.8"/>
      <rect x="85" y="${bY + 3}" width="220" height="${bedHeight - 6}" rx="4" fill="${boxFill}" stroke="${boxStroke}" stroke-width="0.75" opacity="0.6"/>
      <text x="95" y="${bY + (bedHeight > 40 ? 20 : 14)}" font-family="'JetBrains Mono', monospace" font-size="10" font-weight="700" fill="${boxStroke}">
        ${name}
      </text>
    `;
    }

    // Láser de centrado
    let laserY = 135;
    let laserText = "Láser: Horquilla esternal";
    if (activePreset === 'brain') {
      laserY = 65;
      laserText = "Láser: Línea Órbito-Meatal / Nasion";
    } else if (activePreset === 'pelvis_tardia') {
      laserY = 320;
      laserText = "Láser: Crestas Ilíacas / Sínfisis";
    } else if (activePreset === 'higado_tardia') {
      laserY = 220;
      laserText = "Láser: Apófisis Xifoides / Epigastrio";
    } else if (activePreset === 'torax_tardia') {
      laserY = 150;
      laserText = "Láser: Horquilla Esternal / Mediastino";
    } else if (activePreset === 'cabeza_cuello_tardia') {
      laserY = 75;
      laserText = "Láser: Ángulo Mandibular / Cartílago Tiroides";
    } else if (activePreset === 'extremidades_tardia') {
      laserY = 440;
      laserText = "Láser: Muslos Proximales / Lesión";
    }

    // ENSAMBLAR EL SVG COMPLETO VERTICAL
    container.innerHTML = `
    <svg viewBox="0 0 560 640" width="100%" height="480" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="vertBodyGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#bae6fd"/>
          <stop offset="50%" stop-color="#e0f2fe"/>
          <stop offset="100%" stop-color="#93c5fd"/>
        </linearGradient>
        <filter id="vertLaserGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
      </defs>

      <!-- FONDO DE SALA DE TOMOGRAFÍA -->
      <rect x="0" y="0" width="560" height="640" fill="#f8fafc" rx="10"/>

      <!-- REGLA MILIMÉTRICA VERTICAL (EJE Z EN CM) -->
      <g stroke="#cbd5e1" stroke-width="1">
        <line x1="60" y1="30" x2="60" y2="610"/>
        ${[0, 20, 40, 60, 80, 100, 120, 140, 160, 180].map((cm, idx) => {
      const y = 50 + (idx * 55);
      return `
            <line x1="52" y1="${y}" x2="60" y2="${y}" stroke="#94a3b8" stroke-width="1.5"/>
            <text x="46" y="${y + 3}" font-family="'JetBrains Mono',monospace" font-size="8.5" fill="#64748b" text-anchor="end">${cm}cm</text>
          `;
    }).join('')}
      </g>
      <text x="30" y="20" font-family="'Outfit',sans-serif" font-size="9" font-weight="800" fill="#64748b">EJE Z</text>

      <!-- SILUETA ANATÓMICA HUMANA EN VERTICAL (CORONAL) -->
      <g id="humanSilhouette">
        <!-- Cabeza y Cráneo -->
        <ellipse cx="195" cy="72" rx="28" ry="34" fill="url(#vertBodyGrad)" stroke="#0284c7" stroke-width="2"/>
        <ellipse cx="185" cy="68" rx="4" ry="3" fill="#0284c7" opacity="0.4"/>
        <ellipse cx="205" cy="68" rx="4" ry="3" fill="#0284c7" opacity="0.4"/>
        <line x1="195" y1="68" x2="195" y2="78" stroke="#0284c7" stroke-width="1.5" opacity="0.5"/>

        <!-- Cuello -->
        <rect x="187" y="104" width="16" height="24" rx="4" fill="url(#vertBodyGrad)" stroke="#0284c7" stroke-width="2"/>

        <!-- Tórax, Abdomen y Pelvis -->
        <path d="M 152 135 
                 L 238 135 
                 Q 245 190 236 240 
                 Q 244 285 232 340 
                 L 158 340 
                 Q 146 285 154 240 
                 Q 145 190 152 135 Z" 
              fill="url(#vertBodyGrad)" stroke="#0284c7" stroke-width="2"/>

        <!-- Pierna Izquierda -->
        <path d="M 160 340 L 190 340 L 186 470 L 182 590 L 160 590 L 164 470 Z" 
              fill="url(#vertBodyGrad)" stroke="#0284c7" stroke-width="2"/>
        
        <!-- Pierna Derecha -->
        <path d="M 200 340 L 230 340 L 226 470 L 230 590 L 208 590 L 204 470 Z" 
              fill="url(#vertBodyGrad)" stroke="#0284c7" stroke-width="2"/>

        <!-- Pies -->
        <ellipse cx="170" cy="595" rx="14" ry="7" fill="#93c5fd" stroke="#0284c7" stroke-width="1.5"/>
        <ellipse cx="220" cy="595" rx="14" ry="7" fill="#93c5fd" stroke="#0284c7" stroke-width="1.5"/>

        <!-- Brazos según postura del protocolo médico -->
        ${armsSvg}
      </g>

      <!-- CAJA DE TODO LO QUE QUIERA COGER PARA REALIZAR LA PRUEBA (SCAN BOX FOV) -->
      <g id="scanBoxFOV">
        <!-- Bounding Box Principal de Cobertura -->
        <rect x="75" y="${boxTop}" width="240" height="${boxHeight}" rx="8" 
              fill="${boxFill}" stroke="${boxStroke}" stroke-width="3" 
              stroke-dasharray="8,4" filter="url(#vertLaserGlow)"/>

        <!-- Marco de las camas internas -->
        ${bedsSvg}

        <!-- Marcadores de Esquinas del FOV Tomográfico -->
        <path d="M 70 ${boxTop + 14} L 70 ${boxTop} L 84 ${boxTop}" fill="none" stroke="${boxStroke}" stroke-width="3"/>
        <path d="M 320 ${boxTop + 14} L 320 ${boxTop} L 306 ${boxTop}" fill="none" stroke="${boxStroke}" stroke-width="3"/>
        <path d="M 70 ${boxTop + boxHeight - 14} L 70 ${boxTop + boxHeight} L 84 ${boxTop + boxHeight}" fill="none" stroke="${boxStroke}" stroke-width="3"/>
        <path d="M 320 ${boxTop + boxHeight - 14} L 320 ${boxTop + boxHeight} L 306 ${boxTop + boxHeight}" fill="none" stroke="${boxStroke}" stroke-width="3"/>

        <!-- Flecha de dirección de avance tomográfico (Craneocaudal) -->
        <g transform="translate(300, ${boxTop + 15})">
          <line x1="0" y1="0" x2="0" y2="40" stroke="${boxStroke}" stroke-width="3"/>
          <polygon points="-5,35 5,35 0,45" fill="${boxStroke}"/>
        </g>
      </g>

      <!-- LÁSER TRANSVERSAL DE CENTRADO -->
      <g id="laserCrosshair">
        <line x1="60" y1="${laserY}" x2="330" y2="${laserY}" stroke="#ef4444" stroke-width="2" stroke-dasharray="6,4" filter="url(#vertLaserGlow)"/>
        <circle cx="195" cy="${laserY}" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="1.5"/>
        <rect x="80" y="${laserY - 18}" width="140" height="15" rx="3" fill="#fee2e2" stroke="#ef4444" stroke-width="1"/>
        <text x="85" y="${laserY - 7}" font-family="'JetBrains Mono',monospace" font-size="8.5" font-weight="700" fill="#b91c1c">🎯 ${laserText}</text>
      </g>

      <!-- PANEL DE CONTROL LATERAL DENTRO DEL SVG (DERECHA) -->
      <g transform="translate(340, 40)">
        <!-- Tarjeta de Especificaciones de Barrido -->
        <rect x="0" y="0" width="205" height="260" rx="8" fill="#ffffff" stroke="#e2e8f0" stroke-width="1.5"/>
        
        <text x="14" y="24" font-family="'Outfit',sans-serif" font-size="11.5" font-weight="800" fill="#004868">CAJA DE BARRIDO FOV</text>
        <text x="14" y="40" font-family="'JetBrains Mono',monospace" font-size="9" font-weight="700" fill="${boxStroke}">PROYECCIÓN VERTICAL</text>

        <line x1="14" y1="50" x2="190" y2="50" stroke="#f1f5f9" stroke-width="1.5"/>

        <text x="14" y="70" font-family="'Open Sans',sans-serif" font-size="10" fill="#64748b">Rango Pautado Médico:</text>
        <text x="14" y="86" font-family="'Outfit',sans-serif" font-size="10.5" font-weight="700" fill="#0f172a">${boxTitle}</text>

        <text x="14" y="112" font-family="'Open Sans',sans-serif" font-size="10" fill="#64748b">Camas a adquirir:</text>
        <text x="14" y="128" font-family="'JetBrains Mono',monospace" font-size="11" font-weight="800" fill="#004868">${bedCount} Posiciones</text>

        <text x="14" y="154" font-family="'Open Sans',sans-serif" font-size="10" fill="#64748b">Tiempo por campo:</text>
        <text x="14" y="170" font-family="'JetBrains Mono',monospace" font-size="10.5" font-weight="700" fill="#0284c7">${bedDuration}</text>

        <text x="14" y="196" font-family="'Open Sans',sans-serif" font-size="10" fill="#64748b">Dirección camilla:</text>
        <text x="14" y="212" font-family="'JetBrains Mono',monospace" font-size="10.5" font-weight="700" fill="#16a34a">CRÁNEO-CAUDAL ⬇️</text>

        <text x="14" y="238" font-family="'Open Sans',sans-serif" font-size="10" fill="#64748b">Filtro Scatter / TOF:</text>
        <text x="14" y="250" font-family="'JetBrains Mono',monospace" font-size="9.5" font-weight="700" fill="#7c3aed">TOF 380ps + PSF</text>

        <!-- Tarjeta Informativa de Postura Médica -->
        <g transform="translate(0, 275)">
          <rect x="0" y="0" width="205" height="150" rx="8" fill="${armsPillBg}" stroke="${armsPillColor}" stroke-width="1.5"/>
          
          <text x="14" y="24" font-family="'Outfit',sans-serif" font-size="10.5" font-weight="800" fill="${armsPillColor}">
            ${armsLabel}
          </text>

          <text x="14" y="48" font-family="'Open Sans',sans-serif" font-size="9.5" fill="#334155">
            ${armsPosition === 'arriba' ? '• Manos descansan en cuna.' : (armsPosition === 'abdominal' ? '• Manos sobre abdomen.' : '• Sujetos con cincha velcro.')}
          </text>
          <text x="14" y="68" font-family="'Open Sans',sans-serif" font-size="9.5" fill="#334155">
            ${armsPosition === 'arriba' ? '• Despeja haz en tórax.' : (armsPosition === 'abdominal' ? '• Confort en cifosis/dolor.' : '• Inmoviliza cuello y cráneo.')}
          </text>
          <text x="14" y="88" font-family="'Open Sans',sans-serif" font-size="9.5" fill="#334155">
            ${armsPosition === 'arriba' ? '• Cojín en huecos poplíteos.' : '• Cojín cervical regulable.'}
          </text>

          <rect x="14" y="104" width="177" height="32" rx="5" fill="#ffffff" stroke="${armsPillColor}" stroke-width="1"/>
          <text x="22" y="124" font-family="'JetBrains Mono',monospace" font-size="9" font-weight="700" fill="${armsPillColor}">
            HFS · Protocolo Médico OK
          </text>
        </g>
      </g>
    </svg>
  `;
  }


  // 12. GESTIÓN DE CONTRASTE Y ESPECIFICACIONES TÉCNICAS
  function renderContrastAndTechnicalSpecs(p) {
    const banner = document.getElementById('contrastBannerEl');
    const contrastList = document.getElementById('contrastSpecsList');
    if (!banner || !contrastList) return;

    if (p.contrasteIV) {
      banner.className = 'contrast-banner has-contrast';
      banner.innerHTML = `
        <span style="font-size: 1.5rem;">💉</span>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800;">PET-CT CON CONTRASTE IV IODADO</div>
          <div style="font-size: 0.8rem; font-weight: 500;">Administración intravenosa de contraste iodado para fase diagnóstica</div>
        </div>
      `;

      contrastList.innerHTML = `
        <li><span>Radiofármaco inyectado:</span> <strong>${p.radiofarmaco} (${p.dosisMBq} MBq)</strong></li>
        <li><span>Contraste Iodado:</span> <strong>${p.tipoContraste}</strong></li>
        <li><span>Volumen y Flujo:</span> <strong style="color:#b91c1c;">${p.volumenContraste}</strong></li>
        <li><span>Fase y Tiempo de Retraso:</span> <strong>${p.faseContraste}</strong></li>
        <li><span>Acceso Vascular Requerido:</span> <strong>${p.viaRequerida}</strong></li>
        <li><span>Hidratación / Contraste Oral:</span> <strong>${p.contrasteOral}</strong></li>
        <li><span>Parámetros CT:</span> <strong>120 kVp, modulación Care Dose 4D, corte 2.0 mm</strong></li>
      `;
    } else {
      banner.className = 'contrast-banner no-contrast';
      banner.innerHTML = `
        <span style="font-size: 1.5rem;">🚫</span>
        <div>
          <div style="font-size: 1.05rem; font-weight: 800;">PET-CT SIN CONTRASTE IV (CT BAJA DOSIS)</div>
          <div style="font-size: 0.8rem; font-weight: 500;">Exclusivo CT de baja dosis para corrección de atenuación (AC) y fusión morfológica</div>
        </div>
      `;

      contrastList.innerHTML = `
        <li><span>Radiofármaco inyectado:</span> <strong>${p.radiofarmaco} (${p.dosisMBq} MBq)</strong></li>
        <li><span>Contraste Iodado IV:</span> <strong style="color:#166534;">NO REQUIERE CONTRASTE IV</strong></li>
        <li><span>Técnica Tomográfica:</span> <strong>CT Ultra-Low Dose (120 kVp, 30 mAs modulados)</strong></li>
        <li><span>Finalidad del TAC:</span> <strong>Corrección de Atenuación (AC) y Co-registro</strong></li>
        <li><span>Hidratación Oral:</span> <strong>${p.contrasteOral}</strong></li>
        <li><span>Riesgo de Nefropatía:</span> <strong style="color:#166534;">NULO (Sin sobrecarga renal)</strong></li>
      `;
    }
  }

  // 13. ALERTAS CLÍNICAS E INDICACIONES A MAYORES
  function renderClinicalAlertsAndNotes(p) {
    const chipsContainer = document.getElementById('clinicalAlertsChips');
    const doctorNotesEl = document.getElementById('doctorNotesDisplay');
    const tsidNotesInput = document.getElementById('tsidPatientNotes');
    const timeInfo = calculateUptakeTiming(p);

    if (chipsContainer) {
      const mobilityLabel = p.trasladoModo === 'silla'
        ? '♿ En Silla de Ruedas'
        : (p.trasladoModo === 'encamado'
          ? '🛏️ Encamado / Camilla'
          : (p.trasladoModo === 'ayuda'
            ? '🤝 Necesita Ayuda / Asistencia'
            : '🚶 Autónomo'));
      const sondaLabel = p.sondaVesical ? '🩺 Bolsa de orina' : 'Sin bolsa de orina';

      chipsContainer.innerHTML = `
        <span class="clinical-chip" style="background:#ecfdf5; color:#065f46; border-color:#6ee7b7;">🩸 Glucemia: ${p.glucemia}</span>
        <span class="clinical-chip" style="background:#eff6ff; color:#1e40af; border-color:#bfdbfe;">⏱️ Ayuno: ${p.ayunoCumplido}</span>
        <span class="clinical-chip" style="background:${p.trasladoModo === 'encamado' ? '#fff1f2' : (p.trasladoModo === 'silla' ? '#fdf4ff' : (p.trasladoModo === 'ayuda' ? '#fffbeb' : '#f0fdf4'))}; color:${p.trasladoModo === 'encamado' ? '#9f1239' : (p.trasladoModo === 'silla' ? '#86198f' : (p.trasladoModo === 'ayuda' ? '#92400e' : '#15803d'))}; border-color:${p.trasladoModo === 'encamado' ? '#fecdd3' : (p.trasladoModo === 'silla' ? '#f0abfc' : (p.trasladoModo === 'ayuda' ? '#fcd34d' : '#bbf7d0'))}; font-weight:800;">
          ${mobilityLabel}
        </span>
        ${p.sondaVesical ? `
          <span class="clinical-chip" style="background:#ecfeff; color:#0e7490; border-color:#a5f3fc; font-weight:800;">
            ${sondaLabel}
          </span>
        ` : ''}
        <span class="clinical-chip" style="background:#fdf4ff; color:#86198f; border-color:#f5d0fe;">⚙️ Prótesis: ${p.protesisMetal}</span>
        <span class="clinical-chip" style="background:#fffbeb; color:#92400e; border-color:#fde68a;">🚽 Vejiga: ${p.vaciadoVejiga}</span>
        ${p.heparinaIV !== 'No aplica' ? `<span class="clinical-chip" style="background:#fee2e2; color:#b91c1c; border-color:#fca5a5;">💉 ${p.heparinaIV}</span>` : ''}
      `;

      // BANNERS DE ALERTA DE TRASLADO Y CUIDADOS DE ENFERMERÍA
      let bannersHtml = '<div class="nursing-alerts-container">';

      if (p.trasladoModo === 'ayuda') {
        bannersHtml += `
          <div class="nursing-transfer-banner" style="background:#fffbeb; border:2px solid #f59e0b; color:#92400e;">
            <span class="banner-icon">🤝</span>
            <div class="banner-text">
              <strong>AVISO ENFERMERÍA: PACIENTE NECESITA AYUDA / ASISTENCIA</strong>
              <div>El paciente camina con inestabilidad o limitación funcional y requiere acompañamiento y ayuda directa del técnico/celador para subir y colocarse en la camilla del tomógrafo.</div>
            </div>
          </div>
        `;
      } else if (p.trasladoModo === 'silla') {
        bannersHtml += `
          <div class="nursing-transfer-banner banner-silla">
            <span class="banner-icon">♿</span>
            <div class="banner-text">
              <strong>AVISO ENFERMERÍA: TRASLADO EN SILLA DE RUEDAS</strong>
              <div>Paciente con movilidad reducida acude en silla de ruedas. Se requiere asistencia de celador y técnico para transfer seguro a la camilla de exploración del tomógrafo.</div>
            </div>
          </div>
        `;
      } else if (p.trasladoModo === 'encamado') {
        bannersHtml += `
          <div class="nursing-transfer-banner banner-encamado">
            <span class="banner-icon">🛏️</span>
            <div class="banner-text">
              <strong>AVISO ENFERMERÍA: PACIENTE ENCAMADO / CAMILLA HOSPITALARIA</strong>
              <div>Traslado en camilla hospitalaria desde planta/box de inyección. Imprescindible disponer de transferina y apoyo de celador para pasar al paciente al tablero de fibra de carbono.</div>
            </div>
          </div>
        `;
      }

      if (p.sondaVesical) {
        bannersHtml += `
          <div class="nursing-transfer-banner banner-sonda">
            <span class="banner-icon">🩺</span>
            <div class="banner-text">
              <strong>BOLSA DE ORINA</strong>
              <div>Paciente portador de bolsa de orina.</div>
            </div>
          </div>
        `;
      }

      if (p.horaInyeccion) {
        bannersHtml += `
          <div class="nursing-transfer-banner banner-inyeccion-ok">
            <span class="banner-icon">💉</span>
            <div class="banner-text">
              <strong>HORA DE INYECCIÓN ENFERMERÍA CONFIRMADA: ${p.horaInyeccion}</strong>
              <div>Protocolo: <strong>${p.tiempoProtocoloMin || 60} min</strong> de aclaramiento metabólico · Entrada pautada a máquina: <strong>${timeInfo.targetMachineTime}</strong>.</div>
            </div>
          </div>
        `;
      }

      bannersHtml += '</div>';

      let alertsBox = document.getElementById('nursingAlertsBoxDynamic');
      if (!alertsBox) {
        alertsBox = document.createElement('div');
        alertsBox.id = 'nursingAlertsBoxDynamic';
        chipsContainer.parentNode.insertBefore(alertsBox, chipsContainer.nextSibling);
      }
      alertsBox.innerHTML = bannersHtml;
    }

    if (doctorNotesEl) {
      doctorNotesEl.textContent = p.notasFacultativo || 'Sin indicaciones adicionales registradas por el médico protocolizador.';
    }

    if (tsidNotesInput) {
      tsidNotesInput.value = p.notasTecnico || '';
    }
  }

  // 14. KPIS DE LA JORNADA
  function updateKpis() {
    const hoyStr = getTodayStr();
    const mananaStr = getTomorrowStr();

    let targetPatients = state.patients;
    if (state.selectedDate === 'today') {
      targetPatients = state.patients.filter(p => (p.fechaCita || hoyStr) === hoyStr);
    } else if (state.selectedDate === 'tomorrow') {
      targetPatients = state.patients.filter(p => (p.fechaCita || hoyStr) === mananaStr);
    } else if (state.selectedDate !== 'all') {
      targetPatients = state.patients.filter(p => (p.fechaCita || hoyStr) === state.selectedDate);
    }

    const total = targetPatients.length;
    const uptake = targetPatients.filter(p => p.estado === 'uptake' && Boolean(p.horaInyeccion)).length;
    const ready = targetPatients.filter(p => p.estado === 'ready' && Boolean(p.horaInyeccion)).length;
    const scanning = targetPatients.filter(p => p.estado === 'scanning').length;
    const done = targetPatients.filter(p => p.estado === 'done').length;

    const elTotal = document.getElementById('kpiTotalCitados');
    const elUptake = document.getElementById('kpiEnReposo');
    const elReady = document.getElementById('kpiListosMaquina');
    const elScanning = document.getElementById('kpiEnEscanner');
    const elDone = document.getElementById('kpiCompletados');

    if (elTotal) elTotal.textContent = total;
    if (elUptake) elUptake.textContent = uptake;
    if (elReady) elReady.textContent = ready;
    if (elScanning) elScanning.textContent = scanning;
    if (elDone) elDone.textContent = done;
  }

  // 15. ACTUALIZACIÓN AUTOMÁTICA DE CRONÓMETROS CADA SEGUNDO
  function updateTimersAndStatus() {
    let modified = false;

    state.patients.forEach(p => {
      if (!p.horaInyeccion && (p.estado === 'uptake' || p.estado === 'ready')) {
        p.estado = 'waiting';
        modified = true;
      } else if (p.estado === 'uptake' && p.horaInyeccion) {
        const timeInfo = calculateUptakeTiming(p);
        if (timeInfo.remainingSeconds <= 0 && p.estado !== 'ready') {
          // Cambiar automáticamente a "ready" si completó los minutos exactos
          p.estado = 'ready';
          modified = true;
        }
      }
    });

    if (modified) {
      savePatients();
      renderWorklist();
    }

    // Actualizar reloj del paciente seleccionado
    if (state.selectedPatient) {
      renderUptakeSection(state.selectedPatient);
    }
  }

  // 16. DICTADO POR VOZ DE OBSERVACIONES TÉCNICAS (SPEECH RECOGNITION)
  function setupSpeechRecognition() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    state.speechRecognition = new SpeechRec();
    state.speechRecognition.lang = 'es-ES';
    state.speechRecognition.continuous = false;
    state.speechRecognition.interimResults = true;

    state.speechRecognition.onstart = () => {
      state.isListening = true;
      const micBtn = document.getElementById('tsidMicBtn');
      if (micBtn) {
        micBtn.classList.add('listening');
        micBtn.title = 'Escuchando dictado...';
      }
    };

    state.speechRecognition.onresult = (evt) => {
      let transcript = '';
      for (let i = evt.resultIndex; i < evt.results.length; ++i) {
        transcript += evt.results[i][0].transcript;
      }
      const txt = document.getElementById('tsidPatientNotes');
      if (txt && transcript) {
        const prev = txt.value ? txt.value.trim() + ' ' : '';
        txt.value = prev + transcript;
        if (state.selectedPatient) {
          state.selectedPatient.notasTecnico = txt.value;
          savePatients();
        }
      }
    };

    state.speechRecognition.onerror = () => {
      stopTsidSpeechRecognition();
    };

    state.speechRecognition.onend = () => {
      stopTsidSpeechRecognition();
    };
  }

  function toggleTsidSpeechRecognition() {
    if (!state.speechRecognition) {
      alert('Tu navegador no admite dictado de voz nativo (se recomienda Chrome o Edge).');
      return;
    }

    if (state.isListening) {
      state.speechRecognition.stop();
      stopTsidSpeechRecognition();
    } else {
      try {
        state.speechRecognition.start();
      } catch (e) {
        stopTsidSpeechRecognition();
      }
    }
  }

  function stopTsidSpeechRecognition() {
    state.isListening = false;
    const micBtn = document.getElementById('tsidMicBtn');
    if (micBtn) {
      micBtn.classList.remove('listening');
      micBtn.title = 'Dictar nota por voz';
    }
  }

  /* --------------------------------------------------------------------------
     17. RECEPTOR DE SINCRONIZACIÓN EN TIEMPO REAL CON ENFERMERÍA (MÓDULO 3)
     -------------------------------------------------------------------------- */
  const petClinicalChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pet_clinical_channel') : null;

  function aplicarEliminacionRemotaTsid(data) {
    if (!data) return;
    const delId = String(data.patientId || data.id || '').trim();
    const delNhc = String(data.nhc || '').trim();
    const delNhcDigits = delNhc.replace(/\D/g, '');

    const matches = (x) => {
      if (delId && String(x.id || '').trim() === delId) return true;
      if (delNhc && String(x.nhc || '').trim() === delNhc) return true;
      if (delNhcDigits && String(x.nhc || '').replace(/\D/g, '') === delNhcDigits) return true;
      return false;
    };

    state.patients = state.patients.filter(x => !matches(x));
    if (state.patients.length > 0) {
      if (!state.selectedPatient || matches(state.selectedPatient)) {
        state.selectedPatient = state.patients[0];
      }
    } else {
      state.selectedPatient = null;
    }

    const alertModal = document.getElementById('modalAltaMedicaAlertTsid');
    if (alertModal) alertModal.remove();

    savePatients();
    renderWorklist();
    if (state.selectedPatient) {
      renderPatientDetail(state.selectedPatient);
    }
    updateKpis();
  }

  if (petClinicalChannel) {
    petClinicalChannel.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.type === 'PATIENT_DEPARTED_AND_REMOVED' || data.type === 'TSID_PATIENT_DELETED') {
        aplicarEliminacionRemotaTsid(data);
      } else if (data.type === 'TRIAGE_DATABASE_UPDATED') {
        loadPatients();
        renderWorklist();
        updateKpis();
      } else if (data.type === 'INJECTION_UPDATED') {
        aplicarActualizacionEnfermeria(data);
      } else if (data.type === 'PATIENT_DISCHARGE_AUTHORIZED') {
        manejarAltaMedicaRecibida(data);
      } else if (data.type === 'MEDICAL_PROTOCOL_UPDATED') {
        aplicarActualizacionProtocoloMedico(data);
      } else if (data.type === 'LATE_SCAN_ORDERED') {
        aplicarOrdenTardiaMedica(data);
      } else if (data.type === 'LATE_SCAN_CANCELLED') {
        aplicarCancelacionTardiaMedica(data);
      }
    };
  }

  let lastShownTardiaAlertTs = 0;

  window.addEventListener('storage', (event) => {
    if (event.key === 'PET_DELETED_DEPARTED_PATIENTS_V1' || event.key === 'PET_DATABASE_MASTER_V4' || event.key === 'PET_TRIAGE_CITED_PATIENTS_V1' || event.key === 'PET_SHARED_INJECTIONS_AND_MOBILITY_V1' || event.key === 'PET_TSID_WORKLIST_V1' || event.key === 'PET_SHARED_DISCHARGE_V1' || event.key === 'PET_MEDICAL_PROTOCOLS_V1' || event.key === 'PET_SHARED_LATE_SCAN_ORDERS_V1') {
      loadPatients();
      renderWorklist();
      updateKpis();

      if (event.key === 'PET_SHARED_LATE_SCAN_ORDERS_V1' && event.newValue) {
        try {
          const mapObj = JSON.parse(event.newValue || '{}');
          let newestKey = null;
          let newestOrder = null;
          for (const k of Object.keys(mapObj)) {
            const ord = mapObj[k];
            if (ord && ord.requerida && (!newestOrder || (ord.timestamp || 0) > (newestOrder.timestamp || 0))) {
              newestOrder = ord;
              newestKey = k;
            }
          }
          if (newestOrder && (newestOrder.timestamp || 0) > lastShownTardiaAlertTs && (Date.now() - (newestOrder.timestamp || 0) < 8000)) {
            const targetPat = state.patients.find(x => x.id === newestKey || x.nhc === newestKey);
            if (targetPat) {
              targetPat.tardiaPautada = newestOrder;
              targetPat.presetCajaCampos = newestOrder.zona || 'pelvis_tardia';
              targetPat.presetCajaCamposManual = false;
              selectPatient(targetPat.id);
              mostrarModalImagenTardiaRecibida(targetPat, newestOrder);
              playClinicalAlertChime();
              return;
            }
          }
        } catch (e) { }
      }

      if (state.selectedPatient) {
        const updated = state.patients.find(x => x.id === state.selectedPatient.id);
        if (updated) {
          state.selectedPatient = updated;
          renderPatientDetail(updated);
        }
      }
    }
  });

  function aplicarOrdenTardiaMedica(data) {
    if (!data || !data.tardiaPautada) return;
    const tardia = data.tardiaPautada;
    const p = state.patients.find(x => String(x.id) === String(data.patientId) || (data.nhc && String(x.nhc) === String(data.nhc)));
    if (p) {
      p.tardiaPautada = tardia;
      p.presetCajaCampos = tardia.zona || 'pelvis_tardia';
      p.presetCajaCamposManual = false;
      savePatients();
      selectPatient(p.id);
    } else {
      loadPatients();
      renderWorklist();
      if (state.selectedPatient) renderPatientDetail(state.selectedPatient);
    }

    const targetPat = p || { id: data.patientId, nhc: data.nhc, nombre: data.nombre || 'Paciente', tardiaPautada: tardia };
    if (!tardia.timestamp || tardia.timestamp > lastShownTardiaAlertTs) {
      mostrarModalImagenTardiaRecibida(targetPat, tardia);
      playClinicalAlertChime();
    }
  }

  function aplicarCancelacionTardiaMedica(data) {
    if (!data) return;
    const p = state.patients.find(x => String(x.id) === String(data.patientId) || (data.nhc && String(x.nhc) === String(data.nhc)));
    if (p) {
      p.tardiaPautada = null;
      p.presetCajaCampos = p.protocoloMedico && p.protocoloMedico.scanRange
        ? mapDoctorRangeToPreset(p.protocoloMedico.scanRange)
        : 'standard';
      savePatients();
    }
    const oldModal = document.getElementById('modalImagenTardiaRecibidaTsid');
    if (oldModal) oldModal.remove();
    renderWorklist();
    if (state.selectedPatient) {
      const updated = state.patients.find(x => x.id === state.selectedPatient.id);
      if (updated) renderPatientDetail(updated);
    }
  }

  function mostrarModalImagenTardiaRecibida(p, tardia) {
    if (!tardia) return;
    lastShownTardiaAlertTs = Math.max(lastShownTardiaAlertTs, tardia.timestamp || Date.now());

    const modalId = 'modalImagenTardiaRecibidaTsid';
    const prev = document.getElementById(modalId);
    if (prev) prev.remove();

    const zonaNombre = tardia.zonaNombre || 'Pelvis / Vejiga';
    const zonaCorta = String(zonaNombre).split('/')[0].split('(')[0].trim();
    const startCmVal = tardia.startCm !== undefined ? tardia.startCm : '--';
    const endCmVal = tardia.endCm !== undefined ? tardia.endCm : '--';
    const numCamas = tardia.numCamas || 2;
    const esperaStr = tardia.minutosEspera === 'inmediata' ? 'Inmediata (tras micción)' : `+${tardia.minutosEspera || 20} min`;
    const svgHtml = typeof window.buildDoctorTardiaSvgHtml === 'function' ? window.buildDoctorTardiaSvgHtml(tardia, 410) : '';

    const overlay = document.createElement('div');
    overlay.id = modalId;
    overlay.style.cssText = 'position:fixed; inset:0; background:rgba(15,23,42,0.75); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:999999; padding:16px;';
    overlay.onclick = (e) => {
      if (e.target === overlay) overlay.remove();
    };

    overlay.innerHTML = `
      <div style="background:#ffffff; border:3px solid #f59e0b; border-radius:16px; max-width:760px; width:100%; overflow:hidden; box-shadow:0 24px 60px rgba(0,0,0,0.55); font-family:'Open Sans',sans-serif;">
        <!-- Cabecera -->
        <div style="background:linear-gradient(135deg, #78350f 0%, #b45309 100%); color:#ffffff; padding:14px 20px; display:flex; justify-content:space-between; align-items:center;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:1.7rem; line-height:1;">🕒</span>
            <div>
              <div style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.12rem; color:#fde047; letter-spacing:0.3px;">
                IMAGEN DE ADQUISICIÓN TARDÍA ENVIADA POR EL MÉDICO
              </div>
              <div style="font-size:0.8rem; color:#fef3c7;">
                Pautado por <strong>${tardia.medico || 'Dr. Manuel Gómez Feijóo'}</strong> a las <strong>${tardia.horaOrden || '--:--'}h</strong>
              </div>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:rgba(255,255,255,0.18); border:none; color:#ffffff; width:32px; height:32px; border-radius:8px; font-size:1.1rem; font-weight:800; cursor:pointer;">✕</button>
        </div>

        <!-- Cuerpo con la Imagen del Paciente y la Caja de Tardía -->
        <div style="padding:18px 20px; display:grid; grid-template-columns:250px 1fr; gap:20px; align-items:start; background:#fffbeb;">
          <div style="display:flex; flex-direction:column; gap:6px;">
            ${svgHtml}
            <div style="background:#0f172a; color:#fde047; font-family:'JetBrains Mono',monospace; font-size:0.76rem; font-weight:800; text-align:center; padding:6px 8px; border-radius:8px; border:1px solid #f59e0b;">
              📐 Rango Z: ${startCmVal} cm – ${endCmVal} cm (${numCamas} Camas)
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:12px;">
            <div style="background:#ffffff; border:1.5px solid #fcd34d; border-radius:10px; padding:12px 14px;">
              <div style="font-size:0.75rem; font-weight:800; color:#92400e; text-transform:uppercase;">Paciente Seleccionado</div>
              <div style="font-family:'Outfit',sans-serif; font-size:1.2rem; font-weight:800; color:#0f172a; margin-top:2px;">${p.nombre || 'Paciente'}</div>
              <div style="font-family:'JetBrains Mono',monospace; font-size:0.86rem; font-weight:700; color:#b45309; margin-top:2px;">${p.nhc || ''}</div>
            </div>

            <div style="background:#ffffff; border:1.5px solid #fcd34d; border-radius:10px; padding:12px 14px; display:flex; flex-direction:column; gap:8px;">
              <div>
                <span style="font-size:0.75rem; font-weight:800; color:#92400e; text-transform:uppercase; display:block;">🎯 Zona Marcada en la Imagen:</span>
                <span style="font-family:'Outfit',sans-serif; font-size:1.02rem; font-weight:800; color:#b45309;">${zonaNombre}</span>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; border-top:1px dashed #fde68a; padding-top:8px;">
                <div>
                  <span style="font-size:0.72rem; font-weight:700; color:#64748b; display:block;">Camas a Adquirir:</span>
                  <strong style="font-family:'JetBrains Mono',monospace; font-size:0.9rem; color:#0f172a;">${numCamas} Camas (3 min/cama)</strong>
                </div>
                <div>
                  <span style="font-size:0.72rem; font-weight:700; color:#64748b; display:block;">Espera Recomendada:</span>
                  <strong style="font-size:0.9rem; color:#0369a1;">${esperaStr}</strong>
                </div>
              </div>
            </div>

            <div style="background:#ffffff; border:1.5px dashed #f59e0b; border-radius:10px; padding:12px 14px; font-size:0.86rem; color:#451a03; line-height:1.45;">
              <strong style="display:block; margin-bottom:4px; color:#92400e;">📝 Indicaciones del Facultativo para el Técnico TSID:</strong>
              ${tardia.indicaciones || 'Realizar adquisición focal tardía según la caja marcada en la imagen del paciente.'}
            </div>

            <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:6px;">
              <button type="button" onclick="document.getElementById('${modalId}').remove()" style="background:#f1f5f9; color:#334155; border:1px solid #cbd5e1; padding:9px 16px; border-radius:8px; font-weight:700; font-size:0.86rem; cursor:pointer;">
                ✓ Entendido (Ver en Ficha)
              </button>
              <button type="button" onclick="selectPatientTsidById('${p.id}'); solicitarTardiaPaciente(); document.getElementById('${modalId}').remove();" style="background:#d97706; color:#ffffff; border:none; padding:9px 18px; border-radius:8px; font-family:'Outfit',sans-serif; font-weight:800; font-size:0.88rem; cursor:pointer; box-shadow:0 4px 12px rgba(217,119,6,0.35);">
                ▶️ Aplicar Caja e Iniciar Tardía de ${zonaCorta}
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
  }

  function aplicarActualizacionProtocoloMedico(data) {
    const proto = data.protocoloMedico;
    if (!proto) return;

    const p = state.patients.find(x => x.id === data.patientId || x.nhc === data.nhc);
    if (!p) return;

    p.protocoloMedico = proto;
    if (proto.armsPosition) {
      p.posicionBrazos = proto.armsPosition;
    }
    if (proto.scanRange) {
      p.rangoCampos = proto.scanRange;
      p.presetCajaCampos = mapDoctorRangeToPreset(proto.scanRange);
      p.presetCajaCamposManual = false; // Prioridad al médico
    }
    if (proto.tardiaPautada && proto.tardiaPautada.requerida) {
      p.tardiaPautada = proto.tardiaPautada;
      p.presetCajaCampos = proto.tardiaPautada.zona || 'pelvis_tardia';
      p.presetCajaCamposManual = false;
    }
    if (proto.uptakeTime) {
      p.tiempoProtocoloMin = parseInt(proto.uptakeTime, 10) || p.tiempoProtocoloMin;
    }
    if (proto.doctorNotes) {
      p.notasFacultativo = proto.doctorNotes;
    }
    if (proto.doctorName) {
      p.medicoProtocolizador = proto.doctorName;
    }
    if (proto.contrastType) {
      p.contrasteIV = (proto.contrastType === 'en_maquina' || proto.contrastType === 'en_box');
    }
    if (proto.vascularPhase !== undefined) {
      p.requiereFaseVascular = (proto.vascularPhase === 'si');
    }

    savePatients();
    renderWorklist();
    updateKpis();

    if (state.selectedPatient && (state.selectedPatient.id === p.id || state.selectedPatient.nhc === p.nhc)) {
      state.selectedPatient = p;
      renderPatientDetail(p);
    }

    if (proto.tardiaPautada && proto.tardiaPautada.requerida) {
      mostrarModalImagenTardiaRecibida(p, proto.tardiaPautada);
    } else {
      mostrarToastProtocoloMedicoActualizado(p, proto);
    }
    playClinicalAlertChime();
  }

  function mostrarToastProtocoloMedicoActualizado(p, proto) {
    const toast = document.createElement('div');
    toast.className = 'tech-sync-toast';
    toast.style.background = '#064e3b';
    toast.style.borderColor = '#10b981';

    const armsText = proto.armsPosition === 'arriba' ? 'Brazos Arriba' : (proto.armsPosition === 'abdominal' ? 'Reposo Abdominal' : 'Brazos Abajo');
    const vascAlertLine = proto.vascularPhase === 'si'
      ? `<div style="font-size:0.8rem; color:#fecaca; background:#991b1b; padding:4px 8px; border-radius:6px; font-weight:800; margin-top:4px; border:1px solid #f87171;">
           🩸 HACER 1ª FASE VASCULAR · Al iniciarla empezará el descuento (${proto.uptakeTime || 60}m) para la 2ª Fase
         </div>`
      : '';

    toast.innerHTML = `
    <div class="toast-icon">${proto.vascularPhase === 'si' ? '🩸' : '🩺'}</div>
    <div style="flex:1;">
      <div class="toast-title" style="color:#a7f3d0;">Protocolo Médico Oficial Actualizado</div>
      <div style="margin-top:2px;"><strong>${p.nombre}</strong> (${p.nhc}):</div>
      <div style="font-size:0.78rem; color:#fde047; font-weight:800; margin-top:2px;">
        🙆‍♂️ Posición: ${armsText} · 📐 Caja: ${proto.scanRange} (${proto.uptakeTime || 60}m)
      </div>
      ${vascAlertLine}
      <div style="font-size:0.75rem; color:#d1fae5; margin-top:2px;">
        Pautado por: ${proto.doctorName || 'Dr. Manuel Gómez Feijóo'}
      </div>
    </div>
    <button type="button" class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;

    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 8500);
  }

  function aplicarActualizacionEnfermeria(data) {
    const p = state.patients.find(x => x.id === data.patientId || x.nhc === data.nhc);
    if (!p) return;

    if (data.horaInyeccion !== undefined) {
      p.horaInyeccion = data.horaInyeccion;
    }
    if (data.glucemia !== undefined && data.glucemia !== '') {
      const gNum = parseInt(String(data.glucemia).replace(/[^\d]/g, ''), 10);
      if (!isNaN(gNum) && gNum > 0) {
        p.glucemia = `${gNum} mg/dL`;
        p.glucemiaEstado = gNum >= 200 ? 'critica' : (gNum >= 140 ? 'alerta' : 'optima');
      }
    }
    p.trasladoModo = data.trasladoModo || p.trasladoModo;
    p.sondaVesical = data.sondaVesical !== undefined ? data.sondaVesical : p.sondaVesical;
    p.movilidad = getMobilityTextTsid(p.trasladoModo);
    if (data.boxAsignado !== undefined) p.boxAsignado = data.boxAsignado;
    if (data.boxAnterior !== undefined) p.boxAnterior = data.boxAnterior;
    if (data.boxCambiado !== undefined) p.boxCambiado = data.boxCambiado;
    if (data.boxVerificado !== undefined) p.boxVerificado = data.boxVerificado;
    if (data.horaCambioBox !== undefined) p.horaCambioBox = data.horaCambioBox;
    if (data.horaVerificacionBox !== undefined) p.horaVerificacionBox = data.horaVerificacionBox;
    if (p.horaInyeccion && (!p.estado || p.estado === 'waiting')) {
      p.estado = 'uptake';
    } else if (!p.horaInyeccion && (p.estado === 'uptake' || p.estado === 'ready')) {
      p.estado = 'waiting';
    }

    savePatients();
    renderWorklist();
    updateKpis();

    if (state.selectedPatient && state.selectedPatient.id === p.id) {
      state.selectedPatient = p;
      renderPatientDetail(p);
    }

    mostrarToastNotificacionEnfermeria(data);
    playClinicalAlertChime();
  }

  function manejarAltaMedicaRecibida(data) {
    const p = state.patients.find(x => x.id === data.patientId || x.nhc === data.nhc);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (p) {
      p.altaMedicaAutorizada = true;
      p.horaAltaMedica = data.horaAltaMedica || timeStr;
      p.altaDoctor = data.doctor || 'Dr. Manuel Gómez Feijóo';
      savePatients();
      broadcastPatientState(p);
    }

    playHighPriorityDischargeAlarm();
    mostrarBannerModalAltaMedica(data, timeStr);
    renderWorklist();
    if (state.selectedPatient && (state.selectedPatient.id === data.patientId || state.selectedPatient.nhc === data.nhc)) {
      renderPatientDetail(state.selectedPatient);
    }
  }

  function mostrarBannerModalAltaMedica(data, timeStr) {
    const modalId = 'modalAltaMedicaAlertTsid';
    const old = document.getElementById(modalId);
    if (old) old.remove();

    const div = document.createElement('div');
    div.id = modalId;
    div.style.position = 'fixed';
    div.style.top = '24px';
    div.style.right = '24px';
    div.style.maxWidth = '460px';
    div.style.background = '#064e3b';
    div.style.border = '2px solid #10b981';
    div.style.boxShadow = '0 20px 45px rgba(0,0,0,0.45), 0 0 30px rgba(16,185,129,0.4)';
    div.style.borderRadius = '14px';
    div.style.color = '#ffffff';
    div.style.padding = '18px 22px';
    div.style.zIndex = '99999';
    div.style.animation = 'slideInDown 0.35s ease';

    div.innerHTML = `
      <div style="display:flex; align-items:flex-start; gap:14px;">
        <div style="font-size:2.5rem; line-height:1;">🔔</div>
        <div style="flex:1;">
          <div style="display:flex; align-items:center; justify-content:space-between;">
            <span style="font-family:'Outfit',sans-serif; font-weight:800; font-size:1.05rem; color:#a7f3d0; text-transform:uppercase; letter-spacing:0.5px;">
              ¡ALTA MÉDICA AUTORIZADA!
            </span>
            <button type="button" onclick="this.closest('#${modalId}').remove()" style="background:none; border:none; color:#a7f3d0; font-size:1.2rem; cursor:pointer;">✕</button>
          </div>
          <div style="font-size:0.95rem; margin-top:6px; font-weight:700; color:#ffffff;">
            El paciente <span style="color:#fde047;">${data.nombre || 'Paciente'}</span> (${data.nhc || ''}) ya se puede marchar.
          </div>
          <div style="font-size:0.8rem; color:#d1fae5; margin-top:4px;">
            Autorizado por: <strong>${data.doctor || 'Dr. Manuel Gómez Feijóo'}</strong> a las <strong>${timeStr}h</strong>.
          </div>
          <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
            <button type="button" onclick="this.closest('#${modalId}').remove()" style="background:#10b981; color:#064e3b; font-weight:800; font-size:0.82rem; border:none; padding:7px 14px; border-radius:6px; cursor:pointer;">
              ✓ Entendido (Silenciar)
            </button>
            <button type="button" onclick="eliminarPacienteActual('${(data.patientId || '').replace(/'/g, "\\'")}', '${(data.nhc || '').replace(/'/g, "\\'")}', '${(data.nombre || 'Paciente').replace(/'/g, "\\'")}', true); if (document.getElementById('${modalId}')) document.getElementById('${modalId}').remove();" style="background:#fde047; color:#064e3b; font-weight:800; font-size:0.82rem; border:none; padding:7px 14px; border-radius:6px; cursor:pointer; box-shadow:0 3px 10px rgba(0,0,0,0.25);">
              🗑️ Confirmar Salida y Eliminar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(div);
  }

  function mostrarToastNotificacionEnfermeria(d) {
    const prev = document.querySelector('.tech-sync-toast');
    if (prev) prev.remove();

    const toast = document.createElement('div');
    toast.className = 'tech-sync-toast';

    let alertItems = [];
    if (d.boxAsignado) {
      if (d.boxCambiado && !d.boxVerificado) {
        alertItems.push(`⚠️ CAMBIO DE BOX: ${d.boxAnterior || 'Box previo'} ➔ ${d.boxAsignado} (Sin verificar)`);
      } else if (d.boxCambiado && d.boxVerificado) {
        alertItems.push(`✅ CAMBIO DE BOX VERIFICADO: ${d.boxAnterior || 'Box previo'} ➔ ${d.boxAsignado}`);
      } else {
        alertItems.push(`🚪 Ubicado en ${d.boxAsignado}`);
      }
    }
    if (d.trasladoModo === 'ayuda') alertItems.push('🤝 Necesita Ayuda / Asistencia');
    if (d.trasladoModo === 'silla') alertItems.push('♿ En Silla de Ruedas');
    if (d.trasladoModo === 'encamado') alertItems.push('🛏️ Encamado / Camilla');
    if (d.sondaVesical) alertItems.push('🩺 Bolsa de orina');
    if (d.glucemia) {
      const gNum = parseInt(String(d.glucemia).replace(/[^\d]/g, ''), 10);
      if (!isNaN(gNum) && gNum > 0) {
        alertItems.push(`🩸 Glucemia: ${gNum} mg/dL${gNum >= 200 ? ' (⚠️ CRÍTICA)' : ''}`);
      }
    }

    const alertsStr = alertItems.length > 0 ? `<div style="margin-top:5px; color:#fde047; font-weight:800; font-size:0.8rem;">🚨 ALERTA: ${alertItems.join(' · ')}</div>` : '';

    const injLine = d.horaInyeccion
      ? `<div style="margin-top:2px;"><strong>${d.nombre || 'Paciente'}</strong> inyectado a las <strong>${d.horaInyeccion}</strong>.</div>
         <div style="font-size:0.78rem; color:#93c5fd; margin-top:2px;">🎯 Paso a Máquina estimado: <strong>${d.horaPasoMaquina || '--'}</strong> (+${d.tiempoProtocoloMin || 60}m)</div>`
      : `<div style="margin-top:2px;"><strong>${d.nombre || 'Paciente'}</strong> — Pendiente de inyección (Box / Movilidad actualizados).</div>`;

    toast.innerHTML = `
      <div class="toast-icon">${d.horaInyeccion ? '💉' : '🚪'}</div>
      <div style="flex:1;">
        <div class="toast-title">Aviso de Enfermería (Box PET)</div>
        ${injLine}
        ${alertsStr}
      </div>
      <button type="button" class="toast-close" onclick="this.parentElement.remove()">✕</button>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentElement) toast.remove();
    }, 8500);
  }

  function playClinicalAlertChime() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.55);
    } catch (e) { }
  }

  // ALARMA HOSPITALARIA DE ALTA PRIORIDAD PARA AVISO DE ALTA MÉDICA
  function playHighPriorityDischargeAlarm() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      const playTone = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0.25, ctx.currentTime + start);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
      };

      // Secuencia hospitalaria de aviso médico urgente (Do - Mi - Sol) repetida
      playTone(523.25, 0.0, 0.14);
      playTone(659.25, 0.16, 0.14);
      playTone(783.99, 0.32, 0.22);

      playTone(523.25, 0.65, 0.14);
      playTone(659.25, 0.81, 0.14);
      playTone(783.99, 0.97, 0.28);
    } catch (e) { }
  }

  // Exportar funciones globales para interacción directa desde los botones HTML
  window.solicitarTardiaPaciente = solicitarTardiaPaciente;
  window.iniciarFaseVascularPaciente = iniciarFaseVascularPaciente;
  window.eliminarPacienteActual = eliminarPacienteActual;
  window.cambiarCajaCamposVertical = cambiarCajaCamposVertical;
  window.playHighPriorityDischargeAlarm = playHighPriorityDischargeAlarm;
  window.selectPatientTsidById = selectPatient;
  window.seleccionarBoxPacienteTsid = seleccionarBoxPacienteTsid;
  window.verificarCambioBoxTsid = verificarCambioBoxTsid;
  window.seleccionarTrasladoTsid = seleccionarTrasladoTsid;
  window.toggleSondaTsid = toggleSondaTsid;

})();
