"""(reaproveitado) O Histórico abre nas minutas do próprio usuário ("Minhas"); só administrador, juiz e super admin têm a opção "Gabinete" para ver as de todos."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def ato(i, num, dono, quando):
    return {"id": f"h{i}", "unitId": "montes_claros", "promptTitle": "Sentença", "date": quando, "processNumber": num, "createdBy": dono, "creatorName": ("Eu mesmo" if dono == "teste-uid" else "Outra Pessoa"), "result": {"minute": {"title": "SENTENÇA", "processNumber": num, "judicialUnit": "Vara Única", "parties": {"author": f"AUTOR {i}", "defendant": f"REU {i}"}, "fullFormattedText": f"MINUTA {i}"}}}
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_lim.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_lim.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        seed = [ato(i, f"{6000000 + i}-10.2025.8.09.0166", "outro-uid", 1790000000000 - i * 1000) for i in range(1, 101)]
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(40000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); window.__seedHistory = " + json.dumps(seed) + ";"); pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
                l = pg.locator(seletor)
                if l.count(): l.first.dispatch_event("click"); pg.wait_for_timeout(1500)
                if pg.locator("[data-testid=historico-barra]").count(): break
            pg.locator('[data-testid=historico-barra] button:has-text("Gabinete")').first.click(); pg.wait_for_timeout(1000)
            rod = lambda: pg.locator("text=ato(s) listados").first.locator("..").inner_text()
            print("rodapé:", rod()); assert "40 ato(s) listados" in rod(), rod()
            antes = len(pg.evaluate("globalThis.__getDocsLog || []"))
            pg.locator("[data-testid=btn-ver-mais]").click(); pg.wait_for_timeout(800)
            print("depois de Ver mais:", rod()); assert "80 ato(s) listados" in rod(), rod()
            pg.locator("[data-testid=btn-ver-mais]").click(); pg.wait_for_timeout(800)
            assert "100 ato(s) listados" in rod() and pg.locator("[data-testid=btn-ver-mais]").count() == 0, rod()
            novas = pg.evaluate("globalThis.__getDocsLog || []")[antes:]; assert not [x for x in novas if x.endswith("/history")], novas
            assert not erros, erros; b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
