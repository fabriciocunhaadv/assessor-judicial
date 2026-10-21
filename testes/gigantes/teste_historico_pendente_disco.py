"""Histórico: se a gravação na nuvem falha e a aba recarrega, o ato fica guardado no disco do navegador e é reenviado ao abrir o sistema."""
import glob, os, subprocess, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
os.makedirs("/tmp/claude-0/work/teste", exist_ok=True); os.makedirs("/tmp/claude-0/work/mob", exist_ok=True)
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_janela.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_context(viewport={"width": int(os.environ.get("LARG", 1500)), "height": int(os.environ.get("ALT", 900))}).new_page(); pg.set_default_timeout(30000)
        pg.add_init_script("localStorage.setItem('assessor_tour_done','1'); if (sessionStorage.getItem('falhar') === '1') globalThis.__falharSetDoc = true;")
        pg.goto(f"http://127.0.0.1:{PV}/"); pg.wait_for_timeout(4000); pg.add_style_tag(content="#react-joyride-portal{display:none!important}")
        ref = pg.evaluate("() => { const r = document.querySelector('main').getBoundingClientRect(); return { cab: document.querySelector('header').getBoundingClientRect().bottom, lat: document.getElementById('sidebar-principal').getBoundingClientRect().right, mainL: r.left, mainW: r.width }; }"); print("referências:", ref)
        pg.evaluate("sessionStorage.setItem('falhar','1')"); pg.reload(); pg.wait_for_timeout(3500)
        r = pg.evaluate("""async () => {
          const m = await import('/src/utils/historyDb.ts');
          const ato = { id: 'analysis-teste-1', unitId: 'montes_claros', promptTitle: 'P', promptId: 'p', date: Date.now(), processNumber: '5225415-66.2026.8.09.0166', result: { minute: { title: 'SENTENÇA', processNumber: '5225415-66.2026.8.09.0166', body: 'x'.repeat(500) } }, createdBy: 'u', creatorName: 'U', creatorEmail: 'u@x.y', chatMessages: [] };
          const r = await m.saveToHistory(ato);
          return { r, gravados: (globalThis.__setDocs || []).length };
        }""")
        print("1) com a nuvem falhando:", r); assert r["r"]["ok"] is False and r["gravados"] == 0, r
        pend = lambda: pg.evaluate("""() => new Promise((ok) => { const q = indexedDB.open('assessor_historico_pendente', 1); q.onsuccess = () => { const t = q.result.transaction('atos').objectStore('atos').getAll(); t.onsuccess = () => ok(t.result.map(x => x.id)); }; q.onerror = () => ok(null); })""")
        p1 = pend(); print("2) pendentes no disco:", p1); assert p1 == ["analysis-teste-1"], p1
        pg.evaluate("sessionStorage.setItem('falhar','0')"); pg.reload(); pg.wait_for_timeout(5000)
        gr = pg.evaluate("(globalThis.__setDocs || []).map(d => d.id)"); print("3) após reabrir (nuvem ok), gravados:", gr)
        assert "analysis-teste-1" in gr, gr
        p2 = pend(); print("4) pendentes depois:", p2); assert p2 == [], p2
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
