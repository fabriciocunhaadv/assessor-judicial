"""Snapshots no painel do super admin: limpeza automática (fica só o último), seleção de vários, "excluir todos menos o mais recente" e mensagem do motivo quando a exclusão falha. Firestore em memória."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5199
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
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_mon.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.monitor.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_mon.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": int(os.environ.get("LARG", 1400)), "height": 1000})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg = ctx.new_page(); pg.set_default_timeout(30000); falhas = []; pg.on("pageerror", lambda e: falhas.append(str(e)[:160]))
            pg.add_init_script("globalThis.__fsMem = Object.fromEntries([1,2,3,4,5,6].map(i => ['system_snapshots/snapshot_'+i, {id:'snapshot_'+i, timestamp: 1700000000000+i*1000, dateIso:'x', reason:'Motivo '+i, triggeredBy:'manual', authorEmail:'a@b.c', authorName:'A', summary:{}, isChunked:false}])); localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__off = 0; const n0 = Date.now.bind(Date); Date.now = () => n0() + window.__off;")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(3500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            pg.locator("button:has-text('Configurações')").first.hover(); pg.wait_for_timeout(400); pg.locator("button:has-text('SaaS Admin'):visible").first.click()
            pg.wait_for_selector("[data-testid=aba-monitor-erros]")
            pg.get_by_role("button", name="Snapshots").first.click(); pg.wait_for_timeout(1500)
            n = lambda: pg.evaluate("Object.keys(globalThis.__fsMem).filter(k => k.startsWith('system_snapshots/')).length")
            print("1) após a limpeza automática:", n()); assert n() == 1, n()
            sembarra = lambda: pg.locator("[data-testid=snap-check]").count()
            # recoloca 5 snapshots e atualiza a lista
            pg.evaluate("[1,2,3,4,5].forEach(i => globalThis.__fsMem['system_snapshots/snapshot_'+i] = {id:'snapshot_'+i, timestamp: 1700000000000+i*1000, dateIso:'x', reason:'Motivo '+i, triggeredBy:'manual', authorEmail:'a@b.c', authorName:'A', summary:{}, isChunked:false})")
            pg.locator("button[title='Atualizar lista']").click(); pg.wait_for_timeout(1200)
            print("2) cartões na tela:", sembarra()); assert sembarra() == 6, sembarra()
            # exclusão com falha mostra o motivo
            pg.evaluate("globalThis.__fsFalhaExcluir = true")
            pg.locator("[data-testid=snap-check]").nth(1).check(); pg.locator("[data-testid=btn-excluir-selecionados]").click(); pg.locator("[data-testid=btn-confirmar-exclusao]").click(); pg.wait_for_timeout(800)
            msg = pg.locator("[data-testid=erro-exclusao-snapshots]").inner_text(); print("3) falha:", msg); assert "insufficient permissions" in msg and n() == 6
            pg.evaluate("globalThis.__fsFalhaExcluir = false")
            # exclui 2 selecionados
            pg.locator("[data-testid=snap-check]").nth(2).check()
            pg.locator("[data-testid=btn-excluir-selecionados]").click(); pg.locator("[data-testid=btn-confirmar-exclusao]").click(); pg.wait_for_timeout(1000)
            print("4) após excluir selecionados:", n(), "na tela:", sembarra()); assert n() == 4 and sembarra() == 4
            # todos menos o mais recente
            pg.locator("[data-testid=btn-excluir-menos-recente]").click(); pg.locator("[data-testid=btn-confirmar-exclusao]").click(); pg.wait_for_timeout(1000)
            restante = pg.evaluate("Object.keys(globalThis.__fsMem).filter(k => k.startsWith('system_snapshots/'))"); print("5) sobrou:", restante)
            assert restante == ["system_snapshots/snapshot_6"], restante
            # botão de lixeira de um só
            pg.evaluate("[1,2].forEach(i => globalThis.__fsMem['system_snapshots/snapshot_'+i] = {id:'snapshot_'+i, timestamp: 1700000000000+i*1000, dateIso:'x', reason:'Motivo '+i, triggeredBy:'manual', authorEmail:'a@b.c', authorName:'A', summary:{}, isChunked:false})")
            pg.locator("button[title='Atualizar lista']").click(); pg.wait_for_timeout(1000)
            pg.locator("button[title='Excluir este snapshot']").first.click(); pg.locator("[data-testid=btn-confirmar-exclusao]").click(); pg.wait_for_timeout(900)
            print("6) lixeira individual:", n()); assert n() == 2
            vis = pg.evaluate("() => { const t = document.querySelector('[data-testid=abas-super-admin]'); const r = t.getBoundingClientRect(); return { linhas: new Set([...t.querySelectorAll('button')].map(x => Math.round(x.getBoundingClientRect().top))).size, larg: r.width, rolagem: t.scrollWidth > t.clientWidth + 1, abas: [...t.querySelectorAll('button')].map(x => { const q = x.getBoundingClientRect(); return q.right <= window.innerWidth + 1 && q.left >= -1; }) }; }")
            print("7) abas:", vis); assert not vis["rolagem"] and all(vis["abas"]) and vis["linhas"] == 1, vis
            pg.screenshot(path="/tmp/claude-0/work/mob/snapshots.png")
            print("OK"); b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
