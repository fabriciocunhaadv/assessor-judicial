export interface LegalReference {
  id: string;
  category: "fonaje" | "lei" | "provimento" | "sumula" | "tjgo";
  title: string;
  code: string;
  summary: string;
  fullText: string;
}

export const LEGAL_REFERENCES: LegalReference[] = [
  {
    id: "fonaje-117",
    category: "fonaje",
    title: "Enunciado 117 FONAJE",
    code: "ENUNCIADO 117",
    summary: "Segurança obrigatória do Juízo para oferecimento de embargos à execução de título extrajudicial ou judicial.",
    fullText: "É obrigatória a segurança do Juízo pela penhora para apresentação de embargos à execução de título judicial ou extrajudicial perante o Juizado Especial (XXI Encontro – Vitória/ES).",
  },
  {
    id: "fonaje-20",
    category: "fonaje",
    title: "Enunciado 20 FONAJE",
    code: "ENUNCIADO 20",
    summary: "Comparecimento pessoal obrigatório das partes às audiências no JEC.",
    fullText: "O comparecimento pessoal da parte às audiências é obrigatório. A pessoa jurídica poderá ser representada por preposto.",
  },
  {
    id: "fonaje-97",
    category: "fonaje",
    title: "Enunciado 97 FONAJE",
    code: "ENUNCIADO 97",
    summary: "Aplicação da multa de 10% do art. 523, § 1º, do CPC e vedação de honorários advocatícios no cumprimento de sentença.",
    fullText: "A multa prevista no art. 523, § 1º, do CPC/2015 aplica-se aos Juizados Especiais Cíveis, ainda que o valor desta, somado ao da execução, ultrapasse o limite de alçada; a segunda parte do referido dispositivo não é aplicável, sendo, portanto, indevidos honorários advocatícios de dez por cento.",
  },
  {
    id: "fonaje-10",
    category: "fonaje",
    title: "Enunciado 10 FONAJE",
    code: "ENUNCIADO 10",
    summary: "Momento de apresentação da contestação.",
    fullText: "A contestação poderá ser apresentada até a audiência de Instrução e Julgamento, prosseguindo-se com o julgamento do feito.",
  },
  {
    id: "fonaje-173",
    category: "fonaje",
    title: "Enunciado 173 FONAJE",
    code: "ENUNCIADO 173",
    summary: "Extinção ou desistência da ação principal e autonomia de análise do pedido contraposto.",
    fullText: "A extinção ou desistência da ação originária torna prejudicada a apreciação do pedido contraposto, salvo se este puder subsistir autonomamente quando conexo aos fatos da petição inicial (Art. 31 da Lei 9.099/95).",
  },
  {
    id: "provimento-165-cnj",
    category: "provimento",
    title: "Provimento CNJ nº 165/2024",
    code: "Art. 101 do Anexo",
    summary: "VEDAÇÃO EXPRESSA de carta precatória cível nos Juizados Especiais. Comunicação preferencial por Correios c/ AR ou meio eletrônico.",
    fullText: "Na comunicação dos atos, no Sistema dos Juizados Especiais, deve ser utilizado preferencialmente o meio eletrônico, com o devido credenciamento dos(as) destinatários(as), ou correspondência com aviso de recebimento quando o(a) destinatário(a) for pessoa física ou pessoa jurídica de direito privado, VEDADO O USO DE CARTA PRECATÓRIA, salvo para citação no Juizado Especial Criminal.",
  },
  {
    id: "lei-14905-2024",
    category: "lei",
    title: "Lei nº 14.905/2024 (Novo Regime de Juros e Correção)",
    code: "Arts. 389 e 406 do CC",
    summary: "Atualização monetária pelo IPCA (art. 389, § 1º) e juros de mora pela diferença entre Selic e IPCA (art. 406, §§ 1º e 3º).",
    fullText: "A Lei 14.905/2024 alterou o Código Civil para unificar a disciplina dos juros legais e da correção monetária. A correção monetária das dívidas civis é calculada pelo Índice Nacional de Preços ao Consumidor Amplo (IPCA). Os juros de mora correspondem à taxa referencial do Sistema Especial de Liquidação e de Custódia (Selic) deduzido o índice de atualização monetária (IPCA).",
  },
  {
    id: "lei-9099-art-51",
    category: "lei",
    title: "Lei nº 9.099/95 - Art. 51, I e § 2º",
    code: "Art. 51, I e § 2º",
    summary: "Ausência do autor em qualquer audiência gera extinção sem resolução do mérito e condenação em custas, ressalvada força maior.",
    fullText: "Art. 51. Extingue-se o processo, além dos casos previstos em lei: I - quando o autor deixar de comparecer a qualquer das audiências do processo; § 2º No caso do inciso I deste artigo, quando comprovar que a ausência decorre de força maior, a parte poderá ser isentada, pelo Juiz, do pagamento das custas.",
  },
  {
    id: "lei-9099-art-20",
    category: "lei",
    title: "Lei nº 9.099/95 - Art. 20 (Revelia)",
    code: "Art. 20",
    summary: "Efeitos da revelia pela ausência do demandado à sessão de conciliação ou instrução.",
    fullText: "Não comparecendo o demandado à sessão de conciliação ou à audiência de instrução e julgamento, reputar-se-ão verdadeiros os fatos alegados no pedido inicial, salvo se o contrário resultar da convicção do Juiz.",
  },
  {
    id: "sumulas-stj-consectarios",
    category: "sumula",
    title: "Súmulas STJ nº 54, 43 e 362 (Termos Iniciais de Juros e Correção)",
    code: "Súmulas STJ",
    summary: "Súmula 54 (juros desde o evento danoso na responsabilidade extracontratual); Súmula 43 (correção desde o efetivo prejuízo no dano material); Súmula 362 (correção do dano moral desde o arbitramento).",
    fullText: "Súmula 54/STJ: Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual. Súmula 43/STJ: Incide correção monetária sobre dívida por ato ilícito a partir da data do efetivo prejuízo. Súmula 362/STJ: A correção monetária do valor da indenização do dano moral incide desde a data do arbitramento.",
  },
  {
    id: "tjgo-jurisagaia",
    category: "tjgo",
    title: "TJGO - Turmas Recursais / JurisAGAIA & RegisAGAIA",
    code: "JurisAGAIA TJGO",
    summary: "Jurisprudência vinculante e consolidada das Turmas Recursais dos Juizados Especiais do Estado de Goiás.",
    fullText: "As Turmas Recursais do TJGO pacificaram a necessidade de rigorosa comprovação do dano moral decorrente de desvio produtivo e descaso administrativo, a vedação de cartas precatórias e a exigência de comprovante de residência atualizado (< 3 meses) em nome da parte autora para fixação da competência territorial nos juizados de Goiânia e comarcas do interior.",
  },
];
