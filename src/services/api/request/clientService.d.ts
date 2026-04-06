type FindClientByIdRequestData = {
  params: FindClientByIdRequestParams;
};

type FindClientByIdRequestParams = {
  clientId: string;
};

type CreateClientRequestData = {
  body: CreateClientRequestBody;
};

type CreateClientRequestBody = {
  name: string;
};

type GenerateNewSecretRequestData = {
  params: GenerateNewSecretRequestParams;
};

type GenerateNewSecretRequestParams = {
  clientId: string;
};

type FindUsersRequestData = {
  params: FindUsersRequestParams;
};

type FindUsersRequestParams = {
  clientId: string;
};
