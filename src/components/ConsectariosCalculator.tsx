import React, { useState } from "react";
import { Calculator, HelpCircle, Check, Copy } from "lucide-react";

export const ConsectariosCalculator: React.FC = () => {
  const [natureza, setNatureza] = useState<"dano_moral_extra" | "dano_moral_contra" | "dano_material_extra" | "dano_material_contra" | "obrigacao_titulo">("dano_moral_extra");
  const [valorPrincipal, setValorPrincipal] = useState<number>(5000);
  const [dataEvento, setDataEvento] = useState<string>("2024-11-15");
  const [dataCitacao, setDataCitacao] = useState<string>("2025-01-10");
  const [dataSentenca, setDataSentenca] = useState<string>("2025-04-14");
  const [copied, setCopied] = useState<boolean>(false);

  const getFormulaDetails = () => {
    switch (natureza) {
      case "dano_moral_extra":
        return {
          tipo: "Dano Moral (Responsabilidade Extracontratual)",
          correcao: "IPCA a partir da data do arbitramento / sentença (Súmula 362/STJ c/c art. 389, § 1º, do CC).",
          juros: "Diferença entre a taxa Selic e o IPCA (art. 406, §§ 1º e 3º, do CC), a incidir desde a data do evento danoso (Súmula 54/STJ).",
          dispositivoTexto: `a) Correção monetária pelo IPCA, a partir da data desta sentença (Súmula 362/STJ), em conformidade com o art. 389, § 1º, do Código Civil;\nb) Juros de mora, calculados pela diferença entre a taxa Selic e o IPCA, nos termos do art. 406, §§ 1º e 3º, do Código Civil, a incidir desde a data do evento danoso (${dataEvento || "[data do fato]"}, Súmula 54/STJ).`,
        };
      case "dano_moral_contra":
        return {
          tipo: "Dano Moral (Responsabilidade Contratual)",
          correcao: "IPCA a partir da data da sentença/arbitramento (Súmula 362/STJ c/c art. 389, § 1º, do CC).",
          juros: "Diferença entre a taxa Selic e o IPCA (art. 406, §§ 1º e 3º, do CC), a incidir desde a citação válida (art. 405 do CC).",
          dispositivoTexto: `a) Correção monetária pelo IPCA, a partir da data desta sentença (Súmula 362/STJ), em conformidade com o art. 389, § 1º, do Código Civil;\nb) Juros de mora, calculados pela diferença entre a taxa Selic e o IPCA, nos termos do art. 406, §§ 1º e 3º, do Código Civil, a incidir a partir da data da citação válida (art. 405 do CC).`,
        };
      case "dano_material_extra":
        return {
          tipo: "Dano Material (Responsabilidade Extracontratual - Ex: Acidente)",
          correcao: "IPCA a partir da data do efetivo prejuízo / desembolso (Súmula 43/STJ c/c art. 389, § 1º, do CC).",
          juros: "Diferença entre Selic e IPCA (art. 406, §§ 1º e 3º, CC), desde a data do evento danoso (Súmula 54/STJ).",
          dispositivoTexto: `a) Correção monetária pelo IPCA, desde a data do efetivo prejuízo (${dataEvento || "[data do prejuízo]"}, Súmula 43/STJ), nos termos do art. 389, § 1º, do Código Civil;\nb) Juros de mora calculados pela diferença entre a taxa Selic e o IPCA, nos termos do art. 406, §§ 1º e 3º, do Código Civil, a incidir desde a data do evento danoso (Súmula 54/STJ).`,
        };
      case "dano_material_contra":
        return {
          tipo: "Dano Material (Responsabilidade Contratual / Restituição)",
          correcao: "IPCA desde o efetivo prejuízo / desembolso (Súmula 43/STJ c/c art. 389, § 1º, do CC).",
          juros: "Diferença entre Selic e IPCA (art. 406, §§ 1º e 3º, CC), a incidir desde a citação válida (art. 405 do CC).",
          dispositivoTexto: `a) Correção monetária pelo IPCA, a incidir desde a data do efetivo desembolso/prejuízo (${dataEvento || "[data do desembolso]"}, Súmula 43/STJ), nos termos do art. 389, § 1º, do Código Civil;\nb) Juros de mora calculados pela taxa Selic deduzido o IPCA (art. 406, §§ 1º e 3º, do Código Civil), devidos desde a citação (art. 405 do CC).`,
        };
      default:
        return {
          tipo: "Título Executivo / Cobrança com Vencimento Certo",
          correcao: "IPCA desde a data do inadimplemento / vencimento (art. 389, § 1º, CC).",
          juros: "Diferença entre Selic e IPCA (art. 406, §§ 1º e 3º, CC), a partir da data de vencimento da obrigação (mora ex re - art. 397 do CC).",
          dispositivoTexto: `a) Correção monetária pelo IPCA desde a data do inadimplemento/vencimento do título, nos termos do art. 389, § 1º, do Código Civil;\nb) Juros de mora calculados pela diferença entre a taxa Selic e o IPCA, devidos desde a data do inadimplemento (art. 397 c/c art. 406 do Código Civil).`,
        };
    }
  };

  const details = getFormulaDetails();

  const handleCopyClause = () => {
    navigator.clipboard.writeText(details.dispositivoTexto);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-slate-100 text-slate-700 flex items-center justify-center">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Parametrizador de Consectários Legais (Lei nº 14.905/2024)
            </h4>
            <p className="text-xs text-slate-500">
              Regime obrigatório de atualização: IPCA (Art. 389, §1º CC) e Juros Selic - IPCA (Art. 406 CC).
            </p>
          </div>
        </div>
      </div>

      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Natureza da Obrigação / Causa de Pedir:
          </label>
          <select
            value={natureza}
            onChange={(e: any) => setNatureza(e.target.value)}
            className="w-full p-2 rounded border border-slate-300 bg-slate-50 text-slate-800 font-medium focus:ring-1 focus:ring-slate-800"
          >
            <option value="dano_moral_extra">Dano Moral - Extracontratual (Negativação indevida, acidente, etc.)</option>
            <option value="dano_moral_contra">Dano Moral - Contratual (Descumprimento de contrato, atraso de voo)</option>
            <option value="dano_material_extra">Dano Material - Extracontratual (Colisão, prejuízo fático)</option>
            <option value="dano_material_contra">Dano Material - Contratual / Restituição de quantia paga</option>
            <option value="obrigacao_titulo">Execução / Cobrança de Título c/ Vencimento Certo (Art. 397 CC)</option>
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            Valor Principal da Condenação (R$):
          </label>
          <input
            type="number"
            value={valorPrincipal}
            onChange={(e) => setValorPrincipal(Number(e.target.value))}
            className="w-full p-2 rounded border border-slate-300 bg-slate-50 text-slate-800 font-mono text-sm"
          />
        </div>
      </div>

      {/* Breakdown Card */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-3.5 text-xs space-y-2">
        <div className="font-bold text-slate-900 flex items-center justify-between">
          <span>Critérios Legais Fixados para o Dispositivo:</span>
          <span className="text-[11px] font-normal text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
            Conforme TJGO & Lei 14.905/2024
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-700 pt-1">
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">📈 Correção Monetária:</span>
            <p className="text-slate-600">{details.correcao}</p>
          </div>
          <div className="bg-white p-2.5 rounded border border-slate-200">
            <span className="font-semibold text-slate-900 block mb-1">⚖️ Juros de Mora:</span>
            <p className="text-slate-600">{details.juros}</p>
          </div>
        </div>

        {/* Ready Clause to Copy */}
        <div className="mt-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-semibold text-slate-900">Texto Padronizado para o Dispositivo da Sentença:</span>
            <button
              onClick={handleCopyClause}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-medium transition cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-slate-400" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copiado!" : "Copiar Cláusula"}
            </button>
          </div>
          <pre className="p-2.5 bg-slate-900 text-slate-400 font-mono text-[11px] rounded whitespace-pre-wrap leading-relaxed">
            {details.dispositivoTexto}
          </pre>
        </div>
      </div>
    </div>
  );
};
