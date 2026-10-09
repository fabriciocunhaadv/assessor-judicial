import { SessionDraft } from "../types";

const SESSION_DRAFT_KEY = "assessor_judicial_active_draft_v1";

export const saveSessionDraft = (draft: SessionDraft): void => {
  try {
    // Only save if there's actual content worth saving
    if (!draft.processNumber && !draft.processText && !draft.generationResult && draft.uploadedPdfNames.length === 0) {
      return;
    }
    let json = JSON.stringify(draft);
    if (json.length > 400_000) {      // rascunho gigante (autos inteiros/resultado completo): guarda só o essencial
      json = JSON.stringify({ ...(draft as any), processText: String((draft as any).processText || "").slice(0, 20000), generationResult: null });
    }
    localStorage.setItem(SESSION_DRAFT_KEY, json);
  } catch (err) {
    try { localStorage.removeItem(SESSION_DRAFT_KEY); } catch {}      // libera o espaço do rascunho antigo
    const t = Date.now(); if (!(globalThis as any).__draftAviso || t - (globalThis as any).__draftAviso > 60000) { (globalThis as any).__draftAviso = t; console.warn("Could not save session draft to localStorage:", err); }
  }
};

export const getSessionDraft = (): SessionDraft | null => {
  try {
    const raw = localStorage.getItem(SESSION_DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SessionDraft;
    // Check if draft has meaningful data
    if (parsed && (parsed.processNumber || parsed.processText || parsed.generationResult || parsed.uploadedPdfNames?.length > 0)) {
      return parsed;
    }
  } catch (err) {
    console.warn("Could not load session draft:", err);
  }
  return null;
};

export const clearSessionDraft = (): void => {
  try {
    localStorage.removeItem(SESSION_DRAFT_KEY);
  } catch (err) {
    console.warn("Could not clear session draft:", err);
  }
};
