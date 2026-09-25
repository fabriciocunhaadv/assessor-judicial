import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from "firebase/firestore";
import { InitialPetitionRecord, InitialPetitionRepetitiveTemplate } from "../types";

const PETITIONS_HISTORY_COLLECTION = "initial_petitions_history";
const PETITIONS_TEMPLATES_COLLECTION = "initial_petition_templates";

// Modelos Repetitivos Padrão de Fábrica para Casos de Massa da Advocacia
export const DEFAULT_REPETITIVE_TEMPLATES: InitialPetitionRepetitiveTemplate[] = [
  {
    id: "fraude_pix_banco",
    title: "Golpe do PIX & Fortuito Interno Bancário (Súmula 479 STJ)",
    category: "Direito Bancário / Consumidor",
    shortDesc: "Transações atípicas fraudulentas via PIX sem bloqueio de segurança do banco e mecanismo especial de devolução (MED).",
    suggestedUrgency: true,
    targetCourtDefault: "TJGO",
    keyClaims: [
      "Aplicação do CDC e da Súmula 297 do STJ às instituições financeiras",
      "Falha no dever de segurança e monitoramento de transações com perfil totalmente discrepante",
      "Responsabilidade objetiva pelo fortuito interno (Súmula 479 do STJ)",
      "Inobservância do Mecanismo Especial de Devolução (MED) instituído pelo Banco Central (Resolução BCB 147/2021)",
      "Dano material equivalente ao montante subtraído e dano moral pelo desfalque patrimonial abrupto"
    ],
    recommendedProves: [
      "Boletim de Ocorrência Policial narrando o golpe",
      "Comprovantes das transações PIX contestadas com horários e destinatários",
      "Extratos bancários demonstrando a média histórica do correntista",
      "Protocolos de SAC/Ouvidoria com pedido tempestivo de bloqueio/MED",
      "Prints de conversas ou tela do aplicativo bancário"
    ],
    defaultClientFactualSkeleton: `No dia [DATA_DO_GOLPE], por volta das [HORARIO], o(a) Autor(a) foi vítima de fraude eletrônica perpetrada por terceiro estelionatário.
Foram realizadas operações fraudulentas via PIX nos valores de [VALORES_TRANSACOES], totalizando o montante de R$ [VALOR_TOTAL], debitados diretamente de sua conta bancária nº [NUMERO_CONTA], agência [AGENCIA], mantida perante o Banco Réu [NOME_BANCO].
As transações fugiram totalmente ao perfil de movimentação habitual do(a) Autor(a), que jamais realiza transferências sucessivas e de alto valor para destinatários desconhecidos em curto lapso temporal.
Tão logo tomou ciência, o(a) Autor(a) registrou Boletim de Ocorrência nº [NUMERO_BO] e acionou imediatamente a central de atendimento do Banco Réu (Protocolo nº [PROTOCOLO]), solicitando o bloqueio cautelar e a deflagração do MED (Mecanismo Especial de Devolução).
Contudo, o Banco Réu permaneceu inerte, recusou o estorno e não adotou qualquer medida preventiva de contenção de risco, consumando o prejuízo patrimonial.`
  },
  {
    id: "voo_cancelado_atraso",
    title: "Cancelamento / Atraso de Voo & Extravio de Bagagem",
    category: "Direito do Consumidor / Transporte Aéreo",
    shortDesc: "Atraso injustificado superior a 4 horas ou cancelamento de voo com preterição de passageiro e dano moral in re ipsa.",
    suggestedUrgency: false,
    targetCourtDefault: "TJGO",
    keyClaims: [
      "Aplicação do CDC para transporte aéreo nacional e internacional (Código Civil, art. 734)",
      "Descumprimento da Resolução nº 400 da ANAC (dever de assistência material e reacomodação imediata)",
      "Inaplicabilidade de excludente de caso fortuito por problemas técnicos na aeronave ou 'malha aérea' (fortuito interno)",
      "Dano moral presumido (in re ipsa) decorrente da aflição, desamparo e perda de compromisso",
      "Ressarcimento de gastos adicionais com alimentação, traslado e hospedagem"
    ],
    recommendedProves: [
      "Bilhetes de passagem aérea e cartões de embarque originais e remarcados",
      "Declaração de Atraso/Cancelamento de Voo emitida pela Companhia Aérea no balcão",
      "Comprovantes de despesas não custeadas (alimentação, táxi/Uber, hotel)",
      "Comprovantes do compromisso perdido (reserva, reunião de trabalho, evento)",
      "Relatório de Irregularidade de Bagagem (RIB) se houve extravio"
    ],
    defaultClientFactualSkeleton: `O(a) Autor(a) adquiriu passagem aérea junto à Ré [NOME_COMPANHIA_AEREA] para o trecho [ORIGEM] com destino a [DESTINO], voo nº [NUMERO_VOO], programado para decolar no dia [DATA_VOO] às [HORARIO_PREVISTO].
Ocorre que, sem aviso prévio razoável, a Ré cancelou/atrasou injustificadamente o voo, alegando genérica 'readequação de malha aérea'.
O(a) Autor(a) somente conseguiu embarcar no voo alternativo [HORAS_ATRASO] horas após o previsto, chegando ao destino final com atraso de [TOTAL_HORAS_CHEGADA] horas.
Durante o período de espera no aeroporto, a Companhia Ré não forneceu qualquer assistência material satisfatória (alimentação, comunicação ou hospedagem), tratando o passageiro com manifesto descaso e humilhação, resultando na perda de [COMPROMISSO_PERDIDO].`
  },
  {
    id: "negativacao_indevida",
    title: "Negativação Indevida no SPC/SERASA & Inexistência de Débito",
    category: "Direito do Consumidor / Bancário",
    shortDesc: "Inscrição fraudulenta em órgãos de proteção ao crédito sem contratação ou de dívida já adimplida.",
    suggestedUrgency: true,
    targetCourtDefault: "TJGO",
    keyClaims: [
      "Inexistência de relação jurídica contratual válida ou quitação prévia da obrigação",
      "Súmula 54 do STJ e Súmula 385 a contrario sensu (inexistência de outras anotações desabonadoras legítimas preexistentes)",
      "Dano moral in re ipsa decorrente do abalo de crédito e maculação da honra objetiva",
      "Tutela de urgência para expedição de ofício imediato para exclusão do gravame (art. 300 CPC c/c CDC art. 43, §3º)",
      "Inversão do ônus da prova cabendo ao Réu juntar contrato assinado (físico ou biometria válida)"
    ],
    recommendedProves: [
      "Comprovante de consulta recente ao SPC / SERASA / Boa Vista com o apontamento indevido",
      "Comprovante de pagamento/quitação (caso o débito apontado já tivesse sido pago)",
      "Cópia de RG, CPF e comprovante de endereço do Autor demonstrando residência e idoneidade",
      "Protocolos de tentativa amigável de cancelamento junto ao credor",
      "Extrato de inexistência de outros apontamentos válidos (Súmula 385 STJ)"
    ],
    defaultClientFactualSkeleton: `Ao tentar realizar uma operação comercial/financeira no dia [DATA_DESCOBERTA], o(a) Autor(a) foi surpreendido(a) com a notícia de que seu nome estava negativado nos cadastros do SERASA/SPC por ordem da Ré [NOME_EMPRESA_RE].
O gravame refere-se a um suposto débito no valor de R$ [VALOR_NEGATIVACAO], vencido em [DATA_VENCIMENTO_APONTADO], referente ao contrato nº [NUMERO_CONTRATO].
Ocorre que o(a) Autor(a) NUNCA contratou qualquer serviço ou produto com a referida empresa, tratando-se de manifesta fraude praticada por terceiro ou erro operacional grosseiro da Ré.
O(a) Autor(a) jamais recebeu notificação prévia de inscrição (art. 43, §2º do CDC), não possui qualquer outra anotação legítima em seu nome e encontra-se com o crédito bloqueado de forma injusta e humilhante.`
  },
  {
    id: "rmc_rcc_inss",
    title: "Empréstimo RMC/RCC Não Solicitado em Benefício do INSS",
    category: "Direito Previdenciário / Bancário",
    shortDesc: "Descontos perpétuos no benefício previdenciário a título de Reserva de Margem Consignável (Cartão de Crédito com RMC).",
    suggestedUrgency: true,
    targetCourtDefault: "TJGO",
    keyClaims: [
      "Violação expressa ao dever de informação e transparência (art. 6º, III, e art. 39, III, IV e V do CDC)",
      "Vício de consentimento: o consumidor hipervulnerável pretendia contratar empréstimo consignado comum e foi induzido a cartão RMC com dívida impagável",
      "Nulidade da cláusula de retenção perpétua de margem com juros rotativos abusivos",
      "Restituição em dobro dos valores indevidamente descontados (CDC, art. 42, parágrafo único - STJ Tema 929/EAREsp 676.608)",
      "Dano moral configurado pela apropriação indevida de verba alimentar de aposentado/pensionista"
    ],
    recommendedProves: [
      "Histórico de Créditos (HisCre) e Extrato de Pagamento de Benefício do INSS comprovando os descontos sob rubrica 'RMC' ou 'RCC'",
      "Cópia da carteira de trabalho ou carta de concessão de aposentadoria/pensão",
      "Extratos bancários da época da contratação para checagem do depósito originário",
      "Comprovante de hipossuficiência econômica e idade avançada (hipervulnerabilidade)",
      "Tentativa de contestação perante o INSS ou Banco"
    ],
    defaultClientFactualSkeleton: `O(a) Autor(a) é aposentado(a)/pensionista do INSS, percebendo benefício sob o nº [NUMERO_BENEFICIO], de caráter estritamente alimentar.
Ao analisar seu extrato de pagamento de benefício, constatou que a instituição bancária Ré [NOME_BANCO] vem efetuando descontos mensais ininterruptos no valor de R$ [VALOR_MENSAL_DESCONTO], sob a rubrica 'Empréstimo sobre a RMC' (Reserva de Margem Consignável), contrato nº [NUMERO_CONTRATO].
O(a) Autor(a) NUNCA solicitou nem utilizou qualquer cartão de crédito junto à Ré, jamais realizou saques na modalidade rotativo nem recebeu a respectiva fatura em sua residência.
Pretendia contratar um empréstimo consignado com parcelas fixas e prazo determinado, tendo sido vítima de prática abusiva e ardilosa, transformando a relação em uma dívida perpétua e impagável que já consumiu o valor acumulado de R$ [VALOR_TOTAL_DESCONTADO].`
  }
];

// Salvar Petição no Histórico Dedicado da Advocacia (Firestore com cache seguro local)
const LOCAL_PETITIONS_STORAGE_KEY = "initial_petitions_history_cache";
const LOCAL_DELETED_PETITIONS_KEY = "initial_petitions_deleted_ids";

function getDeletedPetitionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LOCAL_DELETED_PETITIONS_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function markPetitionAsDeleted(id: string): void {
  try {
    const set = getDeletedPetitionIds();
    set.add(id);
    localStorage.setItem(LOCAL_DELETED_PETITIONS_KEY, JSON.stringify(Array.from(set)));
  } catch (err) {
    console.warn("Erro ao salvar ID na lista de excluídos:", err);
  }
}

function unmarkPetitionAsDeleted(id: string): void {
  try {
    const set = getDeletedPetitionIds();
    set.delete(id);
    localStorage.setItem(LOCAL_DELETED_PETITIONS_KEY, JSON.stringify(Array.from(set)));
  } catch {}
}

function getLocalPetitionsHistory(): InitialPetitionRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_PETITIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as InitialPetitionRecord[];
    const deletedIds = getDeletedPetitionIds();
    return parsed.filter(item => item && item.id && !deletedIds.has(item.id));
  } catch (err) {
    console.warn("Erro ao ler cache local de petições:", err);
    return [];
  }
}

function saveLocalPetitionsHistory(list: InitialPetitionRecord[]): void {
  try {
    const deletedIds = getDeletedPetitionIds();
    const filtered = list.filter(item => item && item.id && !deletedIds.has(item.id));
    localStorage.setItem(LOCAL_PETITIONS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.warn("Erro ao salvar cache local de petições:", err);
  }
}

export async function saveInitialPetitionRecord(
  record: Omit<InitialPetitionRecord, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<string> {
  const collectionRef = collection(db, PETITIONS_HISTORY_COLLECTION);
  const docId = (record.id && record.id.trim().length > 0) ? record.id : doc(collectionRef).id;
  const docRef = doc(db, PETITIONS_HISTORY_COLLECTION, docId);

  // Se estiver salvando ou atualizando, remove de lista de excluídos
  unmarkPetitionAsDeleted(docId);

  const payload: InitialPetitionRecord = {
    ...record,
    id: docId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // 1. Atualiza cache local imediatamente para consistência instantânea
  try {
    const currentLocal = getLocalPetitionsHistory();
    const updated = [payload, ...currentLocal.filter(item => item.id !== docId)];
    saveLocalPetitionsHistory(updated);
  } catch (err) {
    console.warn("Não foi possível salvar cache local de petições:", err);
  }

  // 2. Persiste no Firestore
  try {
    await setDoc(docRef, {
      ...payload,
      updatedAt: serverTimestamp(),
      createdAt: payload.createdAt || Date.now()
    }, { merge: true });
  } catch (dbErr) {
    console.warn("Erro ao salvar petição no Firestore (salvo no cache local):", dbErr);
  }

  return docId;
}

// Buscar todo o Histórico de Petições Iniciais do Super Admin
export async function getInitialPetitionsHistory(): Promise<InitialPetitionRecord[]> {
  const localList = getLocalPetitionsHistory();
  const deletedIds = getDeletedPetitionIds();

  try {
    const collectionRef = collection(db, PETITIONS_HISTORY_COLLECTION);
    const q = query(collectionRef, orderBy("createdAt", "desc"), limit(50));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const records = snapshot.docs
        .map(d => {
          const data = d.data();
          return {
            ...data,
            id: d.id || data.id
          } as InitialPetitionRecord;
        })
        .filter(r => r && r.id && !deletedIds.has(r.id));

      // Mescla SEMPRE os caches, mesmo que o firebase falhe em alguns dados
      const map = new Map<string, InitialPetitionRecord>();
      records.forEach(r => map.set(r.id, r));
      localList.forEach(l => {
        if (!deletedIds.has(l.id) && !map.has(l.id)) {
          map.set(l.id, l);
        }
      });

      const merged = Array.from(map.values()).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      saveLocalPetitionsHistory(merged);
      return merged;
    } else {
      // Retorna o cache local caso o firebase esteja vazio, mas garantindo salvar antes
       return localList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    }
  } catch (err) {
    console.warn("Could not read initial petitions history from Firestore, using local cache:", err);
    return localList.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }
}

// Obter uma Petição Específica
export async function getInitialPetitionById(id: string): Promise<InitialPetitionRecord | null> {
  if (!id) return null;
  const deletedIds = getDeletedPetitionIds();
  if (deletedIds.has(id)) return null;

  try {
    const docRef = doc(db, PETITIONS_HISTORY_COLLECTION, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data();
      return {
        ...data,
        id: snap.id || data.id
      } as InitialPetitionRecord;
    }
  } catch (err) {
    console.warn("Could not get initial petition doc from Firestore:", err);
  }

  const local = getLocalPetitionsHistory().find(p => p.id === id);
  return local || null;
}

// Excluir Petição do Histórico (Firestore e Cache Local com tolerância a falhas)
export async function deleteInitialPetitionRecord(id: string): Promise<void> {
  if (!id || typeof id !== "string") {
    throw new Error("ID de petição inválido para exclusão.");
  }

  // 1. Marca imediatamente como deletado no blacklist local
  markPetitionAsDeleted(id);

  // 2. Remove do cache local imediatamente
  try {
    const current = getLocalPetitionsHistory();
    const updated = current.filter(item => item.id !== id);
    saveLocalPetitionsHistory(updated);
  } catch (err) {
    console.warn("Erro ao remover petição do cache local:", err);
  }

  // 3. Remove do Firestore
  try {
    const docRef = doc(db, PETITIONS_HISTORY_COLLECTION, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn(`Aviso: Falha ao deletar documento ${id} no Firestore:`, err);
    // Como está na blacklist e removido do cache local, a interface continuará sem o item
  }
}

// Obter Biblioteca de Modelos Repetitivos
export async function getRepetitiveTemplates(): Promise<InitialPetitionRepetitiveTemplate[]> {
  try {
    const collectionRef = collection(db, PETITIONS_TEMPLATES_COLLECTION);
    const snap = await getDocs(collectionRef);
    if (!snap.empty) {
      const customTemplates = snap.docs.map(d => d.data() as InitialPetitionRepetitiveTemplate);
      // Mescla com os padrões
      const map = new Map<string, InitialPetitionRepetitiveTemplate>();
      DEFAULT_REPETITIVE_TEMPLATES.forEach(t => map.set(t.id, t));
      customTemplates.forEach(t => map.set(t.id, t));
      return Array.from(map.values());
    }
  } catch (err) {
    console.warn("Using fallback default repetitive templates:", err);
  }
  return DEFAULT_REPETITIVE_TEMPLATES;
}

// Salvar Novo Modelo Repetitivo do Escritório
export async function saveRepetitiveTemplate(template: InitialPetitionRepetitiveTemplate): Promise<void> {
  const docRef = doc(db, PETITIONS_TEMPLATES_COLLECTION, template.id);
  await setDoc(docRef, {
    ...template,
    updatedAt: Date.now(),
    timestamp: serverTimestamp()
  }, { merge: true });
}
