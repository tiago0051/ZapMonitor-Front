import api from "./api";

const base = (clientId: string) => `/client/${clientId}/email-campaign`;

export const emailCampaignService = {
  findAll: async (
    clientId: string,
    queries: { page?: number; take?: number; status?: string },
  ): Promise<EmailCampaignPage<EmailCampaign>> => (await api.get(base(clientId), { params: queries })).data,

  findOne: async (clientId: string, id: string): Promise<EmailCampaign> => (await api.get(`${base(clientId)}/${id}`)).data,

  findRecipients: async (
    clientId: string,
    id: string,
    queries: { page?: number; take?: number; status?: string; search?: string },
  ): Promise<EmailCampaignPage<EmailCampaignRecipient>> => (await api.get(`${base(clientId)}/${id}/recipients`, { params: queries })).data,

  exportRecipients: async (clientId: string, id: string): Promise<Blob> =>
    (await api.get(`${base(clientId)}/${id}/export`, { responseType: "blob" })).data,

  options: async (clientId: string): Promise<EmailCampaignOptions> => (await api.get(`${base(clientId)}/options`)).data,

  preview: async (
    clientId: string,
    body: { templateId?: string; campaignId?: string; contactId?: string },
  ): Promise<{ subject: string; html: string }> => (await api.post(`${base(clientId)}/preview`, body)).data,

  findAudience: async (
    clientId: string,
    body: { categoryIds?: string[]; pipelineId?: string; stageIds?: string[]; allContacts?: boolean },
  ): Promise<{ contacts: EmailAudienceContact[]; suppressed: number }> => (await api.post(`${base(clientId)}/audience`, body)).data,

  create: async (
    clientId: string,
    body: {
      name: string;
      senderId: string;
      templateId: string;
      recipients: EmailCampaignRecipientInput[];
      sendWindow?: BroadcastSendWindow | null;
      frequencyCapDays?: number | null;
      clickPipelineId?: string | null;
      clickStageId?: string | null;
      consentConfirmed: boolean;
      start?: boolean;
      scheduledAt?: string;
    },
  ): Promise<EmailCampaign> => (await api.post(base(clientId), body)).data,

  action: async (clientId: string, id: string, action: "start" | "pause" | "cancel" | "unschedule"): Promise<EmailCampaign> =>
    (await api.post(`${base(clientId)}/${id}/${action}`)).data,

  schedule: async (clientId: string, id: string, scheduledAt: string): Promise<EmailCampaign> =>
    (await api.post(`${base(clientId)}/${id}/schedule`, { scheduledAt })).data,

  setSendWindow: async (clientId: string, id: string, sendWindow: BroadcastSendWindow | null): Promise<EmailCampaign> =>
    (await api.put(`${base(clientId)}/${id}/send-window`, { sendWindow })).data,

  remove: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },
};
