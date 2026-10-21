"""Histórico do Módulo Turbo: mostra 4, botão Mostrar todos, e cada cartão traz o nome do usuário e a data."""
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
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('assessor_turbo_history', JSON.stringify([1,2,3,4,5,6,7].map(i => ({id:'t'+i, date:'0'+i+'/10/2026, 10:0'+i+':00', processNumber:'000000'+i+'-00.2026.8.09.0166', title:'x', parties:'A'+i+' vs B'+i, elapsedSeconds:'20', userName: i<7 ? 'Usuário '+i : undefined, minute:{} }))));")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        ref = pg.evaluate("() => { const r = document.querySelector('main').getBoundingClientRect(); return { cab: document.querySelector('header').getBoundingClientRect().bottom, lat: document.getElementById('sidebar-principal').getBoundingClientRect().right, mainL: r.left, mainW: r.width }; }"); print("referências:", ref)
        pg.locator("#btn-header-turbo-top").first.dispatch_event("click"); pg.wait_for_timeout(1500)
        cards = lambda: pg.locator("[data-testid=turbo-historico-quem-quando]")
        print("cartões iniciais:", cards().count()); assert cards().count() == 4
        assert "Usuário 1 · 01/10/2026" in cards().first.inner_text(), cards().first.inner_text()
        pg.locator("[data-testid=turbo-historico-todos]").click(); pg.wait_for_timeout(400)
        print("com todos:", cards().count()); assert cards().count() == 7
        assert "Usuário não registrado" in cards().nth(6).inner_text()
        pg.screenshot(path="/tmp/claude-0/work/mob/turbo_historico.png")
        pg.locator("[data-testid=turbo-historico-todos]").click(); pg.wait_for_timeout(300); assert cards().count() == 4
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
