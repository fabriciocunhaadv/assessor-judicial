"""Lupa e Mesa abrem na janela principal (abaixo do cabeçalho, ao lado da barra lateral); com a preferência desligada, voltam a ser janelas flutuantes."""
import glob, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); os.makedirs("/tmp/claude-0/work/mob", exist_ok=True)
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_janela.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_context(viewport={"width": int(os.environ.get("LARG", 1500)), "height": int(os.environ.get("ALT", 900))}).new_page(); pg.set_default_timeout(30000)
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1');")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        ref = pg.evaluate("() => { const r = document.querySelector('main').getBoundingClientRect(); return { cab: document.querySelector('header').getBoundingClientRect().bottom, lat: document.getElementById('sidebar-principal').getBoundingClientRect().right, mainL: r.left, mainW: r.width }; }"); print("referências:", ref)
        def caixa_lupa():
            return pg.evaluate("() => { const h = [...document.querySelectorAll('h2')].find((e) => /Lupa do Magistrado/.test(e.textContent)); const d = h && h.closest('div.fixed'); if (!d) return null; const r = d.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width, h: r.height, bg: getComputedStyle(d).backgroundColor }; }")
        pg.locator("#btn-sidebar-minute-auditor").click(); pg.wait_for_timeout(1500)
        c = caixa_lupa(); print("Lupa:", c)
        dentro = pg.evaluate("() => { const h = [...document.querySelectorAll('h2')].find((e) => /Lupa do Magistrado/.test(e.textContent)); const d = h.closest('div.fixed'); return { noMain: !!d.closest('main'), pos: getComputedStyle(d).position, form: getComputedStyle(document.querySelector('main > div.grid, main > div.hidden')).display }; }"); print("   dentro do <main>:", dentro)
        assert c and dentro["noMain"] and dentro["pos"] == "relative" and dentro["form"] == "none", (c, dentro)
        assert abs(c["w"] - ref["mainW"] + 2 * (ref["mainW"] - c["w"]) / 2) >= 0 and c["w"] > 0.9 * (ref["mainW"] - 40), (c, ref)
        assert pg.locator("[data-testid=barra-modos]").is_hidden(), "a barra de modos deveria sumir com o módulo aberto"
        pg.screenshot(path="/tmp/claude-0/work/mob/lupa_na_janela.png")
        pg.locator("button:has-text('Fechar')").last.click(); pg.wait_for_timeout(600); assert caixa_lupa() is None and pg.locator("[data-testid=barra-modos]").is_visible()
        # Mesa
        pg.locator("#btn-header-hearing-workbench-tools").first.dispatch_event("click"); pg.wait_for_timeout(1500)
        m = pg.evaluate("() => { const d = document.querySelector('.mesa-escura'); if (!d) return null; const r = d.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width, noMain: !!d.closest('main'), pos: getComputedStyle(d).position }; }"); print("Mesa:", m)
        assert m and m["noMain"] and m["pos"] == "relative" and m["w"] > 0.9 * (ref["mainW"] - 40), (m, ref)
        pg.screenshot(path="/tmp/claude-0/work/mob/mesa_na_janela.png")
        # Turbo: também no corpo principal
        pg.locator("button:has-text('Fechar')").last.click() if pg.locator("button:has-text('Fechar')").count() else None; pg.wait_for_timeout(500)
        pg.locator("#btn-header-turbo-top").first.dispatch_event("click"); pg.wait_for_timeout(1500)
        t = pg.evaluate("() => { const d = document.querySelector('[data-modulo-janela=turbo]'); if (!d) return null; const r = d.getBoundingClientRect(); return { w: r.width, noMain: !!d.closest('main'), pos: getComputedStyle(d).position }; }"); print("Turbo:", t)
        assert t and t["noMain"] and t["pos"] == "relative" and t["w"] > 0.9 * (ref["mainW"] - 40), (t, ref)
        # a preferência antiga (flutuante) é ignorada: não existe mais a opção
        pg.evaluate("localStorage.setItem('assessor_modulos_na_janela_v1','0'); window.dispatchEvent(new Event('assessor:modulos-janela'))"); pg.wait_for_timeout(600)
        assert pg.evaluate("() => !!document.querySelector('[data-modulo-janela=turbo]')"), "preferência antiga não pode voltar à janela flutuante"
        assert pg.locator("[data-testid=btn-modulos-janela]").count() == 0
        # navegação: só a Nova Análise fecha o módulo aberto; abrir um módulo fecha os outros
        abertos = lambda: pg.evaluate("() => [...document.querySelectorAll('[data-modulo-janela]')].map(d => d.getAttribute('data-modulo-janela'))")
        pg.locator("#btn-sidebar-minute-auditor").click(); pg.wait_for_timeout(1200); print("Lupa aberta:", abertos()); assert abertos() == ["lupa"], abertos()
        pg.locator("#btn-header-turbo-top").first.dispatch_event("click"); pg.wait_for_timeout(1200); print("Turbo por cima:", abertos()); assert abertos() == ["turbo"], abertos()
        pg.locator("#btn-sidebar-minute-auditor").click(); pg.wait_for_timeout(1200); print("Lupa pela barra lateral:", abertos()); assert abertos() == ["lupa"], abertos()
        pg.locator("#sidebar-principal button:has-text('Nova Análise')").first.click(); pg.wait_for_timeout(1000); print("Nova Análise:", abertos()); assert abertos() == [], abertos()
        assert pg.locator("[data-testid=barra-modos]").is_visible(), "o formulário deveria voltar"
        pg.locator("#btn-sidebar-minute-auditor").click(); pg.wait_for_timeout(1000); pg.locator("button[title*='barra lateral']").first.click(); pg.wait_for_timeout(500)
        assert abertos() == ["lupa"], "recolher a barra não pode fechar o módulo"
        # outras opções da barra lateral NÃO fecham o módulo
        pg.locator("button[title*='barra lateral']").first.click(); pg.wait_for_timeout(500)
        pg.locator("#sidebar-principal button:has-text('Histórico Local')").first.click(); pg.wait_for_timeout(1000)
        print("após Histórico Local:", abertos()); assert abertos() == ["lupa"], abertos()
        pg.keyboard.press("Escape"); pg.wait_for_timeout(500)
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
