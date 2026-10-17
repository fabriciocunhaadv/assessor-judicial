"""Prioridade da pista normal, pausa, recarregar a página e retomar (sem refazer lotes)."""
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
def estado(pg): return pg.evaluate("(window.gerente.lista()[0]) ? ({status: window.gerente.lista()[0].status, etapa: window.gerente.lista()[0].etapa, feitas: window.gerente.lista()[0].progresso.feitas, total: window.gerente.lista()[0].lotes.length}) : null")
def esperar_estado(pg, cond, limite=400):
    t0 = time.time()
    while time.time() - t0 < limite:
        e = estado(pg)
        if e and cond(e): return e
        time.sleep(0.5)
    raise AssertionError("tempo esgotado esperando estado; último: " + str(estado(pg)))

def main():
    pdf = "/tmp/claude-0/work/mob/gigante_extra.pdf"; open(pdf, "wb").write(processo(420, vazias=()))
    b64 = base64.b64encode(open(pdf, "rb").read()).decode()
    procs = []
    try:
        mock = subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True); procs.append(mock)
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_gig2.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_gig2.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1200, "height": 900})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg = ctx.new_page(); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1200)
            pg.evaluate("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
                const f = new File([u], 'autos.pdf', {type:'application/pdf'}); window.__cfg = {promptText:'P', promptTitle:'Sentença', actType:'sentenca', unitId:'montes_claros', unitName:'Comarca / Vara', userUid:'u', userName:'T', userEmail:'t@t.com', processNumber:''};
                await window.gerente.carregar(); window.gerente.iniciar([f], window.__cfg); }""", b64)
            e = esperar_estado(pg, lambda e: e["status"] == "lendo" and e["feitas"] >= 1)
            print("lendo:", e)
            # 1) PRIORIDADE: uma análise normal (lenta) em andamento deve segurar os lotes
            t_ini = time.time()
            pg.evaluate("""() => { window.__peq = fetch('/api/generate-minute', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({processText:'LENTO-TESTE ' + 'Autor pede restituição. '.repeat(30), customPromptText:'p', actType:'auto', executionStage:1})}).then(r => r.text()).then(() => { window.__peqFim = Date.now(); }); }""")
            pg.wait_for_function("window.__peqFim", timeout=120000)
            t_fim = time.time()
            vistas = [x for x in log_() if x.get("p") == "ficha" and t_ini + 0.7 < x["t"] < t_fim]
            print(f"análise normal durou {t_fim - t_ini:.1f}s; lotes disparados durante ela: {len(vistas)}")
            assert t_fim - t_ini > 5 and len(vistas) == 0, "os lotes não podem disparar enquanto a análise normal está em andamento"
            et = estado(pg); print("etapa durante/depois:", et)
            # 2) PAUSAR, RECARREGAR a página e RETOMAR
            e = esperar_estado(pg, lambda e: e["status"] == "lendo")
            pg.evaluate("window.gerente.pausar(window.gerente.lista()[0].id)")
            e = esperar_estado(pg, lambda e: e["status"] == "pausado"); feitas = e["feitas"]; print("pausado em", e)
            fichas_antes = len([x for x in log_() if x.get("p") == "ficha"])
            pg.reload(); pg.wait_for_timeout(1500); pg.evaluate("window.gerente.carregar()"); pg.wait_for_timeout(500)
            e = estado(pg); print("depois de recarregar a página:", e); assert e and e["status"] == "pausado" and e["feitas"] == feitas
            pg.evaluate("window.gerente.retomar(window.gerente.lista()[0].id)")
            e = esperar_estado(pg, lambda e: e["status"] in ("concluido", "erro"), 600); print("final:", e)
            assert e["status"] == "concluido", e
            fichas = len([x for x in log_() if x.get("p") == "ficha"]); print("fichas geradas no total:", fichas, "de", e["total"], "lotes")
            assert fichas == e["total"], "retomar não pode refazer lotes já lidos"
            print("OK" if not erros else "erros de página: " + str(erros[:3]))
            b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
