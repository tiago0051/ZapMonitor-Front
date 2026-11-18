import { addDays, addHours, addWeeks, setHours, setMinutes, startOfMinute } from "date-fns";
import { CalendarCheck, Mail, MessageCircle, Phone, SquareCheckBig, type LucideIcon } from "lucide-react";

export const taskTypeLabel: Record<DealTaskType, string> = {
  CALL: "Ligar",
  MESSAGE: "Mensagem",
  MEETING: "Reunião",
  EMAIL: "E-mail",
  OTHER: "Outro",
};

export const taskTypeIcon: Record<DealTaskType, LucideIcon> = {
  CALL: Phone,
  MESSAGE: MessageCircle,
  MEETING: CalendarCheck,
  EMAIL: Mail,
  OTHER: SquareCheckBig,
};

export const TASK_TYPES = Object.keys(taskTypeLabel) as DealTaskType[];

const atNineAm = (date: Date) => setMinutes(setHours(date, 9), 0);

/**
 * Atalhos de "Adiar": 1 hora a partir de agora; amanhã e próxima semana às 9h. Contam a partir de agora, não do prazo,
 * porque quem adia uma tarefa atrasada quer vê-la de novo no futuro.
 */
export const snoozeOptions: { id: string; label: string; dueAt: () => Date }[] = [
  { id: "1h", label: "1 hora", dueAt: () => startOfMinute(addHours(new Date(), 1)) },
  { id: "tomorrow", label: "Amanhã às 9h", dueAt: () => atNineAm(addDays(new Date(), 1)) },
  { id: "nextWeek", label: "Próxima semana", dueAt: () => atNineAm(addWeeks(new Date(), 1)) },
];

// Link que abre a ficha do negócio no quadro do CRM
export const dealPath = (baseUrl: string, dealId: string) => `${baseUrl}/crm?tab=deals&dealId=${dealId}`;
