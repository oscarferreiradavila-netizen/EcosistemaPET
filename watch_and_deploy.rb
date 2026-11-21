require 'find'
require 'fileutils'

$stdout.sync = true

puts "👁️ Vigía de Auto-Actualización Netlify activado..."
puts "Cualquier archivo que modifiques en el IDE se sincronizará automáticamente con https://ecosistemagalariapet.netlify.app"

WATCH_EXTS = %w[.html .js .css .json .md]
IGNORE_DIRS = %w[.git .netlify node_modules pet_ct_triage/bin Presentacion_Sistemas_PET]
DEBOUNCE_SECONDS = 2

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
  sleep 1.5
  current_state = scan_files
  changed_files = []

  current_state.each do |path, mtime|
    if last_state[path].nil? || last_state[path] != mtime
      changed_files << path
    end
  end

  if changed_files.any?
    puts "\n⚡ [AUTO-SYNC] Cambio detectado en: #{changed_files.first(3).join(', ')}#{changed_files.length > 3 ? '...' : ''}"
    puts "⏳ Esperando #{DEBOUNCE_SECONDS}s por si guardas más archivos..."
    sleep DEBOUNCE_SECONDS

    puts "🚀 Desplegando cambios a Netlify..."
    system("ruby deploy_to_netlify.rb")

    last_state = scan_files
    puts "👁️ Listo. Monitorizando #{last_state.length} archivos para el siguiente cambio..."
  end
end
