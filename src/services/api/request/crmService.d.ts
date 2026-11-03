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
};

type SavePipelineRequestBody = {
  name: string;
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
  whatsappContactId: string;
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
};

type UpdateDealRequestData = {
  params: DealRequestParams;
  body: UpdateDealRequestBody;
};

type MoveDealRequestData = {
  params: DealRequestParams;
  body: { stageId: string; lostReason?: string };
};

type TransferDealRequestData = {
  params: DealRequestParams;
  body: { serviceGroupId: string | null };
};

type ReopenDealRequestData = {
  params: DealRequestParams;
  body: { stageId?: string };
};
