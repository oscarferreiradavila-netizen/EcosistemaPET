with open('pet_ct_triage/web_app/index.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = '''        <!-- ☀️ BLOQUE 1: TURNO DE MAÑANA -->'''

new_section = '''        <!-- 🎯 SECCIÓN PRINCIPAL: HUECOS INDIVIDUALES Y RADIOFÁRMACOS POR HUECO -->
        <div id="section-individual-slots" style="background: white; border: 2px solid #0284c7; border-radius: 10px; padding: 1.1rem; margin-bottom: 1.25rem; box-shadow: 0 3px 12px rgba(2,132,199,0.12);">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.6rem; margin-bottom:0.85rem; border-bottom: 1.5px solid #e2e8f0; padding-bottom: 0.75rem;">
            <div>
              <h4 style="margin:0; font-size: 1.05rem; color: #004868; display:flex; align-items:center; gap:0.45rem;">
                <span>💊</span> <span>Huecos Individuales del Día (Fármaco a la Carta)</span>
              </h4>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.78rem; color: #52718a;">
                Crea individualmente cada hueco a la hora que desees y asígnale el fármaco que quieras: 
                <strong>FDG / Colina</strong> (Ciclotrón), <strong>Galio 68</strong> (Radiofarmacia) o <strong>PSMA</strong> (Curium Madrid).
              </p>
            </div>
            <div style="display:flex; gap:0.45rem; flex-wrap:wrap;">
              <button type="button" class="btn btn-outline" id="btn-prefill-standard-slots" style="font-size:0.75rem; padding: 0.4rem 0.8rem; font-weight:700; color:#0284c7; border-color:#bae6fd; background:#f0f9ff;" title="Genera huecos estándar cada 30 min para poder personalizar los fármacos que quieras">
                ⚡ Cargar Huecos Estándar (30 min)
              </button>
              <button type="button" class="btn btn-outline" id="btn-clear-day-slots" style="font-size:0.75rem; padding: 0.4rem 0.75rem; font-weight:700; color:#ef4444; border-color:#fca5a5; background:#fff5f5;" title="Vaciar todos los huecos para empezar desde cero">
                🗑️ Vaciar Lista
              </button>
            </div>
          </div>

          <!-- Formulario interactivo para crear un nuevo hueco individual -->
          <div style="background: #f8fafc; border: 1.5px dashed #94a3b8; border-radius: 8px; padding: 0.85rem; margin-bottom: 1rem;">
            <div style="font-size: 0.78rem; font-weight: 700; color: #1e293b; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.35rem;">
              <span>➕</span> <span>Crear Nuevo Hueco Individual con Fármaco:</span>
            </div>
            <div style="display: flex; gap: 0.6rem; flex-wrap: wrap; align-items: flex-end;">
              <div style="min-width: 105px;">
                <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom: 0.25rem;">⏰ Hora:</label>
                <input type="time" id="new-slot-time-input" value="08:00" class="select-full" style="padding: 0.4rem 0.55rem; font-size: 0.84rem; font-weight:700;">
              </div>
              <div style="min-width: 115px;">
                <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom: 0.25rem;">Turno:</label>
                <select id="new-slot-shift-select" class="select-full" style="padding: 0.4rem 0.55rem; font-size: 0.84rem; font-weight:600;">
                  <option value="morning">☀️ Mañana</option>
                  <option value="afternoon">🌆 Tarde</option>
                </select>
              </div>
              <div style="flex: 1; min-width: 230px;">
                <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom: 0.25rem;">💊 Radiofármaco Asignado:</label>
                <select id="new-slot-rf-select" class="select-full" style="padding: 0.4rem 0.55rem; font-size: 0.84rem; font-weight:700; color:#0f4c81;">
                  <option value="18F-FDG">18F-FDG (Ciclotrón - Glucosa Oncológica / Infección)</option>
                  <option value="18F-Colina">18F-Colina (Ciclotrón - Próstata / Paratiroides)</option>
                  <option value="68Ga-DOTATOC">68Ga-DOTATOC (Radiofarmacia - TNE / Somatostatina)</option>
                  <option value="68Ga-PSMA">68Ga-PSMA (Radiofarmacia - Galio 68)</option>
                  <option value="18F-PSMA">18F-PSMA (Curium Madrid - Próstata)</option>
                  <option value="18F-DOPA">18F-DOPA (Ciclotrón - Neuroendocrino / Parkinson)</option>
                  <option value="18F-Florbetapir">18F-Florbetapir (Ciclotrón - Amiloide Cerebral)</option>
                  <option value="Flexible">Cualquiera / Flexible</option>
                  <option value="custom">✏️ Otro (Escribir personalizado)...</option>
                </select>
              </div>
              <div id="new-slot-custom-rf-box" style="display:none; min-width: 150px;">
                <label style="font-size:0.72rem; font-weight:700; color:#475569; display:block; margin-bottom: 0.25rem;">Escribir Fármaco:</label>
                <input type="text" id="new-slot-custom-rf-input" placeholder="Ej: 177Lu-DOTATATE..." class="select-full" style="padding: 0.4rem 0.55rem; font-size: 0.84rem;">
              </div>
              <div>
                <button type="button" class="btn btn-primary" id="btn-add-custom-slot" style="padding: 0.45rem 1rem; font-size: 0.84rem; font-weight: 700; white-space: nowrap; background: #0284c7; border-color: #0284c7;">
                  ➕ Añadir Hueco
                </button>
              </div>
            </div>
          </div>

          <!-- Tabla con los huecos individuales configurados -->
          <div style="max-height: 270px; overflow-y: auto; border: 1.5px solid #cbd5e1; border-radius: 8px; background: #ffffff;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; text-align: left;">
              <thead style="background: #f1f5f9; color: #334155; position: sticky; top: 0; z-index: 2; border-bottom: 2px solid #cbd5e1;">
                <tr>
                  <th style="padding: 0.5rem 0.65rem; width: 35px;">#</th>
                  <th style="padding: 0.5rem 0.65rem; width: 85px;">⏰ Hora</th>
                  <th style="padding: 0.5rem 0.65rem; width: 95px;">Turno</th>
                  <th style="padding: 0.5rem 0.65rem;">💊 Radiofármaco Asignado</th>
                  <th style="padding: 0.5rem 0.65rem; width: 140px;">Origen / Proveedor</th>
                  <th style="padding: 0.5rem 0.65rem; width: 120px;">Estado</th>
                  <th style="padding: 0.5rem 0.65rem; width: 65px; text-align:center;">Acción</th>
                </tr>
              </thead>
              <tbody id="custom-slots-table-body">
                <!-- Se rellena dinámicamente con las filas de huecos -->
              </tbody>
            </table>
          </div>
          <div id="custom-slots-summary-count" style="font-size: 0.78rem; font-weight: 700; color: #004868; margin-top: 0.55rem; display: flex; justify-content: space-between; align-items: center;">
            <span>ℹ️ Puedes modificar el fármaco de cualquier hueco directamente en el desplegable de cada fila.</span>
            <span id="custom-slots-badge-total" style="background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:6px;">0 huecos</span>
          </div>
        </div>

        <!-- Opciones secundarias de bloques -->
        <details style="margin-top: 0.75rem; border: 1px solid #e2e8f0; border-radius: 8px; padding: 0.6rem 0.9rem; background: #f8fafc; margin-bottom: 1.1rem;">
          <summary style="font-size: 0.82rem; font-weight: 700; color: #475569; cursor: pointer;">⚙️ Opciones avanzadas de rango horario y bloques (opcional)</summary>
          <div style="margin-top: 0.75rem;">
'''

if target in text and 'section-individual-slots' not in text:
    text = text.replace(target, new_section + '        <!-- ☀️ BLOQUE 1: TURNO DE MAÑANA -->', 1)
    idx_close_body = text.find('      </div>\n\n      <div class="modal-footer-actions"')
    if idx_close_body != -1:
        text = text[:idx_close_body] + '          </div>\n        </details>\n' + text[idx_close_body:]
    with open('pet_ct_triage/web_app/index.html', 'w', encoding='utf-8') as f:
        f.write(text)
    print('index.html updated successfully!')
else:
    print('Target not found or section already present.')
