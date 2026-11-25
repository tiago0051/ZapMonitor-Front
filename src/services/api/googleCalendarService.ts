import api from "./api";

export const googleCalendarService = {
  findConnection: async ({ params }: GoogleCalendarClientRequestData): Promise<GoogleCalendarConnection> => {
    const response = await api.get<GoogleCalendarConnection>(`/client/${params.clientId}/google-calendar/connection`);
    return response.data;
  },

  connect: async ({ params, body }: ConnectGoogleCalendarRequestData): Promise<GoogleCalendarConnection> => {
    const response = await api.post<GoogleCalendarConnection>(`/client/${params.clientId}/google-calendar/connection`, body);
    return response.data;
  },

  disconnect: async ({ params }: GoogleCalendarClientRequestData): Promise<void> => {
    await api.delete(`/client/${params.clientId}/google-calendar/connection`);
  },

  findCalendars: async ({ params }: GoogleCalendarClientRequestData): Promise<GoogleCalendarItem[]> => {
    const response = await api.get<GoogleCalendarItem[]>(`/client/${params.clientId}/google-calendar/calendars`);
    return response.data;
  },

  findAgentTool: async ({ params }: FindGoogleCalendarToolRequestData): Promise<GoogleCalendarTool> => {
    const response = await api.get<GoogleCalendarTool>(`/client/${params.clientId}/ai-agent/${params.aiAgentId}/tool/google-calendar`);
    return response.data;
  },

  saveAgentTool: async ({ params, body }: SaveGoogleCalendarToolRequestData): Promise<GoogleCalendarTool> => {
    const response = await api.put<GoogleCalendarTool>(
      `/client/${params.clientId}/ai-agent/${params.aiAgentId}/tool/google-calendar`,
      body,
    );
    return response.data;
  },

  findReminderSettings: async ({ params }: GoogleCalendarClientRequestData): Promise<AppointmentReminderSettings> => {
    const response = await api.get<AppointmentReminderSettings>(`/client/${params.clientId}/google-calendar/reminders/settings`);
    return response.data;
  },

  saveReminderSettings: async ({
    params,
    body,
  }: GoogleCalendarClientRequestData & { body: AppointmentReminderSettings }): Promise<AppointmentReminderSettings> => {
    const response = await api.put<AppointmentReminderSettings>(`/client/${params.clientId}/google-calendar/reminders/settings`, body);
    return response.data;
  },

  findReminders: async ({ params }: GoogleCalendarClientRequestData): Promise<AppointmentReminder[]> => {
    const response = await api.get<AppointmentReminder[]>(`/client/${params.clientId}/google-calendar/reminders`);
    return response.data;
  },

  /** Cria na Meta o modelo de lembrete sugerido (Utilidade, com Confirmar/Remarcar) e já o deixa escolhido. */
  createReminderTemplate: async ({
    params,
    body,
  }: GoogleCalendarClientRequestData & { body: { configurationId: string; askConfirmation: boolean } }): Promise<WhatsappTemplate> => {
    const response = await api.post<WhatsappTemplate>(`/client/${params.clientId}/google-calendar/reminders/template`, body);
    return response.data;
  },

  // ---------- Agendamento manual na conversa ----------

  appointmentOptions: async (clientId: string): Promise<ContactAppointmentOptions> =>
    (await api.get(`/client/${clientId}/whatsapp/appointment-options`)).data,

  findContactAppointments: async (clientId: string, contactId: string): Promise<ContactAppointment[]> =>
    (await api.get(`/client/${clientId}/whatsapp/contact/${contactId}/appointments`)).data,

  createContactAppointment: async (clientId: string, contactId: string, body: CreateContactAppointmentBody): Promise<ContactAppointment> =>
    (await api.post(`/client/${clientId}/whatsapp/contact/${contactId}/appointments`, body)).data,

  cancelContactAppointment: async (clientId: string, contactId: string, appointmentId: string): Promise<void> => {
    await api.delete(`/client/${clientId}/whatsapp/contact/${contactId}/appointments/${appointmentId}`);
  },
};
