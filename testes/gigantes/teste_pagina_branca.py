"""Página em branco de verdade não vai para o OCR (nem gasta cota nem entra como lacuna); \n(antigo) """ + """Páginas que continuam a frase da anterior (o extrator junta o texto): nenhuma pode virar \"sem texto lido\" nem perder o marcador de página (bug do processo 5876960-63: 44 de 69 páginas apareciam como não lidas)."""
import glob, os, subprocess, sys, time, urllib.request
AQUI = os.path.dirname(os.path.abspath(__file__)); RAIZ = os.path.abspath(os.path.join(AQUI, "../.."))
from playwright.sync_api import sync_playwright
PV = 5198

def pdf_branca():
    """Página 1 em branco de verdade; página 2 com um retângulo preto grande (tem conteúdo, mesmo sem texto)."""
    objs = []
    def add(b): objs.append(b); return len(objs)
    add(b"<< /Type /Catalog /Pages 2 0 R >>")
    add(b"<< /Type /Pages /Kids [3 0 R 5 0 R] /Count 2 >>")
    add(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << >> >>")
    add(b"<< /Length 0 >>\nstream\n\nendstream")
    add(b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 6 0 R /Resources << >> >>")
    c = b"0 g 100 100 400 600 re f"
    add(b"<< /Length %d >>\nstream\n" % len(c) + c + b"\nendstream")
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

open("/tmp/claude-0/work/mob/branca.pdf", "wb").write(pdf_branca())
vite = subprocess.Popen(["npx", "vite", "--config", "testes/gigantes/vite.config.ts"], cwd=RAIZ, stdout=open("/tmp/claude-0/work/teste/vite_densa.log", "w"), stderr=subprocess.STDOUT, start_new_session=True)
try:
    esperar(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html")
    with sync_playwright() as p:
        b = p.chromium.launch(executable_path=glob.glob("/opt/pw-browsers/chromium-*/chrome-linux*/chrome")[0], args=["--no-sandbox"])
        pg = b.new_page(); pg.goto(f"http://127.0.0.1:{PV}/testes/gigantes/gig.html"); pg.wait_for_timeout(1500)
        r = pg.evaluate("""async (b64) => { const bin = atob(b64); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
          const f = new File([u], 'branca.pdf', {type:'application/pdf'}); const m = await import('/src/utils/ocrPaginas.ts');
          let enviadas = []; const original = window.fetch; window.fetch = async (url, init) => { if (String(url).includes('/api/ocr-paginas')) { const imgs = JSON.parse(init.body).images; enviadas = imgs.map(i => i.pagina); return new Response(JSON.stringify({ paginas: imgs.map(i => ({ pagina: i.pagina, texto: 'texto lido', emBranco: false })) }), { status: 200 }); } return original(url, init); };
          const r = await m.ocrPaginas(f, [1, 2]); return { enviadas, textos: Object.keys(r.textos), emBranco: r.emBranco, falhas: r.falhas }; }""", __import__("base64").b64encode(open("/tmp/claude-0/work/mob/branca.pdf", "rb").read()).decode())
        print("resultado:", r)
        assert r["emBranco"] == [1] and r["enviadas"] == [2] and r["textos"] == ["2"] and r["falhas"] == [], r
        print("OK"); b.close()
finally:
    os.killpg(vite.pid, 9)
