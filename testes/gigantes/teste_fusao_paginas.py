"""Páginas que continuam a frase da anterior (o extrator junta o texto): nenhuma pode virar \"sem texto lido\" nem perder o marcador de página (bug do processo 5876960-63: 44 de 69 páginas apareciam como não lidas)."""
import glob, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198

def pdf_fusao(n=8):
    """n páginas de um bloco só, que continuam a frase da anterior (começam em minúscula e terminam sem ponto): o extrator junta o texto."""
    objs = []
    def add(b): objs.append(b); return len(objs)
    add(b"<< /Type /Catalog /Pages 2 0 R >>")
    kids = " ".join(f"{3 + 2 * k} 0 R" for k in range(n))
    add(f"<< /Type /Pages /Kids [{kids}] /Count {n} >>".encode())
    for k in range(n):
        pid = 3 + 2 * k
        add(f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents {pid + 1} 0 R /Resources << /Font << /F1 {3 + 2 * n} 0 R >> >> >>".encode())
        txt = ("BT /F1 12 Tf 72 700 Td (PETICAO INICIAL. Autor requer o pagamento das verbas e,) Tj ET" if k == 0 else f"BT /F1 12 Tf 72 700 Td (e prossegue o texto da pagina {k + 1} sem ponto final,) Tj ET").encode()
        add(b"<< /Length %d >>\nstream\n" % len(txt) + txt + b"\nendstream")
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

open("/tmp/claude-0/work/mob/fusao.pdf", "wb").write(pdf_fusao())
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_densa.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(); pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1500)
        r = pg.evaluate("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const f = new File([u], 'fusao.pdf', {type:'application/pdf'}); const m = await import('/src/utils/pdfExtractor.ts'); const r = await m.extractTextFromPdf(f, () => {}, { fullSequential: true });
          const marcas = [...r.text.matchAll(/\\[Página (\\d+) de \\d+\\]/g)].map(x => Number(x[1]));
          return { paginas: r.pageCount, semTexto: r.paginasSemTexto, marcas, texto8: r.text.includes('pagina 8') }; }""", __import__("base64").b64encode(open("/tmp/claude-0/work/mob/fusao.pdf", "rb").read()).decode())
        print("resultado:", r)
        assert r["paginas"] == 8 and r["semTexto"] == [], "página fundida não pode ser 'sem texto'"
        assert sorted(set(r["marcas"])) == list(range(1, 9)) and len(r["marcas"]) == 8, "cada página tem de ter o seu marcador, uma vez só"
        assert r["texto8"]
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
