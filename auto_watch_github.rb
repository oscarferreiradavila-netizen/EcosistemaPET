# Auto-Sincronizador Continuo con GitHub Pages (Ecosistema PET/CT)
require 'find'
require 'fileutils'

$stdout.sync = true

puts "👁️ Vigía de Auto-Subida a GitHub activado..."
puts "Cualquier archivo que guardes en el IDE se sincronizará automáticamente con GitHub Pages:"
puts "👉 https://oscarferreiradavila-netizen.github.io/EcosistemaPET/\n\n"

WATCH_EXTS = %w[.html .js .css .json .md]
IGNORE_DIRS = %w[.git .netlify node_modules pet_ct_triage/bin scratch]
DEBOUNCE_SECONDS = 3

GIT_ENV = if Dir.exist?("/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin")
  "PATH=\"/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin:/Applications/GitHub Desktop.app/Contents/Resources/app/git/libexec/git-core:$PATH\" git"
else
  "git"
end

def scan_files
  mtimes = {}
  Find.find('.') do |path|
    if File.directory?(path)
      next if path == '.'
      base = File.basename(path)
      if IGNORE_DIRS.include?(base) || base.start_with?('.')
        Find.prune
      end
      next
    end
    ext = File.extname(path).downcase
    if WATCH_EXTS.include?(ext)
      next if path.include?('.netlify_config.json') || path.include?('task-')
      begin
        mtimes[path] = File.mtime(path).to_i
      rescue
      end
    end
  end
  mtimes
end

last_state = scan_files
puts "✅ Monitorizando #{last_state.length} archivos del proyecto. Esperando cambios..."

loop do
  sleep 2
  current_state = scan_files
  changed_files = []

  current_state.each do |path, mtime|
    if last_state[path].nil? || last_state[path] != mtime
      changed_files << path
    end
  end

  if changed_files.any?
    puts "\n⚡ [CAMBIO DETECTADO] en: #{changed_files.first(3).join(', ')}#{changed_files.length > 3 ? '...' : ''}"
    puts "⏳ Esperando #{DEBOUNCE_SECONDS}s por si guardas más archivos..."
    sleep DEBOUNCE_SECONDS

    timestamp = Time.now.strftime("%d/%m/%Y %H:%M:%S")
    puts "📦 Guardando commit en Git local..."
    system("#{GIT_ENV} add .")
    system("#{GIT_ENV} commit -m \"Actualización automática Ecosistema PET (#{timestamp})\"")

    puts "🚀 Subiendo cambios a GitHub (rama main)..."
    success = system("#{GIT_ENV} push origin main")

    if success
      puts "🎉 ¡SUBIDA COMPLETADA CON ÉXITO A GITHUB!"
      puts "🌐 La web en GitHub Pages se actualizará en unos segundos."
    else
      puts "⚠️ No se pudo completar el push automático a GitHub (posible falta de token de autenticación)."
      puts "💡 Puedes hacer push desde GitHub Desktop con un clic o configurar tu Token Personal."
    end

    last_state = scan_files
    puts "👁️ Listo. Monitorizando #{last_state.length} archivos para el siguiente cambio..."
  end
end
