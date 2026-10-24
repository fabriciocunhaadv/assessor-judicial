"""Julgados anexados pelo gabinete (PDF) entram na minuta: o servidor recebe os separados pelo navegador e os injeta na 2ª etapa."""
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
def main():
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM)], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_prec.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info")
        autos = "Ação de cobrança de seguro prestamista contra instituição financeira. Contrato de empréstimo consignado. " * 40
        anexo = {"id": "custom-1", "tribunal": "TJGO", "type": "informativo_tjgo", "number": "Informativo 999 TJGO", "title": "Seguro prestamista em empréstimo consignado", "statement": "A cobrança de seguro prestamista sem contratação expressa é venda casada.", "sourceUrl": "", "sourceFile": "informativo-999.pdf", "tags": ["seguro prestamista", "consignado"], "area": "Direito Bancário"}
        def rodar(extra):
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__reset")
            post({"customPromptText": "Prompt de teste", "actType": "auto", "processText": autos, **extra})
            return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read().decode())
        log = rodar({"precedentesDoGabinete": [anexo]}); print("com anexo:", [x.get("anexo") for x in log if x.get("res") == 200])
        assert any(x.get("anexo") for x in log if x.get("res") == 200), "o julgado anexado não chegou à IA"
        log = rodar({}); assert not any(x.get("anexo") for x in log), "sem anexo não pode aparecer"; print("sem anexo: nada injetado")
        log = rodar({"precedentesDoGabinete": [{"id": "x", "number": "Súmula Z", "statement": "texto sem relação alguma com os autos desta causa", "tags": ["astronomia"]}]}); assert not any(x.get("anexo") for x in log), "julgado sem relação com os autos não pode entrar"; print("julgado sem relação: não entra")
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
