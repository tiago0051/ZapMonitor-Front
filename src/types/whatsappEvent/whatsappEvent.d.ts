type WhatsappEvent = {
  id: string;
  eventType: number;
  payload: string;
};

type WhatsappEventToExecute = WhatsappEvent & {
  executed?: boolean;
};
