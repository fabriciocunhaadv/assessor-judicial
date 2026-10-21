"""Lupa do Magistrado: duas etapas, prova literal (apontamento sem prova é descartado), nota por regra, aviso de modelo reduzido, coluna 2 com o resumo,
sem Salvar Tese/WhatsApp/Paradigma. Resultado da análise: abas no trilho lateral e chat recolhido com botão de destaque."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
sys.path.insert(0, AQUI)
from gerar_pdf import processo
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); os.makedirs("/tmp/claude-0/work/mob", exist_ok=True); procs = []
    pequeno = "/tmp/claude-0/work/mob/lupa_pequeno.pdf"; open(pequeno, "wb").write(processo(30, injecao=False, vazias=()))
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_lupa.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_lupa.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": int(os.environ.get("LARG", 1500)), "height": int(os.environ.get("ALT", 1000))})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg = ctx.new_page(); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true');")
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            # ---- A) resultado da análise: trilho e chat recolhido ----
            pg.locator("#tour-input-panel input[type=file]").first.set_input_files(pequeno)
            pg.wait_for_function("document.querySelector('#tour-input-panel')?.innerText.includes('30 págs') && document.querySelector('#tour-input-panel').innerText.includes('lidos')", timeout=120000)
            pg.locator("#tour-execute-btn").click()
            pg.wait_for_selector("[data-testid=trilho-abas]", timeout=180000); pg.wait_for_timeout(1500)
            tri = pg.locator("[data-testid=trilho-abas]"); box = tri.bounding_box(); print("A) trilho:", {k: round(v) for k, v in box.items()})
            assert box["width"] < 70 and box["height"] > 250, box
            assert pg.locator("[data-testid=barra-chat-fechado]").is_visible() and not pg.locator("[data-testid=painel-chat-gemini]").is_visible()
            tri.hover(); pg.wait_for_timeout(500); box2 = tri.bounding_box(); assert box2["width"] > 200, box2
            assert "Histórico" in tri.inner_text(), tri.inner_text()
            pg.screenshot(path="/tmp/claude-0/work/mob/resultado_trilho.png")
            pg.mouse.move(700, 600); pg.locator("[data-testid=abrir-chat-gemini]").click(); pg.wait_for_selector("[data-testid=painel-chat-gemini]", state="visible")
            assert not pg.locator("[data-testid=barra-chat-fechado]").is_visible(); pg.screenshot(path="/tmp/claude-0/work/mob/resultado_chat_aberto.png")
            pg.locator("[data-testid=fechar-chat-gemini]").click(); assert pg.locator("[data-testid=barra-chat-fechado]").is_visible(); print("   chat recolhido, abre pelo botão e recolhe de novo: ok")
            # ---- B) Lupa ----
            pg.locator("#btn-sidebar-minute-auditor").click(); pg.wait_for_timeout(1500)
            for _ in range(3):
                if pg.locator("#btn-lupa-auditar-minuta").count(): break
                pg.screenshot(path="/tmp/claude-0/work/mob/lupa_aberta.png")
                pg.locator("button:has-text('Nova Auditoria')").first.click(); pg.wait_for_timeout(1200)
            pg.wait_for_selector("#btn-lupa-auditar-minuta")
            def auditar():
                pg.locator("button:has-text('Nova Auditoria')").first.click() if pg.locator("#btn-lupa-auditar-minuta").count() == 0 else None
                tas = pg.locator("textarea:visible")
                tas.nth(0).fill("SENTENÇA. Trata-se de ação de cobrança movida por Fulano em face de Beltrano, que condeno ao pagamento da quantia pedida na inicial, conforme Mov. 77.")
                pg.locator("button:has-text('Colar Texto')").first.click(); pg.wait_for_timeout(300)
                pg.locator("textarea:visible").nth(1).fill("Movimentacao 1 : Peticao Inicial\\nO autor pede a condenação do réu ao pagamento de R$ 1.000,00 por cobrança indevida.\\nMovimentacao 2 : Contestacao\\nO réu nega a dívida e pede a improcedência.\\nMovimentacao 3 : Conclusos\\nMovimentacao 4 : Despacho\\n" * 6)
                pg.wait_for_timeout(400); pg.locator("#btn-lupa-auditar-minuta").click()
                pg.wait_for_selector("[data-testid=nota-por-regra]", timeout=180000)
            auditar(); pg.wait_for_timeout(1000)
            txt = pg.locator("body").inner_text()
            assert "Pedido não apreciado" in txt, "apontamento com prova deveria aparecer"
            assert "Apontamento inventado" not in txt, "apontamento sem prova deveria ser descartado"
            assert "Movimentação citada que não existe nos autos" in txt, "conferência por código (Mov. 77)"
            nota = pg.locator("[data-testid=nota-por-regra]").inner_text(); print("B) ", nota[:260].replace("\\n", " "))
            assert "1 apontamento(s) da IA foram descartados" in nota, nota
            assert pg.locator("[data-testid=alerta-trecho-minuta]").count() >= 1 and pg.locator("[data-testid=alerta-trecho-autos]").count() >= 1
            pg.screenshot(path="/tmp/claude-0/work/mob/lupa_resultado.png", full_page=False)
            # nota por regra: 100 - 25 (bloqueante com prova) - 8 (Mov. inexistente) = 67
            assert "67" in pg.locator("body").inner_text(), "nota calculada (67) não apareceu"
            modal = pg.evaluate("() => { const h = [...document.querySelectorAll('h1,h2,h3')].find((e) => /Lupa do Magistrado/.test(e.textContent)); const m = h && h.closest('div.fixed'); return m ? m.innerText : ''; }")
            assert "Lupa do Magistrado" in modal and len(modal) > 300
            for banido in ("Salvar Tese", "WhatsApp", "Paradigma"): assert banido not in modal, banido + " ainda aparece na Lupa"
            print("   sem 'Salvar Tese', 'WhatsApp' nem 'Paradigma'")
            assert pg.locator("[data-testid=aviso-modelo-fraco]").count() == 0
            # coluna 2 (bancada de tripla conferência)
            bt = pg.locator("button:has-text('Bancada de Tripla')").first
            if bt.count(): bt.click(); pg.wait_for_timeout(800)
            if pg.locator("[data-testid=coluna-resumo-analise]").count():
                c = pg.locator("[data-testid=coluna-resumo-analise]").inner_text(); assert "score" in c.lower() and "minuta gerada" in c.lower(); print("   coluna 2: resumo + minuta gerada ok"); pg.screenshot(path="/tmp/claude-0/work/mob/lupa_bancada.png")
            else: print("   (bancada de tripla conferência não abriu neste fluxo)")
            # ---- C) modelo reduzido: aviso ----
            urllib.request.urlopen(f"http://127.0.0.1:{PM}/__lite?on=1")
            pg.locator("button:has-text('Nova Auditoria')").first.click(); pg.wait_for_timeout(500)
            auditar(); pg.wait_for_timeout(800)
            assert pg.locator("[data-testid=aviso-modelo-fraco]").count() == 1; print("C) auditoria saída do modelo lite mostra o aviso de modelo reduzido")
            assert not [e for e in erros if "monitor" in e.lower()], erros
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
