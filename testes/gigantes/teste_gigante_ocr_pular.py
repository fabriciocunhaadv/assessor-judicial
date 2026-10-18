"""Teste ponta a ponta da leitura em lotes (processos gigantes): navegador + servidor real + Google simulado."""
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

def main():
    n = int(os.environ.get("N", "150"))
    pdf = "/tmp/claude-0/work/mob/gigante_teste.pdf"; open(pdf, "wb").write(processo(n))
    procs = []
    try:
        mock = subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "60000"], start_new_session=True); procs.append(mock)
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost", "COTA_PAUSA_MS": "1500", "AUTOS_GRANDES_PAUSA_MS": "1500"}
        srv = subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_gig.log", "w"), stderr=subprocess.STDOUT, start_new_session=True); procs.append(srv)
        vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_gig.log", "w"), stderr=subprocess.STDOUT, start_new_session=True); procs.append(vite)
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1200, "height": 900}); pg = ctx.new_page(); erros = []
            pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            # chave de teste e um "setDoc" observável
            pg.route("**/api/**", lambda r: r.continue_(headers={**r.request.headers, "x-gemini-api-key": "AQ.Ab8-chave-um-aaaaaaaa", "x-gemini-api-key-pool": json.dumps(["AQ.Ab8-chave-um-aaaaaaaa"])}))
            pg.route("**/api/ocr-paginas", lambda r: None)
            pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1500)
            pg.evaluate("window.gerente.carregar()")
            pg.evaluate("async () => { const r = await fetch('/api/native-key-info'); return r.status }")
            # A) cria o trabalho enviando o PDF
            arq = pg.evaluate_handle("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return new File([u], 'autos-gigante.pdf', {type:'application/pdf'}); }""", __import__("base64").b64encode(open(pdf, "rb").read()).decode())
            cfg = pg.evaluate("window.__cfg = {promptText:'Prompt de teste', promptTitle:'Sentença de teste', actType:'sentenca', unitId:'montes_claros', unitName:'Comarca de Teste / Vara Única', userUid:'u', userName:'T', userEmail:'t@t.com', processNumber:''}")
            t0 = time.time()
            pg.evaluate("(f) => { window.__idJob = null; window.gerente.iniciar([f], window.__cfg).then(id => window.__idJob = id); }", arq)
            ultimo = ""; pulou = False
            while time.time() - t0 < 900:
                jobs = pg.evaluate("window.gerente.lista().map(j => ({id:j.id,status:j.status,etapa:j.etapa,prog:j.progresso,lotes:j.lotes.length,nivel:j.nivelAtual,erro:j.erro||null}))")
                if jobs:
                    j = jobs[0]; linha = f"{j['status']} | {j['etapa'][:80]} | {j['prog']['feitas']}/{j['prog']['total']}"
                    if linha != ultimo: print(f"[{int(time.time()-t0)}s] {linha}"); ultimo = linha
                    if j["status"] in ("concluido", "erro"): break
                if not pulou and jobs and jobs[0]["status"] == "ocr" and time.time() - t0 > 8:
                    pg.evaluate("window.gerente.pularOcr(window.gerente.lista()[0].id)"); pulou = True; print("clicou em pular o OCR")
                time.sleep(2)
            job = pg.evaluate("JSON.parse(JSON.stringify(window.gerente.lista()[0]))")
            print("STATUS FINAL:", job["status"], job.get("erro"), "| páginas", job["totalPaginas"], "| lotes", len(job["lotes"]), "| níveis", job["nivelAtual"])
            print("triagem:", {k: v for k, v in job["triagem"].items() if k not in ("omitidas", "abreviadas")}, "| omitidas", job["triagem"]["omitidas"][:3], "| abreviadas", job["triagem"]["abreviadas"][:2])
            print("injeção:", job["injecao"]["total"], [a.get("pagina") for a in job["injecao"]["achados"]], "| sem texto:", job["arquivos"][0]["semTexto"])
            if job["status"] != "concluido": print("LOG:", [(x.get("p"), x["tok"], x["res"], x.get("chars")) for x in log_()][-14:])
            assert job["status"] == "concluido", job["erro"]
            assert job["totalPaginas"] >= n - 5 and len(job["lotes"]) >= 2
            assert job["triagem"]["repetidas"] >= 5 and job["triagem"]["dispensaveis"] >= 1
            assert job["injecao"]["total"] >= 1 and 120 in [a.get("pagina") for a in job["injecao"]["achados"]], "injeção da pág. 120 não foi agregada"
            assert pulou and job["arquivos"][0]["semTexto"] == [200, 201, 202, 203, 204]
            assert time.time() - t0 < 120, "pular o OCR deve ter efeito imediato"
            print("OK"); return
            # B) minuta final: tem de conter os 4 fatos plantados em páginas distantes (nada se perdeu nos lotes/fusões)
            hist = pg.evaluate("window.__setDocs || []"); print("gravações no histórico:", len(hist))
            L = log_(); fichas = [x for x in L if x.get("p") == "ficha"]; fus = [x for x in L if x.get("p") == "fusao"]; final = [x for x in L if x.get("p") not in ("ficha", "fusao", "classif")]
            print(f"chamadas: {len(fichas)} fichas, {len(fus)} fusões, {len(final)} finais | maior pedido: {max(x['tok'] for x in L)} tokens | 429: {len([x for x in L if x['res']==429])}")
            assert len(fichas) == len(job["lotes"]) and len(final) >= 1 and all(x["tok"] < 250000 for x in L if x["res"] == 200)
            ult = [x for x in final if x["res"] == 200][-1]; print("fatos que chegaram à minuta final:", ult.get("fatos"))
            assert {"FATO-101", "FATO-202", "FATO-303", "FATO-404"} <= set(ult.get("fatos", [])) and any(f.startswith("FATO-5") for f in ult.get("fatos", [])), "os fatos das páginas lidas por OCR também devem chegar à minuta"
            assert True, "um fato plantado em página distante se perdeu nos lotes/fusões"
            assert any(x.get("p") == "ocr" for x in L), "o OCR por IA das páginas sem texto deve ter sido chamado"
            assert not any(x.get("cob") for x in final), "com o OCR feito não há mais páginas sem leitura: a regra de lacuna não deve ir"
            fi = pg.evaluate("window.__setDocs.filter(d=>d.bytes>1000).length")
            doc = pg.evaluate("(window.__setDocs || []).filter(d => d.dados && d.dados.result && d.dados.result.gigante).slice(-1)[0]?.dados.result.gigante")
            ver = (doc or {}).get("verificacaoAusencia") or []; print("verificação de ausência:", json.dumps(ver, ensure_ascii=False)[:300])
            assert any(v["termo"] == "laudo pericial" and any(p["pagina"] == 300 for p in v["paginas"]) for v in ver), "a conferência deve achar o 'laudo pericial' da pág. 300 que a minuta diz não existir"
            r = pg.evaluate("window.gerente.pesquisar(window.gerente.lista()[0].id, 'laudo pericial')"); print("pesquisa no índice:", r["total"], [a["pagina"] for a in r["achados"]][:5])
            assert 300 in [a["pagina"] for a in r["achados"]]
            print("OK" if not erros else ("erros de página: " + str(erros[:3])))
            b.close()
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
main()
