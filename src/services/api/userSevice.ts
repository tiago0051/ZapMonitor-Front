import api from "./api";

export const userService = {
  register: async ({ body }: RegisterUserRequestData): Promise<void> => {
    await api.post("/user/register", body);
  },
  verifyEmail: async ({ body }: VerifyEmailRequestData): Promise<void> => {
    await api.post("/user/verify-email", body);
  },
  login: async ({ body }: LoginRequestData): Promise<void> => {
    await api.post("/user/auth/login", body);
  },
  refreshSession: async (): Promise<void> => {
    await api.post("/user/auth/refresh");
  },
  me: async (): Promise<User> => {
    const response = await api.get("/user/me");
    return response.data;
  },
  changePassword: async ({ body }: ChangePasswordRequestData): Promise<void> => {
    await api.put("/user/change-password", body);
  },
  forgotPassword: async ({ body }: ForgotPasswordRequestData): Promise<void> => {
    await api.post("/user/forgot-password", body);
  },
  resetPassword: async ({ body }: ResetPasswordRequestData): Promise<void> => {
    await api.post("/user/reset-password", body);
  },
  logout: async (): Promise<void> => {
    await api.post("/user/auth/logout");
  },
  checkInvitation: async ({ queries }: CheckInvitationRequestData): Promise<CheckInvitationResponseData> => {
    const response = await api.get("/user/accept-invitation", { params: queries });
    return response.data;
  },
  acceptInvitation: async ({ body }: AcceptInvitationRequestData): Promise<void> => {
    await api.post("/user/accept-invitation", body);
  },
};
