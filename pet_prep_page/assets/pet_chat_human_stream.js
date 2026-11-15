/**
 * MOTOR UNIVERSAL DE CHATBOT CLÍNICO HUMANO, PERSONALIZADO Y STREAMING PROGRESSIVO (TYPEWRITER)
 * Ecosistema Dixital PET/CT · Galaria · Servizo Galego de Saúde (SERGAS)
 *
 * Características:
 * 1. Respostas humanas, cálidas, empáticas e clinicamente rigorosas.
 * 2. Personalización automática co nome do paciente, hora da cita, data e localización (Hospital Meixoeiro, Planta -1).
 * 3. Efecto de escritura progresiva fluída (typewriter streaming) palabra a palabra / token a token.
 * 4. Desprazamento suave automático durante a escritura.
 * 5. Compatibilidade con tódolos módulos e audioguías PET/CT (FDG, PSMA, Colina, DOTA, etc.).
 */

(function () {
  'use strict';

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  // Cargar automáticamente o Motor Semántico Intelixente v2.1 se aínda non está cargado na páxina
  if (!window.PET_CHATBOT_SEMANTIC_ENGINE && !document.querySelector('script[src*="chatbot_semantic_engine.js"]')) {
    const semScript = document.createElement('script');
    semScript.src = 'chatbot_semantic_engine.js';
    semScript.async = false;
    (document.head || document.documentElement).appendChild(semScript);
  }

  // ==========================================================================
  // 1. ESTILOS VISUAIS PARA O CURSOR DE ESCRITURA E ACCIÓNS
  // ==========================================================================
  const STYLE_ID = 'pet-chatbot-human-stream-styles';
  if (!document.getElementById(STYLE_ID)) {
    const styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    styleEl.textContent = `
      .bot-typing-cursor {
        display: inline-block;
        margin-left: 4px;
        color: var(--sergas-blue, #007eb4);
        font-weight: 800;
        animation: petPulseCursor 0.75s infinite ease-in-out;
        user-select: none;
      }
      @keyframes petPulseCursor {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.2; transform: scale(0.85); }
      }
      .chat-input:disabled,
      .chat-input.typing-blocked {
        background-color: #f8fafc !important;
        cursor: not-allowed;
      }
      .chat-msg-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        animation: petFadeInActions 0.3s ease-out;
      }
      @keyframes petFadeInActions {
        from { opacity: 0; transform: translateY(4px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .bot-speak-btn {
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        color: #334155;
        font-size: 0.75rem;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      .bot-speak-btn:hover {
        background: #e2e8f0;
        color: #0f172a;
      }
      .bot-speak-btn.speaking {
        background: #fee2e2;
        border-color: #fca5a5;
        color: #b91c1c;
      }
    `;
    document.head.appendChild(styleEl);
  }

  // ==========================================================================
  // 2. RESOLVER INFORMACIÓN PERSOALIZADA DO PACIENTE
  // ==========================================================================
  function getPatientHumanInfo() {
    let fullName = "";
    let nhc = "";
    let fecha = "";
    let hora = "";

    // 1. Intentar resolver dende resolveCitedPatient() (consola / BD compartida)
    try {
      if (typeof window.resolveCitedPatient === "function") {
        const p = window.resolveCitedPatient();
        if (p) {
          fullName = p.nombre || p.name || "";
          nhc = p.nhc || "";
          fecha = p.fecha || p.fechaCita || "";
          hora = p.hora || p.horaCita || "";
        }
      }
    } catch (e) {}

    // 2. Parámetros de URL
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (!fullName) fullName = urlParams.get("nombre") || urlParams.get("name") || urlParams.get("paciente") || "";
      if (!nhc) nhc = urlParams.get("nhc") || urlParams.get("historia") || urlParams.get("id") || "";
      if (!fecha) fecha = urlParams.get("fecha") || urlParams.get("cita") || "";
      if (!hora) hora = urlParams.get("hora") || "";
    } catch (e) {}

    // 3. Storage
    try {
      if (!fullName) fullName = sessionStorage.getItem("pet_patient_name") || localStorage.getItem("pet_patient_name") || "";
      if (!nhc) nhc = sessionStorage.getItem("pet_patient_nhc") || localStorage.getItem("pet_patient_nhc") || "";
      if (!fecha) fecha = sessionStorage.getItem("pet_patient_fecha") || localStorage.getItem("pet_patient_fecha") || "";
      if (!hora) hora = sessionStorage.getItem("pet_patient_hora") || localStorage.getItem("pet_patient_hora") || "";
    } catch (e) {}

    // 4. Fallback DOM display
    if (!fullName) {
      const domName = document.getElementById("display-patient-name") || document.getElementById("patientNameDisplay") || document.getElementById("patNameDisplay");
      if (domName && domName.textContent) {
        const t = domName.textContent.trim();
        if (!t.toLowerCase().includes("cargando") && !t.toLowerCase().includes("paciente citado")) {
          fullName = t;
        }
      }
    }

    if (!hora || hora === "Confirmar") hora = "08:20";

    // Extraer o primeiro nome para chamarlle polo seu nome de forma cálida e humana
    let firstName = "";
    if (fullName) {
      const parts = fullName.split(/\s+/).filter(Boolean);
      if (parts.length > 0) {
        const first = parts[0].toLowerCase();
        if (!["paciente", "cargando...", "nhc", "don", "doña", "d.", "dña."].includes(first)) {
          firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        }
      }
    }

    return {
      fullName: fullName || "Paciente Citado",
      firstName: firstName,
      nhc: nhc,
      fecha: fecha,
      hora: hora,
      hospital: "Hospital Meixoeiro",
      planta: "Planta -1, ao carón de Medicina Nuclear (PET-CT)"
    };
  }

  // ==========================================================================
  // 3. HUMANIZACIÓN E PERSONALIZACIÓN DE RESPOSTAS
  // ==========================================================================
  // ==========================================================================
  // 2b. PERSISTENCIA COMPARTIDA DE DUDAS PARA CONSOLA DE ENFERMERÍA
  // ==========================================================================
  function saveDoubtToNursingStorage(doubtData) {
    try {
      const key = 'PET_SHARED_NURSING_DOUBTS_V1';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const arr = Array.isArray(existing) ? existing : [];
      const pat = getPatientHumanInfo();
      const now = new Date();
      const horaStr = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      const record = Object.assign({
        id: Date.now(),
        origen: 'DUDAS_UNIDAD_ENFERMERIA',
        nivel: 'DUDA_LLAMADA_PACIENTE',
        fecha_hora: `Hoy ${horaStr}`,
        paciente_nombre: pat.fullName || 'Paciente Citado',
        paciente_nhc: pat.nhc || '',
        paciente_telefono: doubtData.paciente_telefono || 'Consultar ficha / NHC',
        modo_envio: doubtData.modo_envio || 'chatbot',
        mensaje_alerta: doubtData.mensaje_alerta || doubtData.mensaje_escrito || ''
      }, doubtData);

      arr.unshift(record);
      localStorage.setItem(key, JSON.stringify(arr.slice(0, 100)));
      return record;
    } catch (e) {
      console.warn('Error guardando duda en localStorage:', e);
      return null;
    }
  }

  function sendDoubtFromChat(encodedQuery, btnEl) {
    let queryText = '';
    try {
      queryText = decodeURIComponent(encodedQuery || '');
    } catch (e) {
      queryText = encodedQuery || '';
    }
    const pat = getPatientHumanInfo();
    const cleanQ = queryText.trim() || 'Consulta clínica desde el asistente virtual';

    const payload = {
      origen: 'DUDAS_UNIDAD_ENFERMERIA',
      nivel: 'DUDA_LLAMADA_PACIENTE',
      fecha_hora: `Hoy ${new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`,
      paciente_nombre: pat.fullName + (pat.nhc ? ` (NHC: ${pat.nhc})` : ''),
      paciente_telefono: pat.nhc ? `NHC: ${pat.nhc}` : 'Ver ficha de cita',
      modo_envio: 'chatbot',
      mensaje_escrito: cleanQ,
      mensaje_alerta: `💬 [Duda Chatbot - ${document.title.split('|')[0].trim()}] "${cleanQ}"`
    };

    saveDoubtToNursingStorage(payload);

    if (typeof window.sendToDatabase === 'function') {
      try { window.sendToDatabase(payload); } catch (e) {}
    }

    if (btnEl) {
      btnEl.disabled = true;
      btnEl.style.background = '#16a34a';
      btnEl.style.borderColor = '#16a34a';
      btnEl.style.color = '#ffffff';
      btnEl.style.cursor = 'default';
      btnEl.innerHTML = '✅ Enviada a la Consola de Enfermería';
    }
  }

  window.petSendChatDoubtToNursing = sendDoubtFromChat;

  function humanizeResponse(rawAnswer, queryText) {
    if (!rawAnswer) return rawAnswer;
    const pat = getPatientHumanInfo();
    const qLower = (queryText || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    let enriched = rawAnswer;
    const isFallbackUnknown = enriched.includes("No dispongo de una respuesta") || enriched.includes("BOTON_ENVIAR_ENFERMERIA");
    const hasHtmlTags = /<[a-z][\s\S]*>/i.test(enriched);

    // Se temos o primeiro nome do paciente e a resposta non o contén, personalizar o comezo
    if (pat.firstName && !enriched.includes(pat.firstName) && !isFallbackUnknown && !hasHtmlTags) {
      const isGreeting = /\b(hola|buenos|buenas|saludos)\b/.test(qLower) || qLower.includes("que tal");
      const isWorry = qLower.includes("miedo") || qLower.includes("preocup") || qLower.includes("asust") || qLower.includes("ansied") || qLower.includes("claustro");
      const isWater = qLower.includes("agua") || /\b(beber|bebo)\b/.test(qLower);
      const isFood = /\b(comer|ayuno|ayunas|xaxun|desayun|cenar)\b/.test(qLower);

      if (isGreeting) {
        enriched = `👋 ¡Hola **${pat.firstName}**! Qué alegría saludarte. ` + enriched.replace(/^👋\s*¡?Hola!?[^.]*\.\s*/i, "");
      } else if (isWorry) {
        enriched = `Tranquilo/a **${pat.firstName}**, comprendo perfectamente que te preocupe. ` + enriched;
      } else if (isWater || isFood) {
        enriched = `Mira **${pat.firstName}**, te explico con detalle: ` + enriched;
      } else if (!enriched.startsWith("📍") && !enriched.startsWith("🚨") && !enriched.startsWith("👋")) {
        enriched = `Hola **${pat.firstName}**, ` + enriched;
      }
    }

    // Se pregunta por lugar ou hora exacta (evitando falsos positivos como "ahora"), asegurar datos da cita
    if (!isFallbackUnknown && (/\b(donde|lugar|hospital|meixoeiro|ubicacion|horario)\b/.test(qLower) || /\b(a que hora|que hora|hora es|hora tengo|mi cita)\b/.test(qLower))) {
      const citeStr = `Estás citado/a ás **${pat.hora} h**${pat.fecha ? ` o día **${pat.fecha}**` : ''} no **Hospital Meixoeiro**, na **Planta -1 (Medicina Nuclear)**.`;
      if (!enriched.includes(pat.hora)) {
        enriched += hasHtmlTags ? `<br><br>🕒 <strong>Recordatorio persoal</strong>: ${citeStr.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}` : `\n\n🕒 **Recordatorio persoal**: ${citeStr}`;
      }
    }

    return enriched;
  }

  // ==========================================================================
  // 4. FORMATEADOR DE MARKDOWN A HTML SEGURO
  // ==========================================================================
  function formatMarkdown(text) {
    if (!text) return "";
    const looksLikeHtml = /<(p|div|strong|em|ul|ol|li|br|a|span|button)\b/i.test(text);
    let html = looksLikeHtml ? text : text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    html = html
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code style="background: rgba(0, 126, 180, 0.08); padding: 1px 6px; border-radius: 4px; font-family: monospace; font-size: 0.88em; color: var(--sergas-navy, #004868); font-weight: 600;">$1</code>');

    if (!looksLikeHtml) {
      html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    }

    html = html
      .replace(/\[CONFIRMA_UNIDAD\]/g, '<a href="#" onclick="if(typeof abrirModalConsultaEnfermeria===\'function\'){abrirModalConsultaEnfermeria();} return false;" style="color: var(--sergas-blue, #007eb4); font-weight: 700; text-decoration: underline; cursor: pointer;">consulta directa con enfermería</a>')
      .replace(/\[ABRIR_CANCELACION\]/g, '<a href="#cancelHeaderTrigger" onclick="if(typeof toggleCancelAccordion===\'function\'){toggleCancelAccordion(true);} return false;" style="display: inline-block; margin-top: 6px; background: rgba(220, 38, 38, 0.08); color: #dc2626; border: 1px solid rgba(220, 38, 38, 0.3); padding: 5px 12px; border-radius: 6px; font-weight: 700; text-decoration: none; cursor: pointer;">🚫 Abrir lapela de cancelación</a>')
      .replace(/\[CONFIG_TEL\]/g, `<a href="tel:986812100" style="color: var(--sergas-blue, #007eb4); font-weight: 700;">986 81 21 00</a>`)
      .replace(/\[BOTON_ENVIAR_ENFERMERIA:([^\]]+)\]/g, (_, encodedQ) => {
        const safeQ = String(encodedQ).replace(/'/g, "%27");
        return `<button type="button" onclick="window.petSendChatDoubtToNursing('${safeQ}', this)" style="display:inline-flex; align-items:center; gap:6px; margin-top:8px; background:#007eb4; color:#ffffff; border:1px solid #005b82; padding:8px 14px; border-radius:8px; font-weight:700; font-size:0.84rem; cursor:pointer; box-shadow:0 2px 6px rgba(0,126,180,0.2);">📩 Enviar duda directamente a Enfermería</button>`;
      });
    return html;
  }

  // ==========================================================================
  // 5. MOTOR DE ESCRITURA PROGRESIVA FLUIDA (TYPEWRITER STREAMING)
  // ==========================================================================
  function streamTypewriter(container, formattedHtml, options = {}) {
    return new Promise((resolve) => {
      if (!container) {
        resolve(null);
        return;
      }

      const speedMs = options.speedMs || 18; // Milisegundos por paso
      const chunkSize = options.chunkSize || 2; // Tokens por paso
      const isVoiceAutoPlay = options.isVoiceAutoPlay || (typeof localStorage !== 'undefined' && localStorage.getItem("pet_chat_voice") === "true");

      window.isBotTyping = true;

      // Desactivar temporalmente o input mentres escribe para evitar solapamentos
      const chatInput = document.getElementById("chatInput");
      const oldPlaceholder = chatInput ? chatInput.placeholder : "";
      if (chatInput) {
        chatInput.classList.add("typing-blocked");
        chatInput.placeholder = "✍️ O asistente de enfermaría está escribindo a túa resposta...";
      }

      // Detectar estrutura do contedor (dynamicChatFlow vs chatMessages)
      let botMsgDiv;
      let targetContentEl;
      let actionsWrap;

      if (options.existingElement) {
        botMsgDiv = options.existingElement;
        targetContentEl = botMsgDiv.querySelector(".bot-content") || botMsgDiv.querySelector("span") || botMsgDiv;
      } else {
        // Crear elemento de mensaxe
        botMsgDiv = document.createElement("div");
        if (container.id === "dynamicChatFlow") {
          botMsgDiv.className = "message message-bot";
          botMsgDiv.innerHTML = `
            <div class="bot-author-tag">
              <img src="galaria_logo.jpg" alt="Galaria" class="bot-badge-icon" style="width: 15px; height: 15px; border-radius: 50%; object-fit: contain; vertical-align: middle;">
              <span>Enfermaría Galaria · SERGAS</span>
            </div>
            <div class="bot-content"></div>
            <div class="chat-msg-actions" style="display: none;">
              <button type="button" class="bot-speak-btn" onclick="if(typeof speakMessageBubble==='function'){speakMessageBubble(this);}" title="Escoitar resposta en voz alta">🔊 Escoitar</button>
            </div>
          `;
          targetContentEl = botMsgDiv.querySelector(".bot-content");
          actionsWrap = botMsgDiv.querySelector(".chat-msg-actions");
        } else {
          // Estrutura estándar tipo chat-msg bot
          botMsgDiv.className = "chat-msg bot";
          botMsgDiv.innerHTML = `
            <div class="bot-author-tag" style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 700; color: #007eb4; margin-bottom: 4px;">
              <img src="galaria_logo.jpg" alt="Galaria" style="width: 14px; height: 14px; border-radius: 50%; object-fit: contain;">
              <span>Enfermaría Galaria · SERGAS</span>
            </div>
            <span class="bot-body-text"></span>
            <div class="chat-msg-actions" style="display: none;">
              <button type="button" class="bot-speak-btn" onclick="if(typeof speakMessageBubble==='function'){speakMessageBubble(this);}" title="Escoitar resposta en voz alta">🔊 Escoitar</button>
            </div>
          `;
          targetContentEl = botMsgDiv.querySelector(".bot-body-text");
          actionsWrap = botMsgDiv.querySelector(".chat-msg-actions");
        }
        container.appendChild(botMsgDiv);
      }

      // Cursor de escritura
      const cursor = document.createElement("span");
      cursor.className = "bot-typing-cursor";
      cursor.textContent = " ✍️";
      targetContentEl.appendChild(cursor);

      // Tokenizar preservando etiquetas HTML completas
      const tokens = formattedHtml.match(/(<[^>]+>|[^<>\s]+|\s+)/g) || [formattedHtml];
      let tokenIndex = 0;
      let accumulatedHtml = "";

      function scrollBottom() {
        const scrollArea = container.closest(".chat-messages") || document.getElementById("chatMessages") || container;
        if (scrollArea) {
          scrollArea.scrollTop = scrollArea.scrollHeight;
        }
      }

      scrollBottom();

      function step() {
        for (let c = 0; c < chunkSize && tokenIndex < tokens.length; c++, tokenIndex++) {
          accumulatedHtml += tokens[tokenIndex];
        }

        targetContentEl.innerHTML = accumulatedHtml;
        targetContentEl.appendChild(cursor);
        scrollBottom();

        if (tokenIndex < tokens.length) {
          setTimeout(step, speedMs);
        } else {
          // Rematou a escritura
          cursor.remove();
          window.isBotTyping = false;

          if (actionsWrap) {
            actionsWrap.style.display = "flex";
          }

          // Restaurar input
          if (chatInput) {
            chatInput.classList.remove("typing-blocked");
            chatInput.placeholder = oldPlaceholder || "Escribe a túa dúbida sobre o PET...";
            chatInput.focus();
          }

          // Renderizar chips de suxestión se veñen nas opcións
          if (options.suggestions && options.suggestions.length > 0) {
            const sugContainer = document.createElement("div");
            sugContainer.className = "chat-suggestions";
            sugContainer.style.cssText = "display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px;";
            options.suggestions.forEach(item => {
              const chip = document.createElement("button");
              chip.type = "button";
              chip.className = "chat-suggestion-chip";
              chip.style.cssText = "background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 14px; padding: 4px 10px; font-size: 0.78rem; font-weight: 600; color: #004868; cursor: pointer;";
              chip.textContent = item.label || item;
              chip.onclick = () => {
                const inp = document.getElementById("chatInput");
                if (inp) {
                  inp.value = item.query || item.label || item;
                  if (typeof window.handleSendChatMessage === "function") {
                    window.handleSendChatMessage();
                  } else if (typeof window.processUserMessage === "function") {
                    const q = inp.value.trim();
                    inp.value = "";
                    window.processUserMessage(q);
                  }
                }
              };
              sugContainer.appendChild(chip);
            });
            botMsgDiv.appendChild(sugContainer);
            scrollBottom();
          }

          // Reproducir voz se está activado
          if (isVoiceAutoPlay && typeof window.speakMessageBubble === "function") {
            const spkBtn = botMsgDiv.querySelector(".bot-speak-btn");
            if (spkBtn) {
              setTimeout(() => window.speakMessageBubble(spkBtn), 300);
            }
          }

          resolve(botMsgDiv);
        }
      }

      // Pequeno retardo natural antes de comezar a pulsar teclas (200ms)
      setTimeout(step, 200);
    });
  }

  // ==========================================================================
  // 6. ENLACE UNIVERSAL CON OS CHATBOTS DO SISTEMA
  // ==========================================================================
  function patchUniversalChatbot() {
    // 1. Sobrescribir ou envolver processUserMessage se existe
    if (typeof window.processUserMessage === "function" && !window.processUserMessage._isHumanPatched) {
      const originalProcess = window.processUserMessage;
      
      const patchedProcess = async function (rawText) {
        if (! rawText || !rawText.trim()) return;
        const text = rawText.trim();

        const flow = document.getElementById("dynamicChatFlow") || document.getElementById("chatMessages");
        if (typeof window.createMessageElement === "function" && flow) {
          const userMsg = window.createMessageElement(text, "user");
          flow.appendChild(userMsg);
        } else if (typeof window.appendChatMessage === "function") {
          window.appendChatMessage(text, "user");
        }

        const scrollArea = document.getElementById("chatMessages") || flow;
        if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;

        try { if (typeof window.stopChatSpeechRecognition === "function") window.stopChatSpeechRecognition(); } catch(e){}
        if (window.speechSynthesis) {
          try { window.speechSynthesis.cancel(); } catch(e){}
        }

        if (window.chatConversationHistory && Array.isArray(window.chatConversationHistory)) {
          window.chatConversationHistory.push({ role: "user", content: text });
        }

        // Alerta de urxencia vital (dor de peito / asfixia)
        const qLow = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (qLow.includes("dolor de pecho") || qLow.includes("falta de aire") || qLow.includes("asfixia") || qLow.includes("desmayo") || qLow.includes("mareo intenso")) {
          if (typeof window.showTyping === "function") window.showTyping(true);
          setTimeout(() => {
            if (typeof window.showTyping === "function") window.showTyping(false);
            const alertHtml = `🚨 <strong>ALERTA MÉDICA URXENTE</strong>: Se experimentas dor no peito, sensación de asfixia ou mareo intenso, chama inmediatamente ao <strong>061 / 112</strong> ou acode ao servizo de urxencias hospitalarias máis próximo.`;
            streamTypewriter(flow, alertHtml);
          }, 300);
          return;
        }

        // Amosar indicador de "Escribindo..."
        if (typeof window.showTyping === "function") window.showTyping(true);
        const typingEl = document.getElementById("chatTyping") || document.getElementById("typingIndicator");
        if (typingEl) typingEl.style.display = "flex";

        let answer = "";
        let usedGemini = false;

        // Intentar Gemini se hai API dispoñible (con Blindaxe Clínico RAG Opción C)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2800);

          const hybridCtx = (window.PET_CHATBOT_SEMANTIC_ENGINE && typeof window.PET_CHATBOT_SEMANTIC_ENGINE.buildHybridAiPayload === "function")
            ? window.PET_CHATBOT_SEMANTIC_ENGINE.buildHybridAiPayload(text)
            : {};

          const askRes = await fetch("/api/chat/ask", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: controller.signal,
            body: JSON.stringify({
              message: text,
              study_type: hybridCtx.study_type || window.CURRENT_STUDY_TYPE || "FDG_ONCOLOGICO",
              patient_name: getPatientHumanInfo().firstName,
              patient_hora: getPatientHumanInfo().hora,
              patient_fecha: getPatientHumanInfo().fecha,
              fasting_start_hour: hybridCtx.fasting_start_hour || "",
              semantic_context: hybridCtx.semantic_context || "",
              custom_guideline: hybridCtx.custom_guideline || "",
              history: (window.chatConversationHistory || []).map(h => ({ role: h.role, text: h.content })),
              api_key: typeof window.getLocalGeminiKey === 'function' ? window.getLocalGeminiKey() : ""
            })
          });
          clearTimeout(timeoutId);

          if (askRes.ok) {
            const askData = await askRes.json();
            if (askData.status === "success" && askData.answer) {
              usedGemini = true;
              answer = askData.answer;
              const badgeEl = document.getElementById("chatEngineBadge");
              if (badgeEl) {
                badgeEl.textContent = "✨ Gemini IA";
                badgeEl.className = "chat-engine-badge gemini";
              }
            }
          }
        } catch (err) {}

        // Fallback local do protocolo (priorizando Motor Semántico Intelixente v2.1)
        if (!usedGemini || !answer) {
          if (window.PET_CHATBOT_SEMANTIC_ENGINE && typeof window.PET_CHATBOT_SEMANTIC_ENGINE.buildSmartBotResponse === "function") {
            const smartAns = window.PET_CHATBOT_SEMANTIC_ENGINE.buildSmartBotResponse(text);
            if (smartAns) {
              answer = smartAns;
            }
          }
          if (!answer) {
            if (typeof window.generateBotResponse === "function") {
              const cleanInput = typeof window.normalizeText === 'function' ? window.normalizeText(text) : text.toLowerCase();
              answer = window.generateBotResponse(cleanInput);
            } else if (typeof window.generateOrganicPsmaResponse === "function") {
              const res = window.generateOrganicPsmaResponse(text);
              answer = res.html || res;
            } else if (typeof window.generateOrganicEndocarditisResponse === "function") {
              const res = window.generateOrganicEndocarditisResponse(text);
              answer = res.html || res;
            }
          }
        }

        // Agachar indicador de "Escribindo..." e lanzar streaming progresivo
        if (typeof window.showTyping === "function") window.showTyping(false);
        if (typingEl) typingEl.style.display = "none";

        // Humanizar e personalizar
        const humanized = humanizeResponse(answer, text);
        const formatted = formatMarkdown(humanized);

        if (window.chatConversationHistory && Array.isArray(window.chatConversationHistory)) {
          window.chatConversationHistory.push({ role: "model", content: humanized });
        }

        // Transmisión progresiva palabra por palabra
        await streamTypewriter(flow, formatted);
      };

      patchedProcess._isHumanPatched = true;
      window.processUserMessage = patchedProcess;
    }

    // 2. Sobrescribir ou envolver typeBotMessage / typeBotMessageFDG se existe
    ['typeBotMessage', 'typeBotMessageFDG'].forEach(fnName => {
      if (typeof window[fnName] === "function" && !window[fnName]._isHumanPatched) {
        window[fnName] = function (formattedHtml, suggestions) {
          const flow = document.getElementById("chatMessages") || document.getElementById("dynamicChatFlow");
          const humanized = humanizeResponse(formattedHtml, "");
          return streamTypewriter(flow, humanized, { suggestions: suggestions });
        };
        window[fnName]._isHumanPatched = true;
      }
    });

    // 3. Envolver o saúdo inicial de selectPETTest para que tamén se escriba progresivamente
    if (typeof window.selectPETTest === "function" && !window.selectPETTest._isHumanPatched) {
      const origSelect = window.selectPETTest;
      window.selectPETTest = function (testKey, isAutoLaunch) {
        origSelect.call(this, testKey, isAutoLaunch);

        // Se hai unha primeira mensaxe estática de introdución, convertela en escritura progresiva
        setTimeout(() => {
          const flow = document.getElementById("dynamicChatFlow");
          if (flow && flow.children.length === 1 && flow.firstElementChild.classList.contains("message-bot")) {
            const introMsg = flow.firstElementChild;
            const contentEl = introMsg.querySelector(".bot-content");
            if (contentEl && !contentEl.dataset.streamed) {
              contentEl.dataset.streamed = "true";
              const introHtml = contentEl.innerHTML;
              contentEl.innerHTML = "";
              streamTypewriter(flow, introHtml, { existingElement: introMsg, speedMs: 14 });
            }
          }
        }, 350);
      };
      window.selectPETTest._isHumanPatched = true;
    }

    // 4. Envolver sendToDatabase para gardar tamén en localStorage (Consola de Enfermaría en vivo)
    if (typeof window.sendToDatabase === "function" && !window.sendToDatabase._isHumanPatched) {
      const origSendToDb = window.sendToDatabase;
      window.sendToDatabase = function (payload) {
        if (payload && (payload.origen === "DUDAS_UNIDAD_ENFERMERIA" || payload.nivel === "DUDA_LLAMADA_PACIENTE")) {
          saveDoubtToNursingStorage(payload);
        }
        return origSendToDb.call(this, payload);
      };
      window.sendToDatabase._isHumanPatched = true;
    }

    // 5. Envolver xeradores locais de respostas en tódalas guías para usar o Motor Semántico Intelixente v2.1
    if (typeof window.generateBotResponse === "function" && !window.generateBotResponse._isSemanticPatched) {
      const origGenBot = window.generateBotResponse;
      window.generateBotResponse = function (cleanText) {
        if (window.PET_CHATBOT_SEMANTIC_ENGINE && typeof window.PET_CHATBOT_SEMANTIC_ENGINE.buildSmartBotResponse === "function") {
          const smart = window.PET_CHATBOT_SEMANTIC_ENGINE.buildSmartBotResponse(cleanText);
          if (smart) return smart;
        }
        return origGenBot.call(this, cleanText);
      };
      window.generateBotResponse._isSemanticPatched = true;
    }

    [
      "generateOrganicEndocarditisResponse",
      "generateOrganicVasculitisResponse",
      "generateFDGContrasteResponse",
      "generateOrganicParatiroidesResponse",
      "generateOrganicPsmaResponse",
      "generateGalio68Response"
    ].forEach(fnName => {
      if (typeof window[fnName] === "function" && !window[fnName]._isSemanticPatched) {
        const origSpecFn = window[fnName];
        window[fnName] = function (rawText) {
          if (window.PET_CHATBOT_SEMANTIC_ENGINE && typeof window.PET_CHATBOT_SEMANTIC_ENGINE.buildSmartBotResponse === "function") {
            const smart = window.PET_CHATBOT_SEMANTIC_ENGINE.buildSmartBotResponse(rawText);
            if (smart) {
              return {
                html: formatMarkdown(smart),
                suggestions: [
                  { label: "💧 ¿Puedo beber agua?", query: "¿Puedo beber agua antes de la prueba?" },
                  { label: "💊 ¿Tomo mis pastillas?", query: "¿Puedo tomar mi medicación habitual?" },
                  { label: "📍 ¿Dónde es y dónde aparco?", query: "¿Dónde se hace la prueba y dónde puedo aparcar?" }
                ]
              };
            }
          }
          return origSpecFn.call(this, rawText);
        };
        window[fnName]._isSemanticPatched = true;
      }
    });

    // 6. Interceptar chamadas fetch a /api/chat/ask para inxectar sempre o Blindaxe Clínico (Opción C: Guía + Motor Semántico)
    if (typeof window.fetch === "function" && !window.fetch._isPetAiShieldPatched) {
      const origFetch = window.fetch.bind(window);
      window.fetch = function (input, init) {
        try {
          const urlStr = typeof input === "string" ? input : (input && input.url ? input.url : "");
          if (urlStr.includes("/api/chat/ask") && init && init.body && typeof init.body === "string") {
            const parsedBody = JSON.parse(init.body);
            if (parsedBody && parsedBody.message && window.PET_CHATBOT_SEMANTIC_ENGINE && typeof window.PET_CHATBOT_SEMANTIC_ENGINE.buildHybridAiPayload === "function") {
              const hybrid = window.PET_CHATBOT_SEMANTIC_ENGINE.buildHybridAiPayload(parsedBody.message);
              if (!parsedBody.study_type || parsedBody.study_type === "FDG_ONCOLOGICO") {
                parsedBody.study_type = hybrid.study_type || parsedBody.study_type;
              }
              if (!parsedBody.fasting_start_hour) parsedBody.fasting_start_hour = hybrid.fasting_start_hour || "";
              if (!parsedBody.semantic_context) parsedBody.semantic_context = hybrid.semantic_context || "";
              if (!parsedBody.custom_guideline) parsedBody.custom_guideline = hybrid.custom_guideline || "";
              init = Object.assign({}, init, { body: JSON.stringify(parsedBody) });
            }
          }
        } catch (e) {}
        return origFetch(input, init);
      };
      window.fetch._isPetAiShieldPatched = true;
    }

    // 7. Inxectar visor/editor de Guía Clínica dentro do modal #geminiConfigModal
    injectClinicalGuidelineEditorInModal();
  }

  function injectClinicalGuidelineEditorInModal() {
    const modal = document.getElementById("geminiConfigModal");
    if (!modal || document.getElementById("petClinicalGuidelineBox")) return;
    const modalBox = modal.querySelector(".modal-box") || modal.firstElementChild;
    if (!modalBox) return;

    const statusEl = document.getElementById("geminiKeyStatus");
    const container = document.createElement("div");
    container.id = "petClinicalGuidelineBox";
    container.style.cssText = "margin-bottom:0.9rem; padding:10px 12px; border-radius:10px; background:#f0f9ff; border:1px solid #bae6fd;";

    const profile = (window.PET_CHATBOT_SEMANTIC_ENGINE && typeof window.PET_CHATBOT_SEMANTIC_ENGINE.detectProtocolProfile === "function")
      ? window.PET_CHATBOT_SEMANTIC_ENGINE.detectProtocolProfile()
      : { serverStudyType: "FDG_ONCOLOGICO", title: "PET FDG Oncológico" };
    const defaultType = profile.serverStudyType || "FDG_ONCOLOGICO";

    container.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;gap:6px;flex-wrap:wrap;">
        <label style="font-size:0.8rem;font-weight:800;color:#004868;display:flex;align-items:center;gap:4px;">
          🛡️ Guía Clínica IA (Blindaje Cero Alucinaciones)
        </label>
        <select id="petGuidelineProtocolSelect" style="font-size:0.75rem;padding:3px 6px;border-radius:6px;border:1px solid #93c5fd;color:#004868;font-weight:700;background:#fff;">
          <option value="FDG_ONCOLOGICO">PET FDG Oncológico (No Diabético)</option>
          <option value="FDG_DIABETICO">PET FDG Paciente Diabético</option>
          <option value="FDG_ENDOCARDITIS">PET FDG Endocarditis (16h / Dieta Grasa)</option>
          <option value="FDG_VASCULITIS">PET FDG Vasculitis Grandes Vasos (90 min)</option>
          <option value="FDG_NEUROLOGICO">PET FDG Neurológico / Cerebral</option>
          <option value="FDG_CONTRASTE">PET FDG con Contraste Yodado IV</option>
          <option value="F18_COLINA">PET 18F-Fluorocolina (Próstata/Paratiroides)</option>
          <option value="PSMA">PET PSMA (18F / 68Ga)</option>
          <option value="GA68_DOTATOC">PET 68Ga-DOTATOC (Neuroendocrino)</option>
          <option value="COMUN">Reglas Comunes SERGAS (00_REGLAS_BLINDAJE_COMUN.md)</option>
        </select>
      </div>
      <div style="font-size:0.73rem;color:#0369a1;margin-bottom:6px;line-height:1.35;">
        La IA responderá ciñéndose estrictamente a esta guía oficial (<code>guias_clinicas_ia/</code>) + el dictamen del Motor Semántico v2.1. Si algo no figura aquí, derivará la duda a Enfermería.
      </div>
      <textarea id="petGuidelineTextarea" rows="6" style="width:100%;box-sizing:border-box;font-size:0.76rem;font-family:monospace;padding:8px;border:1px solid #93c5fd;border-radius:6px;background:#ffffff;color:#0f172a;resize:vertical;line-height:1.35;" placeholder="Cargando guía clínica del protocolo..."></textarea>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;gap:8px;">
        <span id="petGuidelineSaveMsg" style="font-size:0.73rem;color:#0284c7;font-weight:600;">Archivo: cargando...</span>
        <button type="button" id="petGuidelineSaveBtn" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:0.75rem;font-weight:700;cursor:pointer;">💾 Guardar Guía Clínica</button>
      </div>
    `;

    if (statusEl && statusEl.parentNode) {
      statusEl.parentNode.insertBefore(container, statusEl);
    } else {
      modalBox.appendChild(container);
    }

    const selectEl = document.getElementById("petGuidelineProtocolSelect");
    const textareaEl = document.getElementById("petGuidelineTextarea");
    const msgEl = document.getElementById("petGuidelineSaveMsg");
    const saveBtn = document.getElementById("petGuidelineSaveBtn");

    if (selectEl) selectEl.value = defaultType;

    async function loadGuidelineForProtocol(st) {
      if (!textareaEl) return;
      msgEl.textContent = "Cargando guía...";
      try {
        const res = await fetch(`/api/chat/guidelines?study_type=${encodeURIComponent(st)}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.content) {
            textareaEl.value = data.content;
            msgEl.textContent = `📄 Activo: guias_clinicas_ia/${data.filename}`;
            return;
          }
        }
      } catch (e) {}
      const localBackup = localStorage.getItem(`PET_CUSTOM_GUIDELINE_${st}`) || "";
      textareaEl.value = localBackup;
      msgEl.textContent = `📄 Protocolo: ${st}`;
    }

    if (selectEl) {
      selectEl.addEventListener("change", () => loadGuidelineForProtocol(selectEl.value));
    }

    if (saveBtn) {
      saveBtn.addEventListener("click", async () => {
        const st = selectEl ? selectEl.value : defaultType;
        const content = textareaEl ? textareaEl.value : "";
        try {
          localStorage.setItem(`PET_CUSTOM_GUIDELINE_${st}`, content);
        } catch (e) {}
        msgEl.textContent = "⏳ Guardando...";
        try {
          const res = await fetch("/api/chat/guidelines", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ study_type: st, content: content })
          });
          if (res.ok) {
            const data = await res.json();
            msgEl.style.color = "#15803d";
            msgEl.textContent = `✅ Guardado en guias_clinicas_ia/${data.filename}`;
            return;
          }
        } catch (e) {}
        msgEl.style.color = "#15803d";
        msgEl.textContent = "✅ Directrices guardadas en memoria local";
      });
    }

    loadGuidelineForProtocol(defaultType);
  }

  // Executar cando o DOM estea listo e tras inicializacións locais
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      setTimeout(patchUniversalChatbot, 200);
      setTimeout(patchUniversalChatbot, 1000);
    });
  } else {
    setTimeout(patchUniversalChatbot, 200);
    setTimeout(patchUniversalChatbot, 1000);
  }

  // Exportar API global
  window.PET_CHAT_HUMAN_ENGINE = {
    getPatientInfo: getPatientHumanInfo,
    humanize: humanizeResponse,
    format: formatMarkdown,
    typewriter: streamTypewriter,
    patch: patchUniversalChatbot
  };

})();
