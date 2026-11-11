import api from "./api";

type ClientParams = { clientId: string };
type CallParams = ClientParams & { callId: string };
type ContactCallParams = ClientParams & { contactId: string; configurationId: string };

/** Ligações pelo WhatsApp: o áudio vai pelo navegador (WebRTC); aqui passam só a oferta e a resposta de áudio. */
export const whatsappCallService = {
  findRingingCalls: async ({ params }: { params: ClientParams }): Promise<WhatsappIncomingCall[]> => {
    const response = await api.get(`/client/${params.clientId}/whatsapp/call/ringing`);
    return response.data;
  },
  acceptCall: async ({ params, body }: { params: CallParams; body: { sdp: string } }): Promise<WhatsappCall> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/call/${params.callId}/accept`, body);
    return response.data;
  },
  terminateCall: async ({ params }: { params: CallParams }): Promise<WhatsappCall> => {
    const response = await api.post(`/client/${params.clientId}/whatsapp/call/${params.callId}/terminate`);
    return response.data;
  },
  findAvailability: async ({ params }: { params: ContactCallParams }): Promise<WhatsappCallAvailability> => {
    const response = await api.get(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/call/availability`,
    );
    return response.data;
  },
  startCall: async ({ params, body }: { params: ContactCallParams; body: { sdp: string } }): Promise<WhatsappCall> => {
    const response = await api.post(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/call`,
      body,
    );
    return response.data;
  },
  requestPermission: async ({ params }: { params: ContactCallParams }): Promise<void> => {
    await api.post(
      `/client/${params.clientId}/whatsapp/contact/${params.contactId}/configuration/${params.configurationId}/call/permission-request`,
    );
  },
  updateCalling: async ({
    params,
    body,
  }: {
    params: ClientParams & { configurationId: string };
    body: { enabled: boolean };
  }): Promise<{ callingEnabled: boolean }> => {
    const response = await api.put(`/client/${params.clientId}/whatsapp/configuration/${params.configurationId}/calling`, body);
    return response.data;
  },
};
