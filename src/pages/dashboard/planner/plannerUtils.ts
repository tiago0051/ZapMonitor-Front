import { format, setHours, setMinutes } from "date-fns";
import { CalendarCheck, CheckSquare, Image as ImageIcon, Lightbulb, Mail, Megaphone, Rocket, Send, type LucideIcon } from "lucide-react";

type EventTypeInfo = { label: string; plural: string; icon: LucideIcon; className: string; dotClassName: string };

export const eventTypeInfo: Record<PlannerEventType, EventTypeInfo> = {
  SOCIAL_POST: {
    label: "Postagem",
    plural: "Postagens",
    icon: ImageIcon,
    className: "bg-pink-100 text-pink-900 dark:bg-pink-950/60 dark:text-pink-100",
    dotClassName: "bg-pink-500",
  },
  WHATSAPP_BROADCAST: {
    label: "Disparo de WhatsApp",
    plural: "Disparos",
    icon: Send,
    className: "bg-green-100 text-green-900 dark:bg-green-950/60 dark:text-green-100",
    dotClassName: "bg-green-500",
  },
  EMAIL_CAMPAIGN: {
    label: "Campanha de e-mail",
    plural: "E-mails",
    icon: Mail,
    className: "bg-sky-100 text-sky-900 dark:bg-sky-950/60 dark:text-sky-100",
    dotClassName: "bg-sky-500",
  },
  AD_CAMPAIGN: {
    label: "Anúncio",
    plural: "Anúncios",
    icon: Megaphone,
    className: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-100",
    dotClassName: "bg-orange-500",
  },
  AD_ACTIVATION: {
    label: "Ativação de anúncio",
    plural: "Ativações",
    icon: Rocket,
    className: "bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-100",
    dotClassName: "bg-orange-500",
  },
  CRM_TASK: {
    label: "Tarefa do CRM",
    plural: "Tarefas do CRM",
    icon: CalendarCheck,
    className: "bg-violet-100 text-violet-900 dark:bg-violet-950/60 dark:text-violet-100",
    dotClassName: "bg-violet-500",
  },
  PLANNER_TASK: {
    label: "Tarefa",
    plural: "Tarefas",
    icon: CheckSquare,
    className: "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-100",
    dotClassName: "bg-amber-500",
  },
  PLAN_ITEM: {
    label: "Sugestão da IA",
    plural: "Sugestões da IA",
    icon: Lightbulb,
    className: "border border-dashed border-primary/50 bg-background text-foreground",
    dotClassName: "bg-primary",
  },
};

// Filtros da tela: anúncio e ativação andam juntos
export const filterGroups: { id: string; label: string; types: PlannerEventType[] }[] = [
  { id: "posts", label: "Postagens", types: ["SOCIAL_POST"] },
  { id: "broadcasts", label: "Disparos", types: ["WHATSAPP_BROADCAST"] },
  { id: "emails", label: "E-mails", types: ["EMAIL_CAMPAIGN"] },
  { id: "ads", label: "Anúncios", types: ["AD_CAMPAIGN", "AD_ACTIVATION"] },
  { id: "tasks", label: "Tarefas", types: ["PLANNER_TASK"] },
  { id: "crm", label: "Tarefas do CRM", types: ["CRM_TASK"] },
  { id: "suggestions", label: "Sugestões da IA", types: ["PLAN_ITEM"] },
];

export const itemKindLabel: Record<PlannerItemKind, string> = {
  SOCIAL_POST: "Postagem",
  WHATSAPP_BROADCAST: "Disparo de WhatsApp",
  EMAIL_CAMPAIGN: "Campanha de e-mail",
  AD_CAMPAIGN: "Anúncio",
  TASK: "Tarefa",
};

export const itemKindEventType: Record<PlannerItemKind, PlannerEventType> = {
  SOCIAL_POST: "SOCIAL_POST",
  WHATSAPP_BROADCAST: "WHATSAPP_BROADCAST",
  EMAIL_CAMPAIGN: "EMAIL_CAMPAIGN",
  AD_CAMPAIGN: "AD_CAMPAIGN",
  TASK: "PLANNER_TASK",
};

export const taskCategoryLabel: Record<PlannerTaskCategory, string> = {
  CONTENT: "Conteúdo",
  CAMPAIGN: "Campanha",
  ADS: "Anúncios",
  OTHER: "Outra",
};

export const postFormatLabel: Record<SocialPostFormat, string> = { IMAGE: "Imagem", CAROUSEL: "Carrossel", REEL: "Reel" };

const statusLabel: Record<string, string> = {
  DRAFT: "Rascunho",
  GENERATING: "Gerando",
  READY: "Rascunho",
  SCHEDULED: "Agendado",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicada",
  PARTIAL: "Publicada em parte",
  FAILED: "Falhou",
  SENDING: "Enviando",
  PAUSED: "Pausado",
  COMPLETED: "Concluído",
  CANCELED: "Cancelado",
  ACTIVE: "Ativo",
  OPEN: "Aberta",
  DONE: "Concluída",
};

export const eventStatusLabel = (event: PlannerEvent) =>
  event.type === "PLAN_ITEM" ? "Sugestão" : (statusLabel[event.status] ?? event.status);

/** Para onde o item leva no módulo dele. */
export const eventLink = (baseUrl: string, event: PlannerEvent): string | null => {
  switch (event.type) {
    case "SOCIAL_POST":
      return `${baseUrl}/posts/${event.id}`;
    case "WHATSAPP_BROADCAST":
      return `${baseUrl}/broadcasts/${event.id}`;
    case "EMAIL_CAMPAIGN":
      return `${baseUrl}/broadcasts/email/${event.id}`;
    case "AD_CAMPAIGN":
      return `${baseUrl}/ads?tab=campaigns`;
    case "AD_ACTIVATION":
      return `${baseUrl}/ads?tab=create`;
    case "CRM_TASK":
      return `${baseUrl}/crm?tab=tasks`;
    default:
      return null;
  }
};

/** Novo dia mantendo a hora do item; o que não tem hora fica ao meio-dia. */
export const moveToDay = (event: PlannerEvent, day: Date) => {
  const current = new Date(event.date);
  return event.allDay ? setMinutes(setHours(day, 12), 0) : setMinutes(setHours(day, current.getHours()), current.getMinutes());
};

export const eventTime = (event: PlannerEvent) => (event.allDay ? null : format(new Date(event.date), "HH:mm"));

export const plannerSelectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

export const plannerTextareaClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";
