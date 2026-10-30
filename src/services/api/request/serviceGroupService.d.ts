type FindAllServiceGroupsRequestData = {
  params: FindAllServiceGroupsRequestParams;
};

type FindAllServiceGroupsRequestParams = {
  clientId: string;
};

type SaveServiceGroupRequestBody = {
  name: string;
  userIds: string[];
  whatsappConfigurationIds: string[];
};

type CreateServiceGroupRequestData = {
  params: CreateServiceGroupRequestParams;
  body: SaveServiceGroupRequestBody;
};

type CreateServiceGroupRequestParams = {
  clientId: string;
};

type UpdateServiceGroupRequestData = {
  params: UpdateServiceGroupRequestParams;
  body: SaveServiceGroupRequestBody;
};

type UpdateServiceGroupRequestParams = {
  clientId: string;
  serviceGroupId: string;
};

type DeleteServiceGroupRequestData = {
  params: DeleteServiceGroupRequestParams;
};

type DeleteServiceGroupRequestParams = {
  clientId: string;
  serviceGroupId: string;
};
