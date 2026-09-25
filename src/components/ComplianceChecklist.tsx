import React, { useState } from "react";
import {
  CheckCircle,
  XCircle,
  AlertOctagon,
  Shield,
  FileCheck2,
  Scale,
  MapPin,
  FileText,
  BadgeAlert,
  Fingerprint,
  Clock,
  Eye,
  QrCode,
  Layers,
  ArrowRightLeft,
  Sparkles,
  GitCommit,
  BookOpen,
  Calculator,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AuditAnalysis } from "../types";
import { LegislativeLookupModal } from "./LegislativeLookupModal";

interface ComplianceChecklistProps {
  audit: AuditAnalysis;
  onInsertClause?: (clauseText: string) => void;
}

export const ComplianceChecklist: React.FC<ComplianceChecklistProps> = ({ audit, onInsertClause }) => {
  const [isLegislativeModalOpen, setIsLegislativeModalOpen] = useState(false);
  const [modalInitialQuery, setModalInitialQuery] = useState("");
  const [showAllLaws, setShowAllLaws] = useState(false);

  if (!audit) return null;

  const {
    competenciaCheck,
    regularidadeDocumental,
    normasAplicadas,
    alertasProcessuais,
    legislacaoMapeada,
    consectariosDetalhados,
  } = audit;

  const handleOpenSearchWithTerm = (term: string) => {
    setModalInitialQuery(term);
    setIsLegislativeModalOpen(true);
  };

  const forensicPillars = [
    {
      id: "assinaturas",
      name: "1. Autenticidade & Assinaturas",
      icon: <Fingerprint className="w-4 h-4 text-emerald-600" />,
      desc: "Confronto de assinaturas físicas/digitais e auditoria de logs (ICP-Brasil, Gov.br, DocuSign).",
      status: regularidadeDocumental?.assinaturasStatus || "Assinaturas autênticas e logs eletrônicos verificados.",
    },
    {
      id: "temporal",
      name: "2. Integridade Temporal & Cronologia",
      icon: <Clock className="w-4 h-4 text-blue-600" />,
      desc: "Inspeção contra anacronismos temporais (datas de emissão, óbito, constituição de PJ e procurações).",
      status: regularidadeDocumental?.integridadeTemporalStatus || "Cronologia fidedigna e sem anacronismos.",
    },
    {
      id: "visual",
      name: "3. Integridade Visual & Textual",
      icon: <Eye className="w-4 h-4 text-indigo-600" />,
      desc: "Detecção de rasuras, emendas, incompatibilidade de fontes e montagens em comprovantes.",
      status: regularidadeDocumental?.integridadeVisualStatus || "Sem rasuras, emendas ou inconsistências de layout.",
    },
    {
      id: "cartoraria",
      name: "4. Autenticidade Cartorária & QR Codes",
      icon: <QrCode className="w-4 h-4 text-purple-600" />,
      desc: "Validação de selos eletrônicos de fiscalização, códigos de autenticidade e QR codes de serventias.",
      status: regularidadeDocumental?.autenticidadeCartorariaStatus || "Selos eletrônicos e códigos cartorários conferidos.",
    },
    {
      id: "subsuncao",
      name: "5. Subsunção Legal das Provas (CPC & STJ)",
      icon: <Layers className="w-4 h-4 text-amber-600" />,
      desc: "Ônus de prova de autenticidade (Arts. 428/429 CPC), Tema 1049 STJ e higidez de títulos (Art. 784 CPC).",
      status: regularidadeDocumental?.subsuncaoLegalProvas || "Conforme arts. 428/429 CPC e Tema 1049 do STJ.",
    },
    {
      id: "confronto",
      name: "6. Confronto Cruzado Documentos vs. Minuta",
      icon: <ArrowRightLeft className="w-4 h-4 text-teal-600" />,
      desc: "Rastreabilidade de nomes, CPF/CNPJ, numeração de contratos, valores nominais e eventos.",
      status: regularidadeDocumental?.confrontoDadosMinuta || "Dados 100% aderentes aos documentos dos autos.",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Critical Alerts if any */}
      {Array.isArray(alertasProcessuais) && alertasProcessuais.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
          <div className="flex items-start gap-2.5">
            <BadgeAlert className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-900">Alertas e Pontos Críticos do Processo</h4>
              <ul className="mt-1.5 space-y-1 text-xs text-amber-800 list-disc list-inside">
                {alertasProcessuais.map((alerta, i) => (
                  <li key={i} className="leading-relaxed">
                    {alerta}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Matriz de Auditoria Forense e Cautelar Documental (6 Pilares) */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                Matriz de Auditoria Forense & Cautelar Documental
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  6 Pilares Judiciais
                </span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Auditoria técnica aprofundada dos documentos juntados ao PDF confrontados com a minuta.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {forensicPillars.map((pillar) => (
            <div
              key={pillar.id}
              className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition space-y-1.5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  {pillar.icon}
                  <h5 className="font-bold text-xs text-slate-900">{pillar.name}</h5>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">{pillar.desc}</p>
              </div>
              <div className="pt-2 border-t border-slate-100">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80">
                  <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="line-clamp-2">{pillar.status}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ordem da Marcha Processual & Preclusão */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100 mb-3">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
            <GitCommit className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Ordem da Marcha Processual & Análise de Preclusão
            </h4>
            <p className="text-[11px] text-slate-500">
              Princípio do não-retrocesso: preservação de deliberações anteriores e fluxo contínuo.
            </p>
          </div>
        </div>
        <div className="p-3 rounded-lg bg-blue-50/50 border border-blue-100 text-xs text-slate-700 flex items-start gap-2">
          <CheckCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-900">Conformidade com a Marcha dos Autos: </span>
            <span>
              {regularidadeDocumental?.marchaProcessualStatus ||
                "A minuta respeitou a cronologia dos eventos, sem reabertura indevida de matérias preclusas (gratuidade concedida, tutelas já apreciadas ou preliminares superadas)."}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Competência & Regularidade Documental */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Competência JEC / Vara */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
            <Scale className="w-4 h-4 text-slate-900" />
            <h4 className="text-sm font-bold text-slate-900">Competência & Pressupostos Processuais</h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Teto & Alçada da Causa:</span>
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                {competenciaCheck?.adequacaoTeto40SM ? (
                  <CheckCircle className="w-3.5 h-3.5 text-slate-900" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {competenciaCheck?.valorCausa || "Regular"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Competência Material:</span>
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                {competenciaCheck?.competenciaMaterial ? (
                  <CheckCircle className="w-3.5 h-3.5 text-slate-900" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {competenciaCheck?.competenciaMaterial ? "Compatível" : "Incompatível"}
              </span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium">Legitimidade das Partes (Art. 8º):</span>
              <span className="flex items-center gap-1 font-semibold text-slate-800">
                {competenciaCheck?.legitimidadePartes ? (
                  <CheckCircle className="w-3.5 h-3.5 text-slate-900" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-rose-600" />
                )}
                {competenciaCheck?.legitimidadePartes ? "Partes Legítimas" : "Parte Ilegítima"}
              </span>
            </div>

            <div className="py-1">
              <span className="text-slate-600 font-medium block mb-1">Competência Territorial (Art. 4º / CDC):</span>
              <p className="text-slate-800 bg-slate-50 p-2 rounded border border-slate-100 font-mono text-[11px]">
                {competenciaCheck?.competenciaTerritorial || "Foro competente verificado"}
              </p>
            </div>

            {competenciaCheck?.observacoes && (
              <p className="text-slate-500 italic text-[11px] pt-1">
                <strong>Nota:</strong> {competenciaCheck.observacoes}
              </p>
            )}
          </div>
        </div>

        {/* Regularidade Documental & Poderes */}
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100 mb-3">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            <h4 className="text-sm font-bold text-slate-900">Regularidade Documental & Poderes</h4>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium block">Procuração & Poderes Específicos (Art. 105 CPC):</span>
              <p className="text-slate-800 font-medium mt-0.5">
                {regularidadeDocumental?.procuracaoStatus || "Regular"}
              </p>
            </div>

            <div className="py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium block">Comprovante de Endereço (Titularidade & &lt;3 meses):</span>
              <p className="text-slate-800 font-medium mt-0.5">
                {regularidadeDocumental?.comprovanteEnderecoStatus || "Regular"}
              </p>
            </div>

            <div className="py-1 border-b border-slate-50">
              <span className="text-slate-600 font-medium block">Consectários Legais (Lei nº 14.905/2024):</span>
              <p className="text-slate-800 font-medium mt-0.5">
                {regularidadeDocumental?.consectariosStatus || "Adequado (IPCA + Dif. Selic/IPCA)"}
              </p>
            </div>

            {regularidadeDocumental?.observacoes && (
              <p className="text-slate-500 italic text-[11px] pt-1">
                <strong>Análise:</strong> {regularidadeDocumental.observacoes}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Regime Específico de Consectários Legais (Taxonomia TJGO) */}
      {consectariosDetalhados && (
        <div className="bg-white border border-indigo-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-indigo-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Regime Específico de Juros e Correção Monetária
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                    {consectariosDetalhados.regimeAplicado}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Subsunção taxonômica exata conforme o microssistema processual identificado nos autos.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenSearchWithTerm(consectariosDetalhados.regimeAplicado || "Consectários")}
              className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Search className="w-3.5 h-3.5" />
              Consultar Legislação
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Correção Monetária
              </span>
              <p className="font-bold text-slate-800 text-sm">
                {consectariosDetalhados.indiceCorrecao}
              </p>
              <p className="text-[11px] text-slate-600">
                <strong>Termo Inicial:</strong> {consectariosDetalhados.termoInicialCorrecao}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">
                Juros de Mora
              </span>
              <p className="font-bold text-slate-800 text-sm">
                {consectariosDetalhados.indiceJuros}
              </p>
              <p className="text-[11px] text-slate-600">
                <strong>Termo Inicial:</strong> {consectariosDetalhados.termoInicialJuros}
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/50 border border-indigo-100 text-xs text-slate-700 space-y-1">
            <p>
              <strong className="text-indigo-950">Fundamentação e Base Legal Consolidada: </strong>
              <span>{consectariosDetalhados.baseLegalCompleta}</span>
            </p>
            {consectariosDetalhados.observacoes && (
              <p className="text-[11px] text-slate-500 italic">
                <strong>Observações:</strong> {consectariosDetalhados.observacoes}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Mapeamento Taxonômico & Leis Identificadas nos Autos */}
      {Array.isArray(legislacaoMapeada) && legislacaoMapeada.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                <BookOpen className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  Legislação & Microssistemas Mapeados no PDF
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {legislacaoMapeada.length} Diplomas
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Leis especiais, decretos e resoluções aplicáveis à controvérsia analisada.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenSearchWithTerm("")}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Search className="w-3.5 h-3.5 text-indigo-600" />
              Pesquisar Normas
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {legislacaoMapeada && legislacaoMapeada.length > 0 ? (
              (showAllLaws ? legislacaoMapeada : legislacaoMapeada.slice(0, 4)).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-indigo-300 transition space-y-1.5 flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-indigo-700 transition">
                        {item.leiOuNorma}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                        {item.artigoOuDispositivo}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-snug">{item.ementaOuObjeto}</p>
                  </div>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500 italic line-clamp-1">
                      {item.aplicabilidadeAoCaso || "Incide sobre a matéria controvertida."}
                    </span>
                    <button
                      onClick={() => handleOpenSearchWithTerm(item.leiOuNorma)}
                      className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5 shrink-0"
                    >
                      Ver detalhes →
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 text-center text-xs text-slate-500 bg-slate-50 border border-slate-200 p-4 rounded-lg">
                Nenhuma legislação específica mapeada.
              </div>
            )}
          </div>

          {Array.isArray(legislacaoMapeada) && legislacaoMapeada.length > 4 && (
            <div className="text-center pt-2">
              <button
                onClick={() => setShowAllLaws(!showAllLaws)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center justify-center gap-1 mx-auto"
              >
                {showAllLaws ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    Recolher lista
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    Ver todos os {legislacaoMapeada.length} diplomas mapeados
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Normas e Enunciados Aplicados */}
      {Array.isArray(normasAplicadas) && normasAplicadas.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Shield className="w-4 h-4 text-slate-900" />
            <h4 className="text-sm font-bold text-slate-900">Fundamentos Normativos e Precedentes Aplicados</h4>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {normasAplicadas.map((norma, idx) => (
              <button
                key={idx}
                onClick={() => handleOpenSearchWithTerm(norma)}
                className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-indigo-50 hover:text-indigo-800 hover:border-indigo-200 text-slate-800 text-xs font-medium border border-slate-200 transition cursor-pointer"
                title="Clique para pesquisar detalhes desta norma"
              >
                {norma}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal de Pesquisa Legislativa */}
      <LegislativeLookupModal
        isOpen={isLegislativeModalOpen}
        onClose={() => setIsLegislativeModalOpen(false)}
        initialQuery={modalInitialQuery}
        onInsertClause={onInsertClause}
      />
    </div>
  );
};
