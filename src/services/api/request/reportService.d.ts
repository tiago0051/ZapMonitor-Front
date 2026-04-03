type FindMonthlyReportRequestData = {
  params: FindMonthlyReportRequestParams;
  queries: FindMonthlyReportRequestQueries;
};

type FindMonthlyReportRequestParams = {
  clientId: string;
};

type FindMonthlyReportRequestQueries = {
  year: number;
  month: number;
};
