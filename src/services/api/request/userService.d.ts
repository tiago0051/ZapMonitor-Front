type LoginRequestData = {
  body: LoginRequestBody;
};

type LoginRequestBody = {
  email: string;
  password: string;
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
