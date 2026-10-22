"""Análise normal com autos acima do limite de leitura: o servidor informa EXATAMENTE o que foi cortado e instrui a IA."""
import json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS = 8897, 3000
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def post(corpo):
    req = urllib.request.Request(f"http://127.0.0.1:{PS}/api/generate-minute", data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json", "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])})
    with urllib.request.urlopen(req, timeout=900) as r: return json.loads(r.read().decode())
def paginas(n, de=1, total=None):
    total = total or n
    return "".join(f"[Página {i} de {total}]\nMovimentacao {i} - Petição\n" + ("Texto processual. " * 150) + "\n\n" for i in range(de, de + n))
def main():
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM)], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500", "AUTOS_GRANDES_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_corte.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info")
        def perfil(titulo, cat, comarca):
            post({"customPromptText": "Prompt de teste", "activePromptTitle": titulo, "promptCategory": cat, "processInfo": {"comarca": comarca}, "actType": "auto", "executionStage": 1, "pdfFiles": [{"name": "a.pdf", "extractedText": paginas(5), "pageCount": 5}]})
            log = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log", timeout=5).read().decode())
            return [l for l in log if l.get("res") == 200][-1]
        l = perfil("Juizado Especial Cível", "", ""); print(l.get("perfil"), l.get("sucinto")); assert "JUIZADO" in l["perfil"].upper() and l["sucinto"]
        l = perfil("Prompt qualquer", "Criminal", ""); print(l.get("perfil")); assert "CRIMINAL" in l["perfil"].upper()
        l = perfil("Prompt sem matéria", "", ""); print(repr(l.get("perfil"))); assert l["perfil"] == "geral"
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
