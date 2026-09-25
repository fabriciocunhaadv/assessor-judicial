import React, { useState } from "react";
import {
  X,
  Compass,
  Sparkles,
  BookOpen,
  Terminal,
  MessageSquare,
  FileCheck2,
  Scale,
  Calculator,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sliders,
  Layers,
  Lightbulb,
  Zap,
} from "lucide-react";

interface AssessorWorkflowGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTeses?: () => void;
  onOpenPrompts?: () => void;
  onOpenParadigms?: () => void;
}

export const AssessorWorkflowGuideModal: React.FC<AssessorWorkflowGuideModalProps> = ({
  isOpen,
  onClose,
  onOpenTeses,
  onOpenPrompts,
  onOpenParadigms,
}) => {
  const [activeTab, setActiveTab] = useState<
    "visao_geral" | "teses" | "prompts" | "chat" | "paradigma" | "ferramentas"
  >("visao_geral");

  if (!isOpen) return null;

  return (
    <div
      id="assessor-workflow-guide-modal-overlay"
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="assessor-workflow-guide-modal"
        className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl max-w-4xl w-full flex flex-col max-h-[92vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-emerald-50 via-slate-50 to-indigo-50/40 dark:from-slate-900 dark:via-slate-900 dark:to-emerald-950/30">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Guia do Assessor: Como Ter Controle Total Sobre a Decisão
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-600/10 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sliders className="w-3 h-3" />
                  Modo Co-Piloto
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Aprenda a direcionar teses, doutrina e estilo para que a IA atue estritamente sob o seu comando (sem efeito "caixa-preta").
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            title="Fechar guia"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-100/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("visao_geral")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "visao_geral"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5" />
            Visão Geral (Co-Piloto vs Caixa-Preta)
          </button>
          <button
            onClick={() => setActiveTab("teses")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "teses"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            1. Caderno de Teses
          </button>
          <button
            onClick={() => setActiveTab("prompts")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "prompts"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            2. Prompts com Dizer o Direito / Doutrina
          </button>
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "chat"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            3. Chat com o Processo
          </button>
          <button
            onClick={() => setActiveTab("paradigma")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "paradigma"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            4. Minuta Paradigma (Espelho)
          </button>
          <button
            onClick={() => setActiveTab("ferramentas")}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === "ferramentas"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            5. Ferramentas de Precisão
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-slate-800 dark:text-slate-200 leading-relaxed text-sm">
          {/* TAB 1: VISÃO GERAL */}
          {activeTab === "visao_geral" && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-4 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3.5">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                    O Assessor Judicial NÃO é um "gerador de sentenças cego"
                  </h3>
                  <p className="text-xs text-emerald-800/90 dark:text-emerald-300 mt-1">
                    Diferente de ferramentas engessadas ou automações "caixa-preta" (onde você clica e recebe uma decisão genérica sem poder opinar), o nosso sistema foi arquitetado como um <strong>Co-piloto Forense sob medida</strong>. Você tem total liberdade para orientar a tese jurídica, injetar precedentes e lapidar a minuta antes e depois da redação.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-rose-600 dark:text-rose-400 text-xs uppercase tracking-wider">
                    <X className="w-4 h-4" />
                    O que NÃO fazemos ("Minuteiro Engessado")
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-600 dark:text-slate-400 list-disc pl-4">
                    <li>Decidir no piloto automático sem respeitar o posicionamento da sua vara.</li>
                    <li>Ocultar o processo de raciocínio da IA.</li>
                    <li>Impedir que você oriente a fundamentação antes da redação da sentença.</li>
                    <li>Gerar minutas fora do padrão estilístico do seu Juiz Titular.</li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-400 text-xs uppercase tracking-wider">
                    <CheckCircle2 className="w-4 h-4" />
                    Como o Assessor Judicial opera com você
                  </div>
                  <ul className="text-xs space-y-1.5 text-slate-700 dark:text-slate-300 list-disc pl-4">
                    <li><strong>Caderno de Teses Próprio:</strong> Trava os entendimentos da sua comarca/vara.</li>
                    <li><strong>Prompts Editáveis:</strong> Permite colar informativos, teses do Dizer o Direito e leis locais.</li>
                    <li><strong>Chat Interativo com o Processo:</strong> Ajuste argumentos conversando com a IA.</li>
                    <li><strong>Espelho Estrutural:</strong> Clona rigorosamente o formato do magistrado.</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
                  Veja abaixo os métodos para comandar o comportamento da IA com precisão cirúrgica:
                </span>
                <button
                  onClick={() => setActiveTab("teses")}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <span>Explorar Método 1 (Teses)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: CADERNO DE TESES */}
          {activeTab === "teses" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    1. Caderno de Teses do Gabinete (Orientação Jurídica Travada)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Fixe como a sua vara decide cada matéria recorrente para que a IA nunca improvise uma tese contrária.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
                <h4 className="font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Como funciona na prática:
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  No botão <strong>"Caderno de Teses do Gabinete"</strong> (no topo ou no menu), você pode salvar e organizar os vereditos consolidados do juízo por assunto (ex: <em>"Dano moral por negativação indevida: fixação em R$ 8.000,00 com Selic a partir do arbitramento"</em>, ou <em>"Extinção sem resolução de mérito quando ausente o comprovante de endereço atualizado"</em>).
                </p>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-800 dark:text-emerald-300 font-mono">
                  ✓ Quando o botão "Aplicar Teses do Gabinete" está ativo, a IA confere se o processo se enquadra em alguma das suas teses e aplica obrigatoriamente a sua redação e dispositivo.
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {onOpenTeses && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTeses();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Abrir Meu Caderno de Teses Agora</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("prompts")}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Próximo: Gerenciador de Prompts</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PROMPTS & DIZER O DIREITO */}
          {activeTab === "prompts" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Terminal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    2. Prompts Personalizados (Dizer o Direito, Doutrina e Orientações Específicas)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Como o colega assessor destacou: você pode direcionar teses doutrinárias e precedentes STJ antes mesmo da IA redigir.
                  </p>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 block">
                    Como injetar doutrina, jurisprudência e informativos:
                  </span>
                  <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-300">
                    <li>
                      Abra o <strong>Gerenciador de Prompts</strong> e selecione ou crie um modelo de minuta (ex: <em>"Sentença Cível - Consumidor"</em> ou <em>"Decisão Interlocutória - Tutela de Urgência"</em>).
                    </li>
                    <li>
                      Cole os trechos do <strong>Dizer o Direito</strong>, teses do STJ/STF, artigos de lei específicos ou súmulas diretamente no campo de instruções do prompt.
                    </li>
                    <li>
                      Você pode definir cláusulas imperativas como: <em>"Ao analisar a preliminar de ilegitimidade passiva, acolha o pedido com base no precedente X do STJ e fundamente no art. 485, VI do CPC"</em>.
                    </li>
                  </ol>
                </div>

                <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-300">
                  💡 <strong>Dica Forense:</strong> Você também pode colar trechos doutrinários ou notas do assessor diretamente no campo de <strong>"Texto / Casos"</strong> dos autos antes de clicar em Executar. A IA integrará perfeitamente o texto com as peças do processo.
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {onOpenPrompts && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenPrompts();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Terminal className="w-4 h-4" />
                    <span>Abrir Gerenciador de Prompts</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("chat")}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Próximo: Chat com o Processo</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: CHAT COM O PROCESSO */}
          {activeTab === "chat" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    3. Chat Interativo com o Processo (Construção Conversacional)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Oriente a IA de forma dinâmica e interativa, como se estivesse instruindo um estagiário ou assessor júnior de alto nível.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
                <p className="text-slate-700 dark:text-slate-300">
                  Na aba <strong>"Assessor Judicial (Chat)"</strong> ao lado do editor, você tem a memória de todo o processo e da minuta já redigida. Você pode enviar comandos pontuais como:
                </p>

                <div className="space-y-2 font-mono text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    💬 <em>"Reescreva a fundamentação do dano moral reduzindo o valor para R$ 5.000,00 e adicionando o precedente do TJGO sobre mero dissabor em atraso de voo menor que 4 horas."</em>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    💬 <em>"Dê atenção especial ao documento da folha 38 (extrato bancário) e aponte no relatório que o autor realizou transações normalmente no período alegado."</em>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    💬 <em>"Altere o dispositivo para julgar parcialmente procedente, afastando a repetição em dobro por ausência de má-fé (Tema 929/STJ)."</em>
                  </div>
                </div>

                <p className="text-slate-600 dark:text-slate-400 pt-1">
                  A IA atualiza os tópicos de forma precisa, sem estragar a formatação oficial do tribunal.
                </p>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setActiveTab("paradigma")}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Próximo: Minuta Paradigma (Espelho)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: MINUTA PARADIGMA */}
          {activeTab === "paradigma" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    4. Minuta Paradigma (Espelho Estrutural do Juiz Titular)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Garante que a redação final tenha rigorosamente o mesmo estilo, capitulação e vocabulário do magistrado.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <p>
                  Com a <strong>Minuta Paradigma</strong> ativada:
                </p>
                <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
                  <li>
                    O sistema utiliza uma sentença ou decisão anterior real do magistrado como <strong>espelho arquitetural</strong>.
                  </li>
                  <li>
                    A IA preserva a hierarquia de títulos (<em>"I - RELATÓRIO", "II - FUNDAMENTAÇÃO", "III - DISPOSITIVO"</em>), a ordem de análise das preliminares e a fórmula exata do dispositivo com intimação das partes.
                  </li>
                  <li>
                    Você pode cadastrar múltiplos modelos paradigmas (Cível, Fazenda Pública, Família, Juizado Especial, Criminal) e selecionar com um clique antes de processar.
                  </li>
                </ul>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {onOpenParadigms && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenParadigms();
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
                  >
                    <Layers className="w-4 h-4" />
                    <span>Ver Minutas Paradigmas Cadastradas</span>
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("ferramentas")}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <span>Próximo: Ferramentas Forenses</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* TAB 6: FERRAMENTAS FORENSES */}
          {activeTab === "ferramentas" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base">
                    5. Ferramentas de Precisão & Controle no Editor
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Módulos forenses integrados na tela de revisão para blindar a minuta de nulidades e erros materiais.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Auditor de Conformidade (Art. 489 CPC)
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Audita automaticamente se todos os pedidos e preliminares foram enfrentados e se a fundamentação atende aos requisitos de validade do CPC.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-indigo-600" />
                    Calculadora de Consectários Legais
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Gera a cláusula de juros e correção monetária exata segundo as regras do STJ, Selic e Emenda Constitucional 113/2021.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <FileCheck2 className="w-4 h-4 text-amber-600" />
                    Painel Fato vs. Prova (X-Ray)
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Mapeia o cruzamento das alegações de autor e réu contra os documentos e anexos comprobatórios juntados aos autos.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-1.5">
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-purple-600" />
                    Bancada de Tripla Conferência
                  </div>
                  <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                    Compara lado a lado os autos do PROJUDI, a minuta em elaboração e os precedentes vinculantes em uma única tela.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-900 dark:text-emerald-300">
                  Pronto para analisar com total controle do seu gabinete?
                </span>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Entendi, Concluir Guia
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
