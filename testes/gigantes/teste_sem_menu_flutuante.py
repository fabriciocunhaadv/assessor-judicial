"""Sem o menu flutuante da direita: botão da chave de API ao lado do Copiloto e o guia 'Como iniciar' nas Configurações."""
import glob, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
os.makedirs("/tmp/claude-0/work/teste", exist_ok=True)
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_semmenu.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_context(viewport={"width": 1500, "height": 900}).new_page(); pg.set_default_timeout(30000)
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1');")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        assert pg.locator("[aria-label='Tutor e Guia Lateral']").count() == 0, "o menu flutuante ainda existe"
        btn = pg.locator("[data-testid=btn-chave-api-topo]"); assert btn.is_visible(); print("botão da chave no topo:", btn.inner_text().strip() or "(só ícone)")
        pos_chave = btn.bounding_box()["x"]; pos_cop = pg.locator("#btn-header-copilot-top").bounding_box()["x"]; assert pos_chave < pos_cop, (pos_chave, pos_cop)
        pg.locator("button:has-text('Configurações')").first.hover(); pg.wait_for_timeout(400)
        item = pg.locator("button:has-text('Como iniciar uma análise')").first; assert item.is_visible(); item.click(); pg.wait_for_timeout(800)
        pg.screenshot(path="/tmp/claude-0/work/mob/sem_menu_flutuante.png")
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
