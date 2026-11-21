/**
 * RadioRisk: Dosis & Dinero - Medicina Nuclear
 * Core Game Mechanics, Radiation Physics & Sound Engine
 */

// ----------------------------------------------------
// 1. AUDIO ENGINE (Web Audio API Geiger Counter & Alarms)
// ----------------------------------------------------
class AudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.geigerInterval = null;
    this.currentDoseRate = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playGeigerClick() {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      // Short click noise
      osc.type = 'square';
      osc.frequency.setValueAtTime(120 + Math.random() * 300, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.015);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.015);
    } catch (e) {
      // Audio context fallback
    }
  }

  playBeep(freq = 880, duration = 0.15) {
    if (!this.ctx || this.isMuted) return;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playMoneySound() {
    this.playBeep(987.77, 0.08);
    setTimeout(() => this.playBeep(1318.51, 0.15), 90);
  }

  playPenaltySound() {
    this.playBeep(300, 0.15);
    setTimeout(() => this.playBeep(220, 0.25), 160);
  }

  updateGeigerRate(doseRateuSvh) {
    this.currentDoseRate = doseRateuSvh;
    if (this.geigerInterval) clearInterval(this.geigerInterval);

    if (doseRateuSvh <= 0.5) return; // Background radiation click very rare

    // Convert dose rate (0 to 500 uSv/h) to click frequency (ms interval)
    // 5 uSv/h -> ~800ms, 200 uSv/h -> ~30ms
    const intervalMs = Math.max(25, Math.min(1000, 40000 / (doseRateuSvh + 10)));

    this.geigerInterval = setInterval(() => {
      if (Math.random() < 0.85) {
        this.playGeigerClick();
      }
    }, intervalMs);
  }

  stopGeiger() {
    if (this.geigerInterval) {
      clearInterval(this.geigerInterval);
      this.geigerInterval = null;
    }
  }
}

const audio = new AudioEngine();

// ----------------------------------------------------
// 2. GAME STATE & CONSTANTS
// ----------------------------------------------------
const PENALTY_PER_USV = 2.0; // 2 € per uSv accumulated

const ROLES = {
  enfermero: {
    id: 'enfermero',
    name: 'Enfermero / a',
    icon: '🩺',
    speed: 3.5,
    patientAffinity: 1.2,
    desc: 'Inyección de radiofármacos PET/Gammagrafía y canalización'
  },
  tecnico: {
    id: 'tecnico',
    name: 'Técnico / a TER',
    icon: '⚛️',
    speed: 3.8,
    patientAffinity: 1.0,
    desc: 'Preparación en celda plomada y centrado en tomógrafo'
  },
  celador: {
    id: 'celador',
    name: 'Celador / a',
    icon: '🛏️',
    speed: 4.2,
    patientAffinity: 1.1,
    desc: 'Traslado de pacientes inyectados en zona caliente'
  }
};

const EPIS = {
  chaleco: { id: 'chaleco', name: 'Chaleco de Plomo', price: 120, attenuation: 0.20, speedMult: 0.90, icon: '🛡️' },
  tiroides: { id: 'tiroides', name: 'Protector Tiroideo', price: 50, attenuation: 0.90, speedMult: 1.0, icon: '🎗️' },
  jeringa: { id: 'jeringa', name: 'Protector de Jeringa', price: 100, attenuation: 0.10, speedMult: 1.0, icon: '💉' },
  mampara: { id: 'mampara', name: 'Mampara Móvil', price: 180, attenuation: 0.05, speedMult: 1.0, icon: '🧱' }
};

const SCENARIOS = [
  {
    id: 1,
    title: 'Escenario 1: Inyección de 18F-FDG (PET-CT)',
    radionuclide: '18F-FDG (PET-CT)',
    baseDoseRate1m: 220.0, // uSv/h at 1 meter
    patientName: 'D. Antonio (Estudio Oncológico PET)',
    patientAvatar: '👴',
    taskDesc: 'El paciente requiere inyección IV de 370 MBq de 18F-FDG. Acércate a la camilla para la inyección y luego mantén distancia tras la mampara durante los 45 min de reposo.',
    durationSec: 40,
    sourcePos: { x: 520, y: 210 },
    mamparaPos: { x: 300, y: 210 },
    initialAnxiety: 50,
    dialogs: [
      {
        text: '💬 Calmar e informar al paciente desde distancia segura (3m)',
        effect: (state) => {
          state.anxiety = Math.max(10, state.anxiety - 30);
          state.patientBonus += 40;
          showNotification('¡El paciente se ha tranquilizado! (+40 €)');
          audio.playMoneySound();
        }
      },
      {
        text: '🧱 Colocar Mampara Móvil entre ti y el paciente',
        effect: (state) => {
          state.mamparaActive = true;
          showNotification('Mampara posicionada. Sombra radiológica activada.');
          audio.playBeep(600, 0.1);
        }
      },
      {
        text: '⚡ Realizar procedimiento rápido y alejarse inmediatamente',
        effect: (state) => {
          state.procedureTimeDone = true;
          showNotification('Procedimiento completado con agilidad.');
        }
      }
    ]
  },
  {
    id: 2,
    title: 'Escenario 2: Elución en Gammateca (Tc-99m)',
    radionuclide: '99mTc (Gammacámara)',
    baseDoseRate1m: 140.0,
    patientName: 'Vial Madrastra Tc-99m (Celda Plomada)',
    patientAvatar: '🧪',
    taskDesc: 'Debes fraccionar la dosis para gammagrafía ósea en la celda de manipulación. El vial concentrado emite tasa alta de dosis a corta distancia.',
    durationSec: 35,
    sourcePos: { x: 550, y: 150 },
    mamparaPos: { x: 380, y: 150 },
    initialAnxiety: 20,
    dialogs: [
      {
        text: '💉 Usar Protector de Jeringa en Tungsteno para fraccionar',
        effect: (state) => {
          state.syringeShieldActive = true;
          showNotification('Protector de jeringa acoplado (-90% dosis manual).');
          audio.playBeep(700, 0.1);
        }
      },
      {
        text: '🔒 Trabajar tras la pantalla de vidrio plomado de la celda',
        effect: (state) => {
          state.mamparaActive = true;
          showNotification('Vidrio plomado bajado.');
        }
      },
      {
        text: '🧹 Medir contaminación residual del contenedor con sonda',
        effect: (state) => {
          state.patientBonus += 35;
          showNotification('Verificación de seguridad limpia. (+35 €)');
          audio.playMoneySound();
        }
      }
    ]
  },
  {
    id: 3,
    title: 'Escenario 3: Traslado en Silla de Paciente Inyectado',
    radionuclide: 'Pacientes en Pasillo Caliente',
    baseDoseRate1m: 180.0,
    patientName: 'Dña. Carmen (Silla de Ruedas post-inyección)',
    patientAvatar: '👵',
    taskDesc: 'Traslada a la paciente desde la sala de espera caliente hasta la sala del tomógrafo. Evita detenerte a charlar en pasillos cerca del paciente.',
    durationSec: 45,
    sourcePos: { x: 450, y: 260 },
    mamparaPos: { x: 250, y: 260 },
    initialAnxiety: 60,
    dialogs: [
      {
        text: '🛏️ Usar barra de empuje extensible para mantener 1.5m de distancia',
        effect: (state) => {
          state.extendedPushBar = true;
          showNotification('Barra extensible activada (+1.5m de distancia fija).');
          audio.playBeep(650, 0.1);
        }
      },
      {
        text: '🗣️ Explicar el trayecto con voz clara desde la parte trasera',
        effect: (state) => {
          state.anxiety = Math.max(10, state.anxiety - 25);
          state.patientBonus += 45;
          showNotification('La paciente se siente acompañada. (+45 €)');
          audio.playMoneySound();
        }
      }
    ]
  },
  {
    id: 4,
    title: 'Escenario 4: Incidente - Paciente Inquieto en Espera',
    radionuclide: '18F-FDG (Dosis Alta)',
    baseDoseRate1m: 260.0,
    patientName: 'D. Roberto (Desorientado en Sillón Caliente)',
    patientAvatar: '👨‍💼',
    taskDesc: 'El paciente inyectado intenta salir de la habitación caliente por desorientación. Debes reconducirlo sin exponer tu salud innecesariamente.',
    durationSec: 40,
    sourcePos: { x: 480, y: 200 },
    mamparaPos: { x: 320, y: 200 },
    initialAnxiety: 80,
    dialogs: [
      {
        text: '📢 Instruir pacientemente desde detrás de la mampara móvil',
        effect: (state) => {
          state.anxiety = Math.max(15, state.anxiety - 45);
          state.mamparaActive = true;
          state.patientBonus += 50;
          showNotification('¡Manejo brillante! Paciente reconducido sin irradiarte. (+50 €)');
          audio.playMoneySound();
        }
      },
      {
        text: '🤝 Intervenir físicamente para acomodarlo en el sillón',
        effect: (state) => {
          // Rapid procedure but high exposure
          state.patientBonus += 20;
          showNotification('Intervención rápida completada.');
        }
      }
    ]
  }
];

// App Global State Object
const state = {
  currentScreen: 'screenMenu',
  gameMode: 'single', // 'single' | 'pass'
  playerIndex: 0,
  players: [
    {
      role: 'enfermero',
      name: 'Jugador 1',
      baseSalary: 500,
      money: 500,
      totalDose: 0.0,
      doseRate: 0.0,
      patientBonus: 0,
      epiCost: 0,
      equippedEPIs: new Set(),
      scenarioResults: []
    }
  ],
  currentScenarioIdx: 0,
  scenarioTimer: 0,
  timerInterval: null,
  animFrameId: null,
  
  // Active Canvas Sim State
  playerPos: { x: 100, y: 210 },
  targetPos: { x: 100, y: 210 },
  keysPressed: {},
  patientAnxiety: 50,
  mamparaActive: false,
  syringeShieldActive: false,
  extendedPushBar: false
};

// ----------------------------------------------------
// 3. UI SCREEN MANAGEMENT & EVENT HANDLERS
// ----------------------------------------------------
function switchScreen(screenId) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(screenId);
  if (target) {
    target.classList.add('active');
    state.currentScreen = screenId;
  }

  // HUD Top Bar visibility
  const hudTop = document.getElementById('hudTop');
  if (screenId === 'screenShop' || screenId === 'screenGame' || screenId === 'screenResults') {
    hudTop.style.display = 'flex';
    updateHUD();
  } else {
    hudTop.style.display = 'none';
  }
}

function updateHUD() {
  const p = getCurrentPlayer();
  const roleObj = ROLES[p.role];

  document.getElementById('hudRoleIcon').textContent = roleObj.icon;
  document.getElementById('hudRoleName').textContent = roleObj.name;
  document.getElementById('hudMoney').textContent = `${Math.round(p.money)} €`;
  document.getElementById('hudTotalDose').textContent = `${p.totalDose.toFixed(1)} µSv`;
  document.getElementById('hudDoseRate').textContent = `${p.doseRate.toFixed(1)} µSv/h`;
  
  const shopMoneyDisplay = document.getElementById('shopMoneyDisplay');
  if (shopMoneyDisplay) shopMoneyDisplay.textContent = `${Math.round(p.money)} €`;
}

function getCurrentPlayer() {
  return state.players[state.playerIndex];
}

function showNotification(msg) {
  const alertBox = document.getElementById('alertBox');
  const alertText = document.getElementById('alertText');
  if (alertBox && alertText) {
    alertText.textContent = msg;
    alertBox.style.display = 'flex';
    setTimeout(() => {
      alertBox.style.display = 'none';
    }, 4000);
  }
}

// Initialize Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  // Start Buttons
  document.getElementById('btnSinglePlayer').addEventListener('click', () => {
    audio.init();
    state.gameMode = 'single';
    state.players = [createNewPlayer('Jugador 1')];
    switchScreen('screenRole');
  });

  document.getElementById('btnPassPlay').addEventListener('click', () => {
    audio.init();
    state.gameMode = 'pass';
    state.players = [createNewPlayer('Jugador 1'), createNewPlayer('Jugador 2')];
    switchScreen('screenRole');
  });

  // Role Selection
  document.querySelectorAll('.role-card').forEach(card => {
    card.addEventListener('click', () => {
      const roleId = card.getAttribute('data-role');
      const p = getCurrentPlayer();
      p.role = roleId;
      audio.playBeep(520, 0.1);
      switchScreen('screenShop');
      renderShop();
    });
  });

  // Shop Buy Buttons
  document.querySelectorAll('.btn-buy').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemKey = btn.getAttribute('data-item');
      buyEpi(itemKey, btn);
    });
  });

  // Start Shift Button
  document.getElementById('btnStartShift').addEventListener('click', () => {
    state.currentScenarioIdx = 0;
    startScenario(state.currentScenarioIdx);
  });

  // Finish Scenario Button
  document.getElementById('btnFinishScenario').addEventListener('click', () => {
    nextScenario();
  });

  // Restart Button
  document.getElementById('btnRestartGame').addEventListener('click', () => {
    audio.stopGeiger();
    switchScreen('screenMenu');
  });

  // Controls Setup (Canvas Keyboard / Pointer)
  window.addEventListener('keydown', (e) => { state.keysPressed[e.key.toLowerCase()] = true; });
  window.addEventListener('keyup', (e) => { state.keysPressed[e.key.toLowerCase()] = false; });

  const canvas = document.getElementById('simCanvas');
  if (canvas) {
    canvas.addEventListener('pointerdown', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      state.targetPos.x = (e.clientX - rect.left) * scaleX;
      state.targetPos.y = (e.clientY - rect.top) * scaleY;
    });
  }
});

function createNewPlayer(name) {
  return {
    role: 'enfermero',
    name: name,
    baseSalary: 500,
    money: 500,
    totalDose: 0.0,
    doseRate: 0.0,
    patientBonus: 0,
    epiCost: 0,
    equippedEPIs: new Set(),
    scenarioResults: []
  };
}

// ----------------------------------------------------
// 4. SHOP & EQUIPMENT LOGIC
// ----------------------------------------------------
function renderShop() {
  const p = getCurrentPlayer();
  const equippedList = document.getElementById('equippedList');
  equippedList.innerHTML = '';

  if (p.equippedEPIs.size === 0) {
    equippedList.innerHTML = '<span class="tag-empty">Ningún EPI equipado (¡Riesgo total!)</span>';
  } else {
    p.equippedEPIs.forEach(epiId => {
      const epi = EPIS[epiId];
      const tag = document.createElement('span');
      tag.className = 'tag-epi';
      tag.innerHTML = `${epi.icon} ${epi.name}`;
      equippedList.appendChild(tag);
    });
  }

  // Update button states
  document.querySelectorAll('.btn-buy').forEach(btn => {
    const itemKey = btn.getAttribute('data-item');
    const epi = EPIS[itemKey];
    if (p.equippedEPIs.has(itemKey)) {
      btn.textContent = '✓ Equipado';
      btn.classList.add('purchased');
    } else {
      btn.textContent = `Comprar (${epi.price} €)`;
      btn.classList.remove('purchased');
    }
  });

  updateHUD();
}

function buyEpi(itemKey, btnElement) {
  const p = getCurrentPlayer();
  const epi = EPIS[itemKey];

  if (p.equippedEPIs.has(itemKey)) return;

  if (p.money >= epi.price) {
    p.money -= epi.price;
    p.epiCost += epi.price;
    p.equippedEPIs.add(itemKey);
    audio.playMoneySound();
    renderShop();
  } else {
    showNotification('¡No tienes suficiente dinero para este EPI!');
    audio.playPenaltySound();
  }
}

// ----------------------------------------------------
// 5. INTERACTIVE SIMULATION & PHYSICS (ALARA)
// ----------------------------------------------------
function startScenario(scenarioIdx) {
  const sc = SCENARIOS[scenarioIdx];
  state.currentScenarioIdx = scenarioIdx;
  state.scenarioTimer = sc.durationSec;
  state.playerPos = { x: 100, y: 210 };
  state.targetPos = { x: 100, y: 210 };
  state.patientAnxiety = sc.initialAnxiety;
  state.mamparaActive = pHasEpi('mampara');
  state.syringeShieldActive = pHasEpi('jeringa');
  state.extendedPushBar = false;

  // Setup UI elements
  document.getElementById('scenarioTitle').textContent = sc.title;
  document.getElementById('patientName').textContent = `Paciente: ${sc.patientName}`;
  document.getElementById('patientAvatar').textContent = sc.patientAvatar;
  document.getElementById('taskDescription').textContent = sc.taskDesc;
  document.getElementById('scenarioTimer').textContent = `⏱️ 00:${sc.durationSec.toString().padStart(2, '0')}`;

  // Populate Dialog / Action Buttons
  const actionButtons = document.getElementById('actionButtons');
  actionButtons.innerHTML = '';
  sc.dialogs.forEach((dialog) => {
    const btn = document.createElement('button');
    btn.className = 'btn-action-dialog';
    btn.textContent = dialog.text;
    btn.addEventListener('click', () => {
      dialog.effect(state);
      updateAnxietyUI();
      btn.disabled = true;
      btn.style.opacity = '0.5';
    });
    actionButtons.appendChild(btn);
  });

  updateAnxietyUI();
  switchScreen('screenGame');

  // Start Loops
  if (state.timerInterval) clearInterval(state.timerInterval);
  state.timerInterval = setInterval(() => {
    state.scenarioTimer--;
    document.getElementById('scenarioTimer').textContent = `⏱️ 00:${state.scenarioTimer.toString().padStart(2, '0')}`;
    if (state.scenarioTimer <= 0) {
      clearInterval(state.timerInterval);
      nextScenario();
    }
  }, 1000);

  if (state.animFrameId) cancelAnimationFrame(state.animFrameId);
  gameLoop();
}

function pHasEpi(epiId) {
  return getCurrentPlayer().equippedEPIs.has(epiId);
}

function updateAnxietyUI() {
  const anxietyFill = document.getElementById('anxietyFill');
  const anxietyText = document.getElementById('anxietyText');
  const level = state.patientAnxiety;
  if (anxietyFill && anxietyText) {
    anxietyFill.style.width = `${level}%`;
    if (level < 30) {
      anxietyText.textContent = 'Tranquilo / Cooperativo';
      anxietyText.style.color = '#10b981';
    } else if (level < 65) {
      anxietyText.textContent = 'Moderado';
      anxietyText.style.color = '#f59e0b';
    } else {
      anxietyText.textContent = '¡Agitado / Riesgo Movimiento!';
      anxietyText.style.color = '#ef4444';
    }
  }
}

// 2D CANVAS GAME LOOP
function gameLoop() {
  if (state.currentScreen !== 'screenGame') return;

  const canvas = document.getElementById('simCanvas');
  const ctx = canvas.getContext('2d');
  const sc = SCENARIOS[state.currentScenarioIdx];
  const p = getCurrentPlayer();
  const roleObj = ROLES[p.role];

  // 1. Movement logic
  let moveSpeed = roleObj.speed;
  if (pHasEpi('chaleco')) moveSpeed *= EPIS.chaleco.speedMult;

  // Keyboard navigation
  if (state.keysPressed['arrowup'] || state.keysPressed['w']) state.playerPos.y -= moveSpeed;
  if (state.keysPressed['arrowdown'] || state.keysPressed['s']) state.playerPos.y += moveSpeed;
  if (state.keysPressed['arrowleft'] || state.keysPressed['a']) state.playerPos.x -= moveSpeed;
  if (state.keysPressed['arrowright'] || state.keysPressed['d']) state.playerPos.x += moveSpeed;

  // Touch / Pointer interpolation
  const dx = state.targetPos.x - state.playerPos.x;
  const dy = state.targetPos.y - state.playerPos.y;
  const distPointer = Math.hypot(dx, dy);
  if (distPointer > 4) {
    state.playerPos.x += (dx / distPointer) * moveSpeed;
    state.playerPos.y += (dy / distPointer) * moveSpeed;
  }

  // Bounds clamping
  state.playerPos.x = Math.max(30, Math.min(canvas.width - 30, state.playerPos.x));
  state.playerPos.y = Math.max(30, Math.min(canvas.height - 30, state.playerPos.y));

  // 2. Physics & Radiation Calculation (Inverse-Square Law)
  // Convert canvas pixel distance to physical meters (100 pixels = 1.0 meter)
  const sourcePx = sc.sourcePos;
  const distPixels = Math.hypot(state.playerPos.x - sourcePx.x, state.playerPos.y - sourcePx.y);
  let distMeters = distPixels / 100.0;
  
  if (state.extendedPushBar) distMeters += 1.5; // Celador extended bar distance bonus
  distMeters = Math.max(0.4, distMeters); // Minimum distance limit

  // Inverse Square Law: D = D0 / (r^2)
  let rawDoseRate = sc.baseDoseRate1m / (distMeters * distMeters);

  // Apply EPI Attenuation Factors
  let attenuation = 1.0;
  if (pHasEpi('chaleco')) attenuation *= EPIS.chaleco.attenuation;
  if (pHasEpi('tiroides')) attenuation *= EPIS.tiroides.attenuation;

  // Check if player is behind Mampara Shield
  const isBehindMampara = (state.mamparaActive && state.playerPos.x < sc.mamparaPos.x && Math.abs(state.playerPos.y - sc.mamparaPos.y) < 80);
  if (isBehindMampara) {
    attenuation *= EPIS.mampara.attenuation;
  }

  // Check Syringe Shield
  if (state.syringeShieldActive && distMeters < 1.0) {
    attenuation *= EPIS.jeringa.attenuation;
  }

  const netDoseRate = rawDoseRate * attenuation;
  p.doseRate = netDoseRate;

  // Accumulate dose per frame (~60 FPS => 1 second = 60 steps)
  // Dose in 1 hour = netDoseRate. Dose in 1 sec = netDoseRate / 3600.
  const dosePerFrame = netDoseRate / (3600 * 60);
  p.totalDose += dosePerFrame;

  // Update Audio Geiger
  audio.updateGeigerRate(netDoseRate);

  // Update HUD & Overlay Gauges
  updateHUD();
  const doseGaugeFill = document.getElementById('doseGaugeFill');
  const gaugeText = document.getElementById('gaugeText');
  const distanceBadge = document.getElementById('distanceBadge');

  if (doseGaugeFill && gaugeText) {
    const fillPercent = Math.min(100, (netDoseRate / 400.0) * 100);
    doseGaugeFill.style.width = `${fillPercent}%`;
    gaugeText.textContent = `${netDoseRate.toFixed(1)} µSv/h`;
  }
  if (distanceBadge) {
    distanceBadge.innerHTML = `📏 Distancia a la fuente: <strong>${distMeters.toFixed(2)} m</strong> ${isBehindMampara ? '<span style="color:#10b981">(Protegido por Mampara)</span>' : ''}`;
  }

  // 3. Render Canvas 2D
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw Grid Lines (Hospital Floor)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  }

  // Draw Radiation Isodose Field Circles (ALARA Visualization)
  const grad = ctx.createRadialGradient(sourcePx.x, sourcePx.y, 10, sourcePx.x, sourcePx.y, 250);
  grad.addColorStop(0, 'rgba(239, 68, 68, 0.35)');
  grad.addColorStop(0.4, 'rgba(245, 158, 11, 0.18)');
  grad.addColorStop(1, 'rgba(16, 185, 129, 0.0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(sourcePx.x, sourcePx.y, 250, 0, Math.PI * 2);
  ctx.fill();

  // Draw Radiation Source / Patient
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sc.patientAvatar, sourcePx.x, sourcePx.y);

  // Draw Source Label & Pulsing Trefoil Icon
  ctx.fillStyle = '#ef4444';
  ctx.font = 'bold 12px var(--font-sans)';
  ctx.fillText(`☢️ ${sc.radionuclide}`, sourcePx.x, sourcePx.y + 28);

  // Draw Mampara (Lead Glass Screen)
  if (state.mamparaActive) {
    ctx.fillStyle = isBehindMampara ? '#10b981' : '#06b6d4';
    ctx.fillRect(sc.mamparaPos.x - 5, sc.mamparaPos.y - 40, 10, 80);

    // Glass reflection lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(sc.mamparaPos.x - 3, sc.mamparaPos.y - 30);
    ctx.lineTo(sc.mamparaPos.x + 3, sc.mamparaPos.y + 30);
    ctx.stroke();

    ctx.fillStyle = 'rgba(6, 182, 212, 0.8)';
    ctx.font = '11px sans-serif';
    ctx.fillText('Mampara Plomada', sc.mamparaPos.x, sc.mamparaPos.y - 48);
  }

  // Draw Player Character
  ctx.font = '32px sans-serif';
  ctx.fillText(roleObj.icon, state.playerPos.x, state.playerPos.y);

  // Draw Player Name Tag & Shield Indicator
  ctx.fillStyle = '#ffffff';
  ctx.font = '12px var(--font-sans)';
  ctx.fillText(p.name, state.playerPos.x, state.playerPos.y - 24);

  if (pHasEpi('chaleco')) {
    ctx.fillStyle = '#10b981';
    ctx.fillText('🛡️ Plomado', state.playerPos.x, state.playerPos.y + 24);
  }

  state.animFrameId = requestAnimationFrame(gameLoop);
}

// ----------------------------------------------------
// 6. SCENARIO PROGRESSION & RESULTS
// ----------------------------------------------------
function nextScenario() {
  audio.stopGeiger();
  if (state.timerInterval) clearInterval(state.timerInterval);
  if (state.animFrameId) cancelAnimationFrame(state.animFrameId);

  const nextIdx = state.currentScenarioIdx + 1;
  if (nextIdx < SCENARIOS.length) {
    startScenario(nextIdx);
  } else {
    // Shift finished for current player
    finishPlayerShift();
  }
}

function finishPlayerShift() {
  const p = getCurrentPlayer();

  // Financial Calculations
  const radiationPenalty = p.totalDose * PENALTY_PER_USV;
  p.money = p.baseSalary + p.patientBonus - p.epiCost - radiationPenalty;

  if (state.gameMode === 'pass' && state.playerIndex < state.players.length - 1) {
    // Next player's turn in Pass & Play
    state.playerIndex++;
    showNotification(`¡Turno de ${p.name} finalizado! Ahora le toca a ${getCurrentPlayer().name}`);
    switchScreen('screenRole');
  } else {
    // Show Final Results Screen
    showFinalResults();
  }
}

function showFinalResults() {
  switchScreen('screenResults');
  const p = getCurrentPlayer();

  const radiationPenalty = p.totalDose * PENALTY_PER_USV;
  const finalBalance = Math.round(p.money);

  document.getElementById('resBaseSalary').textContent = `${p.baseSalary} €`;
  document.getElementById('resPatientBonus').textContent = `+${p.patientBonus} €`;
  document.getElementById('resEpiCost').textContent = `-${p.epiCost} €`;
  document.getElementById('resTotalDose').textContent = `${p.totalDose.toFixed(1)} µSv`;
  document.getElementById('resRadiationPenalty').textContent = `-${radiationPenalty.toFixed(0)} €`;
  document.getElementById('resFinalBalance').textContent = `${finalBalance} €`;

  if (finalBalance > 400) {
    document.getElementById('resultSubtitle').textContent = '🌟 ¡Excelente desempeño! Máxima seguridad y alta rentabilidad.';
  } else if (finalBalance > 200) {
    document.getElementById('resultSubtitle').textContent = '👍 Buen turno. Has controlado la radiación adecuadamente.';
  } else {
    document.getElementById('resultSubtitle').textContent = '⚠️ ¡Cuidado! La sobreexposición radiológica ha mermado severamente tus ingresos.';
  }

  // Update Leaderboard
  saveLeaderboard(state.players);
  renderLeaderboard();
}

function saveLeaderboard(players) {
  let existing = JSON.parse(localStorage.getItem('radioRisk_leaderboard') || '[]');
  players.forEach(p => {
    existing.push({
      name: p.name,
      role: ROLES[p.role].name,
      dose: p.totalDose,
      money: Math.round(p.money),
      date: new Date().toLocaleDateString()
    });
  });
  // Sort by highest money
  existing.sort((a, b) => b.money - a.money);
  existing = existing.slice(0, 10); // Keep top 10
  localStorage.setItem('radioRisk_leaderboard', JSON.stringify(existing));
}

function renderLeaderboard() {
  const tbody = document.getElementById('leaderboardBody');
  tbody.innerHTML = '';
  const data = JSON.parse(localStorage.getItem('radioRisk_leaderboard') || '[]');

  data.forEach((entry, idx) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>#${idx + 1}</strong></td>
      <td>${entry.name}</td>
      <td>${entry.role}</td>
      <td>${entry.dose.toFixed(1)} µSv</td>
      <td><strong style="color:#10b981">${entry.money} €</strong></td>
    `;
    tbody.appendChild(tr);
  });
}
