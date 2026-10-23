"""O Histórico NÃO é mais baixado de tempos em tempos (antes: a cada 60 s por aba e a cada 8 s com a janela aberta, dezenas de MB por carga).
Recarrega só quando algo muda: ao abrir, ato gravado/excluído (evento) e ao voltar à aba depois de mais de 15 minutos parada."""
import glob, json, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
PM, PS, PV = 8897, 3000, 5198
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
        procs.append(subprocess.Popen(["npx", "tsx", "server.ts"], cwd=RAIZ, env=env, stdout=open("/tmp/claude-0/work/teste/server_semauto.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        procs.append(subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_semauto.log", "w"), stderr=subprocess.STDOUT, start_new_session=True))
        esperar_http(f"http://127.0.0.1:{PS}/api/native-key-info"); esperar_http(f"http://127.0.0.1:{PV}/")
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
            ctx = b.new_context(viewport={"width": 1400, "height": 1000})
            pg = ctx.new_page(); pg.set_default_timeout(60000); erros = []; pg.on("pageerror", lambda e: erros.append(str(e)[:200]))
            pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); globalThis.__seedHistory = [{ id: 'analysis-1', unitId: 'montes_claros', promptTitle: 'Sentença', date: 1788000000000, processNumber: '5530114-61.2025.8.09.0166', createdBy: 'u', creatorName: 'U', result: { minute: { fullFormattedText: 'x' } } }];")
            pg.clock.install()
            pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(1500); pg.clock.run_for(4000); pg.wait_for_timeout(500)
            def leituras(): return len([x for x in pg.evaluate("globalThis.__getDocsLog || []") if x.endswith("/history") or x == "history"])
            base = leituras(); print("leituras do Histórico ao abrir:", base); assert base >= 1, "o Histórico deveria carregar ao abrir"
            # 1) 10 minutos de relógio, sem nenhuma ação: nenhuma leitura nova (antes eram 10)
            pg.clock.run_for(10 * 60 * 1000); pg.wait_for_timeout(500)
            apos10 = leituras(); print("após 10 min parado:", apos10); assert apos10 == base, f"o Histórico foi baixado sozinho ({base} -> {apos10})"
            # 2) um ato gravado (evento do sistema) recarrega UMA vez
            pg.evaluate("window.dispatchEvent(new Event('assessor-historico-mudou'))"); pg.clock.run_for(2500); pg.wait_for_timeout(500)
            evento = leituras(); print("após um ato gravado:", evento); assert evento > apos10, "o evento deveria recarregar o Histórico"
            # 3) voltar à aba depois de mais de 15 min parada recarrega uma vez
            pg.clock.run_for(16 * 60 * 1000); pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(800)
            foco = leituras(); print("ao voltar depois de 16 min:", foco); assert foco > evento, "voltar à aba depois de muito tempo deveria recarregar"
            # 4) voltar à aba logo em seguida NÃO recarrega de novo
            pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); pg.wait_for_timeout(800)
            assert leituras() == foco, "voltar à aba de novo, logo depois, não deveria recarregar"
            assert not erros, erros
            b.close()
        print("OK")
    finally:
        for pr in procs:
            try: os.killpg(pr.pid, 9)
            except Exception: pass
if __name__ == "__main__": main()
