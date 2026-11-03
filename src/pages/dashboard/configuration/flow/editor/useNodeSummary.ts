import { useFlowEditorContext } from "./flowEditorContext";
import { WEEKDAY_LABELS } from "./flowNodeConfig";

// Texto curto que descreve o que o nó faz, mostrado no canvas e na lista de pendências
export function useNodeSummary(type: FlowNodeType, data: FlowNodeData) {
  const { serviceGroups, aiAgents, categories, flows } = useFlowEditorContext();

  switch (type) {
    case "start":
      return "Quando um novo atendimento começa";
    case "message":
    case "end":
      return data.text?.trim() || (type === "end" ? "Finaliza sem mensagem" : "Mensagem não preenchida");
    case "condition":
      return data.question?.trim() || "Pergunta não preenchida";
    case "aiAgent":
      return aiAgents.find((agent) => agent.id === data.aiAgentId)?.name ?? "Selecione um agente";
    case "serviceGroup":
      return serviceGroups.find((group) => group.id === data.serviceGroupId)?.name ?? "Selecione um grupo";
    case "category":
    case "removeCategory":
    case "replaceCategories": {
      const names = (data.categoryIds ?? []).map((id) => categories.find((category) => category.id === id)?.name ?? "Categoria removida");
      return names.length ? names.join(", ") : "Selecione as categorias";
    }
    case "flow":
      return flows.find((flow) => flow.id === data.flowId)?.name ?? "Selecione um fluxo";
    case "businessHours": {
      const weekdays = [...new Set((data.intervals ?? []).map((interval) => interval.weekday))].sort();
      return weekdays.length ? weekdays.map((weekday) => WEEKDAY_LABELS[weekday].slice(0, 3)).join(", ") : "Sem horários";
    }
  }
}
