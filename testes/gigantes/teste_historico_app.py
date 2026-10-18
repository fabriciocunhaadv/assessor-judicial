"""O app completo: análise normal intacta para PDF pequeno; pergunta de processo gigante para PDF enorme."""
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
    pequeno = "/tmp/claude-0/work/mob/app_pequeno.pdf"; grande = "/tmp/claude-0/work/mob/app_grande.pdf"
    open(pequeno, "wb").write(processo(30, injecao=False, vazias=())); open(grande, "wb").write(processo(700))
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_gig3.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_gig3.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1400, "height": 1000})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pequeno = "/tmp/claude-0/work/mob/app_pequeno.pdf"; open(pequeno, "wb").write(processo(30, injecao=False, vazias=()))
            # 1) gravação normal: o app avisa a extensão que gravou
            pg, erros = abrir(ctx, pequeno, 30)
            pg.locator("#tour-execute-btn").click()
            pg.wait_for_function("(() => { try { const h = JSON.parse(document.documentElement.dataset.historicoSalvo || 'null'); return h && h.ok === true } catch (e) { return false } })()", timeout=180000)
            n1 = pg.evaluate("(window.__setDocs || []).length"); print("1) gravou no Histórico:", n1, "doc(s); suporte:", pg.evaluate("document.documentElement.dataset.historicoSuporte"))
            assert n1 >= 1 and pg.evaluate("document.documentElement.dataset.historicoSuporte") == "1"
            pg.close()
            # 2) a nuvem recusa: aviso visível, a extensão fica sabendo, e o reenvio grava depois
            pg, erros = abrir(ctx, pequeno, 30)
            pg.evaluate("window.__falharSetDoc = true")
            pg.locator("#tour-execute-btn").click()
            pg.wait_for_function("(() => { try { const h = JSON.parse(document.documentElement.dataset.historicoSalvo || 'null'); return h && h.ok === false } catch (e) { return false } })()", timeout=180000)
            h = json.loads(pg.evaluate("document.documentElement.dataset.historicoSalvo")); print("2) falha avisada à extensão:", h["erro"][:90])
            pg.wait_for_selector("text=NÃO foi gravado no Histórico", timeout=10000); print("   aviso vermelho visível na tela")
            nz = pg.evaluate("(window.__setDocs || []).length"); pg.evaluate("window.__falharSetDoc = false")
            pg.wait_for_function("(n) => (window.__setDocs || []).length > n", arg=nz, timeout=120000); print("   reenvio automático gravou o ato")
            print("OK")
            b.close()
            b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
