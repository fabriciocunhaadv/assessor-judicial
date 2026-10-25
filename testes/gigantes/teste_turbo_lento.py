"""Turbo com processo de tamanho médio-grande (acima de 200 páginas, abaixo do limite de corte): oferece a leitura em lotes em segundo plano, mas deixa rodar no Turbo."""
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
    pdf = "/tmp/claude-0/work/mob/turbo_lento.pdf"; open(pdf, "wb").write(processo(230, injecao=False, vazias=()))
    pdf_pequeno = "/tmp/claude-0/work/mob/turbo_pequeno.pdf"; open(pdf_pequeno, "wb").write(processo(40, injecao=False, vazias=()))
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500", "AUTOS_GRANDES_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_len.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_len.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/testes/gigantes/mod.html")
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            def nova():
                ctx = br.new_context(viewport={"width": 1300, "height": 950})
                ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
                ctx.add_init_script("localStorage.setItem('agaia_native_key_allowed_teste-uid','true');")
                pg = ctx.new_page(); pg.set_default_timeout(60000); pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/mod.html?m=turbo"); pg.wait_for_timeout(2500); return pg
            # 1) 230 páginas: avisa que o Turbo pode demorar e oferece a leitura em lotes
            pg = nova(); pg.locator("input[type=file]").first.set_input_files(pdf)
            pg.wait_for_function("document.body.innerText.includes('turbo_lento.pdf')", timeout=120000); pg.wait_for_timeout(2500)
            pg.get_by_text("Executar Análise Turbo").first.click()
            pg.wait_for_selector("[data-testid=dialogo-gigante]"); assert pg.locator("[data-testid=gigante-lento]").count() == 1, "faltou o texto do aviso de Turbo lento"
            txt = pg.locator("[data-testid=dialogo-gigante]").inner_text(); print("1)", txt.replace("\n", " | ")[:300]); assert "Rodar no Turbo mesmo assim" in txt and "Processo grande para o Turbo" in txt
            pg.screenshot(path="/tmp/claude-0/work/teste/turbo_lento.png")
            # 1b) "rodar no Turbo mesmo assim" segue com a análise do Turbo (sem corte)
            pg.locator("[data-testid=gigante-normal]").click(); pg.wait_for_timeout(3000)
            assert pg.locator("[data-testid=dialogo-gigante]").count() == 0, "o diálogo deveria fechar"; print("1b) escolheu rodar no Turbo mesmo assim: diálogo fechou e a análise seguiu")
            pg.context.close()
            # 2) processo pequeno: nenhuma pergunta
            pg = nova(); pg.locator("input[type=file]").first.set_input_files(pdf_pequeno)
            pg.wait_for_function("document.body.innerText.includes('turbo_pequeno.pdf')", timeout=120000); pg.wait_for_timeout(2500)
            pg.get_by_text("Executar Análise Turbo").first.click(); pg.wait_for_timeout(3000)
            assert pg.locator("[data-testid=dialogo-gigante]").count() == 0, "processo pequeno não pode abrir a pergunta"; print("2) 40 páginas: sem pergunta")
            br.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
