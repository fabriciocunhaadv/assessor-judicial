"""Retenção do Histórico (7 dias): etiquetas e avisos de 3 e 1 dia, exclusão do que venceu, carência das minutas antigas (23/10/2026 para trás) e painel do super admin."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
from playwright.sync_api import sync_playwright
def esperar_http(url, n=120):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu: " + url)
DIA = 86400000
AGORA = 1794312000000            # 10/11/2026 12:00 UTC (depois do corte de 24/10/2026)
ATIVADA = 1793880000000          # 05/11/2026 12:00 UTC: dia em que a regra foi ligada
def ato(i, num, quando):
    return {"id": f"h{i}", "unitId": "montes_claros", "promptTitle": "Sentença", "date": quando, "processNumber": num, "createdBy": "teste-uid", "creatorName": "Teste", "processTextContext": "autos", "result": {"minute": {"title": "SENTENÇA", "processNumber": num, "judicialUnit": "Vara Única", "parties": {"author": f"AUTOR {i}", "defendant": f"REU {i}"}, "fullFormattedText": f"MINUTA {i}", "fundamentacao": "f", "dispositivo": "d"}}}
def main():
    os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); procs = []
    try:
        procs.append(subprocess.Popen([sys.executable, os.path.join(AQUI, "mock_gemini.py"), str(PM), "250000", "3000"], start_new_session=True))
        env = {**os.environ, "GOOGLE_GEMINI_BASE_URL": f"http://127.0.0.1:{PM}", "NODE_ENV": "production", "NO_PROXY": "127.0.0.1,localhost", "no_proxy": "127.0.0.1,localhost"}
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_ret.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_ret.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        seed = [ato(1, "5500001-10.2025.8.09.0166", AGORA - 8 * DIA),      # nova, 8 dias: VENCIDA
                ato(2, "5500002-10.2025.8.09.0166", AGORA - 5 * DIA),      # nova, faltam 2 dias: aviso de 3
                ato(3, "5500003-10.2025.8.09.0166", AGORA - int(6.5 * DIA)),   # nova, falta meio dia: aviso de 1
                ato(4, "5500004-10.2025.8.09.0166", AGORA - 1 * DIA),      # nova, faltam 6 dias: sem aviso
                ato(5, "5500005-10.2025.8.09.0166", 1792800000000)]        # antiga (20/10/2026): carência até 12/11, faltam 2 dias
        auditorias = [{"id": "a1", "date": AGORA - 8 * DIA, "processNumber": "1", "createdBy": "outro-uid"}, {"id": "a2", "date": AGORA - 1 * DIA, "processNumber": "2", "createdBy": "outro-uid"}]
        audiencias = [{"id": "hh1", "updatedAt": AGORA - 10 * DIA, "scheduledDate": "2026-11-01", "processNumber": "3"},      # alterada há 10 dias e a audiência foi em 01/11: vencida
                      {"id": "hh2", "updatedAt": AGORA - 10 * DIA, "scheduledDate": "2026-11-15", "processNumber": "4"}]      # alterada há 10 dias, mas a audiência é só em 15/11: NÃO vence antes de acontecer
        cfg = {"id": "retencao_historico", "dados": {"ativa": True, "dias": 7, "ativadaEm": ATIVADA, "corteAntigas": 1792810800000}}
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            pg = b.new_page(viewport={"width": 1400, "height": 1000}); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); window.__seedHistory = " + json.dumps(seed) + "; window.__setDocs = " + json.dumps([cfg]) + "; window.__seedAudits = " + json.dumps(auditorias) + "; window.__seedHearings = " + json.dumps(audiencias) + ";")
            import datetime; pg.clock.install(time=datetime.datetime.fromtimestamp(AGORA / 1000, tz=datetime.timezone.utc))      # a API do Python recebe data/segundos, não milissegundos
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(1500); pg.clock.run_for(5000); pg.wait_for_timeout(600)
            pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
            # 1) a limpeza (15 s depois de abrir) apaga SÓ o que venceu: h1. A antiga (h5) está em carência e fica.
            pg.clock.run_for(20000); pg.wait_for_timeout(1500)
            print("   cfg e fases:", pg.evaluate("async (d) => { const r = await import('/src/utils/retencaoRegras.ts'); const c = r.configRetencaoAtual(); return [c, d.map(x => r.situacaoValidade(x, c).fase), Date.now()]; }", [a["date"] for a in seed]))
            print("   gravações no índice:", pg.evaluate("globalThis.__idxWrites || []"), "| leituras:", [x for x in pg.evaluate("globalThis.__getDocsLog || []") if "history" in x][:14], "| erros:", erros)
            ids = pg.evaluate("[...globalThis.__idx.keys()].sort()"); print("índice depois da limpeza:", ids)
            assert "h1" not in ids and all(x in ids for x in ["h2", "h3", "h4", "h5"]), ids
            print("1) venceu = apagada (h1); em prazo e a antiga em carência = mantidas")
            # 1b) Lupa e Mesa (varredura do super admin): apaga a auditoria vencida e a audiência já passada; mantém a de data futura
            dele = pg.evaluate("globalThis.__deletados || []"); print("   apagados na varredura:", [x for x in dele if "/audits/" in x or "/hearings/" in x])
            assert any(x.endswith("/audits/a1") for x in dele) and not any(x.endswith("/audits/a2") for x in dele), dele
            assert any(x.endswith("/hearings/hh1") for x in dele) and not any(x.endswith("/hearings/hh2") for x in dele), dele
            print("1b) auditoria vencida e audiência passada apagadas; auditoria recente e audiência futura mantidas")
            # 2) aviso de 1 dia (há ato com menos de 24 h): foi mostrado e ficou marcado para não repetir no mesmo dia
            marcas = pg.evaluate("Object.keys(localStorage).filter(k => k.startsWith('retencao_aviso_'))"); print("   avisos marcados:", marcas)
            assert any(k.endswith("_1") for k in marcas), "faltou o aviso de 1 dia"; print("2) aviso de 1 dia mostrado (uma vez por dia)")
            # 3) Histórico: banner e etiquetas
            for seletor in ["[title=\"Histórico Local\"]", "text=Histórico Local"]:
                l = pg.locator(seletor)
                if l.count(): l.first.dispatch_event("click"); pg.clock.run_for(2000); pg.wait_for_timeout(1200)
                if pg.locator("[data-testid=historico-barra]").count(): break
            pg.wait_for_selector("[data-testid=dossie-linha]", timeout=15000)
            if os.environ.get('FOTO_RETENCAO'): pg.screenshot(path=os.environ['FOTO_RETENCAO'])
            assert pg.locator("[data-testid=aviso-retencao]").count() == 1; print("3) banner 'ficam por 7 dias' presente")
            fases = pg.evaluate("[...document.querySelectorAll('[data-testid=dossie-linha] [data-testid=etiqueta-validade]')].map(e => e.dataset.fase).sort()")
            print("   etiquetas por processo:", fases); assert fases == ["aviso1", "aviso3", "aviso3", "ok"], fases
            cores = pg.evaluate("Object.fromEntries([...document.querySelectorAll('[data-testid=dossie-linha] [data-testid=etiqueta-validade]')].map(e => [e.dataset.fase, e.className]))")
            assert "emerald" in cores["ok"] and "orange" in cores["aviso3"] and "rose" in cores["aviso1"], cores; print("   cores suaves: verde (em prazo), laranja (3 dias), vermelho (1 dia)")
            # 4) regra DESLIGADA (sem configuração): nada é apagado, nem etiqueta aparece
            pg2 = b.new_page(viewport={"width": 1400, "height": 1000}); pg2.set_default_timeout(60000)
            pg2.add_init_script("localStorage.setItem('assessor_tour_done','1'); window.__seedHistory = " + json.dumps(seed) + ";")
            pg2.clock.install(time=datetime.datetime.fromtimestamp(AGORA / 1000, tz=datetime.timezone.utc))
            pg2.goto(f"http://127.0.0.1:{PV}/"); pg2.wait_for_timeout(1500); pg2.clock.run_for(30000); pg2.wait_for_timeout(1500)
            ids2 = pg2.evaluate("[...globalThis.__idx.keys()].sort()"); print("4) regra desligada, índice:", ids2); assert ids2 == ["h1", "h2", "h3", "h4", "h5"], ids2
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
