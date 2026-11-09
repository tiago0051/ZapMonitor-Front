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
