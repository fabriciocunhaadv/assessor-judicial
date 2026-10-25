"""Turbo: a conexão cai DEPOIS de o servidor terminar (celular): a minuta é recuperada da caixa de resultados, sem pedir de novo e sem repetir a análise no servidor."""
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
    pdf = "/tmp/claude-0/work/mob/turbo_cai.pdf"; open(pdf, "wb").write(processo(40, injecao=False, vazias=()))
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_tc.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_tc.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/testes/gigantes/mod.html")
        with sync_playwright() as p:
            br = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = br.new_context(viewport={"width": 1300, "height": 950}); cortes = {"n": 0, "ids": []}
            def rota(r):
                h = {**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}
                if r.request.method == "POST" and r.request.url.endswith("/api/generate-minute-turbo"):
                    r.fetch(headers=h, timeout=170000); cortes["n"] += 1; cortes["ids"].append(r.request.headers.get("x-progresso-id")); r.abort("connectionreset")      # o servidor termina, a conexão do "celular" cai
                else: r.continue_(headers=h)
            ctx.route("**/api/**", rota)
            ctx.add_init_script("localStorage.setItem('agaia_native_key_allowed_teste-uid','true');")
            pg = ctx.new_page(); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/mod.html?m=turbo"); pg.wait_for_timeout(2500)
            pg.locator("input[type=file]").first.set_input_files(pdf)
            pg.wait_for_function("document.body.innerText.includes('turbo_cai.pdf')", timeout=120000); pg.wait_for_timeout(2500)
            pg.get_by_text("Executar Análise Turbo").first.click()
            pg.wait_for_function("document.body.innerText.includes('I - RELATÓRIO') || document.body.innerText.includes('RELATÓRIO')", timeout=240000)
            print("Turbo recuperou a minuta; conexões cortadas:", cortes["n"], cortes["ids"])
            assert cortes["n"] == 1, f"o Turbo não pode repetir a análise no servidor ({cortes['n']} pedidos)"
            corpo = pg.locator("body").inner_text(); assert "Tentando de novo" not in corpo and "interrompida" not in corpo.split("RELATÓRIO")[0][-400:], "não pode mostrar aviso de conexão interrompida"
            assert not erros, erros; br.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
