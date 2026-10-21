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
        pg = b.new_context(viewport={"width": 1500, "height": 900}).new_page(); pg.set_default_timeout(30000)
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1');")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        ref = pg.evaluate("() => ({ cab: document.querySelector('header').getBoundingClientRect().bottom, lat: document.getElementById('sidebar-principal').getBoundingClientRect().right })"); print("referências:", ref)
        def caixa_lupa():
            return pg.evaluate("() => { const h = [...document.querySelectorAll('h2')].find((e) => /Lupa do Magistrado/.test(e.textContent)); const d = h && h.closest('div.fixed'); if (!d) return null; const r = d.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width, h: r.height, bg: getComputedStyle(d).backgroundColor }; }")
        pg.locator("#btn-sidebar-minute-auditor").click(); pg.wait_for_timeout(1500)
        c = caixa_lupa(); print("Lupa:", c); assert c and abs(c["top"] - ref["cab"]) < 4 and abs(c["left"] - ref["lat"]) < 4 and c["w"] > 1000, c
        pg.screenshot(path="/tmp/claude-0/work/mob/lupa_na_janela.png")
        pg.locator("button:has-text('Fechar')").last.click(); pg.wait_for_timeout(600); assert caixa_lupa() is None
        # Mesa
        pg.locator("#btn-header-hearing-workbench-tools").first.dispatch_event("click"); pg.wait_for_timeout(1500)
        m = pg.evaluate("() => { const d = document.querySelector('.mesa-escura'); if (!d) return null; const r = d.getBoundingClientRect(); return { top: r.top, left: r.left, w: r.width }; }"); print("Mesa:", m)
        assert m and abs(m["top"] - ref["cab"]) < 4 and abs(m["left"] - ref["lat"]) < 4 and m["w"] > 1000, m
        pg.screenshot(path="/tmp/claude-0/work/mob/mesa_na_janela.png")
        pg.evaluate("localStorage.setItem('assessor_modulos_na_janela_v1','0'); window.dispatchEvent(new Event('assessor:modulos-janela'))"); pg.wait_for_timeout(900)
        m2 = pg.evaluate("() => { const d = document.querySelector('.mesa-escura'); const r = d.getBoundingClientRect(); return { top: r.top, left: r.left }; }"); print("Mesa com preferência desligada:", m2); assert m2["top"] == 0 and m2["left"] == 0
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
