type CrmClientRequestParams = {
  clientId: string;
};

type FindAllPipelinesRequestData = {
  params: CrmClientRequestParams;
};

type SavePipelineStageRequestBody = {
  id?: string;
  name: string;
  color: string;
  type: PipelineStageType;
  entryFlowId?: string | null;
  staleAfterDays?: number | null;
  requiredFieldIds?: string[];
  conversionEvent?: ConversionEventName | null;
  countsAsMeeting?: boolean;
};

type SavePipelineRequestBody = {
  name: string;
  allowMultipleOpenDeals?: boolean;
  stages: SavePipelineStageRequestBody[];
};

type CreatePipelineRequestData = {
  params: CrmClientRequestParams;
  body: SavePipelineRequestBody;
};

type PipelineRequestParams = CrmClientRequestParams & {
  pipelineId: string;
};

type UpdatePipelineRequestData = {
  params: PipelineRequestParams;
  body: SavePipelineRequestBody;
};

type SetPipelineActiveRequestData = {
  params: PipelineRequestParams;
  body: { active: boolean };
};

type FindDealBoardRequestQuery = {
  pipelineId: string;
  serviceGroupIds?: string;
  ownerUserId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  // NONE traz os negócios sem anúncio de origem
  originType?: DealOriginType | "NONE";
  originMetaCampaignId?: string;
  // Ganhos e perdidos só fechados a partir desta data (ISO); os abertos vêm sempre
  closedSince?: string;
};

type FindDealBoardRequestData = {
  params: CrmClientRequestParams;
  queries: FindDealBoardRequestQuery;
};

type FindContactDealsRequestData = {
  params: CrmClientRequestParams & { contactId: string };
};

type DealRequestParams = CrmClientRequestParams & {
  dealId: string;
};

type FindDealRequestData = {
  params: DealRequestParams;
};

type CreateDealRequestBody = {
  pipelineId: string;
  stageId?: string;
  // A conversa do WhatsApp ou a ficha do contato (contactId); pela ficha vale a conversa do telefone principal
  whatsappContactId?: string;
  contactId?: string;
  serviceGroupId?: string | null;
  title?: string;
  value?: number | null;
  notes?: string | null;
  ownerUserId?: string | null;
};

type CreateDealRequestData = {
  params: CrmClientRequestParams;
  body: CreateDealRequestBody;
};

type UpdateDealRequestBody = {
  title: string;
  value: number | null;
  notes: string | null;
  ownerUserId: string | null;
  customFields?: Record<string, string | number | null>;
};

type UpdateDealRequestData = {
  params: DealRequestParams;
  body: UpdateDealRequestBody;
};

type MoveDealRequestData = {
  params: DealRequestParams;
  body: { stageId: string; lostReasonId?: string; lostReason?: string; customFields?: Record<string, string | number | null> };
};

type TransferDealRequestData = {
  params: DealRequestParams;
  body: { serviceGroupId: string | null };
};

type ReopenDealRequestData = {
  params: DealRequestParams;
  body: { stageId?: string };
};

type FindAllLostReasonsRequestData = {
  params: CrmClientRequestParams;
};

type CreateLostReasonRequestData = {
  params: CrmClientRequestParams;
  body: { name: string };
};

type LostReasonRequestParams = CrmClientRequestParams & {
  lostReasonId: string;
};

type UpdateLostReasonRequestData = {
  params: LostReasonRequestParams;
  body: { name: string };
};

type SetLostReasonActiveRequestData = {
  params: LostReasonRequestParams;
  body: { active: boolean };
};

type SaveCrmFieldRequestBody = {
  name: string;
  type: CrmFieldType;
  // Só na criação; o escopo não muda depois
  scope?: CrmFieldScope;
  aiFillable?: boolean;
  aiInstruction?: string | null;
  options?: string[];
};

type CreateCrmFieldRequestData = {
  params: CrmClientRequestParams;
  body: SaveCrmFieldRequestBody;
};

type CrmFieldRequestParams = CrmClientRequestParams & {
  fieldId: string;
};

type UpdateCrmFieldRequestData = {
  params: CrmFieldRequestParams;
  body: SaveCrmFieldRequestBody;
};

type SetCrmFieldActiveRequestData = {
  params: CrmFieldRequestParams;
  body: { active: boolean };
};

type SaveDealTaskRequestBody = {
  title: string;
  dueAt: string;
  // Sem tipo, "Outro" na criação; na edição mantém o atual
  type?: DealTaskType;
  assigneeUserId?: string | null;
};

type CreateDealTaskRequestData = {
  params: DealRequestParams;
  body: SaveDealTaskRequestBody;
};

type DealTaskRequestParams = CrmClientRequestParams & {
  taskId: string;
};

type UpdateDealTaskRequestData = {
  params: DealTaskRequestParams;
  body: SaveDealTaskRequestBody;
};

type SetDealTaskCompletedRequestData = {
  params: DealTaskRequestParams;
  body: { completed: boolean };
};

type DeleteDealTaskRequestData = {
  params: DealTaskRequestParams;
};

type FindCrmReportRequestData = {
  params: CrmClientRequestParams;
  queries: { pipelineId: string; startDate: string; endDate: string; serviceGroupIds?: string };
};

type LogDealActivityRequestData = {
  params: DealRequestParams;
  body: {
    type: DealActivityType;
    outcome?: string | null;
    text?: string | null;
    // Quando aconteceu (ISO); sem a data, agora
    occurredAt?: string;
    // Cria uma tarefa para o próximo passo
    nextStep?: { title: string; dueAt: string; type?: DealTaskType };
  };
};
