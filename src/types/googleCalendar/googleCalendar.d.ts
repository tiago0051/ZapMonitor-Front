type GoogleCalendarConnection = {
  // Login com o Google configurado no servidor
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  // CONNECTED ou REVOKED (o Google recusou o acesso e é preciso conectar de novo)
  status: "CONNECTED" | "REVOKED" | null;
  connectedAt: string | null;
};

type GoogleCalendarItem = {
  id: string;
  summary: string;
  primary: boolean;
  timeZone: string | null;
};

// Intervalo de atendimento num dia da semana (0 = domingo), "HH:mm"
type WeeklyInterval = {
  weekday: number;
  start: string;
  end: string;
};

type GoogleCalendarToolRules = {
  calendarId: string;
  timeZone: string;
  weeklyHours: WeeklyInterval[];
  sessionMinutes: number;
  bufferMinutes: number;
  minNoticeHours: number;
  maxDaysAhead: number;
  changeMinNoticeHours: number;
  maxFutureAppointmentsPerContact: number;
  eventTitle: string;
};

type GoogleCalendarTool = {
  enabled: boolean;
  rules: GoogleCalendarToolRules;
  connection: GoogleCalendarConnection;
  calendars: GoogleCalendarItem[];
};

/** Dado do agendamento que preenche uma variável do modelo de lembrete */
type AppointmentReminderVariableSource = "contact_name" | "date" | "time" | "weekday_date" | "title";

type AppointmentReminderSettings = {
  enabled: boolean;
  whatsappConfigurationId: string | null;
  calendarIds: string[];
  /** Antecedências em minutos, ex.: [1440, 120] */
  offsetsMinutes: number[];
  includeManualEvents: boolean;
  askConfirmation: boolean;
  templateId: string | null;
  /** { "body.1": "contact_name" } */
  templateVariables: Record<string, string> | null;
  /** Texto livre com {nome}, {data}, {hora}, {dia_semana} e {titulo} */
  message: string;
  timeZone: string;
};

type AppointmentReminder = {
  id: string;
  googleEventId: string;
  eventStartAt: string;
  eventTitle: string | null;
  offsetMinutes: number;
  contactId: string | null;
  phoneNumber: string | null;
  status: "SENT" | "FAILED" | "SKIPPED";
  skipReason: "NO_PHONE" | "NO_TEMPLATE" | "SUPERSEDED" | "CANCELED" | null;
  errorMessage: string | null;
  sentAt: string | null;
  response: "CONFIRMED" | "RESCHEDULE" | null;
  respondedAt: string | null;
};
