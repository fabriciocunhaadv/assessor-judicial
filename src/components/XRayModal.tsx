import React from "react";
import { X, Activity, FileText, Settings, ShieldCheck, CheckCircle2, Database, BrainCircuit, Scale } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface XRayModalProps {
  isOpen: boolean;
  onClose: () => void;
  stats: {
    pdfCount: number;
    hasProcessText: boolean;
    activePromptTitle: string;
    isTesesEnabled: boolean;
    paradigmTitle: string | null;
  };
}

export function XRayModal({ isOpen, onClose, stats }: XRayModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onClose}
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Raio-X da Minuta</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Transparência e Rastreabilidade da IA</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[75vh] space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Este painel revela exatamente como o <strong>Motor de Inferência</strong> interpretou o processo atual. Ele detalha as fontes de leitura, os limites de criatividade impostos e as regras jurídicas ativadas para redigir a minuta.
              </p>
            </div>

            {/* Step 1: Inputs */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <FileText className="w-4 h-4 text-emerald-500" />
                1. Fontes de Leitura (Inputs)
              </h4>
              <div className="grid gap-3 pl-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-3 rounded-lg flex items-start gap-3 shadow-sm">
                  <Database className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 text-sm">Autos Processuais</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {stats.pdfCount > 0 
                        ? `Lidos e extraídos ${stats.pdfCount} arquivo(s) PDF diretamente do seu navegador.` 
                        : stats.hasProcessText 
                          ? "Texto dos autos inserido manualmente lido com sucesso."
                          : "Nenhum auto processual anexado no momento."}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2: Rules Engine */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <Settings className="w-4 h-4 text-blue-500" />
                2. Motor de Regras (Limites Impostos)
              </h4>
              <div className="grid gap-3 pl-6">
                
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 text-sm">Prompt Estrutural</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">"{stats.activePromptTitle}" ativo.</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${stats.isTesesEnabled ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
                  <div>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 text-sm">Teses do Gabinete</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {stats.isTesesEnabled ? "Regras normativas e entendimentos locais injetados no contexto." : "Desativado para esta minuta."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <CheckCircle2 className={`w-5 h-5 shrink-0 ${stats.paradigmTitle ? "text-emerald-500" : "text-slate-300 dark:text-slate-600"}`} />
                  <div>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 text-sm">Fidelidade ao Paradigma (Espelho)</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {stats.paradigmTitle ? `Modelo vinculado: "${stats.paradigmTitle}". (Blindagem de estilo ativada).` : "Nenhum paradigma de estilo vinculado."}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <BrainCircuit className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 text-sm">Modo Juiz Especialista (Fixo / Travado)</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Diretriz restrita: Memória paramétrica ancorada apenas em Legislação, Doutrina e Súmulas. Geração de números de processos genéricos (REsp, AgInt) bloqueada para impedir alucinações.
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm">
                  <BrainCircuit className="w-5 h-5 text-indigo-500 shrink-0" />
                  <div>
                    <span className="block font-semibold text-slate-800 dark:text-slate-200 text-sm">Memória Jurídica Nativa (Paramétrica)</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      A IA invoca seu conhecimento pré-treinado sobre legislação brasileira (CC, CPC, CDC) e jurisprudência (STJ/STF). <strong>Nota:</strong> É uma consulta à sua memória interna nativa, não uma pesquisa ao vivo na internet ou no site dos tribunais.
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* Step 3: Anti-hallucination */}
            <div className="space-y-3">
              <h4 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-purple-500" />
                3. Garantia Antialucinação (Output)
              </h4>
              <div className="pl-6">
                <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-xl mb-3">
                  <div className="flex gap-3">
                    <ShieldCheck className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-rose-900 dark:text-rose-300 text-sm mb-1">
                        Auditoria Automática de Petições
                      </span>
                      <p className="text-xs text-rose-800/80 dark:text-rose-300/80 leading-relaxed">
                        Motor secundário que lê todos os PDFs inseridos em busca de citações de Súmulas, Acórdãos e REsps falsos criados por IA pelas partes. Validação feita antes da geração da minuta.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-xl">
                  <div className="flex gap-3">
                    <Scale className="w-5 h-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold text-purple-900 dark:text-purple-300 text-sm mb-1">
                        Diretriz de Rigor Fático-Probatório
                      </span>
                      <p className="text-xs text-purple-800/80 dark:text-purple-300/80 leading-relaxed">
                        A Inteligência Artificial opera como um "funil fechado". Ela está explicitamente proibida de criar fatos ou presumir eventos. Qualquer alegação das partes não acompanhada da citação expressa de provas nos autos (ID/Evento) é ignorada ou relatada como "Não Comprovada".
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-white transition-colors text-sm"
            >
              Fechar Painel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
