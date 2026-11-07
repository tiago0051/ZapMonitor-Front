type AiFieldTarget = "EMAIL" | "NAME" | "DOCUMENT" | "CONTACT_FIELD" | "DEAL_FIELD";

// APPLIED: a IA preencheu (estava vazio); PENDING: sugestão para aprovar; ACCEPTED/DISMISSED: resolvidas
type AiFieldUpdateStatus = "APPLIED" | "PENDING" | "ACCEPTED" | "DISMISSED";

type AiFieldUpdateSource = "SERVICE_SUMMARY" | "DEAL_ANALYSIS" | "AGENT";

type AiFieldUpdate = {
  id: string;
  target: AiFieldTarget;
  fieldId: string | null;
  // Nome do dado ou do campo
  label: string;
  value: string;
  // Valor atual (sugestão) ou anterior
  previousValue: string | null;
  // Trecho da conversa que comprova o valor
  evidence: string | null;
  status: AiFieldUpdateStatus;
  source: AiFieldUpdateSource;
  resolvedAt: string | null;
  createdAt: string;
};
