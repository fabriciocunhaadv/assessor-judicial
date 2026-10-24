# Simula o Google: limite de entrada gratuito de 250 mil tokens por MINUTO e POR MODELO (janela deslizante), como no erro real.
import json, re, sys, time, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
LIM = int(sys.argv[2]) if len(sys.argv) > 2 else 250000
JAN = {}          # (modelo) -> [(t, tokens)]
LOG = []
lock = threading.Lock()
FICHA = {'modo': '', 'n': 0}      # /__ficha?modo=cortada|vazia|primeira_vazia: simula a IA devolvendo a ficha cortada, vazia, ou vazia só na 1ª tentativa
FORA = {'on': False, 'lite': False}      # /__503?on=1: o Google responde 503 (alta demanda) a tudo
def tokens(body): return int(len(body) / 3.5)
class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path == '/__reset':
            JAN.clear(); LOG.clear(); self.send_response(200); self.end_headers(); return
        if self.path.startswith("/__lite"):
            FORA['lite'] = 'on=1' in self.path; self.send_response(200); self.end_headers(); return
        if self.path.startswith("/__503"):
            FORA['on'] = 'on=1' in self.path; self.send_response(200); self.end_headers(); return
        if self.path.startswith("/__ficha"):
            FICHA['modo'] = (re.search(r"modo=(\w+)", self.path) or [None, ''])[1] if 'modo=' in self.path else ''; FICHA['n'] = 0; self.send_response(200); self.end_headers(); return
        if self.path == "/__log":
            self.send_response(200); self.end_headers(); self.wfile.write(json.dumps(LOG).encode()); return
        self.send_response(404); self.end_headers()
    def do_POST(self):
        raw = self.rfile.read(int(self.headers["Content-Length"])).decode()
        m = re.search(r"models/([^:/]+):generateContent", self.path)
        modelo = m.group(1) if m else "?"
        n = tokens(raw)
        if FORA['on'] or (FORA['lite'] and 'lite' not in modelo):
            LOG.append({"t": time.time(), "modelo": modelo, "tok": n, "res": 503})
            b = json.dumps({"error": {"code": 503, "message": "This model is currently experiencing high demand. Spikes in demand are usually temporary.", "status": "UNAVAILABLE"}}).encode()
            self.send_response(503); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        j = json.loads(raw)
        sist = json.dumps(j.get("systemInstruction") or j.get("config", {}).get("systemInstruction") or "", ensure_ascii=False)
        eh_parte = "DOSSIÊ FÁTICO-PROBATÓRIO DESTA PARTE" in sist
        with lock:
            now = time.time()
            a = [x for x in JAN.get(modelo, []) if now - x[0] < 60]
            usado = sum(x[1] for x in a)
            if n > LIM or usado + n > LIM:
                LOG.append({"t": time.time(), "modelo": modelo, "tok": n, "res": 429, "parte": eh_parte})
                JAN[modelo] = a
                corpo = {"error": {"code": 429, "message": f"You exceeded your current quota, please check your plan and billing details. * Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_input_token_count, limit: {LIM}, model: {modelo}\nPlease retry in 40s.", "status": "RESOURCE_EXHAUSTED"}}
                b = json.dumps(corpo).encode()
                self.send_response(429); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
            a.append((now, n)); JAN[modelo] = a
            LOG.append({"t": time.time(), "modelo": modelo, "tok": n, "res": 200, "parte": eh_parte, "perfil": (re.search(r"\[PERFIL DA MATÉRIA: ([^\]]+)\]", sist).group(1) if re.search(r"\[PERFIL DA MATÉRIA: ([^\]]+)\]", sist) else ""), "sucinto": "RELATÓRIO SUCINTO" in sist, "cart": "DISPOSITIVO OPERACIONAL PARA A ESCRIVANIA" in sist, "anexo": "documento anexado pelo gabinete" in sist, "leg": "LEGISLAÇÃO OFICIAL CONSULTADA NO PLANALTO" in sist, "legtxt": "elementos essenciais da sentença" in sist, "cob": "COBERTURA DA LEITURA" in sist, "dossie": "AUTOS EM DOSSIÊ" in sist, "dossieTxt": "DOSSIÊ DO PROCESSO" in raw, "inj": ("POSSÍVEL PROMPT INJECTION" in sist) or ("ALERTA DE SEGURANÇA — POSSÍVEL PROMPT" in raw)})
        if "LENTO-TESTE" in raw: time.sleep(6)
        txt = ""
        for c in j.get("contents", []):
            for p in c.get("parts", []): txt += p.get("text", "")
        fatos = sorted(set(re.findall(r"FATO-\d{3}", txt)))
        LOG[-1]["fatos"] = fatos
        if "FATO-803" in txt and "CLASSIFICADOR DE RELEVÂNCIA" not in sist:
            k = txt.find("FATO-803"); open("/tmp/claude-0/work/teste/ctx803.txt", "a").write(f"--- {len(txt)} ---\n" + txt[max(0, k-600):k+200] + "\n")
        if "Você é o monitor de erros do sistema" in txt:
            LOG[-1]["p"] = "monitor"
            dg = {"resumo": "O Google respondeu 503 em alta demanda.", "causa_provavel": "Pico de demanda no cluster do Gemini; passageiro.", "gravidade": "media", "origem_provavel": "google_ia", "acao_para_usuario": "Tentar de novo em alguns minutos ou usar o segundo plano.", "sugestoes": [{"tipo": "configuracao", "titulo": "Aumentar a espera entre ciclos", "descricao": "Subir o intervalo de resfriamento do modelo.", "onde": "fila de modelos do servidor", "risco": "baixo", "esforco": "pequeno"}], "precisa_desenvolvedor": False, "confianca": "media"}
            b = json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps(dg, ensure_ascii=False)}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10, "totalTokenCount": 20}}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        def _resp(obj):
            b = json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps(obj, ensure_ascii=False)}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10, "totalTokenCount": 20}, "modelVersion": modelo}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
        if "devolve a FICHA DOS AUTOS" in sist or "FICHA DOS AUTOS, um mapa" in sist:
            LOG[-1]["p"] = "lupa_ficha"
            return _resp({"numeroProcesso": "", "partes": [{"nome": "Fulano", "papel": "autor", "loc": "Mov. 1, Arq. 1, Pág. 1"}], "pedidos": [], "decisoes": [], "atosSubsequentes": [], "solicitacoesAoJuizo": [{"origem": "Juízo de Custódia", "pedido": "esclarecer prazo", "respondido": False, "loc": "Mov. 5, Arq. 1, Pág. 1"}], "datas": [], "valores": [], "pendenciasFormais": [], "estadoAtual": "concluso"})
        if "juiz de direito auditor rigoroso" in sist:
            LOG[-1]["p"] = "lupa_audit"
            dm = re.search(r"MINUTA SUBMETIDA PELO ASSESSOR PARA AUDITORIA:\n(.*?)\n\n----------------------------------------", txt, re.S)
            am = re.search(r"AUTOS DO PROCESSO:\n(.*?)\n----------------------------------------\nMINUTA SUBMETIDA", txt, re.S)
            draft = (dm.group(1) if dm else ""); autos_t = (am.group(1) if am else "")
            mt = draft.strip()[:70]; at = autos_t.strip()[:70]
            alertas = [
                {"severity": "bloqueante", "pillar": "adstricao", "title": "Pedido não apreciado", "description": "A minuta omite o pedido.", "suggestedFix": "Apreciar o pedido.", "location": "Dispositivo", "tipoProva": "contradicao", "minutaTrecho": mt, "autosTrecho": at},
                {"severity": "atencao", "pillar": "provas", "title": "Apontamento inventado (sem prova)", "description": "Citação que não existe.", "suggestedFix": "—", "location": "Relatório", "tipoProva": "contradicao", "minutaTrecho": "frase que a minuta jamais escreveu sobre um fato inexistente nos autos", "autosTrecho": "trecho que os autos jamais trouxeram sobre outra coisa qualquer"},
            ]
            return _resp({"score": 99, "verdict": "Aprovada sem Ressalvas", "summary": "Resumo da auditoria simulada.", "criticalAlerts": alertas, "assessorFeedbackMessage": "", "suggestedCorrectionSnippet": "", "systemGeneratedMinute": ""})
        if "leitor de documentos judiciais (OCR)" in txt:
            nums = [int(x) for x in re.findall(r"PÁGINA (\d+):", txt)]
            paginas = [{"pagina": nn, "texto": f"CONTESTAÇÃO lida por OCR. FATO-{500 + nn % 100} registrado na página {nn}. O réu junta o comprovante.", "emBranco": False} for nn in nums]
            LOG[-1]["p"] = "ocr"; LOG[-1]["paginasOcr"] = nums
            b = json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps({"paginas": paginas}, ensure_ascii=False)}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10, "totalTokenCount": 20}}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        if "devolve uma FICHA ESTRUTURADA" in sist or "FUNDI-LAS em uma única ficha" in sist:
            fusao = "FUNDI-LAS" in sist
            filler_cfg = int(sys.argv[3]) if len(sys.argv) > 3 else 1000
            itens = {"cronologia": [], "partes": [], "pedidos": [], "provas": [], "decisoes": [], "lacunas": []}
            if fusao:
                tam = 0
                for blocoficha in re.findall(r"FICHA \d+[^\n]*:\n(\{.*\})", txt):
                    try: f = json.loads(blocoficha)
                    except Exception: continue
                    for k in itens:
                        for x in f.get(k, []):
                            if str(x).startswith("Parte preenchimento"): continue
                            if x not in itens[k]: itens[k].append(x)
                    tam += len(blocoficha)
                filler = int(tam * 0.45)
            else:
                for fid in sorted(set(re.findall(r"FATO-\d{3}", txt))):
                    pg = re.search(r"\[Página (\d+) de \d+\]\n[^\n]*?" + fid, txt) or re.search(r"\[Arquivo [^\n]*\n\[Página (\d+) de \d+\]\n(?:(?!\[Arquivo)[\s\S])*?" + fid, txt)
                    itens["cronologia"].append(f"{fid} registrado nos autos (Arq. 1, Pág. {pg.group(1) if pg else '?'})")
                for tp in ("PETIÇÃO INICIAL", "CONTESTAÇÃO", "SENTENÇA", "LAUDO"):
                    if tp in txt: itens["provas"].append(f"{tp.title()} presente neste trecho")
                filler = filler_cfg
                paginas = re.findall(r"\[Página (\d+) de", txt)
                itens["decisoes"].append(f"Trecho com {len(paginas)} páginas lidas (de {paginas[0] if paginas else '?'} a {paginas[-1] if paginas else '?'})")
            if filler > 0: itens["partes"].append("Parte preenchimento " + "x" * filler)
            LOG[-1]["p"] = "fusao" if fusao else "ficha"; LOG[-1]["chars"] = len(txt)
            saida = json.dumps(itens, ensure_ascii=False)
            if not fusao and FICHA['modo']:
                FICHA['n'] += 1
                if FICHA['modo'] == 'cortada': saida = saida[: int(len(saida) * 0.8)]
                elif FICHA['modo'] == 'vazia' or (FICHA['modo'] == 'primeira_vazia' and FICHA['n'] == 1): saida = ""
            b = json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": saida}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": n, "candidatesTokenCount": 50, "totalTokenCount": n + 50}, "modelVersion": modelo}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        if "CLASSIFICADOR DE RELEVÂNCIA" in sist:
            segs = []
            for pg in re.split(r"(?=\[Página \d+ de \d+\])", txt):
                m = re.match(r"\[Página (\d+) de", pg)
                if not m: continue
                n = int(m.group(1)); tipo = re.search(r"Movimentacao \d+ - ([^\n]+)", pg); tipo = tipo.group(1) if tipo else ""
                c = "dispensavel" if re.search(r"Identificação|Residência|Procuração", tipo) else ("relevante" if "Extrato" in tipo else "essencial")
                if segs and segs[-1]["classe"] == c and segs[-1]["ate"] == n - 1: segs[-1]["ate"] = n
                else: segs.append({"de": n, "ate": n, "classe": c, "motivo": "documento sem relevância" if c == "dispensavel" else c})
            b = json.dumps({"segmentos": segs}).encode()
            LOG[-1]["p"] = "classif"; LOG[-1]["chars"] = len(txt)
            resp = {"candidates": [{"content": {"role": "model", "parts": [{"text": b.decode()}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": n_tok if False else 1, "candidatesTokenCount": 10, "totalTokenCount": 11}, "modelVersion": modelo}
            bb = json.dumps(resp).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(bb))); self.end_headers(); self.wfile.write(bb); return
        if "Você edita a ATA PRELIMINAR" in txt:
            ids = [(int(a), t) for a, t in re.findall(r"^\[(\d+)\] <(\w+)", txt, re.M)]
            ult_p = [a for a, t in ids if t == "p"][-1]; primeiro_li = [a for a, t in ids if t == "li"]
            ops = [{"op": "insert_after", "id": ult_p, "tipo": "p", "classe": "sub", "texto": "Acréscimo do copiloto"}, {"op": "replace", "id": ult_p, "texto": "Texto substituído <script>x</script>"}, {"op": "replace", "id": 99999, "texto": "id inexistente"}]
            LOG[-1]["p"] = "ata-edit"; LOG[-1]["autos"] = "TRECHOS DOS AUTOS (relevantes" in txt
            b = json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps({"operacoes": ops, "resumo": "Acrescentei uma seção."})}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10, "totalTokenCount": 20}}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        if "ATA PRELIMINAR" in txt and "ESTRITAMENTE em JSON" in txt:
            ata = {"cabecalho": {"numeroProcesso": "5000001-11.2026.8.09.0166", "classe": "Procedimento Comum", "assunto": "Dano material"}, "partes": [{"polo": "ativo", "nome": "MARIA TESTE DA SILVA", "advogados": [{"nome": "Dr. Fulano", "oab": "GO 1"}], "localizacao": "Mov. 2, Arq. 1, Pág. 1"}],
                   "resumo": "Ação de cobrança.", "testemunhas": [{"nome": "JOSE INVENTADO PEREIRA", "indicadaPor": "autor", "localizacao": "Mov. 2, Arq. 1, Pág. 3", "situacaoIntimacao": "intimada", "localizacaoIntimacao": "Mov. 999, Arq. 1, Pág. 1"}, {"nome": "Ana Souza", "indicadaPor": "reu", "localizacao": "Mov. 3, Arq. 1, Pág. 2", "situacaoIntimacao": "aguardando"}],
                   "citacoesIntimacoes": [{"destinatario": "REU TESTE", "papel": "reu", "ato": "citacao", "resultado": "positiva", "data": "01/02/2026", "localizacao": "Mov. 3, Arq. 1, Pág. 2"}], "pedidosAudiencia": [], "pontosAtencao": [{"nivel": "alto", "texto": "Testemunha sem intimação", "localizacao": "Mov. 3"}], "pontosControvertidos": ["Valor devido"], "faltaProvar": "Pagamento"}
            LOG[-1]["p"] = "ata"
            b = json.dumps({"candidates": [{"content": {"role": "model", "parts": [{"text": json.dumps(ata)}]}, "finishReason": "STOP", "index": 0}], "usageMetadata": {"promptTokenCount": 10, "candidatesTokenCount": 10, "totalTokenCount": 20}}).encode()
            self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b); return
        mp = re.search(r"PARTE (\d+) DE (\d+) DOS AUTOS", txt)
        LOG[-1]["p"] = (mp.group(1) + "/" + mp.group(2)) if mp else ""
        LOG[-1]["chars"] = len(txt)
        if eh_parte:
            texto = "DOSSIÊ DA PARTE. Fatos registrados: " + ", ".join(fatos) + ". " + ("Movimento relevante com transcrição literal \"...\" (Mov. 1, Arq. 1, Pág. 1). " * 12)
        else:
            par = "\n\n".join([f"Parágrafo {i} da fundamentação, com análise do confronto probatório e citação (Mov. {i}, Arq. 1, Pág. {i}). " + "Texto de análise. " * 40 for i in range(1, 12)])
            mnum = re.search(r"\d{7}-\d{2}\.\d{4}\.8\.09\.\d{4}", txt)
            texto = json.dumps({"processNumber": mnum.group(0) if mnum else "5530114-61.2025.8.09.0166", "author": "AUTOR TESTE", "defendant": "RÉU TESTE", "judicialUnit": "Vara Teste", "pendingMatter": "Sentença",
                "caseFactsSummary": "Resumo fático da lide extraído pela IA de teste. " * 6, "plaintiffClaims": "Fatos e provas do autor (teste).", "defendantClaims": "Contraprovas do réu (teste).", "counterClaim": "Não há pedido contraposto.", "actType": "SENTENÇA", "relatorio": "Relatório com os fatos: " + ", ".join(fatos) + ". " + "Narrativa do processo. " * 120 + " O autor não juntou laudo pericial aos autos. ",
                "fundamentacao": par, "dispositivo": "Dispositivo operacional completo. " * 20})
        import os
        if os.environ.get("MOCK_ARRAY") and not eh_parte: texto = "[ " + texto + " ]"
        resp = {"candidates": [{"content": {"role": "model", "parts": [{"text": texto}]}, "finishReason": "STOP", "index": 0}],
                "usageMetadata": {"promptTokenCount": n, "candidatesTokenCount": 3000, "totalTokenCount": n + 3000}, "modelVersion": modelo}
        b = json.dumps(resp).encode()
        self.send_response(200); self.send_header("Content-Type", "application/json"); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
ThreadingHTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
