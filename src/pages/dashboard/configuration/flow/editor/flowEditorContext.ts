import { createContext, useContext } from "react";

type FlowEditorContextValue = {
  serviceGroups: ServiceGroup[];
  aiAgents: AiAgent[];
  categories: WhatsappMessageCategory[];
  // Todos os fluxos do cliente, inclusive o que está sendo editado
  flows: Flow[];
  currentFlowId: string;
};

export const FlowEditorContext = createContext<FlowEditorContextValue>({
  serviceGroups: [],
  aiAgents: [],
  categories: [],
  flows: [],
  currentFlowId: "",
});

export const useFlowEditorContext = () => useContext(FlowEditorContext);
