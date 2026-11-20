#!/bin/bash
# ==============================================================================
# SUBIR A GITHUB PAGES — ECOSISTEMA DIGITAL PET/CT (GALARIA · SERGAS)
# Doble clic en este archivo para subir automáticamente todos los cambios a la web
# ==============================================================================

cd "$(dirname "$0")" || exit

# Asegurar motor Git de GitHub Desktop (sin requerir herramientas Xcode adicionales)
if [ -d "/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin" ]; then
  export PATH="/Applications/GitHub Desktop.app/Contents/Resources/app/git/bin:/Applications/GitHub Desktop.app/Contents/Resources/app/git/libexec/git-core:$PATH"
fi

echo ""
echo "========================================================"
echo "🚀 INICIANDO SINCRONIZACIÓN CON GITHUB PAGES"
echo "========================================================"
echo ""

# 1. Añadir todos los archivos modificados
echo "📦 Detectando y añadiendo archivos modificados..."
git add .

# 2. Crear commit automático con fecha y hora
FECHA=$(date "+%d/%m/%Y a las %H:%M:%S")
if git diff-index --quiet HEAD --; then
  echo "ℹ️ No hay cambios nuevos pendientes de guardar."
else
  git commit -m "Actualización Ecosistema PET-TC ($FECHA)"
  echo "✅ Cambios guardados localmente."
fi

# 3. Subir a GitHub
echo ""
echo "⬆️ Subiendo cambios a GitHub (rama main)..."
if git push origin main; then
  echo ""
  echo "========================================================"
  echo "🎉 ¡SUBIDA COMPLETADA CON ÉXITO!"
  echo "🌐 Tu web se actualizará sola en 30-60 segundos en:"
  echo "👉 https://oscarferreiradavila-netizen.github.io/EcosistemaPET/"
  echo "========================================================"
else
  echo ""
  echo "⚠️ Hubo un detalle al subir. Si te pide credenciales, introduce tu usuario o ábrelo desde GitHub Desktop."
fi

echo ""
read -n 1 -s -r -p "Presiona cualquier tecla para cerrar esta ventana..."
echo ""
https://www.gstatic.com/antigravity/nuxes/gemini-4-neon.jpg