type WhatsappNoteUser = { id: string; name: string };

// Nota interna da equipe na conversa; nunca vai para o contato
type WhatsappInternalNote = {
  id: string;
  contactId: string;
  authorUserId: string | null;
  authorName: string | null;
  content: string;
  mentions: WhatsappNoteUser[];
  createdAt: string;
};
