#!/usr/bin/env python3
import subprocess
import time
import sys
import os
import re

PROJECT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CLOUDFLARED_BIN = os.path.join(PROJECT_DIR, "bin", "cloudflared")
URL_FILE = os.path.join(PROJECT_DIR, "PUBLIC_URL.txt")

def start_cloudflare_tunnel():
    if not os.path.exists(CLOUDFLARED_BIN):
        print(f"[ERROR] cloudflared binary not found at {CLOUDFLARED_BIN}")
        return

    cmd = [CLOUDFLARED_BIN, "tunnel", "--url", "http://localhost:8080"]
    print("[INFO] Starting Cloudflare Tunnel (High stability HTTPS)...")
    
    process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    
    url_found = False
    for line in iter(process.stdout.readline, ''):
        print(line, end='')
        match = re.search(r'https://[a-zA-Z0-9-]+\.trycloudflare\.com', line)
        if match:
            url = match.group(0)
            url_found = True
            with open(URL_FILE, "w") as f:
                f.write(f"PUBLIC_URL={url}\nLOCAL_IP=http://192.168.0.14:8080\n")
            print(f"\n=======================================================")
            print(f"  ENLACE PÚBLICO PERMANENTE ACTIVO (Cloudflare):")
            print(f"  👉 {url}")
            print(f"  RED LOCAL: http://192.168.0.14:8080")
            print(f"=======================================================\n")
            
    process.wait()
    print("[WARNING] Cloudflare Tunnel disconnected. Reconnecting in 3 seconds...")

def main():
    while True:
        try:
            start_cloudflare_tunnel()
        except Exception as e:
            print(f"[ERROR] Tunnel exception: {e}")
        time.sleep(3)

if __name__ == "__main__":
    main()
