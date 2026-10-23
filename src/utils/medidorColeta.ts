// MEDIDOR de leitura (coleta): cada leitura grande do banco avisa aqui quantos documentos e bytes (estimados) vieram e de qual parte do sistema.
// Sem Firebase de propósito (o firestoreUtils importa este arquivo). O envio dos totais fica em medidorEnvio.ts. O medidor só observa: não muda o que é lido.
import { Acumulador, estimarBytes } from "./medidorRegras";

export const acumuladorMedidor = new Acumulador();

/** Registra uma leitura: `docs` é a lista de documentos (snapshot.docs) que acabou de chegar do banco. Nunca lança erro. */
export function medirLeitura(origem: string, docs: any[] | null | undefined): void {
  try { const lista = Array.isArray(docs) ? docs : []; acumuladorMedidor.add(origem, lista.length, estimarBytes(lista)); } catch { /* sem medição */ }
}
