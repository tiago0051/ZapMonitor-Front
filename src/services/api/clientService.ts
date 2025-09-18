import api from "./api";

export const clientService = {
  findAll: async (): Promise<Client[]> => {
    const response = await api.get("/client");

    return response.data;
  },
  findById: async ({ params }: FindClientByIdRequestData): Promise<Client> => {
    const response = await api.get(`/client/${params.clientId}`);
    return response.data;
  },
  create: async ({
    body,
  }: CreateClientRequestData): Promise<CreateClientResponseData> => {
    const response = await api.post("/client", body);
    return response.data;
  },
  generateNewSecret: async ({
    params,
  }: GenerateNewSecretRequestData): Promise<string> => {
    const response = await api.put(`/client/${params.clientId}/secret`);
    return response.data;
  },
};
