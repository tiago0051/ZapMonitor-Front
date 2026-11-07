export const contactDetailKey = (clientId: string, id: string) => ["contacts", "detail", clientId, id];

export const contactDisplayName = (contact: { name: string | null; phone?: string | null; email?: string | null }) =>
  contact.name?.trim() || contact.phone || contact.email || "Sem nome";
