type SalesScriptChannel = "WHATSAPP" | "CALL" | "MEETING";
type SalesScriptMethod = "CONSULTIVE" | "SPIN" | "BANT";
type SalesScriptStatus = "ACTIVE" | "ARCHIVED";

type SalesScriptStage = {
  key: string;
  name: string;
  goal: string;
  questions: string[];
  lines: string[];
  advanceSignals: string[];
  avoid: string[];
  // Etapa do funil do roteiro ligada a esta etapa
  pipelineStageId: string | null;
};

/** Campos do roteiro; também é o rascunho da IA. */
type SalesScriptData = {
  name: string;
  offerId: string | null;
  pipelineId: string | null;
  channel: SalesScriptChannel;
  method: SalesScriptMethod;
  stages: SalesScriptStage[];
  notes: string | null;
};

type SalesScript = SalesScriptData & {
  id: string;
  status: SalesScriptStatus;
  version: number;
  updatedAt: string;
  // Vendas fechadas desde a última mudança (só na lista, nos ativos)
  learning?: { wonSinceUpdate: number; lostSinceUpdate: number; reviewSuggested: boolean } | null;
};

type SalesScriptImprovement = {
  stages: SalesScriptStage[];
  notes: string | null;
  changes: string[];
  learnings: string[];
  basedOn: { won: number; lost: number };
};

type ScriptCoach = {
  stageKey: string | null;
  stageName: string | null;
  reason: string;
  nextStep: string;
  suggestedMessage: string;
};

type DealSalesScript = { script: SalesScript | null; stage: SalesScriptStage | null };
