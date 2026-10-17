// AUTOS GRANDES com chave gratuita: o Google recusa pedidos acima do limite de ENTRADA gratuito (hoje 250 mil tokens, erro "free_tier_input_token_count").
// Só quando isso acontece, o sistema:
//  1) lê os autos em partes e pede à IA que classifique cada página: ESSENCIAL / RELEVANTE / DISPENSÁVEL para a conclusão da minuta
//     (a IA só devolve a lista de páginas e a classe; o texto dos autos NÃO é reescrito nem resumido);
//  2) tira só o DISPENSÁVEL (documentos pessoais sem valor de prova, procurações, comprovantes, páginas repetidas, burocracia sem efeito);
//  3) se ainda não couber, abrevia páginas apenas RELEVANTES (as maiores primeiro), nunca as ESSENCIAIS;
//  4) se mesmo assim não couber, NÃO corta mais nada: avisa que é preciso chave com faturamento.
// Páginas sem classificação valem como ESSENCIAIS. Chave paga e processos que cabem no limite não passam por aqui.

const CPT = 3.2;                 // caracteres por token (estimativa usada pelo servidor)
const MIN_CHARS_AUTOS = 60000;
type Classe = "essencial" | "relevante" | "dispensavel";

const ehErroEntradaGrande = (e: any) => !!e && (e.codigo === "ENTRADA_GRANDE_GRATUITA" || String(e?.message || "").includes("free_tier_input_token_count"));
const limiteDoErro = (e: any) => Number(String(e?.detalhe || e?.message || "").match(/limit:\s*(\d{4,9})/i)?.[1]) || 250000;
const dorme = (ms: number) => new Promise(r => setTimeout(r, ms));
const estimar = (contents: any, sys: any) => Math.ceil((JSON.stringify(contents || "", (k, v) => (k === "data" && typeof v === "string" && v.length > 3000 ? v.slice(0, 3000) : v)).length + String(typeof sys === "string" ? sys : JSON.stringify(sys || "")).length) / CPT);

const SISTEMA_CLASSIFICADOR = `Você é um CLASSIFICADOR DE RELEVÂNCIA de páginas de autos judiciais brasileiros (TJGO). Você recebe parte dos autos, página a página (marcadores "[Página N de M]"), e o contexto do ato que será minutado.
Classifique cada página quanto à utilidade para redigir a minuta (relatório, fundamentação e dispositivo):
- "essencial": petição inicial, contestação, réplica, manifestações e requerimentos das partes e do Ministério Público, decisões, despachos, sentenças, acórdãos, atas e termos de audiência, laudos e perícias, cálculos, certidões de citação/intimação/decurso de prazo/trânsito em julgado, contratos e documentos que sustentam pedidos ou defesas, prova relevante, e qualquer página que mude o resultado ou o andamento.
- "relevante": prova documental ou anexo que pode importar, mas de importância secundária (extratos, comprovantes de pagamento ligados ao pedido, fotografias, conversas, anexos longos).
- "dispensavel": SOMENTE o que não influi na minuta: documentos pessoais sem valor de prova no caso (RG, CPF, CNH, título), comprovante de residência, procuração, substabelecimento, declaração de hipossuficiência padrão, guias e comprovantes de custas sem controvérsia, aviso de recebimento ou expedientes de mera comunicação sem conteúdo, termos de juntada e capas, páginas em branco ou ilegíveis, repetições idênticas de páginas já classificadas.
REGRA DE OURO: na dúvida, classifique como "relevante" ou "essencial". Nunca marque como dispensável página que contenha pedido, decisão, prazo, valor, prova do mérito ou fato discutido.
Responda SOMENTE um JSON: {"segmentos":[{"de":N,"ate":N,"classe":"essencial|relevante|dispensavel","motivo":"até 8 palavras"}]}, agrupando páginas consecutivas de mesma classe, em ordem, sem lacunas.`;

const LOCALIZADOR = /^\s*(\[P[áa]gina|Movimenta[cç][aã]o\s*\d|Arquivo\s*\d|Pag\.?\s*\d)/i;      // só as linhas de localização (carimbos); cabeçalhos que apenas citam "página" podem sair se repetidos
// Compactação SEM PERDA: tira só o que não é conteúdo (linhas de cabeçalho/rodapé repetidas em muitas páginas, espaços e linhas em branco em excesso). Carimbos de localização (Mov./Arq./Pág.) ficam.
function compactar(t: string, repetidas: Set<string>): string {
    const linhas = t.split("\n"), saida: string[] = [];
    linhas.forEach((l, i) => { const x = l.trim(); if (i > 0 && x && repetidas.has(x) && !LOCALIZADOR.test(x)) return; saida.push(l.replace(/[ \t]{2,}/g, " ").replace(/[ \t]+$/, "")); });
    return saida.join("\n").replace(/\n{3,}/g, "\n\n");
}

// O texto dos autos chega com as linhas já juntadas (a limpeza une as quebras de linha). Por isso a repetição é achada por SEQUÊNCIAS DE PALAVRAS iguais em muitas páginas
// (cabeçalho, rodapé, aviso padrão). A primeira ocorrência é mantida; as repetições seguintes saem. Carimbos de localização nunca entram nessa conta.
const N_PALAVRAS = 12;
const TEM_LOCALIZADOR = /\[P[áa]gina \d+|Movimenta[cç][aã]o\s*\d|Arquivo\s*\d|Pag\.?\s*\d/i;
function removerRepeticoes(unidades: { n: number; t: string }[]): { n: number; t: string }[] {
    const minimo = Math.max(5, Math.ceil(unidades.length * 0.04));
    const toks = unidades.map(u => u.t.split(" "));
    const conta = new Map<string, number>(), primeira = new Map<string, number>();
    toks.forEach((w, ui) => {
        const vistos = new Set<string>();
        for (let i = 0; i + N_PALAVRAS <= w.length; i++) {
            const k = w.slice(i, i + N_PALAVRAS).join(" ");
            if (vistos.has(k)) continue; vistos.add(k);
            conta.set(k, (conta.get(k) || 0) + 1);
            if (!primeira.has(k)) primeira.set(k, ui);
        }
    });
    return unidades.map((u, ui) => {
        const w = toks[ui], fora = new Uint8Array(w.length);
        for (let i = 0; i + N_PALAVRAS <= w.length; i++) {
            const k = w.slice(i, i + N_PALAVRAS).join(" ");
            if ((conta.get(k) || 0) >= minimo && (primeira.get(k) as number) < ui && !TEM_LOCALIZADOR.test(k)) for (let j = i; j < i + N_PALAVRAS; j++) fora[j] = 1;
        }
        return { ...u, t: w.filter((_, j) => !fora[j]).join(" ") };
    });
}

const SISTEMA_DOSSIE = `Você é assessor fático-processual de um gabinete judicial brasileiro (TJGO). Você recebe UMA PARTE de autos muito extensos, divididos em partes sequenciais porque não cabem de uma vez no limite de entrada.
Sua tarefa é produzir o DOSSIÊ FÁTICO-PROBATÓRIO DESTA PARTE, que substituirá o texto original na análise final.
REGRAS:
1. Siga a ordem cronológica. Para cada petição, decisão, certidão, laudo ou documento relevante registre: o que é, quem praticou, data e o conteúdo essencial, SEMPRE com a localização (Mov. X, Arq. Y, Pág. Z, ou [Página N] quando só houver esse marcador).
2. TRANSCREVA LITERALMENTE, entre aspas, os trechos decisivos: pedidos, causa de pedir, dispositivos de decisões e sentenças, conclusões de laudos, cláusulas contratuais, certidões de citação/intimação/decurso.
3. Preserve exatamente nomes, números, datas, valores, percentuais e prazos.
4. NÃO invente, NÃO infira, NÃO julgue o mérito. Registre apenas o que está no texto; diga expressamente o que estiver ilegível.
5. Ao final registre: pendências e requerimentos sem decisão; prazos em curso; atos determinados e não cumpridos; situação em que esta parte termina.
6. Seja tão extenso quanto necessário para não perder fato relevante, sem repetir cabeçalhos, assinaturas e burocracia irrelevante.
Responda em texto organizado por tópicos, sem JSON.`;

function dividir(unidades: { n: number; t: string }[], maxChars: number): { n: number; t: string }[][] {
    const partes: { n: number; t: string }[][] = []; let atual: { n: number; t: string }[] = [], tam = 0;
    for (const u of unidades) { if (tam + u.t.length > maxChars && atual.length) { partes.push(atual); atual = []; tam = 0; } atual.push(u); tam += u.t.length; }
    if (atual.length) partes.push(atual);
    return partes;
}

// chama a IA com espera quando a janela de 1 minuto do modelo está cheia (as primeiras tentativas só nos modelos profundos)
async function chamar(gerar: (o: any) => Promise<any>, base: any, extra: any, pausaMs: number, log: (m: string) => void, rotulo: string): Promise<any> {
    let ultimo: any;
    for (let tent = 1; tent <= 4; tent++) {
        try {
            return await gerar({ ...base, ...extra,
                customModelQueue: tent < 4 ? ["gemini-3.6-flash", "gemini-3.8-flash"] : ["gemini-3.6-flash", "gemini-3.8-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"], maxCycles: 1 });
        } catch (e: any) {
            ultimo = e;
            // pedido maior que o limite de uma vez só: não adianta repetir; mas se o pedido em si cabe (a "janela" de 1 minuto do Google está cheia pelas partes anteriores), espera e tenta de novo
            if (ehErroEntradaGrande(e) && estimar(extra?.contents ?? base?.contents, extra?.config?.systemInstruction ?? base?.config?.systemInstruction) > limiteDoErro(e) * 0.9) throw e;
            log(`[Autos Grandes] ${rotulo}, tentativa ${tent}: ${String(e?.message || e).slice(0, 140)}`);
            if (tent < 4) await dorme(pausaMs);
        }
    }
    throw ultimo;
}

export async function gerarComAutosGrandes(gerar: (o: any) => Promise<any>, opts: any): Promise<any> {
    const { autosGrandes, onProgresso, ...resto } = opts;
    try {
        return await gerar(resto);
    } catch (e: any) {
        if (!autosGrandes || !ehErroEntradaGrande(e)) throw e;
        const log = (m: string) => { console.log(m); if (onProgresso && /, tentativa \d+:/.test(m)) onProgresso("aguardando a janela de 1 minuto da cota da IA renovar…"); };
        const pausa = Number(process.env.AUTOS_GRANDES_PAUSA_MS || 62000);
        const prompt: string = autosGrandes.userPrompt;
        const grandes: string[] = (autosGrandes.textos || []).filter((t: any) => typeof t === "string" && t.length >= MIN_CHARS_AUTOS && prompt.includes(t)).sort((a: string, b: string) => b.length - a.length);
        if (!grandes.length) { console.log("[Autos Grandes] Não reduzi: nenhum bloco grande de autos (>=60 mil caracteres) foi encontrado dentro do pedido."); throw e; }
        const principal = grandes[0], extras = grandes.slice(1).filter(t => !principal.includes(t));
        let unidades = principal.split(/(?=\[Página \d+ de \d+\])/).filter(x => x.length > 0).map((t, i) => ({ n: Number(t.match(/^\[Página (\d+) de/)?.[1] || 0), t }));
        let sintetico = false;
        if (unidades.filter(u => u.n > 0).length < 20) {
            // sem marcadores de página: o texto é dividido em blocos sequenciais (~4 mil caracteres, em quebra de linha) que fazem o papel de "páginas"
            sintetico = true; unidades = []; let atual = "";
            for (const par of principal.split(/(?<=\n)/)) { if (atual.length + par.length > 4000 && atual) { unidades.push({ n: unidades.length + 1, t: atual }); atual = ""; } atual += par; }
            if (atual) unidades.push({ n: unidades.length + 1, t: atual });
            console.log(`[Autos Grandes] Autos sem marcadores "[Página N de M]": dividi em ${unidades.length} blocos sequenciais para classificar.`);
            if (unidades.length < 20) throw e;
        }

        const limite = limiteDoErro(e);
        const fixo = estimar(resto.contents, resto.config?.systemInstruction) - (principal.length + extras.reduce((n, x) => n + x.length, 0)) / CPT;
        const permitido = Math.floor((limite * 0.85 - fixo) * CPT);      // caracteres de autos que cabem no pedido final
        const base = { apiKey: resto.apiKey, keyPool: resto.keyPool, isNativeAllowed: resto.isNativeAllowed, res: resto.res };

        // 0) compactação sem perda (cabeçalhos/rodapés repetidos, espaços): se bastar, nem classifica nem corta nada
        const antesCompactar = unidades.reduce((n, u) => n + u.t.length, 0);
        const freq = new Map<string, number>();
        for (const u of unidades) for (const l of new Set(u.t.split("\n").map(x => x.trim()))) if (l && l.length < 200 && !LOCALIZADOR.test(l)) freq.set(l, (freq.get(l) || 0) + 1);
        const repetidas = new Set([...freq].filter(([, c]) => c >= Math.max(5, Math.ceil(unidades.length * 0.04))).map(([l]) => l));
        unidades = unidades.map(u => ({ ...u, t: compactar(u.t, repetidas) }));
        unidades = removerRepeticoes(unidades);
        const depoisCompactar = unidades.reduce((n, u) => n + u.t.length, 0);
        const cabeCompacto = depoisCompactar <= permitido;
        log(`[Autos Grandes] Compactação sem perda: ${Math.round(antesCompactar / 1000)}k → ${Math.round(depoisCompactar / 1000)}k caracteres (cabem ${Math.round(permitido / 1000)}k)${cabeCompacto ? ": basta, sem classificar nem cortar páginas." : "."}`);

        if (!cabeCompacto) onProgresso?.("os autos passam do limite da chave gratuita: compactando e classificando as páginas…", 0.05);
        // 1) classificação por partes (cada parte fica bem abaixo do limite)
        const contexto = String(prompt.match(/Tipo de ato[^\n]*|TIPO DE (?:ATO|MINUTA)[^\n]*/i)?.[0] || "").slice(0, 200);
        const partes = cabeCompacto ? [] : dividir(unidades, Math.floor(limite * 0.55 * CPT));
        log(`[Autos Grandes] Pedido recusado pelo limite gratuito (~${Math.round((permitido / CPT + fixo) / 1000)}k→limite ${Math.round(limite / 1000)}k). Classificando ${unidades.length} páginas em ${partes.length} parte(s) por relevância...`);
        const classe = new Map<number, { c: Classe; m: string }>();
        for (let i = 0; i < partes.length; i++) {
            onProgresso?.(`classificando as páginas por relevância (parte ${i + 1} de ${partes.length})…`, 0.08 + 0.4 * (i / Math.max(1, partes.length)));
            const texto = partes[i].map(u => sintetico ? `[Página ${u.n} de ${unidades.length}]\n${u.t}` : u.t).join("");
            let ok = false;
            for (let tent = 1; tent <= 2 && !ok; tent++) {
                const resp = await chamar(gerar, base, {
                    timeoutMs: 240000,
                    contents: [{ role: "user", parts: [{ text: `Contexto do ato a minutar: ${contexto || "minuta judicial"}. Parte ${i + 1} de ${partes.length} dos autos (páginas ${partes[i][0].n} a ${partes[i][partes[i].length - 1].n}).\n\nAUTOS:\n"""\n${texto}\n"""` }] }],
                    config: { systemInstruction: SISTEMA_CLASSIFICADOR, temperature: 0, maxOutputTokens: 8192, responseMimeType: "application/json" }
                }, pausa, log, `classificação ${i + 1}/${partes.length}`);
                let j: any = null; try { j = JSON.parse(String(resp?.text || "").replace(/^```json|```$/g, "").trim()); } catch { /* tenta de novo */ }
                if (j && Array.isArray(j.segmentos)) {
                    for (const s of j.segmentos) {
                        const c: Classe = s?.classe === "dispensavel" ? "dispensavel" : s?.classe === "relevante" ? "relevante" : "essencial";
                        for (let n = Number(s?.de); n <= Number(s?.ate) && n - Number(s?.de) < 5000; n++) classe.set(n, { c, m: String(s?.motivo || "").slice(0, 80) });
                    }
                    ok = true;
                }
            }
            if (!ok) log(`[Autos Grandes] Parte ${i + 1}: classificação inválida; as páginas ficam como ESSENCIAIS (nada é removido nelas).`);
        }

        // 2) tira só o dispensável; 3) se precisar, abrevia páginas relevantes (maiores primeiro); essenciais nunca são tocadas
        const saida = unidades.map(u => ({ ...u, c: (classe.get(u.n)?.c || "essencial") as Classe, m: classe.get(u.n)?.m || "", out: u.t }));
        const total = () => saida.reduce((n, u) => n + u.out.length, 0);
        let removidas = 0, abreviadas = 0;
        for (const u of saida) if (u.c === "dispensavel") { u.out = `[Página ${u.n} omitida: ${u.m || "sem relevância para a minuta"}]\n`; removidas++; }
        if (total() > permitido) {
            for (const u of [...saida].filter(x => x.c === "relevante").sort((a, b) => b.t.length - a.t.length)) {
                if (total() <= permitido) break;
                if (u.t.length > 2500) { u.out = u.t.slice(0, 1500) + `\n[... página ${u.n}: trecho do meio omitido (documento de relevância secundária) ...]\n` + u.t.slice(-700) + "\n"; abreviadas++; }
            }
        }
        const nEss = saida.filter(u => u.c === "essencial").length;
        log(`[Autos Grandes] ${nEss} página(s) essenciais mantidas; ${removidas} dispensável(is) omitida(s); ${abreviadas} relevante(s) abreviada(s). Autos: ${Math.round(principal.length / 1000)}k → ${Math.round(total() / 1000)}k caracteres (cabem ${Math.round(permitido / 1000)}k).`);
        let corpoFinal = "", dossieN = 0;
        if (total() > permitido) {
            // 5) só as páginas essenciais ainda não cabem: lê em PARTES, cada uma vira um dossiê fiel (com localização e transcrição literal dos trechos decisivos); a minuta sai do dossiê + decisões na íntegra
            log(`[Autos Grandes] As páginas essenciais (~${Math.round(total() / CPT / 1000)}k tokens) ainda passam do limite: gerando dossiê fático-probatório por partes.`);
            const uteis = saida.filter(u => u.c !== "dispensavel");
            const partesD = dividir(uteis.map(u => ({ n: u.n, t: u.out })), Math.floor(limite * 0.55 * CPT));
            const memos: string[] = [];
            for (let i = 0; i < partesD.length; i++) {
                onProgresso?.(`lendo os autos em partes (parte ${i + 1} de ${partesD.length})…`, 0.5 + 0.4 * (i / Math.max(1, partesD.length)));
                const txtParte = partesD[i].map(u => sintetico ? `[Página ${u.n} de ${unidades.length}]\n${u.t}` : u.t).join("");
                const resp = await chamar(gerar, base, {
                    timeoutMs: 240000,
                    contents: [{ role: "user", parts: [{ text: `PARTE ${i + 1} DE ${partesD.length} DOS AUTOS (páginas ${partesD[i][0].n} a ${partesD[i][partesD[i].length - 1].n}).\n\n${txtParte}` }] }],
                    config: { systemInstruction: SISTEMA_DOSSIE, temperature: 0, maxOutputTokens: 24000 }
                }, pausa, log, `dossiê ${i + 1}/${partesD.length}`);
                const memo = String(resp?.text || "").trim();
                if (memo.length < 200) throw new Error(`Não foi possível extrair a parte ${i + 1} de ${partesD.length} dos autos grandes (resposta vazia da IA). Tente novamente em alguns minutos.`);
                memos.push(`### PARTE ${i + 1} DE ${partesD.length} — páginas ${partesD[i][0].n} a ${partesD[i][partesD[i].length - 1].n}\n${memo}`);
                log(`[Autos Grandes] Dossiê ${i + 1}/${partesD.length} pronto (${memo.length} caracteres).`);
            }
            const dossie = `[DOSSIÊ FÁTICO-PROBATÓRIO DOS AUTOS INTEGRAIS: os autos (~${Math.round(principal.length / CPT / 1000)} mil tokens) excedem o limite de entrada da API gratuita. Foram lidos integralmente em ${memos.length} partes e extraídos fielmente abaixo, com localização (Mov./Arq./Pág.) e transcrição literal dos trechos decisivos. Use SOMENTE o que consta aqui e nos trechos integrais.]\n\n${memos.join("\n\n")}\n\n`;
            let sobra = permitido - dossie.length - 4000;
            if (sobra < 0) { const er: any = new Error(`Os autos têm cerca de ${Math.round(principal.length / CPT / 1000)} mil tokens e o dossiê gerado ainda não cabe no limite gratuito. Use uma chave com faturamento ativa.`); er.codigo = "AUTOS_ESSENCIAIS_ACIMA_DO_LIMITE"; throw er; }
            const decisivas: string[] = [];
            for (const u of uteis) { if (/DECIS[ÃA]O|DESPACHO|SENTEN[ÇC]A|JULGO|DEFIRO|INDEFIRO|DETERMINO|HOMOLOGO/i.test(u.out) && u.out.length <= sobra) { decisivas.push(u.out); sobra -= u.out.length; } }
            corpoFinal = dossie + (decisivas.length ? `[TRECHOS INTEGRAIS DE DECISÕES, DESPACHOS E SENTENÇAS (transcrição literal, ${decisivas.length} página(s))]\n` + decisivas.join("") : "");
            dossieN = memos.length;
        }
        const aviso = (cabeCompacto && !removidas && !abreviadas) ? `[AVISO DO SISTEMA: autos extensos (~${Math.round(principal.length / CPT / 1000)} mil tokens). Para caber no limite da API gratuita o texto foi compactado sem perda de conteúdo informativo (sequências idênticas repetidas em muitas páginas, como cabeçalhos e avisos padrão, ficaram só na primeira ocorrência). Nenhuma página foi omitida.]\n\n` : (removidas || abreviadas) ? `[AVISO DO SISTEMA: autos extensos (~${Math.round(principal.length / CPT / 1000)} mil tokens). Para caber no limite da API gratuita foram omitidas ${removidas} página(s) sem relevância para a minuta (documentos pessoais, comprovantes, procurações e similares, indicadas no texto como "[Página N omitida: ...]") e abreviadas ${abreviadas} página(s) de documentos secundários. Todas as petições, decisões, certidões e provas essenciais estão integralmente no texto abaixo.]\n\n` : "";
        let reduzido = prompt.split(principal).join(corpoFinal || (aviso + saida.map(u => u.out).join("")));
        for (const x of extras) reduzido = reduzido.split(x).join("(conteúdo já incluído acima)");

        // 4) Etapa 1 sobre os autos reduzidos (primeiro nos modelos profundos; espera a janela do minuto se preciso)
        const contents = JSON.parse(JSON.stringify(resto.contents || []));
        if (contents[0]?.parts?.[0]) contents[0].parts[0] = { text: reduzido };
        if (Array.isArray(autosGrandes.partesRef) && autosGrandes.partesRef.length > 0) autosGrandes.partesRef[0] = { text: reduzido };
        onProgresso?.("analisando os autos reduzidos (fatos, partes e provas)…", 0.93);
        const { customModelQueue: _q, maxCycles: _c, ...semFila } = resto;
        const resposta = await chamar(gerar, {}, { ...semFila, contents }, pausa, log, "Etapa 1 sobre os autos reduzidos");
        // relatório do que foi feito (o servidor devolve ao app, que mostra na tela)
        const faixas = (pred: (u: any) => boolean) => { const r: { de: number; ate: number; motivo: string }[] = []; for (const u of saida) if (pred(u)) { const l = r[r.length - 1]; if (l && l.ate === u.n - 1 && l.motivo === u.m) l.ate = u.n; else r.push({ de: u.n, ate: u.n, motivo: u.m }); } return r; };
        const omitidas = faixas(u => u.c === "dispensavel"), faixasAbreviadas = faixas(u => u.c === "relevante" && u.out !== u.t);
        const txt = (r: { de: number; ate: number; motivo: string }[]) => r.slice(0, 25).map(x => `${x.de === x.ate ? x.de : x.de + "–" + x.ate}${x.motivo ? " (" + x.motivo + ")" : ""}`).join("; ") + (r.length > 25 ? `; … (+${r.length - 25} trechos)` : "");
        (resposta as any).autosReduzidos = {
            tokensOriginais: Math.round(principal.length / CPT), paginasTotal: unidades.length, essenciais: nEss, omitidas, abreviadas: faixasAbreviadas,
            resumo: `Autos grandes (~${Math.round(principal.length / CPT / 1000)} mil tokens, ${unidades.length} páginas): para caber no limite da chave gratuita, ${cabeCompacto ? "o texto foi compactado sem perda de conteúdo informativo (sequências idênticas que se repetem em muitas páginas, como cabeçalhos e avisos padrão, ficaram só na primeira ocorrência) e nenhuma página foi cortada" : "a IA classificou as páginas"}. ${cabeCompacto ? "" : nEss + " essenciais foram mantidas integralmente. "}${dossieN ? `As páginas essenciais ainda excediam o limite: foram lidas em ${dossieN} partes e extraídas em dossiê fiel (com localização e transcrição literal dos trechos decisivos), mantendo na íntegra as decisões, despachos e sentenças. ` : ""}` +
                (removidas ? `Omitidas ${removidas} página(s) sem relevância para a minuta: ${txt(omitidas)}. ` : "Nenhuma página foi omitida. ") +
                (faixasAbreviadas.length ? `Abreviadas (documentos secundários): ${txt(faixasAbreviadas)}.` : "")
        };
        return resposta;
    }
}
