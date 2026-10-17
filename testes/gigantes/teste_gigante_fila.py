"""Dois processos gigantes: um de cada vez (fila). O segundo mostra a posição na fila e só começa quando o primeiro termina."""
import base64, glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
sys.path.insert(0, AQUI)
from gerar_pdf import processo
from playwright.sync_api import sync_playwright

def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def log_(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read())
JS_LISTA = "window.gerente.lista().map(j => ({id:j.id, nome:j.nome, status:j.status, etapa:j.etapa}))"

def main():
    a = base64.b64encode(processo(330, injecao=False, vazias=(), serie="1")).decode()
    b = base64.b64encode(processo(330, injecao=False, vazias=(), serie="9")).decode()
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_fila.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_fila.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = br.new_context(viewport={"width": 1000, "height": 900})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg = ctx.new_page(); pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1200)
            pg.evaluate("""async ([a, b]) => { const f = (s, n) => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], n, {type:'application/pdf'}); };
                const cfg = {promptText:'P', promptTitle:'Sentença', actType:'sentenca', unitId:'montes_claros', unitName:'Comarca / Vara', userUid:'u', userName:'T', userEmail:'t@t.com', processNumber:''};
                await window.gerente.carregar(); window.gerente.iniciar([f(a, 'processo-A.pdf')], cfg); await new Promise(r => setTimeout(r, 800)); window.gerente.iniciar([f(b, 'processo-B.pdf')], cfg); }""", [a, b])
            vistos_fila = False; t0 = time.time(); ult = ""
            while time.time() - t0 < 600:
                L = pg.evaluate(JS_LISTA)
                A = next((j for j in L if "processo-A" in j["nome"]), None); B = next((j for j in L if "processo-B" in j["nome"]), None)
                if A and B:
                    linha = f"A={A['status']} | B={B['status']} ({B['etapa'][:70]})"
                    if linha != ult: print(f"[{int(time.time()-t0)}s]", linha); ult = linha
                    if A["status"] in ("lendo", "fundindo", "redigindo") and B["status"] == "na_fila" and "posição 1" in B["etapa"]: vistos_fila = True
                    if B["status"] in ("lendo", "fundindo", "redigindo") and A["status"] not in ("concluido", "erro"): raise AssertionError("B começou antes de A terminar")
                    if A["status"] == "concluido" and B["status"] == "concluido": break
                time.sleep(1.5)
            assert vistos_fila, "o segundo processo deve aparecer 'Na fila (posição 1)' enquanto o primeiro trabalha"
            fich = [x for x in log_() if x.get("p") == "ficha"]
            serie = ["A" if any(f.startswith("FATO-1") for f in x["fatos"]) else "B" for x in fich]
            print("ordem das fichas:", "".join(serie))
            ultimo_a = max(i for i, s in enumerate(serie) if s == "A"); primeiro_b = min(i for i, s in enumerate(serie) if s == "B")
            assert ultimo_a < primeiro_b, "as fichas de A devem terminar antes de B começar"
            print("OK")
            br.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
