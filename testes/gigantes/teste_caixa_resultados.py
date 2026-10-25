"""Caixa de resultados: a análise termina no servidor mesmo que o navegador feche a conexão, e o resultado é buscado depois pelo código da análise."""
import threading, http.server
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
import http.client, uuid
def main():
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM)], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_cx.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info")
        pid = "teste-" + uuid.uuid4().hex
        # desconhecido antes de existir
        r0 = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PS}/api/resultado/{pid}").read()); assert r0.get("desconhecido"), r0; print("antes:", r0)
        corpo = json.dumps({"customPromptText": "Prompt de teste", "actType": "auto", "processText": "Ação de cobrança contra instituição financeira. " * 40}).encode()
        c = http.client.HTTPConnection("127.0.0.1", PS, timeout=30)
        c.putrequest("POST", "/api/generate-minute"); c.putheader("Content-Type", "application/json"); c.putheader("Content-Length", str(len(corpo))); c.putheader("x-progresso-id", pid)
        c.putheader("x-gemini-api-key", "AQ.Ab8-chave-um-aaaaaaaa"); c.endheaders(); c.send(corpo)
        time.sleep(0.5); c.close()      # o "navegador" some no meio da análise
        print("navegador desconectou; o servidor segue sozinho...")
        visto_andamento = False; pronto = None
        for _ in range(120):
            r = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PS}/api/resultado/{pid}").read())
            if r.get("andamento"): visto_andamento = True
            if r.get("pronto"): pronto = r; break
            time.sleep(1)
        assert pronto, "o resultado nunca ficou disponível"
        dados = json.loads(pronto["body"].strip()); print("andamento visto:", visto_andamento, "| status:", pronto["status"], "| minuta:", bool(dados.get("minute")), "| título:", (dados.get("minute") or {}).get("title"))
        assert pronto["status"] == 200 and dados.get("minute"), "a minuta deveria estar na caixa"
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
