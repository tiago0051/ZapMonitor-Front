import api from "./api";

export const userService = {
  login: async ({ body }: LoginRequestData): Promise<LoginResponseData> => {
    const response = await api.post("/user/login", body);
    return response.data;
  },
};
