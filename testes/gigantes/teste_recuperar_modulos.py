"""Turbo e Lupa: a página reabre com execução pendente e a recupera do servidor (Turbo vai para as Minutas Recentes; Lupa para a lista de auditorias)."""
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
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_rm.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_rm.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        turbo = {"minute": {"title": "DECISÃO TURBO", "processNumber": "5500777-10.2025.8.09.0166", "judicialUnit": "Vara Única", "parties": {"author": "AUTOR TURBO", "defendant": "REU TURBO"}, "relatorio": "R", "fundamentacao": "F", "dispositivo": "D", "fullFormattedText": "X"}, "stats": {"elapsedSeconds": "20"}}
        lupa = {"score": 72, "verdict": "Aprovada com ressalvas", "verdictColor": "amber", "summary": "ok"}
        agora = int(time.time() * 1000)
        mt = {"progId": "prog-turbo-1", "iniciadoEm": agora, "uid": "teste-uid", "tenant": "gab_rafael_machado", "promptTitle": "Prompt"}
        ml = {"progId": "prog-lupa-1", "iniciadoEm": agora, "uid": "teste-uid", "tenant": "gab_rafael_machado", "processNumber": "5500888-10.2025.8.09.0166", "assessorName": "Assessora", "draftText": "MINUTA DO ASSESSOR", "pdfFileNames": ["a.pdf"], "contexto": "autos"}
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1100, "height": 900}); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); localStorage.setItem('assessor_pendente_turbo', " + json.dumps(json.dumps(mt)) + "); localStorage.setItem('assessor_pendente_lupa', " + json.dumps(json.dumps(ml)) + ");")
            def rota(r):
                u = r.request.url
                corpo = turbo if "prog-turbo-1" in u else lupa
                r.fulfill(status=200, content_type="application/json", body=json.dumps({"pronto": True, "status": 200, "body": "  " + json.dumps(corpo)}))
            pg.route("**/api/resultado/**", rota)
            pg.goto(f"http://127.0.0.1:{PV}/")
            pg.wait_for_function("document.body.innerText.includes('Turbo recuperado') && document.body.innerText.includes('Lupa recuperada')", timeout=40000)
            print("1) avisos de Turbo e Lupa recuperados na tela")
            hist = json.loads(pg.evaluate("localStorage.getItem('assessor_turbo_history::gab_rafael_machado')") or "[]"); print("   histórico do Turbo:", [h["title"] for h in hist]); assert hist and hist[0]["title"] == "DECISÃO TURBO" and "AUTOR TURBO" in hist[0]["parties"]
            docs = pg.evaluate("(window.__setDocs || []).filter((d) => d.dados && d.dados.auditResult).map((d) => ({ n: d.dados.processNumber, s: d.dados.score, a: d.dados.assessorDraft }))"); print("   auditorias gravadas:", docs)
            assert docs and docs[0]["n"] == "5500888-10.2025.8.09.0166" and docs[0]["s"] == 72 and docs[0]["a"] == "MINUTA DO ASSESSOR", docs
            assert pg.evaluate("localStorage.getItem('assessor_pendente_turbo')") is None and pg.evaluate("localStorage.getItem('assessor_pendente_lupa')") is None, "os marcadores deveriam ser apagados"
            assert not erros, erros; b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
