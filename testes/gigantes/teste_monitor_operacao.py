"""Monitor de operação: operações de vários usuários (esteira/manual) viram alertas agrupados (prompt Criminal em unidade de Juizado Cível), resumo por usuário e pedido de correção. Firestore em memória."""
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
            pg.add_init_script("globalThis.__fsMem = (() => { const m = {}; const ev = (i, email, nome, origem, unit, prompt, extra = {}) => { m['gabinetes/gab_rafael_machado/ops_events/e' + i] = { ts: 1790000000000 + i * 1000, uid: 'u-' + email, email, nome, unitId: 'crixas', unitName: unit, modulo: 'normal', origem, promptTitle: prompt, promptCategory: 'criminal', promptEhPadraoDaLista: false, processo: '5000' + String(i).padStart(3, '0') + '-10.2026.8.09.0050', resultado: 'ok', erro: '', duracaoMs: 1000, anomalias: [], ...extra }; };   for (let i = 1; i <= 3; i++) ev(i, 'juliana@x.com', 'Juliana Fotos', 'esteira', 'Crixás - Juizado Especial Cível', 'Outros Área Judicial - Criminal', { anomalias: [{ codigo: 'prompt_incompativel_unidade', gravidade: 'alta', texto: 'Prompt de criminal (“Outros Área Judicial - Criminal”) usado numa unidade de civel (“Crixás - Juizado Especial Cível”).' }] });   ev(4, 'mike@x.com', 'Mike', 'manual', 'Montes Claros / Vara Única', 'Outros Área Judicial - Cível');   ev(5, 'mike@x.com', 'Mike', 'esteira', 'Montes Claros / Vara Única', 'Outros Área Judicial - Cível', { modulo: 'turbo', resultado: 'segundo_plano', anomalias: [{ codigo: 'turbo_foi_para_segundo_plano', gravidade: 'atencao', texto: 'O Turbo falhou e o processo foi para o segundo plano (análise normal).' }] });   return m; })();  localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__off = 0; const n0 = Date.now.bind(Date); Date.now = () => n0() + window.__off;")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(3500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            pg.locator("button:has-text('Configurações')").first.hover(); pg.wait_for_timeout(400); pg.locator("button:has-text('SaaS Admin'):visible").first.click()
            pg.wait_for_selector("[data-testid=aba-monitor-operacao]")
            pg.locator("[data-testid=aba-monitor-operacao]").click(); pg.wait_for_selector("[data-testid=monitor-operacao]"); pg.wait_for_timeout(1500)
            print("1) operações:", pg.locator("[data-testid=op-total]").inner_text(), "| alertas graves:", pg.locator("[data-testid=op-alertas-altos]").inner_text())
            assert pg.locator("[data-testid=op-total]").inner_text() == "5" and pg.locator("[data-testid=op-alertas-altos]").inner_text() == "1"
            al = pg.locator("[data-testid=op-alerta]"); print("2) alertas:", al.count()); assert al.count() == 2
            t = al.first.inner_text(); print("   primeiro:", t.replace("\n", " | ")[:260]); assert "GRAVE" in t and "Juliana" in t and "3×" in t and "Juizado Especial Cível" in t
            assert pg.locator("[data-testid=op-linha]").count() == 5
            pg.locator("[data-testid=op-copiar-pedido]").click(); pg.wait_for_timeout(300)
            # registro novo pelo próprio sistema: passa pelas regras e é gravado
            r = pg.evaluate("""async () => { const m = await import('/src/utils/monitorOperacao.ts'); await m.registrarOperacao({ modulo: 'normal', origem: 'esteira', unitName: 'Crixás - Juizado Especial Cível', promptTitle: 'Outros Área Judicial - Criminal', promptEhPadraoDaLista: true, processo: '5111111-11.2026.8.09.0050', resultado: 'ok' });
              return Object.entries(globalThis.__fsMem).filter(([k]) => k.includes('ops_events')).map(([k, v]) => v).filter(v => v.processo === '5111111-11.2026.8.09.0050')[0]; }""")
            print("3) registrado:", r["origem"], [a["codigo"] for a in r["anomalias"]]); assert r["origem"] == "esteira" and [a["codigo"] for a in r["anomalias"]] == ["prompt_incompativel_unidade", "esteira_prompt_padrao"], r
            assert not falhas, falhas
            print("OK"); b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
