type WhatsappServiceHistory = {
  id: string;
  finished: boolean;
  createdAt: string;
  actions: WhatsappServiceAction[];
  aiResume?: string | null;
};
