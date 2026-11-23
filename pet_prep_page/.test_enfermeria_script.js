
    // Variables de estado
    let currentPanelData = { dudas: [], urgencias: [] };
    let scheduledPatients = [];
    let selectedCitadosDate = '';
    let activeQuickFilter = 'today';
    let currentViewMode = "citados"; // "citados" | "dudas" | "urgencias" | "all"
    let pendingDeletionItem = null;
    let autoRefreshTimer = null;
    
    // Detección de nuevas urgencias y sonido
    let knownEmergencyIds = null;
    let activeEmergencyModalId = null;
    let audioCtx = null;
    let sirenInterval = null;
    let isSoundEnabled = true;

    // Inicialización al cargar la página
    document.addEventListener("DOMContentLoaded", () => {
      checkAuthSession();

      // Permitir iniciar el AudioContext con cualquier interacción de usuario previa
      document.body.addEventListener("click", () => {
        initAudioContext();
      }, { once: false });
    });

    /* --------------------------------------------------------------------------
       1. AUTENTICACIÓN Y CONTROL DE ACCESO
       -------------------------------------------------------------------------- */
    function checkAuthSession() {
      const token = sessionStorage.getItem("pet_nurse_token") || localStorage.getItem("pet_nurse_token");
      const user = sessionStorage.getItem("pet_nurse_user") || localStorage.getItem("pet_nurse_user");
      
      const loginScreen = document.getElementById("loginScreen");
      if (token && user) {
        loginScreen.classList.add("hidden");
        document.getElementById("activeUserName").textContent = user.toUpperCase();
        iniciarConsolaEnfermeria();
      } else {
        loginScreen.classList.remove("hidden");
        document.getElementById("loginUser").focus();
      }
    }

    async function handleLoginSubmit(event) {
      event.preventDefault();
      const user = document.getElementById("loginUser").value.trim();
      const pass = document.getElementById("loginPass").value.trim();
      const errBox = document.getElementById("loginError");
      const errText = document.getElementById("loginErrorText");

      errBox.classList.remove("visible");

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ usuario: user, password: pass })
        });

        const data = await res.json();
        if (res.ok && data.status === "ok") {
          sessionStorage.setItem("pet_nurse_token", data.token);
          sessionStorage.setItem("pet_nurse_user", data.usuario);
          document.getElementById("activeUserName").textContent = data.usuario.toUpperCase();
          document.getElementById("loginScreen").classList.add("hidden");
          initAudioContext();
          iniciarConsolaEnfermeria();
        } else {
          errText.textContent = data.message || "Credenciales incorrectas.";
          errBox.classList.add("visible");
        }
      } catch (err) {
        if (user === "enfermeria" && pass === "pet2026") {
          sessionStorage.setItem("pet_nurse_token", "demo_token");
          sessionStorage.setItem("pet_nurse_user", user);
          document.getElementById("activeUserName").textContent = user.toUpperCase();
          document.getElementById("loginScreen").classList.add("hidden");
          initAudioContext();
          iniciarConsolaEnfermeria();
        } else {
          errText.textContent = "Error al conectar con el servidor.";
          errBox.classList.add("visible");
        }
      }
    }

    function togglePasswordVisibility() {
      const input = document.getElementById("loginPass");
      input.type = input.type === "password" ? "text" : "password";
    }

    function fillDemoCredentials() {
      document.getElementById("loginUser").value = "enfermeria";
      document.getElementById("loginPass").value = "pet2026";
      document.getElementById("loginError").classList.remove("visible");
    }

    function cerrarSesion() {
      stopEmergencySiren();
      sessionStorage.removeItem("pet_nurse_token");
      sessionStorage.removeItem("pet_nurse_user");
      localStorage.removeItem("pet_nurse_token");
      localStorage.removeItem("pet_nurse_user");
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      document.getElementById("loginScreen").classList.remove("hidden");
    }

    /* --------------------------------------------------------------------------
       2. CONTROLADOR DE VISTAS / TABS ("CADA NOTIFICACIÓN DENTRO DE SU LISTA")
       -------------------------------------------------------------------------- */
    function switchActiveView(viewMode) {
      currentViewMode = viewMode;
      const container = document.getElementById("panelsGridContainer");
      const cardCitados = document.getElementById("metricCardCitados");
      const cardDudas = document.getElementById("metricCardDudas");
      const cardUrgencias = document.getElementById("metricCardUrgencias");
      const pillCitados = document.getElementById("pillBtnCitados");
      const pillDudas = document.getElementById("pillBtnDudas");
      const pillUrgencias = document.getElementById("pillBtnUrgencias");
      const pillAll = document.getElementById("pillBtnAll");
      const viewLabel = document.getElementById("activeViewLabel");

      // Limpiar clases activas
      if (cardCitados) cardCitados.classList.remove("active-tab");
      if (cardDudas) cardDudas.classList.remove("active-tab");
      if (cardUrgencias) cardUrgencias.classList.remove("active-tab");
      if (pillCitados) pillCitados.classList.remove("active");
      if (pillDudas) pillDudas.classList.remove("active");
      if (pillUrgencias) pillUrgencias.classList.remove("active");
      if (pillAll) pillAll.classList.remove("active");
      container.classList.remove("view-citados", "view-dudas", "view-urgencias", "view-all");

      if (viewMode === "citados") {
        container.classList.add("view-citados");
        if (cardCitados) cardCitados.classList.add("active-tab");
        if (pillCitados) pillCitados.classList.add("active");
        viewLabel.textContent = "Pacientes Citados";
        viewLabel.style.color = "#0284c7";
      } else if (viewMode === "dudas") {
        container.classList.add("view-dudas");
        if (cardDudas) cardDudas.classList.add("active-tab");
        if (pillDudas) pillDudas.classList.add("active");
        viewLabel.textContent = "Dudas Abiertas";
        viewLabel.style.color = "var(--sergas-blue)";
      } else if (viewMode === "urgencias") {
        container.classList.add("view-urgencias");
        if (cardUrgencias) cardUrgencias.classList.add("active-tab");
        if (pillUrgencias) pillUrgencias.classList.add("active");
        viewLabel.textContent = "Urgencias Abiertas";
        viewLabel.style.color = "var(--red-urgent)";
      } else {
        // Vista completa (All)
        container.classList.add("view-all");
        if (pillAll) pillAll.classList.add("active");
        viewLabel.textContent = "Todos los Paneles";
        viewLabel.style.color = "var(--sergas-navy)";
      }
    }

    /* --------------------------------------------------------------------------
       3. SINTETIZADOR DE AUDIO DE ALARMA HOSPITALARIA (WEB AUDIO API)
       -------------------------------------------------------------------------- */
    function initAudioContext() {
      if (!audioCtx) {
        const AudioClass = window.AudioContext || window.webkitAudioContext;
        if (AudioClass) {
          audioCtx = new AudioClass();
        }
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playEmergencySound() {
      if (!isSoundEnabled) return;
      initAudioContext();
      if (!audioCtx) return;

      stopEmergencySiren();

      let beepCount = 0;
      const totalBeeps = 10; // Secuencia de 10 beeps de alarma

      function playTone(freq, duration) {
        try {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start();
          osc.stop(audioCtx.currentTime + duration);
        } catch (e) {
          console.warn("Aviso WebAudio:", e);
        }
      }

      sirenInterval = setInterval(() => {
        beepCount++;
        // Alarma modulada: alterna entre 1200Hz y 900Hz rápidamente
        if (beepCount % 2 === 1) {
          playTone(1250, 0.16);
        } else {
          playTone(950, 0.16);
        }

        if (beepCount >= totalBeeps) {
          stopEmergencySiren();
        }
      }, 220);
    }

    function stopEmergencySiren() {
      if (sirenInterval) {
        clearInterval(sirenInterval);
        sirenInterval = null;
      }
    }

    function testEmergencySound() {
      initAudioContext();
      playEmergencySound();
      mostrarToast("🔔 Probando sonido de alarma asistencial (Web Audio API).");
    }

    function toggleSoundAlarm() {
      isSoundEnabled = !isSoundEnabled;
      const btn = document.getElementById("btnSoundToggle");
      const txt = document.getElementById("soundToggleText");
      if (isSoundEnabled) {
        btn.classList.remove("muted");
        txt.textContent = "Alarma Sonora: ON";
        mostrarToast("🔊 Alarma sonora activada para nuevas urgencias.");
        initAudioContext();
      } else {
        btn.classList.add("muted");
        txt.textContent = "Alarma Sonora: OFF";
        stopEmergencySiren();
        mostrarToast("🔇 Alarma sonora silenciada.");
      }
    }

    /* --------------------------------------------------------------------------
       4. MENSAJE EN PANTALLA Y DETECCIÓN EN TIEMPO REAL
       -------------------------------------------------------------------------- */
    function processEmergenciesDetection(urgenciasList) {
      if (!Array.isArray(urgenciasList)) return;
      const currentIds = new Set(urgenciasList.map(u => u.id));

      if (knownEmergencyIds === null) {
        // Primera carga inicial: guardamos los IDs existentes sin disparar la alarma
        knownEmergencyIds = currentIds;
        return;
      }

      // Buscar si han llegado urgencias nuevas que no estaban en la lista conocida
      const newItems = urgenciasList.filter(u => !knownEmergencyIds.has(u.id));
      if (newItems.length > 0) {
        const latestNewEmergency = newItems[0];
        // Registrar los nuevos IDs
        newItems.forEach(u => knownEmergencyIds.add(u.id));

        // 1. Sonido de alarma
        playEmergencySound();

        // 2. Mensaje visual emergente en pantalla
        showEmergencyNotificationModal(latestNewEmergency);

        // 3. Abrir automáticamente la lista de urgencias para que el enfermero lo vea
        switchActiveView("urgencias");
      } else {
        knownEmergencyIds = currentIds;
      }
    }

    function showEmergencyNotificationModal(item) {
      activeEmergencyModalId = item.id;
      document.getElementById("emAlertPatientName").textContent = item.paciente_nombre || "Paciente";
      document.getElementById("emAlertGlucoseVal").textContent = item.glucemia_mg_dl || "≥200";
      document.getElementById("emAlertTimeVal").textContent = (item.hora_control_capilar || "--:--") + " h";
      
      const phone = item.paciente_telefono || "";
      document.getElementById("emAlertPhoneVal").textContent = phone || "No disponible";
      
      const callBtn = document.getElementById("emAlertCallBtn");
      if (phone) {
        callBtn.href = `tel:${phone}`;
        callBtn.style.display = "flex";
      } else {
        callBtn.style.display = "none";
      }

      document.getElementById("emergencyAlertOverlay").classList.add("active");
    }

    function dismissEmergencyAlert() {
      stopEmergencySiren();
      document.getElementById("emergencyAlertOverlay").classList.remove("active");
    }

    function goToUrgentPatientFromModal() {
      dismissEmergencyAlert();
      switchActiveView("urgencias");
      if (activeEmergencyModalId) {
        setTimeout(() => {
          const card = document.getElementById(`card-record-${activeEmergencyModalId}`);
          if (card) {
            card.classList.add("highlight-pulse");
            card.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 150);
      }
    }

    /* --------------------------------------------------------------------------
       5. CARGA Y SINCRONIZACIÓN DE DATOS CON SQLITE
       -------------------------------------------------------------------------- */
    function iniciarConsolaEnfermeria() {
      cargarDatosPanel();
      if (autoRefreshTimer) clearInterval(autoRefreshTimer);
      // Auto-refresco cada 6 segundos para detección rápida de nuevas alertas
      autoRefreshTimer = setInterval(cargarDatosPanel, 6000);
    }

    async function cargarDatosPanel() {
      try {
        const res = await fetch("/api/enfermeria/panel");
        if (!res.ok) throw new Error("Fallo en la respuesta del servidor");
        const data = await res.json();
        
        currentPanelData.dudas = (data.dudas || []).filter(item => 
          item.origen === 'DUDAS_UNIDAD_ENFERMERIA' || item.nivel === 'DUDA_LLAMADA_PACIENTE'
        );
        currentPanelData.urgencias = data.urgencias || [];

        // Evaluar detección de nuevas urgencias para sonido y mensaje en pantalla
        processEmergenciesDetection(currentPanelData.urgencias);

        // Cargar y sincronizar pacientes citados desde peticiones_db
        await cargarPacientesCitados();

        renderizarMetricas(currentPanelData.dudas.length, data.total_urgencias);
        renderizarPaneles(currentPanelData);
        actualizarTimestampSync();
      } catch (err) {
        console.warn("Aviso al consultar /api/enfermeria/panel (usando contingencia local/GitHub):", err.message);
        try {
          const localCancellations = JSON.parse(localStorage.getItem('PET_CANCELLED_PATIENTS') || '[]');
          const emergencyCancellations = localCancellations.map((c, i) => ({
            id: 9000 + i,
            origen: 'CANCELACION_WEB',
            nivel: 'CANCELACION',
            fecha_hora: c.fecha_hora || new Date().toLocaleString('es-ES'),
            paciente_nombre: `${c.paciente_nombre || c.nombre || 'Paciente'} (NHC: ${c.paciente_nhc || c.nhc || 'N/D'})`,
            paciente_telefono: c.paciente_telefono || c.tel || '600 000 000',
            mensaje_alerta: `Cita cancelada: ${c.motivo_categoria || c.motivo || 'Motivo clínico'} - ${c.explicacion_motivo || ''}`
          }));

          currentPanelData.urgencias = [
            ...emergencyCancellations,
            {
              id: 9991,
              origen: 'AUDIOGUIA_METABOLICA',
              nivel: 'URGENCIA_METABOLICA',
              fecha_hora: 'Hoy 07:15',
              paciente_nombre: 'Antonio Lois Pazo',
              paciente_telefono: '688 334 455',
              hora_control_capilar: '07:15',
              glucemia_mg_dl: 245,
              mensaje_alerta: 'Glucemia capilar crítica (245 mg/dL). Supera umbral de 200 mg/dL para FDG.'
            }
          ];
          currentPanelData.dudas = [
            {
              id: 9992,
              origen: 'AUDIOGUIA_VOZ',
              nivel: 'DUDA_LLAMADA_PACIENTE',
              fecha_hora: 'Hoy 08:00',
              paciente_nombre: 'Manuel Gómez Suárez',
              paciente_telefono: '644 123 456',
              mensaje_alerta: 'Consulta sobre dieta sin hidratos previa: ¿Puedo tomar queso y huevos en la cena?'
            }
          ];
          await cargarPacientesCitados();
          renderizarMetricas(currentPanelData.dudas.length, currentPanelData.urgencias.length);
          renderizarPaneles(currentPanelData);
          actualizarTimestampSync();
        } catch (fbErr) {
          console.error("Error en fallback enfermería:", fbErr);
        }
      }
    }

    function actualizarTimestampSync() {
      const now = new Date();
      document.getElementById("metricLastSync").textContent = now.toLocaleTimeString('es-ES');
    }

    function renderizarMetricas(totalDudas, totalUrgencias) {
      document.getElementById("metricDudasCount").textContent = totalDudas;
      document.getElementById("metricUrgenciasCount").textContent = totalUrgencias;
      document.getElementById("badgeDudasCount").textContent = `${totalDudas} pendientes`;
      document.getElementById("badgeUrgenciasCount").textContent = `${totalUrgencias} activas`;
      const pDudas = document.getElementById("badgeDudasPill");
      if (pDudas) pDudas.textContent = totalDudas;
      const pUrg = document.getElementById("badgeUrgenciasPill");
      if (pUrg) pUrg.textContent = totalUrgencias;
    }

    /* --------------------------------------------------------------------------
       5.1. CARGA Y GESTIÓN DE PACIENTES CITADOS (AGENDA DEL DÍA)
       -------------------------------------------------------------------------- */
    async function cargarPacientesCitados() {
      try {
        let peticiones = [];
        try {
          const res = await fetch("/api/sync-database");
          if (res.ok) {
            const json = await res.json();
            peticiones = json.data || (Array.isArray(json) ? json : []);
          }
        } catch (e) {
          console.warn("Aviso: /api/sync-database no disponible directamente, intentando archivo local...", e.message);
        }

        if (!peticiones || peticiones.length === 0) {
          try {
            const resStatic = await fetch("../pet_peticion_medica/database/peticiones_db.json");
            if (resStatic.ok) {
              peticiones = await resStatic.json();
            }
          } catch (e2) {
            console.warn("Aviso: Fallo al consultar peticiones_db.json estático:", e2.message);
          }
        }

        if (!peticiones || peticiones.length === 0) {
          try {
            const localMaster = localStorage.getItem('PET_DATABASE_MASTER_V4');
            if (localMaster) peticiones = JSON.parse(localMaster);
          } catch (e3) {}
        }

        scheduledPatients = peticiones || [];

        // Inicializar fecha seleccionada por defecto a hoy si no está establecida
        if (!selectedCitadosDate) {
          selectedCitadosDate = getTodayDateStr();
          const datePicker = document.getElementById("citadosDateInput");
          if (datePicker) datePicker.value = selectedCitadosDate;
        }

        // Calcular citados para hoy
        const hoyStr = getTodayDateStr();
        const citadosHoy = scheduledPatients.filter(p => {
          const f = (p["Fecha Cita Asignada"] || p.appointmentDate || "").trim();
          return f === hoyStr || f.startsWith(hoyStr);
        });

        // Actualizar contadores en tarjeta y badge
        const elMetricCitados = document.getElementById("metricCitadosCount");
        if (elMetricCitados) elMetricCitados.textContent = citadosHoy.length;
        
        const elPillBadge = document.getElementById("pillBadgeCitados");
        if (elPillBadge) elPillBadge.textContent = citadosHoy.length;

        // Renderizar listado de pacientes citados
        renderizarPacientesCitados();
      } catch (err) {
        console.error("Error al cargar pacientes citados:", err);
      }
    }

    function getTodayDateStr() {
      const hoy = new Date();
      const yyyy = hoy.getFullYear();
      const mm = String(hoy.getMonth() + 1).padStart(2, '0');
      const dd = String(hoy.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    function getTomorrowDateStr() {
      const manana = new Date();
      manana.setDate(manana.getDate() + 1);
      const yyyy = manana.getFullYear();
      const mm = String(manana.getMonth() + 1).padStart(2, '0');
      const dd = String(manana.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }

    function setCitadosDateQuick(tipo) {
      activeQuickFilter = tipo;
      const btnHoy = document.getElementById("btnDateHoy");
      const btnManana = document.getElementById("btnDateManana");
      const btnAll = document.getElementById("btnDateAll");
      const datePicker = document.getElementById("citadosDateInput");

      if (btnHoy) btnHoy.classList.remove("active");
      if (btnManana) btnManana.classList.remove("active");
      if (btnAll) btnAll.classList.remove("active");

      if (tipo === 'today') {
        selectedCitadosDate = getTodayDateStr();
        if (btnHoy) btnHoy.classList.add("active");
        if (datePicker) datePicker.value = selectedCitadosDate;
      } else if (tipo === 'tomorrow') {
        selectedCitadosDate = getTomorrowDateStr();
        if (btnManana) btnManana.classList.add("active");
        if (datePicker) datePicker.value = selectedCitadosDate;
      } else if (tipo === 'all') {
        selectedCitadosDate = 'all';
        if (btnAll) btnAll.classList.add("active");
        if (datePicker) datePicker.value = '';
      }
      renderizarPacientesCitados();
    }

    function cambiarFechaCitados(fecha) {
      selectedCitadosDate = fecha;
      activeQuickFilter = 'custom';
      const btnHoy = document.getElementById("btnDateHoy");
      const btnManana = document.getElementById("btnDateManana");
      const btnAll = document.getElementById("btnDateAll");
      if (btnHoy) btnHoy.classList.remove("active");
      if (btnManana) btnManana.classList.remove("active");
      if (btnAll) btnAll.classList.remove("active");

      const hoyStr = getTodayDateStr();
      const mananaStr = getTomorrowDateStr();
      if (fecha === hoyStr && btnHoy) btnHoy.classList.add("active");
      else if (fecha === mananaStr && btnManana) btnManana.classList.add("active");

      renderizarPacientesCitados();
    }

    function formatSpanishDate(dateStr) {
      if (!dateStr || dateStr === 'all') return "--";
      try {
        const parts = dateStr.split('-');
        if (parts.length === 3) {
          return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return dateStr;
      } catch (e) {
        return dateStr;
      }
    }

    function renderizarPacientesCitados() {
      const container = document.getElementById("citadosContainer");
      if (!container) return;

      const lblFormatted = document.getElementById("lblDateFormatted");
      const badgeCount = document.getElementById("badgeCitadosCount");

      // Filtrar según selectedCitadosDate
      let filtrados = [];
      if (selectedCitadosDate === 'all') {
        filtrados = scheduledPatients.filter(p => (p["Fecha Cita Asignada"] || p.appointmentDate));
        if (lblFormatted) lblFormatted.textContent = "Todas las Citas Registradas";
      } else {
        filtrados = scheduledPatients.filter(p => {
          const f = (p["Fecha Cita Asignada"] || p.appointmentDate || "").trim();
          return f === selectedCitadosDate || f.startsWith(selectedCitadosDate);
        });
        if (lblFormatted) {
          const hoyStr = getTodayDateStr();
          const mananaStr = getTomorrowDateStr();
          if (selectedCitadosDate === hoyStr) {
            lblFormatted.textContent = `Hoy (${formatSpanishDate(selectedCitadosDate)})`;
          } else if (selectedCitadosDate === mananaStr) {
            lblFormatted.textContent = `Mañana (${formatSpanishDate(selectedCitadosDate)})`;
          } else {
            lblFormatted.textContent = formatSpanishDate(selectedCitadosDate);
          }
        }
      }

      // Ordenar por hora de cita
      filtrados.sort((a, b) => {
        const horaA = a["Hora Cita Asignada"] || a.appointmentTime || "";
        const horaB = b["Hora Cita Asignada"] || b.appointmentTime || "";
        return horaA.localeCompare(horaB);
      });

      if (badgeCount) {
        badgeCount.textContent = `${filtrados.length} ${filtrados.length === 1 ? 'paciente citado' : 'pacientes citados'}`;
      }

      if (filtrados.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>
            <p>No se encontraron pacientes citados para la fecha seleccionada (${formatSpanishDate(selectedCitadosDate)}).</p>
            <div style="margin-top: 1rem; display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
              <button type="button" class="quick-date-btn" onclick="setCitadosDateQuick('today')">Ver citas de Hoy</button>
              <button type="button" class="quick-date-btn" onclick="setCitadosDateQuick('tomorrow')">Ver citas de Mañana</button>
              <button type="button" class="quick-date-btn" onclick="setCitadosDateQuick('all')">Ver todas las fechas</button>
            </div>
          </div>
        `;
        return;
      }

      container.innerHTML = filtrados.map(p => generarTarjetaCitadoHTML(p)).join("");
    }

    function generarTarjetaCitadoHTML(p) {
      const subId = p["Submission ID"] || p.id || "sub_000";
      const nombre = p["Nombre del Paciente"] || p["Nombre y Apellidos"] || p.patientName || "Paciente";
      const nhc = p["NHC / Historia Clínica"] || p.nhc || "NHC-N/D";
      const hora = p["Hora Cita Asignada"] || p.appointmentTime || "Turno asignado";
      const fechaCita = p["Fecha Cita Asignada"] || p.appointmentDate || "--";
      const estudio = p["Tipo de Estudio PET Solicitado"] || p.studyType || "18F-FDG";
      const prioridad = p["Prioridad Calculada"] || p["Carácter de la Petición"] || p.priority || "🟢 P3";
      const medico = p["Médico Solicitante"] || p.docName || "Facultativo Solicitante";
      const servicio = p["Servicio Solicitante"] || p.service || "Oncología";
      const diag = p["Diagnóstico Clínico"] || p.diagnosis || p["Motivo de Solicitud"] || "Sospecha oncológica";
      const edad = p["Edad"] || p.age || "--";
      const peso = p["Peso (kg)"] || p.weight || "--";
      const diabetes = p["¿Tiene Diabetes Mellitus?"] || p.diabetes || "No";
      const glucemia = p["Glucemia (mg/dL)"] || p.glucose || "--";
      const alertas = p["Alertas Técnicas"] || p.alerts || "Ninguna";
      const inicial = nombre.charAt(0).toUpperCase();

      let pClass = "p3";
      let priorityBadgeClass = "priority-badge-p3";
      if (prioridad.includes("P1") || prioridad.includes("🔴")) {
        pClass = "p1";
        priorityBadgeClass = "priority-badge-p1";
      } else if (prioridad.includes("P2") || prioridad.includes("🟡")) {
        pClass = "p2";
        priorityBadgeClass = "priority-badge-p2";
      }

      const esDiabetico = String(diabetes).toLowerCase().includes("s") || String(diabetes).toLowerCase().includes("y");
      const glucemiaCritica = parseInt(glucemia) >= 200;

      return `
        <article class="scheduled-card ${pClass}" id="card-scheduled-${subId}">
          <div class="scheduled-header">
            <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
              <span class="time-badge">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                <span>${escapeHTML(hora)}</span>
              </span>
              <span class="study-badge">☢️ ${escapeHTML(estudio)}</span>
              <span class="${priorityBadgeClass}">${escapeHTML(prioridad)}</span>
            </div>
            <span style="font-size: 0.78rem; color: #64748b; font-weight: 700;">ID: ${escapeHTML(subId)}</span>
          </div>

          <div class="scheduled-patient-info">
            <div class="patient-avatar-blue">${inicial}</div>
            <div style="flex: 1;">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 0.4rem;">
                <h4 style="margin: 0; font-size: 1.12rem; color: var(--sergas-navy); font-weight: 800;">${escapeHTML(nombre)}</h4>
                <span style="font-size: 0.85rem; font-weight: 800; color: #0284c7; background: #e0f2fe; padding: 0.15rem 0.55rem; border-radius: 6px;">${escapeHTML(nhc)}</span>
              </div>
              <div style="font-size: 0.82rem; color: #64748b; margin-top: 3px;">
                Edad: <strong>${escapeHTML(edad)} años</strong> | Peso: <strong>${escapeHTML(peso)} kg</strong> | Prescriptor: <strong>${escapeHTML(medico)}</strong> (${escapeHTML(servicio)})
              </div>
            </div>
          </div>

          <div class="patient-details-grid">
            <div>
              <div class="detail-item-label">Diagnóstico Clínico:</div>
              <div class="detail-item-val">${escapeHTML(diag)}</div>
            </div>
            <div>
              <div class="detail-item-label">Control Glucémico:</div>
              <div class="detail-item-val" style="color: ${glucemiaCritica ? '#dc2626' : (esDiabetico ? '#d97706' : '#15803d')};">
                ${esDiabetico ? '⚠️ Diabético' : 'No Diabético'} · ${glucemia ? `${escapeHTML(glucemia)} mg/dL` : 'No registrada'}
              </div>
            </div>
            <div>
              <div class="detail-item-label">Fecha de Cita:</div>
              <div class="detail-item-val">📅 ${formatSpanishDate(fechaCita)}</div>
            </div>
            <div>
              <div class="detail-item-label">Alertas Técnicas:</div>
              <div class="detail-item-val" style="color: ${alertas !== 'Ninguna' ? '#b91c1c' : '#64748b'};">
                ${escapeHTML(alertas)}
              </div>
            </div>
          </div>

          <div class="scheduled-actions-row">
            <button type="button" class="btn-view-volante" onclick="verVolantePaciente('${subId}')" title="Abrir y revisar el volante oficial de petición">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
              <span>Ver Volante de Petición</span>
            </button>
            <button type="button" class="btn-download-volante" onclick="descargarVolantePaciente('${subId}')" title="Descargar o imprimir directamente el volante en PDF">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
              <span>Descargar Volante (PDF)</span>
            </button>
          </div>
        </article>
      `;
    }

    /* --------------------------------------------------------------------------
       5.2. MODAL Y DESCARGA EN PDF DEL VOLANTE OFICIAL DE PETICIÓN
       -------------------------------------------------------------------------- */
    function findScheduledPatient(subId) {
      if (!subId) return null;
      const clean = String(subId).trim();
      const stripped = clean.replace('sub_', '').replace('REQ-', '');
      return scheduledPatients.find(item => {
        if (!item) return false;
        const id1 = String(item["Submission ID"] || item.id || '');
        const nhc1 = String(item["NHC / Historia Clínica"] || item.nhc || '');
        return id1 === clean || id1.includes(stripped) || nhc1 === clean || nhc1.includes(stripped);
      }) || (scheduledPatients.length > 0 ? scheduledPatients[0] : null);
    }

    function generatePatientVolanteHtmlEnf(p, autoPrint = true) {
      if (!p) return '';
      const subId = p["Submission ID"] || p.id || "sub_0000";
      const idClean = String(subId).replace("sub_", "").replace("REQ-", "");
      const nombre = p["Nombre del Paciente"] || p["Nombre y Apellidos"] || p.patientName || "--";
      const nhc = p["NHC / Historia Clínica"] || p.nhc || "--";
      const edad = p["Edad"] || p.age || "--";
      const sexo = p["Sexo"] || p.sex || "No especificado";
      const peso = p["Peso (kg)"] || p.weight || "--";
      const talla = p["Talla (cm)"] || p.height || "--";
      const movilidad = p["Movilidad / Traslado"] || p.mobility || "Autónomo";
      const sedacion = p["¿Precisa sedación?"] || p.sedation || "No";
      const diabetes = p["¿Tiene Diabetes Mellitus?"] || p.diabetes || "No";
      const glucemia = p["Glucemia (mg/dL)"] || p.glucose || "No registrada";
      const ingresado = p["¿El paciente está ingresado?"] || p.inpatient || "No (Ambulatorio)";

      const medico = p["Médico Solicitante"] || p.docName || "--";
      const servicio = p["Servicio Solicitante"] || p.service || "--";
      const proxConsulta = p["Fecha Próxima Consulta"] || p.nextVisit || "--";
      const fechaSol = p["Fecha Solicitud"] || p.date || p["Fecha Cita Asignada"] || "--";

      const estudio = p["Tipo de Estudio PET Solicitado"] || p.studyType || "18F-FDG (Oncológico / Inflamatorio General)";
      const prioridad = p["Carácter de la Petición"] || p["Prioridad Calculada"] || p.priority || "--";
      const diag = p["Diagnóstico Clínico"] || p.diagnosis || p["Motivo de Solicitud"] || "--";
      const resumen = p["Resumen Clínico"] || p.summary || "Sin observaciones adicionales.";

      const alergias = p["Alergias Conocidas"] || p.allergies || "Ninguna";
      const contraste = p["Contraindicación Contraste"] || p.contrastContra || "No";
      const metal = p["Portador Objetos Metálicos"] || p.metalObjects || "No";
      const alertas = p["Alertas Técnicas"] || p.technicalAlerts || "Ninguna";

      const fechaCita = p["Fecha Cita Asignada"] || p.appointmentDate || "--";
      const horaCita = p["Hora Cita Asignada"] || p.appointmentTime || "--";

      return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Volante Oficial PET/CT - ${escapeHTML(nombre)} (${escapeHTML(nhc)})</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 14mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #0f172a; background: #f1f5f9; margin: 0; padding: 18px; }
    .action-bar { max-width: 900px; margin: 0 auto 15px auto; display: flex; justify-content: space-between; align-items: center; background: #004868; color: white; padding: 10px 18px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 72, 104, 0.25); }
    .action-bar button { padding: 8px 16px; font-weight: 700; border-radius: 6px; cursor: pointer; font-size: 13px; border: none; display: inline-flex; align-items: center; gap: 6px; }
    .btn-print { background: #007eb4; color: white; }
    .btn-close { background: #475569; color: white; }
    .official-sheet { max-width: 900px; margin: 0 auto; background: #ffffff; border: 2px solid #004868; border-radius: 8px; padding: 24px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
    .sheet-header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #004868; padding-bottom: 14px; margin-bottom: 16px; }
    .sheet-hospital-info { display: flex; align-items: center; gap: 14px; }
    .sheet-hospital-info img { height: 52px; object-fit: contain; }
    .sheet-hospital-info h2 { margin: 0; font-size: 15px; color: #004868; font-weight: 800; }
    .sheet-hospital-info p { margin: 2px 0 0 0; font-size: 11px; color: #475569; font-weight: 600; }
    .sheet-doc-title-badge { display: inline-block; margin-top: 5px; background: #e0f2fe; color: #0369a1; font-weight: 800; font-size: 11px; padding: 3px 10px; border-radius: 4px; }
    .sheet-barcode-box { text-align: right; font-family: monospace; }
    .barcode-sim { font-size: 18px; letter-spacing: 3px; color: #004868; font-weight: bold; }
    .sheet-sub-code { font-size: 11px; color: #64748b; margin-top: 2px; font-weight: bold; }
    .sheet-section { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 12px 14px; margin-bottom: 12px; }
    .sheet-section-title { font-size: 12px; font-weight: 800; color: #004868; text-transform: uppercase; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; margin-bottom: 10px; }
    .sheet-grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 14px; }
    .sheet-grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px 14px; }
    .sheet-field { font-size: 12px; }
    .sheet-field label { display: block; font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
    .sheet-field span { font-weight: 700; color: #0f172a; }
    .sheet-signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 18px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
    .signature-box { border: 1px dashed #94a3b8; border-radius: 6px; padding: 12px; text-align: center; min-height: 85px; background: #fafafa; }
    .signature-box p { margin: 0; font-size: 10px; color: #64748b; font-weight: bold; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .action-bar { display: none !important; }
      .official-sheet { border: 1.5px solid #004868; box-shadow: none; padding: 15px; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="action-bar">
    <div style="display: flex; align-items: center; gap: 8px;">
      <span style="font-size: 18px;">🏥</span>
      <div><strong style="font-size: 13px;">Volante Oficial de Petición Médica PET / CT</strong> <span style="font-size: 11px; opacity: 0.85; margin-left: 6px;">SERGAS · Galaria</span></div>
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
      <div class="sheet-grid-2">
        <div class="sheet-field"><label>Tipo de Estudio / Radiofármaco:</label> <span style="color: #004868; font-size: 13px;">${escapeHTML(estudio)}</span></div>
        <div class="sheet-field"><label>Prioridad Asignada:</label> <span>${escapeHTML(prioridad)}</span></div>
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
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 400);
    };
  