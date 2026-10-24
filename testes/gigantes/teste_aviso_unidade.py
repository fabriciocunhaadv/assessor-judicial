"""O Histórico abre nas minutas do próprio usuário ("Minhas"); só administrador, juiz e super admin têm a opção "Gabinete" para ver as de todos."""
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
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_uni.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_uni.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        unidades = [{"id": "mc", "name": "Montes Claros / Vara Única"}, {"id": "fn", "name": "Fazenda Nova / Vara Cível"}]
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); localStorage.setItem('agaia_active_unit_id','mc'); window.__seedUnits = " + json.dumps(unidades) + ";")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            pg.locator("button:has-text(\"Texto / Casos\")").first.click(); pg.wait_for_timeout(500)
            area = pg.locator("textarea[placeholder^=\"Cole aqui o texto das peças\"]").first; area.fill("PODER JUDICIÁRIO. Comarca de Fazenda Nova - Vara Cível. Processo 5012371-16.2024.8.09.0042. " + "texto dos autos " * 20); pg.wait_for_timeout(800)
            av = pg.locator("[data-testid=aviso-unidade]"); assert av.count() == 1, "faltou o aviso"
            t = av.inner_text(); print(t.replace("\n", " | ")); assert "Fazenda Nova / Vara Cível" in t and "Montes Claros / Vara Única" in t
            pg.screenshot(path="/tmp/claude-0/work/teste/aviso_unidade.png")
            pg.locator("[data-testid=aviso-unidade-manter]").click(); pg.wait_for_timeout(300); assert pg.locator("[data-testid=aviso-unidade]").count() == 0, "continuar com a atual deveria fechar o aviso"
            area.fill(area.input_value() + " mais um trecho"); pg.wait_for_timeout(500); assert pg.locator("[data-testid=aviso-unidade]").count() == 0, "dispensado não pode voltar a cada letra"
            area.fill(""); pg.wait_for_timeout(400)
            area.fill("Comarca de Fazenda Nova. outro processo " + "x " * 30); pg.wait_for_timeout(500)
            pg.locator("[data-testid=aviso-unidade-trocar]").first.click(); pg.wait_for_timeout(500)
            assert pg.locator("[data-testid=aviso-unidade]").count() == 0 and "Fazenda Nova" in pg.locator("#tour-process-unit-selector").inner_text(), "trocar deveria mudar a unidade ativa"
            assert not erros, erros; b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
