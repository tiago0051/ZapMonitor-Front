type ContactPhone = {
  id: string;
  // Formatado: +55 21 98086 2828
  phoneNumber: string;
  label: string | null;
  isPrimary: boolean;
};

type ContactEmail = {
  id: string;
  email: string;
  isPrimary: boolean;
  // Quando o e-mail voltou
  invalidAt: string | null;
};

type ContactListItem = {
  id: string;
  name: string | null;
  // Telefone e e-mail principais
  phone: string | null;
  email: string | null;
  phoneCount: number;
  emailCount: number;
  dealCount: number;
  createdAt: string;
};

// Conversa de WhatsApp de um telefone da ficha (o id é o do contato no atendimento)
type ContactConversation = {
  id: string;
  phoneNumber: string;
  whatsappName: string | null;
  lastWhatsappServiceStatus: number | null;
  lastServiceRepresentative: string | null;
  lastMessageAt: string | null;
};

type ContactDeal = {
  id: string;
  title: string;
  status: DealStatus;
  value: number | null;
  pipelineName: string;
  stageName: string;
  updatedAt: string;
};

type ContactDetail = {
  id: string;
  name: string | null;
  document: string | null;
  notes: string | null;
  // Valores dos campos da ficha por id do campo
  customFields: Record<string, string | number>;
  phones: ContactPhone[];
  emails: ContactEmail[];
  conversations: ContactConversation[];
  deals: ContactDeal[];
  // Outras fichas com o mesmo nome, candidatas a mesclar
  sameName: ContactListItem[];
  // Outras fichas com o mesmo e-mail ou telefone, todas com conversa (ficha só de lead é juntada sozinha)
  mergeSuggestions: ContactMergeSuggestion[];
  createdAt: string;
  updatedAt: string;
};

type ContactMergeSuggestion = {
  id: string;
  reason: "EMAIL" | "PHONE";
  sharedValue: string;
  // De onde veio o dado: LEAD_FORM, AI ou API
  source: string;
  other: ContactListItem;
};

type ContactPage = {
  total: number;
  page: number;
  take: number;
  items: ContactListItem[];
};
