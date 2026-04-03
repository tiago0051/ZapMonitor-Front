type DailyMessage = {
  id: number;
  day: string;
  sent: number;
  received: number;
};

type DailyMessagesResponse = {
  data: DailyMessage[];
};
