// Leitura tolerante da FICHA que a IA devolve para cada trecho de um processo gigante.
// A IA às vezes devolve o JSON cortado (resposta longa demais), com aspas internas sem escape ou com texto antes/depois; o JSON.parse comum falha e o lote parava com
// "A IA não devolveu a ficha do trecho em formato válido". Aqui o JSON é lido direto e, se falhar, os campos são recuperados um a um.
export const CHAVES_FICHA = ["cronologia", "partes", "pedidos", "alegacoesAutor", "alegacoesReu", "provas", "decisoes", "valores", "pontosControvertidos", "lacunas"];

const desfazerEscapes = (v: string) => v.replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\"/g, '"').replace(/\\\\/g, "\\").trim();

export interface FichaLida { ficha: Record<string, string[]> | null; reparada: boolean }

export function lerFicha(texto: unknown): FichaLida {
  const bruto = String(texto ?? "").replace(/```json/gi, "").replace(/```/g, "").trim();
  if (!bruto) return { ficha: null, reparada: false };
  // 1) JSON válido (inclusive com lixo antes/depois do objeto)
  const tentativas = [bruto, bruto.slice(bruto.indexOf("{"), bruto.lastIndexOf("}") + 1)];
  for (const t of tentativas) {
    if (!t) continue;
    try {
      const j = JSON.parse(t);
      const o = Array.isArray(j) ? j[0] : j;
      if (o && typeof o === "object" && CHAVES_FICHA.some((k) => k in o)) return { ficha: normalizar(o), reparada: false };
    } catch { /* tenta o reparo */ }
  }
  // 2) reparo: recupera cada lista de texto pelo nome do campo, mesmo com aspas soltas ou resposta cortada
  const pos: { k: string; ini: number }[] = [];
  for (const k of CHAVES_FICHA) { const m = new RegExp(`"${k}"\\s*:\\s*\\[`).exec(bruto); if (m) pos.push({ k, ini: m.index + m[0].length }); }
  if (pos.length < 2) return { ficha: null, reparada: false };
  pos.sort((a, b) => a.ini - b.ini);
  const out: Record<string, string[]> = {};
  pos.forEach((p, i) => {
    let seg = bruto.slice(p.ini, i + 1 < pos.length ? bruto.lastIndexOf('"', pos[i + 1].ini - 1 - pos[i + 1].k.length - 4) + 1 || pos[i + 1].ini : bruto.length);
    const itens: string[] = [];
    const rx = /"((?:\\.|[^\\])*?)"(?=\s*(?:,\s*"|\]|$))/gs; let m: RegExpExecArray | null;
    while ((m = rx.exec(seg))) { const v = desfazerEscapes(m[1]); if (v) itens.push(v); }
    if (!itens.length) { const solto = seg.replace(/^\s*"/, "").replace(/"\s*(?:,|\])?\s*[}\s]*$/, ""); const v = desfazerEscapes(solto); if (v && !/^\s*[\]},]*\s*$/.test(v) && !v.includes('":')) itens.push(v); }      // último item cortado no meio
    out[p.k] = itens;
  });
  const ficha = normalizar(out);
  ficha.lacunas = [...ficha.lacunas, "A resposta da IA para este trecho veio cortada ou mal formada: parte da ficha pode estar incompleta; confira esta parte dos autos."];
  return { ficha, reparada: true };
}

function normalizar(o: any): Record<string, string[]> {
  const f: Record<string, string[]> = {};
  for (const k of CHAVES_FICHA) { const v = o?.[k]; f[k] = Array.isArray(v) ? v.map((x: any) => (typeof x === "string" ? x : JSON.stringify(x))).filter(Boolean) : typeof v === "string" && v.trim() ? [v.trim()] : []; }
  return f;
}
