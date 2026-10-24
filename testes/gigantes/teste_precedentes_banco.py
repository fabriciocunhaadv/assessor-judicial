"""Julgados anexados: ficam no banco do gabinete e chegam ao navegador (cópia só quando a versão muda). O Histórico abre nas minutas do próprio usuário ("Minhas"); só administrador, juiz e super admin têm a opção "Gabinete" para ver as de todos."""
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
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_pre.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_pre.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        item = lambda i, arq: {"id": f"custom-{i}", "tribunal": "TJGO", "type": "informativo_tjgo", "number": f"Informativo {i}", "title": f"Tema {i}", "statement": "tese", "sourceUrl": "", "tags": ["x"], "area": "Geral", **({"sourceFile": arq} if arq else {})}
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            def abrir(init):
                pg = b.new_page(viewport={"width": 1200, "height": 900}); pg.set_default_timeout(30000)
                pg.add_init_script("localStorage.setItem('assessor_tour_off','1');" + init); pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(5000); return pg
            # 1) o banco já tem 2 julgados (versão 111): o navegador novo recebe os dois
            pg = abrir("window.__precSeed = " + json.dumps([item(1, "a.pdf"), item(2, "a.pdf")]) + "; window.__setDocs = [{id:'precedentes_meta', dados:{versao:111}}];")
            local = json.loads(pg.evaluate("localStorage.getItem('assessor_custom_precedents')") or "[]"); print("1) cópia local depois de abrir:", [x["id"] for x in local]); assert sorted(x["id"] for x in local) == ["custom-1", "custom-2"]
            carimbo = pg.evaluate("localStorage.getItem('assessor_precedentes_carimbo')"); print("   carimbo:", carimbo); assert '"versao":111' in carimbo
            pg.close()
            # 2) navegador já em dia (carimbo = versão do banco): não baixa a lista
            pg = abrir("window.__precSeed = " + json.dumps([item(1, "a.pdf"), item(2, "a.pdf")]) + "; window.__setDocs = [{id:'precedentes_meta', dados:{versao:111}}]; localStorage.setItem('assessor_precedentes_carimbo', JSON.stringify({tenant:'gab_rafael_machado', versao:111})); localStorage.setItem('assessor_custom_precedents', JSON.stringify(" + json.dumps([item(1, "a.pdf"), item(2, "a.pdf")]) + "));")
            lidas = [x for x in pg.evaluate("globalThis.__getDocsLog || []") if x.endswith("/precedentes")]; print("2) leituras da lista inteira com a cópia em dia:", len(lidas)); assert len(lidas) == 0
            pg.close()
            # 3) gabinete sem lista no banco: leva para lá os julgados de PDF já guardados no navegador (e deixa de fora os itens escritos no código)
            pg = abrir("localStorage.setItem('assessor_custom_precedents', JSON.stringify(" + json.dumps([item(7, "velho.pdf"), item(8, None)]) + "));")
            gravados = pg.evaluate("globalThis.__precGravados || []"); print("3) levados para o banco:", gravados); assert gravados == ["custom-7"], gravados
            metas = [d for d in pg.evaluate("globalThis.__setDocs || []") if d["id"] == "precedentes_meta"]; assert metas, "faltou gravar a versão da lista"
            pg.close(); b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
