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
    kind?: FlowKind;
    // Modelo por tipo de negócio (só fluxo de atendimento); omitido começa em branco
    templateId?: string;
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
  // activate: põe o fluxo no ar logo depois de publicar
  body: { expectedUpdatedAt?: string; activate?: boolean };
};

type SaveCompanyHoursRequestData = {
  params: { clientId: string };
  body: Pick<CompanyHours, "timezone" | "intervals" | "holidays">;
};

type GetFlowMediaUploadUrlRequestData = {
  params: { clientId: string; fileType: FlowMessageMediaKind };
  body: { fileName: string; mimeType: string; fileSize: number };
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

type CreateFlowTestContactRequestData = {
  params: FlowRequestParams;
  body: { phoneNumber: string };
};

type FlowTestContactRequestData = {
  params: FlowRequestParams & { testContactId: string };
};

type SimulateFlowRequestData = {
  params: FlowRequestParams;
  body:
    | { action: "start" }
    | { action: "reply"; state: FlowSimulationState; text: string }
    | { action: "forward"; state: FlowSimulationState; outputId: string }
    | { action: "tick"; state: FlowSimulationState };
};
