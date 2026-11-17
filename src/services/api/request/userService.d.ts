type LoginRequestData = {
  body: LoginRequestBody;
};

type LoginRequestBody = {
  email: string;
  password: string;
  // Código do app autenticador ou de recuperação, quando a verificação em duas etapas está ativa
  code?: string;
};

// Senha certa, mas falta o código do app autenticador
type LoginResponse = { twoFactorRequired?: boolean } | undefined;

type TwoFactorStatus = {
  enabled: boolean;
  enabledAt: string | null;
  recoveryCodesLeft: number;
};

type TwoFactorSetup = {
  // Chave para digitar no app quando não der para ler o QR code
  secret: string;
  otpauthUrl: string;
  // QR code em data URL (PNG)
  qrCode: string;
};

type RegisterUserRequestData = {
  body: RegisterUserRequestBody;
};

type RegisterUserRequestBody = {
  name: string;
  email: string;
  password: string;
};

type VerifyEmailRequestData = {
  body: VerifyEmailRequestBody;
};

type VerifyEmailRequestBody = {
  token: string;
};

type ChangePasswordRequestData = {
  body: ChangePasswordRequestBody;
};

type ChangePasswordRequestBody = {
  currentPassword: string;
  newPassword: string;
};

type ForgotPasswordRequestData = {
  body: ForgotPasswordRequestBody;
};

type ForgotPasswordRequestBody = {
  email: string;
};

type ResetPasswordRequestData = {
  body: ResetPasswordRequestBody;
};

type ResetPasswordRequestBody = {
  token: string;
  newPassword: string;
};

type CheckInvitationRequestData = {
  queries: CheckInvitationRequestQuery;
};

type CheckInvitationRequestQuery = {
  token: string;
};

type CheckInvitationResponseData = {
  valid: boolean;
  hasAccount?: boolean;
};

type AcceptInvitationRequestData = {
  body: AcceptInvitationRequestBody;
};

type AcceptInvitationRequestBody = {
  token: string;
  name?: string;
  password?: string;
};
