type FindAllEmailsRequestData = {
  query: PaginateRequestQuery & { search?: string };
  params: FindAllEmailsRequestParams;
};

type FindAllEmailsRequestParams = {
  clientId: string;
};
