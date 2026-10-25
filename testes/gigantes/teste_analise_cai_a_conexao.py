"""Conexão cai no meio da análise (celular): o servidor termina sozinho e a página recupera a minuta em vez de pedir para começar de novo."""
import glob, json, os, subprocess, sys, time, urllib.request
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

def abrir(ctx, pdf, paginas):
    pg = ctx.new_page(); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
    pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__GIGANTE_INTERVALO_MS=1500; window.__GIGANTE_FOLGA_MS=1500;")
    pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
    pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
    pg.locator("#tour-input-panel input[type=file]").first.set_input_files(pdf)
    pg.wait_for_function("(n) => document.querySelector('#tour-input-panel')?.innerText.includes(n + ' págs') && document.querySelector('#tour-input-panel').innerText.includes('lidos')", arg=str(paginas), timeout=120000)
    return pg, erros

def main():
    pequeno = "/tmp/claude-0/work/mob/rec_pequeno.pdf"; open(pequeno, "wb").write(processo(30, injecao=False, vazias=()))
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_rec2.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_rec2.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1400, "height": 1000}); cortes = {"n": 0}
            def rota(r):
                h = {**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}
                if r.request.method == "POST" and r.request.url.endswith("/api/generate-minute"):
                    r.fetch(headers=h, timeout=170000)      # o servidor recebe e TERMINA a análise...
                    cortes["n"] += 1; r.abort("connectionreset")      # ...mas a conexão do "celular" cai antes de a resposta chegar
                else: r.continue_(headers=h)
            ctx.route("**/api/**", rota)
            pg, erros = abrir(ctx, pequeno, 30)
            pg.locator("#tour-execute-btn").click()
            pg.wait_for_function("document.body.innerText.includes('Análise recuperada')", timeout=240000)
            print("conexão cortada", cortes["n"], "vez(es); texto:", [l for l in pg.locator("body").inner_text().split("\n") if "Análise recuperada" in l][:1])
            assert pg.evaluate("localStorage.getItem('assessor_analise_pendente')") is None, "o marcador deveria ser apagado depois de recuperar"
            n = pg.evaluate("(window.__setDocs || []).filter((d) => d.dados && d.dados.processNumber).length"); print("atos gravados no Histórico:", n); assert n >= 1, "a minuta recuperada deveria ir para o Histórico"
            assert "Tentar Novamente" not in pg.locator("body").inner_text(), "não pode pedir para tentar de novo"
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
