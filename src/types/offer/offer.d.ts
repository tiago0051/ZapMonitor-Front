type OfferKind = "PRODUCT" | "SERVICE" | "PLAN";
type OfferStatus = "ACTIVE" | "ARCHIVED";
type OfferBilling = "ONE_TIME" | "MONTHLY" | "YEARLY";

type OfferObjection = { objection: string; answer: string };

/** O que descobrir na conversa para o lead contar como qualificado; id vazio em critério novo (o back gera). */
type OfferQualificationCriterion = { id?: string; label: string; question: string | null; weight: number; required: boolean };

/** Campos do cadastro; também é o rascunho que a IA devolve. */
type OfferData = {
  name: string;
  kind: OfferKind;
  summary: string | null;
  description: string | null;
  price: number | null;
  billing: OfferBilling;
  paymentTerms: string | null;
  maxDiscountPercent: number | null;
  audience: string | null;
  pains: string[];
  benefits: string[];
  differentiators: string[];
  proofs: string[];
  restrictions: string[];
  objections: OfferObjection[];
  guarantee: string | null;
  url: string | null;
  qualificationCriteria: OfferQualificationCriterion[];
  // 0 a 100; nulo = 70
  qualificationMinScore: number | null;
};

type Offer = OfferData & {
  id: string;
  status: OfferStatus;
  version: number;
  updatedAt: string;
};

type OfferDetail = Offer & {
  usage: { aiAgents: number; openDeals: number; strategies: number };
};

type OfferCoherencePlace = "AI_AGENT" | "POST" | "TEMPLATE" | "STRATEGY";

type OfferCoherenceIssue = {
  place: OfferCoherencePlace;
  objectId: string;
  name: string;
  problem: string;
  suggestion: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
};

type OfferCoherence = { summary: string; issues: OfferCoherenceIssue[]; checked: number };

type DealItem = {
  id: string;
  offerId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  billing: OfferBilling;
  total: number;
};

type DealItemInput = {
  offerId?: string | null;
  name?: string | null;
  quantity: number;
  unitPrice?: number | null;
  discountPercent?: number | null;
};

type DealItems = { items: DealItem[]; total: number | null };
