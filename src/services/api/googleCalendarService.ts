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
};
