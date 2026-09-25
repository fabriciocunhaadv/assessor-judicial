import React from 'react';
import { 
  X, Gem, ShieldCheck, Zap, BrainCircuit, FileText, 
  Scale, ArrowRight, Bot, Target, FileSearch, Sparkles
} from 'lucide-react';

interface PresentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationModal: React.FC<PresentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col relative">
        
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-lg shadow-lg">
              <Gem className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-violet-200 to-indigo-200 bg-clip-text text-transparent">
              Apresentação Executiva do Assessor
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-12 bg-[#080d14]">
          
          {/* Hero Section */}
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Inteligência Artificial moldada com a <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-500">
                Voz e o Entendimento do seu Gabinete
              </span>
            </h1>
            <p className="text-slate-400 text-lg">
              Não é uma IA genérica. É um motor de produtividade que lê autos complexos, cruza com as regras do magistrado e gera minutas seguras em segundos.
            </p>
          </div>

          {/* Mind Map / Flowchart */}
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-2xl p-8 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 opacity-50"></div>
            <h3 className="text-center text-slate-300 font-bold mb-8 uppercase tracking-widest text-sm">Mapa Mental: Como Funciona</h3>
            
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2 relative z-10">
              
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center max-w-[220px] space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shadow-lg">
                  <FileText className="w-8 h-8 text-blue-400" />
                </div>
                <h4 className="font-bold text-slate-200">1. Leitura dos Autos</h4>
                <p className="text-xs text-slate-400">O sistema consolida Inicial, Contestação e Docs em segundos.</p>
              </div>

              <ArrowRight className="hidden lg:block w-8 h-8 text-slate-600 animate-pulse" />

              {/* Step 2 (Core) */}
              <div className="flex flex-col items-center text-center max-w-[260px] space-y-3 relative group">
                <div className="absolute -inset-4 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/30 transition"></div>
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-violet-700 border-4 border-slate-900 flex items-center justify-center shadow-2xl relative z-10">
                  <BrainCircuit className="w-10 h-10 text-white" />
                </div>
                <h4 className="font-bold text-indigo-300">2. Motor de Inteligência</h4>
                <p className="text-xs text-slate-400">Cruza os fatos com o <strong className="text-slate-300">Caderno de Teses</strong> e <strong className="text-slate-300">Modelos Próprios</strong> do juiz.</p>
              </div>

              <ArrowRight className="hidden lg:block w-8 h-8 text-slate-600 animate-pulse" />

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center max-w-[220px] space-y-3">
                <div className="w-16 h-16 rounded-full bg-slate-800 border border-emerald-900/50 flex items-center justify-center shadow-lg">
                  <Scale className="w-8 h-8 text-emerald-400" />
                </div>
                <h4 className="font-bold text-slate-200">3. Minuta & Raio-X</h4>
                <p className="text-xs text-slate-400">Entrega o documento estruturado e uma auditoria de segurança (Anti-Alucinação).</p>
              </div>

            </div>
          </div>

          {/* 4 Pillars Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Pillar 1 */}
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-blue-500/50 transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-900/50 text-blue-400 rounded-lg">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">Choque de Eficiência</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Transforme horas de leitura de processos volumosos em minutos. O sistema extrai as alegações das partes, filtra o que é relevante e já estrutura o relatório e a fundamentação inicial.
              </p>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Fim do trabalho braçal de resumo</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Foco no trabalho intelectual</li>
              </ul>
            </div>

            {/* Pillar 2 */}
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-emerald-500/50 transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-emerald-900/50 text-emerald-400 rounded-lg">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">A "Voz" do Juiz</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                A IA não inventa textos genéricos. Através do <strong>Caderno de Teses</strong>, o juiz define suas regras (ex: limites de dano moral), e o sistema injeta os <strong>Modelos Paradigmas</strong> exatos da vara.
              </p>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Padronização total de decisões</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Respeito irrestrito ao entendimento do gabinete</li>
              </ul>
            </div>

            {/* Pillar 3 */}
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-rose-500/50 transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-rose-900/50 text-rose-400 rounded-lg">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">Segurança Jurídica Absoluta</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Medo de "alucinações" da IA? Nosso sistema possui um <strong>Raio-X Anti-Alucinação</strong> e integração com Súmulas Vinculantes reais (STF/STJ/TNU). Cada citação é auditada antes de chegar à tela.
              </p>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Busca inteligente de precedentes reais</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Auditoria automática de jurisprudência</li>
              </ul>
            </div>

            {/* Pillar 4 */}
            <div className="bg-slate-800/50 border border-slate-700 p-6 rounded-xl hover:border-amber-500/50 transition">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-amber-900/50 text-amber-400 rounded-lg">
                  <Bot className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-200">Automação Descomplicada</h3>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                Curva de aprendizado zero para a equipe. O <strong>Tutor Interativo</strong> acompanha cada clique ensinando o que fazer. E o <strong>Chat de Revisão</strong> permite ajustar o texto dando ordens simples como <em>"adicione multa diária"</em>.
              </p>
              <ul className="text-xs text-slate-500 space-y-2">
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Chat interativo para correções rápidas</li>
                <li className="flex items-center gap-2"><Sparkles className="w-3 h-3 text-emerald-500"/> Copiloto assistente sempre na tela</li>
              </ul>
            </div>

          </div>

          {/* Footer Call to Action */}
          <div className="flex flex-col items-center justify-center pt-8 border-t border-slate-800">
            <h3 className="text-white font-bold text-xl mb-4">Pronto para demonstrar na prática?</h3>
            <div className="flex gap-4">
              <button onClick={onClose} className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg shadow-lg hover:shadow-xl hover:shadow-emerald-500/20 transition transform hover:-translate-y-0.5">
                Iniciar Demonstração
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
