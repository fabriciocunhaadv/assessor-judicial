"""Histórico: cada usuário só exclui a PRÓPRIA minuta (botões escondidos nas dos outros; dossiê misto exclui só as suas; a camada de dados também recusa)."""
import glob, json, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
def item(i, dono, num=None, data=None):
    num = num or f"55{i:05d}-10.2025.8.09.0166"
    return {"id": f"h{i}", "processNumber": num, "promptTitle": "Outros Área Judicial - Cível", "date": data or 1790000000000 - i * 3600000, "unitId": "montes_claros", **({"createdBy": dono} if dono else {}), "creatorName": "Alguém", "creatorEmail": "a@x.com",
            "result": {"minute": {"title": "DECISÃO", "processNumber": num, "parties": {"author": f"AUTOR {i} DA SILVA", "defendant": "ESTADO DE GOIÁS"}, "judicialUnit": "Montes Claros / Vara Única", "relatorio": "x", "fundamentacao": "y", "dispositivo": "z"}}, "originalMinute": {"title": "DECISÃO", "processNumber": num}}
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_dono.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    MEU = "teste-uid"
    seed = [item(1, MEU), item(2, "outro-uid"), item(3, None), item(4, MEU, "5500004-10.2025.8.09.0166", 1790000000000), item(5, "outro-uid", "5500004-10.2025.8.09.0166", 1789000000000)]
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(viewport={"width": 1280, "height": 900}); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); window.__seedHistory = " + json.dumps(seed) + ";")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000)
        pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
            l = pg.locator(seletor)
            if l.count():
                l.first.dispatch_event("click"); pg.wait_for_timeout(1500)
                if pg.locator("[data-testid=historico-barra]").count(): break
        pg.locator('[data-testid=historico-barra] button:has-text("Gabinete")').first.click(); pg.wait_for_timeout(500)      # o Histórico abre em "Minhas"; o super admin vê todas clicando em "Gabinete"
        pg.wait_for_selector("[data-testid=dossie-linha]", timeout=15000)
        def botoes():
            linhas = pg.locator("[data-testid=dossie-linha]"); res = {}
            for i in range(linhas.count()):
                t = linhas.nth(i).inner_text(); num = [x for x in ["5500001", "5500002", "5500003", "5500004"] if x in t]
                res[num[0] if num else f"?{i}"] = linhas.nth(i).locator("button[title*='Excluir dossiê']").count()
            return res
        def abrir_historico():
            for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
                l = pg.locator(seletor)
                if l.count():
                    l.first.dispatch_event("click"); pg.wait_for_timeout(1500)
                    if pg.locator("[data-testid=historico-barra]").count(): break
            pg.wait_for_selector("[data-testid=dossie-linha]", timeout=15000)
            pg.locator('[data-testid=historico-barra] button:has-text("Gabinete")').first.click(); pg.wait_for_timeout(500)
        # A) super admin (o usuário do teste é o super admin): o botão de excluir aparece em TODAS as minutas
        res = botoes(); print("super admin, botão por processo:", res); assert all(v == 1 for v in res.values()) and len(res) == 4, res
        # B) usuário comum: só nas próprias (e nas sem dono)
        pg.evaluate("async () => { const f = await import('/src/lib/firestoreUtils.ts'); f.definirSuperAdminHistorico(false); }")
        pg.locator("button[title='Fechar']").first.click(); pg.wait_for_timeout(600); abrir_historico()
        res = botoes(); print("usuário comum, botão por processo:", res)
        assert res.get("5500001") == 1 and res.get("5500002") == 0 and res.get("5500003") == 1 and res.get("5500004") == 1, res
        r = pg.evaluate("""async () => { const m = await import('/src/utils/historyDb.ts'); const out = {};
          try { await m.deleteFromHistory('h2'); out.outro = 'excluiu'; } catch (e) { out.outro = e.message; }
          try { await m.deleteFromHistory('h1'); out.meu = 'ok'; } catch (e) { out.meu = e.message; }
          return out; }""")
        print("camada de dados:", r); assert "Só quem gerou" in r["outro"] and r["meu"] == "ok", r
        # super admin: exclui qualquer minuta e os botões aparecem
        r2 = pg.evaluate("""async () => { const f = await import('/src/lib/firestoreUtils.ts'); const m = await import('/src/utils/historyDb.ts'); f.definirSuperAdminHistorico(true);
          const out = {}; try { await m.deleteFromHistory('h5'); out.super = 'ok'; } catch (e) { out.super = e.message; } f.definirSuperAdminHistorico(false); return out; }""")
        print("super admin:", r2); assert r2["super"] == "ok", r2
        assert not erros, erros
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
