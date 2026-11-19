import { useSyncExternalStore } from "react";

// Rascunho de cada conversa: o texto (mensagem ou legenda) também vai para o sessionStorage (sobrevive a recarregar a
// aba); anexos, áudio gravado e "respondendo a" ficam só na memória, porque arquivo não cabe lá
export type DraftMessage = { text: string; attachments: File[]; audio: Blob | null };

export const emptyDraftMessage = (): DraftMessage => ({ text: "", attachments: [], audio: null });

type ConversationDraft = { message?: DraftMessage; replyingTo?: WhatsappMessage | null };

const STORAGE_PREFIX = "whatsapp:draft:";

const drafts = new Map<string, ConversationDraft>();
const storageChecked = new Set<string>();
const listeners = new Set<() => void>();

const storageKey = (contactId: string) => `${STORAGE_PREFIX}${contactId}`;

function readStoredText(contactId: string) {
  try {
    return sessionStorage.getItem(storageKey(contactId)) ?? "";
  } catch {
    return "";
  }
}

function writeStoredText(contactId: string, text: string) {
  try {
    if (text) sessionStorage.setItem(storageKey(contactId), text);
    else sessionStorage.removeItem(storageKey(contactId));
  } catch {
    // Sem sessionStorage (aba privada, cota cheia): o rascunho continua na memória
  }
}

function update(contactId: string, change: Partial<ConversationDraft>) {
  const next = { ...drafts.get(contactId), ...change };
  if (!next.message && !next.replyingTo) drafts.delete(contactId);
  else drafts.set(contactId, next);
  listeners.forEach((notify) => notify());
}

const isEmptyMessage = (message: DraftMessage) => !message.text && message.attachments.length === 0 && !message.audio;

/** Mensagem em edição da conversa; o texto salvo no sessionStorage vale quando a memória está vazia (aba recarregada). */
export function getDraftMessage(contactId: string): DraftMessage | null {
  // O sessionStorage é lido uma vez por conversa; depois a memória é a fonte (o card relê a cada tecla digitada)
  if (!storageChecked.has(contactId)) {
    storageChecked.add(contactId);
    const text = readStoredText(contactId);
    if (text && !drafts.get(contactId)?.message)
      drafts.set(contactId, { ...drafts.get(contactId), message: { ...emptyDraftMessage(), text } });
  }

  return drafts.get(contactId)?.message ?? null;
}

export function saveDraftMessage(contactId: string, message: DraftMessage) {
  storageChecked.add(contactId);
  const isEmpty = isEmptyMessage(message);
  writeStoredText(contactId, message.text);
  update(contactId, { message: isEmpty ? undefined : message });
}

export const getDraftReply = (contactId: string) => drafts.get(contactId)?.replyingTo ?? null;

export const saveDraftReply = (contactId: string, replyingTo: WhatsappMessage | null) => update(contactId, { replyingTo });

/** Resumo do rascunho para o card da lista ("" sem rascunho). */
function getDraftPreview(contactId: string) {
  const message = getDraftMessage(contactId);
  if (!message) return "";
  if (message.audio) return "Áudio gravado";
  if (message.attachments.length === 1) return `Anexo: ${message.attachments[0].name}`;
  if (message.attachments.length > 1) return `${message.attachments.length} anexos`;
  return message.text.trim();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Rascunho da conversa para mostrar na lista; atualiza quando o atendente digita em qualquer conversa. */
export const useDraftPreview = (contactId: string) =>
  useSyncExternalStore(
    subscribe,
    () => getDraftPreview(contactId),
    () => "",
  );
