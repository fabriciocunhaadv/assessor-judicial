export interface LegalFramework {
  id: string;
  name: string;
  category: string;
  keywords: string[];
  principaisLeis: {
    diploma: string; // Ex: "Lei nº 14.905/2024", "Lei nº 8.078/1990 (CDC)"
    artigosChave: string; // Ex: "Arts. 389 e 406 do CC"
    objeto: string; // Ex: "Novo regime de juros legais e correção monetária pelo IPCA e Selic"
  }[];
  regimeCorrecao: {
    indiceCorrecao: string; // Ex: "IPCA (IBGE)"
    termoInicialCorrecao: string; // Ex: "Dano Material: efetivo prejuízo (Súmula 43/STJ); Dano Moral: arbitramento (Súmula 362/STJ)"
    indiceJuros: string; // Ex: "Taxa Selic deduzida da taxa do IPCA (art. 406, § 1º, CC)"
    termoInicialJuros: string; // Ex: "Extracontratual: evento danoso (Súmula 54/STJ); Contratual: citação (art. 405/CC)"
    baseLegalCompleta: string; // Ex: "Lei nº 14.905/2024 c/c Arts. 389, 397, 405 e 406 do CC/2002 e Súmulas 43, 54 e 362 do STJ"
    observacoes: string;
  };
  sumulasEPrecedentes: string[];
  clausulaDispositivoPadrao: string;
}

export const LEGAL_FRAMEWORKS: LegalFramework[] = [
  {
    id: "civil-geral",
    name: "Obrigações Civis Gerais & Responsabilidade Civil (Lei nº 14.905/2024)",
    category: "Direito Civil & Obrigações",
    keywords: [
      "inadimplemento",
      "perdas e danos",
      "responsabilidade civil",
      "ato ilicito",
      "dano moral",
      "dano material",
      "obrigacao de pagar",
      "indenizacao",
      "contrato",
      "clausula penal",
      "acidente de transito",
    ],
    principaisLeis: [
      {
        diploma: "Lei Federal nº 14.905/2024",
        artigosChave: "Altera arts. 389, 395, 404 e 406 do Código Civil",
        objeto: "Uniformização da atualização monetária pelo IPCA e dos juros moratórios pela Taxa Selic deduzida do IPCA.",
      },
      {
        diploma: "Código Civil Brasileiro (Lei nº 10.406/2002)",
        artigosChave: "Arts. 186, 927, 389, 397, 405 e 406",
        objeto: "Dever de indenizar por ato ilícito e disciplina do inadimplemento das obrigações contratuais e extracontratuais.",
      },
      {
        diploma: "Código de Processo Civil (Lei nº 13.105/2015)",
        artigosChave: "Arts. 141, 322, 491 e 492",
        objeto: "Adstrição aos pedidos e fixação líquida de juros e correção monetária no comando judicial.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "IPCA (Índice Nacional de Preços ao Consumidor Amplo - IBGE)",
      termoInicialCorrecao: "Dano Material: data do efetivo prejuízo/desembolso (Súmula 43/STJ); Dano Moral: data do arbitramento/sentença (Súmula 362/STJ); Obrigação líquida: data do vencimento (art. 397/CC).",
      indiceJuros: "Taxa referencial Selic deduzida do índice de atualização monetária (IPCA) acumulado no período (art. 406, § 1º, do CC c/c Lei 14.905/2024).",
      termoInicialJuros: "Responsabilidade Extracontratual: data do evento danoso (Súmula 54/STJ); Responsabilidade Contratual Iíquida: data da citação (art. 405/CC); Obrigação Líquida com termo certo: data do vencimento (art. 397/CC).",
      baseLegalCompleta: "Lei nº 14.905/2024, arts. 389, 397, 405 e 406 do Código Civil, e Súmulas 43, 54 e 362 do Superior Tribunal de Justiça.",
      observacoes: "Caso a taxa Selic seja inferior ao IPCA no mês de referência, a taxa de juros de mora será considerada nula (0%), vedada a taxa de juros negativa (art. 406, § 3º, CC).",
    },
    sumulasEPrecedentes: [
      "Súmula 43/STJ: Incide correção monetária sobre dívida por ato ilícito a partir da data do efetivo prejuízo.",
      "Súmula 54/STJ: Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual.",
      "Súmula 362/STJ: A correção monetária do valor da indenização do dano moral incide desde a data do arbitramento.",
    ],
    clausulaDispositivoPadrao: "Sobre o montante condenatório incidirá correção monetária calculada pelo IPCA (IBGE), a partir [do efetivo prejuízo - Súmula 43/STJ | do arbitramento - Súmula 362/STJ], e juros de mora equivalentes à Taxa Selic deduzida da taxa do IPCA, a contar [do evento danoso - Súmula 54/STJ | da citação - art. 405 do CC], nos estritos termos do art. 406 do Código Civil com a redação dada pela Lei Federal nº 14.905/2024.",
  },
  {
    id: "consumidor-cdc",
    name: "Relações de Consumo & Fornecimento de Produtos/Serviços (CDC)",
    category: "Direito do Consumidor",
    keywords: [
      "consumidor",
      "fornecedor",
      "vicio do produto",
      "defeito do servico",
      "inscricao indevida",
      "negativacao",
      "spc",
      "serasa",
      "falha na prestacao",
      "restituicao em dobro",
      "art. 42",
      "inversao do onus da prova",
      "desvio produtivo",
      "venda casada",
    ],
    principaisLeis: [
      {
        diploma: "Código de Defesa do Consumidor (Lei nº 8.078/1990)",
        artigosChave: "Arts. 2º, 3º, 6º, VI e VIII, 14, 18, 20, 39, 42, parágrafo único, e 51",
        objeto: "Responsabilidade objetiva do fornecedor, reparação integral de danos materiais e morais, repetição de indébito e inversão do ônus probatório.",
      },
      {
        diploma: "Decreto Presidencial nº 11.034/2022",
        artigosChave: "Regulamento do SAC",
        objeto: "Normas sobre atendimento ao consumidor, canais de cancelamento e tempo de resposta.",
      },
      {
        diploma: "Lei nº 14.905/2024 c/c Código Civil",
        artigosChave: "Arts. 389 e 406 do CC",
        objeto: "Consectários legais nas indenizações consumeristas fixadas em juízo.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "IPCA (IBGE) para indenizações e repetições de indébito cíveis.",
      termoInicialCorrecao: "Dano Material e Repetição de Indébito: data do desembolso indevido (Súmula 43/STJ); Dano Moral por negativação indevida ou desvio produtivo: data do arbitramento (Súmula 362/STJ).",
      indiceJuros: "Taxa Selic deduzida da taxa do IPCA (art. 406, § 1º, CC com redação da Lei nº 14.905/2024).",
      termoInicialJuros: "Extracontratual puro (fraude/negativação de não-cliente): evento danoso (Súmula 54/STJ); Ilícito Contratual (cobrança indevida de cliente contratante): citação válida (art. 405/CC).",
      baseLegalCompleta: "Lei nº 8.078/1990 (CDC), Lei nº 14.905/2024, Arts. 186, 389, 405 e 406 do CC, e Súmulas 43, 54, 362 e 385 do STJ.",
      observacoes: "Em caso de repetição de indébito (art. 42, parágrafo único, do CDC), a devolução em dobro pressupõe conduta contrária à boa-fé objetiva (Tema 929/STJ - EAREsp 600.663/RS).",
    },
    sumulasEPrecedentes: [
      "Súmula 385/STJ: Da anotação irregular em cadastro de proteção ao crédito, não cabe indenização por dano moral quando preexistente legítima inscrição.",
      "Súmula 479/STJ: As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos praticados por terceiros.",
      "Tema 929/STJ (EAREsp 600.663/RS): A repetição em dobro do indébito independe da comprovação de má-fé, bastando que a conduta do fornecedor viole a boa-fé objetiva.",
    ],
    clausulaDispositivoPadrao: "CONDENAR a parte promovida ao pagamento de indenização por danos materiais no valor de R$ [Valor], corrigido monetariamente pelo IPCA desde a data do efetivo desembolso (Súmula 43/STJ) e com juros de mora (Selic deduzida do IPCA) a partir da citação (art. 405/CC), bem como ao pagamento de danos morais de R$ [Valor], com correção monetária pelo IPCA a contar desta sentença (Súmula 362/STJ) e juros de mora (Selic deduzida do IPCA) a contar da citação, nos termos da Lei nº 14.905/2024.",
  },
  {
    id: "fazenda-publica",
    name: "Condenações Contra a Fazenda Pública (EC 113/2021 & Temas 810/STF e 905/STJ)",
    category: "Direito Administrativo & Fazendário",
    keywords: [
      "fazenda publica",
      "estado de goias",
      "municipio",
      "ipasp",
      "goiasprev",
      "servidor publico",
      "quinquenio",
      "adicional noturno",
      "licenca premio",
      "desapropriacao",
      "responsabilidade do estado",
      "execucao contra a fazenda",
      "preparatorio",
      "requisitório",
      "rpv",
      "precatorio",
    ],
    principaisLeis: [
      {
        diploma: "Emenda Constitucional nº 113/2021",
        artigosChave: "Art. 3º",
        objeto: "Nas discussões e condenações que envolvam a Fazenda Pública, independentemente da natureza, incidirá a Taxa Selic única para fins de atualização monetária e juros moratórios a partir de 09/12/2021.",
      },
      {
        diploma: "Lei Federal nº 9.494/1997 c/c Lei nº 11.960/2009",
        artigosChave: "Art. 1º-F",
        objeto: "Disciplina os consectários legais em condenações da Fazenda Pública antes da EC 113/2021.",
      },
      {
        diploma: "Lei Federal nº 12.153/2009",
        artigosChave: "Arts. 2º e 5º",
        objeto: "Dispõe sobre os Juizados Especiais da Fazenda Pública no âmbito dos Estados, DF e Municípios.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "A partir de 09/12/2021 (EC nº 113/2021, art. 3º): Taxa Selic consolidada (englobando correção monetária e juros de mora). Para períodos anteriores a 09/12/2021: IPCA-E para condenações não tributárias (Tema 810/STF e Tema 905/STJ).",
      termoInicialCorrecao: "Parcelas remuneratórias vencidas: desde a data em que cada verba deveria ter sido adimplida. Indenizações por dano moral: a partir do arbitramento.",
      indiceJuros: "A partir de 09/12/2021: Selic unificada (EC 113/2021). Períodos anteriores: remuneração oficial da caderneta de poupança (art. 1º-F da Lei 9.494/97 com redação da Lei 11.960/2009).",
      termoInicialJuros: "A partir da citação válida (art. 240 do CPC e art. 405 do CC) ou vencimento de cada parcela remuneratória conforme regime anterior.",
      baseLegalCompleta: "Art. 3º da Emenda Constitucional nº 113/2021, Art. 1º-F da Lei nº 9.494/97 (com redação da Lei nº 11.960/2009), e Teses dos Temas 810 do STF (RE 870.947) e 905 do STJ (REsp 1.495.146/MG).",
      observacoes: "A Selic da EC nº 113/2021 não pode ser cumulada com outro índice de correção monetária ou outros juros moratórios para evitar bis in idem.",
    },
    sumulasEPrecedentes: [
      "Tema 810/STF (RE 870.947): O art. 1º-F da Lei 9.494/97, na parte em que disciplina a atualização monetária das condenações impostas à Fazenda Pública segundo a TR, é inconstitucional, aplicando-se o IPCA-E.",
      "Tema 905/STJ: Consolidação dos índices de correção monetária e juros de mora aplicáveis às condenações impostas à Fazenda Pública segundo a natureza da dívida (servidores, benefícios previdenciários, tributárias e desapropriações).",
      "Súmula Vinculante 17/STF: Durante o período previsto no § 1º do art. 100 da CF, não incidem juros de mora sobre os precatórios.",
    ],
    clausulaDispositivoPadrao: "CONDENAR o ente público ao pagamento das diferenças apuradas, incidindo, para os valores devidos até 08/12/2021, correção monetária pelo IPCA-E desde o vencimento de cada parcela (Tema 810/STF) e juros de mora pelos índices da caderneta de poupança a contar da citação (art. 1º-F da Lei 9.494/97 c/c Tema 905/STJ), e, a partir de 09/12/2021, exclusivamente a Taxa Referencial Selic, em índice único que engloba correção monetária e juros de mora, nos termos do art. 3º da Emenda Constitucional nº 113/2021.",
  },
  {
    id: "titulos-credito-cheque",
    name: "Títulos de Crédito & Cheques (Lei nº 7.357/1985 & Súmulas STJ/STF)",
    category: "Direito Empresarial & Cambiário",
    keywords: [
      "cheque",
      "titulo de credito",
      "execucao de titulo extrajudicial",
      "acao monitoria",
      "acao de cobranca de cheque",
      "alinea 11",
      "alinea 12",
      "sem fundos",
      "endosso",
      "cambial",
      "sacado",
      "sacador",
      "apresentacao",
    ],
    principaisLeis: [
      {
        diploma: "Lei Federal nº 7.357/1985 (Lei do Cheque)",
        artigosChave: "Arts. 32, 33, 47, 52, 59 e 61",
        objeto: "Disciplina a emissão, apresentação, prazos de prescrição executiva (6 meses após prazo de apresentação), ação monitória (5 anos) e juros legais cambiários.",
      },
      {
        diploma: "Código de Processo Civil (Lei nº 13.105/2015)",
        artigosChave: "Arts. 784, I, 786 e 700 a 702",
        objeto: "Execução por quantia certa de título extrajudicial e Ação Monitória.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "IPCA (IBGE) para ações ajuizadas/concluídas sob a égide da Lei nº 14.905/2024 ou índice pactuado.",
      termoInicialCorrecao: "Data da emissão estampada na cártula do cheque (Súmula 600 do STF e Súmula 503 do STJ).",
      indiceJuros: "Taxa Selic deduzida da taxa do IPCA (art. 406, § 1º, CC e Lei nº 14.905/2024) ou 1% a.m. para períodos pretéritos à lei.",
      termoInicialJuros: "Data da 1ª apresentação à câmara de compensação ou ao banco sacado (Súmula 503/STJ e art. 52, II, da Lei 7.357/85), ou a partir da citação se ausente comprovação da data de apresentação.",
      baseLegalCompleta: "Lei nº 7.357/1985 (art. 52, II), Súmula 600 do STF, Súmulas 503 e 504 do STJ, e Lei Federal nº 14.905/2024.",
      observacoes: "O termo inicial da correção monetária na cobrança ou execução de cheque é a data de emissão, e dos juros de mora é a data da primeira apresentação, mesmo em sede de ação monitória ou cobrança causal.",
    },
    sumulasEPrecedentes: [
      "Súmula 503/STJ: O prazo para ajuizamento de ação monitória em face do emitente de cheque sem força executiva é de 5 anos a contar do dia seguinte à data de emissão estampada na cártula.",
      "Súmula 600/STF: Cabe ação executiva contra o emitente de cheque e seus avalistas, incidindo correção monetária a partir da emissão.",
      "Súmula 504/STJ: O prazo para ajuizamento de ação monitória em face do emitente de nota promissória sem força executiva é de 5 anos a contar do dia seguinte ao vencimento.",
    ],
    clausulaDispositivoPadrao: "CONDENAR o emitente ao pagamento do valor nominal estampado no cheque (R$ [Valor]), acrescido de correção monetária pelo IPCA calculada a contar da data de emissão da cártula (Súmula 600 do STF) e juros de mora (Taxa Selic deduzida do IPCA) a partir da data da primeira apresentação ao banco sacado (art. 52, II, da Lei nº 7.357/1985 c/c Súmula 503/STJ e Lei nº 14.905/2024).",
  },
  {
    id: "contratos-bancarios-sfn",
    name: "Contratos Bancários & Sistema Financeiro Nacional (SFN)",
    category: "Direito Bancário",
    keywords: [
      "banco",
      "instituicao financeira",
      "emprestimo consignado",
      "cartao rmc",
      "rcc",
      "financiamento de veiculo",
      "taxa de juros remuneratorios",
      "capitalizacao de juros",
      "anatocismo",
      "comissao de permanencia",
      "tarifa de cadastro",
      "taxa media de mercado",
      "bacen",
      "cedula de credito bancario",
      "ccb",
    ],
    principaisLeis: [
      {
        diploma: "Lei Federal nº 4.595/1964",
        artigosChave: "Arts. 4º, IX, e 9º",
        objeto: "Disciplina o Sistema Financeiro Nacional e afasta a limitação de juros da Lei de Usura para instituições financeiras integrantes do SFN.",
      },
      {
        diploma: "Medida Provisória nº 2.170-36/2001",
        artigosChave: "Art. 5º",
        objeto: "Permite a capitalização de juros com periodicidade inferior a um ano nas operações realizadas pelas instituições do SFN desde que expressamente pactuada.",
      },
      {
        diploma: "Lei Federal nº 10.931/2004",
        artigosChave: "Arts. 26 a 29",
        objeto: "Institui a Cédula de Crédito Bancário (CCB) como título executivo extrajudicial representativo de dívida líquida e certa.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "Índice expressamente pactuado no contrato bancário (IPCA, INPC ou IGP-M) ou IPCA na ausência de estipulação.",
      termoInicialCorrecao: "Data do inadimplemento ou data do desembolso em caso de repetição de indébito de tarifas ilegais.",
      indiceJuros: "Juros remuneratórios contratados (válidos desde que não superem substancialmente 1,5x a Taxa Média de Mercado divulgada pelo BACEN na data da contratação - Tema 233/STJ). Juros moratórios limitados a 1% a.m. ou Selic nos termos do contrato e da lei.",
      termoInicialJuros: "Mora ex re (vencimento de cada prestação da CCB) ou citação para obrigações de repetição/indenização.",
      baseLegalCompleta: "Lei nº 4.595/1964, MP 2.170-36/2001, Lei nº 10.931/2004, Súmulas 297, 381, 538, 539, 541 e 565 do STJ.",
      observacoes: "É vedado ao magistrado conhecer de ofício da abusividade das cláusulas nos contratos bancários (Súmula 381/STJ). Tarifa de abertura de crédito (TAC) e emissão de carnê (TEC) são válidas apenas em contratos anteriores a 30/04/2008 (Súmula 565/STJ).",
    },
    sumulasEPrecedentes: [
      "Súmula 297/STJ: O Código de Defesa do Consumidor é aplicável às instituições financeiras.",
      "Súmula 381/STJ: Nos contratos bancários, é vedado ao julgador conhecer, de ofício, da abusividade das cláusulas.",
      "Súmula 539/STJ: É permitida a capitalização de juros com periodicidade inferior à anual em contratos celebrados com instituições do SFN após 31/3/2000, desde que expressamente pactuada.",
      "Súmula 541/STJ: A previsão no contrato bancário de taxa de juros anual superior ao duodécuplo da taxa mensal é suficiente para permitir a cobrança da taxa efetiva anual contratada.",
    ],
    clausulaDispositivoPadrao: "LIMITAR os juros remuneratórios pactuados à taxa média de mercado divulgada pelo Banco Central do Brasil para a respectiva operação na data da contratação, determinando o recálculo do saldo devedor e a repetição simples/compensação dos valores pagos a maior, corrigidos pelo IPCA desde cada desembolso e acrescidos de juros de mora (Selic deduzida do IPCA) a partir da citação (art. 405 do Código Civil e Lei nº 14.905/2024).",
  },
  {
    id: "mutuo-particular-usura",
    name: "Mútuo Entre Particulares & Vedação da Usura/Agiotagem",
    category: "Direito Civil & Mútuo",
    keywords: [
      "mutuo",
      "emprestimo entre particulares",
      "agiotagem",
      "usura",
      "nota promissoria de agiota",
      "juros abusivos",
      "5% ao mes",
      "10% ao mes",
      "extorsao",
      "decreto 22626",
      "inversao do onus",
    ],
    principaisLeis: [
      {
        diploma: "Decreto Presidencial nº 22.626/1933 (Lei de Usura)",
        artigosChave: "Arts. 1º, 4º e 11",
        objeto: "Proíbe estipular em contratos civis taxas de juros superiores ao dobro da taxa legal e veda o anatocismo fora das hipóteses legais.",
      },
      {
        diploma: "Medida Provisória nº 2.172-32/2001",
        artigosChave: "Arts. 1º e 3º",
        objeto: "Declara a nulidade de pleno direito de cláusulas de mútuo usurário e determina a inversão do ônus da prova contra o credor quando demonstrada a verossimilhança da agiotagem.",
      },
      {
        diploma: "Código Civil Brasileiro (Lei nº 10.406/2002)",
        artigosChave: "Arts. 586 a 592 (Mútuo) e Art. 591",
        objeto: "Regulamenta o contrato de mútuo feneratício entre pessoas naturais e os limites dos juros remuneratórios e moratórios.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "IPCA (IBGE) a partir da data de vencimento da dívida ou da apuração do montante líquido.",
      termoInicialCorrecao: "Data de vencimento da obrigação líquida (art. 397/CC).",
      indiceJuros: "Decote do excesso usurário (taxas extorsivas de 3%, 5%, 10% a.m.) para fixar a taxa legal máxima permitida: Taxa Selic / juros legais civis nos termos do art. 591 e art. 406 do CC c/c Lei 14.905/2024.",
      termoInicialJuros: "Data de vencimento estipulada para a restituição do capital principal mutuado.",
      baseLegalCompleta: "Decreto nº 22.626/1933 (Lei de Usura), MP nº 2.172-32/2001, Arts. 591 e 406 do Código Civil, e Lei nº 14.905/2024.",
      observacoes: "Havendo indícios verossímeis de agiotagem (ex: manuscritos com cobrança de juros de 5% a 10% a.m.), o magistrado deve inverter o ônus probatório (art. 3º da MP 2.172-32/2001) e decotar a cobrança ao capital principal mais juros legais civis, vedada a capitalização.",
    },
    sumulasEPrecedentes: [
      "Súmula 121/STF: É vedada a capitalização de juros, ainda que expressamente convencionada (incidência da Lei de Usura sobre mútuo entre particulares).",
    ],
    clausulaDispositivoPadrao: "DECLARAR a nulidade parcial do negócio jurídico em relação às taxas usurárias cobradas, DECOTANDO os juros pactuados acima dos limites legais para fixar o saldo devedor adstrito ao capital mutuado originalmente, corrigido monetariamente pelo IPCA e acrescido de juros de mora legais (Selic deduzida do IPCA nos termos do art. 406 do CC e Lei nº 14.905/2024), a contar do vencimento da obrigação.",
  },
  {
    id: "locacao-urbana",
    name: "Locação de Imóveis Urbanos & Despejo (Lei nº 8.245/1991)",
    category: "Direito Imobiliário & Locatício",
    keywords: [
      "locacao",
      "locador",
      "locatario",
      "fiador",
      "aluguel",
      "despejo por falta de pagamento",
      "cobranca de alugueis",
      "purga da mora",
      "lei do inquilinato",
      "multa rescisoria",
      "desocupacao",
      "imovel residencial",
      "imovel comercial",
    ],
    principaisLeis: [
      {
        diploma: "Lei Federal nº 8.245/1991 (Lei do Inquilinato)",
        artigosChave: "Arts. 9º, 23, 59, 62 e 63",
        objeto: "Disciplina os direitos e deveres do locador e locatário, a rescisão contratual, ação de despejo e cobrança cumulada de alugueres e encargos acessórios.",
      },
      {
        diploma: "Código Civil Brasileiro (Lei nº 10.406/2002)",
        artigosChave: "Arts. 397, 413, 818 a 839 (Fiança)",
        objeto: "Mora ex re nos aluguéis com vencimento certo, proporcionalidade da cláusula penal rescisória e responsabilidade solidária do fiador.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "Índice de reajuste previsto no contrato de locação (IGP-M, IPCA, INPC) ou IPCA na ausência de cláusula expressa.",
      termoInicialCorrecao: "Data de vencimento de cada aluguel e encargo acessório (IPTU, condomínio, água e energia) inadimplido.",
      indiceJuros: "Juros de mora moratórios pactuados (geralmente 1% ao mês) ou Taxa Selic deduzida do IPCA nos termos do art. 406 do CC e Lei nº 14.905/2024.",
      termoInicialJuros: "Data de vencimento de cada parcela locatícia em mora (mora ex re - art. 397 do Código Civil).",
      baseLegalCompleta: "Lei nº 8.245/1991, Arts. 397 e 406 do Código Civil, e Lei Federal nº 14.905/2024.",
      observacoes: "A multa moratória por impontualidade é a estipulada em contrato (usualmente 10%), não se aplicando o teto de 2% do CDC, por se tratar de microssistema locatício próprio.",
    },
    sumulasEPrecedentes: [
      "Súmula 214/STJ: O fiador na locação não responde por obrigações resultantes de aditamento ao qual não anuiu.",
      "Tema Repetitivo 1.097/STJ: A responsabilidade do fiador perdura até a efetiva entrega das chaves quando houver cláusula contratual expressa nesse sentido.",
    ],
    clausulaDispositivoPadrao: "DECLARAR rescindido o contrato de locação e CONDENAR a parte ré e seus fiadores, solidariamente, ao pagamento dos alugueres e encargos locatícios vencidos e vincendos até a data da efetiva desocupação e imissão na posse, acrescidos de correção monetária pelo índice contratual (ou IPCA) e juros de mora a contar do vencimento de cada prestação mensal (art. 397 do Código Civil c/c Lei nº 14.905/2024), além da multa moratória contratual estipulada.",
  },
  {
    id: "familia-alimentos",
    name: "Direito de Família & Ações de Alimentos (Lei nº 5.478/1968)",
    category: "Direito de Família",
    keywords: [
      "alimentos",
      "pensao alimenticia",
      "execucao de alimentos",
      "prisao civil",
      "rito da penhora",
      "art. 528",
      "art. 533",
      "menor",
      "binômio necessidade-possibilidade",
      "dever de sustento",
      "guarda",
      "regulamentacao de visitas",
    ],
    principaisLeis: [
      {
        diploma: "Lei Federal nº 5.478/1968 (Lei de Alimentos)",
        artigosChave: "Arts. 4º, 13 e 19",
        objeto: "Procedimento especial de fixação de alimentos provisórios e definitivos.",
      },
      {
        diploma: "Código Civil Brasileiro (Lei nº 10.406/2002)",
        artigosChave: "Arts. 1.694 a 1.710",
        objeto: "Obrigação alimentar, binômio necessidade e possibilidade, e critério de atualização pelo salário mínimo ou índice oficial.",
      },
      {
        diploma: "Código de Processo Civil (Lei nº 13.105/2015)",
        artigosChave: "Arts. 528 a 533",
        objeto: "Execução de alimentos pelos ritos da prisão civil (últimas 3 prestações anteriores ao ajuizamento + vincendas) e da penhora/expropriação.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "Quando fixado em percentual do salário mínimo: reajuste automático pelo salário mínimo nacional na data de sua alteração. Quando fixado em valor nominal fixo: correção monetária pelo INPC ou IPCA.",
      termoInicialCorrecao: "Data de vencimento de cada prestação mensal de alimentos em mora.",
      indiceJuros: "Juros de mora legais (Selic deduzida do IPCA nos termos da Lei nº 14.905/2024 ou 1% a.m.).",
      termoInicialJuros: "Data de vencimento de cada parcela mensal da pensão alimentícia (mora ex re - art. 397/CC).",
      baseLegalCompleta: "Lei nº 5.478/1968, Arts. 1.694 e 1.710 do Código Civil, Arts. 528 a 533 do CPC, e Súmula 309 do STJ.",
      observacoes: "O débito alimentar que autoriza a prisão civil do alimentante é o que compreende até as 3 (três) prestações anteriores ao ajuizamento da execução e as que se vencerem no curso do processo (Súmula 309/STJ).",
    },
    sumulasEPrecedentes: [
      "Súmula 309/STJ: O débito alimentar que autoriza a prisão civil do alimentante é o que compreende até as três prestações anteriores ao ajuizamento da execução e as que se vencerem no curso do processo.",
      "Súmula 358/STJ: O cancelamento de pensão alimentícia de filho que atingiu a maioridade está sujeito à decisão judicial, mediante contraditório.",
    ],
    clausulaDispositivoPadrao: "FIXAR a pensão alimentícia definitiva devida pelo alimentante em favor do(a) filho(a) menor no montante equivalente a [X]% do salário mínimo nacional (ou R$ [Valor], corrigido anualmente pelo INPC/IPCA), a ser pago até o dia 10 de cada mês, incidindo juros de mora legais a contar do vencimento de cada prestação inadimplida (art. 397 do Código Civil).",
  },
  {
    id: "servicos-regulados-concessoes",
    name: "Serviços Públicos Regulados & Concessionárias (ANEEL, ANATEL, ANS, ANAC)",
    category: "Direito Regulatório & do Consumidor",
    keywords: [
      "aneel",
      "anatel",
      "ans",
      "anac",
      "energia eletrica",
      "equatorial",
      "enel",
      "queda de energia",
      "interrupcao de energia",
      "queima de aparelho",
      "telefonia",
      "claro",
      "vivo",
      "tim",
      "plano de saude",
      "negativa de cobertura",
      "cancelamento de voo",
      "extravio de bagagem",
      "overbooking",
      "atraso de voo",
    ],
    principaisLeis: [
      {
        diploma: "Resolução Normativa ANEEL nº 1.000/2021",
        artigosChave: "Arts. 140, 141, 142 e 143 (Dano elétrico), e Arts. 360 a 365 (Interrupção)",
        objeto: "Estabelece as regras de prestação do serviço público de distribuição de energia elétrica e procedimento de ressarcimento de danos elétricos.",
      },
      {
        diploma: "Resolução ANAC nº 400/2016",
        artigosChave: "Arts. 10 a 14 (Assistência material) e Arts. 20 a 28 (Cancelamento e atraso)",
        objeto: "Direitos dos passageiros do transporte aéreo em casos de atraso, cancelamento, preterição de embarque e extravio de bagagem.",
      },
      {
        diploma: "Lei Federal nº 9.656/1998 (Planos de Saúde) c/c Resoluções ANS",
        artigosChave: "Arts. 10, 12 e 35-C",
        objeto: "Obrigatoriedade de cobertura em situações de urgência e emergência e vedação de negativa abusiva de tratamento prescrito por médico.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "IPCA (IBGE) para indenizações de danos materiais e morais causados por concessionárias de serviço público.",
      termoInicialCorrecao: "Danos materiais (laudo de queima de aparelho ou passagens/hospedagem): data do desembolso (Súmula 43/STJ); Danos morais: data da sentença/arbitramento (Súmula 362/STJ).",
      indiceJuros: "Taxa Selic deduzida da taxa do IPCA (art. 406, § 1º, do CC e Lei nº 14.905/2024).",
      termoInicialJuros: "Data da citação (art. 405/CC) em ilícitos contratuais com usuários do serviço.",
      baseLegalCompleta: "Lei nº 8.078/1990 (CDC), Lei nº 8.987/1995 (Concessões), Resoluções Setoriais (ANEEL 1.000/2021, ANAC 400/2016, ANS), e Lei Federal nº 14.905/2024.",
      observacoes: "Em queima de eletrodomésticos por oscilação de rede, a responsabilidade da concessionária é objetiva (art. 37, § 6º, da CF e art. 14 do CDC), cabendo ao consumidor comprovar o nexo de causalidade mediante laudo técnico idôneo.",
    },
    sumulasEPrecedentes: [
      "Súmula 608/STJ: Aplica-se o Código de Defesa do Consumidor aos contratos de plano de saúde, salvo os administrados por entidades de autogestão.",
      "Tema 1.061/STJ: Responsabilidade da transportadora aérea por cancelamento ou alteração unilateral de voo.",
    ],
    clausulaDispositivoPadrao: "CONDENAR a concessionária ao pagamento de indenização por danos materiais no montante de R$ [Valor], com correção monetária pelo IPCA a contar do desembolso (Súmula 43/STJ) e juros de mora (Selic deduzida do IPCA) a partir da citação (art. 405/CC), e indenização por danos morais de R$ [Valor], com correção pelo IPCA a partir desta sentença (Súmula 362/STJ) e juros de mora da citação, conforme a Lei nº 14.905/2024.",
  },
  {
    id: "curatela-epd",
    name: "Estatuto da Pessoa com Deficiência & Curatela (Lei nº 13.146/2015 - EPD)",
    category: "Direito de Família & Capacidade Civil",
    keywords: [
      "interdicao",
      "curatela",
      "curador",
      "interditando",
      "pessoa com deficiencia",
      "estatuto da pessoa com deficiencia",
      "epd",
      "laudo pericial psiquiatrico",
      "alzheimer",
      "cid",
      "incapacidade relativa",
      "tomada de decisao apoiada",
      "art. 1767",
      "art. 84",
      "art. 85",
    ],
    principaisLeis: [
      {
        diploma: "Lei Federal nº 13.146/2015 (Estatuto da Pessoa com Deficiência)",
        artigosChave: "Arts. 6º, 84, 85 e 86",
        objeto: "A curatela é medida extraordinária de proteção restrita estritamente aos atos de conteúdo patrimonial e negocial, não alcançando o direito ao próprio corpo, sexualidade, matrimônio, voto e trabalho.",
      },
      {
        diploma: "Código Civil Brasileiro (Lei nº 10.406/2002)",
        artigosChave: "Arts. 3º, 4º, III, 1.767, I, e 1.775",
        objeto: "Sujeição à curatela daqueles que por causa transitória ou permanente não puderem exprimir sua vontade e ordem de nomeação do curador.",
      },
      {
        diploma: "Código de Processo Civil (Lei nº 13.105/2015)",
        artigosChave: "Arts. 747 a 758",
        objeto: "Procedimento da ação de curatela, entrevista judicial, perícia multidisciplinar e mandados de registro civil e editais.",
      },
    ],
    regimeCorrecao: {
      indiceCorrecao: "N/A para atos declaratórios de estado civil. Para prestação de contas do curador ou ressarcimento de patrimônio: IPCA (IBGE).",
      termoInicialCorrecao: "Data de cada desvio ou ausência de prestação de contas demonstrada.",
      indiceJuros: "Taxa Selic deduzida do IPCA nos termos da Lei nº 14.905/2024.",
      termoInicialJuros: "Data da citação na ação de exigir contas ou evento lesivo.",
      baseLegalCompleta: "Lei nº 13.146/2015 (EPD), Arts. 1.767 a 1.783 do Código Civil, Arts. 747 a 758 do CPC, e Lei nº 14.905/2024.",
      observacoes: "O dispositivo da sentença de curatela DEVE delimitar expressamente que a medida restringe-se exclusivamente aos atos de cunho patrimonial e negocial (art. 85 da Lei 13.146/2015), determinando a expedição de mandado de averbação ao Cartório de Registro Civil e publicação de edital no sítio do TJGO e portal do CNJ (art. 755, § 3º, CPC).",
    },
    sumulasEPrecedentes: [
      "Enunciado 639 da VIII Jornada de Direito Civil: A decisão que decreta a curatela deve fixar os limites da medida protetiva conforme as necessidades fáticas comprovadas da pessoa com deficiência.",
    ],
    clausulaDispositivoPadrao: "JULGAR PROCEDENTE o pedido para DECRETAR A CURATELA de [Nome do Curatelado], nomeando como seu(sua) curador(a) definitivo(a) o(a) requerente [Nome do Curador], delimitando os poderes da curatela exclusivamente aos atos de natureza patrimonial e negocial, na forma do art. 85 da Lei nº 13.146/2015 (Estatuto da Pessoa com Deficiência). Determino a expedição de mandado de averbação ao Cartório de Registro Civil competente e a publicação do respectivo edital na rede mundial de computadores, no sítio do TJGO e no portal do CNJ (art. 755, § 3º, CPC).",
  },
];

export function detectApplicableLegalFrameworks(text: string): LegalFramework[] {
  if (!text || typeof text !== "string" || text.trim().length === 0) {
    return [LEGAL_FRAMEWORKS[0]]; // Retorna Cível Geral por padrão
  }

  const normalized = text.toLowerCase();
  const matched: LegalFramework[] = [];

  for (const framework of LEGAL_FRAMEWORKS) {
    let hits = 0;
    for (const kw of framework.keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        hits++;
      }
    }
    // Se tiver 2 ou mais ocorrências ou for uma palavra-chave forte
    if (hits >= 2) {
      matched.push(framework);
    } else if (hits === 1) {
      // Casos específicos de alta relevância
      if (
        (framework.id === "curatela-epd" && (normalized.includes("curatela") || normalized.includes("interdicao"))) ||
        (framework.id === "titulos-credito-cheque" && normalized.includes("cheque")) ||
        (framework.id === "fazenda-publica" && (normalized.includes("fazenda publica") || normalized.includes("estado de goias") || normalized.includes("municipio de"))) ||
        (framework.id === "locacao-urbana" && (normalized.includes("locacao") || normalized.includes("despejo"))) ||
        (framework.id === "familia-alimentos" && (normalized.includes("alimentos") || normalized.includes("pensao alimenticia")))
      ) {
        matched.push(framework);
      }
    }
  }

  if (matched.length === 0) {
    matched.push(LEGAL_FRAMEWORKS[0]);
  }

  return matched;
}

export function getApplicableTaxonomySummary(text: string): string {
  const frameworks = detectApplicableLegalFrameworks(text);
  if (frameworks.length === 0) return "";

  return frameworks
    .map((fw, idx) => {
      return `[MICROSSISTEMA REGULATÓRIO #${idx + 1}: ${fw.name.toUpperCase()}]
- Área/Categoria: ${fw.category}
- Legislação Federal e Decretos Aplicáveis:
${fw.principaisLeis.map((l) => `  * ${l.diploma} (${l.artigosChave}): ${l.objeto}`).join("\n")}
- Regime Específico de Correção Monetária e Juros:
  * Índice de Correção: ${fw.regimeCorrecao.indiceCorrecao}
  * Termo Inicial da Correção: ${fw.regimeCorrecao.termoInicialCorrecao}
  * Índice de Juros Moratórios: ${fw.regimeCorrecao.indiceJuros}
  * Termo Inicial dos Juros: ${fw.regimeCorrecao.termoInicialJuros}
  * Base Legal Unificada: ${fw.regimeCorrecao.baseLegalCompleta}
  * Observação Técnica: ${fw.regimeCorrecao.observacoes}
- Precedentes Vinculantes / Súmulas Aplicáveis:
${fw.sumulasEPrecedentes.map((s) => `  * ${s}`).join("\n")}
- Modelo do Comando no Dispositivo:
"${fw.clausulaDispositivoPadrao}"`;
    })
    .join("\n\n");
}
