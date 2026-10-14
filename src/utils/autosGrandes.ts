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
const estimar = (contents: any, sys: any) => Math.ceil((JSON.stringify(contents || "").length + String(typeof sys === "string" ? sys : JSON.stringify(sys || "")).length) / CPT);

const SISTEMA_CLASSIFICADOR = `Você é um CLASSIFICADOR DE RELEVÂNCIA de páginas de autos judiciais brasileiros (TJGO). Você recebe parte dos autos, página a página (marcadores "[Página N de M]"), e o contexto do ato que será minutado.
Classifique cada página quanto à utilidade para redigir a minuta (relatório, fundamentação e dispositivo):
- "essencial": petição inicial, contestação, réplica, manifestações e requerimentos das partes e do Ministério Público, decisões, despachos, sentenças, acórdãos, atas e termos de audiência, laudos e perícias, cálculos, certidões de citação/intimação/decurso de prazo/trânsito em julgado, contratos e documentos que sustentam pedidos ou defesas, prova relevante, e qualquer página que mude o resultado ou o andamento.
- "relevante": prova documental ou anexo que pode importar, mas de importância secundária (extratos, comprovantes de pagamento ligados ao pedido, fotografias, conversas, anexos longos).
- "dispensavel": SOMENTE o que não influi na minuta: documentos pessoais sem valor de prova no caso (RG, CPF, CNH, título), comprovante de residência, procuração, substabelecimento, declaração de hipossuficiência padrão, guias e comprovantes de custas sem controvérsia, aviso de recebimento ou expedientes de mera comunicação sem conteúdo, termos de juntada e capas, páginas em branco ou ilegíveis, repetições idênticas de páginas já classificadas.
REGRA DE OURO: na dúvida, classifique como "relevante" ou "essencial". Nunca marque como dispensável página que contenha pedido, decisão, prazo, valor, prova do mérito ou fato discutido.
Responda SOMENTE um JSON: {"segmentos":[{"de":N,"ate":N,"classe":"essencial|relevante|dispensavel","motivo":"até 8 palavras"}]}, agrupando páginas consecutivas de mesma classe, em ordem, sem lacunas.`;

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
            ultimo = e; if (ehErroEntradaGrande(e)) throw e;
            log(`[Autos Grandes] ${rotulo}, tentativa ${tent}: ${String(e?.message || e).slice(0, 140)}`);
            if (tent < 4) await dorme(pausaMs);
        }
    }
    throw ultimo;
}

export async function gerarComAutosGrandes(gerar: (o: any) => Promise<any>, opts: any): Promise<any> {
    const { autosGrandes, ...resto } = opts;
    try {
        return await gerar(resto);
    } catch (e: any) {
        if (!autosGrandes || !ehErroEntradaGrande(e)) throw e;
        const log = (m: string) => console.log(m);
        const pausa = Number(process.env.AUTOS_GRANDES_PAUSA_MS || 62000);
        const prompt: string = autosGrandes.userPrompt;
        const grandes: string[] = (autosGrandes.textos || []).filter((t: any) => typeof t === "string" && t.length >= MIN_CHARS_AUTOS && prompt.includes(t)).sort((a: string, b: string) => b.length - a.length);
        if (!grandes.length) throw e;
        const principal = grandes[0], extras = grandes.slice(1).filter(t => !principal.includes(t));
        const unidades = principal.split(/(?=\[Página \d+ de \d+\])/).filter(x => x.length > 0).map((t, i) => ({ n: Number(t.match(/^\[Página (\d+) de/)?.[1] || 0), t }));
        if (unidades.filter(u => u.n > 0).length < 20) throw e;      // sem marcadores de página não dá para classificar com segurança

        const limite = limiteDoErro(e);
        const fixo = estimar(resto.contents, resto.config?.systemInstruction) - (principal.length + extras.reduce((n, x) => n + x.length, 0)) / CPT;
        const permitido = Math.floor((limite * 0.85 - fixo) * CPT);      // caracteres de autos que cabem no pedido final
        const base = { apiKey: resto.apiKey, keyPool: resto.keyPool, isNativeAllowed: resto.isNativeAllowed, res: resto.res };

        // 1) classificação por partes (cada parte fica bem abaixo do limite)
        const contexto = String(prompt.match(/Tipo de ato[^\n]*|TIPO DE (?:ATO|MINUTA)[^\n]*/i)?.[0] || "").slice(0, 200);
        const partes = dividir(unidades, Math.floor(limite * 0.55 * CPT));
        log(`[Autos Grandes] Pedido recusado pelo limite gratuito (~${Math.round((permitido / CPT + fixo) / 1000)}k→limite ${Math.round(limite / 1000)}k). Classificando ${unidades.length} páginas em ${partes.length} parte(s) por relevância...`);
        const classe = new Map<number, { c: Classe; m: string }>();
        for (let i = 0; i < partes.length; i++) {
            const texto = partes[i].map(u => u.t).join("");
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
        if (total() > permitido) {
            const er: any = new Error(`Os autos têm cerca de ${Math.round(principal.length / CPT / 1000)} mil tokens. Mesmo omitindo o que é dispensável (${removidas} páginas) e abreviando documentos secundários (${abreviadas}), as páginas essenciais ainda passam do limite de entrada gratuito do Google (${Math.round(limite / 1000)} mil tokens). Para não cortar o que importa, use uma chave com faturamento ativado.`);
            er.codigo = "AUTOS_ESSENCIAIS_ACIMA_DO_LIMITE"; throw er;
        }
        const aviso = (removidas || abreviadas) ? `[AVISO DO SISTEMA: autos extensos (~${Math.round(principal.length / CPT / 1000)} mil tokens). Para caber no limite da API gratuita foram omitidas ${removidas} página(s) sem relevância para a minuta (documentos pessoais, comprovantes, procurações e similares, indicadas no texto como "[Página N omitida: ...]") e abreviadas ${abreviadas} página(s) de documentos secundários. Todas as petições, decisões, certidões e provas essenciais estão integralmente no texto abaixo.]\n\n` : "";
        let reduzido = prompt.split(principal).join(aviso + saida.map(u => u.out).join(""));
        for (const x of extras) reduzido = reduzido.split(x).join("(conteúdo já incluído acima)");

        // 4) Etapa 1 sobre os autos reduzidos (primeiro nos modelos profundos; espera a janela do minuto se preciso)
        const contents = JSON.parse(JSON.stringify(resto.contents || []));
        if (contents[0]?.parts?.[0]) contents[0].parts[0] = { text: reduzido };
        if (Array.isArray(autosGrandes.partesRef) && autosGrandes.partesRef.length > 0) autosGrandes.partesRef[0] = { text: reduzido };
        const { customModelQueue: _q, maxCycles: _c, ...semFila } = resto;
        const resposta = await chamar(gerar, {}, { ...semFila, contents }, pausa, log, "Etapa 1 sobre os autos reduzidos");
        // relatório do que foi feito (o servidor devolve ao app, que mostra na tela)
        const faixas = (pred: (u: any) => boolean) => { const r: { de: number; ate: number; motivo: string }[] = []; for (const u of saida) if (pred(u)) { const l = r[r.length - 1]; if (l && l.ate === u.n - 1 && l.motivo === u.m) l.ate = u.n; else r.push({ de: u.n, ate: u.n, motivo: u.m }); } return r; };
        const omitidas = faixas(u => u.c === "dispensavel"), faixasAbreviadas = faixas(u => u.c === "relevante" && u.out !== u.t);
        const txt = (r: { de: number; ate: number; motivo: string }[]) => r.slice(0, 25).map(x => `${x.de === x.ate ? x.de : x.de + "–" + x.ate}${x.motivo ? " (" + x.motivo + ")" : ""}`).join("; ") + (r.length > 25 ? `; … (+${r.length - 25} trechos)` : "");
        (resposta as any).autosReduzidos = {
            tokensOriginais: Math.round(principal.length / CPT), paginasTotal: unidades.length, essenciais: nEss, omitidas, abreviadas: faixasAbreviadas,
            resumo: `Autos grandes (~${Math.round(principal.length / CPT / 1000)} mil tokens, ${unidades.length} páginas): para caber no limite da chave gratuita, a IA classificou as páginas. ${nEss} essenciais foram mantidas integralmente. ` +
                (removidas ? `Omitidas ${removidas} página(s) sem relevância para a minuta: ${txt(omitidas)}. ` : "Nenhuma página foi omitida. ") +
                (faixasAbreviadas.length ? `Abreviadas (documentos secundários): ${txt(faixasAbreviadas)}.` : "")
        };
        return resposta;
    }
}
