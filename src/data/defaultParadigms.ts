export interface JudgeParadigmModel {
  id: string;
  title: string;
  category: string; // ex: Direito do Consumidor, Direito Bancário, Fazenda Pública, Processual Civil, Outros
  decisionType: "procedencia" | "improcedencia" | "parcial_procedencia" | "extincao_sem_merito" | "tutela_deferida" | "tutela_indeferida" | "despacho_interlocutoria";
  processNumber?: string;
  summary?: string;
  keyHighlights?: string[];
  fullText: string;
  createdAt: number;
  updatedAt: number;
  createdBy?: string;
  createdByName?: string;
  isDefault?: boolean;
}

export const DEFAULT_JUDGE_PARADIGMS: JudgeParadigmModel[] = [
  {
    id: "paradigm-1",
    title: "Cartão de Crédito RMC / RCC - Improcedência por Utilização Comprovada e Ausência de Vício",
    category: "Direito Bancário / Consumidor",
    decisionType: "improcedencia",
    processNumber: "5123456-78.2024.8.09.0105",
    summary: "Improcedência em contratos de cartão RMC quando comprovado o saque, transferência em conta e utilização reiterada do plástico.",
    fullText: `1. RELATÓRIO DISPENSADO (Art. 38 da Lei 9.099/95).

2. FUNDAMENTAÇÃO:
Trata-se de Ação Declaratória de Inexistência de Débito c/c Repetição de Indébito e Indenização por Danos Morais, ajuizada pela parte autora em face da instituição financeira ré, alegando vício de consentimento na contratação de cartão de crédito consignado (RMC).

Analisando detidamente os autos, verifica-se que o banco réu acostou aos autos contrato formal assinado digitalmente/fisicamente pela parte autora, acompanhado de comprovante de TED/transferência do crédito em favor da conta de titularidade da parte requerente, bem como extratos demonstrando a utilização rotineira do limite de crédito para saques e compras.

Nesse diapasão, não há que se falar em vício de consentimento, publicidade enganosa ou falha no dever de informação, uma vez que a parte autora usufruiu plenamente da quantia mutuada, beneficiando-se do numerário disponibilizado. A insurgência apenas com os descontos supervenientes configura verdadeiro "venire contra factum proprium", conduta vedada pelo princípio da boa-fé objetiva (art. 422 do Código Civil).

Assim, reputo válidas as cláusulas contratuais entabuladas e legítimos os descontos efetuados.

3. DISPOSITIVO:
Ante o exposto, JULGO IMPROCEDENTES os pedidos formulados na inicial, com resolução do mérito, nos termos do art. 487, inciso I, do Código de Processo Civil.

Sem custas e sem honorários advocatícios nesta fase processual (arts. 54 e 55 da Lei nº 9.099/95).
Publicada e Registrada no PROJUDI. Intimem-se.`,
    createdAt: Date.now() - 10000000,
    updatedAt: Date.now() - 10000000,
    createdByName: "Gabinete do Juiz",
    isDefault: true,
  },
  {
    id: "paradigm-2",
    title: "Negativação Indevida por Dívida Inexistente / Fraude - Procedência com Dano Moral",
    category: "Direito do Consumidor",
    decisionType: "procedencia",
    processNumber: "5654321-12.2024.8.09.0105",
    summary: "Procedência com declaração de inexistência do débito, exclusão do SPC/Serasa e indenização de R$ 5.000,00 por dano moral in re ipsa.",
    fullText: `1. RELATÓRIO DISPENSADO (Art. 38 da Lei 9.099/95).

2. FUNDAMENTAÇÃO:
Cuida-se de ação na qual a parte autora postula a declaração de inexistência de débito e compensação por danos morais em razão de inscrição indevida de seu nome nos cadastros de inadimplentes.

A instituição requerida não logrou êxito em comprovar a origem legítima da dívida, tampouco juntou contrato com assinatura válida da parte autora ou comprovante de entrega do serviço/produto, ônus que lhe incumbia por força do art. 373, II, do CPC e art. 6º, VIII, do CDC.

Tratando-se de inscrição indevida, o dano moral opera-se "in re ipsa", prescindindo de comprovação de dor ou sofrimento íntimo. Para a fixação do quantum indenizatório, considerando a capacidade econômica das partes, a repercussão do fato e a função pedagógico-punitiva da medida, arbitro a indenização no importe de R$ 5.000,00 (cinco mil reais), valor condizente com a jurisprudência desta Turma Recursal.

3. DISPOSITIVO:
Ante o exposto, JULGO PROCEDENTES os pedidos iniciais (art. 487, I, CPC) para:
a) DECLARAR a inexistência do débito objeto da lide, determinando o cancelamento definitivo do apontamento desabonador;
b) CONDENAR a parte ré ao pagamento de R$ 5.000,00 (cinco mil reais) a título de indenização por danos morais, corrigido monetariamente pelo IPCA-E a partir desta data (Súmula 362/STJ) e acrescido de juros de mora de 1% ao mês a contar do evento danoso (Súmula 54/STJ).

Sem custas e sem honorários nesta fase (art. 55 da Lei 9.099/95).
Publicada e Registrada no PROJUDI. Intimem-se.`,
    createdAt: Date.now() - 9000000,
    updatedAt: Date.now() - 9000000,
    createdByName: "Gabinete do Juiz",
    isDefault: true,
  },
  {
    id: "paradigm-3",
    title: "Extinção sem Resolução do Mérito - Ausência de Comprovante de Endereço Idôneo / Atualizado",
    category: "Processual Civil",
    decisionType: "extincao_sem_merito",
    processNumber: "5789123-45.2024.8.09.0105",
    summary: "Extinção do processo sem resolução de mérito pelo não cumprimento da determinação de juntada de comprovante de residência em nome próprio nos últimos 90 dias.",
    fullText: `1. RELATÓRIO DISPENSADO (Art. 38 da Lei 9.099/95).

2. FUNDAMENTAÇÃO:
Intimada a emendar a petição inicial para juntar comprovante de endereço idôneo, recente e em nome próprio (ou declaração de residência acompanhada de documento hábil da comarca), a parte autora manteve-se inerte ou acostou documento manifestamente inidôneo/desatualizado.

A regularidade do domicílio é pressuposto indeclinável para a fixação da competência territorial absoluta no âmbito dos Juizados Especiais Cíveis (art. 4º da Lei 9.099/95 e Enunciado nº 89 do FONAJE). O não cumprimento de determinação judicial de emenda enseja o indeferimento da petição inicial.

3. DISPOSITIVO:
Ante o exposto, INDEFIRO A PETIÇÃO INICIAL e JULGO EXTINTO O PROCESSO SEM RESOLUÇÃO DO MÉRITO, com fulcro nos artigos 321, parágrafo único, 330, IV, e 485, I, todos do Código de Processo Civil, c/c art. 51, caput, da Lei 9.099/95.

Sem custas processuais nesta fase.
Arquivem-se com as cautelas de praxe. Intimem-se.`,
    createdAt: Date.now() - 8000000,
    updatedAt: Date.now() - 8000000,
    createdByName: "Gabinete do Juiz",
    isDefault: true,
  },
  {
    id: "paradigm-4",
    title: "Tutela Provisória de Urgência Deferida - Suspensão de Descontos e Abstenção de Negativação",
    category: "Direito do Consumidor / Tutela",
    decisionType: "tutela_deferida",
    processNumber: "5890123-99.2024.8.09.0105",
    summary: "Deferimento de tutela antecipada liminar para suspender cobranças e proibir inserção do nome nos órgãos de restrição de crédito sob pena de multa diária.",
    fullText: `DECISÃO INTERLOCUTÓRIA

Vistos os autos.

Trata-se de pedido de TUTELA PROVISÓRIA DE URGÊNCIA DE NATUREZA ANTECIPADA formulado pela parte autora em face da parte requerida, objetivando a imediata suspensão dos descontos em seu benefício previdenciário e a abstenção de inclusão do seu nome nos cadastros de inadimplentes.

Para a concessão da tutela de urgência, exige-se a presença concomitante da probabilidade do direito (fumus boni iuris) e do perigo de dano ou risco ao resultado útil do processo (periculum in mora), nos termos do art. 300 do CPC.

Na espécie, a probabilidade do direito resta evidenciada pelos extratos acostados, que apontam descontos unilaterais sem prova preliminar de adesão inequívoca. O perigo de dano é manifesto, haja vista o caráter alimentar da verba previdenciária percebida pela parte autora.

Ante o exposto, DEFIRO O PEDIDO DE TUTELA DE URGÊNCIA para DETERMINAR:
1. À instituição ré que, no prazo de 05 (cinco) dias úteis, SUSPENDA os descontos referentes ao contrato impugnado, sob pena de multa diária de R$ 200,00 (duzentos reais), limitada a R$ 5.000,00;
2. À parte ré que se ABSTENHA de inscrever ou retire o nome da parte autora dos cadastros de inadimplentes (SPC/SERASA) quanto a esta dívida, no mesmo prazo, sob pena de multa diária no mesmo valor.

Oficie-se / Intime-se com urgência. Designe-se audiência de conciliação.`,
    createdAt: Date.now() - 7000000,
    updatedAt: Date.now() - 7000000,
    createdByName: "Gabinete do Juiz",
    isDefault: true,
  },
];
