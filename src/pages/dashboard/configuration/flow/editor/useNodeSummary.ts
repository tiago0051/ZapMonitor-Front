import { useFlowEditorContext } from "./flowEditorContext";
import { WEEKDAY_LABELS } from "./flowNodeConfig";

/** 90 → "1h30"; 1440 → "1 dia". */
export function formatWaitMinutes(minutes: number) {
  if (minutes % 1440 === 0) return `${minutes / 1440} dia${minutes > 1440 ? "s" : ""}`;
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h${minutes % 60 ? String(minutes % 60).padStart(2, "0") : ""}`;
}

// Texto curto que descreve o que o nó faz, mostrado no canvas e na lista de pendências
export function useNodeSummary(type: FlowNodeType, data: FlowNodeData) {
  const { serviceGroups, aiAgents, categories, flows, pipelines, emailOptions } = useFlowEditorContext();

  switch (type) {
    case "start":
      return "Quando um novo atendimento começa";
    case "message":
      if (data.media) return data.text?.trim() ? `${data.text.trim()} + ${data.media.fileName}` : `Anexo: ${data.media.fileName}`;
      return data.text?.trim() || "Mensagem não preenchida";
    case "end":
      return data.text?.trim() || "Finaliza sem mensagem";
    case "wait":
      return data.minutes ? `Espera ${formatWaitMinutes(data.minutes)} e segue` : "Defina o tempo de espera";
    case "askField":
      return data.question?.trim() || "Pergunta não preenchida";
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
    case "crm": {
      const pipeline = pipelines.find((item) => item.id === data.pipelineId);
      const stage = pipeline?.stages.find((item) => item.id === data.stageId);
      return pipeline && stage ? `${pipeline.name} → ${stage.name}` : "Selecione o funil e a etapa";
    }
    case "crmAnalysis":
      return data.pipelineId
        ? `Negócios do funil ${pipelines.find((item) => item.id === data.pipelineId)?.name ?? "removido"}`
        : "Todos os negócios abertos do contato";
    case "email":
      return emailOptions.templates.find((template) => template.id === data.templateId)?.name ?? "Selecione o modelo de e-mail";
    case "emailSequence":
      return emailOptions.sequences?.find((sequence) => sequence.id === data.sequenceId)?.name ?? "Selecione a sequência de e-mails";
    case "callPermission":
      return data.text?.trim() || "Pedido com o texto padrão";
    case "queueTimer":
      return `A cada ${data.everyMinutes ?? "?"} min, até ${data.maxRepetitions ?? "?"} vez(es)`;
    case "queueMessage":
      return data.cooldownMinutes ? `No máximo 1 resposta a cada ${data.cooldownMinutes} min` : "Responde toda mensagem";
    case "flow":
      return flows.find((flow) => flow.id === data.flowId)?.name ?? "Selecione um fluxo";
    case "businessHours": {
      if (data.useCompanyHours) return "Horário da empresa (com feriados)";
      const weekdays = [...new Set((data.intervals ?? []).map((interval) => interval.weekday))].sort();
      return weekdays.length ? weekdays.map((weekday) => WEEKDAY_LABELS[weekday].slice(0, 3)).join(", ") : "Sem horários";
    }
  }
}
