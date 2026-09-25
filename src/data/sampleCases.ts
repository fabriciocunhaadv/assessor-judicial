import { SampleCase } from "../types";

export const SAMPLE_CASES: SampleCase[] = [
  {
    id: "caso-1-ausencia-autor",
    title: "1. Ausência do Autor em Audiência (Atestado sem horário)",
    badge: "Extinção c/ Custas",
    phase: "conhecimento",
    actType: "sentenca",
    actSubtype: "Sentença - Extinção sem resolução do mérito (Art. 51, I c/c § 2º Lei 9.099/95)",
    summary: "Autor faltou à audiência de conciliação e juntou atestado médico que não possui horário de atendimento nem recomendação expressa de afastamento.",
    processInfo: {
      processNumber: "5123456-78.2025.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "1º Juizado Especial Cível",
      autor: "MARCOS VINÍCIUS DA COSTA",
      reu: "BANCO CAPITAL S/A",
      valorCausa: "R$ 12.500,00",
      assunto: "Obrigação de Fazer / Indenização por Danos Morais",
    },
    processText: `PROCESSO Nº: 5123456-78.2025.8.09.0051
ÓRGÃO: 1º Juizado Especial Cível da Comarca de Goiânia - TJGO
AUTOR: MARCOS VINÍCIUS DA COSTA
RÉU: BANCO CAPITAL S/A

HISTÓRICO PROCESSUAL DOS AUTOS (PROJUDI):

[Evento 1] - Petição Inicial: O autor ajuizou ação declaratória de inexistência de débito c/c indenização por danos morais em face do Banco Capital S/A, alegando descontos indevidos em sua conta corrente no valor de R$ 450,00 mensais. Valor da causa: R$ 12.500,00.

[Evento 12] - Despacho Inicial: O juízo designou audiência de conciliação por videoconferência para o dia 14/04/2025, às 14h00, constando expressamente as advertências dos arts. 20 e 51, I, da Lei nº 9.099/95.

[Evento 18] - Intimação do Autor: Certidão expedida pelo cartório atesta a intimação pessoal da parte autora no dia 20/03/2025 acerca da data e horário da audiência de conciliação (14/04/2025 às 14h00).

[Evento 28] - Certidão de Audiência de Conciliação (14/04/2025 - 14h15): Aberta a sessão pela conciliadora judicial, verificou-se a presença da preposta e do advogado da parte ré Banco Capital S/A. A parte autora MARCOS VINÍCIUS DA COSTA, bem como seu patrono, NÃO COMPARECERAM à audiência. A ré requereu a aplicação do art. 51, I, da Lei 9.099/95 com condenação em custas.

[Evento 35] - Petição da Parte Autora (Justificativa): No dia 16/04/2025, a parte autora protocolou petição informando que esteve impossibilitada de comparecer ao ato por motivos de saúde. Juntou atestado médico (arquivo: atestado_medico.pdf) assinado pelo Dr. Roberto Silva (CRM/GO 12345), datado de 14/04/2025, com o seguinte teor: "Atesto para os devidos fins que o paciente Marcos Vinícius da Costa compareceu a esta unidade de pronto atendimento na data de hoje para consulta ambulatorial. CID J06".

ANÁLISE DO GABINETE:
- Intimação válida constante no Evento 18.
- Atestado médico de evento 35 não indica o horário do atendimento médico nem recomenda expressamente o afastamento das atividades laborais/atos da vida civil no horário exato da audiência (14h00).
- Aplicação do Art. 51, I e § 2º da Lei 9.099/95 e Enunciado 20 do FONAJE.`,
    specificInstructions: "Elaborar sentença extinguindo o feito sem resolução de mérito com condenação em custas, demonstrando a ineficácia do atestado médico de evento 35 para comprovar força maior no horário da audiência.",
  },
  {
    id: "caso-2-ausencia-reu-revelia-dano-moral",
    title: "2. Ausência do Réu (Revelia + Dano Moral c/ Lei 14.905/2024)",
    badge: "Revelia & Consectários",
    phase: "conhecimento",
    actType: "sentenca",
    actSubtype: "Sentença - Procedência com decretação de Revelia e Danos Morais (Lei nº 14.905/2024)",
    summary: "Ré devidamente citada não comparece à audiência. Decretada revelia. Condenação por negativação indevida e desvio produtivo com juros e correção monetária conforme a Lei 14.905/2024.",
    processInfo: {
      processNumber: "5678901-23.2025.8.09.0011",
      comarca: "Anápolis - TJGO",
      vara: "Juizado Especial Cível",
      autor: "ANA PAULA FERREIRA",
      reu: "TELECOMUNICAÇÕES VIVA S/A",
      valorCausa: "R$ 15.000,00",
      assunto: "Inscrição Indevida em Órgão de Proteção ao Crédito / Danos Morais",
    },
    processText: `PROCESSO Nº: 5678901-23.2025.8.09.0011
ÓRGÃO: Juizado Especial Cível da Comarca de Anápolis - TJGO
AUTORA: ANA PAULA FERREIRA
RÉ: TELECOMUNICAÇÕES VIVA S/A

HISTÓRICO PROCESSUAL:

[Evento 1] - Petição Inicial: A autora narra que nunca contratou linha telefônica junto à empresa ré. Foi surpreendida com a negativação de seu CPF nos órgãos de proteção ao crédito (Serasa/SPC) no valor de R$ 890,00 referente a suposto débito vencido em 10/11/2024. Procurou a ré via SAC (Protocolo nº 20241120-9988) e Procon (Evento 1, arquivo: protocolo_procon.pdf), sem qualquer solução administrativa. Requereu: a) declaração de inexistência do débito; b) exclusão da negativação; c) indenização por danos morais de R$ 10.000,00.

[Evento 1, doc. 3] - Documento Probatório: Extrato da CDL/Serasa emitido em 05/01/2025 comprovando a inscrição do CPF da autora pelo débito de R$ 890,00 incluído em 15/11/2024 pela ré Telecomunicações Viva S/A. Inexistência de outras inscrições anteriores (Súmula 385/STJ não aplicável).

[Evento 1, doc. 4] - Comprovante de Residência: Fatura de energia elétrica recente (dezembro/2024) em nome da própria autora, comprovando domicílio em Anápolis/GO.

[Evento 8] - Decisão Inicial: Deferida tutela de urgência determinando a expedição de ofício ao Serasa/SPC para baixa imediata do gravame. Designada audiência de conciliação para 22/03/2025.

[Evento 15] - Citação Válida: Mandado de citação e intimação devidamente cumprido em 10/02/2025 com Aviso de Recebimento (AR) juntado e positivo recebido pelo funcionário encarregado da ré.

[Evento 22] - Certidão de Audiência de Conciliação: A autora compareceu assistida por advogado. A demandada TELECOMUNICAÇÕES VIVA S/A NÃO COMPARECEU e não apresentou contestação.

ANÁLISE DE MÉRITO E CONSECTÁRIOS LEGAIS:
- Decretação de Revelia com base no Art. 20 da Lei 9.099/95 e Enunciado 20 do FONAJE.
- Presunção de veracidade dos fatos corroborada pela prova documental de negativação indevida (Evento 1, doc. 3) e tentativas frustradas no Procon.
- Dano moral caracterizado in re ipsa e agravado pela perda de tempo útil do consumidor.
- Fixação dos consectários legais estritamente nos termos da LEI Nº 14.905/2024:
  a) Correção monetária pelo IPCA a partir do arbitramento (Súmula 362/STJ c/c art. 389, § 1º, CC).
  b) Juros de mora calculados pela diferença entre a taxa Selic e o IPCA (art. 406, §§ 1º e 3º, CC), a incidir desde a data do evento danoso (data da inscrição indevida: 15/11/2024, Súmula 54/STJ).`,
    specificInstructions: "Elaborar sentença julgando procedentes os pedidos, declarando inexistente o débito, confirmando a tutela e fixando indenização por danos morais no importe de R$ 6.000,00, com consectários precisos da Lei 14.905/2024.",
  },
  {
    id: "caso-3-embargos-execucao-sem-garantia",
    title: "3. Execução Extrajudicial (Embargos sem Garantia do Juízo)",
    badge: "Enunciado 117 FONAJE",
    phase: "execucao_extrajudicial",
    actType: "decisao",
    actSubtype: "Decisão - Rejeição Liminar de Embargos à Execução por Falta de Garantia do Juízo",
    summary: "Executado apresenta Embargos à Execução de Título Extrajudicial sem prévia segurança do juízo pela penhora. Aplicação do Art. 53, §1º e Enunciado 117 do FONAJE.",
    processInfo: {
      processNumber: "5987654-32.2025.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "4º Juizado Especial Cível",
      autor: "COMERCIAL DE ALIMENTOS GOIÁS LTDA - EPP",
      reu: "CARLOS EDUARDO MENDONÇA",
      valorCausa: "R$ 8.420,00",
      assunto: "Execução de Título Extrajudicial (Cheque)",
    },
    processText: `PROCESSO Nº: 5987654-32.2025.8.09.0051
CLASSE: EXECUÇÃO DE TÍTULO EXTRAJUDICIAL (Art. 53 da Lei 9.099/95)
EXEQUENTE: COMERCIAL DE ALIMENTOS GOIÁS LTDA - EPP
EXECUTADO: CARLOS EDUARDO MENDONÇA

HISTÓRICO PROCESSUAL:

[Evento 1] - Petição Inicial Executiva: Exequente (microempresa legalmente habilitada) executa dois cheques devolvidos sem provisão de fundos (motivo 11/12), totalizando o débito atualizado de R$ 8.420,00. Juntou cópia legível dos títulos de crédito com carimbo de devolução bancária (Evento 1, doc. 2 e 3).

[Evento 10] - Citação: O executado foi citado em 15/01/2025 para pagar a dívida no prazo de 3 (três) dias (art. 53, caput, Lei 9.099/95).

[Evento 14] - Certidão de Decurso de Prazo: Certidão lavrada em 25/01/2025 atesta que transcorreu o prazo de 3 dias sem que o executado efetuasse o pagamento voluntário ou indicasse bens à penhora.

[Evento 18] - Manifestação do Executado com "EMBARGOS À EXECUÇÃO": No dia 02/02/2025, o executado atravessou petição intitulada "Embargos à Execução", alegando que os cheques foram emitidos como garantia de negócio que não se perfectibilizou (exceção do contrato não cumprido) e pedindo a anulação da execução. Contudo, NÃO EFETUOU QUALQUER DEPÓSITO JUDICIAL, NEM HOUVE PENHORA DE BENS NOS AUTOS.

[Evento 22] - Petição do Exequente: Requer o não conhecimento dos embargos em razão da ausência de garantia do juízo e pugna pela realização de penhora via SISBAJUD.

ANÁLISE DE DIREITO PROCESSUAL DO JEC:
- Rito especial do Art. 53, § 1º, da Lei 9.099/95: "Efetuada a penhora, o devedor será intimado a comparecer à audiência de conciliação, quando poderá oferecer embargos...".
- Enunciado 117 do FONAJE: "É obrigatória a segurança do Juízo pela penhora para apresentação de embargos à execução de título judicial ou extrajudicial perante o Juizado Especial".
- Juízo NÃO GARANTIDO. Embargos NÃO CONHECIDOS.`,
    specificInstructions: "Elaborar decisão interlocutória rejeitando liminarmente / não conhecendo dos embargos à execução ante a manifesta ausência de segurança prévia do juízo, e deferindo a realização de busca de ativos via SISBAJUD.",
  },
  {
    id: "caso-4-cumprimento-sentenca-impugnacao",
    title: "4. Cumprimento de Sentença (Impugnação sem Penhora Prévia)",
    badge: "Art. 52 Lei 9.099/95",
    phase: "cumprimento_sentenca",
    actType: "decisao",
    actSubtype: "Decisão - Recebimento de Impugnação ao Cumprimento de Sentença e Intimação do Credor",
    summary: "Executada apresenta impugnação ao cumprimento de sentença alegando excesso de execução com planilha discriminada. Recebimento independente de garantia prévia.",
    processInfo: {
      processNumber: "5112233-44.2024.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "7º Juizado Especial Cível",
      autor: "RODRIGO ALVES PINTO",
      reu: "SEGURADORA NACIONAL S/A",
      valorCausa: "R$ 9.800,00",
      assunto: "Cumprimento de Sentença (Obrigação de Pagar)",
    },
    processText: `PROCESSO Nº: 5112233-44.2024.8.09.0051
FASE: CUMPRIMENTO DE SENTENÇA (Art. 52 da Lei nº 9.099/95)
EXEQUENTE: RODRIGO ALVES PINTO
EXECUTADA: SEGURADORA NACIONAL S/A

HISTÓRICO PROCESSUAL:

[Evento 45] - Sentença Transitada em Julgado: Julgou procedente o pedido para condenar a ré ao pagamento de indenização securitária no valor de R$ 7.500,00, corrigido pelo IPCA e com juros da diferença Selic-IPCA a partir da citação. Trânsito em julgado certificado no Evento 52 em 10/11/2024.

[Evento 55] - Início do Cumprimento de Sentença: O exequente requereu o cumprimento de sentença no valor de R$ 10.250,00, incluindo multa de 10% do art. 523, § 1º do CPC e indevidamente honorários advocatícios de 10% para a fase executiva.

[Evento 58] - Intimação da Executada: A executada foi devidamente intimada pelo Diário da Justiça Eletrônico em 15/11/2024 para pagar no prazo de 15 dias.

[Evento 64] - Impugnação ao Cumprimento de Sentença: Em 02/12/2024 (tempestiva), a executada apresentou Impugnação ao Cumprimento de Sentença, acompanhada de memória discriminada e atualizada de cálculo (Evento 64, doc. 2), apontando excesso de execução no montante de R$ 1.025,00 referente à inclusão indevida de honorários advocatícios na fase de cumprimento de sentença no rito do JEC (Enunciado 97 do FONAJE). Não houve penhora prévia.

ANÁLISE TÉCNICA DO ASSESSOR:
- No cumprimento de sentença (título judicial), a jurisprudência pacífica e a rotina do TJGO dispensam a garantia prévia do juízo para o processamento da impugnação, desde que a parte executada aponte o excesso e junte a respectiva planilha de cálculo (art. 525, § 4º e § 5º, CPC c/c Art. 52 Lei 9.099/95).
- A impugnante apresentou a planilha no Evento 64, doc. 2.
- Aplicação do Enunciado 97 do FONAJE: "A multa prevista no art. 523, § 1º, do CPC/2015 aplica-se aos Juizados Especiais Cíveis... sendo, portanto, indevidos honorários advocatícios de dez por cento".`,
    specificInstructions: "Elaborar decisão recebendo a impugnação ao cumprimento de sentença (sem exigência de prévia penhora) e determinando a intimação do exequente/impugnado para manifestação no prazo legal de 15 dias.",
  },
  {
    id: "caso-5-carta-precatoria-vedada",
    title: "5. Vedação Expressa de Carta Precatória (Provimento 165/2024 CNJ)",
    badge: "Provimento 165/2024 CNJ",
    phase: "conhecimento",
    actType: "decisao",
    actSubtype: "Decisão - Indeferimento de Carta Precatória e Determinação de Citação por Correios com AR",
    summary: "Autor requer expedição de carta precatória para comarca diversa. Indeferimento obrigatório com fulcro no Art. 101 do Anexo ao Provimento nº 165/2024 do CNJ.",
    processInfo: {
      processNumber: "5234567-89.2025.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "3º Juizado Especial Cível",
      autor: "LUCAS MARTINS SILVA",
      reu: "DISTRIBUIDORA PAULISTA DE BEBIDAS EIRELI",
      valorCausa: "R$ 4.200,00",
      assunto: "Cobrança / Restituição de Valores",
    },
    processText: `PROCESSO Nº: 5234567-89.2025.8.09.0051
AUTOR: LUCAS MARTINS SILVA
RÉ: DISTRIBUIDORA PAULISTA DE BEBIDAS EIRELI (Sede em Ribeirão Preto/SP)

HISTÓRICO PROCESSUAL:

[Evento 1] - Petição Inicial: Autor residente em Goiânia/GO ajuizou ação de cobrança referente a mercadorias não entregues adquiridas via internet. Indicou o endereço da empresa ré localizado no município de Ribeirão Preto/SP.

[Evento 8] - Petição do Autor: O autor peticionou requerendo expressamente a expedição de CARTA PRECATÓRIA CÍVEL para a Comarca de Ribeirão Preto/SP a fim de citar a empresa ré no seu endereço comercial.

ANÁLISE NORMATIVA OBRIGATÓRIA (PROVIMENTO Nº 165/2024 DO CNJ):
- O Art. 101 do Anexo ao Provimento nº 165/2024 do CNJ estabelece:
  "Na comunicação dos atos, no Sistema dos Juizados Especiais, deve ser utilizado preferencialmente o meio eletrônico, com o devido credenciamento dos(as) destinatários(as), ou correspondência com aviso de recebimento quando o(a) destinatário(a) for pessoa física ou pessoa jurídica de direito privado, VEDADO O USO DE CARTA PRECATÓRIA, salvo para citação no Juizado Especial Criminal."
- O pedido de expedição de carta precatória DEVE ser indeferido.
- Determinação de ofício da citação por carta com Aviso de Recebimento (AR) via Correios, ato dotado de plena eficácia em todo o território nacional.`,
    specificInstructions: "Elaborar decisão interlocutória indeferindo o pedido de expedição de carta precatória com fundamento no Art. 101 do Provimento CNJ nº 165/2024 e determinando a citação da ré por carta com AR.",
  },
  {
    id: "caso-6-pedido-contraposto-autonomo",
    title: "6. Pedido Contraposto Autônomo e Extinção Principal sem Mérito",
    badge: "Autonomia Art. 31",
    phase: "conhecimento",
    actType: "sentenca",
    actSubtype: "Sentença - Extinção da Ação Principal por Desistência e Julgamento do Mérito do Pedido Contraposto",
    summary: "Autor desiste da ação após contestação com pedido contraposto. Extinção da ação principal e julgamento procedente do pedido contraposto pelo réu.",
    processInfo: {
      processNumber: "5345678-90.2025.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "2º Juizado Especial Cível",
      autor: "JULIO CESAR BORGES",
      reu: "OFICINA MECÂNICA AUTO CENTER LTDA - ME",
      valorCausa: "R$ 6.000,00",
      assunto: "Reparação de Danos / Acidente de Trânsito",
    },
    processText: `PROCESSO Nº: 5345678-90.2025.8.09.0051
AUTOR: JULIO CESAR BORGES
RÉ: OFICINA MECÂNICA AUTO CENTER LTDA - ME

HISTÓRICO PROCESSUAL:

[Evento 1] - Petição Inicial: O autor ajuizou ação alegando abalroamento em seu veículo na data de 10/01/2025 provocado por guincho da empresa ré. Pleiteou indenização de R$ 6.000,00.

[Evento 15] - Contestação com PEDIDO CONTRAPOSTO (Art. 31 da Lei 9.099/95): A ré apresentou contestação alegando que a culpa exclusiva foi do autor, que desrespeitou a preferencial em cruzamento sinalizado (Pare). Formulou PEDIDO CONTRAPOSTO requerendo a condenação do autor ao pagamento de R$ 3.800,00 referente aos danos materiais causados no guincho da ré. Juntou:
- Boletim de Ocorrência com croqui demonstrando que o autor invadiu a via preferencial (Evento 15, doc. 2);
- Imagens de câmera de segurança registrando a dinâmica do sinistro e o avanço da placa de Pare pelo autor (Evento 15, doc. 3);
- Três orçamentos idôneos de oficinas especializadas e nota fiscal das peças no valor de R$ 3.800,00 (Evento 15, doc. 4 e 5).

[Evento 22] - Petição do Autor (Desistência): Diante das provas cabais trazidas na contestação, o autor peticionou requerendo a desistência da ação e pugnando pela extinção integral do feito.

[Evento 26] - Manifestação da Ré: Concordou com a extinção da ação principal, mas requereu o prosseguimento e acolhimento do pedido contraposto.

DIRETRIZ JURISPRUDENCIAL DO JEC:
- Autonomia do pedido contraposto: A extinção sem resolução do mérito da ação principal (por desistência ou vício formal) não impede a apreciação do pedido contraposto conexo com a causa de pedir (Art. 31 da Lei 9.099/95 c/c art. 485, VIII e § 2º do CPC subsidiário).
- Exame de mérito do pedido contraposto: culpa comprovada do autor pelos documentos de evento 15.`,
    specificInstructions: "Elaborar sentença homologando a desistência da ação principal (extinção sem mérito) e julgando PROCEDENTE o pedido contraposto para condenar o autor a pagar à ré R$ 3.800,00 com consectários legais da Lei 14.905/2024.",
  },
  {
    id: "caso-7-regularidade-documental-endereco-procuracao",
    title: "7. Regularidade Documental (Endereço >3m de Terceiro + Procuração)",
    badge: "Triagem & Emenda",
    phase: "conhecimento",
    actType: "despacho",
    actSubtype: "Despacho - Intimação para Emenda da Inicial (Comprovante de Endereço e Mandato Específico)",
    summary: "Comprovante de endereço em nome de terceiro emitido há mais de 8 meses e procuração sem poderes específicos para dar quitação ou transigir.",
    processInfo: {
      processNumber: "5456789-01.2025.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "5º Juizado Especial Cível",
      autor: "BEATRIZ NOGUEIRA LIMA",
      reu: "LOJAS BRASIL VAREJO S/A",
      valorCausa: "R$ 5.000,00",
      assunto: "Cancelamento de Contrato / Devolução de Quantia Paga",
    },
    processText: `PROCESSO Nº: 5456789-01.2025.8.09.0051
AUTORA: BEATRIZ NOGUEIRA LIMA
RÉ: LOJAS BRASIL VAREJO S/A

ANÁLISE DE TRIAGEM INICIAL DO PROTOCOLO (REGULARIDADE DOCUMENTAL):

1. Comprovante de Residência (Evento 1, doc. 2):
- Titularidade: O documento acostado aos autos consiste em fatura de conta de água emitida em nome de "SEBASTIÃO LIMA DA SILVA".
- Vínculo residencial: Não foi juntado contrato de locação, declaração de residência com firma ou documento comprobatório de parentesco/casamento que ligue a autora Beatriz ao titular Sebastião.
- Atualidade: A fatura foi emitida em 10/05/2024 (mais de 9 meses antes do ajuizamento da ação em fevereiro/2025).
- Consequência: Prova inidônea para fixação da competência territorial deste Juizado (Art. 4º da Lei 9.099/95 e Art. 101, I, CDC).

2. Instrumento de Mandato / Procuração (Evento 1, doc. 1):
- A procuração outorgada ao patrono contém apenas a cláusula geral "ad judicia", estando desprovida dos poderes especiais e expressos exigidos pelo art. 105 do CPC para "receber e dar quitação", "transigir", "desistir" e "renunciar", atos essenciais para eventual expedição de alvará/levantamento ou audiência de conciliação.

3. Providência Processual:
- Determinar a emenda da petição inicial, no prazo de 15 (quinze) dias, sob pena de indeferimento da inicial e extinção sem resolução do mérito (art. 321, parágrafo único, do CPC).`,
    specificInstructions: "Elaborar despacho fundamentado de intimação para emenda da inicial, detalhando as duas irregularidades (comprovante de endereço de terceiro e desatualizado; ausência de poderes especiais do art. 105 CPC).",
  },
  {
    id: "caso-8-sisbajud-reiteracao-renajud",
    title: "8. Busca Patrimonial (Reiteração SISBAJUD < 1 ano + RENAJUD)",
    badge: "Sistemas Conveniados",
    phase: "cumprimento_sentenca",
    actType: "decisao",
    actSubtype: "Decisão - Indeferimento de Reiteração do SISBAJUD e Penhora de Direitos no RENAJUD",
    summary: "Pedido de novo bloqueio SISBAJUD sem prova de alteração patrimonial e com busca realizada há apenas 3 meses. Veículo localizado no RENAJUD com restrição de alienação fiduciária.",
    processInfo: {
      processNumber: "5567890-12.2024.8.09.0051",
      comarca: "Goiânia - TJGO",
      vara: "6º Juizado Especial Cível",
      autor: "GABRIEL MONTEIRO DIAS",
      reu: "SERVIÇOS DIGITAIS EXPRESS LTDA",
      valorCausa: "R$ 7.200,00",
      assunto: "Execução de Título Judicial",
    },
    processText: `PROCESSO Nº: 5567890-12.2024.8.09.0051
FASE: CUMPRIMENTO DE SENTENÇA
EXEQUENTE: GABRIEL MONTEIRO DIAS
EXECUTADA: SERVIÇOS DIGITAIS EXPRESS LTDA

HISTÓRICO DAS MEDIDAS CONSTRITIVAS:

[Evento 38] - Resultado SISBAJUD (Realizado em 10/12/2024): Ordem de bloqueio via SISBAJUD restou integralmente infrutífera ("saldo zero / inexistência de valores"), conforme extrato do sistema.

[Evento 42] - Resultado RENAJUD (Realizado em 15/12/2024): Consulta RENAJUD localizou o veículo Fiat Strada Volcano, placa ONX-1234, em nome da devedora. No campo "Restrições Financeiras", consta expressamente gravame de "ALIENAÇÃO FIDUCIÁRIA" em favor do Banco Itaú Financiamentos S/A.

[Evento 50] - Petição do Exequente (Data: 10/03/2025):
O exequente peticionou requerendo:
1) A reiteração imediata da ordem de indisponibilidade de ativos via SISBAJUD (apenas 3 meses após a primeira tentativa, sem apontar qualquer indício ou prova de nova conta bancária ou alteração patrimonial da devedora).
2) A expedição de mandado de penhora e avaliação sobre o veículo Fiat Strada localizado no RENAJUD.

ANÁLISE SEGUNDO O PROTOCOLO DE SISTEMAS CONVENIADOS DO TJGO:
- Pedido de reiteração de SISBAJUD: Indeferir, pois a busca anterior ocorreu há menos de 1 (um) ano e a parte credora não trouxe qualquer indício concreto de alteração na situação econômico-financeira da devedora.
- Veículo com alienação fiduciária: Deferir a penhora não sobre a propriedade do veículo (que pertence à instituição financeira fiduciária), mas sim sobre os DIREITOS AQUISITIVOS decorrentes do contrato de financiamento (art. 835, XII, CPC), determinando a expedição de ofício ao credor fiduciário para informar o saldo residual devedor e parcelas adimplidas.`,
    specificInstructions: "Elaborar decisão interlocutória indeferindo a reiteração do SISBAJUD e deferindo a penhora sobre os direitos aquisitivos do contrato de alienação fiduciária do veículo, com expedição de ofício ao banco fiduciário.",
  },
];
