"""Tarja "instale a extensão": aparece só sem a extensão (Chrome de computador), some com ela e pode ser dispensada."""
import glob, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_aviso.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); esperar(f"http://127.0.0.1:{PV}/")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        def abrir(init="", ua=None):
            ctx = b.new_context(viewport={"width": 1300, "height": 800}, **({"user_agent": ua} if ua else {})); pg = ctx.new_page()
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1');" + init)
            pg.goto(f"http://127.0.0.1:{PV}/"); return pg
        # 1) sem extensão: a tarja aparece depois de ~10 s
        pg = abrir(); pg.wait_for_selector("[data-testid=aviso-extensao]", timeout=30000); href = pg.locator("[data-testid=aviso-extensao-instalar]").get_attribute("href"); assert "chromewebstore.google.com" in href and "ioiadaafdnannofgkoioefhejkpmlgpe" in href, href; print("1) sem extensão: tarja visível com o link da loja")
        pg.locator("[data-testid=aviso-extensao-depois]").dispatch_event("click"); pg.wait_for_timeout(500)
        assert pg.locator("[data-testid=aviso-extensao]").count() == 0
        pg.reload(); pg.wait_for_timeout(13000); assert pg.locator("[data-testid=aviso-extensao]").count() == 0, "depois de dispensada não volta por 7 dias"; print("   dispensada: não volta")
        # 2) com extensão (atributo novo)
        pg = abrir("document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.assessorExtensao = '1.0.27' });"); pg.wait_for_timeout(13000)
        assert pg.locator("[data-testid=aviso-extensao]").count() == 0; print("2) com extensão (versão nova): sem tarja")
        # 3) com extensão antiga (só a marca da página)
        pg = abrir("window.__projudiStudioMain = true;"); pg.wait_for_timeout(13000)
        assert pg.locator("[data-testid=aviso-extensao]").count() == 0; print("3) com extensão antiga: sem tarja")
        # 4) celular: não faz sentido
        pg = abrir(ua="Mozilla/5.0 (Linux; Android 13; Pixel) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36"); pg.wait_for_timeout(13000)
        assert pg.locator("[data-testid=aviso-extensao]").count() == 0; print("4) celular: sem tarja")
        # 5) marcada como "já instalei", mas o sistema não encontra e passaram 7 dias: volta a avisar, com outro texto
        pg = abrir("localStorage.setItem('assessor_extensao_instalada_v1','1'); localStorage.setItem('assessor_aviso_extensao_fechado_v1', String(Date.now() - 8*24*3600*1000));")
        pg.wait_for_selector("[data-testid=aviso-extensao]", timeout=30000); assert "Não encontrei a extensão" in pg.locator("[data-testid=aviso-extensao]").inner_text(); print("5) marcada, não encontrada e 7 dias depois: volta a avisar")
        # 6) botão "Já instalei": esconde, grava a marca e não volta antes de 7 dias
        pg = abrir(); pg.wait_for_selector("[data-testid=aviso-extensao]", timeout=30000); assert "Instale a extensão" in pg.locator("[data-testid=aviso-extensao]").inner_text()
        pg.locator("[data-testid=aviso-extensao-ja-instalei]").dispatch_event("click"); pg.wait_for_timeout(400)
        assert pg.locator("[data-testid=aviso-extensao]").count() == 0 and pg.evaluate("localStorage.getItem('assessor_extensao_instalada_v1')") == "1"
        pg.reload(); pg.wait_for_timeout(13000); assert pg.locator("[data-testid=aviso-extensao]").count() == 0; print("6) já instalei: some e só volta depois de 7 dias")
        # 7) link nas Configurações
        h = pg.locator("#btn-header-extensao").first.get_attribute("href"); assert h and "chromewebstore.google.com" in h; print("7) link da extensão nas Configurações:", pg.locator("#btn-header-extensao").first.text_content().strip())
        pg = abrir("document.addEventListener('DOMContentLoaded', () => { document.documentElement.dataset.assessorExtensao = '1.0.47' });"); pg.wait_for_timeout(3500)
        assert "instalada" in pg.locator("#btn-header-extensao").first.text_content(); print("   com a extensão, o link mostra 'instalada'")
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
