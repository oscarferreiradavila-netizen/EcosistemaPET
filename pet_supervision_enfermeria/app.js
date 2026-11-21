/**
 * CONSOLA DE SUPERVISIÓN DE ENFERMERÍA Y CUIDADOS PET/CT — GALARIA · SERGAS
 * Módulo 8 del Ecosistema Digital PET/CT
 * - Monitor en vivo de Boxes de Reposo (Box 1 al 6) y cronómetros de captación
 * - Semáforo de glucemias capilares y protocolo de rescate con hidratación oral
 * - Medición del impacto y adherencia a las audioguías digitales del paciente
 * - Control de paso en hora a máquina y cumplimiento de la ventana EARL (55-75 min)
 * - Calidad de venopunción, calibres y auditoría de extravasaciones radiactivas
 * - Absentismo (No-Shows) y recuperación inmediata de huecos
 * - Memoria oficial de cuidados para la Dirección de Enfermería
 */

(function () {
  'use strict';

  const STORAGE_KEY_NURSE = 'PET_NURSE_SUPERVISION_V1';
  const STORAGE_KEY_MGMT = 'PET_SERVICE_MANAGEMENT_V1';
  const broadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('pet_clinical_channel') : null;

  const state = {
    periodo: 'today',
    activeTab: 'turnos',
    turnos: [],
    pedidos: [],
    glucemias: [],
    audioguias: [],
    puntualidad: [],
    venopuncion: [],
    absentismo: []
  };

  function escapeHTML(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // ==========================================================================
  // DATOS INICIALES REALISTAS DE LA UNIDAD PET/CT (SERGAS / GALARIA)
  // ==========================================================================
  function getDefaultData() {
    return {
      turnos: [
        {
          id: 1,
          nombre: 'Carmen Varela Dopico',
          categoria: 'DUE (Enfermero/a)',
          turno: 'Mañana (07:30 - 15:00)',
          puesto: 'P1 · Acogida, Glucemias & Vías',
          dosimetria: 0.14,
          estado: 'activo',
          observaciones: 'Supervisora de turno. Control de triaje glucémico y canalización ecodirigida.'
        },
        {
          id: 2,
          nombre: 'Javier Seoane Blanco',
          categoria: 'DUE (Enfermero/a)',
          turno: 'Mañana (07:30 - 15:00)',
          puesto: 'P2 · Cabina Plomada (Inyección Radiofármacos)',
          dosimetria: 0.22,
          estado: 'activo',
          observaciones: 'Inyección de dosis fraccionadas de 18F-FDG y 68Ga-PSMA tras comprobación de reflujo.'
        },
        {
          id: 3,
          nombre: 'Nuria Rial Gómez',
          categoria: 'DUE (Enfermero/a)',
          turno: 'Mañana (07:30 - 15:00)',
          puesto: 'P3 · Control Boxes Reposo & Rescate Glucémico',
          dosimetria: 0.12,
          estado: 'activo',
          observaciones: 'Monitorización de boxes 1 a 6, hidratación oral de rescate y confort.'
        },
        {
          id: 4,
          nombre: 'Marcos Louzao Vales',
          categoria: 'TSID (Técnico Sup. Imagen)',
          turno: 'Mañana (07:30 - 15:00)',
          puesto: 'P4 · Apoyo Tomógrafo PET/CT & Transfer Camilla',
          dosimetria: 0.19,
          estado: 'activo',
          observaciones: 'Cumplimiento estricto ventana EARL (55-75 min) y posicionado de gantry.'
        },
        {
          id: 5,
          nombre: 'Laura Souto Parga',
          categoria: 'TSID (Técnico Sup. Imagen)',
          turno: 'Mañana (07:30 - 15:00)',
          puesto: 'P4 · Consola de Adquisición & Reconstrucción',
          dosimetria: 0.16,
          estado: 'activo',
          observaciones: 'Adquisición de lista de pacientes y control de artefactos de movimiento.'
        },
        {
          id: 6,
          nombre: 'Beatriz Miguéns Loureiro',
          categoria: 'TCAE (Téc. Cuidados Aux.)',
          turno: 'Mañana (07:30 - 15:00)',
          puesto: 'P1 · Acompañamiento, Confort & Manta Térmica',
          dosimetria: 0.08,
          estado: 'activo',
          observaciones: 'Termorregulación en boxes para inhibición de grasa parda interescapular.'
        },
        {
          id: 7,
          nombre: 'Alberto Carballo Ríos',
          categoria: 'DUE (Enfermero/a)',
          turno: 'Tarde (14:30 - 22:00)',
          puesto: 'P2 · Cabina Plomada & Relevo Boxes',
          dosimetria: 0.15,
          estado: 'relevo',
          observaciones: 'Solape de 14:30 a 15:00 h para traspaso asistencial y comprobación de viales.'
        },
        {
          id: 8,
          nombre: 'Cristina Pazos Veiga',
          categoria: 'DUE (Enfermero/a)',
          turno: 'Tarde (14:30 - 22:00)',
          puesto: 'P1 · Acogida, Glucemias & Boxes Tarde',
          dosimetria: 0.11,
          estado: 'relevo',
          observaciones: 'Programada para segunda tanda de pacientes y recitaciones preferentes.'
        },
        {
          id: 9,
          nombre: 'David Taboada Méndez',
          categoria: 'TSID (Técnico Sup. Imagen)',
          turno: 'Tarde (14:30 - 22:00)',
          puesto: 'P4 · Tomógrafo PET/CT & Calibración Diaria',
          dosimetria: 0.18,
          estado: 'relevo',
          observaciones: 'Estudios vespertinos y control de calidad de detectores al cierre.'
        }
      ],
      pedidos: [
        {
          id: 'PED-2026-084',
          categoria: 'Fungible Sanitario',
          descripcion: 'Catéteres periféricos 20G (Rosa) BD Insyte con bioseguridad',
          proveedor: 'Almacén Central SERGAS',
          cantidad: '200 uds (2 cajas)',
          fecha: '20/11/2026',
          estado: 'entregado',
          supervision: 'Carmen Varela (DUE)',
          observaciones: 'Stock validado e introducido en vitrina plomada de boxes.'
        },
        {
          id: 'PED-2026-085',
          categoria: 'Rescate Glucémico',
          descripcion: 'Botellas Agua Mineral 500 mL para protocolo de hidratación oral',
          proveedor: 'Almacén Central SERGAS',
          cantidad: '120 botellas (5 packs)',
          fecha: '20/11/2026',
          estado: 'entregado',
          supervision: 'Nuria Rial (DUE)',
          observaciones: 'Uso en protocolo de rescate hiperglucemias (160-199 mg/dL).'
        },
        {
          id: 'PED-2026-086',
          categoria: 'Contraste Radiológico',
          descripcion: 'Iopromida 370 mg/mL (100 mL) para CT con contraste diagnóstica',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          cantidad: '40 frascos',
          fecha: '20/11/2026 (Hoy 13:00)',
          estado: 'transito',
          supervision: 'Carmen Varela (DUE)',
          observaciones: 'Solicitado para cobertura semanal de estudios oncológicos contrastados.'
        },
        {
          id: 'PED-2026-087',
          categoria: 'Protección Radiológica',
          descripcion: 'Apósitos hemostáticos plomados y protectores jeringa de tungsteno',
          proveedor: 'Almacén Central SERGAS',
          cantidad: '150 uds',
          fecha: '20/11/2026 (Mañana 08:30)',
          estado: 'transito',
          supervision: 'Javier Seoane (DUE)',
          observaciones: 'Reposición programada para cabina de preparación e inyección.'
        },
        {
          id: 'PED-2026-088',
          categoria: 'Radiofármaco',
          descripcion: '18F-FDG Dosis Fraccionadas (Jornada Mañana / Tarde)',
          proveedor: 'Ciclotrón Galaria (Santiago)',
          cantidad: '32 dosis calibradas',
          fecha: '20/11/2026 (07:15 & 11:30)',
          estado: 'entregado',
          supervision: 'Radiofarmacia / DUE',
          observaciones: 'Lote FDG-261120-A recibido con control de calidad 100% conforme.'
        },
        {
          id: 'PED-2026-089',
          categoria: 'Radiofármaco',
          descripcion: 'Marcador 68Ga-PSMA (Recidiva prostática bioquímica)',
          proveedor: 'Curium / Ciclotrón Galaria',
          cantidad: '4 viales elución',
          fecha: '20/11/2026 (08:30)',
          estado: 'entregado',
          supervision: 'Radiofarmacia / DUE',
          observaciones: 'Validado por radiofarmacia; 4 pacientes citados y confirmados.'
        }
      ],
      glucemias: [
        {
          paciente: 'Rosa Otero Carballo',
          nhc: 'NHC-728192',
          box: 'Box 2',
          hora: '08:35 h',
          radiofarmaco: '18F-FDG',
          cifraInicial: 184,
          semaforo: 'ambar',
          intervencion: '500 mL agua oral + reposo 30 min',
          cifraPost: 158,
          resultado: 'Rescate Exitoso (<160 mg/dL). Inyectada en hora.'
        },
        {
          paciente: 'Manuel Castro Varela',
          nhc: 'NHC-481920',
          box: 'Box 3',
          hora: '09:10 h',
          radiofarmaco: '68Ga-PSMA',
          cifraInicial: 'Exento',
          semaforo: 'exento',
          intervencion: 'Sin ayuno glucídico estricto (trazador PSMA)',
          cifraPost: 'N/A',
          resultado: 'Inyección directa conforme a protocolo.'
        },
        {
          paciente: 'Carlos Méndez Piñeiro',
          nhc: 'NHC-302918',
          box: 'Box 1 (Turno Previo)',
          hora: '07:45 h',
          radiofarmaco: '18F-FDG',
          cifraInicial: 148,
          semaforo: 'verde',
          intervencion: 'Sin incidencias. Ayuno 6h confirmado.',
          cifraPost: 'N/A',
          resultado: 'Inyección directa conforme.'
        },
        {
          paciente: 'Elena Taboada Rios',
          nhc: 'NHC-582910',
          box: 'Box 4 (Turno Previo)',
          hora: '08:15 h',
          radiofarmaco: '18F-FDG',
          cifraInicial: 215,
          semaforo: 'rojo',
          intervencion: 'Valoración facultativa. Reposo hidratado 45m descendió a 192 mg/dL.',
          cifraPost: 192,
          resultado: 'Autorizada por médico nuclear con ajuste de captación.'
        }
      ],
      audioguias: [
        {
          protocolo: '18F-FDG Oncológico General',
          citados: 180,
          escucharon: 158,
          pctAdherencia: 87.8,
          suspConAudio: 2,
          suspSinAudio: 14,
          pctEfectividad: 85.7
        },
        {
          protocolo: '18F-Fluorcolina (Próstata / Paratiroides)',
          citados: 24,
          escucharon: 21,
          pctAdherencia: 87.5,
          suspConAudio: 0,
          suspSinAudio: 3,
          pctEfectividad: 100.0
        },
        {
          protocolo: '68Ga-PSMA (Recidiva Próstata)',
          citados: 45,
          escucharon: 39,
          pctAdherencia: 86.7,
          suspConAudio: 0,
          suspSinAudio: 4,
          pctEfectividad: 100.0
        },
        {
          protocolo: '68Ga-DOTATOC (Neuroendocrino)',
          citados: 12,
          escucharon: 10,
          pctAdherencia: 83.3,
          suspConAudio: 0,
          suspSinAudio: 1,
          pctEfectividad: 100.0
        },
        {
          protocolo: '18F-FDG Endocarditis / Sarcoidosis (Dieta Cetogénica)',
          citados: 14,
          escucharon: 12,
          pctAdherencia: 85.7,
          suspConAudio: 1,
          suspSinAudio: 5,
          pctEfectividad: 80.0
        }
      ],
      puntualidad: [
        {
          paciente: 'Arturo Salgado Pérez',
          nhc: 'NHC-839104',
          box: 'Box 1',
          radiofarmaco: '18F-FDG',
          horaInyeccion: '08:50',
          previsto: '09:50',
          real: '09:52',
          desviacion: '+2 min',
          estadoEarl: 'Conforme (62 min captación)',
          tsid: 'Marcos Louzao'
        },
        {
          paciente: 'Carlos Méndez Piñeiro',
          nhc: 'NHC-302918',
          box: 'Box 2',
          radiofarmaco: '18F-FDG',
          horaInyeccion: '08:00',
          previsto: '09:00',
          real: '08:58',
          desviacion: '-2 min',
          estadoEarl: 'Conforme (58 min captación)',
          tsid: 'Laura Souto'
        },
        {
          paciente: 'María José Iglesias',
          nhc: 'NHC-194029',
          box: 'Box 3',
          radiofarmaco: '18F-Colina',
          horaInyeccion: '08:25',
          previsto: '09:25',
          real: '09:25',
          desviacion: '0 min',
          estadoEarl: 'Conforme (60 min captación)',
          tsid: 'Marcos Louzao'
        }
      ],
      venopuncion: [
        {
          paciente: 'Dolores Fraga Neira',
          nhc: 'NHC-910293',
          fecha: 'Hoy 09:30',
          calibre: '22G (Azul)',
          lado: 'Dorso Mano Izq.',
          tipo: 'Vía Venosa Difícil',
          grado: 'Ninguna (Inyección limpia)',
          medidas: 'Canalización ecodirigida con microaguja. Comprobación de retorno con suero.',
          impacto: 'Estudio diagnósticamente óptimo.'
        },
        {
          paciente: 'Juan Benítez Vales',
          nhc: 'NHC-640192',
          fecha: 'Ayer 11:15',
          calibre: '20G (Rosa)',
          lado: 'Fosa Antecubital Dcha.',
          tipo: 'Extravasación Leve (<1%)',
          grado: 'Leve (0.4% actividad)',
          medidas: 'Aspiración local, compresión suave, calor local y registro dosimétrico.',
          impacto: 'Afectación nula de SUV torácico. Se notifica en informe TSID.'
        }
      ],
      absentismo: [
        {
          paciente: 'Arturo Salgado Pérez (Cita 08:15)',
          hora: '08:15 h',
          radiofarmaco: '18F-FDG',
          llamada: '3 intentos sin respuesta',
          causa: 'No acude sin avisar (No-Show)',
          accion: 'Activación lista de espera inmediata de planta',
          asignado: 'Carlos Méndez (Box 1)',
          estadoDosis: 'Dosis aprovechada 100% en paciente de planta.'
        },
        {
          paciente: 'Begoña Estévez Mariño (Cita 11:15)',
          hora: '11:15 h',
          radiofarmaco: '18F-Colina',
          llamada: 'Paciente comunica olvido',
          causa: 'Olvido de cita sin cancelación previa',
          accion: 'Recitación ambulatoria preferente',
          asignado: 'Recitado para turno matinal del lunes',
          estadoDosis: 'Actividad restante reasignada parcialmente.'
        }
      ]
    };
  }

  function loadNurseData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_NURSE);
      if (raw) {
        const parsed = JSON.parse(raw);
        Object.assign(state, parsed);
        return;
      }
    } catch (_) {}
    Object.assign(state, getDefaultData());
    saveNurseData();
  }

  function saveNurseData() {
    try {
      localStorage.setItem(STORAGE_KEY_NURSE, JSON.stringify(state));
    } catch (_) {}
  }

  // ==========================================================================
  // GRÁFICAS VECTORIALES SVG EN TIEMPO REAL
  // ==========================================================================
  function renderSparklineSVG(data, color, width = 120, height = 36) {
    if (!data || data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = (max - min) || 1;
    const padding = 3;
    const effH = height - padding * 2;
    const step = (width - padding * 2) / (data.length - 1);

    const points = data.map((val, idx) => {
      const x = padding + idx * step;
      const y = height - padding - ((val - min) / range) * effH;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const lastX = width - padding;
    const lastY = height - padding - ((data[data.length - 1] - min) / range) * effH;

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}" style="overflow:visible; display:block;">
        <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" points="${points}" />
        <circle cx="${lastX}" cy="${lastY}" r="3" fill="${color}" stroke="#ffffff" stroke-width="1.5" />
      </svg>
    `;
  }

  function renderBarComparisonSVG(series, labels, width = 500, height = 180) {
    const barWidth = 32;
    const gap = 45;
    const startX = 40;
    const maxVal = Math.max(...series[0].data, ...series[1].data, 10);

    const bars = labels.map((lbl, idx) => {
      const x = startX + idx * (barWidth * 2 + gap);
      const val1 = series[0].data[idx] || 0;
      const val2 = series[1].data[idx] || 0;
      const h1 = (val1 / maxVal) * 110;
      const h2 = (val2 / maxVal) * 110;
      const y1 = 140 - h1;
      const y2 = 140 - h2;

      return `
        <g>
          <rect x="${x}" y="${y1}" width="${barWidth}" height="${h1}" fill="${series[0].color}" rx="3">
            <title>${lbl} - ${series[0].name}: ${val1}%</title>
          </rect>
          <text x="${x + barWidth / 2}" y="${y1 - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${series[0].color}">${val1}%</text>

          <rect x="${x + barWidth + 6}" y="${y2}" width="${barWidth}" height="${h2}" fill="${series[1].color}" rx="3">
            <title>${lbl} - ${series[1].name}: ${val2}%</title>
          </rect>
          <text x="${x + barWidth + 6 + barWidth / 2}" y="${y2 - 4}" text-anchor="middle" font-size="9" font-weight="700" fill="${series[1].color}">${val2}%</text>

          <text x="${x + barWidth + 3}" y="160" text-anchor="middle" font-size="9.5" font-weight="600" fill="#475569">${lbl}</text>
        </g>
      `;
    }).join('');

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="${height}">
        <line x1="30" y1="140" x2="${width - 20}" y2="140" stroke="#cbd5e1" stroke-width="1.5"/>
        ${bars}
        <g transform="translate(120, 175)">
          <rect x="0" y="-8" width="12" height="10" fill="${series[0].color}" rx="2"/>
          <text x="18" y="0" font-size="9.5" fill="#334155" font-weight="600">${series[0].name}</text>
          <rect x="180" y="-8" width="12" height="10" fill="${series[1].color}" rx="2"/>
          <text x="198" y="0" font-size="9.5" fill="#334155" font-weight="600">${series[1].name}</text>
        </g>
      </svg>
    `;
  }

  // ==========================================================================
  // RENDERIZADO PRINCIPAL DE PANELES Y MONITOR
  // ==========================================================================
  function renderAll() {
    renderKPIs();
    renderPlanillaTab();
    renderTurnosTable();
    renderPedidosTable();
    renderAudioguiasSection();
    renderPuntualidadTable();
    renderVenopuncionTable();
    renderAbsentismoTable();
    renderInformeCuidados();
  }

  function renderKPIs() {
    // 2. Audioguías
    const sparkAudio = document.getElementById('sparkNurseAudioguias');
    if (sparkAudio) sparkAudio.innerHTML = renderSparklineSVG([78, 81, 84, 85.4], '#0d9488');

    // 3. Ventana EARL
    const sparkEarl = document.getElementById('sparkNurseEarl');
    if (sparkEarl) sparkEarl.innerHTML = renderSparklineSVG([89, 91, 92.5, 93.1], '#0284c7');

    // 4. Extravasación
    const sparkExtrav = document.getElementById('sparkNurseExtravasacion');
    if (sparkExtrav) sparkExtrav.innerHTML = renderSparklineSVG([0.6, 0.5, 0.4, 0.3], '#7c3aed');

    // 5. No-Show
    const sparkNoShow = document.getElementById('sparkNurseNoShow');
    if (sparkNoShow) sparkNoShow.innerHTML = renderSparklineSVG([4, 3, 3, 2], '#d97706');

    // 6. Permanencia
    const sparkPerm = document.getElementById('sparkNursePermanencia');
    if (sparkPerm) sparkPerm.innerHTML = renderSparklineSVG([125, 118, 115, 112], '#be123c');
  }

  function renderTurnosTable() {
    const tbody = document.getElementById('tablaTurnosPersonalBody');
    if (!tbody) return;

    let mananaCount = 0;
    let tardeCount = 0;
    let activosCount = 0;

    tbody.innerHTML = state.turnos.map((t, idx) => {
      const isManana = t.turno.includes('Mañana');
      if (isManana) mananaCount++; else tardeCount++;
      if (t.estado === 'activo') activosCount++;

      const catBadge = t.categoria.includes('DUE')
        ? '<span class="role-badge-due">DUE</span>'
        : (t.categoria.includes('TSID')
          ? '<span class="role-badge-tsid">TSID</span>'
          : '<span class="role-badge-tcae">TCAE</span>');

      const estadoBadge = t.estado === 'activo'
        ? '<span class="status-badge badge-ok">● En Servicio</span>'
        : (t.estado === 'descanso'
          ? '<span class="status-badge badge-warn">○ Descanso Rad.</span>'
          : '<span class="status-badge badge-info">⏱️ Relevo Prog.</span>');

      const dosiPct = Math.min(100, Math.round((t.dosimetria / 1.6) * 100)); // ref mensual límite 1.6mSv
      const dosiColor = t.dosimetria > 0.4 ? '#dc2626' : (t.dosimetria > 0.25 ? '#d97706' : '#059669');

      return `
        <tr>
          <td>
            <strong>${escapeHTML(t.nombre)}</strong>
          </td>
          <td>${catBadge}</td>
          <td>
            <strong>${escapeHTML(t.turno)}</strong>
          </td>
          <td>
            <span class="status-badge badge-info" style="font-weight:700;">${escapeHTML(t.puesto)}</span>
          </td>
          <td>
            <div class="dosis-meter">
              <div class="dosis-bar-wrap">
                <div class="dosis-bar-fill" style="width:${dosiPct}%; background:${dosiColor};"></div>
              </div>
              <span style="color:${dosiColor};">${t.dosimetria.toFixed(2)} mSv</span>
            </div>
          </td>
          <td>${estadoBadge}</td>
          <td style="font-size:0.77rem; color:#475569;">
            ${escapeHTML(t.observaciones || 'Sin incidencias.')}
          </td>
          <td class="no-print">
            <button type="button" class="btn-nurse btn-nurse-outline" style="padding:2px 8px; font-size:0.72rem;" onclick="window.supervisionApp.eliminarTurno(${idx})">
              Rotar / Quitar
            </button>
          </td>
        </tr>
      `;
    }).join('');

    const badgePersonal = document.getElementById('badgeTurnosPersonal');
    if (badgePersonal) {
      badgePersonal.textContent = `${activosCount} En Servicio`;
    }
  }

  function renderPedidosTable() {
    const tbody = document.getElementById('tablaPedidosMaterialBody');
    if (!tbody) return;

    let enCursoCount = 0;

    tbody.innerHTML = state.pedidos.map((p, idx) => {
      const isTransito = p.estado === 'transito';
      if (isTransito) enCursoCount++;

      const estadoBadge = p.estado === 'entregado'
        ? '<span class="status-badge badge-ok">🟢 Entregado & Validado</span>'
        : (p.estado === 'transito'
          ? '<span class="status-badge badge-warn">🟡 En Tránsito / Prep.</span>'
          : '<span class="status-badge badge-info">🔵 Solicitado</span>');

      return `
        <tr>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:var(--sergas-navy);">
            ${escapeHTML(p.id)}
          </td>
          <td>
            <span class="status-badge badge-info">${escapeHTML(p.categoria)}</span>
          </td>
          <td>
            <strong>${escapeHTML(p.descripcion)}</strong>
            <div style="font-size:0.73rem; color:#64748b;">${escapeHTML(p.observaciones || '')}</div>
          </td>
          <td><strong>${escapeHTML(p.proveedor)}</strong></td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#0f766e;">
            ${escapeHTML(p.cantidad)}
          </td>
          <td style="font-family:'JetBrains Mono',monospace; font-size:0.76rem;">
            ${escapeHTML(p.fecha)}
          </td>
          <td>${estadoBadge}</td>
          <td style="font-size:0.76rem; color:#334155;">
            ✍️ ${escapeHTML(p.supervision)}
          </td>
          <td class="no-print">
            ${isTransito ? `
              <button type="button" class="btn-nurse btn-nurse-amber" style="padding:2px 8px; font-size:0.72rem;" onclick="window.supervisionApp.marcarPedidoEntregado(${idx})">
                Recepción
              </button>
            ` : `
              <span style="font-size:0.74rem; color:#059669; font-weight:700;">✓ Conforme</span>
            `}
          </td>
        </tr>
      `;
    }).join('');

    const badgePedidos = document.getElementById('badgePedidosPendientes');
    if (badgePedidos) {
      badgePedidos.textContent = `${enCursoCount} En Curso`;
    }
    const statBadge = document.getElementById('statPedidosActivosBadge');
    if (statBadge) {
      statBadge.textContent = `${enCursoCount} En Tránsito`;
    }
  }

  function renderAudioguiasSection() {
    // 1. Gráfica comparativa Cancelación
    const chartCan = document.getElementById('chartCancelacionAudioguia');
    if (chartCan) {
      chartCan.innerHTML = renderBarComparisonSVG(
        [
          { name: 'CON Audioguía previa', color: '#0d9488', data: [1.1, 0.0, 0.0, 1.2] },
          { name: 'SIN Audioguía previa', color: '#dc2626', data: [8.7, 12.5, 9.1, 7.8] }
        ],
        ['FDG General', 'Colina', 'PSMA', 'Neuro'],
        460, 175
      );
    }

    // 2. Gráfica causas mala preparación
    const chartMal = document.getElementById('chartCausasMalPrepNurse');
    if (chartMal) {
      chartMal.innerHTML = `
        <svg viewBox="0 0 460 175" width="100%" height="175">
          <g transform="translate(10, 15)">
            <rect x="0" y="0" width="180" height="20" fill="#f59e0b" rx="3"/>
            <text x="190" y="14" font-size="10" font-weight="700" fill="#334155">Rotura ayuno involuntaria (42%)</text>
            
            <rect x="0" y="32" width="120" height="20" fill="#0284c7" rx="3"/>
            <text x="130" y="46" font-size="10" font-weight="700" fill="#334155">Medicación/Insulina (28%)</text>
            
            <rect x="0" y="64" width="75" height="20" fill="#8b5cf6" rx="3"/>
            <text x="85" y="78" font-size="10" font-weight="700" fill="#334155">Ejercicio previo intenso (18%)</text>
            
            <rect x="0" y="96" width="50" height="20" fill="#ec4899" rx="3"/>
            <text x="60" y="110" font-size="10" font-weight="700" fill="#334155">Dieta cetogénica rota (12%)</text>
          </g>
        </svg>
      `;
    }

    // 3. Tabla Eficacia
    const tbody = document.getElementById('tablaAudioguiasEficaciaBody');
    if (!tbody) return;

    tbody.innerHTML = state.audioguias.map(a => `
      <tr>
        <td><strong>${escapeHTML(a.protocolo)}</strong></td>
        <td style="font-family:'JetBrains Mono',monospace;">${a.citados}</td>
        <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#0f766e;">${a.escucharon}</td>
        <td><span class="status-badge badge-ok">${a.pctAdherencia.toFixed(1)}%</span></td>
        <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#059669;">${a.suspConAudio} (1.1%)</td>
        <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#dc2626;">${a.suspSinAudio} (8.7%)</td>
        <td><strong style="color:#0f766e;">-${a.pctEfectividad.toFixed(0)}% Cancelaciones</strong></td>
      </tr>
    `).join('');
  }

  function renderPuntualidadTable() {
    const tbody = document.getElementById('tablaPasoCamillaBody');
    if (!tbody) return;

    tbody.innerHTML = state.puntualidad.map(p => `
      <tr>
        <td><strong>${escapeHTML(p.paciente)}</strong><br><span style="font-size:0.74rem; color:#64748b; font-family:'JetBrains Mono',monospace;">${escapeHTML(p.nhc)}</span></td>
        <td><span class="status-badge badge-info">${escapeHTML(p.box)}</span></td>
        <td>${escapeHTML(p.radiofarmaco)}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${escapeHTML(p.horaInyeccion)}</td>
        <td style="font-family:'JetBrains Mono',monospace;">${escapeHTML(p.previsto)}</td>
        <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#0284c7;">${escapeHTML(p.real)}</td>
        <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#059669;">${escapeHTML(p.desviacion)}</td>
        <td><span class="status-badge badge-ok">✓ ${escapeHTML(p.estadoEarl)}</span></td>
        <td><strong>${escapeHTML(p.tsid)}</strong></td>
      </tr>
    `).join('');
  }

  function renderVenopuncionTable() {
    const tbody = document.getElementById('tablaVenopuncionBody');
    if (!tbody) return;

    tbody.innerHTML = state.venopuncion.map(v => `
      <tr>
        <td><strong>${escapeHTML(v.paciente)}</strong><br><span style="font-size:0.74rem; color:#64748b; font-family:'JetBrains Mono',monospace;">${escapeHTML(v.nhc)}</span></td>
        <td style="font-family:'JetBrains Mono',monospace;">${escapeHTML(v.fecha)}</td>
        <td><span class="status-badge badge-info">${escapeHTML(v.calibre)}</span></td>
        <td>${escapeHTML(v.lado)}</td>
        <td><strong>${escapeHTML(v.tipo)}</strong></td>
        <td><span class="status-badge badge-ok">${escapeHTML(v.grado)}</span></td>
        <td style="font-size:0.78rem; color:#334155;">${escapeHTML(v.medidas)}</td>
        <td style="font-size:0.78rem; color:#065f46; font-weight:600;">✓ ${escapeHTML(v.impacto)}</td>
      </tr>
    `).join('');
  }

  function renderAbsentismoTable() {
    const tbody = document.getElementById('tablaAbsentismoBody');
    if (!tbody) return;

    tbody.innerHTML = state.absentismo.map(a => `
      <tr>
        <td><strong style="color:#b91c1c;">${escapeHTML(a.paciente)}</strong></td>
        <td style="font-family:'JetBrains Mono',monospace;">${escapeHTML(a.hora)}</td>
        <td><strong>${escapeHTML(a.radiofarmaco)}</strong></td>
        <td style="font-size:0.78rem; color:#d97706;">📞 ${escapeHTML(a.llamada)}</td>
        <td><span class="status-badge badge-danger">${escapeHTML(a.causa)}</span></td>
        <td style="font-size:0.78rem; color:#0369a1; font-weight:600;">⚡ ${escapeHTML(a.accion)}</td>
        <td><strong style="color:#059669;">${escapeHTML(a.asignado)}</strong></td>
        <td><span class="status-badge badge-ok">✓ ${escapeHTML(a.estadoDosis)}</span></td>
      </tr>
    `).join('');
  }

  function renderInformeCuidados() {
    const container = document.getElementById('printReportContainer');
    if (!container) return;

    const fechaHoy = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    container.innerHTML = `
      <div style="border-bottom:2px solid #004868; padding-bottom:1rem; margin-bottom:1.5rem; display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-size:0.8rem; font-weight:800; color:#007eb4; text-transform:uppercase;">SERVIZO GALEGO DE SAÚDE · GALARIA</div>
          <h1 style="font-family:'Outfit',sans-serif; font-size:1.45rem; color:#004868; margin-top:2px;">
            Memoria Oficial de Supervisión de Enfermería y Cuidados en Unidad PET/CT
          </h1>
          <div style="font-size:0.82rem; color:#475569;">Período Auditado: ${fechaHoy} · Unidad de Medicina Nuclear de Alta Tecnología</div>
        </div>
        <div style="text-align:right;">
          <span class="status-badge badge-ok" style="font-size:0.85rem; padding:4px 12px;">ISO 9001 / Acreditación EARL</span>
        </div>
      </div>

      <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:1rem; margin-bottom:1.5rem;">
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.9rem;">
          <div style="font-size:0.75rem; font-weight:700; color:#0f766e;">GLUCEMIAS EN BOX</div>
          <div style="font-size:1.4rem; font-weight:800; color:#0f172a; margin:3px 0;">76.2% Óptimas</div>
          <div style="font-size:0.72rem; color:#059669;">71.4% de casos ámbar rescatados con agua</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.9rem;">
          <div style="font-size:0.75rem; font-weight:700; color:#0f766e;">IMPACTO AUDIOGUÍAS</div>
          <div style="font-size:1.4rem; font-weight:800; color:#0f172a; margin:3px 0;">-87% Cancelaciones</div>
          <div style="font-size:0.72rem; color:#059669;">1.1% susp. con audio vs 8.7% sin audio</div>
        </div>
        <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.9rem;">
          <div style="font-size:0.75rem; font-weight:700; color:#0f766e;">VENTANA EARL / TSID</div>
          <div style="font-size:1.4rem; font-weight:800; color:#0f172a; margin:3px 0;">93.1% Conforme</div>
          <div style="font-size:0.72rem; color:#059669;">Intervalo 55-75 min rigurosamente cumplido</div>
        </div>
      </div>

      <h3 style="font-family:'Outfit',sans-serif; font-size:1.05rem; color:#004868; margin-bottom:0.6rem;">
        1. Conclusiones y Plan de Mejora Continua de Cuidados
      </h3>
      <p style="font-size:0.83rem; color:#334155; line-height:1.6; margin-bottom:1rem;">
        La implantación de las <strong>audioguías digitales interactivas</strong> ha transformado la preparación domiciliaria del paciente, logrando que el 85.4% de los citados acudan en ayuno estricto y sin ejercicio físico previo. El protocolo de hidratación oral en box rescata más del 70% de las hiperglucemias leves sin necesidad de suspender la prueba ni perder la actividad del ciclotrón.
      </p>

      <div style="margin-top:2rem; padding-top:1.5rem; border-top:1px dashed #cbd5e1; display:flex; justify-content:space-between;">
        <div style="font-size:0.78rem; color:#64748b;">
          Firmado digitalmente:<br>
          <strong>Supervisora de Enfermería PET/CT</strong><br>
          Servizo Galego de Saúde · Galaria
        </div>
        <div style="font-size:0.78rem; color:#64748b; text-align:right;">
          Visto Bueno:<br>
          <strong>Dirección de Cuidados y Calidad Asistencial</strong>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // NAVEGACIÓN Y ACCIONES INTERACTIVAS
  // ==========================================================================
  function cambiarTab(tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.nurse-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
    });
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `tab-${tabName}`);
    });
  }

  function cambiarPeriodo(periodo) {
    state.periodo = periodo;
    showToast(`📅 Período de supervisión actualizado: ${periodo}`);
    renderAll();
  }

  function abrirModalIncidenciaVenopuncion() {
    const modal = document.getElementById('modalIncidenciaVenopuncion');
    if (modal) modal.classList.add('active');
  }

  function cerrarModalIncidenciaVenopuncion() {
    const modal = document.getElementById('modalIncidenciaVenopuncion');
    if (modal) modal.classList.remove('active');
  }

  function guardarIncidenciaVenopuncion() {
    const box = document.getElementById('selectBoxVenopuncion').value;
    const calibre = document.getElementById('selectCalibreCateter').value;
    const lado = document.getElementById('selectLadoVenopuncion').value;
    const tipo = document.getElementById('selectTipoExtravasacion').value;

    state.venopuncion.unshift({
      paciente: box + ' (Paciente asistido)',
      nhc: 'NHC-' + Math.floor(100000 + Math.random() * 900000),
      fecha: 'Hoy ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      calibre,
      lado,
      tipo: tipo === 'ninguna' ? 'Inyección Sin Extravasación' : `Extravasación ${tipo.toUpperCase()}`,
      grado: tipo === 'ninguna' ? 'Correcta (0%)' : `Extravasación ${tipo}`,
      medidas: tipo === 'ninguna' ? 'Comprobación de flujo con suero previa' : 'Aspiración, compresión y calor local protocolizado',
      impacto: tipo === 'ninguna' ? 'Óptimo sin afectación' : 'Registrado en historial electrónico SERGAS'
    });

    saveNurseData();
    cerrarModalIncidenciaVenopuncion();
    showToast('💉 Incidencia de venopunción registrada correctamente.');
    renderAll();
    cambiarTab('venopuncion');
  }

  function abrirModalTurno() {
    const modal = document.getElementById('modalTurnoPersonal');
    if (modal) modal.classList.add('active');
  }

  function cerrarModalTurno() {
    const modal = document.getElementById('modalTurnoPersonal');
    if (modal) modal.classList.remove('active');
  }

  function guardarTurno() {
    const nombre = (document.getElementById('inputTurnoNombre').value || '').trim();
    const categoria = document.getElementById('selectTurnoCategoria').value;
    const turno = document.getElementById('selectTurnoFranja').value;
    const puesto = document.getElementById('selectTurnoPuesto').value;
    const dosimetria = parseFloat(document.getElementById('inputTurnoDosimetria').value) || 0.15;
    const estado = document.getElementById('selectTurnoEstado').value;

    if (!nombre) {
      alert('Por favor, indica el nombre del profesional sanitario.');
      return;
    }

    state.turnos.push({
      id: state.turnos.length + 1,
      nombre,
      categoria,
      turno,
      puesto,
      dosimetria,
      estado,
      observaciones: 'Asignación actualizada por supervisión de enfermería.'
    });

    saveNurseData();
    cerrarModalTurno();
    showToast(`👥 Profesional ${nombre} asignado al puesto.`);
    renderAll();
    cambiarTab('turnos');
  }

  function eliminarTurno(idx) {
    if (confirm('¿Deseas desasignar o rotar a este profesional del cuadrante actual?')) {
      state.turnos.splice(idx, 1);
      saveNurseData();
      renderAll();
      showToast('Cuadrante de personal actualizado.');
    }
  }

  function abrirModalNuevoPedido() {
    const modal = document.getElementById('modalNuevoPedido');
    if (modal) modal.classList.add('active');
  }

  function cerrarModalNuevoPedido() {
    const modal = document.getElementById('modalNuevoPedido');
    if (modal) modal.classList.remove('active');
  }

  function guardarNuevoPedido() {
    const categoria = document.getElementById('selectPedidoCategoria').value;
    const descripcion = (document.getElementById('inputPedidoDescripcion').value || '').trim();
    const proveedor = document.getElementById('selectPedidoProveedor').value;
    const cantidad = (document.getElementById('inputPedidoCantidad').value || '').trim();
    const prioridad = document.getElementById('selectPedidoPrioridad').value;

    if (!descripcion || !cantidad) {
      alert('Por favor, indica el artículo y la cantidad requerida.');
      return;
    }

    const numPed = Math.floor(100 + Math.random() * 900);
    const nuevo = {
      id: `PED-2026-${numPed}`,
      categoria,
      descripcion,
      proveedor,
      cantidad,
      fecha: new Date().toLocaleDateString('es-ES') + ' (' + prioridad.toUpperCase() + ')',
      estado: 'transito',
      supervision: 'Supervisora de Turno (DUE)',
      observaciones: `Prioridad: ${prioridad}. Tramitado a través de plataforma SERGAS.`
    };

    state.pedidos.unshift(nuevo);
    saveNurseData();
    cerrarModalNuevoPedido();
    showToast(`📦 Pedido ${nuevo.id} (${descripcion}) tramitado.`);
    renderAll();
    cambiarTab('pedidos');
  }

  function marcarPedidoEntregado(idx) {
    if (state.pedidos[idx]) {
      state.pedidos[idx].estado = 'entregado';
      state.pedidos[idx].observaciones += ' Recibido en unidad y validado lote.';
      saveNurseData();
      renderAll();
      showToast(`📦 Pedido ${state.pedidos[idx].id} marcado como RECIBIDO.`);
    }
  }

  function sincronizarDatos() {
    loadNurseData();
    renderAll();
    showToast('🔄 Datos sincronizados en tiempo real con la unidad PET/CT.');
  }

  function imprimirInformeCuidados() {
    cambiarTab('informe_cuidados');
    setTimeout(() => {
      window.print();
    }, 400);
  }

  function showToast(msg) {
    const container = document.getElementById('nurseToastContainer');
    if (!container) return;
    const div = document.createElement('div');
    div.className = 'nurse-toast';
    div.textContent = msg;
    container.appendChild(div);
    setTimeout(() => {
      if (div.parentNode) div.remove();
    }, 5000);
  }

  if (broadcast) {
    broadcast.onmessage = () => {
      loadNurseData();
      renderAll();
    };
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key && (e.key.startsWith('PET_') || e.key === STORAGE_KEY_NURSE)) {
        loadNurseData();
        renderAll();
      }
    });
  }

  // ==========================================================================
  // PLANILLA INTERACTIVA DE PERSONAL (ENFERMEROS, TÉCNICOS, CELADORES, TCAE)
  // ==========================================================================
  const PLANILLA_STORAGE_STAFF = 'PET_PLANILLA_STAFF_V2';
  const PLANILLA_STORAGE_SHIFTS = 'PET_PLANILLA_SHIFTS_V2';
  const PLANILLA_STORAGE_CALENDAR = 'PET_PLANILLA_CALENDAR_V1';

  const PLANILLA_CATEGORIES = [
    { id: 'enfermeros', label: '🩺 Enfermeros/as (DUE)' },
    { id: 'tecnicos', label: '☢️ Técnicos (TSID / TER)' },
    { id: 'celadores', label: '🏥 Celadores/as' },
    { id: 'tcaes', label: '🧤 TCAEs' }
  ];

  // Franjas agrupadas por Turno (Mañana / Tarde / Noche) con cupos objetivo reales
  const PLANILLA_BANDS_BY_CAT = {
    enfermeros: [
      { bandId: 'manana', label: '☀️ TURNO MAÑANA (08:00 – 15:00 h)', bandClass: 'planilla-band-manana', target: 3, cols: [
        { id: 'manana_pet', title: '☀️ Mañana · PET-CT', sub: '08:00 – 15:00 h', headerBg: '#e0f2fe' },
        { id: 'manana_mn', title: '☀️ Mañana · Med. Nuclear', sub: '08:00 – 15:00 h', headerBg: '#dcfce7' },
        { id: 'manana_tm', title: '☀️ Mañana · Terapia Metabólica', sub: '08:00 – 15:00 h', headerBg: '#ffedd5' }
      ]},
      { bandId: 'tarde', label: '🌆 TURNO TARDE (15:00 – 22:00 h)', bandClass: 'planilla-band-tarde', target: 2, cols: [
        { id: 'tarde_pet', title: '🌆 Tarde · PET-CT', sub: '15:00 – 22:00 h', headerBg: '#fef3c7' },
        { id: 'tarde_mn', title: '🌆 Tarde · Med. Nuclear', sub: '15:00 – 22:00 h', headerBg: '#ede9fe' },
        { id: 'tarde_tm', title: '🌆 Tarde · Terapia Metabólica', sub: '15:00 – 22:00 h', headerBg: '#ffedd5' }
      ]},
      { bandId: 'noche', label: '🌙 TURNO NOCHE (22:00 – 08:00 h)', bandClass: 'planilla-band-noche', target: 1, cols: [
        { id: 'noche', title: '🌙 Noche · Unidad', sub: '22:00 – 08:00 h', headerBg: '#dbeafe' },
        { id: 'noche_tm', title: '🌙 Noche · Terapia Metabólica', sub: '22:00 – 08:00 h', headerBg: '#ffedd5' }
      ]}
    ],
    tecnicos: [
      { bandId: 'manana', label: '☀️ TURNO MAÑANA (08:00 – 15:00 h)', bandClass: 'planilla-band-manana', target: 1, cols: [
        { id: 'manana_pet', title: '☀️ Mañana · PET-CT', sub: '08:00 – 15:00 h', headerBg: '#e0f2fe' },
        { id: 'manana_mn', title: '☀️ Mañana · Med. Nuclear', sub: '08:00 – 15:00 h', headerBg: '#dcfce7' }
      ]},
      { bandId: 'tarde', label: '🌆 TURNO TARDE (15:00 – 22:00 h)', bandClass: 'planilla-band-tarde', target: 3, cols: [
        { id: 'tarde_pet', title: '🌆 Tarde · PET-CT', sub: '15:00 – 22:00 h', headerBg: '#fef3c7' },
        { id: 'tarde_mn', title: '🌆 Tarde · Med. Nuclear', sub: '15:00 – 22:00 h', headerBg: '#ede9fe' }
      ]}
    ],
    celadores: [
      { bandId: 'manana', label: '☀️ TURNO MAÑANA (08:00 – 15:00 h)', bandClass: 'planilla-band-manana', target: 1, cols: [
        { id: 'manana_pet', title: '☀️ Mañana · Unidad MN/PET', sub: '08:00 – 15:00 h', headerBg: '#e0f2fe' }
      ]},
      { bandId: 'tarde', label: '🌆 TURNO TARDE (15:00 – 22:00 h)', bandClass: 'planilla-band-tarde', target: 1, cols: [
        { id: 'tarde_pet', title: '🌆 Tarde · Unidad MN/PET', sub: '15:00 – 22:00 h', headerBg: '#fef3c7' }
      ]}
    ],
    tcaes: [
      { bandId: 'manana', label: '☀️ TURNO MAÑANA (08:00 – 15:00 h)', bandClass: 'planilla-band-manana', target: 2, cols: [
        { id: 'manana_pet', title: '☀️ Mañana · PET-CT', sub: '08:00 – 15:00 h', headerBg: '#e0f2fe' },
        { id: 'manana_mn', title: '☀️ Mañana · Med. Nuclear', sub: '08:00 – 15:00 h', headerBg: '#dcfce7' }
      ]},
      { bandId: 'tarde', label: '🌆 TURNO TARDE — Algunas tardes (15:00 – 22:00 h)', bandClass: 'planilla-band-tarde', target: 1, cols: [
        { id: 'tarde_apoyo', title: '🌆 Tarde · Refuerzo MN/PET', sub: '15:00 – 22:00 h', headerBg: '#fef3c7' }
      ]}
    ]
  };

  const POOL_COLS = [
    { id: 'disponible', title: '📋 Plantilla Disponible', sub: 'Sin asignar / Pool', headerBg: '#f1f5f9' },
    { id: 'libre', title: '🏖️ Libre / Baja / Descanso', sub: 'Libranza / Incidencia', headerBg: '#fee2e2' }
  ];

  function getAllColsForCategory(cat) {
    const bands = PLANILLA_BANDS_BY_CAT[cat] || PLANILLA_BANDS_BY_CAT.enfermeros;
    const bandCols = bands.reduce((acc, b) => acc.concat(b.cols), []);
    return POOL_COLS.concat(bandCols);
  }

  // Dotación exacta:
  // - 6 Enfermeros: 3 mañana, 2 tarde, 1 noche
  // - 4 TSID: 1 mañana, 3 tarde
  // - Celadores: 1 mañana, 1 tarde (1 por turno)
  // - TCAEs: mañanas y algunas tardes
  const DEFAULT_STAFF_SEED = [
    // 6 Enfermeros
    { id: 'enf_1', name: 'Laura Méndez Vázquez', category: 'enfermeros', area: 'PET-CT', defaultShift: 'manana_pet' },
    { id: 'enf_2', name: 'Beatriz Lago Otero', category: 'enfermeros', area: 'PET-CT', defaultShift: 'manana_pet' },
    { id: 'enf_3', name: 'Patricia Rial Seoane', category: 'enfermeros', area: 'Medicina Nuclear', defaultShift: 'manana_mn' },
    { id: 'enf_4', name: 'Lucía Fernández López', category: 'enfermeros', area: 'Polivalente', defaultShift: 'tarde_pet' },
    { id: 'enf_5', name: 'Sonia Iglesias Prado', category: 'enfermeros', area: 'Medicina Nuclear', defaultShift: 'tarde_mn' },
    { id: 'enf_6', name: 'Cristina Varela Souto', category: 'enfermeros', area: 'Polivalente', defaultShift: 'noche' },

    // 4 Técnicos TSID
    { id: 'tec_1', name: 'Carlos Pazos Blanco', category: 'tecnicos', area: 'PET-CT', defaultShift: 'manana_pet' },
    { id: 'tec_2', name: 'Diego Martínez Rey', category: 'tecnicos', area: 'PET-CT', defaultShift: 'tarde_pet' },
    { id: 'tec_3', name: 'Javier Núñez García', category: 'tecnicos', area: 'Medicina Nuclear', defaultShift: 'tarde_mn' },
    { id: 'tec_4', name: 'Adrián Gómez Ferreiro', category: 'tecnicos', area: 'Polivalente', defaultShift: 'tarde_pet' },

    // Celadores (1 por turno)
    { id: 'cel_1', name: 'Manuel Rodríguez Piñeiro', category: 'celadores', area: 'Polivalente', defaultShift: 'manana_pet' },
    { id: 'cel_2', name: 'José Luis Pérez Conde', category: 'celadores', area: 'Polivalente', defaultShift: 'tarde_pet' },

    // TCAEs (mañanas y algunas tardes)
    { id: 'tcae_1', name: 'María José Lorenzo Gil', category: 'tcaes', area: 'PET-CT', defaultShift: 'manana_pet' },
    { id: 'tcae_2', name: 'Ana Belén Torres Vila', category: 'tcaes', area: 'Medicina Nuclear', defaultShift: 'manana_mn' },
    { id: 'tcae_3', name: 'Silvia Álvarez Ramos', category: 'tcaes', area: 'Polivalente', defaultShift: 'tarde_apoyo' }
  ];

  const todayISO = new Date().toISOString().split('T')[0];
  const planillaState = {
    categoria: 'enfermeros',
    fecha: todayISO,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth(),
    selectedWorkerId: null,
    draggedWorkerId: null,
    staff: [],
    shiftsByDate: {},
    confirmedCalendar: {}
  };

  function initPlanillaData() {
    try {
      const savedStaff = localStorage.getItem(PLANILLA_STORAGE_STAFF);
      planillaState.staff = savedStaff ? JSON.parse(savedStaff) : JSON.parse(JSON.stringify(DEFAULT_STAFF_SEED));
      if (!Array.isArray(planillaState.staff) || planillaState.staff.length === 0) {
        planillaState.staff = JSON.parse(JSON.stringify(DEFAULT_STAFF_SEED));
      }
    } catch (_) {
      planillaState.staff = JSON.parse(JSON.stringify(DEFAULT_STAFF_SEED));
    }
    try {
      const savedShifts = localStorage.getItem(PLANILLA_STORAGE_SHIFTS);
      planillaState.shiftsByDate = savedShifts ? JSON.parse(savedShifts) : {};
      if (!planillaState.shiftsByDate || typeof planillaState.shiftsByDate !== 'object') {
        planillaState.shiftsByDate = {};
      }
    } catch (_) {
      planillaState.shiftsByDate = {};
    }
    try {
      const savedCal = localStorage.getItem(PLANILLA_STORAGE_CALENDAR);
      planillaState.confirmedCalendar = savedCal ? JSON.parse(savedCal) : {};
      if (!planillaState.confirmedCalendar || typeof planillaState.confirmedCalendar !== 'object') {
        planillaState.confirmedCalendar = {};
      }
    } catch (_) {
      planillaState.confirmedCalendar = {};
    }
  }

  function savePlanillaData() {
    try {
      localStorage.setItem(PLANILLA_STORAGE_STAFF, JSON.stringify(planillaState.staff));
      localStorage.setItem(PLANILLA_STORAGE_SHIFTS, JSON.stringify(planillaState.shiftsByDate));
      localStorage.setItem(PLANILLA_STORAGE_CALENDAR, JSON.stringify(planillaState.confirmedCalendar));
    } catch (_) {}
  }

  function getWorkerShiftForDate(worker, dateStr) {
    const dayMap = planillaState.shiftsByDate[dateStr];
    if (dayMap && dayMap[worker.id]) return dayMap[worker.id];
    return worker.defaultShift || 'disponible';
  }

  function setPlanillaFecha(val) {
    if (val === 'hoy') {
      planillaState.fecha = new Date().toISOString().split('T')[0];
    } else if (val === 'manana') {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      planillaState.fecha = d.toISOString().split('T')[0];
    } else if (val) {
      planillaState.fecha = val;
    }
    const parts = planillaState.fecha.split('-');
    if (parts.length === 3) {
      planillaState.calYear = parseInt(parts[0], 10);
      planillaState.calMonth = parseInt(parts[1], 10) - 1;
    }
    planillaState.selectedWorkerId = null;
    renderPlanillaTab();
  }

  function setPlanillaCategoria(cat) {
    planillaState.categoria = cat;
    planillaState.selectedWorkerId = null;
    renderPlanillaTab();
  }

  function selectPlanillaWorker(workerId) {
    if (!workerId || planillaState.selectedWorkerId === workerId) {
      planillaState.selectedWorkerId = null;
    } else {
      planillaState.selectedWorkerId = workerId;
    }
    renderPlanillaTab();
  }

  function movePlanillaWorkerToShift(workerId, shiftId) {
    if (!workerId || !shiftId) return;
    if (!planillaState.shiftsByDate[planillaState.fecha]) {
      planillaState.shiftsByDate[planillaState.fecha] = {};
    }
    planillaState.shiftsByDate[planillaState.fecha][workerId] = shiftId;
    const worker = planillaState.staff.find(w => w.id === workerId);
    const allCols = worker ? getAllColsForCategory(worker.category) : getAllColsForCategory(planillaState.categoria);
    const shiftObj = allCols.find(s => s.id === shiftId);
    planillaState.selectedWorkerId = null;
    savePlanillaData();
    renderPlanillaTab();
    if (worker && shiftObj) {
      showToast(`✅ ${worker.name} colocado en: ${shiftObj.title}`);
    }
  }

  function handleColumnClick(shiftId) {
    if (planillaState.selectedWorkerId) {
      movePlanillaWorkerToShift(planillaState.selectedWorkerId, shiftId);
    }
  }

  function onPlanillaDragStart(ev, workerId) {
    planillaState.draggedWorkerId = workerId;
    if (ev && ev.dataTransfer) {
      ev.dataTransfer.setData('text/plain', workerId);
      ev.dataTransfer.effectAllowed = 'move';
    }
  }

  function onPlanillaDragOver(ev) {
    if (ev) {
      ev.preventDefault();
      if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move';
      if (ev.currentTarget) ev.currentTarget.classList.add('drag-over');
    }
  }

  function onPlanillaDragLeave(ev) {
    if (ev && ev.currentTarget) ev.currentTarget.classList.remove('drag-over');
  }

  function onPlanillaDrop(ev, shiftId) {
    if (ev) {
      ev.preventDefault();
      if (ev.currentTarget) ev.currentTarget.classList.remove('drag-over');
    }
    const workerId = (ev && ev.dataTransfer && ev.dataTransfer.getData('text/plain')) || planillaState.draggedWorkerId;
    planillaState.draggedWorkerId = null;
    if (workerId) movePlanillaWorkerToShift(workerId, shiftId);
  }

  function agregarTrabajadorPlanilla() {
    const inputNombre = document.getElementById('inputNuevoTrabajadorNombre');
    const selectArea = document.getElementById('selectNuevoTrabajadorArea');
    const nombre = inputNombre ? inputNombre.value.trim() : '';
    const area = selectArea ? selectArea.value : 'Polivalente';
    if (!nombre) {
      showToast('⚠️ Escribe el nombre del trabajador antes de añadirlo.');
      return;
    }
    const cat = planillaState.categoria === 'resumen' ? 'enfermeros' : planillaState.categoria;
    planillaState.staff.push({
      id: `${cat}_${Date.now()}`,
      name: nombre,
      category: cat,
      area,
      defaultShift: 'disponible'
    });
    if (inputNombre) inputNombre.value = '';
    savePlanillaData();
    renderPlanillaTab();
    showToast(`➕ ${nombre} añadido a la planilla.`);
  }

  function eliminarTrabajadorPlanilla(workerId, ev) {
    if (ev) ev.stopPropagation();
    const worker = planillaState.staff.find(w => w.id === workerId);
    if (!worker || !confirm(`¿Eliminar a ${worker.name} de la plantilla?`)) return;
    planillaState.staff = planillaState.staff.filter(w => w.id !== workerId);
    if (planillaState.selectedWorkerId === workerId) planillaState.selectedWorkerId = null;
    savePlanillaData();
    renderPlanillaTab();
    showToast(`🗑️ ${worker.name} retirado de la planilla.`);
  }

  function resetPlanillaDia() {
    if (!confirm(`¿Restablecer las asignaciones del día ${planillaState.fecha} a la distribución inicial?`)) return;
    delete planillaState.shiftsByDate[planillaState.fecha];
    planillaState.selectedWorkerId = null;
    savePlanillaData();
    renderPlanillaTab();
    showToast('🔄 Planilla del día restablecida.');
  }

  // Confirmar los turnos del día y añadirlos automáticamente al calendario
  function confirmarPlanillaDia() {
    const fecha = planillaState.fecha;
    const summaryByCat = {};

    PLANILLA_CATEGORIES.forEach(cat => {
      const catWorkers = planillaState.staff.filter(w => w.category === cat.id);
      const manana = [];
      const tarde = [];
      const noche = [];
      catWorkers.forEach(w => {
        const sh = getWorkerShiftForDate(w, fecha);
        if (sh.startsWith('manana')) manana.push(w.name);
        else if (sh.startsWith('tarde')) tarde.push(w.name);
        else if (sh.startsWith('noche')) noche.push(w.name);
      });
      summaryByCat[cat.id] = { manana, tarde, noche };
    });

    planillaState.confirmedCalendar[fecha] = {
      confirmedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      categories: summaryByCat
    };

    savePlanillaData();
    renderPlanillaTab();
    showToast(`📅 Turnos del día ${fecha} confirmados y añadidos al calendario de registro.`);
  }

  function cambiarMesCalendario(delta) {
    planillaState.calMonth += delta;
    if (planillaState.calMonth < 0) {
      planillaState.calMonth = 11;
      planillaState.calYear -= 1;
    } else if (planillaState.calMonth > 11) {
      planillaState.calMonth = 0;
      planillaState.calYear += 1;
    }
    renderPlanillaCalendar();
  }

  function seleccionarDiaCalendario(dateStr) {
    setPlanillaFecha(dateStr);
  }

  function getAreaBadgeClass(area) {
    if (area === 'PET-CT') return 'worker-area-pet';
    if (area === 'Medicina Nuclear') return 'worker-area-mn';
    if (area === 'Terapia Metabólica') return 'worker-area-tm';
    return 'worker-area-poli';
  }

  function renderColumnBox(col, workersInShift, hasSelected) {
    return `
      <div class="planilla-column ${hasSelected ? 'drop-ready' : ''}"
        onclick="window.supervisionApp.handleColumnClick('${col.id}')"
        ondragover="window.supervisionApp.onPlanillaDragOver(event)"
        ondragleave="window.supervisionApp.onPlanillaDragLeave(event)"
        ondrop="window.supervisionApp.onPlanillaDrop(event, '${col.id}')">
        <div class="planilla-col-header" style="background:${col.headerBg};">
          <div>
            <div class="planilla-col-title">${escapeHTML(col.title)}</div>
            <div class="planilla-col-sub">${escapeHTML(col.sub)}</div>
          </div>
          <span class="planilla-col-count">${workersInShift.length}</span>
        </div>
        <div class="planilla-col-body">
          ${workersInShift.length === 0
            ? `<div class="planilla-empty-col">${hasSelected ? '👆 Haz clic aquí para colocar' : 'Arrastra o selecciona un trabajador'}</div>`
            : workersInShift.map(w => {
                const isSel = planillaState.selectedWorkerId === w.id;
                return `
                  <div class="worker-card ${isSel ? 'selected' : ''}"
                    draggable="true"
                    ondragstart="window.supervisionApp.onPlanillaDragStart(event, '${w.id}')"
                    onclick="event.stopPropagation(); window.supervisionApp.selectPlanillaWorker('${w.id}')">
                    <div class="worker-card-main">
                      <span class="worker-name">${escapeHTML(w.name)}</span>
                      <div class="worker-meta">
                        <span class="worker-area-pill ${getAreaBadgeClass(w.area)}">${escapeHTML(w.area)}</span>
                      </div>
                    </div>
                    <button type="button" class="worker-del-btn no-print" title="Quitar de la plantilla"
                      onclick="window.supervisionApp.eliminarTrabajadorPlanilla('${w.id}', event)">🗑️</button>
                  </div>
                `;
              }).join('')
          }
        </div>
      </div>
    `;
  }

  function renderPlanillaCalendar() {
    const calEl = document.getElementById('planillaCalendarContainer');
    if (!calEl) return;

    const monthsES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const year = planillaState.calYear;
    const month = planillaState.calMonth;
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7; // Lunes = 0

    const activeCat = planillaState.categoria;
    const catLabel = activeCat === 'resumen'
      ? 'Todas las Categorías'
      : (PLANILLA_CATEGORIES.find(c => c.id === activeCat)?.label || 'Personal');

    let cellsHtml = '';
    for (let i = 0; i < startOffset; i++) {
      cellsHtml += '<div class="planilla-cal-day is-empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateStr = `${year}-${mm}-${dd}`;
      const conf = planillaState.confirmedCalendar[dateStr];
      const isSelected = planillaState.fecha === dateStr;

      let entriesHtml = '';
      if (conf && conf.categories) {
        if (activeCat === 'resumen') {
          entriesHtml = PLANILLA_CATEGORIES.map(c => {
            const d = conf.categories[c.id] || { manana: [], tarde: [], noche: [] };
            const total = d.manana.length + d.tarde.length + d.noche.length;
            return `<div class="planilla-cal-entry cal-entry-m">${escapeHTML(c.id.toUpperCase())}: M(${d.manana.length}) T(${d.tarde.length})${c.id === 'enfermeros' ? ` N(${d.noche.length})` : ''} · ${total}</div>`;
          }).join('');
        } else {
          const d = conf.categories[activeCat] || { manana: [], tarde: [], noche: [] };
          if (d.manana.length > 0) {
            entriesHtml += `<div class="planilla-cal-entry cal-entry-m" title="Mañana: ${escapeHTML(d.manana.join(', '))}">☀️ ${escapeHTML(d.manana.map(n => n.split(' ')[0]).join(', '))}</div>`;
          }
          if (d.tarde.length > 0) {
            entriesHtml += `<div class="planilla-cal-entry cal-entry-t" title="Tarde: ${escapeHTML(d.tarde.join(', '))}">🌆 ${escapeHTML(d.tarde.map(n => n.split(' ')[0]).join(', '))}</div>`;
          }
          if (d.noche.length > 0) {
            entriesHtml += `<div class="planilla-cal-entry cal-entry-n" title="Noche: ${escapeHTML(d.noche.join(', '))}">🌙 ${escapeHTML(d.noche.map(n => n.split(' ')[0]).join(', '))}</div>`;
          }
        }
      }

      cellsHtml += `
        <div class="planilla-cal-day ${conf ? 'is-confirmed' : ''} ${isSelected ? 'is-selected' : ''}"
          onclick="window.supervisionApp.seleccionarDiaCalendario('${dateStr}')">
          <div class="planilla-cal-num">
            <span>${day}</span>
            ${conf ? '<span class="planilla-cal-badge-ok">✓</span>' : ''}
          </div>
          ${entriesHtml || '<div style="font-size:0.65rem; color:#94a3b8;">Sin confirmar</div>'}
        </div>
      `;
    }

    calEl.innerHTML = `
      <div class="planilla-cal-header">
        <div>
          <h3 style="font-family:'Outfit',sans-serif; font-size:1.02rem; color:#004868; margin:0;">
            📅 Calendario de Registro de Turnos — ${monthsES[month]} ${year} (${escapeHTML(catLabel)})
          </h3>
          <p style="font-size:0.76rem; color:#475569; margin:2px 0 0 0;">
            Al pulsar "Confirmar Turnos del Día", el personal asignado queda registrado aquí. Haz clic en cualquier día para verlo o editarlo.
          </p>
        </div>
        <div style="display:flex; gap:6px;" class="no-print">
          <button type="button" class="btn-nurse btn-nurse-outline" onclick="window.supervisionApp.cambiarMesCalendario(-1)">◀ Mes anterior</button>
          <button type="button" class="btn-nurse btn-nurse-outline" onclick="window.supervisionApp.cambiarMesCalendario(1)">Mes siguiente ▶</button>
        </div>
      </div>
      <div class="planilla-cal-grid">
        <div class="planilla-cal-weekday">Lun</div>
        <div class="planilla-cal-weekday">Mar</div>
        <div class="planilla-cal-weekday">Mié</div>
        <div class="planilla-cal-weekday">Jue</div>
        <div class="planilla-cal-weekday">Vie</div>
        <div class="planilla-cal-weekday">Sáb</div>
        <div class="planilla-cal-weekday">Dom</div>
        ${cellsHtml}
      </div>
    `;
  }

  function renderPlanillaTab() {
    if (!planillaState.staff || planillaState.staff.length === 0) initPlanillaData();

    const dateInput = document.getElementById('planillaFechaInput');
    if (dateInput) dateInput.value = planillaState.fecha;

    PLANILLA_CATEGORIES.forEach(c => {
      const el = document.getElementById(`countPlanilla_${c.id}`);
      if (el) el.textContent = String(planillaState.staff.filter(w => w.category === c.id).length);
    });

    document.querySelectorAll('.planilla-cat-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.cat === planillaState.categoria);
    });

    const addBar = document.getElementById('planillaAddBar');
    if (addBar) addBar.style.display = planillaState.categoria === 'resumen' ? 'none' : 'flex';

    const selBar = document.getElementById('planillaSelectionBar');
    const selText = document.getElementById('planillaSelectionText');
    const selectedWorker = planillaState.selectedWorkerId
      ? planillaState.staff.find(w => w.id === planillaState.selectedWorkerId)
      : null;

    if (selBar && selText) {
      if (selectedWorker) {
        selBar.classList.remove('hidden');
        selText.textContent = `👆 Seleccionado: ${selectedWorker.name} (${selectedWorker.area}) — Haz clic en la columna de turno donde quieras colocarlo.`;
      } else {
        selBar.classList.add('hidden');
      }
    }

    const container = document.getElementById('planillaBoardContainer');
    if (!container) return;

    if (planillaState.categoria === 'resumen') {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; gap:1.1rem;">
          ${PLANILLA_CATEGORIES.map(cat => {
            const catWorkers = planillaState.staff.filter(w => w.category === cat.id);
            const bands = PLANILLA_BANDS_BY_CAT[cat.id] || [];
            return `
              <div style="border:1.5px solid #cbd5e1; border-radius:12px; overflow:hidden; background:#ffffff;">
                <div style="background:#004868; color:#ffffff; padding:0.65rem 1rem; display:flex; justify-content:space-between; align-items:center;">
                  <strong style="font-family:'Outfit',sans-serif; font-size:0.95rem;">${escapeHTML(cat.label)}</strong>
                  <span style="font-size:0.78rem; opacity:0.9;">Fecha: ${escapeHTML(planillaState.fecha)} · Total: ${catWorkers.length}</span>
                </div>
                <div style="padding:0.8rem; display:flex; flex-direction:column; gap:0.65rem;">
                  ${bands.map(b => {
                    const colIds = b.cols.map(c => c.id);
                    const assigned = catWorkers.filter(w => colIds.includes(getWorkerShiftForDate(w, planillaState.fecha)));
                    return `
                      <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.55rem 0.75rem;">
                        <div style="font-size:0.77rem; font-weight:800; color:#0f172a; margin-bottom:0.3rem;">
                          ${escapeHTML(b.label)} — ${assigned.length} / ${b.target} asignados
                        </div>
                        <div style="display:flex; flex-wrap:wrap; gap:6px;">
                          ${assigned.length === 0
                            ? '<span style="font-size:0.72rem; color:#94a3b8;">Sin asignar</span>'
                            : assigned.map(w => `<span style="font-size:0.77rem; font-weight:700; color:#1e293b; padding:0.2rem 0.55rem; background:#ffffff; border:1px solid #cbd5e1; border-radius:6px;">${escapeHTML(w.name)}</span>`).join('')
                          }
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      renderPlanillaCalendar();
      return;
    }

    const catWorkers = planillaState.staff.filter(w => w.category === planillaState.categoria);
    const bands = PLANILLA_BANDS_BY_CAT[planillaState.categoria] || [];
    const hasSelected = Boolean(selectedWorker);

    const poolHtml = `
      <div class="planilla-pool-row">
        ${POOL_COLS.map(col => {
          const workersInCol = catWorkers.filter(w => getWorkerShiftForDate(w, planillaState.fecha) === col.id);
          return renderColumnBox(col, workersInCol, hasSelected);
        }).join('')}
      </div>
    `;

    const bandsHtml = bands.map((band, idx) => {
      const bandColIds = band.cols.map(c => c.id);
      const countInBand = catWorkers.filter(w => bandColIds.includes(getWorkerShiftForDate(w, planillaState.fecha))).length;
      const quotaOk = countInBand === band.target;
      return `
        ${idx > 0 ? '<hr class="planilla-band-divider">' : ''}
        <div class="planilla-band-section">
          <div class="planilla-band-header ${band.bandClass}">
            <span>${escapeHTML(band.label)}</span>
            <span class="planilla-quota-pill ${quotaOk ? 'planilla-quota-ok' : 'planilla-quota-warn'}">
              ${countInBand} / ${band.target} ${band.target === 1 ? 'plaza' : 'plazas'}
            </span>
          </div>
          <div class="planilla-band-cols">
            ${band.cols.map(col => {
              const workersInCol = catWorkers.filter(w => getWorkerShiftForDate(w, planillaState.fecha) === col.id);
              return renderColumnBox(col, workersInCol, hasSelected);
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = poolHtml + '<hr class="planilla-band-divider">' + bandsHtml;
    renderPlanillaCalendar();
  }

  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      initPlanillaData();
      loadNurseData();
      renderAll();
    });
  }

  if (typeof window !== 'undefined') {
    window.supervisionApp = {
      cambiarTab,
      cambiarPeriodo,
      abrirModalTurno,
      cerrarModalTurno,
      guardarTurno,
      eliminarTurno,
      abrirModalNuevoPedido,
      cerrarModalNuevoPedido,
      guardarNuevoPedido,
      marcarPedidoEntregado,
      abrirModalIncidenciaVenopuncion,
      cerrarModalIncidenciaVenopuncion,
      guardarIncidenciaVenopuncion,
      sincronizarDatos,
      imprimirInformeCuidados,
      setPlanillaCategoria,
      setPlanillaFecha,
      selectPlanillaWorker,
      handleColumnClick,
      onPlanillaDragStart,
      onPlanillaDragOver,
      onPlanillaDragLeave,
      onPlanillaDrop,
      agregarTrabajadorPlanilla,
      eliminarTrabajadorPlanilla,
      resetPlanillaDia,
      confirmarPlanillaDia,
      cambiarMesCalendario,
      seleccionarDiaCalendario,
      renderPlanillaTab
    };
  }
})();
