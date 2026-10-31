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
  };
};

type ToggleFlowRequestData = {
  params: FlowRequestParams;
};
