import { db } from "../lib/firebase";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";

export interface SavedPetition {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  createdAt: number;
}

export async function savePetition(tenantId: string, title: string, content: string): Promise<string> {
  const collectionRef = collection(db, "tenants", tenantId, "petitions");
  const docRef = doc(collectionRef); // auto-generate ID
  
  await setDoc(docRef, {
    id: docRef.id,
    tenantId,
    title,
    content,
    createdAt: Date.now(),
    timestamp: serverTimestamp()
  });
  
  return docRef.id;
}

export async function getPetitions(tenantId: string): Promise<SavedPetition[]> {
  const collectionRef = collection(db, "tenants", tenantId, "petitions");
  const q = query(collectionRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map(d => d.data() as SavedPetition);
}

export async function deletePetition(tenantId: string, petitionId: string): Promise<void> {
  const docRef = doc(db, "tenants", tenantId, "petitions", petitionId);
  await deleteDoc(docRef);
}
