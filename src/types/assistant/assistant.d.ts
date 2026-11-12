// Assistente do ZapMonitor: conversa que propõe planos; cada passo é aprovado por quem tem a permissão dele

type AssistantToolKind = "READ" | "CHANGE" | "SENSITIVE";

type AssistantTool = {
  name: string;
  area: string;
  kind: AssistantToolKind;
  description: string;
};

type AssistantConversation = {
  id: string;
  title: string;
  adAccountId: string | null;
  createdAt: string;
  updatedAt: string;
};

/** O que o assistente consultou para responder (nomes em português vindos da API). */
type AssistantToolCall = {
  nome: string;
  entrada: unknown;
  resultado: unknown;
};

type AssistantMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  toolCalls: AssistantToolCall[] | null;
  planId: string | null;
  createdAt: string;
};

type AssistantPlanStatus = "AWAITING_APPROVAL" | "QUEUED" | "RUNNING" | "DONE" | "PARTIAL" | "FAILED" | "REJECTED" | "EXPIRED";

type AssistantStepStatus = "PENDING" | "APPROVED" | "REJECTED" | "RUNNING" | "DONE" | "FAILED" | "SKIPPED" | "STALE" | "UNDONE";

type AssistantStep = {
  id: string;
  position: number;
  tool: string;
  area: string;
  title: string;
  // Uma linha
  preview: string;
  // Texto exato da mensagem, antes/depois, descrição do fluxo...
  previewDetail: string | null;
  input: Record<string, unknown>;
  sensitive: boolean;
  permissions: string[];
  // Posições dos passos de que este depende
  dependsOn: number[];
  status: AssistantStepStatus;
  canDecide: boolean;
  decidedById: string | null;
  rejectReason: string | null;
  resultSummary: string | null;
  error: string | null;
  canUndo: boolean;
  undoneAt: string | null;
};

type AssistantPlan = {
  id: string;
  conversationId: string | null;
  projectId: string | null;
  routineId: string | null;
  createdById: string;
  title: string;
  goal: string | null;
  status: AssistantPlanStatus;
  rejectionReason: string | null;
  resultSummary: string | null;
  reviewSummary: string | null;
  expiresAt: string | null;
  createdAt: string;
  finishedAt: string | null;
  canExecute: boolean;
  steps: AssistantStep[];
};

type AssistantConversationDetail = {
  conversation: AssistantConversation;
  messages: AssistantMessage[];
  plans: AssistantPlan[];
};

type AssistantSendMessageResult = {
  conversationId: string;
  messages: AssistantMessage[];
  plan: AssistantPlan | null;
};

type AssistantSettings = {
  requireSecondApprover: boolean;
  reviewAfterDays: number;
};

type AssistantAuditAction = "READ" | "STAGE" | "APPROVE" | "REJECT" | "EXECUTE" | "UNDO" | "REVIEW";

type AssistantAuditOutcome = "OK" | "DENIED" | "ERROR";

type AssistantAudit = {
  id: string;
  userId: string | null;
  conversationId: string | null;
  planId: string | null;
  stepId: string | null;
  tool: string | null;
  action: AssistantAuditAction;
  outcome: AssistantAuditOutcome;
  input: unknown;
  detail: string | null;
  createdAt: string;
};

type AssistantProjectStatus = "ACTIVE" | "DONE" | "CANCELLED";

type AssistantProject = {
  id: string;
  title: string;
  goal: string;
  metric: string | null;
  baseline: number | null;
  target: number | null;
  deadline: string | null;
  milestones: { title: string; done: boolean }[];
  status: AssistantProjectStatus;
  lastReviewAt: string | null;
  nextReviewAt: string | null;
  reviewSummary: string | null;
  conversationId: string | null;
};

type AssistantRoutine = {
  id: string;
  title: string;
  instruction: string;
  frequency: "DAILY" | "WEEKLY";
  // 0 = domingo; só nas semanais
  weekday: number | null;
  hour: number;
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string;
  lastError: string | null;
  conversationId: string | null;
};
