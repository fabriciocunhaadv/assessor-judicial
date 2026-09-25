import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, onSnapshot, query, orderBy, limit } from "firebase/firestore";
import { db, auth } from "../lib/firebase";
import { SupportTicket, TicketMessage, TicketStatus, TicketStatusHistoryItem, UserProfile } from "../types";
import { safeGetItem, safeSetItem } from "./safeStorage";
import { globalTenantId } from "../lib/firestoreUtils";

const TICKETS_LOCAL_STORAGE_KEY_PREFIX = "agaia_support_tickets_";
const TICKETS_MODULE_TOGGLE_KEY = "agaia_module_chamados_enabled";

/**
 * Strips all undefined properties recursively so Firestore setDoc / updateDoc never throws
 */
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as unknown as T;
  }
  if (Array.isArray(data)) {
    return data
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === "object") {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        clean[key] = sanitizeForFirestore(value);
      }
    }
    return clean as T;
  }
  return data;
}

/**
 * Feature flag / Module toggle: Allows disabling/enabling the ticket system without touching other modules
 */
export const isTicketModuleEnabled = (): boolean => {
  const val = safeGetItem(TICKETS_MODULE_TOGGLE_KEY);
  // Enabled by default unless explicitly disabled
  return val !== "false";
};

export const setTicketModuleEnabled = (enabled: boolean): void => {
  safeSetItem(TICKETS_MODULE_TOGGLE_KEY, enabled ? "true" : "false");
  window.dispatchEvent(new CustomEvent("agaia_ticket_module_toggled", { detail: { enabled } }));
};

function getLocalStorageKey(tenantId?: string, userId?: string, isSuperAdmin?: boolean): string {
  const tId = tenantId || globalTenantId || "default";
  return `${TICKETS_LOCAL_STORAGE_KEY_PREFIX}${tId}`;
}

export interface TicketAccessContext {
  tenantId?: string;
  userId?: string;
  userEmail?: string;
  isSuperAdmin?: boolean;
  isAdmin?: boolean;
  isJudge?: boolean;
}

/**
 * Filter tickets to enforce strict access control:
 * - Super Admin: has full visibility across all cabinets and users
 * - Cabinet Admin / Judge: can view all tickets within their cabinet
 * - Regular Assessor / User: can ONLY view tickets they created within their cabinet
 */
export const filterTicketByAccess = (
  ticket: SupportTicket,
  context: TicketAccessContext
): boolean => {
  if (context.isSuperAdmin) return true;
  
  const activeTenant = context.tenantId || globalTenantId || "default";
  // Must belong to the user's cabinet
  if (ticket.tenantId && ticket.tenantId !== activeTenant) {
    return false;
  }

  // Cabinet Admins and Judges have visibility over tickets within their cabinet
  if (context.isAdmin || context.isJudge) {
    return true;
  }

  // Regular Assessor / User: strictly their own tickets
  const isCreator =
    (Boolean(context.userId) && ticket.createdByUid === context.userId) ||
    (Boolean(context.userEmail) && ticket.createdByEmail?.toLowerCase() === context.userEmail?.toLowerCase());

  return Boolean(isCreator);
};

export const getLocalTickets = (tenantId?: string, _userId?: string, _isSuperAdmin?: boolean): SupportTicket[] => {
  try {
    const raw = safeGetItem(getLocalStorageKey(tenantId));
    if (!raw) {
      // Check fallback key
      const fallbackRaw = safeGetItem(`${TICKETS_LOCAL_STORAGE_KEY_PREFIX}default`);
      if (!fallbackRaw) return [];
      const parsedFallback = JSON.parse(fallbackRaw);
      return Array.isArray(parsedFallback) ? parsedFallback : [];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn("Could not read tickets from local storage:", err);
    return [];
  }
};

export const saveLocalTickets = (
  tickets: SupportTicket[],
  tenantId?: string,
  _userId?: string,
  _isSuperAdmin?: boolean
) => {
  try {
    const key = getLocalStorageKey(tenantId);
    safeSetItem(key, JSON.stringify(tickets));
    // Also update default key if not already default for backward compatibility
    if (key !== `${TICKETS_LOCAL_STORAGE_KEY_PREFIX}default`) {
      safeSetItem(`${TICKETS_LOCAL_STORAGE_KEY_PREFIX}default`, JSON.stringify(tickets));
    }
    window.dispatchEvent(new CustomEvent("agaia_tickets_updated", { detail: { tickets } }));
  } catch (err) {
    console.warn("Could not write tickets to local storage:", err);
  }
};

/**
 * Real-time subscription to tickets with strict multi-tenant and user access isolation.
 */
export const subscribeToTickets = (
  callback: (tickets: SupportTicket[]) => void,
  contextOrTenantId?: string | TicketAccessContext,
  isSuperAdminLegacy?: boolean
): (() => void) => {
  const context: TicketAccessContext =
    typeof contextOrTenantId === "object" && contextOrTenantId !== null
      ? contextOrTenantId
      : {
          tenantId: typeof contextOrTenantId === "string" ? contextOrTenantId : undefined,
          isSuperAdmin: isSuperAdminLegacy,
        };

  const activeTenant = context.tenantId || globalTenantId || "default";

  // Immediate local emission
  const initialLocal = getLocalTickets(activeTenant);
  const filteredInitial = initialLocal.filter((t) => filterTicketByAccess(t, context));
  callback(filteredInitial);

  // Listen to local event updates across components
  const handleLocalUpdate = (e: any) => {
    const currentLocal = getLocalTickets(activeTenant);
    const filtered = currentLocal.filter((t) => filterTicketByAccess(t, context));
    callback(filtered);
  };
  window.addEventListener("agaia_tickets_updated", handleLocalUpdate);

  try {
    const ticketsCol = collection(db, "tickets");
    const q = query(ticketsCol, orderBy("updatedAt", "desc"), limit(200));

    const unsubscribeFirestore = onSnapshot(
      q,
      (snapshot) => {
        const remoteTickets: SupportTicket[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data() as SupportTicket;
          const ticket: SupportTicket = {
            ...data,
            id: d.id,
            messages: Array.isArray(data.messages) ? data.messages : [],
            statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
          };

          if (filterTicketByAccess(ticket, context)) {
            remoteTickets.push(ticket);
          }
        });

        // Merge remote tickets with local cache
        saveLocalTickets(remoteTickets, activeTenant);
        callback(remoteTickets);
      },
      (error) => {
        console.warn("Firestore tickets subscription error (falling back to local):", error);
        const currentLocal = getLocalTickets(activeTenant);
        callback(currentLocal.filter((t) => filterTicketByAccess(t, context)));
      }
    );

    return () => {
      window.removeEventListener("agaia_tickets_updated", handleLocalUpdate);
      unsubscribeFirestore();
    };
  } catch (err) {
    console.warn("Could not initialize tickets subscription:", err);
    return () => {
      window.removeEventListener("agaia_tickets_updated", handleLocalUpdate);
    };
  }
};

/**
 * Fetch all tickets with local fallback and role-based access filtering
 */
export const getTickets = async (
  contextOrTenantId?: string | TicketAccessContext,
  isSuperAdminLegacy?: boolean
): Promise<SupportTicket[]> => {
  const context: TicketAccessContext =
    typeof contextOrTenantId === "object" && contextOrTenantId !== null
      ? contextOrTenantId
      : {
          tenantId: typeof contextOrTenantId === "string" ? contextOrTenantId : undefined,
          isSuperAdmin: isSuperAdminLegacy,
        };

  const activeTenant = context.tenantId || globalTenantId || "default";
  const localList = getLocalTickets(activeTenant).filter((t) => filterTicketByAccess(t, context));
  try {
    const snapshot = await getDocs(query(collection(db, "tickets"), orderBy("updatedAt", "desc"), limit(200)));
    if (!snapshot.empty) {
      const remoteTickets: SupportTicket[] = [];
      snapshot.docs.forEach((d) => {
        const data = d.data() as SupportTicket;
        const ticket: SupportTicket = {
          ...data,
          id: d.id,
          messages: Array.isArray(data.messages) ? data.messages : [],
          statusHistory: Array.isArray(data.statusHistory) ? data.statusHistory : [],
        };
        if (filterTicketByAccess(ticket, context)) {
          remoteTickets.push(ticket);
        }
      });

      saveLocalTickets(remoteTickets, activeTenant);
      return remoteTickets;
    }
  } catch (err) {
    console.warn("Error fetching remote tickets, using local:", err);
  }
  return localList;
};

/**
 * Create or Save a new ticket
 */
export const createTicket = async (ticket: SupportTicket): Promise<void> => {
  if (!ticket || !ticket.id) return;

  const activeTenant = ticket.tenantId || globalTenantId || "default";
  const localList = getLocalTickets(activeTenant);
  const updatedList = [ticket, ...localList.filter((t) => t.id !== ticket.id)];
  saveLocalTickets(updatedList, activeTenant);

  try {
    const cleanTicket = sanitizeForFirestore(ticket);
    await setDoc(doc(db, "tickets", ticket.id), cleanTicket, { merge: true });
    console.log(`[Firestore] Ticket saved successfully: ${ticket.id}`);
  } catch (err) {
    console.error("Could not save ticket to Firestore:", err);
  }
};

/**
 * Add a message/reply to a ticket thread
 */
export const addTicketMessage = async (
  ticketId: string,
  message: TicketMessage,
  isSuperAdminSender: boolean,
  tenantId?: string
): Promise<SupportTicket | null> => {
  if (!ticketId || !message) return null;

  const activeTenant = tenantId || globalTenantId || "default";
  const localList = getLocalTickets(activeTenant);
  const existingIdx = localList.findIndex((t) => t.id === ticketId);

  let updatedTicket: SupportTicket | null = null;
  if (existingIdx >= 0) {
    const current = localList[existingIdx];
    const messages = [...(current.messages || []), message];
    updatedTicket = {
      ...current,
      messages,
      updatedAt: Date.now(),
      // If Super Admin replies, notify tenant (isReadByTenant = false);
      // If tenant user replies, notify Super Admin (isReadBySuperAdmin = false)
      isReadByTenant: isSuperAdminSender ? false : true,
      isReadBySuperAdmin: isSuperAdminSender ? true : false,
    };
    localList[existingIdx] = updatedTicket;
    saveLocalTickets(localList, activeTenant);
  }

  try {
    const docRef = doc(db, "tickets", ticketId);
    const payload = {
      messages: updatedTicket?.messages || [message],
      updatedAt: Date.now(),
      isReadByTenant: isSuperAdminSender ? false : true,
      isReadBySuperAdmin: isSuperAdminSender ? true : false,
    };
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
    console.log(`[Firestore] Ticket message saved: ${ticketId}`);
  } catch (err) {
    console.error("Could not update ticket messages in Firestore:", err);
  }

  return updatedTicket;
};

/**
 * Update ticket status with historical audit log
 */
export const updateTicketStatus = async (
  ticketId: string,
  newStatus: TicketStatus,
  userProfile?: UserProfile | null,
  comment?: string,
  tenantId?: string,
  _userId?: string,
  _isSuperAdmin?: boolean
): Promise<SupportTicket | null> => {
  if (!ticketId) return null;

  const activeTenant = tenantId || globalTenantId || "default";
  const localList = getLocalTickets(activeTenant);
  const existingIdx = localList.findIndex((t) => t.id === ticketId);

  const historyItem: TicketStatusHistoryItem = {
    status: newStatus,
    changedBy: userProfile?.uid || "admin",
    changedByName: userProfile?.name || "Administrador",
    changedAt: Date.now(),
  };
  if (comment && comment.trim()) {
    historyItem.comment = comment.trim();
  }

  let updatedTicket: SupportTicket | null = null;
  const isResolved = ["concluido", "nao_provido"].includes(newStatus);

  if (existingIdx >= 0) {
    const current = localList[existingIdx];
    const statusHistory = [...(current.statusHistory || []), historyItem];
    updatedTicket = {
      ...current,
      status: newStatus,
      updatedAt: Date.now(),
      statusHistory,
      resolutionFeedback: (comment && comment.trim()) ? comment.trim() : current.resolutionFeedback,
      resolvedAt: isResolved ? (current.resolvedAt || Date.now()) : current.resolvedAt,
      resolvedBy: isResolved ? (current.resolvedBy || userProfile?.name || "Administrador") : current.resolvedBy,
      isReadByTenant: false, // Notify tenant of status change
      isReadBySuperAdmin: true,
    };
    localList[existingIdx] = updatedTicket;
    saveLocalTickets(localList, activeTenant);
  } else {
    // If not in local list, create minimal placeholder to persist
    updatedTicket = {
      id: ticketId,
      tenantId: activeTenant,
      tenantName: "Gabinete",
      unitId: "default",
      unitName: "Lotação",
      title: "Chamado",
      description: "",
      type: "melhoria_sugestao",
      priority: "media",
      status: newStatus,
      systemModule: "Geral",
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdByUid: userProfile?.uid || "admin",
      createdByName: userProfile?.name || "Administrador",
      createdByEmail: userProfile?.email || "",
      createdByRole: "Super ADM",
      messages: [],
      statusHistory: [historyItem],
      resolutionFeedback: (comment && comment.trim()) ? comment.trim() : undefined,
      resolvedAt: isResolved ? Date.now() : undefined,
      resolvedBy: isResolved ? (userProfile?.name || "Administrador") : undefined,
      isReadByTenant: false,
      isReadBySuperAdmin: true,
    };
    saveLocalTickets([updatedTicket, ...localList], activeTenant);
  }

  try {
    const docRef = doc(db, "tickets", ticketId);
    const payload: Record<string, any> = {
      status: newStatus,
      updatedAt: Date.now(),
      statusHistory: updatedTicket.statusHistory,
      isReadByTenant: false,
      isReadBySuperAdmin: true,
    };
    if (comment && comment.trim()) {
      payload.resolutionFeedback = comment.trim();
    }
    if (isResolved) {
      payload.resolvedAt = updatedTicket.resolvedAt || Date.now();
      payload.resolvedBy = updatedTicket.resolvedBy || userProfile?.name || "Administrador";
    }

    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
    console.log(`[Firestore] Status updated for ticket ${ticketId} to ${newStatus}`);
  } catch (err) {
    console.error("Could not update ticket status in Firestore:", err);
  }

  return updatedTicket;
};

/**
 * Mark ticket as read
 */
export const markTicketAsRead = async (
  ticketId: string,
  isSuperAdmin: boolean,
  tenantId?: string,
  _userId?: string
): Promise<void> => {
  if (!ticketId) return;
  const activeTenant = tenantId || globalTenantId || "default";
  const localList = getLocalTickets(activeTenant);
  const existingIdx = localList.findIndex((t) => t.id === ticketId);
  if (existingIdx >= 0) {
    if (isSuperAdmin) {
      localList[existingIdx].isReadBySuperAdmin = true;
    } else {
      localList[existingIdx].isReadByTenant = true;
    }
    saveLocalTickets(localList, activeTenant);
  }

  try {
    const docRef = doc(db, "tickets", ticketId);
    const payload = {
      [isSuperAdmin ? "isReadBySuperAdmin" : "isReadByTenant"]: true,
      updatedAt: Date.now(),
    };
    await setDoc(docRef, sanitizeForFirestore(payload), { merge: true });
  } catch (err) {
    console.error("Could not mark ticket as read in Firestore:", err);
  }
};

/**
 * Mark all tickets as read
 */
export const markAllTicketsAsRead = async (
  tickets: SupportTicket[],
  isSuperAdmin: boolean,
  tenantId?: string,
  _userId?: string
): Promise<void> => {
  const activeTenant = tenantId || globalTenantId || "default";
  const updated = tickets.map((t) => ({
    ...t,
    [isSuperAdmin ? "isReadBySuperAdmin" : "isReadByTenant"]: true,
  }));
  saveLocalTickets(updated, activeTenant);

  for (const t of tickets) {
    const needsUpdate = isSuperAdmin ? !t.isReadBySuperAdmin : !t.isReadByTenant;
    if (needsUpdate) {
      try {
        const payload = {
          [isSuperAdmin ? "isReadBySuperAdmin" : "isReadByTenant"]: true,
        };
        await setDoc(doc(db, "tickets", t.id), sanitizeForFirestore(payload), { merge: true });
      } catch (err) {
        console.error("Could not mark ticket as read in Firestore:", err);
      }
    }
  }
};

/**
 * Delete a ticket
 */
export const deleteTicket = async (ticketId: string, tenantId?: string, _userId?: string, _isSuperAdmin?: boolean): Promise<void> => {
  if (!ticketId) return;
  const activeTenant = tenantId || globalTenantId || "default";
  const localList = getLocalTickets(activeTenant);
  const filtered = localList.filter((t) => t.id !== ticketId);
  saveLocalTickets(filtered, activeTenant);

  try {
    await deleteDoc(doc(db, "tickets", ticketId));
  } catch (err) {
    console.warn("Could not delete ticket from Firestore:", err);
    throw err;
  }
};

/**
 * Calculates how many unread updates/tickets require attention with role & user context
 */
export const getUnreadTicketsCount = (
  tickets: SupportTicket[],
  contextOrSuperAdmin?: TicketAccessContext | boolean,
  currentUid?: string
): number => {
  if (!tickets || tickets.length === 0) return 0;

  const isSuperAdmin =
    typeof contextOrSuperAdmin === "boolean"
      ? contextOrSuperAdmin
      : Boolean(contextOrSuperAdmin?.isSuperAdmin);

  const isAdmin =
    typeof contextOrSuperAdmin === "object"
      ? Boolean(contextOrSuperAdmin?.isAdmin || contextOrSuperAdmin?.isJudge)
      : false;

  const userId =
    typeof contextOrSuperAdmin === "object" ? contextOrSuperAdmin?.userId : currentUid;

  const userEmail =
    typeof contextOrSuperAdmin === "object" ? contextOrSuperAdmin?.userEmail : undefined;

  if (isSuperAdmin) {
    // For Super Admin: count unread tickets
    return tickets.filter((t) => t.isReadBySuperAdmin === false).length;
  } else if (isAdmin) {
    // For Cabinet Admin / Judge: count unread tickets in cabinet
    return tickets.filter((t) => t.isReadByTenant === false).length;
  } else {
    // For regular Assessor: count only unread updates on their own tickets
    return tickets.filter((t) => {
      const isOwner =
        (Boolean(userId) && t.createdByUid === userId) ||
        (Boolean(userEmail) && t.createdByEmail?.toLowerCase() === userEmail?.toLowerCase());
      return isOwner && t.isReadByTenant === false;
    }).length;
  }
};

/**
 * Backup export / import
 */
export const exportTicketsJson = (tickets: SupportTicket[]) => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(tickets, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `chamados_suporte_assessor_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};
