type MonthlyReport = {
  current: Current;
  variation: Variation;
};

type Current = {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalMessages: number;
  servicesWithHumanAttendance: number;
  totalServices: number;
  humanAttendancePercentage: number;
};

type Variation = {
  totalMessagesSentPercentage: number;
  totalMessagesReceivedPercentage: number;
  totalMessagesPercentage: number;
  humanAttendancePercentage: number;
  totalServicesPercentage: number;
};
