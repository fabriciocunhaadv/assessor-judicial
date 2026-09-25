import React, { useState } from 'react';
import { X, Puzzle, Download, CheckCircle2, ChevronRight, Chrome, Hammer, AlertTriangle, Sparkles } from 'lucide-react';
import { downloadExtension } from '../utils/extensionBuilder';

interface ExtensionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExtensionModal: React.FC<ExtensionModalProps> = ({ isOpen, onClose }) => {
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      await downloadExtension();
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    } catch (err) {
      console.error("Erro ao gerar extensão:", err);
      alert("Erro ao gerar arquivo da extensão.");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-2xl w-full flex flex-col max-h-[90vh] shadow-2xl relative overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Puzzle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white leading-tight">Assessor IA Conecta (Extensão PROJUDI)</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                  <Hammer className="w-3 h-3 text-amber-400" />
                  Módulo em Construção
                </span>
              </div>
              <p className="text-xs text-slate-400">Integração experimental com o PROJUDI / PJe</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-lg hover:bg-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          
          {/* Construction Banner */}
          <div className="bg-amber-950/30 border border-amber-500/40 rounded-xl p-4 text-xs text-amber-200/90 leading-relaxed flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-300 font-bold block mb-1">Módulo Experimental em Desenvolvimento Ativo:</strong>
              Este módulo de extensão para o navegador Chrome encontra-se em fase de engenharia e testes controlados. O Assessor Judicial Web funciona de forma completa e independente diretamente pelo navegador.
            </div>
          </div>

          {/* Intro */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 leading-relaxed">
            <p>
              O <strong>Assessor IA Conecta</strong> é um módulo satélite (Extensão do Google Chrome) desenhado para facilitar sua rotina forense. 
              Ao ser ativado, um botão flutuante integrado conecta a tela de autos do <strong>PROJUDI</strong> diretamente ao seu painel.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Ele realiza a leitura automatizada da numeração do processo e permite transferência de contexto para elaboração de minutas pelo Assessor Judicial IA em uma nova aba com agilidade.
            </p>
          </div>

          {/* Action */}
          <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl p-5">
            <div className="flex-1">
              <h3 className="text-white font-bold mb-1 flex items-center gap-2">
                <Chrome className="w-4 h-4 text-slate-400" />
                Download do Pacote Experimental (ZIP)
              </h3>
              <p className="text-xs text-slate-400">Baixe o código-fonte empacotado para testes de integração local.</p>
            </div>
            <button 
              onClick={handleDownload}
              className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl shadow-lg transition-all"
            >
              {downloaded ? (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Baixado!</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Baixar Pacote de Teste (ZIP)</span>
                </>
              )}
            </button>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Instruções de Instalação no Chrome
            </h3>
            
            <ol className="space-y-3 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-slate-800 ml-1">
              {[
                "Extraia (descompacte) o arquivo ZIP baixado em uma pasta local do computador.",
                "No Google Chrome, acesse a página: <code class='bg-slate-800 text-indigo-300 px-1.5 py-0.5 rounded ml-1'>chrome://extensions/</code>",
                "No canto superior direito, ative o <strong>Modo do desenvolvedor</strong>.",
                "Clique em <strong>Carregar sem compactação</strong> (Load unpacked) no canto superior esquerdo.",
                "Selecione a pasta descompactada para carregar a extensão no navegador."
              ].map((text, i) => (
                <li key={i} className="relative pl-8 text-sm text-slate-300">
                  <div className="absolute left-0 top-0.5 w-6 h-6 rounded-full bg-slate-900 border-2 border-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-400 z-10">
                    {i + 1}
                  </div>
                  <span dangerouslySetInnerHTML={{ __html: text }} />
                </li>
              ))}
            </ol>
          </div>
          
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 text-xs text-slate-400">
            <strong className="text-slate-200 block mb-1">Independência do Sistema:</strong>
            O uso da extensão é opcional e não altera a estabilidade da nuvem do sistema. Todos os recursos do Assessor Judicial continuam operando de forma 100% autônoma pela interface web.
          </div>

        </div>

      </div>
    </div>
  );
};

