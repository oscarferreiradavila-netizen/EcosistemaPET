import os
import sys
import json
import zipfile
import urllib.request
import urllib.error
import time

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, '.netlify_config.json')
SITE_ID = 'e44a3774-984a-416f-9048-36c2224928cd'

if not os.path.exists(CONFIG_PATH):
    print("❌ Error: No se encuentra .netlify_config.json")
    sys.exit(1)

with open(CONFIG_PATH, 'r', encoding='utf-8') as f:
    config = json.load(f)
token = config.get('token')

IGNORE_PARTS = [
    '.git',
    '.netlify',
    'node_modules',
    'cloudflared',
    '__pycache__',
    '.tmp',
    '.log',
    'pet_deploy_'
]

def should_ignore(rel_path):
    parts = rel_path.replace('\\', '/').split('/')
    for p in parts:
        for ig in IGNORE_PARTS:
            if ig in p:
                return True
    return False

zip_path = f"/tmp/pet_deploy_{int(time.time())}.zip"
print("📦 Empaquetando archivos del proyecto con Python...")

count = 0
with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, dirs, files in os.walk(BASE_DIR):
        rel_root = os.path.relpath(root, BASE_DIR)
        if rel_root != '.' and should_ignore(rel_root):
            continue
        for file in files:
            rel_file = os.path.normpath(os.path.join(rel_root, file))
            if should_ignore(rel_file) or file.startswith('.'):
                if file not in ['.gitignore', '_redirects', '_headers']:
                    continue
            abs_file = os.path.join(root, file)
            try:
                zf.write(abs_file, rel_file)
                count += 1
            except Exception as e:
                pass

size_mb = os.path.getsize(zip_path) / (1024 * 1024)
print(f"✅ Empaquetados {count} archivos ({size_mb:.2f} MB)")

print(f"🚀 Subiendo a Netlify (sitio: ecosistemagalariapet)...")
url = f"https://api.netlify.com/api/v1/sites/{SITE_ID}/deploys"

with open(zip_path, 'rb') as f:
    zip_bytes = f.read()

req = urllib.request.Request(
    url,
    data=zip_bytes,
    headers={
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/zip'
    },
    method='POST'
)

try:
    with urllib.request.urlopen(req, timeout=120) as resp:
        res_body = resp.read().decode('utf-8')
        data = json.loads(res_body)
        deploy_url = data.get('ssl_url') or data.get('url') or 'https://ecosistemagalariapet.netlify.app'
        state = data.get('state', 'ready')
        print("🎉 DESPLIEGUE COMPLETADO CON ÉXITO!")
        print(f"🌐 Enlace público: {deploy_url}")
        print(f"📊 Estado: {state}")
except urllib.error.HTTPError as e:
    print(f"⚠️ Error Netlify HTTP {e.code}: {e.read().decode('utf-8')}")
    sys.exit(1)
except Exception as e:
    print(f"⚠️ Error de subida: {e}")
    sys.exit(1)
finally:
    if os.path.exists(zip_path):
        os.remove(zip_path)

