type WhatsappPerformanceSummary = {
  received: number;
  sentByAttendants: number;
  // Fluxos, agentes de IA e campanhas
  sentAutomated: number;
  services: number;
  servicesWithAttendant: number;
  servicesFinished: number;
  // Média de segundos entre o início do atendimento e um atendente assumir
  avgSecondsToAttendant: number | null;
};

type WhatsappPerformanceDay = {
  // yyyy-MM-dd no horário local
  date: string;
  received: number;
  sentByAttendants: number;
  sentAutomated: number;
  services: number;
  servicesWithAttendant: number;
};

type WhatsappPerformanceAttendant = {
  userId: string;
  name: string;
  active: boolean;
  sentMessages: number;
  services: number;
};

type WhatsappPerformance = {
  summary: WhatsappPerformanceSummary;
  // Mesmos totais no período anterior de mesma duração
  previous: WhatsappPerformanceSummary;
  previousPeriod: { startDate: string; endDate: string };
  daily: WhatsappPerformanceDay[];
  hourly: { hour: number; received: number }[];
  attendants: WhatsappPerformanceAttendant[];
};
