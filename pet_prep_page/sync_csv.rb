# encoding: utf-8
require 'json'
require 'csv'

json_file = File.expand_path('../pet_peticion_medica/database/peticiones_db.json', __dir__)
csv_file = File.expand_path('../pet_peticion_medica/database/peticiones_db.csv', __dir__)
triage_json = File.expand_path('../pet_ct_triage/web_app/peticiones_db.json', __dir__)
triage_csv = File.expand_path('../pet_ct_triage/web_app/peticiones_db.csv', __dir__)

records = JSON.parse(File.read(json_file, encoding: 'utf-8'))

headers = [
  "Submission ID",
  "Respondent ID",
  "Modalidad",
  "Fecha Solicitud",
  "NHC / Historia Clínica",
  "Nombre del Paciente",
  "Nombre y Apellidos",
  "Sexo",
  "Edad",
  "Talla (cm)",
  "Peso (kg)",
  "Servicio Solicitante",
  "Médico Solicitante",
  "Diagnóstico Clínico",
  "Motivo de Solicitud",
  "Tipo de Estudio PET Solicitado",
  "Carácter de la Petición",
  "Prioridad Calculada",
  "Ventana Clínica (Días Laborables)",
  "Fecha Próxima Consulta",
  "Fecha Cita Asignada",
  "Hora Cita Asignada",
  "¿El paciente está ingresado?",
  "¿Precisa sedación?",
  "Movilidad / Traslado",
  "¿Tiene Diabetes Mellitus?",
  "Glucemia (mg/dL)",
  "Fin Tratamiento QT/RT",
  "Alergias Conocidas",
  "Contraindicación Contraste",
  "Portador Objetos Metálicos",
  "Alertas Técnicas",
  "Estado de Triaje",
  "Resumen Clínico"
]

csv_string = "\uFEFF" + CSV.generate(headers: true) do |csv|
  csv << headers
  records.each do |row|
    csv << headers.map { |h| row[h] }
  end
end

File.write(csv_file, csv_string, encoding: 'utf-8')
File.write(triage_csv, csv_string, encoding: 'utf-8')
File.write(triage_json, JSON.pretty_generate(records), encoding: 'utf-8')

puts "✅ Sincronizados #{records.length} registros en peticiones_db.csv y réplica de triaje."
