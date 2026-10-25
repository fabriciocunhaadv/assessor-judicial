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
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_rec.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_rec.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        minuta = {"minute": {"title": "SENTENÇA", "processNumber": "5500123-10.2025.8.09.0166", "judicialUnit": "Vara Única", "parties": {"author": "AUTOR REC", "defendant": "REU REC"}, "relatorio": "R", "fundamentacao": "F", "dispositivo": "D", "fullFormattedText": "MINUTA RECUPERADA"}, "analysisId": "rec-1", "fontesConsultadas": {"legislacao": ["Código Civil, art. 1"], "naoLocalizados": [], "indisponiveis": [], "locais": [], "precedentes": [], "consultado": True}}
        marcador = {"progId": "prog-teste-1", "tipo": "analise", "iniciadoEm": 0, "uid": "teste-uid", "promptTitle": "Sentença", "promptCategory": "civel", "promptScope": "judicial", "unitId": "montes_claros", "unitName": "Montes Claros / Vara Única", "processNumber": "5500123-10.2025.8.09.0166", "contexto": "[PDFs anexados: x.pdf]"}
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            def abrir(resp_fn):
                pg = b.new_page(viewport={"width": 1100, "height": 900}); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
                m = dict(marcador, iniciadoEm=int(time.time() * 1000))
                pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); localStorage.setItem('assessor_analise_pendente', " + json.dumps(json.dumps(m)) + ");")
                chamadas = {"n": 0}
                def rota(r):
                    chamadas["n"] += 1; r.fulfill(status=200, content_type="application/json", body=json.dumps(resp_fn(chamadas["n"])))
                pg.route("**/api/resultado/**", rota); return pg, erros, chamadas
            # 1) página reabre com análise pendente: primeiro "em andamento", depois "pronto" -> a minuta aparece e é gravada no Histórico
            pg, erros, ch = abrir(lambda n: {"pronto": False, "andamento": {"texto": "Etapa 1 — assessor fático", "pct": 30, "decorridoSeg": 40}} if n == 1 else {"pronto": True, "status": 200, "body": "   " + json.dumps(minuta)})
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_function("document.body.innerText.includes('Análise recuperada') && document.body.innerText.includes('AUTOR REC')", timeout=40000); pg.screenshot(path="/tmp/claude-0/work/teste/rec.png")
            print("1) minuta recuperada na tela depois de", ch["n"], "consulta(s) ao servidor")
            gravados = pg.evaluate("(globalThis.__setDocs || []).map((d) => d.id)"); print("   gravados:", gravados); assert "rec-1" in gravados, "a minuta recuperada deveria ir para o Histórico"
            assert pg.evaluate("localStorage.getItem('assessor_analise_pendente')") is None, "o marcador deveria ser apagado"
            assert not erros, erros; pg.close()
            # 2) servidor não conhece mais a análise (reiniciou): avisa e apaga o marcador
            pg, erros, ch = abrir(lambda n: {"pronto": False, "desconhecido": True})
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_function("document.body.innerText.includes('não foi encontrada no servidor')", timeout=30000); print("2) análise desconhecida: aviso mostrado")
            assert pg.evaluate("localStorage.getItem('assessor_analise_pendente')") is None; pg.close()
            # 3) sem marcador: nada acontece (nenhuma consulta)
            pg = b.new_page(); n = {"v": 0}; pg.route("**/api/resultado/**", lambda r: (n.__setitem__("v", n["v"] + 1), r.fulfill(status=200, body="{}")))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1');"); pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(6000); assert n["v"] == 0, "sem marcador não pode consultar"; print("3) sem marcador: nenhuma consulta"); b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
