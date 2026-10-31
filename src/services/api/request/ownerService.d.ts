type OwnerPeriodRequestQuery = {
  startDate: string;
  endDate: string;
};

type FindOwnerImplantersRequestData = {
  queries: OwnerPeriodRequestQuery;
};

type FindOwnerClientsRequestData = {
  queries: FindOwnerClientsRequestQuery;
};

type FindOwnerClientsRequestQuery = PaginateRequestQuery &
  OwnerPeriodRequestQuery & {
    search?: string;
    // Id do implantador ou "none" para tenants sem responsável
    implanterUserId?: string;
  };

type SearchOwnerUsersRequestData = {
  queries: SearchOwnerUsersRequestQuery;
};

type SearchOwnerUsersRequestQuery = {
  search?: string;
};

type ChangeClientImplanterRequestData = {
  params: ChangeClientImplanterRequestParams;
  body: ChangeClientImplanterRequestBody;
};

type ChangeClientImplanterRequestParams = {
  clientId: string;
};

type ChangeClientImplanterRequestBody = {
  implanterUserId: string;
};
