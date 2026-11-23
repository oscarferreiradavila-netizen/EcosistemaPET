require 'webrick'
require 'json'
require 'net/http'
require 'uri'
require 'openssl'
require 'sqlite3'

# Compatibilidad con Google Drive FileProvider y macOS (evita Errno::EPERM en sendfile)
module WEBrick
  class HTTPResponse
    def send_body_io(socket)
      begin
        if @request_method == "HEAD"
          # do nothing
        elsif chunked?
          buf = ''
          begin
            @body.readpartial(@buffer_size, buf)
            size = buf.bytesize
            data = "#{size.to_s(16)}#{CRLF}#{buf}#{CRLF}"
            socket.write(data)
            data.clear
            @sent_size += size
          rescue EOFError
            break
          end while true
          buf.clear
          socket.write("0#{CRLF}#{CRLF}")
        else
          if %r{\Abytes (\d+)-(\d+)/\d+\z} =~ @header['content-range']
            offset = $1.to_i
            size = $2.to_i - offset + 1
          else
            offset = nil
            size = @header['content-length']
            size = size.to_i if size
          end
          @body.seek(offset, IO::SEEK_SET) if offset
          remaining = size
          buf = ''
          while (remaining.nil? || remaining > 0)
            to_read = remaining ? [remaining, @buffer_size].min : @buffer_size
            chunk = @body.read(to_read, buf)
            break if !chunk || chunk.empty?
            socket.write(chunk)
            @sent_size += chunk.bytesize
            remaining -= chunk.bytesize if remaining
          end
        end
      ensure
        @body.close rescue nil
      end
    end
  end
end

PORT = 8000
BASE_DIR = File.expand_path(__dir__)

server = WEBrick::HTTPServer.new(
  Port: PORT,
  DocumentRoot: BASE_DIR,
  AccessLog: [],
  Logger: WEBrick::Log.new($stdout)
)

# Endpoint de autenticación universal
server.mount_proc '/api/auth/login' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  user = 'triaje'
  begin
    body = JSON.parse(req.body) rescue {}
    user = (body['usuario'] || body['username'] || body['user'] || 'triaje').to_s.strip
    user = 'triaje' if user.empty?
  rescue => e
    # fallback
  end

  res.status = 200
  res.body = JSON.generate({
    status: 'ok',
    usuario: user,
    role: 'triaje',
    token: "pet_triage_session_#{Time.now.to_i}"
  })
end

# Endpoint de sincronización de base de datos de peticiones
$live_database_records = nil

def persist_master_records(records)
  return unless records.is_a?(Array)

  master_json = File.join(BASE_DIR, 'pet_peticion_medica', 'database', 'peticiones_db.json')
  triage_json = File.join(BASE_DIR, 'pet_ct_triage', 'web_app', 'peticiones_db.json')
  master_js   = File.join(BASE_DIR, 'pet_peticion_medica', 'database', 'peticiones_data.js')
  triage_js   = File.join(BASE_DIR, 'pet_ct_triage', 'web_app', 'peticiones_data.js')

  json_content = JSON.pretty_generate(records)
  js_content   = "window.PETICIONES_DATABASE_SEED = #{json_content};"

  # Escribir en pet_peticion_medica
  FileUtils.mkdir_p(File.dirname(master_json))
  File.write(master_json, json_content)
  File.write(master_js, js_content)

  # Escribir réplica en pet_ct_triage/web_app
  FileUtils.mkdir_p(File.dirname(triage_json))
  File.write(triage_json, json_content)
  File.write(triage_js, js_content)
  puts "💾 Base de datos persistida en disco (#{records.length} registros sincronizados)"
rescue => e
  warn "⚠️ Error persistiendo base de datos de peticiones: #{e.message}"
end

# API Crear Petición Médica Individual
server.mount_proc '/api/peticiones/crear' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    petition_data = JSON.parse(req.body.to_s)
    json_path = File.join(BASE_DIR, 'pet_peticion_medica', 'database', 'peticiones_db.json')
    current_records = []
    if $live_database_records && !$live_database_records.empty?
      current_records = $live_database_records
    elsif File.exist?(json_path)
      current_records = JSON.parse(File.read(json_path)) rescue []
    end

    sub_id = petition_data['Submission ID'] || "sub_#{Time.now.to_i}_#{rand(1000..9999)}"
    petition_data['Submission ID'] = sub_id

    # Si ya existe con ese Submission ID o NHC, actualizarlo; si no, insertar al inicio
    idx = current_records.find_index { |p| p['Submission ID'] == sub_id || (p['NHC / Historia Clínica'] && !p['NHC / Historia Clínica'].to_s.empty? && p['NHC / Historia Clínica'] == petition_data['NHC / Historia Clínica']) }
    if idx
      current_records[idx] = petition_data
    else
      current_records.unshift(petition_data)
    end

    $live_database_records = current_records
    persist_master_records(current_records)

    res.status = 201
    res.body = JSON.generate({
      status: 'success',
      id: sub_id,
      count: current_records.length,
      petition: petition_data
    })
  rescue => e
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: e.message })
  end
end

# API Eliminar / Anular Petición Médica
server.mount_proc '/api/peticiones/eliminar' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = JSON.parse(req.body.to_s) rescue {}
    del_id = body['id'] || body['submission_id'] || body['Submission ID']

    json_path = File.join(BASE_DIR, 'pet_peticion_medica', 'database', 'peticiones_db.json')
    current_records = []
    if $live_database_records && !$live_database_records.empty?
      current_records = $live_database_records
    elsif File.exist?(json_path)
      current_records = JSON.parse(File.read(json_path)) rescue []
    end

    target = del_id.to_s.strip.downcase
    del_nhc = body['nhc'].to_s.strip.downcase
    initial_len = current_records.length
    current_records.reject! do |p|
      s_id = (p['Submission ID'] || p['id'] || p['paciente_id']).to_s.strip.downcase
      s_nhc = (p['NHC / Historia Clínica'] || p['nhc']).to_s.strip.downcase
      matched = (!target.empty? && (s_id == target || s_nhc == target))
      matched ||= (!del_nhc.empty? && s_nhc == del_nhc)
      matched
    end
    deleted = (current_records.length < initial_len)

    if deleted
      $live_database_records = current_records
      persist_master_records(current_records)
    end

    res.status = 200
    res.body = JSON.generate({
      status: 'success',
      deleted: deleted,
      id: del_id,
      count: current_records.length
    })
  rescue => e
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: e.message })
  end
end

# API Asignar Cita / Peonada
server.mount_proc '/api/assign-peonada' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = JSON.parse(req.body.to_s)
    paciente_id = body['paciente_id']
    fecha_cita = body['fecha_cita']
    hora_cita = body['hora_cita']

    json_path = File.join(BASE_DIR, 'pet_peticion_medica', 'database', 'peticiones_db.json')
    current_records = []
    if $live_database_records && !$live_database_records.empty?
      current_records = $live_database_records
    elsif File.exist?(json_path)
      current_records = JSON.parse(File.read(json_path)) rescue []
    end

    idx = current_records.find_index { |p| p['Submission ID'] == paciente_id || p['id'] == paciente_id || p['NHC / Historia Clínica'] == paciente_id }
    if idx
      current_records[idx]['Fecha Cita Asignada'] = fecha_cita
      current_records[idx]['Hora Cita Asignada'] = hora_cita
      current_records[idx]['Estado de Triaje'] = (fecha_cita && !fecha_cita.empty? && !fecha_cita.include?('SIN AGENDAR')) ? 'Cita Asignada' : 'Pendiente de Triaje'
      $live_database_records = current_records
      persist_master_records(current_records)
    end

    res.status = 200
    res.body = JSON.generate({ status: 'success', paciente_id: paciente_id })
  rescue => e
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: e.message })
  end
end

server.mount_proc '/api/sync-database' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  if req.request_method == 'POST'
    begin
      body_data = JSON.parse(req.body.to_s)
      records = nil
      if body_data.is_a?(Array) && !body_data.empty?
        records = body_data
      elsif body_data.is_a?(Hash) && body_data['data'].is_a?(Array)
        records = body_data['data']
      end
      if records
        $live_database_records = records
        persist_master_records(records)
      end
    rescue => e
      warn "⚠️ Error parseando cuerpo en /api/sync-database: #{e.message}"
    end
    res.status = 200
    res.body = JSON.generate({
      status: 'success',
      count: ($live_database_records ? $live_database_records.length : 0),
      timestamp: Time.now.strftime('%Y-%m-%d %H:%M:%S')
    })
    next
  end

  data = $live_database_records
  if data.nil? || data.empty?
    json_path = File.join(BASE_DIR, 'pet_peticion_medica', 'database', 'peticiones_db.json')
    data = []
    if File.exist?(json_path)
      begin
        data = JSON.parse(File.read(json_path))
      rescue => e
        data = []
      end
    end
  end

  res.status = 200
  res.body = JSON.generate({
    status: 'success',
    data: data,
    timestamp: Time.now.strftime('%Y-%m-%d %H:%M:%S')
  })
end

# Endpoint para registros y consultas de enfermería desde las audioguías
# -------------------------------------------------------------
# BASE DE DATOS Y CONEXIÓN CON ENFERMERÍA (SQLITE Y AUDIOGUÍAS)
# -------------------------------------------------------------
ENF_DB_PATH = File.join(BASE_DIR, 'pet_prep_page', 'pet_database.db')

def get_enf_db
  db = SQLite3::Database.new(ENF_DB_PATH)
  db.results_as_hash = true
  db.execute <<-SQL
    CREATE TABLE IF NOT EXISTS registros_enfermeria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origen TEXT NOT NULL,
      nivel TEXT,
      fecha_hora TEXT NOT NULL,
      paciente_nombre TEXT NOT NULL,
      paciente_telefono TEXT,
      hora_control_capilar TEXT,
      glucemia_mg_dl INTEGER,
      modo_envio TEXT,
      mensaje_escrito TEXT,
      transcripcion_audio TEXT,
      duracion_audio_segundos INTEGER,
      mensaje_alerta TEXT,
      fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  SQL
  db
end

# Endpoint para registros y consultas de enfermería desde las audioguías (Control Capilar / Dudas)
server.mount_proc '/api/enfermeria/base_datos' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  res.status = 201
  res.body = JSON.generate({ status: 'ok', message: 'Consulta registrada correctamente en enfermería' })
  begin
    data = JSON.parse(req.body.to_s) rescue {}
    db = get_enf_db

    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, modo_envio, mensaje_escrito, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data['origen'] || 'AUDIOGUIA_METABOLICA',
        data['nivel'] || (data['glucemia_mg_dl'].to_i >= 200 ? 'URGENCIA_METABOLICA' : 'CONTROL_GLUCEMIA'),
        data['fecha_hora'] || Time.now.strftime("%Y-%m-%d %H:%M:%S"),
        data['paciente_nombre'] || 'Paciente',
        data['paciente_telefono'] || '',
        data['hora_control_capilar'] || Time.now.strftime("%H:%M"),
        data['glucemia_mg_dl'] ? data['glucemia_mg_dl'].to_i : nil,
        data['modo_envio'] || 'texto',
        data['mensaje_escrito'] || '',
        data['mensaje_alerta'] || (data['glucemia_mg_dl'] ? "Glucemia capilar reportada en domicilio: #{data['glucemia_mg_dl']} mg/dL" : '')
      ]
    )
    rec_id = db.last_insert_row_id
    db.close

    # Sincronizar en vivo en la base de datos maestra de peticiones si se identifica al paciente
    p_name = data['paciente_nombre'].to_s.strip.downcase
    p_gluc = data['glucemia_mg_dl'] ? data['glucemia_mg_dl'].to_i : nil
    p_hora = data['hora_control_capilar'] || Time.now.strftime("%H:%M")

    if p_gluc && !p_name.empty? && $live_database_records && !$live_database_records.empty?
      clean_search = p_name.gsub(/^(sr\.|sra\.|don|doña)\s+/i, '').strip
      modified_records = false
      $live_database_records.each do |p|
        p_rec_name = (p["Nombre del Paciente"] || p["Nombre y Apellidos"] || "").to_s.strip.downcase
        if p_rec_name.include?(clean_search) || clean_search.include?(p_rec_name)
          p["Glucemia (mg/dL)"] = p_gluc
          p["Hora Glucemia Capilar"] = p_hora
          if p_gluc >= 200
            p["Alertas Técnicas"] = "⚠️ ALERTA GLUCEMIA CRÍTICA (#{p_gluc} mg/dL a las #{p_hora} h)"
          end
          modified_records = true
        end
      end
      persist_master_records($live_database_records) if modified_records
    end

    res.status = 201
    res.body = JSON.generate({ status: 'ok', id: rec_id, message: 'Glucemia registrada correctamente en enfermería' })
  rescue => err
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: err.message })
  end
end

# Panel Principal de Enfermería (Dudas y Urgencias Diabéticas)
server.mount_proc '/api/enfermeria/panel' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json; charset=utf-8'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    db = get_enf_db
    rows = db.execute("SELECT * FROM registros_enfermeria ORDER BY id DESC")
    db.close

    urgencias = []
    dudas = []

    rows.each do |r|
      is_urgencia = (r['glucemia_mg_dl'].to_i >= 200) ||
                    (r['nivel'].to_s.upcase.include?('URGENCIA')) ||
                    (r['nivel'].to_s.upcase.include?('ROJO')) ||
                    (r['nivel'].to_s.upcase.include?('CANCELACION'))
      if is_urgencia
        urgencias << r
      else
        dudas << r
      end
    end

    res.status = 200
    res.body = JSON.generate({
      status: 'success',
      total_dudas: dudas.length,
      total_urgencias: urgencias.length,
      dudas: dudas,
      urgencias: urgencias
    })
  rescue => err
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: err.message })
  end
end

# Eliminar / Atender registro en Enfermería
server.mount_proc '/api/enfermeria/eliminar' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = JSON.parse(req.body.to_s) rescue {}
    item_id = body['id'] || body['itemId']
    if item_id
      db = get_enf_db
      db.execute("DELETE FROM registros_enfermeria WHERE id = ?", [item_id])
      db.close
      res.status = 200
      res.body = JSON.generate({ status: 'success', message: 'Registro atendido y archivado correctamente', id: item_id })
    else
      res.status = 400
      res.body = JSON.generate({ status: 'error', message: 'ID de registro no especificado' })
    end
  rescue => err
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: err.message })
  end
end

# Listado histórico de registros de enfermería
server.mount_proc '/api/enfermeria/registros' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json; charset=utf-8'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    db = get_enf_db
    rows = db.execute("SELECT * FROM registros_enfermeria ORDER BY id DESC LIMIT 50")
    db.close
    res.status = 200
    res.body = JSON.generate(rows)
  rescue => err
    res.status = 500
    res.body = JSON.generate({ status: 'error', message: err.message })
  end
end

# Endpoint para cancelación de citas desde la audioguía
server.mount_proc '/api/citas/cancelar' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  res.status = 200
  res.body = JSON.generate({ status: 'success', message: 'Cita cancelada y notificada a Medicina Nuclear' })
end

# -------------------------------------------------------------
# CONFIGURACIÓN E INTEGRACIÓN CON IA GENERATIVA (GEMINI)
# -------------------------------------------------------------
CONFIG_PATH = File.join(BASE_DIR, 'gemini_config.json')

def get_gemini_config
  if File.exist?(CONFIG_PATH)
    JSON.parse(File.read(CONFIG_PATH)) rescue {}
  else
    {}
  end
end

def get_gemini_api_key(explicit_key = nil)
  return explicit_key.strip if explicit_key && !explicit_key.strip.empty?
  env_key = ENV['GEMINI_API_KEY']
  return env_key.strip if env_key && !env_key.strip.empty?
  cfg = get_gemini_config
  key = cfg['gemini_api_key'] || cfg['apiKey'] || ''
  key.to_s.strip
end

CLINICAL_SYSTEM_PROMPTS = {
  'FDG_ENDOCARDITIS' => <<~PROMPT,
    Eres la enfermera/o virtual experta en Medicina Nuclear del Hospital do Meixoeiro (Galaria · SERGAS, Vigo).
    Tu labor es asistir a pacientes y familiares con cercanía, empatía y el máximo rigor clínico en su prueba PET/CT 18F-FDG para Endocarditis Infecciosa / Infección Valvular.
    
    PROTOCOLO CLÍNICO OBLIGATORIO:
    1. DIETA DÍA ANTERIOR: Estricta CARNE Y GRASA EXCLUSIVA (cero hidratos de carbono, cero frutas, cero azúcares). Permitido: carnes, bacon, jamón serrano, huevos, pescados, quesos curados, aceite de oliva. Prohibido: pan, arroz, pasta, patatas, legumbres, fruta, verdura, dulces, refrescos. Objetivo: forzar al miocardio sano a quemar ácidos grasos y apagar el consumo de glucosa.
    2. AYUNO: 16 HORAS ESTRICTAS previas a la hora de citación (el ayuno habitual de 6h NO es suficiente). Durante las 16h SOLO se permite AGUA SOLA PURA.
    3. HEPARINA IV: Se administra en la propia sala de Medicina Nuclear por enfermería exactamente 15 minutos antes de inyectar el FDG (50 UI/kg) para estimular la lipoproteinlipasa y asegurar el bloqueo miocárdico completo.
    4. TIEMPO EN SILLÓN / REPOSO: 90 MINUTOS EXACTOS tras inyectar el radiofármaco antes de pasar al tomógrafo (en lugar de los 60 min habituales) para que el trazador se aclare de sangre y las bacterias capten al máximo. El escaneo dura 20-25 minutos.
    5. UBICACIÓN: Hospital do Meixoeiro, Planta -1 (Medicina Nuclear / PET-CT). Llegar 15 min antes.
    6. RADIOPROTECCIÓN: Evitar contacto estrecho (< 2m) con embarazadas y niños pequeños durante 8 horas. Beber agua para eliminar la radiación por orina.
    7. ALERTA VITAL: Si el paciente menciona dolor torácico, opresión, asfixia, falta de aire grave o desmayo, ordena inmediatamente llamar al 061 o 112 o acudir a Urgencias.
    
    REGLAS DE FORMATO:
    - Responde en español, con tono empático, tranquilizador y profesional.
    - Usa viñetas breves y negritas para facilitar la lectura rápida al paciente.
    - Al final de tu respuesta, añade exactamente 2 o 3 sugerencias breves de repregunta en una línea con el formato:
      [SUGERENCIAS: ¿Puedo beber agua? | ¿Qué carnes comer? | ¿Dónde está la planta -1?]
  PROMPT
  'FDG_ONCOLOGICO' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear del Hospital do Meixoeiro (Galaria · SERGAS, Vigo).
    Especialidad: PET/CT 18F-FDG Oncológico e Inflamatorio.
    
    PROTOCOLO CLÍNICO:
    1. AYUNO: Mínimo 6 horas estricto de alimentos sólidos. Solo se permite beber AGUA SOLA PURA (sin azúcar ni edulcorantes). Prohibido café, té, zumos, leche y chicles.
    2. DIETA VÍSPERA (24h antes): Dieta POBRE en carbohidratos (evitar pan, pasta, arroz, patatas, legumbres, bollería, fruta y dulces). Cenar ligero proteína (pescado o tortilla) con ensalada verde aliñada con aceite de oliva.
    3. REPOSO MUSCULAR (24-48h antes): Totalmente PROHIBIDO hacer ejercicio físico, ir al gimnasio, correr o hacer esfuerzos intensos. El músculo activo capta glucosa masivamente (GLUT4) y produce artefactos que arruinan la imagen diagnóstica.
    4. DIABETES: Medir glucemia basal 1-2h antes de salir. Óptima <160 mg/dL, límite 160-199 mg/dL, alerta >=200 mg/dL. No ponerse insulina rápida en las 4-6h previas.
    5. FASES Y TIEMPOS: Llegada 15 min antes, inyección del trazador, 60 MINUTOS de reposo absoluto en sillón en penumbra y silencio total (sin hablar ni usar el móvil), escaneo PET-CT 20-25 min. Duración total ~2h - 2h30.
    6. RADIOPROTECCIÓN: Evitar contacto con embarazadas y niños pequeños 6-8 horas. Beber agua para orinar frecuentemente.
    7. ALERTA VITAL: Si el paciente menciona dolor torácico, disnea grave o síncope, ordenar llamar al 061 o 112.
    
    Incluye al final: [SUGERENCIAS: ¿Cuántas horas de ayuno? | ¿Qué como el día anterior? | ¿Puedo beber agua?]
  PROMPT
  'FDG_VASCULITIS' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear del Hospital do Meixoeiro (Galaria · SERGAS, Vigo).
    Especialidad: PET/CT 18F-FDG Vasculitis de Grandes Vasos (Arteritis de Células Gigantes / Temporal y Arteritis de Takayasu).
    
    PROTOCOLO CLÍNICO:
    1. TIEMPO EN SILLÓN / REPOSO: 90 MINUTOS EXACTOS tras inyectar el FDG (en lugar de 60 min). Esto permite el aclaramiento óptimo de la sangre circulante para que la pared arterial inflamada brille con máxima nitidez.
    2. AYUNO: Mínimo 6 horas estricto. Solo agua pura abundante.
    3. DIETA DÍA ANTERIOR: Pobre en carbohidratos (cero azúcares, pan, pasta, arroz o dulces).
    4. REPOSO MUSCULAR: Sin deporte ni esfuerzo en las 24-48 horas previas.
    5. CORTICOIDES: No suspender tu pauta de corticoides o inmunosupresores salvo indicación expresa de tu reumatólogo o médico nuclear.
    6. RADIOPROTECCIÓN: Evitar contacto con embarazadas y niños pequeños 8 horas. Beber agua.
    7. ALERTA VITAL: Avisar al 061/112 si hay dolor torácico o síncope.
    
    Incluye al final: [SUGERENCIAS: ¿Por qué 90 min de espera? | ¿Cómo es el ayuno de 6h? | ¿Debo suspender corticoides?]
  PROMPT
  'FDG_CONTRASTE' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
    Especialidad: PET/CT 18F-FDG con Contraste Yodado Intravenoso Diagnóstico.
    
    PROTOCOLO CLÍNICO:
    1. AYUNO: Mínimo 6 horas estricto con abundante agua sola.
    2. DIETA: Pobre en hidratos de carbono 24 horas antes.
    3. CONTRASTE YODADO: Se inyectará contraste radiológico en el TAC. Debe verificarse analítica reciente de función renal (creatinina y filtrado glomerular) y descartar alergias previas al yodo o asma grave no controlada.
    4. HIDRATACIÓN: Beber 1 litro de agua en las horas previas y posteriores para proteger los riñones y acelerar la eliminación del contraste.
    5. RADIOPROTECCIÓN: Evitar contacto con embarazadas y niños 8 horas.
    
    Incluye al final: [SUGERENCIAS: ¿Tengo que beber agua? | ¿Alergia al contraste? | ¿Analítica de creatinina?]
  PROMPT
  'FDG_NEUROLOGICO' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
    Especialidad: PET/CT 18F-FDG Cerebral / Neurológico (Deterioro Cognitivo, Demencias y Epilepsia).
    
    PROTOCOLO CLÍNICO:
    1. AYUNO: 6 horas de ayuno estricto de sólidos (solo agua pura).
    2. DIETA: Baja en carbohidratos el día previo.
    3. REPOSO NEUROSENSORIAL ESTRICTO: 30 minutos antes y 40 minutos después de la inyección en sala en penumbra y silencio total. Terminantemente prohibido hablar, leer, escuchar música, mirar el móvil o recibir estímulos visuales/auditivos para no hiperactivar áreas de la corteza cerebral.
    4. MEDICACIÓN: Tomar la medicación neurológica/antiepiléptica según pauta habitual con agua.
    5. RADIOPROTECCIÓN: 8 horas sin contacto estrecho con niños ni embarazadas.
    
    Incluye al final: [SUGERENCIAS: ¿Por qué reposo en silencio? | ¿Puedo tomar mi medicación? | ¿Cuánto dura la prueba?]
  PROMPT
  'F18_COLINA' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
    Especialidad: PET/CT 18F-Fluorocolina (Próstata / Recidiva Bioquímica e Hiperparatiroidismo).
    
    PROTOCOLO CLÍNICO:
    1. AYUNO: 4 a 6 horas de ayuno de sólidos. Se permite y aconseja beber abundante agua sola.
    2. DIETA: NO requiere dieta pobre en hidratos de carbono ni supresión de azúcar (la Colina es un precursor fosfolipídico de membrana, no glucosa). Puedes comer normal el día anterior.
    3. TIEMPOS: Adquisición precoz y/o a los 15-30 minutos según indicación médica.
    4. RADIOPROTECCIÓN: 8 horas de protección con niños y embarazadas. Beber agua para orinar.
    
    Incluye al final: [SUGERENCIAS: ¿Debo hacer dieta sin azúcar? | ¿Cuántas horas de ayuno? | ¿Cuánto dura la prueba?]
  PROMPT
  'PSMA' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
    Especialidad: PET/CT 68Ga-PSMA / 18F-PSMA (Cáncer de Próstata).
    
    PROTOCOLO CLÍNICO:
    1. AYUNO: 4 a 6 horas de ayuno simple de sólidos. Beber abundante agua sola.
    2. DIETA: Dieta normal el día anterior (no requiere dieta cetogénica ni sin hidratos).
    3. HIDRATACIÓN FORZADA: Muy importante beber 1 litro de agua durante los 60 minutos de espera tras la inyección para favorecer la diuresis y vaciar completamente la vejiga justo antes de entrar al tomógrafo.
    4. RADIOPROTECCIÓN: 8 horas de distancia con niños y embarazadas.
    
    Incluye al final: [SUGERENCIAS: ¿Tengo que beber mucha agua? | ¿Puedo comer normal el día antes? | ¿Cuánto dura?]
  PROMPT
  'GA68_DOTATOC' => <<~PROMPT,
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
    Especialidad: PET/CT 68Ga-DOTATOC (Tumores Neuroendocrinos).
    
    PROTOCOLO CLÍNICO:
    1. AYUNO: 4 a 6 horas con abundante agua sola.
    2. ANÁLOGOS DE SOMATOSTATINA: Consultar con el médico si debes suspender la inyección de octreótida o lanreótida según pauta clínica.
    3. TIEMPOS: 60 minutos de reposo tras la inyección y escaneo de 20 minutos.
    4. RADIOPROTECCIÓN: 8 horas de precaución con niños y embarazadas.
    
    Incluye al final: [SUGERENCIAS: ¿Debo suspender mi medicación? | ¿Cómo es el ayuno? | ¿Cuánto dura la prueba?]
  PROMPT
  'DEFAULT' => <<~PROMPT
    Eres la enfermera/o virtual del Servicio de Medicina Nuclear de Galaria · SERGAS (Hospital do Meixoeiro, Vigo).
    Orienta al paciente con tono humano, tranquilizador y preciso sobre la preparación de su estudio PET/CT, ayuno, hidratación y radioprotección de 8 horas.
    Si detectas dolor torácico o síncope, ordena llamar de inmediato al 061/112.
    Al final, incluye [SUGERENCIAS: Pregunta 1 | Pregunta 2].
  PROMPT
}

GUIDELINES_DIR = File.join(BASE_DIR, 'pet_prep_page', 'guias_clinicas_ia')

PROTOCOL_FILE_MAP = {
  'FDG_ONCOLOGICO'  => 'FDG_ONCOLOGICO.md',
  'FDG_NO_DIABETICO'=> 'FDG_ONCOLOGICO.md',
  'FDG_DIABETICO'   => 'FDG_DIABETICO.md',
  'FDG_ENDOCARDITIS'=> 'FDG_ENDOCARDITIS.md',
  'ENDOCARDITIS'    => 'FDG_ENDOCARDITIS.md',
  'FDG_VASCULITIS'  => 'FDG_VASCULITIS.md',
  'VASCULITIS'      => 'FDG_VASCULITIS.md',
  'FDG_NEUROLOGICO' => 'FDG_NEUROLOGICO.md',
  'NEURO'           => 'FDG_NEUROLOGICO.md',
  'FDG_CONTRASTE'   => 'FDG_CONTRASTE.md',
  'F18_COLINA'      => 'F18_COLINA.md',
  'PSMA'            => 'PSMA.md',
  'NON_FDG'         => 'PSMA.md',
  'GA68_DOTATOC'    => 'GA68_DOTATOC.md'
}

def load_clinical_guideline_prompt(study_type)
  st = study_type.to_s.upcase.strip
  common_path = File.join(GUIDELINES_DIR, '00_REGLAS_BLINDAJE_COMUN.md')
  common_text = File.exist?(common_path) ? File.read(common_path, encoding: 'UTF-8') : ''

  proto_filename = PROTOCOL_FILE_MAP[st] || 'FDG_ONCOLOGICO.md'
  proto_path = File.join(GUIDELINES_DIR, proto_filename)
  proto_text = if File.exist?(proto_path)
                 File.read(proto_path, encoding: 'UTF-8')
               else
                 CLINICAL_SYSTEM_PROMPTS[st] || CLINICAL_SYSTEM_PROMPTS['DEFAULT']
               end

  "#{common_text}\n\n========================================\n#{proto_text}"
end

server.mount_proc '/api/chat/guidelines' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json; charset=utf-8'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  if req.request_method == 'GET'
    st = (req.query['study_type'] || 'FDG_ONCOLOGICO').to_s.upcase.strip
    fname = (st == 'COMUN') ? '00_REGLAS_BLINDAJE_COMUN.md' : (PROTOCOL_FILE_MAP[st] || 'FDG_ONCOLOGICO.md')
    fpath = File.join(GUIDELINES_DIR, fname)
    content = File.exist?(fpath) ? File.read(fpath, encoding: 'UTF-8') : (CLINICAL_SYSTEM_PROMPTS[st] || '')
    res.status = 200
    res.body = JSON.generate({
      status: 'ok',
      study_type: st,
      filename: fname,
      content: content,
      available_files: ['00_REGLAS_BLINDAJE_COMUN.md'] + PROTOCOL_FILE_MAP.values.uniq
    })
  elsif req.request_method == 'POST'
    body = JSON.parse(req.body.to_s) rescue {}
    st = (body['study_type'] || 'FDG_ONCOLOGICO').to_s.upcase.strip
    new_content = (body['content'] || '').to_s
    fname = (st == 'COMUN') ? '00_REGLAS_BLINDAJE_COMUN.md' : (PROTOCOL_FILE_MAP[st] || 'FDG_ONCOLOGICO.md')
    Dir.mkdir(GUIDELINES_DIR) unless Dir.exist?(GUIDELINES_DIR)
    fpath = File.join(GUIDELINES_DIR, fname)
    File.write(fpath, new_content, encoding: 'UTF-8')
    res.status = 200
    res.body = JSON.generate({
      status: 'ok',
      study_type: st,
      filename: fname,
      message: "Guía clínica #{fname} actualizada y activa en el motor de IA"
    })
  end
end

server.mount_proc '/api/chat/config' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  if req.request_method == 'GET'
    key = get_gemini_api_key
    has_key = !key.empty?
    preview = has_key ? "#{key[0..5]}...#{key[-4..-1]}" : ""
    res.status = 200
    res.body = JSON.generate({
      status: 'ok',
      has_key: has_key,
      preview: preview,
      model: 'gemini-2.5-flash'
    })
  elsif req.request_method == 'POST'
    body = JSON.parse(req.body) rescue {}
    new_key = (body['gemini_api_key'] || body['apiKey'] || '').to_s.strip
    cfg = get_gemini_config
    cfg['gemini_api_key'] = new_key
    cfg['updated_at'] = Time.now.strftime('%Y-%m-%d %H:%M:%S')
    File.write(CONFIG_PATH, JSON.pretty_generate(cfg))
    res.status = 200
    res.body = JSON.generate({
      status: 'ok',
      has_key: !new_key.empty?,
      message: 'Configuración de Gemini actualizada'
    })
  end
end

server.mount_proc '/api/chat/ask' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'
  res['Content-Type'] = 'application/json'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = JSON.parse(req.body) rescue {}
    user_msg = (body['message'] || body['prompt'] || '').to_s.strip
    study_type = (body['study_type'] || 'FDG_ONCOLOGICO').to_s.upcase
    patient_name = (body['patient_name'] || '').to_s.strip
    patient_hora = (body['patient_hora'] || '08:20').to_s.strip
    patient_fecha = (body['patient_fecha'] || '').to_s.strip
    fasting_start_hour = (body['fasting_start_hour'] || '').to_s.strip
    semantic_context = (body['semantic_context'] || '').to_s.strip
    custom_guideline = (body['custom_guideline'] || '').to_s.strip
    history = body['history'] || []
    explicit_key = body['api_key']

    if user_msg.empty?
      res.status = 400
      res.body = JSON.generate({ status: 'error', message: 'Mensaje vacío' })
      next
    end

    api_key = get_gemini_api_key(explicit_key)
    system_prompt = load_clinical_guideline_prompt(study_type)

    if !custom_guideline.empty?
      system_prompt += "\n\n[DIRECTRICES ADICIONALES PERSONALIZADAS DE LA UNIDAD]:\n#{custom_guideline}"
    end

    system_prompt += "\n\n[DATOS PERSONALIZADOS DE LA CITA DEL PACIENTE]:\n"
    system_prompt += "- Nombre del paciente: #{patient_name.empty? ? 'Paciente citado' : patient_name}\n"
    system_prompt += "- Hora oficial de cita en Hospital do Meixoeiro (Planta -1, Medicina Nuclear): #{patient_hora} h#{patient_fecha.empty? ? '' : " (Fecha: #{patient_fecha})"}\n"
    system_prompt += "- Hora límite exacta calculada para iniciar el ayuno: #{fasting_start_hour} h\n" unless fasting_start_hour.empty?

    if !semantic_context.empty?
      system_prompt += <<~SEMANTIC_BLOCK

        ========================================
        [DICTAMEN_VERIFICADO_MOTOR_SEMANTICO_SERGAS (FUENTE DE VERDAD OBLIGATORIA)]:
        El motor clínico determinista del Servicio de Medicina Nuclear ha evaluado la consulta del paciente y ha dictaminado lo siguiente:
        """
        #{semantic_context}
        """
        INSTRUCCIÓN DE BLINDAJE CLÍNICO:
        Usa este dictamen verificado y la Guía Clínica anterior para redactar tu respuesta de forma cálida, humana, clara y bien estructurada (con viñetas y negritas). Respeta al 100 % todas las horas, cifras, alimentos, fármacos y advertencias del dictamen verificado sin contradecir ninguno.
      SEMANTIC_BLOCK
    else
      system_prompt += <<~NO_SEMANTIC_BLOCK

        ========================================
        [ALERTA DE BLINDAJE CLÍNICO — CONSULTA ESPECÍFICA]:
        El motor determinista no ha encontrado una coincidencia estándar para esta pregunta.
        1. Si la respuesta está explícitamente contenida en la Guía Clínica Oficial anterior, respóndela ciñéndote estrictamente a la guía.
        2. Si la pregunta trata sobre un caso clínico particular, medicación específica no listada o cualquier duda que NO esté explícitamente resuelta en la guía, NO INVENTES NADA. Explícale con empatía que debe confirmarlo enfermería de Medicina Nuclear e incluye obligatoriamente al final de tu respuesta el código exacto:
        [BOTON_ENVIAR_ENFERMERIA:#{user_msg.gsub(/[\[\]\n]/, ' ').strip}]
      NO_SEMANTIC_BLOCK
    end

    system_prompt += "\nAl final de tu respuesta, incluye una línea con 2 o 3 sugerencias breves con el formato: [SUGERENCIAS: Pregunta 1 | Pregunta 2 | Pregunta 3]"

    if api_key.empty?
      # Fallback cuando no hay API Key configurada
      res.status = 200
      res.body = JSON.generate({
        status: 'fallback',
        source: 'local_engine',
        message: 'No hay GEMINI_API_KEY configurada. Se utilizará el motor clínico local.',
        has_key: false
      })
      next
    end

    contents = []
    # Incluir hasta 4 turnos previos para memoria de contexto
    history.last(4).each do |turn|
      role = (turn['role'] == 'user') ? 'user' : 'model'
      turn_text = (turn['text'] || turn['content'] || '').to_s.strip
      contents << { role: role, parts: [{ text: turn_text }] } unless turn_text.empty?
    end
    contents << { role: 'user', parts: [{ text: user_msg }] }

    payload = {
      contents: contents,
      systemInstruction: {
        parts: [{ text: system_prompt }]
      },
      generationConfig: {
        temperature: 0.20,
        maxOutputTokens: 850
      }
    }

    # LLAMADA A LA API DE GOOGLE GEMINI (gemini-2.5-flash / gemini-2.0-flash / gemini-1.5-flash / gemini-flash-latest)
    api_response = nil
    used_model = 'gemini-2.5-flash'
    last_error = nil
    ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'].each do |mod|
      uri = URI.parse("https://generativelanguage.googleapis.com/v1beta/models/#{mod}:generateContent?key=#{api_key}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true
      http.read_timeout = 6
      http.open_timeout = 3
      post_req = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
      post_req.body = JSON.generate(payload)
      begin
        http_res = http.request(post_req)
        api_response = http_res
        if http_res.code.to_i == 200
          used_model = mod
          break
        end
      rescue => e
        last_error = e.message
      end
    end

    if api_response && api_response.code.to_i == 200
      parsed_api = JSON.parse(api_response.body)
      raw_text = parsed_api.dig('candidates', 0, 'content', 'parts', 0, 'text') || ''

      # Extraer sugerencias si el modelo las incluyó al final
      suggestions = []
      clean_answer = raw_text
      if raw_text =~ /\[SUGERENCIAS:\s*([^\]]+)\]/i
        sug_str = $1
        clean_answer = raw_text.sub(/\[SUGERENCIAS:[^\]]+\]/i, '').strip
        suggestions = sug_str.split('|').map(&:strip).reject(&:empty?).map do |s|
          { label: s, query: s }
        end
      end

      res.status = 200
      res.body = JSON.generate({
        status: 'success',
        source: 'gemini',
        model: used_model,
        answer: clean_answer,
        suggestions: suggestions
      })
    elsif api_response
      res.status = 200
      res.body = JSON.generate({
        status: 'fallback',
        source: 'local_engine',
        error_detail: "Gemini HTTP #{api_response.code}: #{api_response.body[0..150]}",
        message: 'Fallo de conexión con Gemini, alternando a motor clínico local'
      })
    else
      res.status = 200
      res.body = JSON.generate({
        status: 'fallback',
        source: 'local_engine',
        error_detail: last_error || 'Timeout de red con Gemini',
        message: 'Tiempo de espera agotado con la API de Gemini, alternando a motor clínico local'
      })
    end
  rescue => e
    res.status = 200
    res.body = JSON.generate({
      status: 'fallback',
      source: 'local_engine',
      error_detail: e.message,
      message: 'Excepción de red, alternando a motor clínico local'
    })
  end
end

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

puts "🚀 Servidor Integrado SERGAS/Galaria PET activo en http://localhost:#{PORT}"
server.start
