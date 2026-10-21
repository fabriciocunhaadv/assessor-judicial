"""Turbo: se o servidor responde o cabeçalho e depois trava, o limite de tempo do módulo precisa disparar (antes ficava esperando para sempre)."""
import glob, os, subprocess, time, urllib.request, threading, http.server
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); os.makedirs("/tmp/claude-0/work/mob", exist_ok=True)

class H(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204); self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Access-Control-Allow-Headers", "*"); self.end_headers()
    def do_POST(self):
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Access-Control-Allow-Origin", "*"); self.send_header("Transfer-Encoding", "chunked"); self.end_headers()
        try:
            for _ in range(60):
                self.wfile.write(b"1\r\n \r\n"); self.wfile.flush(); time.sleep(1)
        except Exception: pass
    def log_message(self, *a): pass
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 8911), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_janela.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_context(viewport={"width": int(os.environ.get("LARG", 1500)), "height": int(os.environ.get("ALT", 900))}).new_page(); pg.set_default_timeout(30000)
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); globalThis.__turboTimeoutMs = 4000;")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        ref = pg.evaluate("() => { const r = document.querySelector('main').getBoundingClientRect(); return { cab: document.querySelector('header').getBoundingClientRect().bottom, lat: document.getElementById('sidebar-principal').getBoundingClientRect().right, mainL: r.left, mainW: r.width }; }"); print("referências:", ref)
        pg.route("**/api/generate-minute-turbo", lambda r: r.continue_(url="http://127.0.0.1:8911/x"))
        pg.locator("#btn-header-turbo-top").first.dispatch_event("click"); pg.wait_for_timeout(1500)
        pg.get_by_role("button", name="Digitar / Colar Texto").click(); pg.wait_for_timeout(500)
        pg.locator("textarea").first.fill("Processo 5225415-66.2026.8.09.0166. " + "autos de teste " * 60)
        ex = pg.get_by_role("button", name="Executar Análise Turbo")
        t0 = time.time(); ex.click(); pg.wait_for_timeout(1500)
        print("rodando:", pg.get_by_role("button", name="Processando").count() >= 1)
        pg.wait_for_selector("text=demorou além do limite", timeout=20000); dt = round(time.time() - t0, 1)
        print("limite disparou em", dt, "s"); assert dt < 15, dt
        pg.wait_for_timeout(500); assert pg.get_by_role("button", name="Executar Análise Turbo").is_enabled(), "o botão deveria voltar"
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
