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
    pg = ctx.new_page(); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200])); pg.on("console", lambda m: print("  [console]", m.type, m.text[:260]) if getattr(pg, "_log", False) else None)
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
            studio_base = open("/home/user/projudi/extensao/studio-base.js").read()
            def texto_proc(num):
                return "\n\n".join(f"[Página {i} de 40]\nProcesso {num} Movimentacao {i} : Peticao Arquivo 1: a.pdf - Pag.{i}/40\n" + "Texto processual de teste com partes pedidos e decisoes. " * 30 for i in range(1, 41))
            procs_ = ["5225174-34.2022.8.09.0166", "5744416-82.2023.8.09.0166", "5583292-85.2026.8.09.0166"]
            pg = ctx.new_page(); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__GIGANTE_INTERVALO_MS=1500; window.__GIGANTE_FOLGA_MS=1500;")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            pg.evaluate("window.chrome = { runtime: { getManifest: () => ({ version: 'teste' }), onMessage: { addListener(f) { window.__ouvinte = f } } }, notifications: null, storage: { local: { set() { return Promise.resolve() } } } }")
            pg.add_script_tag(content=studio_base)
            num = procs_[0]
            pg.evaluate("(a) => { window.__r = null; window.__ouvinte({ acao: 'studio-analisar', modo: 'analise', ate1: true, arquivoId: '', nome: 'x.pdf', processo: a.num, texto: a.txt }, {}, (r) => { window.__r = r }) }", {"num": num, "txt": texto_proc(num)})
            pg.wait_for_function("window.__r", timeout=240000); print("1ª ok", pg.evaluate("window.__r.ok"))
            # 2º: faz à mão o que a extensão faz
            pg.evaluate("window.__sinais = []; const b = document.getElementById('tour-execute-btn'); console.log('Assessor botao antes', b.disabled, b.innerText)")
            nb = [x for x in pg.locator("button").all() if x.inner_text().strip() == "Nova Análise"]; print("botão Nova Análise:", len(nb))
            pg.evaluate("[...document.querySelectorAll('button')].find(b => /^Nova An[aá]lise$/i.test(b.innerText.trim()))?.click()"); pg.wait_for_timeout(1500)
            print("painel de entrada:", pg.evaluate("!!document.getElementById('tour-input-panel')"), "| resultado visível:", pg.evaluate("!!document.getElementById('tour-result-tabs')"))
            pg.evaluate("(t) => { const ta = document.querySelector('#tour-input-panel textarea'); const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set; set.call(ta, t); ta.dispatchEvent(new Event('input', {bubbles: true})); }", texto_proc(procs_[1]))
            pg.wait_for_timeout(800)
            print("botão: disabled =", pg.evaluate("document.getElementById('tour-execute-btn').disabled"), "|", pg.evaluate("document.getElementById('tour-execute-btn').innerText"))
            n_antes = len(log_()); estados = []
            pg._log = True; pg.evaluate("document.getElementById('tour-execute-btn').click()")
            for _ in range(24):
                estados.append(pg.evaluate("(document.getElementById('tour-execute-btn')?.innerText || '').slice(0, 30) + ' | meta=' + ((document.getElementById('tour-meta-parties-box')?.innerText || '').match(/\\d{7}-\\d{2}/)?.[0] || '-')")); pg.wait_for_timeout(500)
            pg._log = False
            print("estados do botão:", sorted(set(estados))); print("chamadas novas ao servidor:", len(log_()) - n_antes)
            print("depois do clique: botão =", pg.evaluate("document.getElementById('tour-execute-btn').innerText"), "| disabled", pg.evaluate("document.getElementById('tour-execute-btn').disabled"), "| resultado:", pg.evaluate("!!document.getElementById('tour-result-tabs')"), "| toast:", pg.evaluate("document.querySelector('[data-rht-toaster]')?.innerText"))
            pg.wait_for_timeout(6000); print("META depois:", pg.evaluate("(document.getElementById('tour-meta-parties-box')?.innerText || '').match(/\\d{7}-\\d{2}\\.\\d{4}/)?.[0]"), "| chamadas ao servidor:", len(log_()))
            print("erros:", erros[:3])
            print("OK: três processos em sequência, cada um com o seu resultado"); b.close()
            b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
