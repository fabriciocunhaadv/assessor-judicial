// Súmulas, teses e informativos anexados pelo gabinete (PDF): o banco é a fonte; o navegador guarda uma cópia só para ler rápido.
import { auth } from "../lib/firebase";
import { globalTenantId, lerVersaoPrecedentes, lerPrecedentesDoGabinete, gravarPrecedentesDoGabinete } from "../lib/firestoreUtils";
import { BindingPrecedent, chaveDoPrecedente, getCustomBindingPrecedents, saveCustomBindingPrecedents } from "./bindingPrecedents";

const CARIMBO = "assessor_precedentes_carimbo";      // {tenant, versao} da cópia guardada neste navegador
const lerCarimbo = (): { tenant: string; versao: number } | null => { try { const v = JSON.parse(localStorage.getItem(CARIMBO) || "null"); return v && v.tenant ? v : null; } catch { return null; } };
const gravarCarimbo = (versao: number) => { try { localStorage.setItem(CARIMBO, JSON.stringify({ tenant: globalTenantId, versao })); } catch { /* sem armazenamento: segue sem cópia */ } };
const dedupe = (lista: BindingPrecedent[]) => { const ids = new Set<string>(), chaves = new Set<string>(); return lista.filter((p) => { if (!p?.id) return false; const k = chaveDoPrecedente(p); if (ids.has(p.id) || chaves.has(k)) return false; ids.add(p.id); chaves.add(k); return true; }); };

let emAndamento: Promise<BindingPrecedent[]> | null = null;

/** Traz a lista do gabinete para este navegador. Só baixa tudo quando a versão no banco mudou; senão, 1 leitura mínima.
 *  Se o gabinete ainda não tem lista no banco, leva para lá o que já existia (cópia deste navegador e, se informado, os PDFs que estavam só no servidor). */
export function sincronizarPrecedentes(doServidor: BindingPrecedent[] = []): Promise<BindingPrecedent[]> {
  if (emAndamento) return emAndamento;
  emAndamento = (async () => {
    if (!auth.currentUser) return getCustomBindingPrecedents();
    try {
      const carimbo = lerCarimbo();
      const daqui = carimbo && carimbo.tenant === globalTenantId ? getCustomBindingPrecedents() : (carimbo ? [] : getCustomBindingPrecedents());
      const versao = await lerVersaoPrecedentes();
      if (versao != null) {
        if (carimbo && carimbo.tenant === globalTenantId && carimbo.versao === versao) return getCustomBindingPrecedents();
        const nuvem = dedupe((await lerPrecedentesDoGabinete()) as BindingPrecedent[]);
        saveCustomBindingPrecedents(nuvem); gravarCarimbo(versao);
        return nuvem;
      }
      // primeira vez deste gabinete: leva para o banco os julgados dos PDFs que já existiam (só os extraídos de PDF)
      const migrar = dedupe([...daqui, ...doServidor].filter((p) => (p as any)?.sourceFile));
      if (!migrar.length) return getCustomBindingPrecedents();
      const novaVersao = await gravarPrecedentesDoGabinete(migrar);
      saveCustomBindingPrecedents(migrar); gravarCarimbo(novaVersao);
      return migrar;
    } catch (e) { console.warn("[Precedentes] não consegui sincronizar com o banco; uso a cópia deste navegador:", e); return getCustomBindingPrecedents(); }
  })().finally(() => { emAndamento = null; });
  return emAndamento;
}

/** Guarda no banco os julgados novos de um PDF (ignora os que o gabinete já tem). Devolve quantos eram novos. */
export async function importarPrecedentes(novos: BindingPrecedent[]): Promise<number> {
  const atuais = getCustomBindingPrecedents();
  const jaTem = new Set(atuais.map(chaveDoPrecedente)), ids = new Set(atuais.map((p) => p.id));
  const aGravar = dedupe(novos).filter((p) => !jaTem.has(chaveDoPrecedente(p)) && !ids.has(p.id));
  if (!aGravar.length) return 0;
  const carimbo = lerCarimbo(), antes = await lerVersaoPrecedentes().catch(() => null);
  const estavaEmDia = !!carimbo && carimbo.tenant === globalTenantId && antes != null && carimbo.versao === antes;
  const versao = await gravarPrecedentesDoGabinete(aGravar);      // se falhar, avisa quem chamou: não finge que gravou
  saveCustomBindingPrecedents([...aGravar, ...atuais]);
  if (estavaEmDia || antes == null) gravarCarimbo(versao);        // se outro usuário gravou no meio, a cópia fica "desatualizada" de propósito e a próxima conferência baixa tudo
  return aGravar.length;
}
