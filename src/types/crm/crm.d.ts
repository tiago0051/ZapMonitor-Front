type PipelineStageType = "OPEN" | "WON" | "LOST";

type DealStatus = "OPEN" | "WON" | "LOST";

type DealEventType = "CREATED" | "UPDATED" | "STAGE_CHANGED" | "GROUP_CHANGED" | "REOPENED" | "FLOW_TRIGGERED";

type StageFlowResult = "STARTED" | "FLOW_INACTIVE" | "OUTSIDE_WINDOW" | "SERVICE_LIMIT" | "FAILED";

type PipelineStage = {
  id: string;
  name: string;
  color: string;
  order: number;
  type: PipelineStageType;
  // Fluxo que roda quando alguém move um negócio para a etapa
  entryFlowId: string | null;
  // Dias sem atividade para um negócio aberto aparecer como esfriando
  staleAfterDays: number | null;
};

type Pipeline = {
  id: string;
  name: string;
  active: boolean;
  stages: PipelineStage[];
  createdAt: string;
  updatedAt: string;
};

type NamedSummary = {
  id: string;
  name: string;
};

type DealContact = {
  id: string;
  name: string | null;
  surname: string | null;
  phoneNumber: string;
  categories: NamedSummary[];
};

type Deal = {
  id: string;
  pipelineId: string;
  stageId: string;
  contact: DealContact;
  serviceGroup: NamedSummary | null;
  owner: NamedSummary | null;
  title: string;
  value: number | null;
  notes: string | null;
  status: DealStatus;
  lostReason: string | null;
  lostReasonId: string | null;
  // Última mudança no negócio ou mensagem trocada com o contato
  lastActivityAt: string;
  stageEnteredAt: string;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type DealEvent = {
  id: string;
  type: DealEventType;
  user: NamedSummary | null;
  fromStageId: string | null;
  toStageId: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

type LostReason = {
  id: string;
  name: string;
  active: boolean;
};
