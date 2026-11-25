type ProposalStatus = "DRAFT" | "PENDING_APPROVAL" | "READY" | "SENT" | "ACCEPTED" | "DECLINED" | "EXPIRED";
type ProposalSectionKind = "CONTEXT" | "SOLUTION" | "BENEFITS" | "ITEMS" | "TIMELINE" | "PROOFS" | "ABOUT" | "NEXT_STEPS" | "CUSTOM";
type ProposalPdfStatus = "NONE" | "RENDERING" | "READY" | "FAILED";
type ProposalDiscountApproval = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

type ProposalSection = { kind: ProposalSectionKind; title: string; body: string };

type ProposalItem = {
  offerId: string | null;
  name: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  billing: OfferBilling;
  total: number;
};

type Proposal = {
  id: string;
  dealId: string;
  dealTitle: string | null;
  number: number;
  title: string;
  status: ProposalStatus;
  customerName: string | null;
  customerCompany: string | null;
  customerEmail: string | null;
  sections: ProposalSection[];
  items: ProposalItem[];
  total: number;
  paymentTerms: string | null;
  terms: string | null;
  validUntil: string | null;
  // Valores em R$ no texto que não batem com os itens
  warnings: string[];
  discountApproval: ProposalDiscountApproval;
  version: number;
  pdfStatus: ProposalPdfStatus;
  pdfError: string | null;
  publicUrl: string;
  sentAt: string | null;
  sentVia: string | null;
  firstViewedAt: string | null;
  lastViewedAt: string | null;
  viewCount: number;
  acceptedAt: string | null;
  acceptedName: string | null;
  declinedAt: string | null;
  declineReason: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProposalUpdateBody = Partial<
  Pick<Proposal, "title" | "customerName" | "customerCompany" | "customerEmail" | "sections" | "paymentTerms" | "terms" | "validUntil">
> & { items?: Omit<ProposalItem, "total">[] };

type ProposalTemplateSection = { kind: ProposalSectionKind; title: string; instructions: string };

type ProposalTemplate = {
  id: string;
  name: string;
  isDefault: boolean;
  sections: ProposalTemplateSection[];
  terms: string | null;
  validityDays: number;
  accentColor: string | null;
};

type ProposalStats = {
  created: number;
  sent: number;
  accepted: number;
  declined: number;
  pendingApproval: number;
  acceptanceRate: number | null;
  acceptedValue: number;
  averageTicket: number | null;
  medianHoursToAccept: number | null;
  byOffer: { name: string; sent: number; accepted: number; value: number }[];
  byUser: { userId: string | null; userName: string | null; sent: number; accepted: number; value: number }[];
};

/** Proposta como o cliente vê (sem dados internos): página pública e prévia do painel. */
type ProposalView = {
  status: ProposalStatus;
  number: number;
  title: string;
  customerName: string | null;
  customerCompany: string | null;
  sections: ProposalSection[];
  items: Omit<ProposalItem, "offerId">[];
  total: number;
  paymentTerms: string | null;
  terms: string | null;
  validUntil: string | null;
  createdAt: string;
  acceptedAt: string | null;
  acceptedName: string | null;
  declinedAt: string | null;
  hasPdf: boolean;
  brand: { name: string; logoDataUri: string | null; accentColor: string };
};

type PublicProposalAcceptResult = "OK" | "INVALID" | "CLOSED" | "EXPIRED";
