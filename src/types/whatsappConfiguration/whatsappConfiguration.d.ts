type WhatsappConfiguration = {
  id: string;
  phoneNumber: string;
  phoneNumberId: string;
  webhookSecret: string;
  createdAt: string;
  updatedAt: string;
  enabled: boolean;
};

type WhatsappConfigurationWebhook = {
  // URL que efetivamente recebe os eventos do número (a mais específica entre número, conta e aplicativo)
  effectiveUrl: string | null;
  urls: {
    application: string | null;
    whatsappBusinessAccount: string | null;
    phoneNumber: string | null;
  };
};
