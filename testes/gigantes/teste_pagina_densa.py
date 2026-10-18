"""Página com dezenas de milhares de fragmentos de texto (camada de OCR / tabela gigante): a extração não pode travar e tem de seguir para as outras páginas."""
import glob, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198

def pdf_denso(n_frag=40000):
    cont = ["BT /F1 3 Tf ET"]
    for i in range(n_frag):
        x, y = 20 + (i % 25) * 22, 800 - (i // 25) % 760 * 1.0
        cont.append(f"BT /F1 3 Tf {x} {y:.1f} Td (p{i}) Tj ET")
    pagina_densa = "\n".join(cont).encode("latin-1")
    normal = b"BT /F1 12 Tf 72 700 Td (Movimentacao 3 : Peticao Arquivo 1: a.pdf - Pag.1/1) Tj 0 -20 Td (Texto normal da pagina seguinte com conteudo suficiente para ser lido.) Tj ET"
    objs = []
    def add(b): objs.append(b); return len(objs)
    add(b"<< /Type /Catalog /Pages 2 0 R >>")
    add(b"<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>")
    add(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 7 0 R >> >> >>")
    add(b"<< /Length %d >>\nstream\n" % len(pagina_densa) + pagina_densa + b"\nendstream")
    add(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << /Font << /F1 7 0 R >> >> >>")
    add(b"<< /Length %d >>\nstream\n" % len(normal) + normal + b"\nendstream")
    add(b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    out = b"%PDF-1.4\n"; offs = []
    for i, o in enumerate(objs, 1):
        offs.append(len(out)); out += b"%d 0 obj\n" % i + o + b"\nendobj\n"
    x = len(out); out += b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs) + 1)
    for o in offs: out += b"%010d 00000 n \n" % o
    out += b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF" % (len(objs) + 1, x)
    return out

def esperar(url, n=90):
    for _ in range(n):
        try: urllib.request.urlopen(url, timeout=2); return
        except Exception: time.sleep(1)
    raise SystemExit("não subiu")

open("/tmp/claude-0/work/mob/pagina_densa.pdf", "wb").write(pdf_denso())
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_densa.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(); pg.add_init_script("Object.defineProperty(document, 'visibilityState', { get: () => 'hidden' })"); pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1500)
        t0 = time.time()
        r = pg.evaluate("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const f = new File([u], 'densa.pdf', {type:'application/pdf'}); const m = await import('/src/utils/pdfExtractor.ts'); const r = await m.extractTextFromPdf(f, () => {}, { fullSequential: true });
          return { paginas: r.pageCount, semTexto: r.paginasSemTexto, naoLidas: r.paginasNaoLidas, tem2: r.text.includes('Texto normal da pagina seguinte'), tem1: r.text.length > 50000 && r.text.includes('[Página 1 de 2]') }; }""", __import__("base64").b64encode(open("/tmp/claude-0/work/mob/pagina_densa.pdf", "rb").read()).decode())
        dt = time.time() - t0; print("resultado:", r, f"| {dt:.1f} s")
        assert r["paginas"] == 2 and r["tem2"] and r["tem1"] and dt < 60
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
