import React, { useCallback, useState } from "react";
import type { UploadedPdf } from "../types";
import { CoberturaLeituraDialog, LacunaArquivo } from "./CoberturaLeituraDialog";
import { ocrPaginas, renderizarPaginas, blocoOcr } from "../utils/ocrPaginas";

type Escolha = "ocr" | "visual" | "seguir" | "cancelar";
type Estado = { lacunas: LacunaArquivo[]; progresso: { feitas: number; total: number; etapa: string } | null; resolver: (e: Escolha) => void };

export interface ResultadoCobertura {
  cancelado: boolean;
  cobertura: any;
  imagens: any[];
}

// A esteira da extensão aciona o app sozinha: nesse caso não há ninguém para clicar, então o OCR (recomendado) é escolhido automaticamente.
const modoAutomatico = () => {
  try { return document.documentElement.dataset.assessorAuto === "1"; } catch { return false; }
};

/**
 * Cobertura da leitura dos autos: páginas sem texto (escaneadas/fotos) podem esconder provas.
 * `resolver(pdfs)` pergunta ao usuário (OCR, leitura visual ou seguir) e devolve o que enviar ao servidor.
 * Os PDFs recebidos são atualizados no lugar (texto do OCR acrescentado); quem chama deve gravar o estado de novo.
 */
export function useCoberturaLeitura() {
  const [dlg, setDlg] = useState<Estado | null>(null);

  const resolver = useCallback(async (pdfs: UploadedPdf[], aoProgresso?: (texto: string) => void): Promise<ResultadoCobertura> => {
    const montar = (escolha: string, paginasOcr: number, semTextoOverride?: Map<string, number[]>) => ({
      escolha,
      paginasOcr,
      arquivos: pdfs.map((p) => ({
        nome: p.name,
        totalPaginas: p.pageCount || 0,
        semTexto: semTextoOverride?.get(p.id) ?? (p.base64 ? [] : (p.paginasSemTexto || [])),
        naoLidas: p.base64 ? [] : (p.paginasNaoLidas || []),
      })),
    });
    const lacunas = pdfs
      .filter((p) => !p.base64)
      .map((p) => ({ id: p.id, nome: p.name, total: p.pageCount || 0, paginas: Array.from(new Set([...(p.paginasSemTexto || []), ...(p.paginasNaoLidas || [])])).sort((a, b) => a - b) }))
      .filter((l) => l.paginas.length > 0);
    const qtd = lacunas.reduce((n, l) => n + l.paginas.length, 0);
    const totalPag = lacunas.reduce((n, l) => n + l.total, 0);
    if (qtd === 0) return { cancelado: false, cobertura: montar("", 0), imagens: [] };
    if (qtd < 3 && qtd / Math.max(1, totalPag) < 0.05) return { cancelado: false, cobertura: montar("pequena", 0), imagens: [] };

    const automatico = modoAutomatico();
    const escolha: Escolha = automatico ? "ocr" : await new Promise<Escolha>((res) => setDlg({ lacunas, progresso: null, resolver: res }));
    const progresso = (feitas: number, total: number, etapa: string) => {
      setDlg((prev) => (prev ? { ...prev, progresso: { feitas, total, etapa } } : prev));
      aoProgresso?.(`${etapa} ${feitas}/${total}`);
    };
    const arquivoDe = async (p: UploadedPdf): Promise<File | null> => {
      if (p.file) return p.file;
      if (!p.previewUrl) return null;
      try {
        const b = await (await fetch(p.previewUrl)).blob();
        return new File([b], p.name, { type: "application/pdf" });
      } catch { return null; }
    };
    try {
      if (escolha === "cancelar") return { cancelado: true, cobertura: null, imagens: [] };
      if (escolha === "seguir") return { cancelado: false, cobertura: montar("seguir", 0), imagens: [] };
      if (escolha === "ocr") {
        let feitas = 0;
        let ocrN = 0;
        progresso(0, qtd, "Lendo páginas com OCR:");
        for (const l of lacunas) {
          const p = pdfs.find((x) => x.id === l.id)!;
          const f = await arquivoDe(p);
          if (!f) { feitas += l.paginas.length; continue; }
          const base = feitas;
          const r = await ocrPaginas(f, l.paginas, (n) => progresso(base + n, qtd, "Lendo páginas com OCR:"));
          feitas += l.paginas.length;
          const lidas = Object.keys(r.textos).map(Number);
          ocrN += lidas.length;
          p.extractedText = (p.extractedText || "") + blocoOcr(r.textos);
          p.paginasOcr = [...(p.paginasOcr || []), ...lidas];
          p.paginasSemTexto = r.falhas;
          p.paginasNaoLidas = [];
        }
        return { cancelado: false, cobertura: montar("ocr", ocrN), imagens: [] };
      }
      // leitura visual direta (até 30 páginas)
      const imagens: any[] = [];
      const restantes = new Map<string, number[]>();
      let sobra = 30;
      progresso(0, Math.min(qtd, 30), "Preparando imagens das páginas:");
      for (const l of lacunas) {
        const p = pdfs.find((x) => x.id === l.id)!;
        const pegar = l.paginas.slice(0, sobra);
        const f = pegar.length > 0 ? await arquivoDe(p) : null;
        let ok: number[] = [];
        if (f) {
          const base = imagens.length;
          const imgs = await renderizarPaginas(f, pegar, (n) => progresso(base + n, Math.min(qtd, 30), "Preparando imagens das páginas:"));
          imgs.forEach((im) => imagens.push({ arquivo: p.name, pagina: im.pagina, data: im.data }));
          ok = imgs.map((im) => im.pagina);
        }
        sobra -= ok.length;
        restantes.set(p.id, l.paginas.filter((n) => !ok.includes(n)));
      }
      return { cancelado: false, cobertura: montar("visual", 0, restantes), imagens };
    } finally {
      setDlg(null);
    }
  }, []);

  const dialog = dlg ? <CoberturaLeituraDialog lacunas={dlg.lacunas} progresso={dlg.progresso} onEscolha={dlg.resolver} /> : null;
  return { resolver, dialog };
}
