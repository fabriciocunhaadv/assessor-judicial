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
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_ver.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_ver.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            def abrir(publicado):
                pg = b.new_page(viewport={"width": 1100, "height": 800}); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
                pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); window.__scriptAtualTeste = '/assets/index-AAA.js'; localStorage.setItem('cargas', String(Number(localStorage.getItem('cargas') || 0) + 1));")
                pg.route("**/index.html*", lambda r: r.fulfill(status=200, content_type="text/html", body=f'<html><head><script type="module" crossorigin src="{publicado}"></script></head><body></body></html>'))
                pg.clock.install(time=__import__("datetime").datetime(2026, 10, 24, 9, 0, 0)); pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); return pg, erros
            # 1) mesma versão publicada: nada aparece
            pg, erros = abrir("/assets/index-AAA.js"); pg.clock.run_for(12 * 60 * 1000); pg.wait_for_timeout(600)
            assert pg.locator("[data-testid=aviso-nova-versao]").count() == 0, "não pode avisar quando a versão é a mesma"; print("1) mesma versão: sem faixa"); pg.close()
            # 2) versão diferente: faixa aparece; "Depois" esconde
            pg, erros = abrir("/assets/index-BBB.js"); pg.clock.run_for(12 * 60 * 1000); pg.wait_for_timeout(800)
            assert pg.locator("[data-testid=aviso-nova-versao]").count() == 1, "faltou a faixa de nova versão"; print("2) versão nova publicada: faixa apareceu:", pg.locator("[data-testid=aviso-nova-versao]").inner_text().replace("\n", " | "))
            pg.screenshot(path="/tmp/claude-0/work/teste/nova_versao.png")
            pg.locator("[data-testid=aviso-nova-versao-depois]").click(); pg.wait_for_timeout(300); assert pg.locator("[data-testid=aviso-nova-versao]").count() == 0, "'Depois' deveria esconder a faixa"; print("   'Depois' esconde a faixa")
            # 3) tela parada por mais de 30 minutos e nada em andamento: atualiza sozinha (a marca da aba antiga some)
            assert pg.evaluate("localStorage.getItem('cargas')") == "1"
            pg.clock.run_for(40 * 60 * 1000); pg.wait_for_timeout(2500)
            cargas = pg.evaluate("localStorage.getItem('cargas')"); print("3) depois de 40 min parada, vezes que a página carregou:", cargas); assert cargas == "2", "a página deveria ter se atualizado sozinha"
            assert not erros, erros; pg.close(); b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
