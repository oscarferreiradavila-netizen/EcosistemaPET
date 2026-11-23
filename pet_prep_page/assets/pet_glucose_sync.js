/**
 * PET_GLUCOSE_SYNC.JS - Sincronizador Global de Glucemia Capilar y Alertas de Enfermería
 * Vincula en tiempo real las Audioguías con el Puesto de Enfermería, Consola Médica y Técnicos TSID.
 */
(function(window) {
  'use strict';

  function registrarGlucemiaEcosistema(data) {
    if (!data) return;

    const val = parseInt(data.glucemia_mg_dl || data.valInput || data.val || 0, 10);
    if (isNaN(val) || val <= 0) return;

    const name = String(data.paciente_nombre || data.nameInput || data.nombre || '').trim();
    const hora = String(data.hora_control_capilar || data.timeInput || data.hora || '').trim() || new Date().toTimeString().substring(0, 5);
    const phone = String(data.paciente_telefono || data.telefono || '').trim();
    const origen = String(data.origen || 'AUDIOGUIA_METABOLICA').trim();
    const nhc = String(data.nhc || data.paciente_nhc || '').trim();

    console.log(`🩸 [GLUCOSE SYNC] Registrando glucemia: ${val} mg/dL para ${name} (${hora} h)`);

    // 1. Sincronizar en PET_SHARED_INJECTIONS_AND_MOBILITY_V1 (utilizado directamente por boxes de enfermería y técnicos TSID)
    try {
      const allSync = JSON.parse(localStorage.getItem('PET_SHARED_INJECTIONS_AND_MOBILITY_V1') || '{}');
      const syncObj = {
        glucemia: String(val),
        horaGlucemia: hora,
        fechaGlucemia: new Date().toLocaleDateString('es-ES'),
        origen: origen,
        paciente_nombre: name,
        ultimaActualizacion: Date.now()
      };

      if (nhc) allSync[nhc] = Object.assign({}, allSync[nhc] || {}, syncObj);
      if (name) allSync[name] = Object.assign({}, allSync[name] || {}, syncObj);

      // Buscar en PET_DATABASE_MASTER_V4 si hay coincidencia de paciente
      const masterRaw = localStorage.getItem('PET_DATABASE_MASTER_V4');
      if (masterRaw) {
        const masterList = JSON.parse(masterRaw);
        if (Array.isArray(masterList)) {
          const cleanSearch = name.toLowerCase().replace(/^(sr\.|sra\.|don|doña)\s+/i, '').trim();
          masterList.forEach(p => {
            const pName = String(p["Nombre del Paciente"] || p["Nombre y Apellidos"] || '').toLowerCase().trim();
            const pNhc = String(p["NHC / Historia Clínica"] || p.nhc || '').toLowerCase().trim();
            const subId = p["Submission ID"] || p.id;
            if ((cleanSearch && pName.includes(cleanSearch)) || (nhc && pNhc === nhc.toLowerCase())) {
              if (subId) allSync[subId] = Object.assign({}, allSync[subId] || {}, syncObj);
              if (pNhc) allSync[pNhc] = Object.assign({}, allSync[pNhc] || {}, syncObj);
              p["Glucemia (mg/dL)"] = val;
              p["Hora Glucemia Capilar"] = hora;
              if (val >= 200) {
                p["Alertas Técnicas"] = `⚠️ ALERTA GLUCEMIA CRÍTICA (${val} mg/dL a las ${hora} h)`;
              }
            }
          });
          localStorage.setItem('PET_DATABASE_MASTER_V4', JSON.stringify(masterList));
        }
      }

      localStorage.setItem('PET_SHARED_INJECTIONS_AND_MOBILITY_V1', JSON.stringify(allSync));
    } catch(e) {
      console.warn("Error guardando glucemia en PET_SHARED_INJECTIONS_AND_MOBILITY_V1:", e);
    }

    // 2. Si la glucemia es crítica (>= 200 mg/dL), registrar en la lista de Urgencias Diabéticas
    if (val >= 200) {
      try {
        const urgItem = {
          id: Date.now(),
          origen: origen,
          nivel: 'URGENCIA_METABOLICA',
          fecha_hora: new Date().toISOString(),
          paciente_nombre: name || 'Paciente Citado',
          paciente_telefono: phone || '600 000 000',
          hora_control_capilar: hora,
          glucemia_mg_dl: val,
          mensaje_alerta: data.mensaje_alerta || `ALERTA METABÓLICA: Paciente ${name} reporta glucemia capilar de ${val} mg/dL a las ${hora} h (supera umbral clínico de 200 mg/dL).`
        };
        const urgencias = JSON.parse(localStorage.getItem('PET_SHARED_NURSING_URGENCIAS_V1') || '[]');
        const filtered = urgencias.filter(u => !(u.paciente_nombre === name && u.glucemia_mg_dl === val));
        filtered.unshift(urgItem);
        localStorage.setItem('PET_SHARED_NURSING_URGENCIAS_V1', JSON.stringify(filtered));
      } catch(e) { }
    } else if (val >= 160 && val < 200) {
      // Glucemia ámbar / aviso de baja prioridad
      try {
        const dudaItem = {
          id: Date.now(),
          origen: 'DUDAS_UNIDAD_ENFERMERIA',
          nivel: 'DUDA_LLAMADA_PACIENTE',
          fecha_hora: new Date().toISOString(),
          paciente_nombre: name || 'Paciente Citado',
          paciente_telefono: phone || '600 000 000',
          hora_control_capilar: hora,
          glucemia_mg_dl: val,
          mensaje_escrito: `Control capilar ámbar en domicilio: ${val} mg/dL a las ${hora} h. Valorar pauta antes de inyectar.`
        };
        const dudas = JSON.parse(localStorage.getItem('PET_SHARED_NURSING_DOUBTS_V1') || '[]');
        const filtered = dudas.filter(d => !(d.paciente_nombre === name && d.glucemia_mg_dl === val));
        filtered.unshift(dudaItem);
        localStorage.setItem('PET_SHARED_NURSING_DOUBTS_V1', JSON.stringify(filtered));
      } catch(e) { }
    }

    // 3. Emitir evento BroadcastChannel en tiempo real
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const chanClin = new BroadcastChannel('pet_clinical_channel');
        chanClin.postMessage({
          type: 'GLUCEMIA_REPORTED',
          paciente: name,
          glucemia: val,
          hora: hora,
          timestamp: Date.now()
        });
      } catch(e) {}
      try {
        const chanNurs = new BroadcastChannel('pet_nursing_channel');
        chanNurs.postMessage({
          type: 'GLUCEMIA_REPORTED',
          paciente: name,
          glucemia: val,
          hora: hora,
          timestamp: Date.now()
        });
      } catch(e) {}
    }

    // 4. Disparar evento storage para pestañas en el mismo dominio
    try {
      window.dispatchEvent(new Event('storage'));
    } catch(e) {}

    // 5. Envío en segundo plano al servidor backend
    try {
      const url = (window.CONFIG && window.CONFIG.DATABASE_API_URL) ? window.CONFIG.DATABASE_API_URL : '/api/enfermeria/base_datos';
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origen: origen,
          nivel: val >= 200 ? 'URGENCIA_METABOLICA' : (val >= 160 ? 'AVISO_MODERADA' : 'CONTROL_GLUCEMIA'),
          fecha_hora: new Date().toISOString(),
          paciente_nombre: name,
          paciente_telefono: phone,
          hora_control_capilar: hora,
          glucemia_mg_dl: val,
          modo_envio: 'texto',
          mensaje_alerta: data.mensaje_alerta || `Control capilar: ${val} mg/dL a las ${hora} h`
        })
      }).catch(err => console.log('Envío servidor backend:', err.message));
    } catch(e) {}
  }

  window.registrarGlucemiaEcosistema = registrarGlucemiaEcosistema;
})(window);
