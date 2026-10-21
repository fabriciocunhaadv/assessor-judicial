"""Monitor de erros: captura (tela, promessa, /api 4xx/5xx, erro dentro de 200), agrupamento, máscara de dados pessoais, painel do super admin,
diagnóstico pela IA (simulada) e decisão do super admin (aceitar/recusar) + pedido de correção. Firestore em memória."""
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
            ctx = b.new_context(viewport={"width": 1400, "height": 1000})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg = ctx.new_page(); pg.set_default_timeout(30000); falhas = []; pg.on("pageerror", lambda e: falhas.append(str(e)[:160]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__off = 0; const n0 = Date.now.bind(Date); Date.now = () => n0() + window.__off;")
            pg.route("**/api/generate-minute", lambda r: r.fulfill(status=503, content_type="application/json", body=json.dumps({"error": "Os servidores do Google estão com alta demanda (503). Processo 5864706-92.2024.8.09.0166 de joao@exemplo.com"})))
            pg.route("**/api/generate-minute-turbo", lambda r: r.fulfill(status=200, content_type="application/json", body=json.dumps({"error": "A IA devolveu JSON incompleto", "isError": True})))
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(3500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            H = "{'Content-Type':'application/json'}"
            pg.evaluate(f"fetch('/api/generate-minute',{{method:'POST',headers:{H},body:'{{}}'}}).catch(()=>{{}})"); pg.wait_for_timeout(500)
            pg.evaluate(f"fetch('/api/generate-minute-turbo',{{method:'POST',headers:{H},body:'{{}}'}}).catch(()=>{{}})"); pg.wait_for_timeout(500)
            pg.evaluate(f"fetch('/api/audit-assessor-draft',{{method:'POST',headers:{H},body:'{{}}'}}).catch(()=>{{}})"); pg.wait_for_timeout(800)
            pg.evaluate("setTimeout(() => { throw new Error('Falha de tela 4821 de maria@teste.com no processo 5864706-92.2024.8.09.0166 CPF 123.456.789-09'); }, 0)"); pg.wait_for_timeout(500)
            pg.evaluate("setTimeout(() => { Promise.reject(new Error('Promessa sem tratamento')); }, 0)"); pg.wait_for_timeout(500)
            # mesmo erro de novo dentro de 1 min: ignorado; depois de 61 s: soma
            pg.evaluate(f"fetch('/api/generate-minute',{{method:'POST',headers:{H},body:'{{}}'}}).catch(()=>{{}})"); pg.wait_for_timeout(500)
            mem = pg.evaluate("Object.keys(globalThis.__fsMem||{}).length"); print("1) grupos gravados antes do 2º minuto:", mem)
            pg.evaluate("window.__off = 61000"); pg.evaluate(f"fetch('/api/generate-minute',{{method:'POST',headers:{H},body:'{{}}'}}).catch(()=>{{}})"); pg.wait_for_timeout(800)
            dados = pg.evaluate("globalThis.__fsMem"); txt = json.dumps(dados, ensure_ascii=False)
            for k, v in dados.items(): print("  ", k.split('/')[-1], v["modulo"], v["tipo"], v["status"], v["contagem"], "|", v["mensagem"][:90])
            assert len(dados) == 5, len(dados)
            assert "joao@exemplo.com" not in txt and "maria@teste.com" not in txt and "5864706-92" not in txt and "123.456.789-09" not in txt, "dado pessoal vazou"
            g503 = [v for v in dados.values() if v["status"] == 503][0]; assert g503["contagem"] == 2 and g503["tipo"] == "passageiro", g503
            assert any(v["modulo"] == "turbo" and v["status"] == 200 for v in dados.values()), "erro dentro de 200 não capturado"
            assert any(v["origem"] == "tela" for v in dados.values()) and any(v["origem"] == "promessa" for v in dados.values())
            print("2) captura, agrupamento (2×) e máscara de dados pessoais: ok")
            # painel do super admin
            pg.evaluate("window.__off = 0"); pg.locator("button:has-text('SaaS Admin'):visible").first.click(); pg.wait_for_selector("[data-testid=aba-monitor-erros]")
            pg.locator("[data-testid=aba-monitor-erros]").click(); pg.wait_for_selector("[data-testid=monitor-erros]")
            pg.wait_for_function("document.querySelectorAll('[data-testid=erro-item]').length >= 3")
            n_ocultando = pg.locator("[data-testid=erro-item]").count(); print("3) painel abre; itens com 'ocultar passageiros':", n_ocultando)
            pg.locator("text=Ocultar passageiros").click(); pg.wait_for_timeout(300)
            n_todos = pg.locator("[data-testid=erro-item]").count(); print("   itens mostrando passageiros:", n_todos); assert n_todos > n_ocultando
            pg.screenshot(path="/tmp/claude-0/work/mob/monitor_lista.png")
            # diagnóstico + aceitar
            item = pg.locator("[data-testid=erro-item]").filter(has_text="HTTP 503").first
            item.locator("text=Diagnosticar com IA").click(); pg.wait_for_selector("text=Pico de demanda no cluster do Gemini")
            assert pg.locator("[data-testid=erro-item]").filter(has_text="HTTP 503").first.locator("text=Aceitar ajuste").is_enabled()
            item = pg.locator("[data-testid=erro-item]").filter(has_text="HTTP 503").first
            item.locator("input[placeholder^='Nota']").fill("Aplicar na próxima versão"); item.locator("text=Aceitar ajuste").click()
            pg.wait_for_selector("text=Ajuste aceito. Entra no pedido de correção.")
            st = [v for v in pg.evaluate("globalThis.__fsMem").values() if v["status"] == 503][0]
            assert st["situacao"] == "aceito" and st["diagnostico"]["causa_provavel"] and st["decisao"]["nota"] == "Aplicar na próxima versão", st
            print("4) diagnóstico pela IA salvo e ajuste aceito pelo super admin: ok")
            # recusar outro: nada pode ser aplicado sozinho
            outro = pg.locator("[data-testid=erro-item]").filter(has_text="Promessa sem tratamento").first
            outro.locator("text=Recusar").click(); pg.wait_for_selector("text=Marcado como recusado.")
            assert [v for v in pg.evaluate("globalThis.__fsMem").values() if "Promessa" in v["mensagem"]][0]["situacao"] == "recusado"
            pg.screenshot(path="/tmp/claude-0/work/mob/monitor_aceito.png")
            pg.context.grant_permissions(["clipboard-read", "clipboard-write"])
            pg.locator("text=Copiar pedido de correção (1)").click(); pg.wait_for_timeout(600)
            clip = pg.evaluate("navigator.clipboard.readText()"); print("5) pedido copiado:\n", clip[:420])
            assert "ACEITOU" in clip and "Aumentar a espera entre ciclos" in clip and "Promessa" not in clip
            assert not [f for f in falhas if 'Falha de tela 4821' not in f and 'Promessa sem tratamento' not in f], falhas
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
