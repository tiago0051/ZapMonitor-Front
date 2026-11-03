import { createContext, useContext } from "react";

type FlowEditorContextValue = {
  serviceGroups: ServiceGroup[];
  aiAgents: AiAgent[];
  categories: WhatsappMessageCategory[];
  // Todos os fluxos do cliente, inclusive o que está sendo editado
  flows: Flow[];
  // Funis ativos do CRM; vazio quando o plano não inclui o módulo
  pipelines: Pipeline[];
  // Campos ativos do CRM, que o agente de IA pode preencher
  crmFields: CrmField[];
  currentFlowId: string;
};

export const FlowEditorContext = createContext<FlowEditorContextValue>({
  serviceGroups: [],
  aiAgents: [],
  categories: [],
  flows: [],
  pipelines: [],
  crmFields: [],
  currentFlowId: "",
});

export const useFlowEditorContext = () => useContext(FlowEditorContext);

// Quantidade de pendências por nó, para o canvas destacar onde corrigir
export const FlowIssuesContext = createContext<Map<string, number>>(new Map());

export const useFlowIssuesContext = () => useContext(FlowIssuesContext);
