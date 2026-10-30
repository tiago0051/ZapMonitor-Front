type FlowNodeType = "start" | "serviceGroup" | "aiAgent" | "condition" | "message" | "businessHours" | "end";

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

type Flow = {
  id: string;
  clientId: string;
  name: string;
  active: boolean;
  resetAfterMinutes: number;
  definition: FlowDefinition;
  issues: string[];
  createdAt: string;
  updatedAt: string;
};
