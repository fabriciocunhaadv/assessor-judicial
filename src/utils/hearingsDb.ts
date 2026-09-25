import { HearingRecord, HearingType } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { globalTenantId, cleanForFirestore, getActiveUnitId } from '../lib/firestoreUtils';
import { safeGetItem, safeSetItem } from './safeStorage';

const getLocalStorageKey = () => `assessor_hearings_records_${globalTenantId || 'gabinete_default'}`;

export const SAMPLE_HEARINGS: HearingRecord[] = [
  {
    id: 'sample-hearing-001',
    tenantId: 'gabinete_default',
    unitId: 'montes_claros',
    processNumber: '5001248-32.2025.8.13.0433',
    author: 'Marcos Vinícius Silva Ramos',
    defendant: 'Transportadora Norte de Minas Ltda.',
    hearingType: 'instrucao_julgamento',
    scheduledDate: '2026-09-10',
    scheduledTime: '14:00',
    judgeName: 'Dr. Rafael Machado de Souza',
    assessorName: 'Assessor de Gabinete',
    actionClass: 'Procedimento Comum Cível',
    subject: 'Acidente de Trânsito - Colisão em Cruzamento Semaforizado - Danos Materiais e Morais',
    caseFactsSummary: 'Trata-se de ação indenizatória em que o autor alega que, em 15/01/2025, conduzia sua motocicleta quando foi abalroado pelo caminhão da ré, que teria avançado o sinal vermelho no cruzamento da Av. Sanitária. A ré contesta sustentando que o semáforo estava verde para seu veículo e que o autor realizou ultrapassagem proibida em excesso de velocidade.',
    controversySummary: 'O ponto nuclear reside em averiguar quem avançou o sinal semafórico desfavorável (sinal vermelho) no cruzamento e se houve excesso de velocidade ou culpa exclusiva da vítima.',
    pointsOfControversy: [
      {
        id: 'pt-1',
        fact: 'Qual dos veículos avançou a fase vermelha do semáforo no cruzamento da Avenida Sanitária?',
        burdenOfProof: 'autor',
        legalBasis: 'Art. 373, I, do CPC c/c Art. 28 e 44 do CTB',
        isControverted: true,
        status: 'pendente'
      },
      {
        id: 'pt-2',
        fact: 'Havia excesso de velocidade ou manobra de ultrapassagem perigosa por parte do motociclista autor?',
        burdenOfProof: 'reu',
        legalBasis: 'Art. 373, II, do CPC (Fato impeditivo/modificativo)',
        isControverted: true,
        status: 'pendente'
      },
      {
        id: 'pt-3',
        fact: 'Extensão dos danos materiais emergentes da motocicleta (avaliação mecânica idônea vs orçamentos juntados).',
        burdenOfProof: 'autor',
        legalBasis: 'Art. 402 e 944 do Código Civil',
        isControverted: false,
        status: 'provado_autor'
      }
    ],
    witnesses: [
      {
        id: 'wit-1',
        name: 'Carlos Alberto Moreira (Frentista do Posto)',
        role: 'testemunha_autor',
        document: 'RG MG-14.882.110',
        controversyTopic: 'Presenciou a cor do semáforo no momento exato da colisão.',
        questions: [
          'Onde o senhor estava posicionado no momento do impacto e tinha visão desimpedida do semáforo?',
          'Qual era a cor do semáforo para o sentido em que trafegava o caminhão da transportadora ré?',
          'O caminhão reduziu ou freou antes de adentrar o cruzamento?'
        ],
        notes: '',
        status: 'aguardando'
      },
      {
        id: 'wit-2',
        name: 'Geraldo Antunes de Oliveira (Ajudante do Motorista)',
        role: 'testemunha_reu',
        document: 'RG MG-19.334.901',
        controversyTopic: 'Velocidade do motociclista e funcionamento do sinal semafórico.',
        questions: [
          'O senhor estava na cabine do caminhão? Percebeu se o semáforo já piscava em amarelo ao iniciar a travessia?',
          'Viu a moto do autor antes da colisão? O farol da moto estava aceso?'
        ],
        notes: '',
        status: 'aguardando'
      }
    ],
    keyQuestions: [
      'Perguntar se havia câmeras de segurança de comércios vizinhos ou se o frentista prestou depoimento aos policiais no Boletim de Ocorrência.',
      'Verificar se as partes já tentaram acordo sobre o valor dos danos da motocicleta (franquia do seguro).'
    ],
    alertsAndTraps: [
      'Atenção à contradita da testemunha Geraldo Antunes: por ser ajudante e subordinado ao réu, verificar se deve ser ouvido apenas como informante descompromissado (art. 457, § 1º, do CPC).',
      'O boletim de ocorrência juntado no evento 1.4 é unilateral quanto à versão do autor, exigindo confirmação sob o crivo do contraditório judicial.'
    ],
    hearingNotes: 'Audiência de Instrução e Julgamento pautada. Proposta de conciliação preliminar prioritária.',
    createdAt: Date.now() - 86400000 * 2,
    updatedAt: Date.now() - 3600000,
    createdByEmail: 'gabinete@tj.jus.br',
    createdByName: 'Gabinete Judicial',
    status: 'preparada'
  }
];

export const getLocalHearings = (): HearingRecord[] => {
  try {
    const raw = safeGetItem(getLocalStorageKey());
    if (raw !== null && raw !== undefined) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Could not read local hearings:", err);
  }
  
  // In development, populate with dummy data ONCE if the user has no history
  const devPopulated = safeGetItem('dev_hearings_populated');
  if (!devPopulated) {
    safeSetItem('dev_hearings_populated', 'true');
    saveLocalHearings(SAMPLE_HEARINGS);
    return SAMPLE_HEARINGS;
  }

  return [];
};

export const saveLocalHearings = (records: HearingRecord[]) => {
  try {
    safeSetItem(getLocalStorageKey(), JSON.stringify(records));
  } catch (err) {
    console.warn("Could not write local hearings:", err);
  }
};

export const subscribeToHearingRecords = (
  callback: (records: HearingRecord[]) => void
): (() => void) => {
  if (!auth.currentUser) {
    callback(getLocalHearings());
    return () => {};
  }

  const tenant = globalTenantId || 'gabinete_default';
  const collectionPath = `gabinetes/${tenant}/hearings`;

  try {
    const q = query(collection(db, collectionPath), orderBy('updatedAt', 'desc'));
    return onSnapshot(
      q,
      (snapshot) => {
        if (!snapshot.empty) {
          const remoteRecords: HearingRecord[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              ...data,
              id: d.id,
            } as HearingRecord;
          });
          saveLocalHearings(remoteRecords);
          callback(remoteRecords);
        } else {
          // Se o firestore estiver vazio, limpe a lista local (em vez de recarregar localHearings)
          // para não fazer "respawn" de itens recém excluídos
          saveLocalHearings([]);
          callback([]);
        }
      },
      (error) => {
        console.warn("Realtime listener error on hearings collection:", error);
        callback(getLocalHearings());
      }
    );
  } catch (err) {
    console.warn("Failed to subscribe to hearings:", err);
    callback(getLocalHearings());
    return () => {};
  }
};

export const saveHearingRecord = async (record: HearingRecord): Promise<void> => {
  const currentList = getLocalHearings();
  const index = currentList.findIndex((h) => h.id === record.id);
  let updatedList: HearingRecord[];

  const updatedRecord = {
    ...record,
    updatedAt: Date.now(),
    tenantId: globalTenantId || 'gabinete_default',
    unitId: record.unitId || getActiveUnitId(),
  };

  if (index >= 0) {
    updatedList = [...currentList];
    updatedList[index] = updatedRecord;
  } else {
    updatedList = [updatedRecord, ...currentList];
  }

  saveLocalHearings(updatedList);

  if (auth.currentUser) {
    try {
      const tenant = globalTenantId || 'gabinete_default';
      const docRef = doc(db, `gabinetes/${tenant}/hearings`, record.id);
      await setDoc(docRef, cleanForFirestore(updatedRecord));
    } catch (err) {
      console.warn("Could not save hearing record to Firestore:", err);
    }
  }
};

export const deleteHearingRecord = async (hearingId: string): Promise<void> => {
  const currentList = getLocalHearings().filter((h) => h.id !== hearingId);
  saveLocalHearings(currentList);

  if (auth.currentUser) {
    try {
      const tenant = globalTenantId || 'gabinete_default';
      const docRef = doc(db, `gabinetes/${tenant}/hearings`, hearingId);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn("Could not delete hearing record from Firestore:", err);
    }
  }
};

export const createEmptyHearing = (userEmail?: string, userName?: string): HearingRecord => {
  const newId = `hearing-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  return {
    id: newId,
    tenantId: globalTenantId || 'gabinete_default',
    unitId: getActiveUnitId(),
    processNumber: '',
    author: '',
    defendant: '',
    hearingType: 'instrucao_julgamento',
    scheduledDate: new Date().toISOString().split('T')[0],
    scheduledTime: '13:30',
    judgeName: '',
    assessorName: userName || '',
    actionClass: 'Procedimento Comum Cível',
    subject: '',
    caseFactsSummary: '',
    controversySummary: '',
    pointsOfControversy: [],
    witnesses: [],
    keyQuestions: [],
    alertsAndTraps: [],
    hearingNotes: '',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    createdByEmail: userEmail || '',
    createdByName: userName || '',
    status: 'preparada',
  };
};
