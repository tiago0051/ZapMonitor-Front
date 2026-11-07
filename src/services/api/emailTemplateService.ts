import { BlockBlobClient } from "@azure/storage-blob";
import api from "./api";

const base = (clientId: string) => `/client/${clientId}/email-template`;

type TemplateContent = { name: string; subject: string; preheader?: string | null; blocks: EmailBlock[] };

export const emailTemplateService = {
  findAll: async (clientId: string): Promise<EmailTemplateSummary[]> => (await api.get(base(clientId))).data,

  findOne: async (clientId: string, id: string): Promise<EmailTemplate> => (await api.get(`${base(clientId)}/${id}`)).data,

  starters: async (clientId: string): Promise<EmailTemplateStarter[]> => (await api.get(`${base(clientId)}/starter`)).data,

  variables: async (clientId: string): Promise<EmailTemplateVariable[]> => (await api.get(`${base(clientId)}/variable`)).data,

  create: async (clientId: string, body: { name: string; starterKey?: string }): Promise<EmailTemplate> =>
    (await api.post(base(clientId), body)).data,

  update: async (clientId: string, id: string, body: TemplateContent): Promise<EmailTemplate> =>
    (await api.put(`${base(clientId)}/${id}`, body)).data,

  duplicate: async (clientId: string, id: string): Promise<EmailTemplate> => (await api.post(`${base(clientId)}/${id}/duplicate`)).data,

  remove: async (clientId: string, id: string): Promise<void> => {
    await api.delete(`${base(clientId)}/${id}`);
  },

  // HTML com a identidade do cliente; com contactId, as variáveis vêm com os dados da ficha
  preview: async (clientId: string, body: TemplateContent & { contactId?: string }): Promise<{ subject: string; html: string }> =>
    (await api.post(`${base(clientId)}/preview`, body)).data,

  sendTest: async (clientId: string, body: TemplateContent & { senderId: string; to: string; contactId?: string }): Promise<void> => {
    await api.post(`${base(clientId)}/test`, body);
  },

  findBrand: async (clientId: string): Promise<EmailBrand> => (await api.get(`${base(clientId)}/brand`)).data,

  saveBrand: async (
    clientId: string,
    body: { logoAssetId: string | null; primaryColor: string; backgroundColor: string; footerText: string | null },
  ): Promise<EmailBrand> => (await api.put(`${base(clientId)}/brand`, body)).data,

  /** Envia a imagem para o armazenamento e devolve o endereço público dela, que não expira. */
  uploadImage: async (clientId: string, file: File): Promise<{ assetId: string; url: string }> => {
    const { uploadUrl, assetId, url } = (
      await api.post(`${base(clientId)}/asset/upload-url`, { fileName: file.name, mimeType: file.type, fileSize: file.size })
    ).data as { uploadUrl: string; assetId: string; url: string };

    await new BlockBlobClient(uploadUrl).uploadData(file, { blobHTTPHeaders: { blobContentType: file.type } });

    return { assetId, url };
  },
};
