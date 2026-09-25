import { SessionDraft } from "../types";

const SESSION_DRAFT_KEY = "assessor_judicial_active_draft_v1";

export const saveSessionDraft = (draft: SessionDraft): void => {
  try {
    // Only save if there's actual content worth saving
    if (!draft.processNumber && !draft.processText && !draft.generationResult && draft.uploadedPdfNames.length === 0) {
      return;
    }
    localStorage.setItem(SESSION_DRAFT_KEY, JSON.stringify(draft));
  } catch (err) {
    console.warn("Could not save session draft to localStorage:", err);
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
