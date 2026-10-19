"""Uso: python3 _extrai_pdf.py arquivo.pdf — roda a extração REAL do app (pdfExtractor) e mostra páginas sem texto/não lidas e quais marcadores de página existem."""
import glob, os, subprocess, sys, time, urllib.request, base64, json
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198
def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_ext.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(); pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1500)
        r = pg.evaluate("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const f = new File([u], 'x.pdf', {type:'application/pdf'}); const m = await import('/src/utils/pdfExtractor.ts'); const r = await m.extractTextFromPdf(f, () => {}, { fullSequential: true });
          const marcas = [...r.text.matchAll(/\\[Página (\\d+) de \\d+\\]/g)].map(x => Number(x[1]));
          return { paginas: r.pageCount, semTexto: r.paginasSemTexto, naoLidas: r.paginasNaoLidas, marcadores: marcas.length, faltamMarcador: Array.from({length: r.pageCount}, (_, i) => i + 1).filter(n => !marcas.includes(n)) }; }""", base64.b64encode(open(sys.argv[1], "rb").read()).decode())
        print(json.dumps(r, ensure_ascii=False)); b.close()
finally:
    os.killpg(vite.pid, 9)
