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
  userId?: string;
};

type FindDailyMessagesRequestData = {
  params: FindDailyMessagesRequestParams;
  queries: FindDailyMessagesRequestQueries;
};

type FindDailyMessagesRequestParams = {
  clientId: string;
};

type FindDailyMessagesRequestQueries = {
  year: number;
  month: number;
  userId?: string;
};
