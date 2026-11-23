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

  function getPedidoCanal(p) {
    if (p.canal === 'GALARIA' || p.canal === 'SERGAS') return p.canal;
    const prov = String(p.proveedor || '').toLowerCase();
    return (prov.includes('galaria') || prov.includes('curium')) ? 'GALARIA' : 'SERGAS';
  }

  function renderPedidosRowsHtml(list) {
    if (!list || list.length === 0) {
      return '<tr><td colspan="9" style="text-align:center; color:#94a3b8; padding:0.9rem;">No hay pedidos registrados en esta sección.</td></tr>';
    }
    return list.map(({ p, idx }) => {
      const isTransito = p.estado === 'transito';
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
  }

  function renderPedidosTable() {
    let enCursoCount = 0;
    const galariaList = [];
    const sergasList = [];

    state.pedidos.forEach((p, idx) => {
      if (p.estado === 'transito') enCursoCount++;
      if (getPedidoCanal(p) === 'GALARIA') {
        galariaList.push({ p, idx });
      } else {
        sergasList.push({ p, idx });
      }
    });

    const tbodyGal = document.getElementById('tablaPedidosGalariaBody');
    if (tbodyGal) tbodyGal.innerHTML = renderPedidosRowsHtml(galariaList);

    const tbodySer = document.getElementById('tablaPedidosSergasBody');
    if (tbodySer) tbodySer.innerHTML = renderPedidosRowsHtml(sergasList);

    const tbodyOld = document.getElementById('tablaPedidosMaterialBody');
    if (tbodyOld) tbodyOld.innerHTML = renderPedidosRowsHtml(state.pedidos.map((p, idx) => ({ p, idx })));

    const badgePedidos = document.getElementById('badgePedidosPendientes');
    if (badgePedidos) {
      badgePedidos.textContent = `${enCursoCount} En Curso`;
    }
    const statBadge = document.getElementById('statPedidosActivosBadge');
    if (statBadge) {
      statBadge.textContent = `${enCursoCount} En Tránsito`;
    }
    recalcularFungiblesConsolidados();
  }

  const FUNGIBLES_BY_TEST_KEY = 'PET_FUNGIBLES_POR_PRUEBA_V1';
  const TEST_TYPE_LABELS = {
    fdg: '18F-FDG (Oncológico / Neuro / Vasculitis)',
    fdg_contraste: '18F-FDG + Contraste IV',
    fdg_endocarditis: '18F-FDG Endocarditis (HEP)',
    psma: '68Ga-PSMA / 18F-PSMA',
    colina: '18F-Fluorcolina (Próstata / Paratiroides)',
    dotatoc: '68Ga-DOTATOC (Neuroendocrinos)',
    mn_conv: 'Medicina Nuclear Convencional'
  };

  const DEFAULT_FUNGIBLES_BY_TEST = {
    fdg: [
      { nombre: 'Equipo Intego (SAS)', scope: 'turno', ratio: 1, canal: 'GALARIA' },
      { nombre: 'PAS (Kit Paciente Intego)', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Catéter IV periférico 20G / 22G', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Llave de 3 pasos + alargadera', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Suero Salino Fisiológico 0.9% (100 mL)', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Kit venopunción (gasas, apósito, clorhexidina)', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ],
    fdg_contraste: [
      { nombre: 'Equipo Intego (SAS)', scope: 'turno', ratio: 1, canal: 'GALARIA' },
      { nombre: 'PAS (Kit Paciente Intego)', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Sistema inyector automático + vial contraste IV', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Catéter IV periférico 18G / 20G alto flujo', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Suero Salino Fisiológico 0.9% (100 mL)', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Kit venopunción (gasas, apósito, clorhexidina)', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ],
    fdg_endocarditis: [
      { nombre: 'Equipo Intego (SAS)', scope: 'turno', ratio: 1, canal: 'GALARIA' },
      { nombre: 'PAS (Kit Paciente Intego)', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Vial Heparina Sódica IV (50 UI/kg)', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Catéter IV + llave 3 pasos + suero 100 mL', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ],
    psma: [
      { nombre: 'Jeringa plomada + protector dosis PSMA', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Catéter IV + llave 3 pasos + suero 100 mL', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Kit venopunción (gasas, apósito, clorhexidina)', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ],
    colina: [
      { nombre: 'Jeringa plomada + protector dosis 18F-Colina', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Catéter IV + llave 3 pasos + suero 100 mL', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Kit venopunción (gasas, apósito, clorhexidina)', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ],
    dotatoc: [
      { nombre: 'Jeringa plomada + protector dosis 68Ga-DOTATOC', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Catéter IV + llave 3 pasos + suero 100 mL', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Kit venopunción (gasas, apósito, clorhexidina)', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ],
    mn_conv: [
      { nombre: 'Jeringa + protector plomado radiofármaco Tc-99m', scope: 'paciente', ratio: 1, canal: 'GALARIA' },
      { nombre: 'Palomilla / Catéter IV 22G + gasas + apósito', scope: 'paciente', ratio: 1, canal: 'SERGAS' },
      { nombre: 'Suero Salino 0.9% 10 mL lavado', scope: 'paciente', ratio: 1, canal: 'SERGAS' }
    ]
  };

  function loadFungiblesByTest() {
    try {
      const saved = localStorage.getItem(FUNGIBLES_BY_TEST_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.fdg)) {
          return parsed;
        }
      }
    } catch (_) {}
    return JSON.parse(JSON.stringify(DEFAULT_FUNGIBLES_BY_TEST));
  }

  let fungiblesByTest = loadFungiblesByTest();
  let activeTestType = 'fdg';
  let editorProtocoloVisible = true;

  // CONTEO AUTOMÁTICO DE PACIENTES POR TIPO DE PRUEBA EN EL DÍA
  let pacientesDiaPorPrueba = {
    fdg: 15,
    fdg_contraste: 3,
    fdg_endocarditis: 1,
    psma: 4,
    colina: 2,
    dotatoc: 1,
    mn_conv: 0
  };

  function saveFungiblesByTest() {
    try {
      localStorage.setItem(FUNGIBLES_BY_TEST_KEY, JSON.stringify(fungiblesByTest));
    } catch (_) {}
  }

  function onCambioTipoPruebaFungible(tipo) {
    activeTestType = tipo || 'fdg';
    if (!fungiblesByTest[activeTestType]) {
      fungiblesByTest[activeTestType] = [];
    }
    renderEditorMaterialesPrueba();
  }

  function toggleEditorProtocoloPrueba() {
    const wrap = document.getElementById('wrapperEditorProtocoloPrueba');
    if (!wrap) return;
    editorProtocoloVisible = !editorProtocoloVisible;
    wrap.style.display = editorProtocoloVisible ? 'block' : 'none';
  }

  function updateFungibleParam(idx, field, value) {
    const list = fungiblesByTest[activeTestType];
    if (!list || !list[idx]) return;
    if (field === 'ratio') {
      list[idx].ratio = Math.max(0, parseFloat(value) || 0);
    } else {
      list[idx][field] = value;
    }
    saveFungiblesByTest();
    renderEditorMaterialesPrueba();
    recalcularFungiblesConsolidados();
  }

  function agregarFungibleAPrueba() {
    const nombreEl = document.getElementById('inputNuevoFungibleNombre');
    const scopeEl = document.getElementById('selectNuevoFungibleAlcance');
    const ratioEl = document.getElementById('inputNuevoFungibleRatio');
    const canalEl = document.getElementById('selectNuevoFungibleCanal');

    const nombre = (nombreEl?.value || '').trim();
    if (!nombre) {
      showToast('⚠️ Escribe el nombre del material antes de añadirlo.');
      return;
    }

    if (!fungiblesByTest[activeTestType]) fungiblesByTest[activeTestType] = [];
    fungiblesByTest[activeTestType].push({
      nombre,
      scope: scopeEl?.value || 'paciente',
      ratio: Math.max(0, parseFloat(ratioEl?.value || '1') || 1),
      canal: canalEl?.value || 'GALARIA'
    });

    if (nombreEl) nombreEl.value = '';
    saveFungiblesByTest();
    renderEditorMaterialesPrueba();
    recalcularFungiblesConsolidados();
    showToast(`➕ "${nombre}" añadido al protocolo de ${TEST_TYPE_LABELS[activeTestType] || activeTestType}.`);
  }

  function eliminarFungibleDePrueba(idx) {
    const list = fungiblesByTest[activeTestType];
    if (!list || !list[idx]) return;
    const removed = list.splice(idx, 1);
    saveFungiblesByTest();
    renderEditorMaterialesPrueba();
    recalcularFungiblesConsolidados();
    if (removed[0]) showToast(`🗑️ "${removed[0].nombre}" quitado de esta prueba.`);
  }

  // ==========================================================================
  // CÁLCULO AUTOMÁTICO DE FUNGIBLES SEMANAL POR PACIENTES HECHOS Y FINALIZADOS
  // ==========================================================================

  const DIAS_SEMANA_KEYS = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
  const DIAS_SEMANA_INFO = {
    lunes: { label: 'Lunes', diaNum: '17 Nov', sub: 'Actividad ordinaria' },
    martes: { label: 'Martes', diaNum: '18 Nov', sub: 'Actividad ordinaria' },
    miercoles: { label: 'Miércoles', diaNum: '19 Nov', sub: 'Actividad ordinaria' },
    jueves: { label: 'Jueves', diaNum: '20 Nov', sub: 'Actividad ordinaria' },
    viernes: { label: 'Viernes', diaNum: '21 Nov', sub: 'Actividad ordinaria' },
    sabado: { label: 'Sábado', diaNum: '22 Nov', sub: 'Sin actividad programada' },
    domingo: { label: 'Domingo', diaNum: '23 Nov', sub: 'Sin actividad programada' }
  };

  // Registro de pacientes REALES hechos y finalizados (completados y con alta médica)
  // Si un día no hay pacientes (p. ej. sábado y domingo), tiene 0 pacientes y NO suma nada al consumo semanal
  let pacientesFinalizadosSemana = {
    lunes: { fdg: 14, fdg_contraste: 3, fdg_endocarditis: 1, psma: 4, colina: 2, dotatoc: 0, mn_conv: 0, turnos: 2 },
    martes: { fdg: 16, fdg_contraste: 4, fdg_endocarditis: 1, psma: 3, colina: 2, dotatoc: 0, mn_conv: 0, turnos: 2 },
    miercoles: { fdg: 15, fdg_contraste: 3, fdg_endocarditis: 0, psma: 5, colina: 2, dotatoc: 0, mn_conv: 0, turnos: 2 },
    jueves: { fdg: 13, fdg_contraste: 3, fdg_endocarditis: 1, psma: 4, colina: 1, dotatoc: 1, mn_conv: 0, turnos: 2 },
    viernes: { fdg: 12, fdg_contraste: 2, fdg_endocarditis: 0, psma: 4, colina: 2, dotatoc: 0, mn_conv: 0, turnos: 2 },
    sabado: { fdg: 0, fdg_contraste: 0, fdg_endocarditis: 0, psma: 0, colina: 0, dotatoc: 0, mn_conv: 0, turnos: 0 },
    domingo: { fdg: 0, fdg_contraste: 0, fdg_endocarditis: 0, psma: 0, colina: 0, dotatoc: 0, mn_conv: 0, turnos: 0 }
  };

  // 1. SINCRONIZAR PACIENTES HECHOS Y FINALIZADOS DESDE EL ECOSISTEMA
  function sincronizarPacientesFinalizadosSemana() {
    let finalizadosReales = [];

    // Leer lista de TSID (Tomógrafo) y verificar pacientes con estudio "done" o alta médica
    try {
      const tsidWorklist = JSON.parse(localStorage.getItem('PET_TSID_WORKLIST_V1') || '[]');
      if (Array.isArray(tsidWorklist) && tsidWorklist.length > 0) {
        tsidWorklist.forEach(p => {
          const isDone = (p.estado === 'done' || p.altaMedicaAutorizada === true || p.horaSalidaCamilla || p.horaFin);
          if (isDone) finalizadosReales.push(p);
        });
      }
    } catch (_) {}

    // Leer diccionarios compartidos de altas autorizadas
    try {
      const dischargeMap = JSON.parse(localStorage.getItem('PET_SHARED_DISCHARGE_V1') || '{}');
      Object.values(dischargeMap).forEach(d => {
        if (d && (d.altaMedicaAutorizada || d.horaAltaMedica || d.horaAlta)) {
          finalizadosReales.push(d);
        }
      });
    } catch (_) {}

    // Si hay datos en vivo en el tomógrafo, actualizar la jornada actual
    if (finalizadosReales.length > 0) {
      const conteoHoy = { fdg: 0, fdg_contraste: 0, fdg_endocarditis: 0, psma: 0, colina: 0, dotatoc: 0, mn_conv: 0, turnos: 2 };
      finalizadosReales.forEach(p => {
        const est = (p["Tipo de Estudio PET Solicitado"] || p.tipo_estudio || p.estudio || p.protocolo || "").toLowerCase();
        if (est.includes("contraste") || est.includes("contrastada")) conteoHoy.fdg_contraste++;
        else if (est.includes("endocarditis") || est.includes("hep")) conteoHoy.fdg_endocarditis++;
        else if (est.includes("psma")) conteoHoy.psma++;
        else if (est.includes("colina") || est.includes("fluorcolina") || est.includes("paratiroides")) conteoHoy.colina++;
        else if (est.includes("dotatoc") || est.includes("dotatate") || est.includes("somatostatina")) conteoHoy.dotatoc++;
        else if (est.includes("medicina nuclear") || est.includes("spect")) conteoHoy.mn_conv++;
        else conteoHoy.fdg++;
      });

      // Mapear al día actual de la semana (o viernes si es fin de semana)
      const dayIdx = new Date().getDay(); // 0 dom, 1 lun, 2 mar...
      const dayKeyMap = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
      const targetKey = dayKeyMap[dayIdx] || 'lunes';
      if (targetKey !== 'sabado' && targetKey !== 'domingo') {
        pacientesFinalizadosSemana[targetKey] = conteoHoy;
      }
      showToast(`🔄 Pacientes finalizados sincronizados: ${finalizadosReales.length} estudios completados con alta.`);
    } else {
      showToast('🔄 Registro semanal de pacientes hechos y finalizados actualizado.');
    }

    renderDiasSemanaFinalizados();
    recalcularFungiblesConsolidados();
  }

  // 2. RENDERIZAR LAS TARJETAS SEMANALES (LUNES A DOMINGO)
  function renderDiasSemanaFinalizados() {
    const contenedor = document.getElementById('contenedorDiasSemanaFinalizados');
    let totalSemanalPacientes = 0;
    let totalTurnosOperativos = 0;

    DIAS_SEMANA_KEYS.forEach(diaKey => {
      const datosDia = pacientesFinalizadosSemana[diaKey] || {};
      const sumaPacientesDia = Object.keys(TEST_TYPE_LABELS).reduce((acc, k) => acc + (datosDia[k] || 0), 0);
      totalSemanalPacientes += sumaPacientesDia;
      totalTurnosOperativos += (datosDia.turnos || 0);
    });

    if (contenedor) {
      contenedor.innerHTML = DIAS_SEMANA_KEYS.map(diaKey => {
        const info = DIAS_SEMANA_INFO[diaKey];
        const datosDia = pacientesFinalizadosSemana[diaKey] || {};
        const sumaPacientesDia = Object.keys(TEST_TYPE_LABELS).reduce((acc, k) => acc + (datosDia[k] || 0), 0);
        const isZero = sumaPacientesDia === 0;

        // Desglose de estudios de ese día
        const resumenPruebas = [];
        if (datosDia.fdg > 0) resumenPruebas.push(`${datosDia.fdg} FDG`);
        if (datosDia.fdg_contraste > 0) resumenPruebas.push(`${datosDia.fdg_contraste} Contr`);
        if (datosDia.fdg_endocarditis > 0) resumenPruebas.push(`${datosDia.fdg_endocarditis} Endo`);
        if (datosDia.psma > 0) resumenPruebas.push(`${datosDia.psma} PSMA`);
        if (datosDia.colina > 0) resumenPruebas.push(`${datosDia.colina} Col`);
        if (datosDia.dotatoc > 0) resumenPruebas.push(`${datosDia.dotatoc} DOTA`);
        if (datosDia.mn_conv > 0) resumenPruebas.push(`${datosDia.mn_conv} MN`);

        const desgloseHtml = isZero
          ? 'Sin actividad · 0 gasto'
          : resumenPruebas.join(' · ');

        return `
          <div class="weekly-day-card ${isZero ? 'is-zero' : 'has-patients'}">
            <div class="weekly-day-title">
              <span>${escapeHTML(info.label)}</span>
              <span style="font-size:0.68rem; color:#64748b; font-weight:600;">${escapeHTML(info.diaNum)}</span>
            </div>
            <div class="weekly-day-count">
              ${isZero ? '0 pac.' : `${sumaPacientesDia} pac.`}
            </div>
            <div class="weekly-day-sub" title="${escapeHTML(desgloseHtml)}">
              ${isZero ? '<span style="color:#94a3b8;">No suma consumo</span>' : `<span style="color:#0f766e; font-weight:700;">${escapeHTML(desgloseHtml)}</span>`}
            </div>
            <div style="margin-top:4px; font-size:0.65rem; color:#64748b;">
              ${datosDia.turnos > 0 ? `⏱️ ${datosDia.turnos} turnos` : '⚪ 0 turnos'}
            </div>
          </div>
        `;
      }).join('');
    }

    const badgeTot = document.getElementById('badgeTotalPacientesSemana');
    if (badgeTot) {
      badgeTot.textContent = `${totalSemanalPacientes} Pacientes Hechos y Finalizados (${totalTurnosOperativos} Turnos Operativos)`;
    }
  }

  // 3. EDITOR DEL PROTOCOLO DE MATERIALES DE LA PRUEBA SELECCIONADA
  function renderEditorMaterialesPrueba() {
    const sel = document.getElementById('selectTipoPruebaFungible');
    if (sel && sel.value !== activeTestType) sel.value = activeTestType;

    const tbody = document.getElementById('tablaCalculoFungiblesBody');
    if (!tbody) return;

    const list = fungiblesByTest[activeTestType] || [];
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:#94a3b8; padding:0.8rem;">No hay materiales configurados para esta prueba. Añade uno arriba.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map((it, idx) => `
      <tr>
        <td><strong>${escapeHTML(it.nombre)}</strong></td>
        <td>
          <select class="period-select" style="padding:3px 6px; font-size:0.75rem; background:#fff;"
            onchange="window.supervisionApp.updateFungibleParam(${idx}, 'scope', this.value)">
            <option value="paciente" ${it.scope === 'paciente' ? 'selected' : ''}>👤 Por Paciente Finalizado</option>
            <option value="turno" ${it.scope === 'turno' ? 'selected' : ''}>⏱️ Por Turno Activo</option>
          </select>
        </td>
        <td>
          <input type="number" step="0.5" min="0" value="${it.ratio}"
            style="width:65px; padding:3px 6px; border:1px solid #cbd5e1; border-radius:6px; font-family:'JetBrains Mono',monospace; font-weight:700;"
            onchange="window.supervisionApp.updateFungibleParam(${idx}, 'ratio', this.value)">
        </td>
        <td>
          <select class="period-select" style="padding:3px 6px; font-size:0.75rem; background:#fff;"
            onchange="window.supervisionApp.updateFungibleParam(${idx}, 'canal', this.value)">
            <option value="GALARIA" ${it.canal === 'GALARIA' ? 'selected' : ''}>🔵 GALARIA</option>
            <option value="SERGAS" ${it.canal === 'SERGAS' ? 'selected' : ''}>🟢 SERGAS (LOGAS)</option>
          </select>
        </td>
        <td class="no-print">
          <button type="button" class="btn-nurse btn-nurse-outline" style="padding:2px 6px; font-size:0.7rem; color:#dc2626; border-color:#fecaca;"
            onclick="window.supervisionApp.eliminarFungibleDePrueba(${idx})" title="Eliminar material">🗑️</button>
        </td>
      </tr>
    `).join('');
  }

  // ==========================================================================
  // MEDICACIÓN Y FÁRMACOS PAUTADOS POR MÉDICOS EN PROTOCOLIZACIÓN
  // ==========================================================================
  function obtenerMedicacionesPautadasPorMedicos() {
    const listadoMedicaciones = [];

    // Fuente 1: PET_MEDICAL_PROTOCOLS_V1
    let storedProtocols = {};
    try {
      storedProtocols = JSON.parse(localStorage.getItem('PET_MEDICAL_PROTOCOLS_V1') || '{}');
    } catch (_) {}

    // Fuente 2: PET_DATABASE_MASTER_V4
    let masterList = [];
    try {
      masterList = JSON.parse(localStorage.getItem('PET_DATABASE_MASTER_V4') || '[]');
    } catch (_) {}

    const todosProtocolos = Object.assign({}, storedProtocols);
    if (Array.isArray(masterList)) {
      masterList.forEach(item => {
        const key = item["Submission ID"] || item.id || item["NHC / Historia Clínica"] || item.nhc;
        if (key && item.protocoloMedico) {
          if (!todosProtocolos[key]) todosProtocolos[key] = item.protocoloMedico;
        }
      });
    }

    Object.entries(todosProtocolos).forEach(([key, proto]) => {
      if (!proto || (!proto.completed && !proto.timestamp)) return;

      const pacienteNombre = proto.patientName || 'Paciente';
      const pacienteNHC = proto.patientNHC || proto.patientId || key;
      const medico = proto.doctorName || proto.doctorSign || 'Facultativo de Medicina Nuclear';
      const fecha = proto.timestamp || new Date().toLocaleDateString('es-ES');

      // 1. Diurético (Furosemida)
      if (proto.diuretic && proto.diuretic !== 'no') {
        listadoMedicaciones.push({
          id: `med_diur_${key}`,
          paciente: pacienteNombre,
          nhc: pacienteNHC,
          medicamento: 'Furosemida (Seguril) 20 mg ampolla IV',
          dosis: '1 ampolla (20 mg / 2 mL)',
          via: 'Intravenosa lenta (15-20 min post-inyección)',
          indicacion: 'Lavado vesical y estasis pélvica',
          canal: 'SERGAS',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          medico,
          fecha,
          origen: 'Protocolo Médico Oficial'
        });
      }

      // 2. Contraste Iodado IV
      if (proto.contrastType === 'en_maquina' || proto.contrastType === 'en_box' || proto.contrast === 'civ_portal') {
        const esBox = (proto.contrastType === 'en_box');
        listadoMedicaciones.push({
          id: `med_civ_${key}`,
          paciente: pacienteNombre,
          nhc: pacienteNHC,
          medicamento: esBox
            ? `Contraste IV en Box (${proto.contrastBoxMinutes || 15} min antes)`
            : 'Contraste Iodado CIV no iónico (100-120 mL)',
          dosis: '1 frasco 100 mL + Alargadera Inyector',
          via: 'Intravenosa rápida por inyector camilla',
          indicacion: 'Fase portal / Diagnóstica CT acoplada',
          canal: 'SERGAS',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          medico,
          fecha,
          origen: 'Protocolo Médico Oficial'
        });
      }

      // 3. Medicación adicional explícita pautada por el médico
      if (proto.medicacionPautada && proto.medicacionPautada.trim() && proto.medicacionPautada !== 'ninguna') {
        listadoMedicaciones.push({
          id: `med_add_${key}`,
          paciente: pacienteNombre,
          nhc: pacienteNHC,
          medicamento: proto.medicacionPautada,
          dosis: proto.dosisMedicacion || '1 dosis protocolizada',
          via: proto.viaMedicacion || 'Según prescripción médica',
          indicacion: proto.indicacionMedicacion || 'Pauta médica complementaria en protocolo',
          canal: 'SERGAS',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          medico,
          fecha,
          origen: 'Prescripción en Protocolización'
        });
      }

      // 4. Búsqueda en texto libre de notas clínicas del médico
      if (proto.doctorNotes) {
        const textNotes = proto.doctorNotes.toLowerCase();
        if (textNotes.includes('diazepam') && !listadoMedicaciones.some(m => m.nhc === pacienteNHC && m.medicamento.toLowerCase().includes('diazepam'))) {
          listadoMedicaciones.push({
            id: `med_diaz_${key}`,
            paciente: pacienteNombre,
            nhc: pacienteNHC,
            medicamento: 'Diazepam 5 mg comprimido oral',
            dosis: '1 comp. 5 mg',
            via: 'Vía oral 30 min antes de inyección',
            indicacion: 'Inhibición de captación en grasa parda / relajación muscular',
            canal: 'SERGAS',
            proveedor: 'Farmacia Hospitalaria SERGAS',
            medico,
            fecha,
            origen: 'Observaciones de Protocolo Médico'
          });
        }
        if ((textNotes.includes('polaramine') || textNotes.includes('dexclorfeniramina')) && !listadoMedicaciones.some(m => m.nhc === pacienteNHC && m.medicamento.toLowerCase().includes('polaramine'))) {
          listadoMedicaciones.push({
            id: `med_pol_${key}`,
            paciente: pacienteNombre,
            nhc: pacienteNHC,
            medicamento: 'Dexclorfeniramina (Polaramine) 5 mg ampolla IV',
            dosis: '1 ampolla (5 mg)',
            via: 'Intravenosa lenta',
            indicacion: 'Premedicación antialérgica profiláctica',
            canal: 'SERGAS',
            proveedor: 'Farmacia Hospitalaria SERGAS',
            medico,
            fecha,
            origen: 'Observaciones de Protocolo Médico'
          });
        }
        if ((textNotes.includes('urbason') || textNotes.includes('metilprednisolona')) && !listadoMedicaciones.some(m => m.nhc === pacienteNHC && m.medicamento.toLowerCase().includes('urbason'))) {
          listadoMedicaciones.push({
            id: `med_urb_${key}`,
            paciente: pacienteNombre,
            nhc: pacienteNHC,
            medicamento: 'Metilprednisolona (Urbason) 40 mg ampolla IV',
            dosis: '1 vial (40 mg)',
            via: 'Intravenosa lenta',
            indicacion: 'Pauta profiláctica antialérgica para contraste',
            canal: 'SERGAS',
            proveedor: 'Farmacia Hospitalaria SERGAS',
            medico,
            fecha,
            origen: 'Observaciones de Protocolo Médico'
          });
        }
        if (textNotes.includes('insulina') && !listadoMedicaciones.some(m => m.nhc === pacienteNHC && m.medicamento.toLowerCase().includes('insulina'))) {
          listadoMedicaciones.push({
            id: `med_ins_${key}`,
            paciente: pacienteNombre,
            nhc: pacienteNHC,
            medicamento: 'Insulina Rápida (Rescate glucémico protocolizado)',
            dosis: '2-4 UI SC según glucemia capilar',
            via: 'Subcutánea en box',
            indicacion: 'Rescate hiperglucemia previa a inyección 18F-FDG',
            canal: 'SERGAS',
            proveedor: 'Farmacia Hospitalaria SERGAS',
            medico,
            fecha,
            origen: 'Observaciones de Protocolo Médico'
          });
        }
      }
    });

    // Semilla asistencial activa
    if (listadoMedicaciones.length === 0) {
      listadoMedicaciones.push(
        {
          id: 'med_demo_1',
          paciente: 'FERREIRA DAVILAS',
          nhc: '71236148',
          medicamento: 'Contraste Iodado no iónico (Iopamiron 300) 100 mL',
          dosis: '100 mL + Alargadera alta presión',
          via: 'CIV en tomógrafo (Fase portal 70s)',
          indicacion: 'Estadificación CPNCP y adenopatías mediastínicas',
          canal: 'SERGAS',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          medico: 'Dr. Manuel Gómez Feijóo',
          fecha: 'Hoy 08:30',
          origen: 'Protocolo Médico Oficial'
        },
        {
          id: 'med_demo_2',
          paciente: 'Manuel Piñeiro Castro',
          nhc: 'NHC-391042',
          medicamento: 'Furosemida (Seguril) 20 mg ampolla IV',
          dosis: '1 ampolla (20 mg / 2 mL)',
          via: 'Intravenosa lenta (15 min post-inyección)',
          indicacion: 'Aclaramiento y lavado vesical (Carcinoma urotelial)',
          canal: 'SERGAS',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          medico: 'Dra. Elena Vázquez',
          fecha: 'Hoy 09:15',
          origen: 'Protocolo Médico Oficial'
        },
        {
          id: 'med_demo_3',
          paciente: 'Carmen Lois Souto',
          nhc: 'NHC-741902',
          medicamento: 'Diazepam 5 mg comprimido oral',
          dosis: '1 comprimido 5 mg',
          via: 'Oral con sorbo de agua en box',
          indicacion: 'Evitar activación grasa parda supraclavicular/cervical',
          canal: 'SERGAS',
          proveedor: 'Farmacia Hospitalaria SERGAS',
          medico: 'Dr. Alberto Blanco',
          fecha: 'Ayer 11:00',
          origen: 'Protocolo Médico Oficial'
        }
      );
    }

    return listadoMedicaciones;
  }

  function renderTablaMedicacionesPautadas(meds) {
    const tbody = document.getElementById('tablaMedicacionPautadaMedicosBody');
    const badgeCount = document.getElementById('badgeMedicacionesPautadasCount');
    if (badgeCount) {
      badgeCount.textContent = `${meds.length} Pautas Activas`;
    }
    if (!tbody) return;

    if (meds.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1rem;">No hay medicaciones específicas pautadas en los protocolos médicos en este momento.</td></tr>';
      return;
    }

    tbody.innerHTML = meds.map(m => `
      <tr>
        <td>
          <strong>${escapeHTML(m.paciente)}</strong>
          <div style="font-family:'JetBrains Mono',monospace; font-size:0.7rem; color:#64748b;">${escapeHTML(m.nhc)}</div>
        </td>
        <td>
          <span style="font-weight:700; color:#0284c7;">${escapeHTML(m.medicamento)}</span>
          <div style="font-size:0.68rem; color:#64748b;">${escapeHTML(m.proveedor)}</div>
        </td>
        <td style="font-family:'JetBrains Mono',monospace; font-size:0.74rem;">
          ${escapeHTML(m.dosis)}
          <div style="font-size:0.68rem; color:#475569;">${escapeHTML(m.via)}</div>
        </td>
        <td style="font-size:0.75rem; color:#334155;">
          ${escapeHTML(m.indicacion)}
        </td>
        <td style="font-size:0.75rem; color:#0f766e; font-weight:600;">
          ✍️ ${escapeHTML(m.medico)}
        </td>
        <td style="font-family:'JetBrains Mono',monospace; font-size:0.72rem; color:#64748b;">
          ${escapeHTML(m.fecha)}
        </td>
        <td>
          <span class="status-badge badge-ok" style="font-size:0.68rem;">✓ Sumado a Pedido Semanal</span>
        </td>
      </tr>
    `).join('');
  }

  function sincronizarMedicacionesPautadas() {
    showToast('🔄 Pautas de medicación de protocolos médicos sincronizadas.');
    recalcularFungiblesConsolidados();
  }

  // 4. CÁLCULO TOTAL CONSOLIDADO SEMANAL (SUMA DÍA A DÍA DE PACIENTES FINALIZADOS + MEDICACIÓN PAUTADA)
  function recalcularFungiblesConsolidados() {
    renderDiasSemanaFinalizados();
    renderEditorMaterialesPrueba();

    const medsPautadas = obtenerMedicacionesPautadasPorMedicos();
    renderTablaMedicacionesPautadas(medsPautadas);

    const tbody = document.getElementById('tablaTotalConsolidadoDiaBody');
    if (!tbody) return;

    const margenPct = Math.max(0, parseInt(document.getElementById('calcMargenPct')?.value || '10', 10) || 0);
    const factorMargen = 1 + (margenPct / 100);

    // Mapa acumulador de materiales por clave única (nombre + canal)
    const consolidadoSemanal = {};

    DIAS_SEMANA_KEYS.forEach(diaKey => {
      const diaData = pacientesFinalizadosSemana[diaKey] || {};
      const sumaPacientesDia = Object.keys(TEST_TYPE_LABELS).reduce((acc, k) => acc + (diaData[k] || 0), 0);
      const turnosDia = diaData.turnos || 0;

      // Si un día no hay pacientes, ese día NO suma nada al consumo semanal
      if (sumaPacientesDia === 0 && turnosDia === 0) {
        return;
      }

      const turnosYaContadosEnElDia = {};

      Object.keys(TEST_TYPE_LABELS).forEach(testKey => {
        const numPacientesPrueba = diaData[testKey] || 0;
        const materiales = fungiblesByTest[testKey] || [];

        materiales.forEach(mat => {
          const matKey = `${mat.nombre}___${mat.canal}`;
          if (!consolidadoSemanal[matKey]) {
            consolidadoSemanal[matKey] = {
              nombre: mat.nombre,
              canal: mat.canal,
              scope: mat.scope,
              consumoBaseSemanal: 0,
              pacientesTotalSemana: 0,
              desglosePorDia: { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0, sabado: 0, domingo: 0 },
              pruebasImplicadas: new Set(),
              esMedicacionPautada: false,
              pacientesPautados: []
            };
          }

          if (mat.scope === 'paciente') {
            if (numPacientesPrueba > 0 && mat.ratio > 0) {
              const gasto = numPacientesPrueba * mat.ratio;
              consolidadoSemanal[matKey].consumoBaseSemanal += gasto;
              consolidadoSemanal[matKey].pacientesTotalSemana += numPacientesPrueba;
              consolidadoSemanal[matKey].desglosePorDia[diaKey] = (consolidadoSemanal[matKey].desglosePorDia[diaKey] || 0) + gasto;
              consolidadoSemanal[matKey].pruebasImplicadas.add(TEST_TYPE_LABELS[testKey]?.split(' ')[0] || testKey);
            }
          } else if (mat.scope === 'turno') {
            if (turnosDia > 0 && !turnosYaContadosEnElDia[matKey]) {
              const gastoTurno = turnosDia * mat.ratio;
              consolidadoSemanal[matKey].consumoBaseSemanal += gastoTurno;
              consolidadoSemanal[matKey].desglosePorDia[diaKey] = (consolidadoSemanal[matKey].desglosePorDia[diaKey] || 0) + gastoTurno;
              turnosYaContadosEnElDia[matKey] = true;
              consolidadoSemanal[matKey].pruebasImplicadas.add('Tomógrafo PET');
            }
          }
        });
      });
    });

    // INTEGRAR AUTOMÁTICAMENTE CADA MEDICAMENTO PAUTADO POR MÉDICOS EN PROTOCOLO
    medsPautadas.forEach(med => {
      const medKey = `${med.medicamento}___${med.canal}`;
      if (!consolidadoSemanal[medKey]) {
        consolidadoSemanal[medKey] = {
          nombre: med.medicamento,
          canal: med.canal,
          scope: 'protocolo_medico',
          consumoBaseSemanal: 0,
          pacientesTotalSemana: 0,
          desglosePorDia: { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0, sabado: 0, domingo: 0 },
          pruebasImplicadas: new Set(),
          esMedicacionPautada: true,
          pacientesPautados: []
        };
      }
      consolidadoSemanal[medKey].consumoBaseSemanal += 1;
      consolidadoSemanal[medKey].pacientesTotalSemana += 1;
      consolidadoSemanal[medKey].esMedicacionPautada = true;
      consolidadoSemanal[medKey].pacientesPautados.push(`${med.paciente} (${med.nhc})`);
      consolidadoSemanal[medKey].pruebasImplicadas.add(`🩺 Pautado por ${med.medico.split('(')[0].trim()}`);
      consolidadoSemanal[medKey].desglosePorDia['lunes'] = (consolidadoSemanal[medKey].desglosePorDia['lunes'] || 0) + 1;
    });

    const items = Object.values(consolidadoSemanal).filter(it => it.consumoBaseSemanal > 0);

    let totalGalariaSemanal = 0;
    let totalSergasSemanal = 0;

    items.forEach(it => {
      it.totalPedidoSemanal = Math.ceil(it.consumoBaseSemanal * factorMargen);
      if (it.canal === 'GALARIA') totalGalariaSemanal += it.totalPedidoSemanal;
      else totalSergasSemanal += it.totalPedidoSemanal;
    });

    const badgeGal = document.getElementById('badgeTotalItemsGalaria');
    if (badgeGal) badgeGal.textContent = `🔵 Galaria Semanal: ${totalGalariaSemanal} uds`;
    const badgeSer = document.getElementById('badgeTotalItemsSergas');
    if (badgeSer) badgeSer.textContent = `🟢 SERGAS Semanal: ${totalSergasSemanal} uds`;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:1.25rem;">No hay consumo semanal registrado (0 pacientes finalizados). Configura los fungibles de las pruebas arriba.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(it => {
      const diasDetalle = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].map(d => {
        const val = it.desglosePorDia[d] || 0;
        return `<span style="font-size:0.72rem; color:${val > 0 ? '#0f766e' : '#94a3b8'};">${d.slice(0, 3)}: <strong>${Math.round(val)}</strong></span>`;
      }).join(' · ');

      let formulaTexto = '';
      if (it.esMedicacionPautada) {
        formulaTexto = `🩺 Pautado en Protocolo: ${it.pacientesPautados.join(', ')} (${Array.from(it.pruebasImplicadas).join(', ')})`;
      } else if (it.scope === 'paciente') {
        formulaTexto = `${it.pacientesTotalSemana} pac. finalizados (${Array.from(it.pruebasImplicadas).join(', ')})`;
      } else {
        formulaTexto = `10 turnos operativos activos (Tomógrafo PET)`;
      }

      return `
        <tr style="${it.esMedicacionPautada ? 'background:#f0f9ff;' : ''}">
          <td>
            <strong>${escapeHTML(it.nombre)}</strong>
            ${it.esMedicacionPautada ? '<span class="status-badge" style="background:#fef3c7; color:#b45309; border:1px solid #fcd34d; font-size:0.65rem; margin-left:6px;">🩺 Pautado en Protocolo</span>' : ''}
          </td>
          <td>
            <span class="status-badge ${it.canal === 'GALARIA' ? 'badge-info' : 'badge-ok'}">
              ${it.canal === 'GALARIA' ? '🔵 GALARIA' : '🟢 SERGAS (Farmacia / LOGAS)'}
            </span>
          </td>
          <td>
            <span class="breakdown-badge" style="${it.esMedicacionPautada ? 'background:#e0f2fe; color:#0369a1;' : ''}">
              ${escapeHTML(formulaTexto)}
            </span>
          </td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:700; color:#004868;">
            ${Math.round(it.consumoBaseSemanal)} uds
          </td>
          <td style="font-family:'JetBrains Mono',monospace; font-weight:800; color:#059669; font-size:1.05rem;">
            ${it.totalPedidoSemanal} uds
          </td>
          <td>
            <div style="font-family:'JetBrains Mono',monospace; font-size:0.72rem;">
              ${diasDetalle}
            </div>
          </td>
          <td class="no-print">
            <button type="button" class="btn-nurse btn-nurse-outline" style="padding:2px 8px; font-size:0.72rem;"
              onclick="window.supervisionApp.abrirModalNuevoPedido('${it.canal}')">
              + Añadir
            </button>
          </td>
        </tr>
      `;
    }).join('');
  }

  // 5. GENERAR EL PEDIDO SEMANAL CONSOLIDADO (GALARIA O SERGAS)
  function generarPedidoSemanalConsolidado(canal) {
    const margenPct = Math.max(0, parseInt(document.getElementById('calcMargenPct')?.value || '10', 10) || 0);
    const factorMargen = 1 + (margenPct / 100);

    const consolidadoSemanal = {};
    let totalPacientesSemana = 0;
    let turnosSemanales = 0;

    DIAS_SEMANA_KEYS.forEach(diaKey => {
      const diaData = pacientesFinalizadosSemana[diaKey] || {};
      const sumaPacientesDia = Object.keys(TEST_TYPE_LABELS).reduce((acc, k) => acc + (diaData[k] || 0), 0);
      const turnosDia = diaData.turnos || 0;

      if (sumaPacientesDia === 0 && turnosDia === 0) return;

      totalPacientesSemana += sumaPacientesDia;
      turnosSemanales += turnosDia;

      const turnosContados = {};

      Object.keys(TEST_TYPE_LABELS).forEach(testKey => {
        const numPacientesPrueba = diaData[testKey] || 0;
        const materiales = fungiblesByTest[testKey] || [];

        materiales.forEach(mat => {
          if (mat.canal !== canal) return;
          const matKey = `${mat.nombre}___${mat.canal}`;
          if (!consolidadoSemanal[matKey]) {
            consolidadoSemanal[matKey] = { nombre: mat.nombre, canal: mat.canal, consumoBase: 0 };
          }

          if (mat.scope === 'paciente') {
            if (numPacientesPrueba > 0 && mat.ratio > 0) {
              consolidadoSemanal[matKey].consumoBase += (numPacientesPrueba * mat.ratio);
            }
          } else if (mat.scope === 'turno') {
            if (turnosDia > 0 && !turnosContados[matKey]) {
              consolidadoSemanal[matKey].consumoBase += (turnosDia * mat.ratio);
              turnosContados[matKey] = true;
            }
          }
        });
      });
    });

    // Añadir medicaciones pautadas al pedido SERGAS
    if (canal === 'SERGAS') {
      const meds = obtenerMedicacionesPautadasPorMedicos();
      meds.forEach(med => {
        const matKey = `${med.medicamento}___${med.canal}`;
        if (!consolidadoSemanal[matKey]) {
          consolidadoSemanal[matKey] = { nombre: med.medicamento, canal: med.canal, consumoBase: 0 };
        }
        consolidadoSemanal[matKey].consumoBase += 1;
      });
    }

    const items = Object.values(consolidadoSemanal).filter(x => x.consumoBase > 0);
    if (items.length === 0) {
      showToast(`⚠️ No hay materiales calculados para ${canal} en el consumo semanal.`);
      return;
    }

    items.forEach(it => {
      it.totalPedido = Math.ceil(it.consumoBase * factorMargen);
    });

    const totalUnidades = items.reduce((acc, x) => acc + x.totalPedido, 0);
    const resumenLineas = items.map(x => `${x.nombre}: ${x.totalPedido} uds`).join(' · ');
    const numPed = Math.floor(100 + Math.random() * 900);
    const fechaHoy = new Date().toLocaleDateString('es-ES');

    const nuevo = {
      id: `${canal === 'GALARIA' ? 'GAL' : 'SER'}-2026-SEM-${numPed}`,
      canal,
      categoria: canal === 'SERGAS' ? 'Fungibles y Medicación SERGAS' : 'Fungibles Galaria',
      descripcion: `Consumo Semanal (${totalPacientesSemana} pac. finalizados · ${turnosSemanales} turnos): ${resumenLineas}`,
      proveedor: canal === 'GALARIA' ? 'Galaria · Logística PET-CT' : 'Farmacia Hospitalaria & Almacén SERGAS (LOGAS)',
      cantidad: `${totalUnidades} uds semanales`,
      fecha: `${fechaHoy} (Semana)`,
      estado: 'transito',
      supervision: 'Supervisora de Turno (DUE)',
      observaciones: `Cálculo automático semanal por pacientes finalizados y medicación pautada en protocolo médico (+${margenPct}% margen).`
    };

    state.pedidos.unshift(nuevo);
    saveNurseData();
    renderPedidosTable();
    cambiarTab('pedidos');

    if (canal === 'SERGAS') {
      const textoLogas = `PEDIDO SEMANAL SERGAS LOGAS & FARMACIA (${fechaHoy}):\n` +
        items.map(it => `- ${it.nombre}: ${it.totalPedido} uds`).join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(textoLogas).catch(() => {});
      }
      showToast('🟢 Pedido Semanal SERGAS generado (incluyendo medicación pautada por médicos). Copiado para LOGAS.');
    } else {
      showToast('🔵 Pedido Semanal GALARIA generado con todos los fungibles calculados.');
    }
  }

  // Compatibilidad hacia atrás con alias anteriores
  function recalcularFungibles() {
    return recalcularFungiblesConsolidados();
  }

  function recalcularConsumoSemanal() {
    return recalcularFungiblesConsolidados();
  }

  function generarPedidoDiaConsolidado(canal) {
    return generarPedidoSemanalConsolidado(canal);
  }

  function generarPedidoDesdeCalculadora(canal) {
    return generarPedidoSemanalConsolidado(canal);
  }

  function sincronizarPacientesDelDia() {
    return sincronizarPacientesFinalizadosSemana();
  }

  function cambiarDiaCalculo() {
    return recalcularFungiblesConsolidados();
  }

  function cambiarPacientesPrueba() {
    return recalcularFungiblesConsolidados();
  }

  function renderContadoresPacientesPorPrueba() {
    return renderDiasSemanaFinalizados();
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

  function onCambioCanalPedido(canal) {
    const selProv = document.getElementById('selectPedidoProveedor');
    if (!selProv) return;
    if (canal === 'GALARIA') {
      selProv.value = 'Galaria · Logística PET-CT';
    } else {
      selProv.value = 'Almacén Central SERGAS (LOGAS)';
    }
  }

  function abrirModalNuevoPedido(canalPre = 'GALARIA') {
    const selCanal = document.getElementById('selectPedidoCanal');
    if (selCanal && (canalPre === 'GALARIA' || canalPre === 'SERGAS')) {
      selCanal.value = canalPre;
      onCambioCanalPedido(canalPre);
    }
    const modal = document.getElementById('modalNuevoPedido');
    if (modal) modal.classList.add('active');
  }

  function cerrarModalNuevoPedido() {
    const modal = document.getElementById('modalNuevoPedido');
    if (modal) modal.classList.remove('active');
  }

  function guardarNuevoPedido() {
    const canal = document.getElementById('selectPedidoCanal')?.value || 'GALARIA';
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
      id: `${canal === 'GALARIA' ? 'GAL' : 'SER'}-2026-${numPed}`,
      canal,
      categoria,
      descripcion,
      proveedor,
      cantidad,
      fecha: new Date().toLocaleDateString('es-ES') + ' (' + prioridad.toUpperCase() + ')',
      estado: 'transito',
      supervision: 'Supervisora de Turno (DUE)',
      observaciones: `Prioridad: ${prioridad}. Tramitado vía ${canal === 'GALARIA' ? 'GALARIA' : 'LOGAS SERGAS'}.`
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
  const PLANILLA_STORAGE_EXTRAS = 'PET_PLANILLA_EXTRAS_V1';
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
        { id: 'manana_tm', title: '☀️ Mañana · Terapia Metabólica', sub: '08:00 – 15:00 h', headerBg: '#ffedd5' },
        { id: 'manana_orense', title: '☀️ Mañana · Orense', sub: '08:00 – 15:00 h', headerBg: '#fce7f3' }
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
        { id: 'manana_mn', title: '☀️ Mañana · Med. Nuclear', sub: '08:00 – 15:00 h', headerBg: '#dcfce7' },
        { id: 'manana_orense', title: '☀️ Mañana · Orense', sub: '08:00 – 15:00 h', headerBg: '#fce7f3' }
      ]},
      { bandId: 'tarde', label: '🌆 TURNO TARDE (15:00 – 22:00 h)', bandClass: 'planilla-band-tarde', target: 3, cols: [
        { id: 'tarde_pet', title: '🌆 Tarde · PET-CT', sub: '15:00 – 22:00 h', headerBg: '#fef3c7' },
        { id: 'tarde_mn', title: '🌆 Tarde · Med. Nuclear', sub: '15:00 – 22:00 h', headerBg: '#ede9fe' }
      ]}
    ],
    celadores: [
      { bandId: 'manana', label: '☀️ TURNO MAÑANA (08:00 – 15:00 h)', bandClass: 'planilla-band-manana', target: 1, cols: [
        { id: 'manana_pet', title: '☀️ Mañana · Unidad MN/PET', sub: '08:00 – 15:00 h', headerBg: '#e0f2fe' },
        { id: 'manana_orense', title: '☀️ Mañana · Orense', sub: '08:00 – 15:00 h', headerBg: '#fce7f3' }
      ]},
      { bandId: 'tarde', label: '🌆 TURNO TARDE (15:00 – 22:00 h)', bandClass: 'planilla-band-tarde', target: 1, cols: [
        { id: 'tarde_pet', title: '🌆 Tarde · Unidad MN/PET', sub: '15:00 – 22:00 h', headerBg: '#fef3c7' }
      ]}
    ],
    tcaes: [
      { bandId: 'manana', label: '☀️ TURNO MAÑANA (08:00 – 15:00 h)', bandClass: 'planilla-band-manana', target: 2, cols: [
        { id: 'manana_pet', title: '☀️ Mañana · PET-CT', sub: '08:00 – 15:00 h', headerBg: '#e0f2fe' },
        { id: 'manana_mn', title: '☀️ Mañana · Med. Nuclear', sub: '08:00 – 15:00 h', headerBg: '#dcfce7' },
        { id: 'manana_orense', title: '☀️ Mañana · Orense', sub: '08:00 – 15:00 h', headerBg: '#fce7f3' }
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
    extraShiftsByDate: {},
    pendingDupWorkerId: null,
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
      const savedExtras = localStorage.getItem(PLANILLA_STORAGE_EXTRAS);
      planillaState.extraShiftsByDate = savedExtras ? JSON.parse(savedExtras) : {};
      if (!planillaState.extraShiftsByDate || typeof planillaState.extraShiftsByDate !== 'object') {
        planillaState.extraShiftsByDate = {};
      }
    } catch (_) {
      planillaState.extraShiftsByDate = {};
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
      localStorage.setItem(PLANILLA_STORAGE_EXTRAS, JSON.stringify(planillaState.extraShiftsByDate));
      localStorage.setItem(PLANILLA_STORAGE_CALENDAR, JSON.stringify(planillaState.confirmedCalendar));
    } catch (_) {}
  }

  function getExtrasForDate(dateStr) {
    const list = planillaState.extraShiftsByDate[dateStr];
    return Array.isArray(list) ? list : [];
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
    const extras = getExtrasForDate(planillaState.fecha);
    const extraObj = extras.find(x => x.id === workerId);
    if (extraObj) {
      extraObj.shift = shiftId;
      const allCols = getAllColsForCategory(extraObj.category);
      const shiftObj = allCols.find(s => s.id === shiftId);
      planillaState.selectedWorkerId = null;
      savePlanillaData();
      renderPlanillaTab();
      if (shiftObj) {
        showToast(`✅ ${extraObj.name} (H.Extra ${extraObj.extraHours}) movido a: ${shiftObj.title}`);
      }
      return;
    }

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

  function abrirModalDuplicarExtra(workerId, ev) {
    if (ev) ev.stopPropagation();
    const worker = planillaState.staff.find(w => w.id === workerId);
    if (!worker) return;
    planillaState.pendingDupWorkerId = workerId;

    const lbl = document.getElementById('lblWorkerDuplicarNombre');
    if (lbl) lbl.textContent = `${worker.name} (${worker.area})`;

    const sel = document.getElementById('selectTurnoDuplicarExtra');
    if (sel) {
      const bands = PLANILLA_BANDS_BY_CAT[worker.category] || PLANILLA_BANDS_BY_CAT.enfermeros;
      const cols = bands.reduce((acc, b) => acc.concat(b.cols), []);
      sel.innerHTML = cols.map(c => `<option value="${c.id}">${escapeHTML(c.title)} (${escapeHTML(c.sub)})</option>`).join('');
      const tardeCol = cols.find(c => c.id.startsWith('tarde'));
      if (tardeCol) sel.value = tardeCol.id;
    }

    const modal = document.getElementById('modalDuplicarHorasExtras');
    if (modal) modal.classList.add('active');
  }

  function cerrarModalDuplicarExtra() {
    const modal = document.getElementById('modalDuplicarHorasExtras');
    if (modal) modal.classList.remove('active');
    planillaState.pendingDupWorkerId = null;
  }

  function confirmarDuplicarExtra() {
    const workerId = planillaState.pendingDupWorkerId;
    const worker = planillaState.staff.find(w => w.id === workerId);
    if (!worker) {
      cerrarModalDuplicarExtra();
      return;
    }
    const shiftId = document.getElementById('selectTurnoDuplicarExtra')?.value || 'tarde_pet';
    const horas = (document.getElementById('inputHorasExtras')?.value || '').trim() || '7h';

    if (!planillaState.extraShiftsByDate[planillaState.fecha]) {
      planillaState.extraShiftsByDate[planillaState.fecha] = [];
    }
    planillaState.extraShiftsByDate[planillaState.fecha].push({
      id: `extra_${worker.id}_${Date.now()}`,
      baseWorkerId: worker.id,
      name: worker.name,
      category: worker.category,
      area: worker.area,
      shift: shiftId,
      isExtra: true,
      extraHours: horas
    });

    savePlanillaData();
    cerrarModalDuplicarExtra();
    renderPlanillaTab();
    showToast(`⏱️ Doble turno (${horas}) añadido para ${worker.name}.`);
  }

  function eliminarExtra(extraId, ev) {
    if (ev) ev.stopPropagation();
    const list = getExtrasForDate(planillaState.fecha);
    planillaState.extraShiftsByDate[planillaState.fecha] = list.filter(x => x.id !== extraId);
    if (planillaState.selectedWorkerId === extraId) planillaState.selectedWorkerId = null;
    savePlanillaData();
    renderPlanillaTab();
    showToast('🗑️ Doble turno eliminado.');
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
    const byShiftService = {
      manana: { pet: [], mn: [], tm: [], orense: [] },
      tarde: { pet: [], mn: [], tm: [], apoyo: [] },
      noche: { unidad: [], tm: [] }
    };

    const shortLabels = {
      enfermeros: 'DUE',
      tecnicos: 'TSID',
      celadores: 'Cel',
      tcaes: 'TCAE'
    };

    PLANILLA_CATEGORIES.forEach(cat => {
      const catWorkers = planillaState.staff.filter(w => w.category === cat.id);
      const catExtras = getExtrasForDate(fecha).filter(x => x.category === cat.id);
      const manana = [];
      const tarde = [];
      const noche = [];

      const pushEntry = (label, sh) => {
        const tag = `${shortLabels[cat.id]} ${label.split(' ')[0]}${label.includes('[H.Extra') ? ' ' + label.slice(label.indexOf('[H.Extra')) : ''}`;
        if (sh === 'manana_orense') {
          manana.push(`${label} (Orense)`);
          byShiftService.manana.orense.push(tag);
        } else if (sh === 'manana_pet') {
          manana.push(label);
          byShiftService.manana.pet.push(tag);
        } else if (sh === 'manana_mn') {
          manana.push(label);
          byShiftService.manana.mn.push(tag);
        } else if (sh === 'manana_tm') {
          manana.push(label);
          byShiftService.manana.tm.push(tag);
        } else if (sh === 'tarde_pet') {
          tarde.push(label);
          byShiftService.tarde.pet.push(tag);
        } else if (sh === 'tarde_mn') {
          tarde.push(label);
          byShiftService.tarde.mn.push(tag);
        } else if (sh === 'tarde_tm') {
          tarde.push(label);
          byShiftService.tarde.tm.push(tag);
        } else if (sh.startsWith('tarde')) {
          tarde.push(label);
          byShiftService.tarde.apoyo.push(tag);
        } else if (sh === 'noche_tm') {
          noche.push(label);
          byShiftService.noche.tm.push(tag);
        } else if (sh.startsWith('noche')) {
          noche.push(label);
          byShiftService.noche.unidad.push(tag);
        }
      };

      catWorkers.forEach(w => pushEntry(w.name, getWorkerShiftForDate(w, fecha)));
      catExtras.forEach(x => pushEntry(`${x.name} [H.Extra ${x.extraHours}]`, x.shift));
      summaryByCat[cat.id] = { manana, tarde, noche };
    });

    planillaState.confirmedCalendar[fecha] = {
      confirmedAt: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      categories: summaryByCat,
      byShiftService
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
    if (area === 'Orense') return 'worker-area-orense';
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
                const isExtra = Boolean(w.isExtra);
                return `
                  <div class="worker-card ${isSel ? 'selected' : ''} ${isExtra ? 'is-extra' : ''}"
                    draggable="true"
                    ondragstart="window.supervisionApp.onPlanillaDragStart(event, '${w.id}')"
                    onclick="event.stopPropagation(); window.supervisionApp.selectPlanillaWorker('${w.id}')">
                    <div class="worker-card-main">
                      <span class="worker-name">${escapeHTML(w.name)}</span>
                      <div class="worker-meta">
                        <span class="worker-area-pill ${getAreaBadgeClass(w.area)}">${escapeHTML(w.area)}</span>
                        ${isExtra ? `<span class="worker-extra-pill">⏱️ H.Extra: ${escapeHTML(w.extraHours)}</span>` : ''}
                      </div>
                    </div>
                    <div style="display:flex; align-items:center; gap:4px;">
                      ${!isExtra ? `<button type="button" class="worker-dup-btn no-print" title="Duplicar para doble turno / horas extras"
                        onclick="window.supervisionApp.abrirModalDuplicarExtra('${w.id}', event)">➕ H.Extra</button>` : ''}
                      <button type="button" class="worker-del-btn no-print" title="${isExtra ? 'Quitar doble turno' : 'Quitar de la plantilla'}"
                        onclick="${isExtra ? `window.supervisionApp.eliminarExtra('${w.id}', event)` : `window.supervisionApp.eliminarTrabajadorPlanilla('${w.id}', event)`}">🗑️</button>
                    </div>
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
      if (conf && conf.byShiftService) {
        const b = conf.byShiftService;
        const renderSvcLines = (svcObj, defs) => {
          return defs.map(d => {
            const list = (svcObj && svcObj[d.key]) || [];
            if (list.length === 0) return '';
            return `<div class="cal-svc-line"><span class="cal-svc-tag ${d.cls}">${d.label}</span> ${escapeHTML(list.join(', '))}</div>`;
          }).filter(Boolean).join('');
        };

        const mananaHtml = renderSvcLines(b.manana, [
          { key: 'pet', label: 'PET', cls: 'svc-pet' },
          { key: 'mn', label: 'Nuclear', cls: 'svc-mn' },
          { key: 'tm', label: 'Metab.', cls: 'svc-tm' },
          { key: 'orense', label: 'Orense', cls: 'svc-orense' }
        ]);
        const tardeHtml = renderSvcLines(b.tarde, [
          { key: 'pet', label: 'PET', cls: 'svc-pet' },
          { key: 'mn', label: 'Nuclear', cls: 'svc-mn' },
          { key: 'tm', label: 'Metab.', cls: 'svc-tm' },
          { key: 'apoyo', label: 'Refuerzo', cls: 'svc-tm' }
        ]);
        const nocheHtml = renderSvcLines(b.noche, [
          { key: 'unidad', label: 'Unidad', cls: 'svc-noche' },
          { key: 'tm', label: 'Metab.', cls: 'svc-tm' }
        ]);

        const blocks = [];
        if (mananaHtml) {
          blocks.push(`<div class="planilla-cal-entry cal-entry-m"><strong>☀️ MAÑANA</strong>${mananaHtml}</div>`);
        }
        if (tardeHtml) {
          blocks.push(`<div class="planilla-cal-entry cal-entry-t"><strong>🌆 TARDE</strong>${tardeHtml}</div>`);
        }
        if (nocheHtml) {
          blocks.push(`<div class="planilla-cal-entry cal-entry-n"><strong>🌙 NOCHE</strong>${nocheHtml}</div>`);
        }
        entriesHtml = blocks.join('<hr class="cal-shift-divider">');
      } else if (conf && conf.categories) {
        const shortLabels = {
          enfermeros: 'DUE',
          tecnicos: 'TSID',
          celadores: 'Cel',
          tcaes: 'TCAE'
        };

        const buildShiftText = (shiftKey) => {
          const parts = [];
          PLANILLA_CATEGORIES.forEach(c => {
            const d = conf.categories[c.id] || { manana: [], tarde: [], noche: [] };
            const list = d[shiftKey] || [];
            if (list.length > 0) {
              const names = list.map(n => n.split(' ')[0]).join(', ');
              parts.push(`${shortLabels[c.id]}: ${names}`);
            }
          });
          return parts.join(' · ');
        };

        const mananaTxt = buildShiftText('manana');
        const tardeTxt = buildShiftText('tarde');
        const nocheTxt = buildShiftText('noche');

        const blocks = [];
        if (mananaTxt) {
          blocks.push(`<div class="planilla-cal-entry cal-entry-m">☀️ <strong>M:</strong> ${escapeHTML(mananaTxt)}</div>`);
        }
        if (tardeTxt) {
          blocks.push(`<div class="planilla-cal-entry cal-entry-t">🌆 <strong>T:</strong> ${escapeHTML(tardeTxt)}</div>`);
        }
        if (nocheTxt) {
          blocks.push(`<div class="planilla-cal-entry cal-entry-n">🌙 <strong>N:</strong> ${escapeHTML(nocheTxt)}</div>`);
        }
        entriesHtml = blocks.join('<hr class="cal-shift-divider">');
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
            📅 Calendario Global de Turnos — ${monthsES[month]} ${year} (DUE · TSID · Celadores · TCAE)
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
    const allDayExtras = getExtrasForDate(planillaState.fecha);
    const selectedWorker = planillaState.selectedWorkerId
      ? (planillaState.staff.find(w => w.id === planillaState.selectedWorkerId) || allDayExtras.find(x => x.id === planillaState.selectedWorkerId))
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
    const catExtras = allDayExtras.filter(x => x.category === planillaState.categoria);
    const bands = PLANILLA_BANDS_BY_CAT[planillaState.categoria] || [];
    const hasSelected = Boolean(selectedWorker);

    const getWorkersForCol = (colId) => {
      const base = catWorkers.filter(w => getWorkerShiftForDate(w, planillaState.fecha) === colId);
      const ext = catExtras.filter(x => x.shift === colId);
      return base.concat(ext);
    };

    const poolHtml = `
      <div class="planilla-pool-row">
        ${POOL_COLS.map(col => renderColumnBox(col, getWorkersForCol(col.id), hasSelected)).join('')}
      </div>
    `;

    const bandsHtml = bands.map((band, idx) => {
      const bandColIds = band.cols.map(c => c.id);
      const countInBand = catWorkers.filter(w => bandColIds.includes(getWorkerShiftForDate(w, planillaState.fecha))).length +
                          catExtras.filter(x => bandColIds.includes(x.shift)).length;
      const quotaOk = countInBand >= band.target;
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
            ${band.cols.map(col => renderColumnBox(col, getWorkersForCol(col.id), hasSelected)).join('')}
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

      try {
        const hash = (typeof window !== 'undefined' && window.location.hash ? window.location.hash.replace('#', '') : '');
        const urlParams = (typeof window !== 'undefined' && window.location.search ? new URLSearchParams(window.location.search) : null);
        const tabParam = (urlParams && urlParams.get('tab')) || hash;
        if (tabParam) {
          cambiarTab(tabParam);
        }
      } catch (_) {}
    });

    if (typeof window !== 'undefined') {
      window.addEventListener('hashchange', () => {
        try {
          const hash = window.location.hash.replace('#', '');
          if (hash) cambiarTab(hash);
        } catch (_) {}
      });
    }
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
      onCambioCanalPedido,
      cerrarModalNuevoPedido,
      guardarNuevoPedido,
      marcarPedidoEntregado,
      recalcularFungibles,
      recalcularFungiblesConsolidados,
      recalcularConsumoSemanal,
      sincronizarPacientesDelDia,
      sincronizarPacientesFinalizadosSemana,
      sincronizarMedicacionesPautadas,
      obtenerMedicacionesPautadasPorMedicos,
      renderDiasSemanaFinalizados,
      cambiarDiaCalculo,
      cambiarPacientesPrueba,
      generarPedidoDiaConsolidado,
      generarPedidoSemanalConsolidado,
      toggleEditorProtocoloPrueba,
      renderEditorMaterialesPrueba,
      renderContadoresPacientesPorPrueba,
      updateFungibleParam,
      onCambioTipoPruebaFungible,
      agregarFungibleAPrueba,
      eliminarFungibleDePrueba,
      generarPedidoDesdeCalculadora,
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
      abrirModalDuplicarExtra,
      cerrarModalDuplicarExtra,
      confirmarDuplicarExtra,
      eliminarExtra,
      renderPlanillaTab
    };
  }
})();
