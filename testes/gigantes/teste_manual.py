"""Manual de uso: abas novas (extensão pela loja, processos gigantes), botão 'Extensão PROJUDI' removido das Configurações, tutor com os passos novos."""
import glob, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_manual.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1400, "height": 1000}); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1');")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
        pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        assert pg.locator("#btn-header-extensao").count() == 0 and "Extensão PROJUDI" not in pg.locator("header").first.inner_text(), "o botão Extensão PROJUDI deve ter saído"
        print("1) botão 'Extensão PROJUDI' removido")
        # tutor (guia lateral): passos novos
        txt = pg.evaluate("document.body.innerText")
        # abre o manual pelo evento/botão
        pg.evaluate("window.dispatchEvent(new CustomEvent('abrir-manual'))")
        if pg.locator("text=Processos Gigantes, OCR & Partes").count() == 0:
            for rot in ["Manual", "Manual de Uso", "Guia"]:
                l = pg.locator(f"button:has-text('{rot}')")
                if l.count(): l.first.dispatch_event("click"); pg.wait_for_timeout(800)
                if pg.locator("text=Processos Gigantes, OCR & Partes").count(): break
        assert pg.locator("text=Processos Gigantes, OCR & Partes").count() > 0, "não consegui abrir o manual"
        pg.locator("text=Processos Gigantes, OCR & Partes").first.dispatch_event("click"); pg.wait_for_timeout(500)
        assert pg.locator("[data-testid=manual-processos-gigantes]").count() == 1; print("2) aba 'Processos Gigantes' no manual")
        pg.locator("text=Extensão Conclusões Projudi (Chrome)").first.dispatch_event("click"); pg.wait_for_timeout(500)
        assert pg.locator("a[href*='chromewebstore.google.com']").count() >= 1; print("3) aba da extensão com o link da Chrome Web Store")
        assert not erros, erros[:3]
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
