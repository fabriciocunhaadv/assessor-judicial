"""Quando o Google bloqueia o banco por cota/faturamento, a tela mostra uma faixa vermelha explicando (em vez de listas vazias sem explicação)."""
import glob, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_cota.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_cota.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1');")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
            assert pg.locator("[data-testid=aviso-cota]").count() == 0; print("1) sem erro de cota, sem faixa")
            r = pg.evaluate("async () => { const m = await import('/src/utils/avisoCota.ts'); return [m.avisarSeCota({ code: 'resource-exhausted', message: 'Quota exceeded for quota metric Free' }), m.avisarSeCota(new Error('rede caiu'))]; }")
            pg.wait_for_timeout(500); assert r == [True, False], r
            assert pg.locator("[data-testid=aviso-cota]").count() == 1 and "Faturamento do Google Cloud" in pg.locator("[data-testid=aviso-cota]").inner_text(); print("2) erro de cota: faixa vermelha com o que fazer (erro comum não dispara)")
            pg.locator("[data-testid=aviso-cota] button").click(); pg.wait_for_timeout(300); assert pg.locator("[data-testid=aviso-cota]").count() == 0; print("3) dá para fechar a faixa")
            assert not erros, erros
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
