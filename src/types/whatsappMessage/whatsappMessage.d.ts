type WhatsappMessage<C = unknown> = {
  id: string;
  content: C;
  transcribedContent?: string | null;
  contentType: string;
  type: number;
  status: number;
  userName: string;
  createdAt: string;
};
