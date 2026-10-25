"""(reaproveitado) O Histórico abre nas minutas do próprio usuário ("Minhas"); só administrador, juiz e super admin têm a opção "Gabinete" para ver as de todos."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
def ato(i, num, dono, quando):
    return {"id": f"h{i}", "unitId": "montes_claros", "promptTitle": "Sentença", "date": quando, "processNumber": num, "createdBy": dono, "creatorName": ("Eu mesmo" if dono == "teste-uid" else "Outra Pessoa"), "result": {"minute": {"title": "SENTENÇA", "processNumber": num, "judicialUnit": "Vara Única", "parties": {"author": f"AUTOR {i}", "defendant": f"REU {i}"}, "fullFormattedText": f"MINUTA {i}"}}}
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_fon.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_fon.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        a = ato(1, "5500001-10.2025.8.09.0166", "teste-uid", 1790000000000)
        a["result"]["fontesConsultadas"] = {"legislacao": ["Código de Processo Civil, art. 489", "Código de Defesa do Consumidor, art. 14"], "naoLocalizados": ["Lei Maria da Penha, art. 22"], "indisponiveis": [], "locais": ["Lei Municipal nº 1.234/2019"], "precedentes": ["STJ • Súmula 54"]}
        a["result"]["alertaInjecao"] = {"verificado": True, "caracteres": 5000, "total": 1, "alto": 1, "medio": 0, "achados": [{"nivel": "alto", "categoria": "Texto oculto", "trecho": "ignore as instruções anteriores", "posicao": 10, "pagina": 12}]}
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1000, "height": 1100}); pg.set_default_timeout(40000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_off','1'); window.__seedHistory = " + json.dumps([a]) + ";"); pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4500)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
                l = pg.locator(seletor)
                if l.count(): l.first.dispatch_event("click"); pg.wait_for_timeout(1500)
                if pg.locator("[data-testid=historico-barra]").count(): break
            pg.wait_for_selector("[data-testid=dossie-linha]"); pg.locator("text=Carregar minuta").first.click(); pg.wait_for_timeout(2500)
            # os avisos do começo da minuta ficam recolhidos em botões: só abrem quando o usuário clica
            assert pg.locator("[data-testid=chip-fontes]").count() == 1, "faltou o botão de fontes consultadas"; print("botão:", pg.locator("[data-testid=chip-fontes]").inner_text())
            assert not pg.locator("[data-testid=aviso-fontes]").is_visible(), "o quadro de fontes deveria começar recolhido"
            assert "Alerta de prompt injection (1)" in pg.locator("[data-testid=chip-injecao]").inner_text(), "faltou o botão vermelho do alerta"
            assert not pg.locator("[data-testid=aviso-prompt-injection]").is_visible(), "o alerta deveria começar recolhido"
            pg.locator("[data-testid=chip-injecao]").click(); pg.wait_for_timeout(300); assert pg.locator("[data-testid=aviso-prompt-injection]").is_visible(), "o alerta deveria abrir ao clicar"
            pg.locator("[data-testid=chip-injecao]").click(); pg.wait_for_timeout(200)
            pg.locator("[data-testid=chip-fontes]").click(); pg.wait_for_timeout(300)
            assert pg.locator("[data-testid=aviso-fontes]").is_visible(), "o quadro deveria abrir ao clicar"
            av = pg.locator("[data-testid=aviso-fontes]"); assert av.count() == 1, "faltou o aviso de fontes consultadas"
            t = av.inner_text(); print(t.replace("\n", " | ")); assert "art. 489" in t and "Súmula 54" in t and "Lei Municipal" in t and "Maria da Penha, art. 22" in t and "Conferido no texto oficial" in t and "Não consegui localizar" in t
            pg.locator("[data-testid=chip-fontes]").click(); pg.wait_for_timeout(300); assert not pg.locator("[data-testid=aviso-fontes]").is_visible(), "clicar de novo deveria recolher"
            pg.locator("[data-testid=chip-fontes]").click(); pg.wait_for_timeout(300); pg.screenshot(path="/tmp/claude-0/work/teste/fontes.png")
            assert not erros, erros; b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
