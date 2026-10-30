import { Bot, Clock, Flag, GitBranch, MessageSquareText, Play, Users, type LucideIcon } from "lucide-react";

// Espelha as saídas calculadas pelo backend (flowDefinition.entity.ts)
export const FLOW_OUTPUT_NEXT = "next";
export const FLOW_OUTPUT_OTHER = "other";
export const FLOW_CONDITION_MAX_BUTTONS = 3;
export const FLOW_CONDITION_MAX_BUTTON_TITLE = 20;

export const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

type FlowNodeConfig = {
  label: string;
  description: string;
  icon: LucideIcon;
  // Classes do ícone e da borda do nó
  colorClassName: string;
  defaultData: () => FlowNodeData;
};

export const flowNodeConfigs: Record<FlowNodeType, FlowNodeConfig> = {
  start: {
    label: "Início",
    description: "Primeira mensagem do contato",
    icon: Play,
    colorClassName: "text-emerald-600 border-emerald-500/60",
    defaultData: () => ({}),
  },
  message: {
    label: "Mensagem",
    description: "Envia um texto fixo e segue",
    icon: MessageSquareText,
    colorClassName: "text-sky-600 border-sky-500/60",
    defaultData: () => ({ text: "" }),
  },
  condition: {
    label: "Condicional",
    description: "Pergunta e segue pela resposta",
    icon: GitBranch,
    colorClassName: "text-amber-600 border-amber-500/60",
    defaultData: () => ({
      mode: "buttons",
      question: "",
      options: [
        { id: createFlowId(), label: "Sim" },
        { id: createFlowId(), label: "Não" },
      ],
    }),
  },
  aiAgent: {
    label: "Agente de IA",
    description: "A IA atende até concluir a etapa",
    icon: Bot,
    colorClassName: "text-violet-600 border-violet-500/60",
    defaultData: () => ({ aiAgentId: "", goal: "", outputs: [{ id: createFlowId(), label: "Concluído" }] }),
  },
  serviceGroup: {
    label: "Grupo de atendimento",
    description: "Fila humana; o atendente encaminha",
    icon: Users,
    colorClassName: "text-green-600 border-green-500/60",
    defaultData: () => ({ serviceGroupId: "", outputs: [{ id: createFlowId(), label: "Concluído" }] }),
  },
  businessHours: {
    label: "Horário de atendimento",
    description: "Segue por dentro ou fora do horário",
    icon: Clock,
    colorClassName: "text-orange-600 border-orange-500/60",
    defaultData: () => ({
      timezone: "America/Sao_Paulo",
      intervals: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "08:00", end: "18:00" })),
    }),
  },
  end: {
    label: "Encerrar atendimento",
    description: "Envia uma despedida e finaliza",
    icon: Flag,
    colorClassName: "text-rose-600 border-rose-500/60",
    defaultData: () => ({ text: "" }),
  },
};

export function createFlowId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getFlowNodeOutputs(type: FlowNodeType, data: FlowNodeData): FlowOutput[] {
  switch (type) {
    case "start":
    case "message":
      return [{ id: FLOW_OUTPUT_NEXT, label: "Próximo" }];
    case "businessHours":
      return [
        { id: "open", label: "Dentro do horário" },
        { id: "closed", label: "Fora do horário" },
      ];
    case "condition":
      return [...(data.options ?? []), { id: FLOW_OUTPUT_OTHER, label: "Outra resposta" }];
    case "serviceGroup":
    case "aiAgent":
      return data.outputs ?? [];
    case "end":
      return [];
  }
}
