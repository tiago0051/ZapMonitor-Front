type TEvent = {
  id: string;
  eventType: number;
  payload: string;
};

type TEventToExecute = TEvent & {
  executed?: boolean;
};
