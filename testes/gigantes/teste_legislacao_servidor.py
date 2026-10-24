"""Legislação oficial: os artigos citados são conferidos no texto do Planalto (aqui, uma página simulada) e entram na 2ª etapa e no Turbo."""
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
PAGINA = ("<html><head><meta http-equiv='Content-Type' content='text/html; charset=windows-1252'></head><body>" + "".join(f"<p>Apresentação {i}</p>" for i in range(30)) +
          "<p>Art. 489. São elementos essenciais da sentença:</p><p>I - o relatório;</p><p>Art. 490. Fim.</p></body></html>").encode("latin1")
class H(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200); self.send_header("Content-Type", "text/html; charset=windows-1252"); self.end_headers(); self.wfile.write(PAGINA)
    def log_message(self, *a): pass
def main():
    procs = []
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8896), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM)], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "PLANALTO_BASE": "http://127.0.0.1:8896/"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_leg.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info")
        autos = "Ação de cobrança contra instituição financeira. Aplica-se o art. 489 do CPC à fundamentação. " * 30
        urllib.request.urlopen(f"http://127.0.0.1:{PM}/__reset")
        r = post({"customPromptText": "Prompt de teste", "actType": "auto", "processText": autos}); assert r.get("minute")
        log = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read().decode()); print("normal:", [(x.get("leg"), x.get("legtxt")) for x in log if x.get("res") == 200])
        oks = [x for x in log if x.get("res") == 200]
        assert oks[-1].get("leg") and oks[-1].get("legtxt"), "o texto oficial do art. 489 deve chegar à etapa 2"
        assert oks[0].get("leg") and oks[0].get("legtxt"), "a etapa 1 também deve receber o texto oficial dos artigos citados nos autos"
        urllib.request.urlopen(f"http://127.0.0.1:{PM}/__reset")
        rq = urllib.request.Request(f"http://127.0.0.1:{PS}/api/generate-minute-turbo", data=json.dumps({"processText": autos, "actType": "auto"}).encode(), headers={"Content-Type": "application/json", "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa"})
        try: urllib.request.urlopen(rq, timeout=300).read()
        except Exception as e: print("turbo respondeu:", str(e)[:80])
        log = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read().decode()); print("turbo:", [(x.get("leg"), x.get("legtxt")) for x in log])
        assert any(x.get("legtxt") for x in log), "o texto oficial deve chegar ao Turbo"
        for rota, corpo in [("/api/chat-agaia", {"message": "Explique o art. 489 do CPC", "currentMinute": {"fundamentacao": "x"}, "conversationHistory": []}), ("/api/lateral-agent-chat", {"message": "Explique o art. 489 do CPC", "mode": "geral"})]:
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__reset")
            try: urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{PS}{rota}", data=json.dumps(corpo).encode(), headers={"Content-Type": "application/json", "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa"}), timeout=120).read()
            except Exception as e: print(rota, "respondeu:", str(e)[:60])
            log = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read().decode()); print(rota, [(x.get("leg"), x.get("legtxt")) for x in log])
            assert any(x.get("legtxt") for x in log), f"o texto oficial deve chegar em {rota}"
        st = json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PS}/api/legislacao-status", timeout=120).read().decode()); print("diagnóstico:", st["ok"], "de", st["total"]); assert st["ok"] == st["total"]
        print("OK")
    finally:
        srv.shutdown()
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
