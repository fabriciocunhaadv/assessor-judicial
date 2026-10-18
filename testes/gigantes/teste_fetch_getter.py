"""O AI Studio deixa window.fetch só com getter: o painel dos gigantes não pode quebrar (Unhandled Rejection)."""
import glob, json, sys, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_getter.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(); erros = []
        pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
        pg.add_init_script("(() => { const f = window.fetch; Object.defineProperty(window, 'fetch', { get: () => f, configurable: false }); })()")
        pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(2000)
        r = pg.evaluate("window.gerente.carregar().then(() => 'ok', e => 'ERRO: ' + e.message)")
        print("carregar():", r, "| erros de página:", erros)
        assert r == "ok" and not erros
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
