type ManagementRequestParams = {
  clientId: string;
};

type ManagementPeriodQuery = {
  startDate: string;
  endDate: string;
};

type FindManagementInProgressRequestData = {
  params: ManagementRequestParams;
};

type FindManagementAttendedSummaryRequestData = {
  params: ManagementRequestParams;
  queries: ManagementPeriodQuery;
};

type FindManagementAttendedServicesRequestData = {
  params: ManagementRequestParams & { userId: string };
  queries: ManagementPeriodQuery & PaginateRequestQuery;
};
