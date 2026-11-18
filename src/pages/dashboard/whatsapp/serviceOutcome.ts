// Resultados que o atendente escolhe ao encerrar (mesmos valores do back-end)
export const SERVICE_OUTCOMES = [
  { value: "resolved", label: "Resolvido" },
  { value: "sale", label: "Venda feita" },
  { value: "noReply", label: "Sem resposta" },
  { value: "notInterested", label: "Sem interesse" },
  { value: "forwarded", label: "Encaminhado" },
  { value: "other", label: "Outro" },
] as const;

export type ServiceOutcome = (typeof SERVICE_OUTCOMES)[number]["value"];

export const serviceOutcomeLabel = (outcome: string | null | undefined) =>
  SERVICE_OUTCOMES.find((item) => item.value === outcome)?.label ?? null;

// Mesmo limite do back-end
export const END_SERVICE_ANNOTATION_MAX_LENGTH = 1000;
