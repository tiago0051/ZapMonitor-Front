import api from "./api";

export const userService = {
  register: async ({ body }: RegisterUserRequestData): Promise<void> => {
    await api.post("/user/register", body);
  },
  verifyEmail: async ({ body }: VerifyEmailRequestData): Promise<void> => {
    await api.post("/user/verify-email", body);
  },
  login: async ({ body }: LoginRequestData): Promise<LoginResponse> => {
    const response = await api.post("/user/auth/login", body);
    return response.data || undefined;
  },
  refreshSession: async (): Promise<void> => {
    await api.post("/user/auth/refresh");
  },
  me: async (): Promise<User> => {
    const response = await api.get("/user/me");
    return response.data;
  },
  /** Apelido que aparece para os clientes; nulo volta ao primeiro nome. */
  updateProfile: async (body: { nickname: string | null }): Promise<User> => (await api.put("/user/profile", body)).data,
  changePassword: async ({ body }: ChangePasswordRequestData): Promise<void> => {
    await api.put("/user/change-password", body);
  },
  findTwoFactorStatus: async (): Promise<TwoFactorStatus> => (await api.get("/user/two-factor")).data,
  /** Gera a chave e o QR code; só passa a valer depois de confirmar um código do app. */
  startTwoFactorSetup: async (): Promise<TwoFactorSetup> => (await api.post("/user/two-factor/setup")).data,
  enableTwoFactor: async (code: string): Promise<{ recoveryCodes: string[] }> => (await api.post("/user/two-factor/enable", { code })).data,
  disableTwoFactor: async (body: { password: string; code: string }): Promise<void> => {
    await api.post("/user/two-factor/disable", body);
  },
  regenerateTwoFactorRecoveryCodes: async (code: string): Promise<{ recoveryCodes: string[] }> =>
    (await api.post("/user/two-factor/recovery-codes", { code })).data,
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
