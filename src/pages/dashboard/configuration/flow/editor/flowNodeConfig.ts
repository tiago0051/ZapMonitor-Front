import {
  Bot,
  Clock,
  Columns3,
  Flag,
  GitBranch,
  Hourglass,
  MessageCircleQuestion,
  Timer,
  ListOrdered,
  Mail,
  MessageCircleReply,
  MessageSquareText,
  PhoneCall,
  Play,
  Replace,
  Sparkles,
  Tag,
  Tags,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

// Espelha as saídas calculadas pelo backend (flowDefinition.entity.ts)
export const FLOW_OUTPUT_NEXT = "next";
export const FLOW_OUTPUT_OTHER = "other";
export const FLOW_OUTPUT_NOT_SENT = "notSent";
export const FLOW_CONDITION_MAX_BUTTONS = 3;
export const FLOW_CONDITION_MAX_BUTTON_TITLE = 20;
// Texto do pedido de ligação e o que vai quando ele fica vazio (espelham o backend)
export const FLOW_CALL_PERMISSION_MAX_TEXT = 1024;
export const DEFAULT_CALL_PERMISSION_TEXT = "Podemos te ligar pelo WhatsApp para continuar o seu atendimento?";

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
    description: "Envia um texto (e um anexo, se quiser) e segue",
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
    // Nó novo usa o horário da empresa: um só lugar para mudar horário e feriados
    defaultData: () => ({
      useCompanyHours: true,
      timezone: "America/Sao_Paulo",
      intervals: [1, 2, 3, 4, 5].map((weekday) => ({ weekday, start: "08:00", end: "18:00" })),
    }),
  },
  wait: {
    label: "Aguardar",
    description: "Espera um tempo e segue sozinho",
    icon: Timer,
    colorClassName: "text-slate-600 border-slate-500/60",
    defaultData: () => ({ minutes: 60 }),
  },
  askField: {
    label: "Perguntar e salvar",
    description: "Pergunta, espera a resposta e salva na ficha ou no negócio",
    icon: MessageCircleQuestion,
    colorClassName: "text-amber-600 border-amber-500/60",
    defaultData: () => ({ question: "", target: "contactField", fieldId: null, validation: "text" }),
  },
  category: {
    label: "Adicionar categoria",
    description: "Adiciona categorias ao contato e segue",
    icon: Tags,
    colorClassName: "text-teal-600 border-teal-500/60",
    defaultData: () => ({ categoryIds: [] }),
  },
  removeCategory: {
    label: "Remover categoria",
    description: "Remove categorias do contato e segue",
    icon: Tag,
    colorClassName: "text-red-600 border-red-500/60",
    defaultData: () => ({ categoryIds: [] }),
  },
  replaceCategories: {
    label: "Substituir categorias",
    description: "Troca as categorias do contato e segue",
    icon: Replace,
    colorClassName: "text-cyan-600 border-cyan-500/60",
    defaultData: () => ({ categoryIds: [] }),
  },
  crm: {
    label: "Funil do CRM",
    description: "Cria ou move o negócio do contato e segue",
    icon: Columns3,
    colorClassName: "text-fuchsia-600 border-fuchsia-500/60",
    defaultData: () => ({ pipelineId: "", stageId: "", serviceGroupId: "" }),
  },
  crmAnalysis: {
    label: "Análise de IA do negócio",
    description: "Pede à IA a nota e o próximo passo dos negócios do contato e segue",
    icon: Sparkles,
    colorClassName: "text-violet-600 border-violet-500/60",
    defaultData: () => ({ pipelineId: "" }),
  },
  flow: {
    label: "Ir para fluxo",
    description: "Continua no início de outro fluxo",
    icon: Workflow,
    colorClassName: "text-indigo-600 border-indigo-500/60",
    defaultData: () => ({ flowId: "" }),
  },
  email: {
    label: "Enviar e-mail",
    description: "Manda um modelo de e-mail para o e-mail da ficha",
    icon: Mail,
    colorClassName: "text-blue-600 border-blue-500/60",
    defaultData: () => ({ senderId: "", templateId: "" }),
  },
  emailSequence: {
    label: "Sequência de e-mails",
    description: "Coloca a ficha numa sequência de e-mails e segue",
    icon: ListOrdered,
    colorClassName: "text-blue-600 border-blue-500/60",
    defaultData: () => ({ sequenceId: "" }),
  },
  callPermission: {
    label: "Pedir permissão para ligar",
    description: "Pede ao contato a autorização para receber ligações e espera a resposta",
    icon: PhoneCall,
    colorClassName: "text-green-600 border-green-500/60",
    defaultData: () => ({ text: "" }),
  },
  end: {
    label: "Encerrar atendimento",
    description: "Envia uma despedida e finaliza",
    icon: Flag,
    colorClassName: "text-rose-600 border-rose-500/60",
    defaultData: () => ({ text: "" }),
  },
  queueTimer: {
    label: "A cada período",
    description: "Age de tempos em tempos enquanto o contato espera",
    icon: Hourglass,
    colorClassName: "text-emerald-600 border-emerald-500/60",
    defaultData: () => ({ everyMinutes: 10, maxRepetitions: 3 }),
  },
  queueMessage: {
    label: "Cliente mandou mensagem",
    description: "Responde quem escreve enquanto espera",
    icon: MessageCircleReply,
    colorClassName: "text-emerald-600 border-emerald-500/60",
    defaultData: () => ({ cooldownMinutes: 5 }),
  },
};

// Pontos de entrada do fluxo de fila: como o Início, não recebem conexão
export const FLOW_ENTRY_NODE_TYPES: FlowNodeType[] = ["start", "queueTimer", "queueMessage"];

// Variáveis aceitas nas mensagens do fluxo de fila
export const QUEUE_MESSAGE_VARIABLES = "{{nome}}, {{posicao}} (posição na fila) e {{espera}} (tempo esperando)";

// Limites do nó Aguardar (espelham o backend): de 1 minuto a 7 dias
export const FLOW_WAIT_MIN_MINUTES = 1;
export const FLOW_WAIT_MAX_MINUTES = 7 * 24 * 60;

export const FLOW_ASK_TARGET_LABELS: Record<FlowAskTarget, string> = {
  name: "Nome da ficha",
  email: "E-mail da ficha",
  document: "CPF/CNPJ da ficha",
  contactField: "Campo da ficha do contato",
  dealField: "Campo do negócio aberto",
};

export const FLOW_ASK_VALIDATION_LABELS: Record<FlowAskValidation, string> = {
  text: "Texto livre",
  number: "Número",
  email: "E-mail",
  date: "Data",
  phone: "Telefone",
};

/** Chave da variável a partir do nome do campo (igual ao backend): "Data de nascimento" → data_de_nascimento. */
export function toFlowVariableKey(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function createFlowId() {
  return Math.random().toString(36).slice(2, 10);
}

export function getFlowNodeOutputs(type: FlowNodeType, data: FlowNodeData): FlowOutput[] {
  switch (type) {
    case "start":
    case "message":
    case "category":
    case "removeCategory":
    case "replaceCategories":
    case "crm":
    case "crmAnalysis":
    case "queueTimer":
    case "queueMessage":
    case "wait":
      return [{ id: FLOW_OUTPUT_NEXT, label: "Próximo" }];
    case "askField":
      return [
        { id: FLOW_OUTPUT_NEXT, label: "Respondeu" },
        { id: "invalid", label: "Resposta inválida" },
      ];
    case "businessHours":
      return [
        { id: "open", label: "Dentro do horário" },
        { id: "closed", label: "Fora do horário" },
      ];
    case "email":
      return [
        { id: FLOW_OUTPUT_NEXT, label: "E-mail enviado" },
        { id: FLOW_OUTPUT_NOT_SENT, label: "Não enviado" },
      ];
    case "emailSequence":
      return [
        { id: FLOW_OUTPUT_NEXT, label: "Na sequência" },
        { id: "notEnrolled", label: "Não entrou" },
      ];
    case "condition":
      return [...(data.options ?? []), { id: FLOW_OUTPUT_OTHER, label: "Outra resposta" }];
    case "callPermission":
      return [
        { id: "accepted", label: "Autorizou" },
        { id: "rejected", label: "Não autorizou" },
        { id: FLOW_OUTPUT_OTHER, label: "Outra resposta" },
        { id: "unavailable", label: "Não deu para pedir" },
      ];
    case "serviceGroup":
    case "aiAgent":
      return data.outputs ?? [];
    case "end":
    case "flow":
      return [];
  }
}
