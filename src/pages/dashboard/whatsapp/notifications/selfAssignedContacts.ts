// Atendimentos que o próprio usuário assumiu, para não avisá-lo de uma ação dele mesmo.
// O BroadcastChannel repassa a informação para as outras abas abertas no mesmo navegador.

const SELF_ASSIGNED_TTL_MS = 60 * 1000;

const selfAssignedAt = new Map<string, number>();

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("whatsapp:self-assigned") : null;

channel?.addEventListener("message", (event: MessageEvent<string>) => {
  selfAssignedAt.set(event.data, Date.now());
});

export function markSelfAssigned(contactId: string) {
  selfAssignedAt.set(contactId, Date.now());
  channel?.postMessage(contactId);
}

export function wasSelfAssigned(contactId: string) {
  const assignedAt = selfAssignedAt.get(contactId);
  return !!assignedAt && Date.now() - assignedAt < SELF_ASSIGNED_TTL_MS;
}
