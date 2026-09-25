import { getKnowledgeFromDb, saveKnowledgeToDb, deleteKnowledgeFromDb, globalTenantId } from "../lib/firestoreUtils";

export interface SavedKnowledgeDoc {
  id: string;
  name: string;
  type?: "pdf" | "reference";
  size: number;
  addedAt: number;
  isActive: boolean;
  url?: string;
  textContent?: string;
  extractedText?: string;
  createdBy?: string;
  creatorName?: string;
  creatorEmail?: string;
  pageCount?: number;
}

export const getKnowledgeDocs = async (): Promise<SavedKnowledgeDoc[]> => {
  try {
    return await getKnowledgeFromDb();
  } catch (err) {
    console.warn("Could not fetch knowledge from DB:", err);
    return [];
  }
};

export const saveKnowledgeDoc = async (doc: SavedKnowledgeDoc): Promise<void> => {
  try {
    await saveKnowledgeToDb(doc);
  } catch (err) {
    console.warn("Could not save knowledge to DB:", err);
    throw err;
  }
};

export const deleteKnowledgeDoc = async (id: string): Promise<void> => {
  try {
    await deleteKnowledgeFromDb(id);
  } catch (err) {
    console.warn("Could not delete knowledge from DB:", err);
  }
};

export const toggleKnowledgeDocActive = async (id: string, isActive: boolean): Promise<void> => {
  try {
    const docs = await getKnowledgeFromDb();
    const docToUpdate = docs.find(d => d.id === id);
    if (docToUpdate) {
      await saveKnowledgeToDb({ ...docToUpdate, isActive });
    }
  } catch (err) {
    console.warn("Could not toggle knowledge doc in DB:", err);
  }
};
