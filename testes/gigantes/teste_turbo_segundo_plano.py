"""Compatibilidade: a extensão (studio-base.js real) com o Google fora do ar (503), o Turbo falha, o processo vai para o segundo plano (análise normal) e a extensão o acompanha como processo em segundo plano."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_lupa2.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_lupa2.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        studio_base = open("/home/user/projudi/extensao/studio-base.js").read()
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1500, "height": 1000})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg = ctx.new_page(); pg.set_default_timeout(120000)
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true');")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            pg.evaluate("window.chrome = { runtime: { getManifest: () => ({ version: 'teste' }), onMessage: { addListener(f) { window.__ouvinte = f } } }, notifications: null, storage: { local: { set() { return Promise.resolve() } } } }")
            pg.add_script_tag(content=studio_base)
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__503?on=1")
            num = "5530114-61.2025.8.09.0166"
            autos = "\n".join(f"Movimentacao {i} : Peca {i}\nProcesso {num}. O autor pede a condenação do réu ao pagamento de valores. " * 5 for i in range(1, 6))
            pg.evaluate("(a) => { window.__r = null; window.__ouvinte({ acao: 'studio-analisar', modo: 'turbo', arquivoId: '', nome: 'x.pdf', prompt: '', tipo: '', processo: a.num, texto: a.txt }, {}, (r) => { window.__r = r }) }", {"num": num, "txt": autos})
            pg.wait_for_function("window.__r", timeout=300000)
            r = pg.evaluate("window.__r"); print("turbo ->", r.get("ok"), (r.get("mensagem") or r.get("erro") or "")[:200].replace("\n", " "), "| minuta:", len(r.get("minuta") or ""))
            print("resultado:", {k: r.get(k) for k in ("ok", "gigante", "jobId", "erro", "mensagem")})
            assert r.get("ok") and r.get("gigante"), r
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__503?on=0")
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
