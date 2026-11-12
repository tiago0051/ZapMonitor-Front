import type { QueryClient } from "@tanstack/react-query";

export const assistantKeys = {
  all: ["assistant"] as const,
  tools: (clientId: string) => ["assistant", "tools", clientId] as const,
  conversations: (clientId: string) => ["assistant", "conversations", clientId] as const,
  conversation: (clientId: string, conversationId: string) => ["assistant", "conversation", clientId, conversationId] as const,
  plan: (clientId: string, planId: string) => ["assistant", "plan", clientId, planId] as const,
  awaitingMe: (clientId: string) => ["assistant", "plans", clientId, "awaitingMe"] as const,
  settings: (clientId: string) => ["assistant", "settings", clientId] as const,
  audit: (clientId: string) => ["assistant", "audit", clientId] as const,
  projects: (clientId: string) => ["assistant", "projects", clientId] as const,
  routines: (clientId: string) => ["assistant", "routines", clientId] as const,
};

/** Grava o plano devolvido pela API e atualiza as listas que mostram planos. */
export function storePlan(queryClient: QueryClient, clientId: string, plan: AssistantPlan) {
  queryClient.setQueryData(assistantKeys.plan(clientId, plan.id), plan);
  queryClient.invalidateQueries({ queryKey: assistantKeys.awaitingMe(clientId) });
  queryClient.invalidateQueries({ queryKey: assistantKeys.audit(clientId) });
  if (plan.conversationId) queryClient.invalidateQueries({ queryKey: assistantKeys.conversation(clientId, plan.conversationId) });
}

export const isPlanRunning = (status: AssistantPlanStatus) => status === "QUEUED" || status === "RUNNING";

type Chip = { label: string; className: string };

const neutral = "bg-muted text-muted-foreground";
const warning = "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300";
const info = "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300";
const success = "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-300";
const danger = "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-300";

export const planStatusInfo: Record<AssistantPlanStatus, Chip> = {
  AWAITING_APPROVAL: { label: "Aguardando aprovação", className: warning },
  QUEUED: { label: "Na fila", className: info },
  RUNNING: { label: "Executando", className: info },
  DONE: { label: "Concluído", className: success },
  PARTIAL: { label: "Concluído em parte", className: warning },
  FAILED: { label: "Falhou", className: danger },
  REJECTED: { label: "Recusado", className: neutral },
  EXPIRED: { label: "Expirado", className: neutral },
};

export const stepStatusInfo: Record<AssistantStepStatus, Chip> = {
  PENDING: { label: "Pendente", className: warning },
  APPROVED: { label: "Aprovado", className: info },
  REJECTED: { label: "Recusado", className: neutral },
  RUNNING: { label: "Executando", className: info },
  DONE: { label: "Feito", className: success },
  FAILED: { label: "Falhou", className: danger },
  SKIPPED: { label: "Não rodou", className: neutral },
  STALE: { label: "Desatualizado", className: warning },
  UNDONE: { label: "Desfeito", className: neutral },
};

export const areaLabel: Record<string, string> = {
  sistema: "Sistema",
  fluxos: "Fluxos",
  agentes: "Agentes de IA",
  atendimento: "Atendimento",
  crm: "CRM",
  contatos: "Contatos",
  whatsapp: "WhatsApp",
  disparos: "Disparos",
  email: "E-mail",
  agenda: "Agenda",
  anuncios: "Anúncios",
  relatorios: "Relatórios",
  estrategia: "Projetos e rotinas",
};

export const toolKindLabel: Record<AssistantToolKind, string> = {
  READ: "Consulta",
  CHANGE: "Propõe mudança",
  SENSITIVE: "Mudança sensível",
};

export const auditActionLabel: Record<AssistantAuditAction, string> = {
  READ: "Consultou",
  STAGE: "Propôs",
  APPROVE: "Aprovou",
  REJECT: "Recusou",
  EXECUTE: "Executou",
  UNDO: "Desfez",
  REVIEW: "Revisou",
};

export const auditOutcomeInfo: Record<AssistantAuditOutcome, Chip> = {
  OK: { label: "Ok", className: success },
  DENIED: { label: "Negado", className: warning },
  ERROR: { label: "Erro", className: danger },
};

export const projectStatusInfo: Record<AssistantProjectStatus, Chip> = {
  ACTIVE: { label: "Em andamento", className: info },
  DONE: { label: "Concluído", className: success },
  CANCELLED: { label: "Cancelado", className: neutral },
};

export const metricLabel: Record<string, string> = {
  CRM_WON_DEALS: "Vendas ganhas no CRM",
  CRM_WIN_RATE: "Taxa de ganho no CRM (%)",
  CRM_WON_VALUE: "Valor vendido no CRM",
  ADS_COST_PER_SALE: "Custo por venda dos anúncios",
  ADS_CONVERSATIONS: "Conversas vindas de anúncios",
  SERVICES_STARTED: "Atendimentos iniciados",
  HUMAN_ATTENDANCE_SHARE: "Atendimentos com humano (%)",
};

export const weekdayLabel = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export const formatNumber = (value: number | null) => (value === null ? "—" : value.toLocaleString("pt-BR", { maximumFractionDigits: 2 }));
