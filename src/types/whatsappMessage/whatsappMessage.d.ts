type WhatsappMessage<C = unknown> = {
  id: string;
  content: C;
  contentType: string;
  type: number;
  status: number;
  userName: string;
  createdAt: string;
};
