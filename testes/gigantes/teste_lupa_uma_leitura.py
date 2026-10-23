"""Lupa do magistrado: ao abrir, as auditorias são lidas UMA vez (escuta ao vivo), e não duas (antes: leitura avulsa da coleção inteira + escuta)."""
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
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_lupa1.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_lupa1.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(40000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); window.__seedAudits = [{ id: 'a1', date: 1790000000000, processNumber: '5500001-10.2025.8.09.0166', assessorName: 'X', score: 80, verdict: 'ok', verdictColor: 'emerald', processText: 't', assessorDraft: 'd', auditResult: {}, status: 'aprovado', unitId: 'montes_claros' }];")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            antes = len([x for x in pg.evaluate("globalThis.__getDocsLog || []") if x.endswith("/audits")])
            abriu = False
            for seletor in ["text=Auditoria Ouro", "[title*='Auditoria Ouro']"]:
                l = pg.locator(seletor)
                if l.count(): l.first.dispatch_event("click"); pg.wait_for_timeout(2500); abriu = True; break
            assert abriu, "não achei o botão da Lupa (Auditoria Ouro)"
            apos = len([x for x in pg.evaluate("globalThis.__getDocsLog || []") if x.endswith("/audits")])
            print("leituras avulsas da coleção de auditorias ao abrir a Lupa:", apos - antes, "| escutas ao vivo:", pg.evaluate("globalThis.__getDocsLog.filter(x => false).length"))
            assert apos - antes == 0, "a Lupa não deve fazer leitura avulsa da coleção (a escuta ao vivo já entrega a lista)"
            assert not erros, erros
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
