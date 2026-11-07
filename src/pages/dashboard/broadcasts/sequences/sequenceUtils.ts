export const enrollmentStatusInfo: Record<EmailEnrollmentStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Em andamento", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  COMPLETED: { label: "Terminou", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
  STOPPED: { label: "Saiu", className: "bg-muted text-muted-foreground" },
};

export const stopReasonLabel: Record<string, string> = {
  REPLIED: "respondeu no WhatsApp",
  DEAL_WON: "ganhou um negócio",
  UNSUBSCRIBED: "se descadastrou ou o e-mail voltou",
  NO_EMAIL: "ficou sem e-mail na ficha",
  MANUAL: "tirada da sequência",
};

export type DelayUnit = "minutes" | "hours" | "days";

export const delayUnits: { value: DelayUnit; label: string; minutes: number }[] = [
  { value: "minutes", label: "minutos", minutes: 1 },
  { value: "hours", label: "horas", minutes: 60 },
  { value: "days", label: "dias", minutes: 1440 },
];

/** Maior unidade que divide a espera sem resto, para mostrar 2 dias em vez de 2880 minutos. */
export const splitDelay = (minutes: number): { amount: number; unit: DelayUnit } => {
  if (minutes > 0 && minutes % 1440 === 0) return { amount: minutes / 1440, unit: "days" };
  if (minutes > 0 && minutes % 60 === 0) return { amount: minutes / 60, unit: "hours" };
  return { amount: minutes, unit: "minutes" };
};

export const describeDelay = (minutes: number, first: boolean) => {
  if (minutes === 0) return first ? "Logo ao entrar" : "Logo depois do anterior";
  const { amount, unit } = splitDelay(minutes);
  const label = {
    minutes: amount === 1 ? "minuto" : "minutos",
    hours: amount === 1 ? "hora" : "horas",
    days: amount === 1 ? "dia" : "dias",
  }[unit];
  return `${amount} ${label} ${first ? "depois de entrar" : "depois do anterior"}`;
};
