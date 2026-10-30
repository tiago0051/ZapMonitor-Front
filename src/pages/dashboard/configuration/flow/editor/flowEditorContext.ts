import { createContext, useContext } from "react";

type FlowEditorContextValue = {
  serviceGroups: ServiceGroup[];
  aiAgents: AiAgent[];
};

export const FlowEditorContext = createContext<FlowEditorContextValue>({ serviceGroups: [], aiAgents: [] });

export const useFlowEditorContext = () => useContext(FlowEditorContext);
