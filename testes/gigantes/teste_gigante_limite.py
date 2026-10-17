"""Acima de 2.500 páginas o trabalho para com mensagem clara (sem chamar a IA)."""
import glob, os, subprocess, sys, time, urllib.request, base64
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
sys.path.insert(0, AQUI)
from gerar_pdf import processo
from playwright.sync_api import sync_playwright
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_lim.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    for _ in range(90):
        try: urllib.request.urlopen("http://127.0.0.1:5198/testes/gigantes/gig.html", timeout=2); break
        except Exception: time.sleep(1)
    b64 = base64.b64encode(processo(2600, injecao=False, vazias=())).decode()
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(); pg.goto("http://127.0.0.1:5198/testes/gigantes/gig.html"); pg.wait_for_timeout(1500)
        pg.evaluate("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
            await window.gerente.carregar(); window.gerente.iniciar([new File([u], 'enorme.pdf', {type:'application/pdf'})], {promptText:'P', promptTitle:'S', actType:'sentenca'}); }""", b64)
        pg.wait_for_function("window.gerente.lista()[0] && window.gerente.lista()[0].status === 'erro'", timeout=180000)
        e = pg.evaluate("window.gerente.lista()[0].erro"); print(e)
        assert "2500" in e and "2600" in e
        b.close()
    print("OK")
finally:
    os.killpg(vite.pid, 9)
