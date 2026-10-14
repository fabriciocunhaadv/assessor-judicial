// Limites de tamanho das auditorias da Lupa do Magistrado.
// A nuvem (Firestore) rejeita documentos acima de 1 MiB e o navegador guarda só ~5 MB por site; como cada auditoria leva o texto
// completo dos autos, processos grandes estouravam um dos dois e a auditoria "sumia" sem aviso. Aqui os textos são encurtados
// só na cópia que não cabe (a auditoria em si, a nota e os apontamentos nunca são cortados).

export const CAMPOS_TEXTO_LONGO = ["processText", "assessorDraft", "previousDraft", "systemGeneratedMinute"] as const;
const AVISO_CORTE = "\n[... texto cortado nesta cópia por tamanho ...]";

export const bytesUtf8 = (o: unknown): number => {
  try { return new TextEncoder().encode(JSON.stringify(o)).length; } catch { return JSON.stringify(o || "").length * 2; }
};

const cortar = (s: unknown, max: number): unknown =>
  typeof s === "string" && s.length > max ? s.slice(0, max) + AVISO_CORTE : s;

// Cópia para a nuvem: cada texto longo até 200 mil caracteres (como antes) e, se o documento ainda passar do limite em BYTES
// (acentos ocupam 2 bytes), o maior texto é reduzido pela metade até caber.
export function limitarParaNuvem<T extends Record<string, any>>(registro: T, limiteBytes = 850000): { dado: T; cortou: string[] } {
  const dado: any = { ...registro };
  const cortou: string[] = [];
  for (const c of CAMPOS_TEXTO_LONGO) {
    if (typeof dado[c] === "string" && dado[c].length > 200000) { dado[c] = cortar(dado[c], 200000); cortou.push(c); }
  }
  for (let i = 0; i < 40 && bytesUtf8(dado) > limiteBytes; i++) {
    const maior = CAMPOS_TEXTO_LONGO.filter((c) => typeof dado[c] === "string" && dado[c].length > 4000).sort((a, b) => dado[b].length - dado[a].length)[0];
    if (!maior) break;
    dado[maior] = cortar((dado[maior] as string).replace(AVISO_CORTE, "").slice(0, Math.floor(dado[maior].length / 2)), Infinity) + AVISO_CORTE;
    if (!cortou.includes(maior)) cortou.push(maior);
  }
  return { dado, cortou };
}

// Cópia para o navegador: tenta a lista inteira; se não couber, encurta os textos longos de todos menos os 2 mais recentes,
// depois de todos, e por fim mantém só as mais recentes. `gravar` devolve true quando o navegador aceitou.
export function gravarListaNoNavegador<T extends Record<string, any>>(lista: T[], gravar: (json: string) => boolean): { ok: boolean; nivel: number } {
  const compactar = (l: T[], maxChars: number, poupar: number) => l.map((r, i) => (i < poupar ? r : Object.fromEntries(Object.entries(r).map(([k, v]) => [k, (CAMPOS_TEXTO_LONGO as readonly string[]).includes(k) ? cortar(v, maxChars) : v]))) as T);
  const tentativas: T[][] = [lista, compactar(lista, 60000, 2), compactar(lista, 15000, 1), compactar(lista, 4000, 0), compactar(lista, 4000, 0).slice(0, 40)];
  for (let n = 0; n < tentativas.length; n++) if (gravar(JSON.stringify(tentativas[n]))) return { ok: true, nivel: n };
  return { ok: false, nivel: -1 };
}
