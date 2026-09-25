import React, { useEffect, useState, useRef } from "react";
import { Gavel } from "lucide-react";

interface FloatingTextSelectionToolbarProps {
  containerRef?: React.RefObject<HTMLElement | null>;
  onInjectAsParadigm: (selectedText: string) => void;
}

export const FloatingTextSelectionToolbar: React.FC<FloatingTextSelectionToolbarProps> = ({
  containerRef,
  onInjectAsParadigm,
}) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkSelection = (e?: Event) => {
      // 1. Check if active element is a textarea or input
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl instanceof HTMLTextAreaElement || activeEl instanceof HTMLInputElement)
      ) {
        if (!containerRef || !containerRef.current || containerRef.current.contains(activeEl)) {
          const start = activeEl.selectionStart ?? 0;
          const end = activeEl.selectionEnd ?? 0;
          if (end - start >= 10) {
            const text = activeEl.value.substring(start, end).trim();
            if (text.length >= 10) {
              const rect = activeEl.getBoundingClientRect();
              const top = Math.max(10, rect.top - 44);
              const left = Math.max(
                10,
                Math.min(window.innerWidth - 260, rect.left + rect.width / 2 - 120)
              );
              setPosition({ x: left, y: top });
              setSelectedText(text);
              return;
            }
          }
        }
      }

      // 2. Check standard DOM window.getSelection()
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 10) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      if (containerRef && containerRef.current) {
        try {
          const range = selection.getRangeAt(0);
          if (!containerRef.current.contains(range.commonAncestorContainer)) {
            setPosition(null);
            setSelectedText("");
            return;
          }
        } catch {
          setPosition(null);
          setSelectedText("");
          return;
        }
      }

      try {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          setPosition(null);
          return;
        }

        const top = Math.max(10, rect.top - 46);
        const left = Math.max(
          10,
          Math.min(window.innerWidth - 260, rect.left + rect.width / 2 - 120)
        );

        setPosition({ x: left, y: top });
        setSelectedText(text);
      } catch (err) {
        console.warn("Selection positioning error:", err);
      }
    };

    const handleMouseUp = () => {
      // Small timeout to allow browser to finish updating selection
      setTimeout(checkSelection, 50);
    };

    const handleKeyUp = () => {
      setTimeout(checkSelection, 50);
    };

    document.addEventListener("selectionchange", checkSelection);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("select", checkSelection, true);

    return () => {
      document.removeEventListener("selectionchange", checkSelection);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("select", checkSelection, true);
    };
  }, [containerRef]);

  if (!position || !selectedText) return null;

  return (
    <div
      ref={toolbarRef}
      style={{
        position: "fixed",
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 9999,
      }}
      className="bg-slate-950 text-white rounded-xl shadow-2xl border-2 border-amber-400 p-1 flex items-center gap-1 animate-in fade-in zoom-in-90 pointer-events-auto select-none"
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onInjectAsParadigm(selectedText);
          setPosition(null);
          setSelectedText("");
        }}
        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 hover:from-amber-400 hover:to-amber-600 text-white font-black text-xs rounded-lg flex items-center gap-2 shadow-md transition cursor-pointer"
        title="Cadastrar e injetar este trecho no Caderno de Teses do Gabinete"
      >
        <Gavel className="w-4 h-4 text-amber-200 animate-bounce" />
        <span>⚡ Injetar no Caderno de Teses do Gabinete</span>
      </button>
    </div>
  );
};
