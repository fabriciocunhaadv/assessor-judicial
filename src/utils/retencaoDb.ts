// RETENÇÃO DO HISTÓRICO (parte que fala com o banco): lê e grava a configuração (settings/retencao_historico) e apaga os atos vencidos.
// A exclusão roda no navegador de quem abre o sistema: cada usuário apaga as próprias minutas vencidas e o super admin apaga todas (é o que as regras do banco permitem).
import { collection, doc, getDoc, getDocs, limit, query, setDoc, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { db, auth } from "../lib/firebase";
import { deleteHistoryFromDb, ehDonoDoAto, garantirIndiceHistorico, indiceHistoricoPath } from "../lib/firestoreUtils";
import { medirLeitura } from "./medidorColeta";
import { ConfigRetencao, configRetencaoAtual, definirConfigRetencao, limiteDeCandidatos, normalizarConfigRetencao, resumirValidade, situacaoValidade } from "./retencaoRegras";

const refConfig = () => doc(db, "settings", "retencao_historico");

export async function carregarConfigRetencao(): Promise<ConfigRetencao> {
  try { const sn = await getDoc(refConfig()); const c = normalizarConfigRetencao(sn.exists() ? sn.data() : null); definirConfigRetencao(c); return c; }
  catch (e) { console.warn("[Retenção] não consegui ler a configuração:", e); return configRetencaoAtual(); }
}

/** Liga, desliga ou muda os dias (só o painel do super admin chama). Ao LIGAR pela primeira vez grava o dia de início: é dele que contam os 7 dias de carência das minutas antigas. */
export async function salvarConfigRetencao(nova: { ativa: boolean; dias: number }): Promise<ConfigRetencao> {
  const atual = configRetencaoAtual();
  const ligando = nova.ativa && !atual.ativa;
  const c = normalizarConfigRetencao({ ...atual, ativa: nova.ativa, dias: nova.dias, ativadaEm: ligando || !atual.ativadaEm ? Date.now() : atual.ativadaEm });
  await setDoc(refConfig(), { ...c, atualizadoPor: auth.currentUser?.email || "", atualizadoEm: Date.now() }, { merge: true });
  definirConfigRetencao(c);
  return c;
}

export interface ResultadoLimpeza { candidatos: number; apagados: number; falhas: number }
/** Apaga (ou só conta, com `simular`) os atos vencidos que o usuário pode apagar. Usa o índice leve: não baixa nenhuma minuta. */
export async function limparHistoricoVencido(opcoes: { simular?: boolean } = {}): Promise<ResultadoLimpeza> {
  const out: ResultadoLimpeza = { candidatos: 0, apagados: 0, falhas: 0 };
  const cfg = configRetencaoAtual();
  if (!cfg.ativa || !auth.currentUser) return out;
  try {
    if (!(await garantirIndiceHistorico())) return out;      // sem índice confiável, não apaga nada
    const sn = await getDocs(query(collection(db, indiceHistoricoPath()), where("date", "<", limiteDeCandidatos(cfg)), limit(200)));
    medirLeitura("retencao_limpeza", sn.docs);
    const vencidos = sn.docs.filter((d) => {
      const v: any = d.data();
      return situacaoValidade(v.date, cfg).fase === "vencido" && ehDonoDoAto(v.createdBy, auth.currentUser?.uid);
    });
    out.candidatos = vencidos.length;
    if (opcoes.simular) return out;
    for (const d of vencidos) {
      try { await deleteHistoryFromDb(d.id, { forcar: true }); out.apagados++; } catch (e) { out.falhas++; console.warn("[Retenção] não consegui apagar", d.id, e); }
    }
  } catch (e) { console.warn("[Retenção] limpeza falhou:", e); }
  return out;
}

let _iniciada = false;
/** Chamar uma vez ao abrir o sistema com o usuário logado: lê a configuração, limpa o que venceu e repete a cada 6 horas. */
export function iniciarRetencao(): void {
  if (_iniciada || typeof window === "undefined") return;
  _iniciada = true;
  const rodar = async () => { const c = await carregarConfigRetencao(); if (c.ativa) await limparHistoricoVencido(); };
  setTimeout(() => { void rodar(); }, 15_000);
  setInterval(() => { void rodar(); }, 6 * 3_600_000);
}

/** Aviso (no máximo um por dia e por fase) das minutas do próprio usuário que estão perto de vencer. */
export function avisarVencimentos(lista: Array<{ date?: any; createdBy?: string }>, uid: string | undefined | null): void {
  try {
    const cfg = configRetencaoAtual(); if (!cfg.ativa || !uid) return;
    const minhas = lista.filter((a) => a.createdBy === uid);      // só as minutas do próprio usuário (o super admin não recebe aviso das dos outros)
    const r = resumirValidade(minhas, cfg);
    const hoje = new Date().toISOString().slice(0, 10);
    const jaAvisou = (fase: string) => { try { return localStorage.getItem(`retencao_aviso_${uid}_${hoje}_${fase}`) === "1"; } catch { return false; } };
    const marcar = (fase: string) => { try { localStorage.setItem(`retencao_aviso_${uid}_${hoje}_${fase}`, "1"); } catch { /* sem armazenamento */ } };
    if (r.ate1 > 0 && !jaAvisou("1")) { marcar("1"); toast.error(`${r.ate1} minuta(s) expiram em menos de 24 horas e serão apagadas do Histórico. Baixe (DOCX ou PDF) o que quiser guardar.`, { duration: 15000 }); }
    else if (r.ate3 > 0 && !jaAvisou("3")) { marcar("3"); toast(`${r.ate3} minuta(s) expiram em até 3 dias e serão apagadas do Histórico. Baixe o que quiser guardar.`, { duration: 12000, icon: "⏳" }); }
  } catch { /* o aviso nunca derruba o sistema */ }
}
