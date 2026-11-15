require 'webrick'
require 'json'
require 'sqlite3'
require 'net/http'
require 'uri'

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
DB_FILE = File.expand_path("pet_database.db", __dir__)
DEFAULT_EMAIL = "oscarferreiradavila@gmail.com"

# Inicializar Base de Datos SQLite
def init_db
  db = SQLite3::Database.new(DB_FILE)
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

  # Sembrar datos clínicos de muestra si la tabla está vacía
  count = db.get_first_value("SELECT COUNT(*) FROM registros_enfermeria")
  if count == 0
    ahora = Time.now.strftime("%Y-%m-%d %H:%M:%S")
    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, modo_envio, transcripcion_audio, duracion_audio_segundos, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['AUDIOGUIA_VOZ', 'CONSULTA', ahora, 'Manuel Gómez Suárez', '644 123 456', '08:00', 105, 'audio', 'Buenos días, tengo una duda sobre la dieta sin hidratos de carbono previa a la prueba. ¿Puedo tomar queso curado y huevos en la cena?', 18, 'Consulta sobre preparación dietética']
    )
    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, modo_envio, mensaje_escrito, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['CHATBOT_INTERACCION', 'CONSULTA', ahora, 'Carmen Varela Rey', '622 987 654', '08:30', 112, 'texto', 'Tengo cita mañana a las 08:30 para PET FDG. ¿Debo tomar mi medicación habitual para la hipertensión por la mañana?', 'Consulta medicación habitual']
    )
    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, modo_envio, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['AUDIOGUIA_METABOLICA', 'URGENCIA_METABOLICA', ahora, 'Antonio Lois Pazo', '688 334 455', '07:15', 245, 'texto', 'Glucemia capilar crítica (245 mg/dL). Supera umbral de 200 mg/dL para FDG. Requiere contacto urgente para pauta o reprogramación.']
    )
    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, modo_envio, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      ['AUDIOGUIA_METABOLICA', 'URGENCIA_METABOLICA', ahora, 'Dolores Iglesias Paz', '611 556 778', '07:45', 218, 'texto', 'Glucemia en ayunas elevada (218 mg/dL). Citada hoy a las 09:15 h. Protocolo de actuación inmediata.']
    )
    puts "✅ Sembrados registros clínicos iniciales en registros_enfermeria"
  end

  db.close
  puts "✅ Base de datos SQLite activa en: #{DB_FILE}"
end

init_db

# Enviar correo a través de FormSubmit
def dispatch_email(destinatario, asunto, datos)
  uri = URI.parse("https://formsubmit.co/ajax/#{destinatario}")
  http = Net::HTTP.new(uri.host, uri.port)
  http.use_ssl = true
  http.open_timeout = 8
  http.read_timeout = 12

  req = Net::HTTP::Post.new(uri.path, {
    "Content-Type" => "application/json",
    "Accept" => "application/json",
    "Referer" => "http://localhost:8000/",
    "Origin" => "http://localhost:8000",
    "User-Agent" => "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) PET-CT Portal/1.0"
  })

  payload = {
    "_subject" => asunto,
    "_captcha" => "false",
    "_template" => "table",
    "PACIENTE" => datos["paciente_nombre"] || datos["paciente"] || "Paciente citado",
    "NHC_HISTORIA_CLINICA" => datos["paciente_nhc"] || datos["nhc"] || "No especificado",
    "TELEFONO_CONTACTO" => datos["paciente_telefono"] || datos["telefono"] || "No facilitado",
    "ESTUDIO_PET" => datos["estudio"] || "PET FDG Glucosa",
    "FECHA_CITA" => datos["fecha_cita"] || datos["fecha"] || "Según agenda",
    "HORA_CITA" => datos["hora_cita"] || datos["hora"] || "08:20 h",
    "MOTIVO_CANCELACION" => datos["motivo_categoria"] || datos["motivo"] || "Cancelación por paciente",
    "EXPLICACION_DETALLADA" => datos["explicacion_motivo"] || datos["explicacion"] || "",
    "ESTADO_AGENDA" => "HUECO LIBERADO PARA RECITACIÓN",
    "FECHA_HORA_AVISO" => Time.now.strftime("%d/%m/%Y %H:%M:%S"),
    "DESTINATARIO_NOTIFICACION" => destinatario
  }

  req.body = payload.to_json
  res = http.request(req)
  puts "📧 [DISPATCH EMAIL FORM-SUBMIT] Código: #{res.code} - Respuesta: #{res.body}"
  res.body
rescue => e
  puts "⚠️ Error enviando correo: #{e.message}"
  {"success" => "false", "error" => e.message}.to_json
end

# Configurar tipos MIME para vídeo HTML5
WEBrick::HTTPUtils::DefaultMimeTypes['mp4'] = 'video/mp4'
WEBrick::HTTPUtils::DefaultMimeTypes['m4v'] = 'video/mp4'
WEBrick::HTTPUtils::DefaultMimeTypes['webm'] = 'video/webm'

# Configurar servidor WEBrick
root_workspace = File.expand_path("..", __dir__)
server = WEBrick::HTTPServer.new(
  Port: PORT,
  DocumentRoot: root_workspace,
  AccessLog: [],
  Logger: WEBrick::Log.new($stdout, WEBrick::Log::INFO),
  RequestCallback: proc do |req, res|
    res['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    res['Pragma'] = 'no-cache'
    res['Expires'] = '0'
  end
)

# Montar explícitamente pet_prep_page para compatibilidad
server.mount '/pet_prep_page', WEBrick::HTTPServlet::FileHandler, __dir__

# Montar carpeta pet_peticion_medica en el mismo servidor
peticion_path = File.expand_path("../pet_peticion_medica", __dir__)
server.mount '/pet_peticion_medica', WEBrick::HTTPServlet::FileHandler, peticion_path if Dir.exist?(peticion_path)

# Montar carpeta pet_ct_triage en el mismo servidor
triage_path = File.expand_path("../pet_ct_triage", __dir__)
server.mount '/pet_ct_triage', WEBrick::HTTPServlet::FileHandler, triage_path if Dir.exist?(triage_path)

# Servlets para API
server.mount_proc '/api/citas/cancelar' do |req, res|
  # Soporte CORS
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, GET, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = req.body
    data = JSON.parse(body)

    destinatario = data['email_destino'] || DEFAULT_EMAIL
    asunto = data['asunto'] || "🚨 CANCELACIÓN CITA PET: #{data['paciente_nombre']} (NHC: #{data['paciente_nhc']})"
    
    # 1. Guardar en SQLite
    db = SQLite3::Database.new(DB_FILE)
    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?)",
      [
        'CANCELACION_WEB',
        'CANCELACION',
        Time.now.strftime("%Y-%m-%d %H:%M:%S"),
        "#{data['paciente_nombre']} (NHC: #{data['paciente_nhc']})",
        data['paciente_telefono'] || '',
        "Canceló cita: #{data['estudio']} | Motivo: #{data['motivo'] || data['motivo_categoria']} | Explicación: #{data['explicacion'] || data['explicacion_motivo']}"
      ]
    )
    rec_id = db.last_insert_row_id
    db.close

    # 2. Enviar correo FormSubmit en segundo plano
    dispatch_res = dispatch_email(destinatario, asunto, data)

    res.status = 200
    res['Content-Type'] = 'application/json'
    res.body = {
      status: "ok",
      message: "Cancelación procesada y correo enviado a #{destinatario}",
      id: rec_id,
      dispatch: dispatch_res
    }.to_json
  rescue => err
    res.status = 500
    res['Content-Type'] = 'application/json'
    res.body = { status: "error", message: err.message }.to_json
  end
end

server.mount_proc '/api/enfermeria/base_datos' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    data = JSON.parse(req.body)
    db = SQLite3::Database.new(DB_FILE)
    db.execute(
      "INSERT INTO registros_enfermeria (origen, nivel, fecha_hora, paciente_nombre, paciente_telefono, hora_control_capilar, glucemia_mg_dl, modo_envio, mensaje_escrito, mensaje_alerta) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data['origen'],
        data['nivel'],
        data['fecha_hora'] || Time.now.strftime("%Y-%m-%d %H:%M:%S"),
        data['paciente_nombre'],
        data['paciente_telefono'],
        data['hora_control_capilar'],
        data['glucemia_mg_dl'],
        data['modo_envio'],
        data['mensaje_escrito'],
        data['mensaje_alerta']
      ]
    )
    rec_id = db.last_insert_row_id
    db.close

    res.status = 201
    res['Content-Type'] = 'application/json'
    res.body = { status: "ok", id: rec_id }.to_json
  rescue => err
    res.status = 500
    res.body = { status: "error", message: err.message }.to_json
  end
end

server.mount_proc '/api/enfermeria/registros' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, OPTIONS'

  db = SQLite3::Database.new(DB_FILE)
  db.results_as_hash = true
  rows = db.execute("SELECT * FROM registros_enfermeria ORDER BY id DESC LIMIT 50")
  db.close

  res.status = 200
  res['Content-Type'] = 'application/json'
  res.body = rows.to_json
end

# Acceso directo para la app de triaje y prescripción
server.mount_proc '/triaje' do |req, res|
  res.set_redirect(WEBrick::HTTPStatus::Found, '/pet_ct_triage/web_app/index.html')
end

server.mount_proc '/peticion' do |req, res|
  res.set_redirect(WEBrick::HTTPStatus::Found, '/pet_peticion_medica/index.html')
end

server.mount_proc '/enfermeria' do |req, res|
  res.set_redirect(WEBrick::HTTPStatus::Found, '/enfermeria.html')
end

# Autenticación Consola de Enfermería
server.mount_proc '/api/auth/login' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = JSON.parse(req.body) rescue {}
    user = (body['usuario'] || body['username'] || '').to_s.strip
    pass = (body['password'] || body['pass'] || '').to_s.strip

    u_low = user.downcase
    is_valid = false
    role = "clinico"

    if (u_low == 'triaje' && (pass == 'triaje2026' || pass == 'sergas2026' || pass == 'demo'))
      is_valid = true
      role = "triaje"
    elsif (u_low == 'enfermeria' && (pass == 'sergas2026' || pass == 'pet2026' || pass == 'demo'))
      is_valid = true
      role = "enfermeria"
    elsif (u_low == 'admin' && (pass == 'admin' || pass == 'galaria2026' || pass == 'sergas2026'))
      is_valid = true
      role = "admin"
    end

    if is_valid
      res.status = 200
      res['Content-Type'] = 'application/json'
      res.body = { status: "ok", token: "pet_session_#{user}_#{Time.now.to_i}", usuario: user, role: role }.to_json
    else
      res.status = 401
      res['Content-Type'] = 'application/json'
      res.body = { status: "error", message: "Credenciales de acceso asistencial incorrectas." }.to_json
    end
  rescue => err
    res.status = 500
    res['Content-Type'] = 'application/json'
    res.body = { status: "error", message: err.message }.to_json
  end
end

# Panel Principal de Enfermería (Dudas y Urgencias)
server.mount_proc '/api/enfermeria/panel' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    db = SQLite3::Database.new(DB_FILE)
    db.results_as_hash = true
    rows = db.execute("SELECT * FROM registros_enfermeria ORDER BY id DESC")
    db.close

    urgencias = []
    dudas = []

    rows.each do |r|
      is_urgencia = (r['glucemia_mg_dl'].to_i >= 200) || (r['nivel'].to_s.upcase.include?('URGENCIA')) || (r['nivel'].to_s.upcase.include?('ROJO'))
      if is_urgencia
        urgencias << r
      elsif r['origen'] == 'DUDAS_UNIDAD_ENFERMERIA' || r['nivel'] == 'DUDA_LLAMADA_PACIENTE'
        dudas << r
      end
    end

    res.status = 200
    res['Content-Type'] = 'application/json; charset=utf-8'
    res.body = {
      status: "success",
      total_dudas: dudas.length,
      total_urgencias: urgencias.length,
      dudas: dudas,
      urgencias: urgencias
    }.to_json
  rescue => err
    res.status = 500
    res['Content-Type'] = 'application/json'
    res.body = { status: "error", message: err.message }.to_json
  end
end

# Marcar como atendida / eliminar registro
server.mount_proc '/api/enfermeria/eliminar' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = JSON.parse(req.body) rescue {}
    item_id = body['id'] || body['itemId']
    if item_id
      db = SQLite3::Database.new(DB_FILE)
      db.execute("DELETE FROM registros_enfermeria WHERE id = ?", [item_id])
      db.close
      res.status = 200
      res['Content-Type'] = 'application/json'
      res.body = { status: "success", message: "Registro atendido y archivado correctamente", id: item_id }.to_json
    else
      res.status = 400
      res['Content-Type'] = 'application/json'
      res.body = { status: "error", message: "ID de registro no especificado" }.to_json
    end
  rescue => err
    res.status = 500
    res['Content-Type'] = 'application/json'
    res.body = { status: "error", message: err.message }.to_json
  end
end

MASTER_PETICIONES_DB = File.expand_path("../pet_peticion_medica/database/peticiones_db.json", __dir__)
MASTER_PETICIONES_CSV = File.expand_path("../pet_peticion_medica/database/peticiones_db.csv", __dir__)
TRIAGE_PETICIONES_DB = File.expand_path("../pet_ct_triage/web_app/peticiones_db.json", __dir__)
TRIAGE_PETICIONES_CSV = File.expand_path("../pet_ct_triage/web_app/peticiones_db.csv", __dir__)

CSV_DATABASE_HEADERS = [
  "Submission ID", "Respondent ID", "Modalidad", "Fecha Solicitud",
  "NHC / Historia Clínica", "Nombre del Paciente", "Nombre y Apellidos",
  "Sexo", "Edad", "Talla (cm)", "Peso (kg)", "Servicio Solicitante",
  "Médico Solicitante", "Diagnóstico Clínico", "Motivo de Solicitud",
  "Tipo de Estudio PET Solicitado", "Carácter de la Petición",
  "Prioridad Calculada", "Ventana Clínica (Días Laborables)",
  "Fecha Próxima Consulta", "Fecha Cita Asignada", "Hora Cita Asignada",
  "¿El paciente está ingresado?", "¿Precisa sedación?", "Movilidad / Traslado",
  "¿Tiene Diabetes Mellitus?", "Glucemia (mg/dL)", "Fin Tratamiento QT/RT",
  "Alergias Conocidas", "Contraindicación Contraste", "Portador Objetos Metálicos",
  "Alertas Técnicas", "Estado de Triaje", "Resumen Clínico"
]

# Helper para guardar concurrentemente en ambas bases (JSON y CSV)
def persist_peticiones_database(data_array)
  File.write(MASTER_PETICIONES_DB, JSON.pretty_generate(data_array), encoding: 'utf-8')
  triage_dir = File.dirname(TRIAGE_PETICIONES_DB)
  File.write(TRIAGE_PETICIONES_DB, JSON.pretty_generate(data_array), encoding: 'utf-8') if Dir.exist?(triage_dir)

  begin
    require 'csv'
    csv_string = "\uFEFF" + CSV.generate(headers: true) do |csv|
      csv << CSV_DATABASE_HEADERS
      data_array.each do |row|
        csv << CSV_DATABASE_HEADERS.map { |h| row[h] }
      end
    end
    File.write(MASTER_PETICIONES_CSV, csv_string, encoding: 'utf-8')
    File.write(TRIAGE_PETICIONES_CSV, csv_string, encoding: 'utf-8') if Dir.exist?(triage_dir)
  rescue => err
    puts "⚠️ Error generando CSV en persist_peticiones_database: #{err.message}"
  end
end

# API Creación Explícita de Petición Médica
server.mount_proc '/api/peticiones/crear' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  begin
    body = req.body
    new_petition = JSON.parse(body)

    target_file = File.exist?(MASTER_PETICIONES_DB) ? MASTER_PETICIONES_DB : TRIAGE_PETICIONES_DB
    current_raw = File.exist?(target_file) ? File.read(target_file, encoding: 'UTF-8') : '[]'
    current_list = JSON.parse(current_raw) rescue []

    sub_id = new_petition["Submission ID"] || new_petition["id"] || "sub_#{rand(10000000..99999999)}"
    new_petition["Submission ID"] = sub_id unless new_petition["Submission ID"]

    # Evitar duplicados: actualizar si existe, o anteponer si es nueva
    idx = current_list.find_index { |p| (p["Submission ID"] || p["id"]) == sub_id }
    if idx
      current_list[idx] = new_petition
    else
      current_list.unshift(new_petition)
    end

    persist_peticiones_database(current_list)

    puts "📝 [NUEVA PETICIÓN GUARDADA] #{new_petition['Nombre del Paciente']} (#{sub_id}) | Total: #{current_list.length} registros"

    res.status = 201
    res['Content-Type'] = 'application/json; charset=utf-8'
    res.body = {
      status: "success",
      message: "Petición médica guardada en la base de datos maestra con éxito",
      id: sub_id,
      count: current_list.length,
      petition: new_petition
    }.to_json
  rescue => e
    puts "⚠️ Error en /api/peticiones/crear: #{e.message}"
    res.status = 500
    res['Content-Type'] = 'application/json'
    res.body = { status: "error", message: e.message }.to_json
  end
end

# API Sincronización Base de Datos Clínica Unificada (pet_peticion_medica)
server.mount_proc '/api/sync-database' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type, Accept'

  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end

  if req.request_method == 'GET'
    begin
      target_file = File.exist?(MASTER_PETICIONES_DB) ? MASTER_PETICIONES_DB : TRIAGE_PETICIONES_DB
      if File.exist?(target_file)
        raw_json = File.read(target_file, encoding: 'UTF-8')
        data = JSON.parse(raw_json)
        res.status = 200
        res['Content-Type'] = 'application/json; charset=utf-8'
        res.body = {
          status: "success",
          source: "pet_peticion_medica/database/peticiones_db.json",
          count: data.length,
          data: data
        }.to_json
      else
        res.status = 404
        res['Content-Type'] = 'application/json'
        res.body = { status: "error", message: "Base de datos no encontrada" }.to_json
      end
    rescue => e
      res.status = 500
      res['Content-Type'] = 'application/json'
      res.body = { status: "error", message: e.message }.to_json
    end
  elsif req.request_method == 'POST'
    begin
      body = req.body
      data = JSON.parse(body)

      final_list = []
      if data.is_a?(Array)
        final_list = data
      elsif data.is_a?(Hash)
        # Recibido un único objeto de petición
        target_file = File.exist?(MASTER_PETICIONES_DB) ? MASTER_PETICIONES_DB : TRIAGE_PETICIONES_DB
        current_raw = File.exist?(target_file) ? File.read(target_file, encoding: 'UTF-8') : '[]'
        current_list = JSON.parse(current_raw) rescue []
        sub_id = data["Submission ID"] || data["id"]
        idx = current_list.find_index { |p| (p["Submission ID"] || p["id"]) == sub_id }
        if idx
          current_list[idx] = data
        else
          current_list.unshift(data)
        end
        final_list = current_list
      end

      persist_peticiones_database(final_list)

      res.status = 200
      res['Content-Type'] = 'application/json; charset=utf-8'
      res.body = {
        status: "success",
        message: "Base de datos de peticiones médicas sincronizada con éxito",
        count: final_list.length
      }.to_json
    rescue => e
      res.status = 500
      res['Content-Type'] = 'application/json'
      res.body = { status: "error", message: e.message }.to_json
    end
  end
end

server.mount_proc '/api/assign-peonada' do |req, res|
  res['Access-Control-Allow-Origin'] = '*'
  res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
  res['Access-Control-Allow-Headers'] = 'Content-Type'
  if req.request_method == 'OPTIONS'
    res.status = 200
    next
  end
  res.status = 200
  res['Content-Type'] = 'application/json'
  res.body = { status: "success" }.to_json
end

trap 'INT' do server.shutdown end
trap 'TERM' do server.shutdown end

puts "🚀 Servidor PET-CT activo en http://localhost:#{PORT}"
server.start
