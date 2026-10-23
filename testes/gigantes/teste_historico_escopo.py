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
    return {"id": f"h{i}", "unitId": "montes_claros", "promptTitle": "Sentença", "date": quando, "processNumber": num, "createdBy": dono, "creatorName": "X", "result": {"minute": {"title": "SENTENÇA", "processNumber": num, "judicialUnit": "Vara Única", "parties": {"author": f"AUTOR {i}", "defendant": f"REU {i}"}, "fullFormattedText": f"MINUTA {i}"}}}
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_esc.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_esc.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        seed = [ato(1, "5500001-10.2025.8.09.0166", "teste-uid", 1790000000000), ato(2, "5500002-10.2025.8.09.0166", "outro-uid", 1789900000000), ato(3, "5500003-10.2025.8.09.0166", "outro-uid", 1789800000000)]
        def perfil(email, doc):
            return "localStorage.setItem('assessor_tour_off','1'); window.__seedHistory = " + json.dumps(seed) + ";" + (f" window.__emailTeste = {json.dumps(email)}; window.__setDocs = {json.dumps([{'id': 'teste-uid', 'dados': doc}])};" if email else "")
        casos = [("super admin", perfil(None, None), True, ["5500001"], ["5500001", "5500002", "5500003"]),
                 ("administrador", perfil("adm@x.com", {"uid": "teste-uid", "email": "adm@x.com", "role": "admin", "tenantId": "gab_rafael_machado", "isActive": True, "name": "Adm"}), True, ["5500001"], ["5500001", "5500002", "5500003"]),
                 ("juiz", perfil("juiz@x.com", {"uid": "teste-uid", "email": "juiz@x.com", "role": "user", "isJudge": True, "tenantId": "gab_rafael_machado", "isActive": True, "name": "Juiz"}), True, ["5500001"], ["5500001", "5500002", "5500003"]),
                 ("usuário comum", perfil("comum@x.com", {"uid": "teste-uid", "email": "comum@x.com", "role": "user", "isJudge": False, "tenantId": "gab_rafael_machado", "isActive": True, "name": "Comum"}), False, ["5500001"], None)]
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            for nome, init, ve_gabinete, so_meus, todos in casos:
                pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(40000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
                pg.add_init_script(init); pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4500)
                pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
                for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
                    l = pg.locator(seletor)
                    if l.count(): l.first.dispatch_event("click"); pg.wait_for_timeout(1500)
                    if pg.locator("[data-testid=historico-barra]").count(): break
                pg.wait_for_selector("[data-testid=dossie-linha]", timeout=20000)
                def numeros(): return sorted({n for t in pg.locator("[data-testid=dossie-linha]").all_inner_texts() for n in ["5500001", "5500002", "5500003"] if n in t})
                tem_btn = pg.locator('[data-testid=historico-barra] button:has-text("Gabinete")').count() == 1
                inicial = numeros(); print(f"{nome}: botão Gabinete = {tem_btn} | ao abrir vê {inicial}")
                assert tem_btn == ve_gabinete, (nome, tem_btn); assert inicial == so_meus, (nome, inicial)
                if ve_gabinete:
                    pg.locator('[data-testid=historico-barra] button:has-text("Gabinete")').first.click(); pg.wait_for_timeout(600)
                    assert numeros() == todos, (nome, numeros()); print(f"   clicando em Gabinete vê {numeros()}")
                assert not erros, erros
                pg.close()
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
