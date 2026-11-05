type FindAllFlowsRequestData = {
  params: FindAllFlowsRequestParams;
};

type FindAllFlowsRequestParams = {
  clientId: string;
};

type FindFlowByIdRequestData = {
  params: FlowRequestParams;
};

type FlowRequestParams = {
  clientId: string;
  flowId: string;
};

type CreateFlowRequestData = {
  params: FindAllFlowsRequestParams;
  body: {
    name: string;
    resetAfterMinutes?: number;
  };
};

type UpdateFlowRequestData = {
  params: FlowRequestParams;
  body: {
    name: string;
    resetAfterMinutes: number;
    definition: FlowDefinition;
    whatsappConfigurationIds: string[];
    // updatedAt do fluxo que o editor abriu; o back recusa se outra pessoa salvou depois
    expectedUpdatedAt?: string;
  };
};

type PublishFlowRequestData = {
  params: FlowRequestParams;
  body: { expectedUpdatedAt?: string };
};

type RestoreFlowVersionRequestData = {
  params: FlowRequestParams & { versionId: string };
};

type DuplicateFlowRequestData = {
  params: FlowRequestParams;
  body: { name?: string };
};

type ToggleFlowRequestData = {
  params: FlowRequestParams;
};
