import api from "./api";

export const userService = {
  login: async ({ body }: LoginRequestData): Promise<void> => {
    await api.post("/user/auth/login", body);
  },
  me: async (): Promise<User> => {
    const response = await api.get("/user/me");
    return response.data;
  },
  logout: async (): Promise<void> => {
    await api.post("/user/auth/logout");
  },
};
