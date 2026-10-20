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
    pg = ctx.new_page(); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200])); pg.on("console", lambda m: print("  [console]", m.type, m.text[:200]) if m.type in ("error", "warning", "log") and any(k in m.text for k in ("Assessor", "Erro", "erro", "Gigantes", "bloque", "Blocked")) else None)
    pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__GIGANTE_INTERVALO_MS=1500; window.__GIGANTE_FOLGA_MS=1500;")
    pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
    pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
    pg.locator("#tour-input-panel input[type=file]").first.set_input_files(pdf)
    pg.wait_for_function("(n) => document.querySelector('#tour-input-panel')?.innerText.includes(n + ' págs') && document.querySelector('#tour-input-panel').innerText.includes('lidos')", arg=str(paginas), timeout=120000)
    return pg, erros

def main():
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_503e.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_503e.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1400, "height": 1000})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            studio_base = open("/home/user/projudi/extensao/studio-base.js").read()
            num = "5225174-34.2022.8.09.0166"
            txt = "\n\n".join(f"[Página {i} de 40]\nProcesso {num} Movimentacao {i} : Peticao Arquivo 1: a.pdf - Pag.{i}/40\n" + "Texto processual de teste com partes pedidos e decisoes. " * 30 for i in range(1, 41))
            pg = ctx.new_page(); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__GIGANTE_INTERVALO_MS=1500; window.__GIGANTE_FOLGA_MS=1500;")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            pg.evaluate("window.chrome = { runtime: { getManifest: () => ({ version: 'teste' }), onMessage: { addListener(f) { window.__ouvinte = f } } }, notifications: null, storage: { local: { set() { return Promise.resolve() } } } }")
            pg.add_script_tag(content=studio_base)
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__503?on=1")
            pg.evaluate("(a) => { window.__r = null; window.__ouvinte({ acao: 'studio-analisar', modo: 'analise', ate1: true, arquivoId: '', nome: 'x.pdf', processo: a.num, texto: a.txt }, {}, (r) => { window.__r = r }) }", {"num": num, "txt": txt})
            pg.wait_for_function("window.__r", timeout=420000)
            r = pg.evaluate("window.__r"); print("1) extensão recebeu:", json.dumps(r, ensure_ascii=False)[:200])
            assert r.get("ok") and r.get("gigante") and r.get("jobId"), r
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__503?on=0")
            pg.wait_for_function("(id) => JSON.parse(document.documentElement.dataset.gigantes || '[]').some(g => g.id === id && g.status === 'concluido')", arg=r["jobId"], timeout=600000)
            print("2) segundo plano concluiu sozinho depois que o Google voltou")
            assert not erros, erros
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass

if __name__ == "__main__": main()
