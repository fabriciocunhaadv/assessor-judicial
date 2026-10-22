"""Processo gigante: ficha da IA cortada é recuperada; ficha vazia na 1ª tentativa é refeita sozinha; vazia sempre dá erro claro (mesmo após nova tentativa)."""
import json, os, subprocess, sys, time, urllib.request, urllib.error
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS = 8897, 3000
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def post(corpo):
    rq = urllib.request.Request(f"http://127.0.0.1:{PS}/api/gigante-lote", data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json", "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])})
    try: return json.loads(urllib.request.urlopen(rq, timeout=200).read().decode().strip())
    except urllib.error.HTTPError as e: return json.loads(e.read().decode().strip() or "{}")
procs = []
try:
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True)
    procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
    env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
    procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_ficha.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
    esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info")
    texto = "[Página 1 de 40]\nProcesso 5498417-22.2025.8.09.0166. PETIÇÃO INICIAL do autor. " * 5 + "\n[Página 2 de 40]\nCONTESTAÇÃO do réu. " * 5
    corpo = {"texto": texto, "rotulo": "Autos teste (págs. 1-2)", "contexto": "minuta de sentença"}
    def modo(m): urllib.request.urlopen(f"http://127.0.0.1:{PM}/__ficha?modo={m}")
    modo(""); r = post(corpo); print("0) normal:", "ficha" in r, list(r.get("ficha", {}))[:3]); assert "ficha" in r
    modo("cortada"); r = post(corpo); print("1) cortada:", "ficha" in r, [x[:40] for x in r.get("ficha", {}).get("lacunas", [])]); assert "ficha" in r and any("cortada" in x for x in r["ficha"]["lacunas"]), r
    modo("primeira_vazia"); r = post(corpo); print("2) vazia só na 1ª:", "ficha" in r); assert "ficha" in r, r
    modo("vazia"); r = post(corpo); print("3) vazia sempre:", r.get("error")); assert "nova tentativa" in (r.get("error") or ""), r
    print("OK")
finally:
    for pr in procs:
        try: os.killpg(pr.pid, 9)
        except Exception: pass
