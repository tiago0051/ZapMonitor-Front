type FlowNodeType =
  | "start"
  | "serviceGroup"
  | "aiAgent"
  | "condition"
  | "message"
  | "businessHours"
  | "category"
  | "removeCategory"
  | "replaceCategories"
  | "crm"
  | "flow"
  | "end";

type FlowOutput = {
  id: string;
  label: string;
  description?: string;
};

type FlowBusinessHoursInterval = {
  // 0 = domingo ... 6 = sábado
  weekday: number;
  start: string;
  end: string;
};

type FlowNodeData = {
  serviceGroupId?: string;
  aiAgentId?: string;
  goal?: string;
  outputs?: FlowOutput[];
  mode?: "buttons" | "ai";
  question?: string;
  options?: FlowOutput[];
  text?: string;
  timezone?: string;
  intervals?: FlowBusinessHoursInterval[];
  categoryIds?: string[];
  flowId?: string;
  pipelineId?: string;
  stageId?: string;
  // Nó de agente: etapas e campos do CRM que o agente pode mudar no negócio do contato
  crm?: { pipelineId: string; stageIds: string[]; fieldIds: string[] } | null;
};

type FlowDefinitionNode = {
  id: string;
  type: FlowNodeType;
  position: { x: number; y: number };
  data: FlowNodeData;
};

type FlowDefinitionEdge = {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
};

type FlowDefinition = {
  nodes: FlowDefinitionNode[];
  edges: FlowDefinitionEdge[];
};

// Pendência de um nó (nodeId) ou do fluxo todo (sem nodeId)
type FlowIssue = {
  nodeId?: string;
  message: string;
};

type Flow = {
  id: string;
  clientId: string;
  name: string;
  active: boolean;
  resetAfterMinutes: number;
  // Cada edição do grafo gera uma versão; atendimentos seguem na versão em que começaram
  version: number;
  definition: FlowDefinition;
  // Números cujos novos atendimentos começam neste fluxo
  whatsappConfigurationIds: string[];
  issues: FlowIssue[];
  createdAt: string;
  updatedAt: string;
};
