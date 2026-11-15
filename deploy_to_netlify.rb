require 'net/http'
require 'json'
require 'uri'
require 'fileutils'
require 'tmpdir'

$stdout.sync = true

CONFIG_FILE = File.expand_path('.netlify_config.json', __dir__)
SITE_ID = 'e44a3774-984a-416f-9048-36c2224928cd'

unless File.exist?(CONFIG_FILE)
  puts "❌ Error: No se encuentra .netlify_config.json"
  exit 1
end

config = JSON.parse(File.read(CONFIG_FILE))
token = config['token']

zip_path = "/tmp/pet_deploy_live.zip"
FileUtils.rm_f(zip_path)
base_dir = File.expand_path(__dir__)

puts "📦 Empaquetando suite PET/CT con vídeo incluido..."

WEB_TARGETS = [
  "index.html",
  "_redirects",
  "_headers",
  "Video_Completo_PET_CT_1_al_16.mp4",
  "pet_chat_human_stream.js",
  "pet_demo_reset.js",
  "MANUAL_ECOSISTEMA_PET_CT.html",
  "MANUAL_ECOSISTEMA_PET_CT.pdf",
  "PRESENTACION_GERENCIA_ECOSISTEMA_PET_CT.html",
  "DOCUMENTO_EXPLICATIVO_GERENCIA_JEFATURA_PET_CT.html",
  "DOCUMENTO_EXPLICATIVO_GERENCIA_JEFATURA_PET_CT.pdf",
  "pet_consola_medica",
  "pet_consola_tecnicos",
  "pet_jefatura_servicio",
  "pet_peticion_medica",
  "pet_prep_page",
  "pet_ct_triage",
  "colina_paratiroides",
  "colina_prostata",
  "fdg_contraste",
  "\"FDG+contraste\"",
  "fdg_endocarditis",
  "fdg_vasculitis",
  "\"audioguia ga68\"",
  "audioguia_ga68",
  "psma"
]

cmd = "cd \"#{base_dir}\" && zip -r -y -q -n .mp4:.png:.jpg \"#{zip_path}\" #{WEB_TARGETS.join(' ')} -x \"*cloudflared*\""
success = system(cmd)

unless success && File.exist?(zip_path)
  puts "❌ Fallo al comprimir archivos."
  exit 1
end

zip_size_mb = (File.size(zip_path).to_f / (1024 * 1024)).round(2)
puts "✅ Archivos empaquetados: #{zip_size_mb} MB (incluyendo vídeo MP4 de 41MB)"

puts "🚀 Subiendo a Netlify (ecosistemagalariapet)..."
uri = URI("https://api.netlify.com/api/v1/sites/#{SITE_ID}/deploys")
http = Net::HTTP.new(uri.host, uri.port)
http.use_ssl = true
http.read_timeout = 240
http.open_timeout = 30

req = Net::HTTP::Post.new(uri.request_uri)
req['Authorization'] = "Bearer #{token}"
req['Content-Type'] = 'application/zip'
req.body = File.binread(zip_path)

res = http.request(req)
FileUtils.rm_f(zip_path)

if res.code.to_i.between?(200, 204)
  deploy_data = JSON.parse(res.body) rescue {}
  deploy_url = deploy_data['ssl_url'] || deploy_data['url'] || 'https://ecosistemagalariapet.netlify.app'
  state = deploy_data['state'] || 'ready'
  puts "🎉 DESPLIEGUE COMPLETADO CON ÉXITO!"
  puts "🌐 URL activa en producción: #{deploy_url}"
  puts "📊 Estado: #{state}"
else
  puts "⚠️ Error en la API de Netlify (HTTP #{res.code}): #{res.body[0..300]}"
  exit 1
end
