"""Turbo, Lupa do Magistrado e Mesa de Audiência com processos grandes: usam a leitura em lotes / dossiê em vez de falhar."""
import base64, glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
sys.path.insert(0, AQUI)
from gerar_pdf import processo
from playwright.sync_api import sync_playwright

def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def log_(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read())
def esperar_job(pg, final=("concluido", "erro"), limite=500):
    t0 = time.time()
    while time.time() - t0 < limite:
        L = pg.evaluate("window.gerente.lista().map(j => ({status:j.status, etapa:j.etapa, fin:j.config.finalidade||'minuta', origem:j.config.origem||''}))")
        if L and L[0]["status"] in final: return L[0]
        time.sleep(2)
    raise AssertionError("o trabalho não terminou: " + str(L))

def main():
    pdf_turbo = "/tmp/claude-0/work/mob/mod_turbo.pdf"; open(pdf_turbo, "wb").write(processo(700, injecao=False, vazias=()))
    pdf_lupa = "/tmp/claude-0/work/mob/mod_lupa.pdf"; open(pdf_lupa, "wb").write(processo(330, injecao=False, vazias=()))
    pdf_mesa = "/tmp/claude-0/work/mob/mod_mesa.pdf"; open(pdf_mesa, "wb").write(processo(400, injecao=False, vazias=()))
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500", "AUTOS_GRANDES_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_mod.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_mod.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/testes/gigantes/mod.html")
        qual = sys.argv[1:] or ["turbo", "lupa", "mesa"]
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            def nova(m):
                ctx = br.new_context(viewport={"width": 1300, "height": 950})
                ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
                ctx.add_init_script("localStorage.setItem('agaia_native_key_allowed_teste-uid','true');")
                pg = ctx.new_page(); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200])); pg.on("console", lambda m: print("CONSOLE", m.type, m.text[:240]) if m.type in ("warning", "error") and "Failed to load" not in m.text else None)
                pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/mod.html?m={m}"); pg.wait_for_timeout(2500)
                return pg, erros

            if "turbo" in qual:
                pg, erros = nova("turbo")
                pg.locator("input[type=file]").first.set_input_files(pdf_turbo)
                pg.wait_for_function("document.body.innerText.includes('mod_turbo.pdf')", timeout=120000); pg.wait_for_timeout(2500)
                pg.get_by_text("Executar Análise Turbo").first.click()
                pg.wait_for_selector("[data-testid=dialogo-gigante]"); print("TURBO) pergunta de processo gigante apareceu")
                pg.locator("[data-testid=gigante-lotes]").click()
                j = esperar_job(pg); print("TURBO) trabalho:", j); assert j["status"] == "concluido" and j["fin"] == "minuta" and j["origem"] == "turbo"
                print("TURBO) OK")

            if "lupa" in qual:
                pg, erros = nova("lupa")
                pg.get_by_text("Nova Auditoria").first.click(); pg.wait_for_timeout(800)
                pg.locator("textarea[placeholder^='Cole aqui o texto corrido da minuta']").fill("SENTENÇA. Relatório. O autor não juntou laudo pericial. Fundamentação. " * 20 + " Dispositivo: julgo improcedente.")
                pg.locator("input[type=file]").first.set_input_files(pdf_lupa)
                pg.wait_for_function("document.body.innerText.includes('330 pág')", timeout=120000); pg.wait_for_timeout(1500)
                pg.locator("#btn-lupa-auditar-minuta").click()
                pg.wait_for_selector("[data-testid=dialogo-processo-grande]"); print("LUPA) pergunta de processo grande apareceu")
                pg.locator("[data-testid=processo-grande-preparar]").click()
                pg.wait_for_selector("[data-testid=painel-dossie]"); print("LUPA) faixa de andamento do dossiê apareceu")
                j = esperar_job(pg); print("LUPA) trabalho:", j); assert j["status"] == "concluido" and j["fin"] == "dossie" and j["origem"] == "lupa"
                pg.wait_for_timeout(2000); print('LUPA) faixa:', pg.evaluate("document.querySelector('[data-testid=painel-dossie]')?.innerText")); pg.screenshot(path='/tmp/claude-0/work/mob/lupa_dossie.png')
                pg.wait_for_function("document.querySelector('[data-testid=painel-dossie]')?.innerText.includes('Dossiê pronto')", timeout=15000)
                n0 = len(log_()); pg.locator("#btn-lupa-auditar-minuta").click()
                pg.wait_for_function("document.body.innerText.includes('Processo gigante')", timeout=120000)
                L = log_()[n0:]; print("LUPA) chamadas após auditar:", [(x.get("dossie"), x.get("dossieTxt")) for x in L])
                assert any(x.get("dossie") for x in L), "a auditoria deve ir com a nota de dossiê e usar o dossiê, não os autos inteiros"
                assert max(x["tok"] for x in L) < 250000
                print("LUPA) OK")

            if "mesa" in qual:
                pg, erros = nova("mesa")
                # abre a aba de briefing e envia os autos
                pg.locator("input[type=file]").first.set_input_files(pdf_mesa)
                pg.wait_for_selector("[data-testid=dialogo-processo-grande]", timeout=120000); print("MESA) pergunta de processo grande apareceu")
                pg.locator("[data-testid=processo-grande-preparar]").click()
                pg.wait_for_selector("[data-testid=painel-dossie]"); print("MESA) faixa de andamento do dossiê apareceu")
                j = esperar_job(pg); print("MESA) trabalho:", j); assert j["status"] == "concluido" and j["fin"] == "dossie" and j["origem"] == "mesa"
                pg.wait_for_timeout(8000)
                print('MESA) tela:', pg.evaluate("document.body.innerText").replace('\\n', ' | ')[:900]); pg.screenshot(path='/tmp/claude-0/work/mob/mesa_dossie.png'); print('MESA) erros:', erros, [(x.get('p'), x.get('dossieTxt'), x['tok']) for x in log_()][-6:])
                L = [x for x in log_() if x.get("dossieTxt")]; print("MESA) chamadas com o dossiê:", len(L))
                assert L, "o briefing da Mesa deve rodar sozinho com o dossiê quando ele ficar pronto"
                print("MESA) OK")
            print("OK")
            br.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
