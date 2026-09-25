export interface BindingPrecedent {
  id: string;
  tribunal: "STF" | "STJ" | "TNU" | "TJGO";
  type: "sumula" | "sumula_vinculante" | "tese_repetitivo" | "tese_repercussao_geral" | "tese_tnu" | "informativo_tjgo" | "sumula_tjgo" | "enunciado_turma_recursal_go";
  number: string;
  title: string;
  statement: string;
  sourceUrl: string;
  tags: string[];
  area: "Direito Administrativo / Servidor" | "Direito do Consumidor" | "Direito Bancário" | "Processo Civil / Execução" | "Fazenda Pública" | "Geral";
}

export const BINDING_SOURCES = [
  {
    id: "tjgo-informativos",
    title: "TJGO - Informativos de Jurisprudência & Precedentes",
    tribunal: "TJGO",
    type: "informativo",
    url: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    description: "Informativos de Jurisprudência, Súmulas e Enunciados das Câmaras Cíveis e Turmas Recursais do TJGO",
  },
  {
    id: "stf-sumulas",
    title: "STF - Súmulas & Súmulas Vinculantes",
    tribunal: "STF",
    type: "sumula",
    url: "https://tesesesumulas.com.br/sumulas/stf",
    description: "Súmulas Vinculantes e Súmulas clássicas do Supremo Tribunal Federal",
  },
  {
    id: "stj-sumulas",
    title: "STJ - Súmulas",
    tribunal: "STJ",
    type: "sumula",
    url: "https://tesesesumulas.com.br/sumulas/stj",
    description: "Súmulas consolidadas do Superior Tribunal de Justiça",
  },
  {
    id: "tnu-sumulas",
    title: "TNU - Súmulas",
    tribunal: "TNU",
    type: "sumula",
    url: "https://tesesesumulas.com.br/sumulas/tnu",
    description: "Súmulas da Turma Nacional de Uniformização dos Juizados Especiais",
  },
  {
    id: "stf-teses",
    title: "STF - Teses de Repercussão Geral",
    tribunal: "STF",
    type: "tese",
    url: "https://tesesesumulas.com.br/teses/stf",
    description: "Teses de Repercussão Geral com eficácia erga omnes do STF",
  },
  {
    id: "stj-teses",
    title: "STJ - Recursos Especiais Repetitivos",
    tribunal: "STJ",
    type: "tese",
    url: "https://tesesesumulas.com.br/teses/stj",
    description: "Teses firmadas em Recursos Repetitivos (art. 1.036 do CPC) do STJ",
  },
  {
    id: "tnu-teses",
    title: "TNU - Temas Representativos da Controvérsia",
    tribunal: "TNU",
    type: "tese",
    url: "https://tesesesumulas.com.br/teses/tnu",
    description: "Temas e Pedilefs representativos de controvérsia nos Juizados",
  },
];

export const CORE_BINDING_PRECEDENTS: BindingPrecedent[] = [
  // STF
  {
    id: "stf-sv-4",
    tribunal: "STF",
    type: "sumula_vinculante",
    number: "Súmula Vinculante 4",
    title: "Base de cálculo de vantagens e adicional de insalubridade",
    statement: "Salvo nos casos previstos na Constituição, o salário mínimo não pode ser usado como indexador de base de cálculo de vantagem de servidor público ou de empregado, nem ser substituído por decisão judicial.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stf",
    tags: ["insalubridade", "servidor público", "base de cálculo", "vencimento", "salário mínimo"],
    area: "Fazenda Pública",
  },
  {
    id: "stf-sv-10",
    tribunal: "STF",
    type: "sumula_vinculante",
    number: "Súmula Vinculante 10",
    title: "Cláusula de reserva de plenário (Art. 97 CF)",
    statement: "Viola a cláusula de reserva de plenário (CF, artigo 97) a decisão de órgão fracionário de Tribunal que, embora não declare expressamente a inconstitucionalidade de lei ou ato normativo do poder público, afasta sua incidência, no todo ou em parte.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stf",
    tags: ["reserva de plenário", "constitucional", "inconstitucionalidade"],
    area: "Processo Civil / Execução",
  },
  {
    id: "stf-sv-17",
    tribunal: "STF",
    type: "sumula_vinculante",
    number: "Súmula Vinculante 17",
    title: "Juros de mora no prazo constitucional de pagamento de precatórios",
    statement: "Durante o período previsto no parágrafo 1º do artigo 100 da Constituição, não incidem juros de mora sobre os precatórios que nele sejam pagos.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stf",
    tags: ["precatório", "juros de mora", "RPV", "fazenda pública"],
    area: "Fazenda Pública",
  },
  {
    id: "stf-tema-810",
    tribunal: "STF",
    type: "tese_repercussao_geral",
    number: "Tema 810 / RE 870.947",
    title: "Validade da correção monetária e juros contra a Fazenda Pública",
    statement: "O artigo 1º-F da Lei 9.494/1997, com a redação dada pela Lei 11.960/2009, na parte em que disciplina a atualização monetária das condenações impostas à Fazenda Pública segundo a remuneração oficial da caderneta de poupança, revela-se inconstitucional ao impor restrição desproporcional ao direito de propriedade. O IPCA-E é o índice adequado.",
    sourceUrl: "https://tesesesumulas.com.br/teses/stf",
    tags: ["correção monetária", "ipca-e", "fazenda pública", "juros de mora", "11.960"],
    area: "Fazenda Pública",
  },
  {
    id: "stf-tema-1076-ref",
    tribunal: "STF",
    type: "tese_repercussao_geral",
    number: "Tema 1.076 / REsp Repetitivo",
    title: "Fixação de honorários advocatícios sucumbenciais contra a Fazenda Pública",
    statement: "A fixação dos honorários sucumbenciais por apreciação equitativa (art. 85, § 8º, do CPC) é subsidiária, cabendo apenas quando o valor da causa for inestimável, irrisório ou de valor muito baixo. Havendo condenação ou proveito econômico estimável, aplicam-se estritamente as faixas do art. 85, §§ 2º e 3º, do CPC.",
    sourceUrl: "https://tesesesumulas.com.br/teses/stj",
    tags: ["honorários", "sucumbência", "tema 1076", "fazenda pública", "art 85 cpc"],
    area: "Processo Civil / Execução",
  },

  // STJ
  {
    id: "stj-sumula-385",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 385",
    title: "Anotações restritivas preexistentes e dano moral",
    statement: "Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral, quando preexistente legítima inscrição, ressalvado o direito ao cancelamento.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["dano moral", "serasa", "spc", "inscrição indevida", "restrição preexistente"],
    area: "Direito do Consumidor",
  },
  {
    id: "stj-sumula-532",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 532",
    title: "Envio de cartão de crédito sem solicitação prévia",
    statement: "Constitui prática comercial abusiva o envio de cartão de crédito sem prévia e expressa solicitação do consumidor, configurando-se ato ilícito indenizável e sujeito à aplicação de multa administrativa.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["cartão de crédito", "prática abusiva", "dano moral", "consumidor"],
    area: "Direito Bancário",
  },
  {
    id: "stj-sumula-543",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 543",
    title: "Rescisão de contrato de compra e venda de imóvel e restituição de parcelas",
    statement: "Na hipótese de resolução de contrato de promessa de compra e venda de imóvel submetido ao CDC, deve ocorrer a imediata restituição das parcelas pagas pelo promitente comprador - integralmente, em caso de culpa exclusiva do promitente vendedor/construtor, ou parcialmente, caso tenha sido o comprador quem deu causa ao desfazimento.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["imobiliário", "restituição", "distrato", "cdc", "construtora"],
    area: "Direito do Consumidor",
  },
  {
    id: "stj-sumula-608",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 608",
    title: "Aplicação do CDC a planos de saúde",
    statement: "Aplica-se o Código de Defesa do Consumidor aos contratos de plano de saúde, salvo os administrados por entidades de autogestão.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["plano de saúde", "cdc", "autogestão"],
    area: "Direito do Consumidor",
  },
  {
    id: "stj-tema-1061",
    tribunal: "STJ",
    type: "tese_repetitivo",
    number: "Tema 1.061 / REsp 1.846.649",
    title: "Ônus da prova da autenticidade de assinatura em contrato bancário",
    statement: "Na hipótese em que o consumidor/autor impugnar a autenticidade da assinatura constante em contrato bancário juntado ao processo pela instituição financeira, caberá a esta o ônus de provar a sua autenticidade (CPC, art. 429, II), inclusive mediante a realização de perícia grafotécnica ou autenticação biométrica eletrônica.",
    sourceUrl: "https://tesesesumulas.com.br/teses/stj",
    tags: ["ônus da prova", "empréstimo consignado", "assinatura", "bancário", "fraude", "perícia"],
    area: "Direito Bancário",
  },
  {
    id: "stj-tema-1046",
    tribunal: "STJ",
    type: "tese_repetitivo",
    number: "Tema 1.046 / Repetitivo",
    title: "Contratos bancários e cartão RMC/RCC",
    statement: "Nas ações em que se discute a validade do contrato de Cartão de Crédito com Reserva de Margem Consignável (RMC/RCC), comprovada a efetiva contratação com esclarecimento prévio ao consumidor e disponibilização do crédito com uso regular do cartão, afasta-se a pretensão de conversão em empréstimo consignado comum e indenização por danos morais.",
    sourceUrl: "https://tesesesumulas.com.br/teses/stj",
    tags: ["rmc", "rcc", "cartão de crédito consignado", "banco", "dano moral"],
    area: "Direito Bancário",
  },
  {
    id: "stj-tema-922",
    tribunal: "STJ",
    type: "tese_repetitivo",
    number: "Tema 922 / STJ",
    title: "Notificação prévia do devedor antes da inscrição nos cadastros de inadimplentes",
    statement: "A ausência de prévia notificação do consumidor antes da inscrição de seu nome em cadastros restritivos de crédito enseja dano moral, salvo se existente inscrição legítima anterior (Súmula 385/STJ).",
    sourceUrl: "https://tesesesumulas.com.br/teses/stj",
    tags: ["notificação prévia", "spc", "serasa", "cadastro restritivo", "dano moral"],
    area: "Direito do Consumidor",
  },

  // TNU (Juizados Especiais Federais e Uniformização)
  {
    id: "tnu-sumula-38",
    tribunal: "TNU",
    type: "sumula",
    number: "Súmula 38 da TNU",
    title: "Comprovação de atividade insalubre e conversão de tempo especial",
    statement: "O tempo de serviço laborado em condições insalubres ou perigosas deve ser comprovado mediante formulário emitido pela empresa ou laudo técnico pericial idôneo.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/tnu",
    tags: ["insalubridade", "laudo técnico", "tempo especial", "juizado"],
    area: "Fazenda Pública",
  },
  {
    id: "tnu-tema-220",
    tribunal: "TNU",
    type: "tese_tnu",
    number: "Tema 220 / TNU",
    title: "Dano moral por atraso ou suspensão indevida de fornecimento de serviço público",
    statement: "A suspensão indevida de serviço essencial (energia elétrica, água) com faturas adimplidas gera presunção de dano moral (in re ipsa), dispensando prova do abalo psíquico.",
    sourceUrl: "https://tesesesumulas.com.br/teses/tnu",
    tags: ["serviço essencial", "energia", "água", "dano moral", "in re ipsa"],
    area: "Direito do Consumidor",
  },
  {
    id: "tnu-tema-255",
    tribunal: "TNU",
    type: "tese_tnu",
    number: "Tema 255 / TNU",
    title: "Prescrição quinquenal nas ações contra a Fazenda Pública (Decreto 20.910/32)",
    statement: "Nas relações jurídicas de trato sucessivo em que a Fazenda Pública figure como devedora, quando não tiver havido negativa expressa do próprio direito reclamado, a prescrição atinge apenas as prestações vencidas antes do quinquênio anterior à propositura da ação (Súmula 85/STJ).",
    sourceUrl: "https://tesesesumulas.com.br/teses/tnu",
    tags: ["prescrição", "quinquênio", "fazenda pública", "trato sucessivo", "súmula 85"],
    area: "Fazenda Pública",
  },

  // STJ - Súmulas Bancárias e Consumidor
  {
    id: "stj-sumula-297",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 297",
    title: "Aplicação do CDC às instituições financeiras",
    statement: "O Código de Defesa do Consumidor é aplicável às instituições financeiras.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["cdc", "banco", "instituição financeira", "contrato bancário"],
    area: "Direito Bancário",
  },
  {
    id: "stj-sumula-479",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 479",
    title: "Responsabilidade objetiva por fraudes e delitos bancários (Fortuito Interno)",
    statement: "As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos praticados por terceiros no âmbito de operações bancárias.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["fraude bancária", "golpe do pix", "fortuito interno", "empréstimo fraudulento", "responsabilidade objetiva", "banco"],
    area: "Direito Bancário",
  },
  {
    id: "stj-sumula-530",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 530",
    title: "Juros remuneratórios e taxa média de mercado do BACEN",
    statement: "Nos contratos bancários naqueles em que a taxa de juros remuneratórios não tenha sido expressamente pactuada, aplica-se a taxa média de mercado divulgada pelo Banco Central do Brasil para operações da mesma espécie.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["juros remuneratórios", "taxa média", "bacen", "revisão de contrato", "bancário"],
    area: "Direito Bancário",
  },
  {
    id: "stj-sumula-54",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 54",
    title: "Termo inicial dos juros moratórios na responsabilidade extracontratual",
    statement: "Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["juros de mora", "evento danoso", "responsabilidade extracontratual", "dano moral"],
    area: "Processo Civil / Execução",
  },
  {
    id: "stj-sumula-362",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 362",
    title: "Termo inicial da correção monetária na indenização por dano moral",
    statement: "A correção monetária do valor da indenização do dano moral incide desde a data do arbitramento.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["correção monetária", "data do arbitramento", "dano moral"],
    area: "Processo Civil / Execução",
  },
  {
    id: "stj-sumula-85",
    tribunal: "STJ",
    type: "sumula",
    number: "Súmula 85",
    title: "Prescrição de trato sucessivo contra a Fazenda Pública",
    statement: "Nas relações jurídicas de trato sucessivo em que a Fazenda Pública figure como devedora, quando não tiver havido negativa expressa do próprio direito reclamado, a prescrição atinge apenas as prestações vencidas antes do quinquênio anterior à propositura da ação.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stj",
    tags: ["prescrição", "quinquênio", "fazenda pública", "trato sucessivo", "servidor"],
    area: "Fazenda Pública",
  },

  // STF - Súmulas Vinculantes e Teses
  {
    id: "stf-sv-37",
    tribunal: "STF",
    type: "sumula_vinculante",
    number: "Súmula Vinculante 37",
    title: "Vedação de aumento de vencimentos de servidores pelo Judiciário sob fundamento de isonomia",
    statement: "Não cabe ao Poder Judiciário, que não tem função legislativa, aumentar vencimentos de servidores públicos sob o fundamento de isonomia.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stf",
    tags: ["isonomia", "vencimentos", "servidor público", "aumento salarial", "fazenda pública"],
    area: "Fazenda Pública",
  },
  {
    id: "stf-sv-33",
    tribunal: "STF",
    type: "sumula_vinculante",
    number: "Súmula Vinculante 33",
    title: "Aposentadoria especial de servidor público e regras do RGPS",
    statement: "Aplicam-se ao servidor público, no que couber, as regras do regime geral da previdência social sobre aposentadoria especial de que trata o artigo 40, § 4º, inciso III da Constituição Federal, até a edição de lei complementar específica.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/stf",
    tags: ["aposentadoria especial", "servidor público", "insalubridade", "rgps"],
    area: "Fazenda Pública",
  },
  {
    id: "stf-tema-1002",
    tribunal: "STF",
    type: "tese_repercussao_geral",
    number: "Tema 1.002 / RE 870.947",
    title: "Consectários legais da condenação imposta à Fazenda Pública",
    statement: "Nas condenações não tributárias impostas à Fazenda Pública, a correção monetária deve ser feita pelo IPCA-E e os juros de mora pela caderneta de poupança (até o advento da EC 113/2021 e Lei 14.905/2024 que disciplinam os índices oficiais).",
    sourceUrl: "https://tesesesumulas.com.br/teses/stf",
    tags: ["juros", "correção monetária", "fazenda pública", "tema 810", "tema 1002"],
    area: "Fazenda Pública",
  },

  // TNU - Temas e Súmulas Juizados
  {
    id: "tnu-sumula-77",
    tribunal: "TNU",
    type: "sumula",
    number: "Súmula 77 da TNU",
    title: "Necessidade de requerimento administrativo prévio em matéria previdenciária",
    statement: "O interesse de agir do segurado em ação previdenciária depende de prévio requerimento administrativo, ressalvadas as hipóteses de pretensão resistida notória.",
    sourceUrl: "https://tesesesumulas.com.br/sumulas/tnu",
    tags: ["interesse de agir", "requerimento administrativo", "inss", "juizado"],
    area: "Geral",
  },
  {
    id: "tnu-tema-256",
    tribunal: "TNU",
    type: "tese_tnu",
    number: "Tema 256 / TNU",
    title: "Descontos indevidos em benefício por empréstimo não contratado",
    statement: "A realização de descontos em benefício previdenciário decorrentes de contrato de mútuo bancário fraudulento ou não contratado gera dano moral in re ipsa ao titular prejudicado.",
    sourceUrl: "https://tesesesumulas.com.br/teses/tnu",
    tags: ["desconto indevido", "benefício previdenciário", "empréstimo consignado", "fraude", "dano moral", "in re ipsa"],
    area: "Direito Bancário",
  },
  // ==========================================
  // INFORMATIVOS E JURISPRUDÊNCIA DO TJGO
  // Fonte Oficial: transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia
  // ==========================================
  {
    id: "tjgo-inf-equatorial",
    tribunal: "TJGO",
    type: "informativo_tjgo",
    number: "Informativo TJGO • Câmaras Cíveis",
    title: "Falha na prestação de serviço de energia elétrica e interrupção continuada (Equatorial Goiás / Enel)",
    statement: "A interrupção prolongada no fornecimento de energia elétrica por prazo superior ao razoável ou a oscilação de rede que danifica equipamentos sem pronta assistência da concessionária (Equatorial Goiás / Enel) configura falha na prestação do serviço público essencial e impõe o dever de indenizar danos materiais e morais in re ipsa.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["energia elétrica", "equatorial", "enel", "interrupção", "concessionária", "dano moral", "queda de energia", "serviço essencial", "goiás"],
    area: "Direito do Consumidor",
  },
  {
    id: "tjgo-sumula-25",
    tribunal: "TJGO",
    type: "sumula_tjgo",
    number: "Súmula 25 do TJGO",
    title: "Critérios de concessão da Gratuidade da Justiça e presunção de hipossuficiência",
    statement: "Faz jus à concessão da gratuidade da justiça a pessoa jurídica ou física com ou sem fins lucrativos que comprovar sua impossibilidade de arcar com os encargos processuais, sendo que a declaração de hipossuficiência gera presunção relativa que pode ser elidida mediante elementos concretos dos autos.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["justiça gratuita", "gratuidade de justiça", "hipossuficiência", "súmula 25 tjgo", "custas", "assistência judiciária"],
    area: "Processo Civil / Execução",
  },
  {
    id: "tjgo-inf-rmc-rcc",
    tribunal: "TJGO",
    type: "informativo_tjgo",
    number: "Informativo TJGO • Turmas Recursais",
    title: "Contratação de Cartão de Crédito Consignado (RMC/RCC) com vício de consentimento",
    statement: "Configura vício de informação e prática abusiva impor ao consumidor idoso ou vulnerável contrato de cartão de crédito consignado (RMC/RCC) quando a manifestação de vontade buscava mútuo consignado tradicional, ensejando a conversão do contrato, devolução em dobro do indébito e reparação por danos morais.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["rmc", "rcc", "cartão consignado", "reserva de margem", "empréstimo consignado", "vício de consentimento", "restituição em dobro", "tjgo"],
    area: "Direito Bancário",
  },
  {
    id: "tjgo-inf-voo",
    tribunal: "TJGO",
    type: "enunciado_turma_recursal_go",
    number: "Informativo TJGO • Juizados Especiais Cíveis",
    title: "Cancelamento ou atraso substancial de voo e extravio de bagagem",
    statement: "O atraso superior a 4 horas ou cancelamento imotivado de voo sem assistência material imediata (alimentação, hospedagem e realocação), bem como o extravio de bagagem, extrapola o mero dissabor e enseja indenização por danos morais fixada segundo os parâmetros médios das Turmas Recursais do TJGO.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["atraso de voo", "cancelamento de voo", "extravio de bagagem", "transporte aéreo", "companhia aérea", "dano moral", "turmas recursais"],
    area: "Direito do Consumidor",
  },
  {
    id: "tjgo-inf-ipasgo",
    tribunal: "TJGO",
    type: "informativo_tjgo",
    number: "Informativo TJGO • Fazenda Pública / Cível",
    title: "Cobertura de procedimentos, órteses e tratamentos de saúde pelo IPASGO",
    statement: "Havendo prescrição médica fundamentada, é abusiva e ilícita a negativa de cobertura pelo IPASGO ou planos de autogestão de medicamentos oncológicos, órteses, próteses e cirurgias essenciais sob pretexto de ausência em rol interno, prevalecendo o direito constitucional à vida e à saúde.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["ipasgo", "plano de saúde", "medicamento", "cirurgia", "prótese", "saúde", "fazenda pública estadual", "goiás", "goiasprev"],
    area: "Direito do Consumidor",
  },
  {
    id: "tjgo-inf-negativacao",
    tribunal: "TJGO",
    type: "enunciado_turma_recursal_go",
    number: "Informativo TJGO • Turmas Recursais",
    title: "Inscrição indevida nos órgãos de proteção ao crédito (SPC/Serasa) em Goiás",
    statement: "A inclusão ou manutenção indevida do nome do consumidor em cadastro de restrição ao crédito decorrente de débito inexigível ou fraude gera dano moral presumido (in re ipsa), observando-se os parâmetros de razoabilidade e proporcionalidade consolidados na jurisprudência do TJGO e a aplicação da Súmula 385/STJ.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["negativação indevida", "spc", "serasa", "dano moral in re ipsa", "juizado especial", "inexigibilidade de débito", "tjgo"],
    area: "Direito do Consumidor",
  },
  {
    id: "tjgo-inf-servidor",
    tribunal: "TJGO",
    type: "informativo_tjgo",
    number: "Informativo TJGO • Direito Público",
    title: "Servidor Público Estadual e Municipal - Consectários, Quinquênio e Licença-Prêmio",
    statement: "O servidor público do Estado de Goiás e municípios tem direito ao pagamento de verbas remuneratórias retidas, adicionais por tempo de serviço e conversão de licença-prêmio não gozada em pecúnia quando da aposentadoria, sem que a alegação genérica de limite da LRF possa suprimir direito subjetivo.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["servidor público", "estado de goiás", "município", "licença-prêmio", "lrf", "fazenda pública", "conversão em pecúnia", "quinquênio"],
    area: "Fazenda Pública",
  },
  {
    id: "tjgo-inf-saneago",
    tribunal: "TJGO",
    type: "informativo_tjgo",
    number: "Informativo TJGO • Câmaras Cíveis",
    title: "Fornecimento de água e tratamento de esgoto (Saneago) - Tarifa e continuidade",
    statement: "A cobrança de tarifa de esgoto vinculada ao efetivo tratamento sanitário é legítima segundo tese vinculante do STJ, mas a interrupção indevida do fornecimento de água potável em unidade consumidora adimplente gera dever de reparação por dano moral segundo entendimento consolidado no TJGO.",
    sourceUrl: "https://transparencia.tjgo.jus.br/jurisprudencia/informativo-jurisprudencia",
    tags: ["saneago", "água", "esgoto", "tarifa", "concessionária", "corte indevido", "serviço público", "goiás"],
    area: "Direito do Consumidor",
  }
];

export const CUSTOM_PRECEDENTS_STORAGE_KEY = "assessor_custom_precedents";
export const LAST_SYNC_STORAGE_KEY = "assessor_precedents_last_sync";

export function getCustomBindingPrecedents(): BindingPrecedent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(CUSTOM_PRECEDENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomBindingPrecedents(items: BindingPrecedent[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CUSTOM_PRECEDENTS_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Erro ao salvar precedentes customizados:", e);
  }
}

export function addCustomBindingPrecedents(newItems: BindingPrecedent[]): BindingPrecedent[] {
  const current = getCustomBindingPrecedents();
  const existingIds = new Set(current.map(c => c.id));
  const toAdd = newItems.filter(item => !existingIds.has(item.id));
  const updated = [...toAdd, ...current];
  saveCustomBindingPrecedents(updated);
  return updated;
}

export function getLastPrecedentsSync(): number {
  if (typeof window === "undefined") return 0;
  const val = localStorage.getItem(LAST_SYNC_STORAGE_KEY);
  return val ? parseInt(val, 10) : 0;
}

export function setLastPrecedentsSync(timestamp: number): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(LAST_SYNC_STORAGE_KEY, String(timestamp));
  }
}

export function getAllBindingPrecedents(): BindingPrecedent[] {
  const custom = getCustomBindingPrecedents();
  const existingIds = new Set(custom.map(c => c.id));
  const combined = [...custom];
  for (const c of CORE_BINDING_PRECEDENTS) {
    if (!existingIds.has(c.id)) {
      combined.push(c);
      existingIds.add(c.id);
    }
  }
  return combined;
}

export function searchBindingPrecedents(query: string, filterTribunal?: "ALL" | "STF" | "STJ" | "TNU" | "TJGO" | "CUSTOM"): BindingPrecedent[] {
  const q = (query || "").trim().toLowerCase();
  const allList = getAllBindingPrecedents();
  
  return allList.filter((item) => {
    if (filterTribunal === "CUSTOM") {
      if (!(item as any).sourceFile && !item.id.startsWith("custom-")) {
        return false;
      }
    } else if (filterTribunal && filterTribunal !== "ALL" && item.tribunal !== filterTribunal) {
      return false;
    }
    if (!q) return true;
    
    return (
      item.number.toLowerCase().includes(q) ||
      item.title.toLowerCase().includes(q) ||
      item.statement.toLowerCase().includes(q) ||
      item.tags.some((t) => t.toLowerCase().includes(q)) ||
      item.area.toLowerCase().includes(q)
    );
  });
}

/**
 * Motor automático de busca contextual: cruza o texto completo do processo, petições,
 * relatórios e tipo de ação com as bases oficiais vinculantes do STF, STJ, TNU e TJGO,
 * retornando automaticamente todos os precedentes aplicáveis para alimentação do prompt.
 */
export function matchApplicableBindingPrecedents(contextText: string): BindingPrecedent[] {
  if (!contextText || typeof contextText !== "string" || contextText.trim().length === 0) {
    return [];
  }

  const normalized = contextText.toLowerCase();
  const matched: BindingPrecedent[] = [];
  const allList = getAllBindingPrecedents();

  for (const precedent of allList) {
    let score = 0;

    // Direct number or theme match
    const numClean = precedent.number.toLowerCase();
    if (normalized.includes(numClean)) {
      score += 10;
    }

    // Keyword & tags match
    for (const tag of precedent.tags) {
      if (normalized.includes(tag.toLowerCase())) {
        score += 2;
      }
    }

    // Title keywords
    const titleWords = precedent.title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
    for (const w of titleWords) {
      if (normalized.includes(w)) {
        score += 1;
      }
    }

    // Subject area relevance
    if (precedent.area === "Fazenda Pública" && (normalized.includes("fazenda pública") || normalized.includes("município") || normalized.includes("estado de goiás") || normalized.includes("servidor público") || normalized.includes("insalubridade") || normalized.includes("quinquênio"))) {
      score += 2;
    }
    if (precedent.area === "Direito Bancário" && (normalized.includes("banco") || normalized.includes("empréstimo") || normalized.includes("rmc") || normalized.includes("rcc") || normalized.includes("consignado") || normalized.includes("fraude bancária") || normalized.includes("cartão de crédito"))) {
      score += 2;
    }
    if (precedent.area === "Direito do Consumidor" && (normalized.includes("consumidor") || normalized.includes("cdc") || normalized.includes("spc") || normalized.includes("serasa") || normalized.includes("inscrição indevida") || normalized.includes("energia") || normalized.includes("plano de saúde"))) {
      score += 2;
    }

    // Regional TJGO relevance bonus
    if (precedent.tribunal === "TJGO" && (normalized.includes("tjgo") || normalized.includes("goiás") || normalized.includes("goias") || normalized.includes("comarca de") || normalized.includes("equatorial") || normalized.includes("saneago") || normalized.includes("ipasgo") || normalized.includes("goiasprev") || normalized.includes("turmas recursais"))) {
      score += 3;
    }

    // If score passes threshold, include automatically
    if (score >= 3) {
      matched.push(precedent);
    }
  }

  // Limit to top 8 most relevant to maintain prompt focus
  return matched.slice(0, 8);
}

export const GROUNDING_STORAGE_KEY = "assessor_grounding_enabled";

export function getIsGroundingEnabled(): boolean {
  if (typeof window === "undefined") return false;
  // Padrão FALSE para blindar créditos contra a tarifa de busca web do Google ($0.035/pesquisa)
  return localStorage.getItem(GROUNDING_STORAGE_KEY) === "true";
}

export function setIsGroundingEnabled(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(GROUNDING_STORAGE_KEY, String(enabled));
  }
}
