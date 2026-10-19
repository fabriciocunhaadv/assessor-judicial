"""Histórico & Dossiês: cabeçalho compacto, filtros recolhidos, lista densa (uma linha por processo)."""
import glob, json, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
def item(i, lancado):
    num = f"55{i:05d}-10.2025.8.09.0166"
    return {"id": f"h{i}", "processNumber": num, "promptTitle": "Outros Área Judicial - Juizado Faz.Pub.", "date": 1790000000000 - i * 3600000, "unitId": "montes_claros", "createdBy": "u1", "creatorName": "Fabricio", "creatorEmail": "f@x.com",
            "lancadoProjudi": 1790000100000 if lancado else None,
            "result": {"minute": {"title": "DECISÃO INTERLOCUTÓRIA (1ª ETAPA)", "processNumber": num, "parties": {"author": f"AUTOR NÚMERO {i} DA SILVA", "defendant": "ESTADO DE GOIÁS"}, "judicialUnit": "Montes Claros / Vara Única"}}, "originalMinute": {"title": "x"}}
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_hv.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    seed = [item(i, i % 5 == 0) for i in range(1, 31)]
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1280, "height": 900}); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); window.__seedHistory = " + json.dumps(seed) + ";")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
        pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        aberto = False
        for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
            l = pg.locator(seletor)
            if l.count():
                l.first.dispatch_event("click"); pg.wait_for_timeout(1500)
                if pg.locator("[data-testid=historico-barra]").count(): aberto = True; break
        assert aberto, "não consegui abrir o Histórico"
        pg.wait_for_selector("[data-testid=dossie-linha]", timeout=15000)
        barra = pg.locator("[data-testid=historico-barra]").bounding_box(); topo = pg.locator("[data-testid=historico-barra]").evaluate("e => e.parentElement.getBoundingClientRect().top")
        altura_cab = barra["y"] + barra["height"] - topo
        linhas = pg.locator("[data-testid=dossie-linha]"); n = linhas.count(); vis = sum(1 for i in range(n) if linhas.nth(i).bounding_box() and linhas.nth(i).bounding_box()["y"] + linhas.nth(i).bounding_box()["height"] < 900)
        print(f"cabeçalho + barra: {altura_cab:.0f}px | linhas na página: {n} | linhas visíveis sem rolar: {vis}")
        pg.screenshot(path="/tmp/claude-0/work/mob/historico_novo.png")
        assert altura_cab < 190, "o cabeçalho continua grande"
        assert n == 14 and vis >= 8, (n, vis)
        # padrão: só os a lançar (24 de 30 não lançados)
        assert pg.evaluate("[...document.querySelectorAll('[data-testid=btn-lancado-projudi]')].filter(b => b.innerText.trim() === 'Lançado').length") == 0, "por padrão só aparecem os a lançar"
        assert pg.locator("[data-testid=painel-filtros]").count() == 0, "filtros começam recolhidos"
        # marcar como lançado: a linha NÃO pode sumir na hora do clique (ficou à vista até trocar o filtro)
        antes = pg.locator("[data-testid=dossie-linha]").count()
        pg.locator("[data-testid=btn-lancado-projudi]").first.dispatch_event("click"); pg.wait_for_timeout(800)
        depois = pg.locator("[data-testid=dossie-linha]").count()
        assert depois == antes, f"o processo sumiu ao marcar como lançado ({antes} -> {depois})"
        assert pg.evaluate("[...document.querySelectorAll('[data-testid=btn-lancado-projudi]')].filter(b => b.innerText.trim() === 'Lançado').length") == 1, "a marcação não apareceu"
        pg.locator("text=/^Lançados \\(/").first.dispatch_event("click"); pg.wait_for_timeout(500)
        pg.locator("text=/^A lançar \\(/").first.dispatch_event("click"); pg.wait_for_timeout(500)
        marcado = pg.evaluate("[...document.querySelectorAll('[data-testid=btn-lancado-projudi]')].filter(b => b.innerText.trim() === 'Lançado').length")
        assert marcado == 0, "ao voltar ao filtro 'A lançar' o marcado deveria sair da lista"
        print("marcar lançado: ficou à vista e saiu da lista só ao trocar de filtro")
        pg.locator("[data-testid=btn-filtros]").dispatch_event("click"); pg.wait_for_selector("[data-testid=painel-filtros]")
        pg.locator("text=Todos").first.dispatch_event("click"); pg.wait_for_timeout(500)
        pg.set_viewport_size({"width": 390, "height": 800}); pg.wait_for_timeout(600)
        sobra = pg.evaluate("(() => { const m = document.querySelector('[data-testid=historico-barra]').parentElement; return m.scrollWidth - m.clientWidth })()")
        pg.screenshot(path="/tmp/claude-0/work/mob/historico_celular.png"); print("celular: sobra horizontal =", sobra); assert sobra <= 2, "o histórico não pode rolar na horizontal no celular"
        print("OK: histórico compacto"); assert not erros, erros[:3]; b.close()
finally:
    os.killpg(vite.pid, 9)
