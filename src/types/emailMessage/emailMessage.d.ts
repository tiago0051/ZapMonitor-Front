type EmailMessage = {
  id: string;
  emailContentId: string;
  emailTo: string;
  sendAt: string | null;
  clientName: string;
  // Motivo quando o e-mail não saiu
  error: string | null;
};
