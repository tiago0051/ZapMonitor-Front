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
  // Pede à IA a análise dos negócios abertos do contato
  | "crmAnalysis"
  | "flow"
  | "end"
  // Pontos de entrada do fluxo de fila
  | "queueTimer"
  | "queueMessage";

// SERVICE conduz o atendimento a partir do Início; QUEUE age enquanto o contato espera na fila de um grupo
type FlowKind = "SERVICE" | "QUEUE";

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
  // Nó Grupo: fluxo de fila desta etapa; sem ele vale o do grupo
  queueFlowId?: string | null;
  // "A cada período": intervalo e limite de repetições
  everyMinutes?: number;
  maxRepetitions?: number;
  // "Cliente mandou mensagem": intervalo mínimo entre respostas
  cooldownMinutes?: number;
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
  kind: FlowKind;
  // Cada publicação gera uma versão (0 = nunca publicado); atendimentos seguem na versão em que começaram
  version: number;
  // Versão publicada, a que atende os contatos
  definition: FlowDefinition;
  // Rascunho em edição; nulo quando o editor está igual à versão publicada
  draftDefinition: FlowDefinition | null;
  draftUpdatedAt: string | null;
  // Números cujos novos atendimentos começam neste fluxo
  whatsappConfigurationIds: string[];
  // Pendências do que está no editor (impedem publicar) e da versão publicada (impedem ativar)
  issues: FlowIssue[];
  publishedIssues: FlowIssue[];
  createdAt: string;
  updatedAt: string;
};

type FlowVersion = {
  id: string;
  version: number;
  publishedByName: string | null;
  createdAt: string;
  // A versão no ar agora
  current: boolean;
};

// Telefone que, ao escrever para qualquer número do cliente, cai no rascunho do fluxo
type FlowTestContact = {
  id: string;
  flowId: string;
  // Só dígitos, com DDI
  phoneNumber: string;
  createdAt: string;
};

type FlowSimulationState = {
  rootFlowId: string;
  flowId: string;
  nodeId: string | null;
  finished: boolean;
  history: { role: "contact" | "bot"; text: string }[];
};

type FlowSimulationEvent = {
  // bot: mensagem do fluxo; info: o que aconteceria (categoria, CRM...); queue: foi para a fila; end: encerrou
  kind: "bot" | "info" | "queue" | "end";
  text: string;
  buttons?: string[];
  flowId: string;
  nodeId?: string;
};

type FlowSimulationResult = {
  state: FlowSimulationState;
  events: FlowSimulationEvent[];
  visitedNodeIds: string[];
  forwardOptions: FlowOutput[];
  // Fluxo de fila: dá para avançar o tempo
  canTick: boolean;
};
