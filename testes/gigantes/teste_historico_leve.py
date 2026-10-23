"""Histórico LEVE: a lista lê só o resumo de cada ato (índice), ao vivo; a minuta completa só é baixada ao abrir o ato; sem baixar tudo de tempos em tempos."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
PESADO = "AUTOS-DO-PROCESSO " * 20000      # ~360 KB de texto dos autos por ato
def ato(i, num, quando):
    return {"id": f"h{i}", "unitId": "montes_claros", "promptTitle": "Sentença", "date": quando, "processNumber": num, "createdBy": "teste-uid", "creatorName": "Teste", "processTextContext": PESADO,
            "chatMessages": [{"role": "user", "text": "oi"}], "result": {"minute": {"title": "SENTENÇA", "processNumber": num, "judicialUnit": "Vara Única", "parties": {"author": f"AUTOR {i} DA SILVA", "defendant": f"REU {i} LTDA"},
            "fullFormattedText": f"MINUTA-COMPLETA-{i} " + "texto da minuta. " * 400, "fundamentacao": "fundamentos " * 100, "dispositivo": "JULGO PROCEDENTE " * 40 + " FIM-DO-DISPOSITIVO-COMPLETO"}}}
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_leve.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_leve.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        seed = [ato(1, "5500001-10.2025.8.09.0166", 1790000000000), ato(2, "5500002-10.2025.8.09.0166", 1789000000000)]
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); window.__seedHistory = " + json.dumps(seed) + ";")
            pg.clock.install()
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(1500); pg.clock.run_for(5000); pg.wait_for_timeout(600)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            def log(): return pg.evaluate("globalThis.__getDocsLog || []")
            def completos(): return len([x for x in log() if not x.startswith("count:") and (x.endswith("/history") or x == "history")])      # contagens (count:) não baixam documentos
            def idx_json(): return pg.evaluate("JSON.stringify([...globalThis.__idx.values()])")
            # A) primeira vez: o índice é montado (UMA leitura completa) e fica leve
            print("   log:", log()[:12], "| idx:", pg.evaluate("globalThis.__idx.size"), "| erros:", erros)
            base = completos(); print("A) leituras completas ao montar o índice:", base); assert base >= 1
            leve = len(idx_json()); total = len(json.dumps(seed)); print(f"   resumo no índice: {leve} bytes (atos completos: {total} bytes)"); assert leve < 8000 and total > 600000, (leve, total)
            assert pg.evaluate("globalThis.__idx.size") == 2
            # B) 10 minutos parado: nada baixado de novo
            pg.clock.run_for(10 * 60 * 1000); pg.wait_for_timeout(500)
            assert completos() == base, f"o Histórico completo foi baixado de novo ({base} -> {completos()})"; print("B) 10 min parado: nenhuma leitura completa nova")
            # C) abre a janela do Histórico: mostra a lista a partir do resumo, sem baixar atos
            for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
                l = pg.locator(seletor)
                if l.count(): l.first.dispatch_event("click"); pg.clock.run_for(2000); pg.wait_for_timeout(1200)
                if pg.locator("[data-testid=historico-barra]").count(): break
            pg.wait_for_selector("[data-testid=dossie-linha]", timeout=15000)
            print("   últimas leituras:", [x for x in log() if "history" in x][-8:])
            print("   linhas:", pg.locator("[data-testid=dossie-linha]").count(), "| leituras completas:", completos(), "(base", base, ")")
            assert pg.locator("[data-testid=dossie-linha]").count() == 2 and completos() == base; print("C) janela aberta: 2 processos, sem leitura completa")
            pg.locator('[data-testid=historico-barra] button:has-text("Gabinete")').first.click(); pg.clock.run_for(500); pg.wait_for_timeout(400)      # o Histórico abre em "Minhas"; "Gabinete" mostra as de todos
            # D) outro usuário grava: o novo processo aparece na lista AO VIVO, sem ler a coleção
            pg.evaluate("""() => { globalThis.__idx.set('h9', { id: 'h9', unitId: 'montes_claros', promptTitle: 'Decisão', date: 1791000000000, processNumber: '5500009-10.2025.8.09.0166', createdBy: 'outro-uid', creatorName: 'Outro', leve: true, corrompido: false, numeroLimpo: '55000091020258090166', fonte: 'gabinetes/gabinete_default/history',
                result: { minute: { title: 'DECISÃO', processNumber: '5500009-10.2025.8.09.0166', judicialUnit: 'Vara Única', parties: { author: 'NOVO AUTOR', defendant: 'NOVO REU' } } } }); globalThis.__idxOuvintes.forEach(f => f()); }""")
            pg.clock.run_for(1500); pg.wait_for_timeout(800)
            assert "5500009" in pg.locator("body").inner_text(), "o ato gravado por outro usuário não apareceu na lista"
            assert completos() == base; print("D) ato de outro usuário apareceu ao vivo, sem leitura completa")
            # E) abrir um ato baixa a minuta completa só agora
            # (o ato novo do outro usuário não existe na "nuvem" do teste: abrir mostra o aviso e não quebra nada)
            pg.locator("[data-testid=dossie-linha]", has_text="5500009").first.click(); pg.clock.run_for(800); pg.wait_for_timeout(500)
            pg.locator("[data-testid=dossie-linha]", has_text="5500009").locator("button:has-text('Carregar minuta')").first.click(); pg.clock.run_for(2000); pg.wait_for_timeout(800)
            assert "Não consegui abrir esta minuta" in pg.locator("body").inner_text(), "deveria avisar que a minuta não abriu"; print("   ato inexistente: aviso mostrado, sem erro")
            linha = pg.locator("[data-testid=dossie-linha]", has_text="5500001"); linha.first.click(); pg.clock.run_for(800); pg.wait_for_timeout(500)
            linha.locator("button:has-text('Carregar minuta')").first.click(); pg.clock.run_for(3000); pg.wait_for_timeout(1500)
            corpo = pg.locator("body").inner_text(); print("   corpo tem minuta:", "MINUTA-COMPLETA-" in corpo, "| fim do dispositivo:", "FIM-DO-DISPOSITIVO-COMPLETO" in corpo, "| modal fechou:", pg.locator("[data-testid=historico-barra]").count() == 0)
            assert "MINUTA-COMPLETA-" in corpo or "FIM-DO-DISPOSITIVO-COMPLETO" in corpo, "a minuta completa não foi carregada ao abrir o ato"; print("E) ao abrir o ato, a minuta completa foi carregada")
            # F) índice com falta: a conferência de contagem refaz, mas só depois de 30 minutos da última refação (cada refação lê o Histórico inteiro)
            conferir = "async () => { const f = await import('/src/lib/firestoreUtils.ts'); f.invalidarIndiceHistorico(); const m = await import('/src/utils/historyDb.ts'); await m.getHistory('teste'); }"
            pg.evaluate("globalThis.__idx.delete('h2'); globalThis.__idx.delete('h9')"); pg.clock.run_for(11 * 60 * 1000)
            pg.evaluate(conferir); pg.wait_for_timeout(800)
            assert not pg.evaluate("globalThis.__idx.has('h2')"), "refez cedo demais (menos de 30 min da última refação)"; print("F) índice com falta, mas refeito há menos de 30 min: aguarda (não lê tudo de novo)")
            pg.clock.run_for(25 * 60 * 1000); pg.evaluate(conferir); pg.wait_for_timeout(800)
            assert pg.evaluate("globalThis.__idx.has('h2')"), "o índice não foi refeito"; print("   passados 30 min: índice refeito pela conferência de contagem")
            assert not erros, erros
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
