"""O app completo: análise normal intacta para PDF pequeno; pergunta de processo gigante para PDF enorme."""
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
def log_(): return json.loads(urllib.request.urlopen(f"http://127.0.0.1:{PM}/__log").read())

def abrir(ctx, pdf, paginas):
    pg = ctx.new_page(); pg.set_default_timeout(30000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
    pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); localStorage.setItem('agaia_native_key_allowed_teste-uid','true'); window.__GIGANTE_INTERVALO_MS=1500; window.__GIGANTE_FOLGA_MS=1500;")
    pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
    pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
    pg.locator("#tour-input-panel input[type=file]").first.set_input_files(pdf)
    pg.wait_for_function("(n) => document.querySelector('#tour-input-panel')?.innerText.includes(n + ' págs') && document.querySelector('#tour-input-panel').innerText.includes('lidos')", arg=str(paginas), timeout=120000)
    return pg, erros

def main():
    pequeno = "/tmp/claude-0/work/mob/app_pequeno.pdf"; grande = "/tmp/claude-0/work/mob/app_grande.pdf"
    open(pequeno, "wb").write(processo(30, injecao=False, vazias=())); open(grande, "wb").write(processo(700))
    procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_gig3.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_gig3.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1400, "height": 1000})
            ctx.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            # A) PDF pequeno: nada de pergunta de gigante; a análise normal segue como sempre
            pg, erros = abrir(ctx, pequeno, 30)
            pg.locator("#tour-execute-btn").click()
            pg.wait_for_function("document.body.innerText.includes('Prosseguir') || document.querySelector('#tour-meta-parties-box') || document.body.innerText.includes('RELATÓRIO')", timeout=120000)
            assert pg.locator("[data-testid=dialogo-gigante]").count() == 0
            L = log_(); print("A) análise normal rodou:", len(L), "chamadas à IA; sem pergunta de gigante")
            assert len(L) >= 1 and not any(x.get("p") in ("ficha", "fusao") for x in L)
            pg.close()
            # B) PDF enorme: pergunta; "cancelar" não dispara nada
            n_antes = len(log_())
            pg, erros = abrir(ctx, grande, 700)
            pg.locator("#tour-execute-btn").click()
            pg.wait_for_selector("[data-testid=dialogo-gigante]", timeout=60000); print("B) pergunta de processo gigante apareceu")
            pg.screenshot(path="/tmp/claude-0/work/mob/gig_dialogo.png")
            est = pg.locator("[data-testid=gigante-corte-estimado]").inner_text(); print("   estimativa do corte mostrada:", est.replace("\n", " | ")[:200])
            assert "NÃO será lido" in est and "págs." in est, est
            pg.locator("text=Cancelar").last.click(); pg.wait_for_timeout(800)
            assert pg.locator("[data-testid=dialogo-gigante]").count() == 0 and len(log_()) == n_antes, "cancelar não pode chamar a IA"
            # C) "ler em lotes": o job aparece no selo e termina; a tela continua livre
            pg.locator("#tour-execute-btn").click(); pg.wait_for_selector("[data-testid=dialogo-gigante]")
            pg.locator("[data-testid=gigante-lotes]").click()
            pg.wait_for_selector("[data-testid=gigantes-painel]", timeout=30000); pg.wait_for_selector("[data-testid=gigante-job]")
            pg.screenshot(path="/tmp/claude-0/work/mob/gig_painel.png")
            assert pg.locator("#tour-execute-btn").is_enabled(), "o app não pode ficar travado enquanto o gigante processa"
            pg.wait_for_function("document.querySelector('[data-testid=gigante-job]')?.innerText.includes('Concluído')", timeout=400000)
            pg.screenshot(path="/tmp/claude-0/work/mob/gig_painel_fim.png")
            print("C) gigante concluído em segundo plano; resumo para a extensão:", pg.evaluate("document.documentElement.dataset.gigantes")[:160])
            L = log_(); fichas = [x for x in L if x.get("p") == "ficha"]; print("   fichas:", len(fichas))
            assert len(fichas) >= 2
            # D) processo acima do limite da leitura em lotes: botões claros (dividir, remover/anexar reduzido, normal)
            open("/tmp/claude-0/work/mob/app_enorme.pdf", "wb").write(processo(3100, injecao=False, vazias=()))
            pg2, e2 = abrir(ctx, "/tmp/claude-0/work/mob/app_enorme.pdf", 3100)
            pg2.locator("#tour-execute-btn").click(); pg2.wait_for_selector("[data-testid=dialogo-gigante]", timeout=60000)
            t = pg2.locator("[data-testid=gigante-acima-limite]").inner_text(); print("D) acima do limite:", t.replace("\n", " | ")[:200])
            assert "3.000" in t and pg2.locator("[data-testid=gigante-lotes]").count() == 0
            assert pg2.locator("[data-testid=gigante-partes]").count() == 1 and pg2.locator("[data-testid=gigante-limpar]").count() == 1 and pg2.locator("[data-testid=gigante-normal]").count() == 1
            pg2.screenshot(path="/tmp/claude-0/work/mob/gig_acima.png")
            # D1) "Remover os PDFs": apaga os anexos
            pg2.locator("[data-testid=gigante-limpar]").click(); pg2.wait_for_timeout(1200)
            assert pg2.locator("[data-testid=dialogo-gigante]").count() == 0 and "3100 págs" not in pg2.locator("#tour-input-panel").inner_text(), "os anexos devem ser removidos"
            print("D1) anexos removidos pelo botão")
            # D2) "Dividir automaticamente": 2 partes, lidas em sequência, cada uma com a sua minuta
            pg3, e3 = abrir(ctx, "/tmp/claude-0/work/mob/app_enorme.pdf", 3100)
            pg3.locator("#tour-execute-btn").click(); pg3.wait_for_selector("[data-testid=gigante-partes]", timeout=60000)
            pg3.locator("[data-testid=gigante-partes]").click()
            pg3.wait_for_selector("[data-testid=gigantes-painel]", timeout=30000)
            pg3.wait_for_function("[...document.querySelectorAll('[data-testid=gigante-job]')].filter(j => /Parte \\d de 2/.test(j.innerText)).length === 2", timeout=60000)
            nomes = [x for x in pg3.locator("[data-testid=gigante-job]").all_inner_texts() if "Parte" in x]; print("D2) trabalhos:", [x.split("\n")[0][:70] for x in nomes])
            assert any("Parte 1 de 2" in x for x in nomes) and any("Parte 2 de 2" in x for x in nomes)
            t0 = time.time(); ult = ""
            while time.time() - t0 < 900:
                st = pg3.evaluate("window.__estadoPartes = [...document.querySelectorAll('[data-testid=gigante-job]')].filter(j => /Parte \\d de 2/.test(j.innerText)).map(j => j.innerText.replace(/\\n+/g, ' | ').slice(0, 330))")
                linha = " || ".join(x[:150] for x in st)
                if linha != ult: print(f"[{int(time.time()-t0)}s]", linha); ult = linha
                if any("Erro" in x[:200] and "Concluído" not in x[:200] for x in st): print("ERRO NA PARTE:", st); break
                if len(st) == 2 and all("Concluído" in x for x in st): break
                time.sleep(5)
            assert len(st) == 2 and all("Concluído" in x for x in st), st
            L = log_(); fichas = len([x for x in L if x.get("p") == "ficha"]); print("   fichas das duas partes:", fichas)
            print("D2) as duas partes concluídas, uma de cada vez")
            # D3) unir as partes numa só minuta (sem reler: só fusão + minuta final)
            nf0 = len([x for x in log_() if x.get("p") == "ficha"]); nfin0 = len([x for x in log_() if x.get("p") == "final" or x.get("dossie")])
            btn = pg3.locator("[data-testid=gigante-unir-partes]"); assert btn.count() == 1, "o botão de unir deve aparecer só na última parte"
            btn.click()
            pg3.wait_for_function("[...document.querySelectorAll('[data-testid=gigante-job]')].some(j => /partes unidas/.test(j.innerText) && /Concluído/.test(j.innerText))", timeout=300000)
            assert len([x for x in log_() if x.get("p") == "ficha"]) == nf0, "unir não pode reler os lotes"
            assert pg3.locator("[data-testid=gigante-unir-partes]").count() == 0, "o botão some depois de unir"
            print("D3) partes unidas numa só minuta, sem reler os lotes")
            print("OK" if not erros else "erros de página: " + str(erros[:3]))
            b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
