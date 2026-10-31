type FindAllImplanterUsersRequestData = {
  queries: FindAllImplanterUsersRequestQuery;
};

type FindAllImplanterUsersRequestQuery = PaginateRequestQuery & {
  search?: string;
  clientId?: string;
};

type UpdateImplanterUserRequestData = {
  params: UpdateImplanterUserRequestParams;
  body: UpdateImplanterUserRequestBody;
};

type UpdateImplanterUserRequestParams = {
  userId: string;
};

type UpdateImplanterUserRequestBody = {
  name: string;
  email: string;
};

type SendImplanterUserPasswordResetRequestData = {
  params: SendImplanterUserPasswordResetRequestParams;
};

type SendImplanterUserPasswordResetRequestParams = {
  userId: string;
};
