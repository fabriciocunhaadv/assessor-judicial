/**
 * Utilitário especializado na higienização, normalização e formatação de textos judiciais
 * extraídos de PDFs (Projudi, PJe, e-SAJ, Eproc) e colagens manuais.
 * 
 * Remove ruídos, cabeçalhos repetitivos de tribunais, assinaturas digitais laterais/rodapés
 * e preserva a continuidade fluida do texto com ênfases (negrito, itálico, tópicos).
 */

export function cleanJudicialPdfText(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  let cleaned = rawText;

  // 1. Normalizar marcadores de página para formato canônico pesquisável pela IA
  cleaned = cleaned.replace(/\[---\s*P[AÁ]GINA\s+(\d+)\s+DE\s+(\d+)[^\]]*---\]/gi, "\n[Página $1 de $2]\n");
  cleaned = cleaned.replace(/===+\s*(?:DOCUMENTO|TEXTO ADICIONAL)[^=\n]*===+/gi, "\n\n");

  // 2. Remover assinaturas eletrônicas laterais, links de rodapés e marcas d'água
  const noisePatterns = [
    // Metadados puramente técnicos de sistema (datas/horas soltas de log)
    /^\s*Usu[aá]rio\s*:\s*[A-Za-zÀ-ÿ\s]+-\s*Data\s*:\s*\d{2}\/\d{2}\/\d{4}[^\n]*$/gim,
    /^\s*Data\s*:\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}:\d{2}\s*$/gim,
    
    // Assinaturas e links de rodapé
    /^\s*Documento\s+Assinado\s+(?:e\s+Publicado\s+)?Digitalmente[^\n]*$/gim,
    /^\s*Assinado\s+por\s+[A-ZÁ-Ú\s._-]+$/gim,
    /^\s*Localizar\s+pelo\s+c[oó]digo\s*:\s*\d+[^\n]*$/gim,
    /^\s*(?:no\s+endere[cç]o\s*:\s*)?https?:\/\/(?:projudi|pje|eproc|esaj|tj[a-z]{2})\.[^\s\n]+$/gim,
    /^\s*Este documento [ée] c[oó]pia do original,?\s*assinado digitalmente por[^\n]*$/gim,
    /^\s*Documento assinado digitalmente nos termos da Lei [0-9./-]+[^\n]*$/gim,
    /^\s*Para conferir o original,?\s*acesse o site[^\n]*$/gim,
    /^\s*Chave de acesso:\s*[A-F0-9\s-]{8,}\s*$/gim,
    /^\s*C[oó]digo verificador:\s*[A-F0-9\s-]{6,}\s*$/gim,
    /^\s*Certifica[cç][aã]o Digital ICP-Brasil[^\n]*$/gim,
    /^\s*Num\.\s*\d+\s*-\s*P[aá]g\.\s*\d+\s*$/gim,
    /^\s*P[aá]gina\s+\d+\s+de\s+\d+\s*$/gim,
    /^\s*P[aá]g\.\s*\d+\s*\/\s*\d+\s*$/gim,
    /^\s*Folha\s+\d+\s*\/\s*\d+\s*$/gim,
    /^\s*Identificador\s*:\s*[A-Z0-9_-]{8,}\s*$/gim,
    /^\s*Hash\s*:\s*[a-f0-9]{16,}\s*$/gim,
    /^\s*Assinado eletronicamente por:[^\n]*$/gim,
    /^\s*Assinado digitalmente por:[^\n]*$/gim,
    /^\s*Data e hora da assinatura:[^\n]*$/gim,
    /^\s*Validar em:[^\n]*$/gim,
    /^\s*Processo\s+Eletr[oô]nico\s+PROJUDI[^\n]*$/gim,
    /^\s*Sistema\s+PROJUDI\s*-\s*TJGO[^\n]*$/gim,
    /^\s*Certid[aã]o\s+expedida\s+automaticamente\s+pelo\s+sistema[^\n]*$/gim,
    /^\s*Protocolado\s+eletronicamente\s+em\s*\d{2}\/\d{2}\/\d{4}[^\n]*$/gim,
    /^\s*Valide\s+a\s+autenticidade\s+deste\s+documento\s+em[^\n]*$/gim,
    /^\s*C[oó]digo\s+de\s+autentica[cç][aã]o\s*:\s*[A-Za-z0-9._-]+$/gim,
    /^\s*ID\s+do\s+documento\s*:\s*[A-Za-z0-9._-]+$/gim,
    /^[_\-*\s=]{5,}$/gm,
  ];

  for (const pattern of noisePatterns) {
    cleaned = cleaned.replace(pattern, " ");
  }

  // 2.1 Filtrar blocos repetitivos de certidões cartorárias inócuas
  cleaned = filterInnocuousCertificates(cleaned);

  // 3. Corrigir hifenização de fim de linha (ex: "inadimplen- \n to" -> "inadimplemento")
  cleaned = cleaned.replace(/(\b[A-Za-zÀ-ÿ]+)-\s*\n\s*([A-Za-zÀ-ÿ]+\b)/g, "$1$2");

  // 4. Normalizar quebras de linha preservando parágrafos contínuos
  const rawLines = cleaned.split("\n");
  const processedBlocks: string[] = [];
  let currentBlock = "";

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i].trim();
    if (!line) {
      if (currentBlock) {
        processedBlocks.push(currentBlock.trim());
        currentBlock = "";
      }
      continue;
    }

    // Descartar se a linha ainda contém vestígios puros de ruído (preservando marcadores estruturados de página)
    if (
      !line.startsWith("[Página") &&
      /^(?:fls?\.\s*\d+|p[aá]g\.\s*\d+|folha\s+\d+|chave:\s*[a-z0-9]+|c[oó]digo:\s*[a-z0-9]+)$/i.test(line)
    ) {
      continue;
    }

    // Verificar se a linha é um título ou cabeçalho de tópico judicial
    const isHeading = 
      /^(?:I|II|III|IV|V|VI|VII|VIII|IX|X|\d+)\s*[-–.]\s+[A-ZÁ-Ú\s]{3,}/i.test(line) ||
      /^(?:RELAT[OÓ]RIO|FUNDAMENTA[CÇ][AÃ]O|DISPOSITIVO|DECIS[AÃ]O|SENTEN[CÇ]A|DESPACHO|VISTOS,? ETC\.?|DECIDO\.?|AC[OÓ]RD[AÃ]O|EMENTA)\s*$/i.test(line) ||
      /^(?:1\.|2\.|3\.|4\.|5\.|6\.|7\.|8\.|9\.)\s+[A-ZÁ-Ú]/i.test(line) ||
      /^#{1,4}\s+/.test(line) ||
      /^\*\*[^*]+\*\*:?$/.test(line);

    if (isHeading) {
      if (currentBlock) {
        processedBlocks.push(currentBlock.trim());
        currentBlock = "";
      }
      
      // Formatar o título em negrito se já não estiver em negrito ou markdown heading
      let formattedHeading = line;
      if (!formattedHeading.startsWith("#") && !formattedHeading.startsWith("**")) {
        formattedHeading = `**${formattedHeading}**`;
      }
      processedBlocks.push(formattedHeading);
      continue;
    }

    // Se é continuação de parágrafo
    if (!currentBlock) {
      currentBlock = line;
    } else {
      // Se a linha anterior termina com hífen (caso não pego antes)
      if (currentBlock.endsWith("-")) {
        currentBlock = currentBlock.slice(0, -1) + line;
      } else {
        currentBlock += " " + line;
      }
    }
  }

  if (currentBlock) {
    processedBlocks.push(currentBlock.trim());
  }

  // Juntar os blocos com espaçamento duplo para parágrafos elegantes
  cleaned = processedBlocks.join("\n\n");

  // 5. Destacar termos-chave judiciais consagrados em negrito (se estiverem soltos em início de frase)
  const keyHighlights = [
    { regex: /(?<=^|\n\n)(VISTOS,? ETC\.?)(?=\s|\n|$)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(DECIDO\.?)(?=\s|\n|$)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(RELAT[OÓ]RIO\.?)(?=\s|\n|$)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(FUNDAMENTA[CÇ][AÃ]O\.?)(?=\s|\n|$)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(DISPOSITIVO\.?)(?=\s|\n|$)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(POSTO ISSO,?|ANTE O EXPOSTO,?|ISSO POSTO,?)(?=\s)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(JULGO (?:TOTALMENTE )?PROCEDENTES?|JULGO (?:TOTALMENTE )?IMPROCEDENTES?|JULGO PARCIALMENTE PROCEDENTES?)(?=\s)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(DEFIRO (?:A|O) (?:PEDIDO DE )?TUTELA|INDEFIRO (?:A|O) (?:PEDIDO DE )?TUTELA)(?=\s)/gi, replace: "**$1**" },
    { regex: /(?<=^|\n\n)(PUBLIQUE-SE\.?|REGISTRE-SE\.?|INTIMEM-SE\.?|CUMPRA-SE\.?)(?=\s|\n|$)/gi, replace: "**$1**" },
  ];

  for (const hl of keyHighlights) {
    cleaned = cleaned.replace(hl.regex, (match) => {
      if (match.startsWith("**") && match.endsWith("**")) return match;
      return hl.replace.replace("$1", match);
    });
  }

  // 6. Reparar eventuais palavras coladas com preposições/artigos em PDFs compactados
  cleaned = cleaned
    .replace(/\b(em|de|da|do|das|dos|na|no|nas|nos|com|por|para|sob|sobre|sem|ao|aos|à|às|ou|e)\s*\*\*([A-Za-zÀ-ÿ0-9])/g, "$1 **$2")
    .replace(/([A-Za-zÀ-ÿ0-9])\*\*\s*(em|de|da|do|das|dos|na|no|nas|nos|com|por|para|sob|sobre|sem|ao|aos|à|às|ou|e)\b/g, "$1** $2")
    .replace(/([A-Za-zÀ-ÿ0-9])\*\*([A-Za-zÀ-ÿ0-9])/g, "$1** $2")
    .replace(/([A-Za-zÀ-ÿ0-9])\*([A-Za-zÀ-ÿ0-9])/g, "$1* $2");

  // 7. Normalizar espaços múltiplos e quebras excessivas
  cleaned = cleaned
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return cleaned;
}

/**
 * Remove cabeçalhos artificiais e marcadores de arquivo ("=== DOCUMENTO: ... ===")
 */
export function cleanDocumentHeaders(text: string): string {
  if (!text || typeof text !== "string") return "";
  return text
    .replace(/^===+\s*(?:DOCUMENTO|TEXTO ADICIONAL)[^=\n]*===+\s*/gim, "")
    .replace(/===+\s*(?:DOCUMENTO|TEXTO ADICIONAL)[^=\n]*===+/gim, "\n\n")
    .trim();
}

/**
 * Extrai inteligentemente o Nome da Ação Judicial ou Objeto Processual
 * a partir do texto integral ou relatório de uma decisão (ex: "AÇÃO DE COBRANÇA DE DIFERENÇAS...")
 */
export function extractJudicialActionName(text: string): string | null {
  if (!text || typeof text !== "string") return null;

  // Limpar cabeçalhos artificiais e formatação markdown básica para inspeção
  const clean = text
    .replace(/===+\s*DOCUMENTO:[^=]+===+/gi, " ")
    .replace(/[*_~`#<>]/g, " ")
    .replace(/\s+/g, " ");

  // 1. Padrão "Trata-se de / Cuida-se de / Versam os autos sobre... AÇÃO DE / EMBARGOS / etc. [ajuizada/proposta/etc]"
  const trataMatch = clean.match(
    /(?:Trata-se|Cuida-se|Versam os autos sobre|Cuidam-se os autos|Em exame|Em julgamento)\s+(?:d[eo]\s+|de\s+)?((?:A[CÇ][AÃ]O|EMBARGOS|MANDADO|RECLAMA[CÇ][AÃ]O|PEDIDO|CUMPRIMENTO|EXECU[CÇ][AÃ]O|HABEAS|PROCEDIMENTO|NOTIFICA[CÇ][AÃ]O|INTERDITO|REINTEGRA[CÇ][AÃ]O|MANUTEN[CÇ][AÃ]O|IMPUGNA[CÇ][AÃ]O|EXCE[CÇ][AÃ]O|TUTELA|INCIDENTE|RECURSO|APELA[CÇ][AÃ]O|AGRAVO|INVENT[AÁ]RIO|DIV[OÓ]RCIO|DISSOLU[CÇ][AÃ]O|ALIMENTOS|MONIT[OÓ]RIA|USUCAPI[AÃ]O|DESPEJO|CONSIGNA[CÇ][AÃ]O|BUSCA E APREENS[AÃ]O|QUERELA|RESTITUI[CÇ][AÃ]O|INDENIZA[CÇ][AÃ]O|COBRAN[CÇ]A|DECLARAT[OÓ]RIA|OBRIGA[CÇ][AÃ]O|REVISIONAL|RESCIS[OÓ]RIA|ANULAT[OÓ]RIA)[^.,;\n]+?)(?=\s+(?:ajuizad[ao]|propost[ao]|movidad[ao]|promovid[ao]|manejad[ao]|distribu[ií]d[ao]|impetrad[ao]|interpost[ao]|apresentad[ao]|requerid[ao]|opost[ao]|ajuizados|propostos|em face|movida|contra|pelo|pela|por\s+[A-ZÁ-Ú]|\.|\n|$))/i
  );

  if (trataMatch && trataMatch[1]) {
    const rawAction = trataMatch[1].trim().replace(/\s+/g, " ");
    if (rawAction.length >= 6 && rawAction.length <= 180) {
      return rawAction.toUpperCase();
    }
  }

  // 2. Padrão "Classe: ...", "Classe Processual: ...", "Ação: ...", "Procedimento: ...", "Objeto: ..."
  const classeMatch = clean.match(
    /(?:Classe\s+Processual|Classe|A[cç][aã]o|Natureza|Objeto|Procedimento)\s*:\s*([A-Za-zÀ-ÿ0-9\s/\\-–—]+?)(?=\s*(?:Assunto|Processo|Autor|R[eé]u|Requerente|Requerido|Valor|Comarca|Data|\.|\n|$))/i
  );
  if (classeMatch && classeMatch[1]) {
    const rawClasse = classeMatch[1].trim().replace(/\s+/g, " ");
    if (rawClasse.length >= 6 && rawClasse.length <= 140 && !/^\d+$/.test(rawClasse)) {
      return rawClasse.toUpperCase();
    }
  }

  // 3. Padrão em tópicos ou títulos isolados com nome de ação ("AÇÃO DE COBRANÇA...", "EMBARGOS À EXECUÇÃO", etc.)
  const standaloneMatch = clean.match(
    /(?:^|\s)((?:A[CÇ][AÃ]O|EMBARGOS DE DECLARA[CÇ][AÃ]O|EMBARGOS [AÀ] EXECU[CÇ][AÃ]O|MANDADO DE SEGURAN[CÇ]A|CUMPRIMENTO DE SENTEN[CÇ]A|EXECU[CÇ][AÃ]O DE T[IÍ]TULO|A[CÇ][AÃ]O MONIT[OÓ]RIA|A[CÇ][AÃ]O DE COBRAN[CÇ]A|A[CÇ][AÃ]O DE OBRIGA[CÇ][AÃ]O|A[CÇ][AÃ]O DECLARAT[OÓ]RIA|A[CÇ][AÃ]O REVISIONAL|A[CÇ][AÃ]O DE INDENIZA[CÇ][AÃ]O|A[CÇ][AÃ]O DE DESPEJO|A[CÇ][AÃ]O DE USUCAPI[AÃ]O|A[CÇ][AÃ]O DE ALIMENTOS|A[CÇ][AÃ]O DE DIV[OÓ]RCIO|A[CÇ][AÃ]O RESCIS[OÓ]RIA|A[CÇ][AÃ]O CIVIL P[UÚ]BLICA)\s+[A-Za-zÀ-ÿ0-9\s/\\-–—]{4,140})(?=\s+(?:ajuizad[ao]|propost[ao]|em face|pelo|pela|por|\.|\n|$))/i
  );
  if (standaloneMatch && standaloneMatch[1]) {
    const rawStandalone = standaloneMatch[1].trim().replace(/\s+/g, " ");
    if (rawStandalone.length >= 6 && rawStandalone.length <= 160) {
      return rawStandalone.toUpperCase();
    }
  }

  return null;
}

/**
 * Remove blocos repetitivos de certidões meramente burocráticas ou inócuas do PROJUDI / PJe
 * (Avisos de leitura automática, comprovantes de intimação sem manifestação, recibos de remessa ao DJE,
 * avisos de expediente suspenso e folhas de validação eletrônica sem relevância fática ou decisória).
 * PRESERVA rigorosamente petições, contestações, decisões, despachos, laudos, certidões com conteúdo de mérito
 * (óbito, certidões positivas de oficial de justiça, acordos) e marcos do histórico processual.
 */
export function filterInnocuousCertificates(rawText: string): string {
  if (!rawText || typeof rawText !== "string") return "";

  // 1. Remove blocos inteiros de comprovantes de intimação eletrônica pura / leitura automática
  let filtered = rawText.replace(
    /(?:\[===.*?===\]\s*)?(?:CERTID[AÃ]O\s+DE\s+(?:INTIMA[CÇ][AÃ]O\s+(?:CUMPRIDA|ELETR[OÔ]NICA)|LEITURA\s+AUTOM[AÁ]TICA|VISUALIZA[CÇ][AÃ]O\s+DO\s+PROCESSO|REMESSA\s+AO\s+DJE)[^\n]*\n)(?:[^\n]+\n){1,15}?(?=(?:\[===|Movimenta[cç][aã]o|Evento|Arquivo|\n\n##|\n\nI\s+-|$))/gi,
    ""
  );

  // 2. Remove avisos de suspensão de expediente / feriados regimentais do tribunal
  filtered = filtered.replace(
    /(?:CERTID[AÃ]O\s+DE\s+SUSPENS[AÃ]O\s+DE\s+EXPEDIENTE|CERTID[AÃ]O\s+DE\s+FERIADO[^\n]*\n)(?:[^\n]+\n){1,10}?(?=(?:\[===|Movimenta[cç][aã]o|Evento|Arquivo|\n\n##|$))/gi,
    ""
  );

  // 3. Remove blocos com códigos de barra soltos e links de validação repetidos
  filtered = filtered.replace(
    /(?:Assinado\s+eletronicamente\s+por[^\n]+\n|Documento\s+assinado\s+digitalmente[^\n]+\n)?(?:Valide\s+em\s*:?\s*https?:\/\/[^\s\n]+\n?)+/gi,
    ""
  );

  // 4. Compactar espaços vazios múltiplos gerados pelas remoções
  return filtered.replace(/\n{3,}/g, "\n\n").trim();
}

