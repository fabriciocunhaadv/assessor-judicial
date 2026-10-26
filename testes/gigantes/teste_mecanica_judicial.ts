import { conferenciasMecanica, avisoCompetencia, verificarPedidosSemPeca, avisoVazamentoInterno, citacoesInvalidas, REGRAS_MECANICA_JUDICIAL } from "../../src/utils/mecanicaJudicial";
const autos = "Juízo: Montes Claros - Juizado Especial Criminal\nMovimentacao 1 : APF Arquivo 1: a.pdf - Pag.1/3\nMovimentacao 1 : APF Arquivo 8: b.pdf - Pag.1/2\nMovimentacao 2 : x Arquivo 1: c.pdf - Pag.1/1\nMovimentacao 3 : y Arquivo 1: d.pdf - Pag.1/1\nNão se trata de infração de menor potencial ofensivo";
const min = { relatorio: "O Ministério Público pugnou pela homologação do flagrante. Conforme (Mov. 1, Arq. 8, Pág. 5) e (Mov. 1, Arq. 1, Pág. 2).", fundamentacao: "### 4. DA APLICAÇÃO DAS TESES DO GABINETE" };
const r = conferenciasMecanica(min, autos); console.log(JSON.stringify(r));
const ok = conferenciasMecanica({ relatorio: "Declaro a incompetência do Juizado. O MP manifestou-se (Mov. 3, Arq. 1, Pág. 1)." }, autos); console.log(JSON.stringify(ok));
if (!r.avisoCompetencia || !r.avisoPedidoSemPeca || !r.avisoVazamento || r.avisoCitacao?.length !== 1 || Object.keys(ok).length) { console.error("FALHOU"); process.exit(1); }
console.log("OK", REGRAS_MECANICA_JUDICIAL.length);
