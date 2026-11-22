export { selectClassName, textareaClassName } from "../strategies/strategyUtils";

export const offerKindLabel: Record<OfferKind, string> = {
  PRODUCT: "Produto",
  SERVICE: "Serviço",
  PLAN: "Plano",
};

export const offerBillingLabel: Record<OfferBilling, string> = {
  ONE_TIME: "Pagamento único",
  MONTHLY: "Por mês",
  YEARLY: "Por ano",
};

const billingSuffix: Record<OfferBilling, string> = { ONE_TIME: "", MONTHLY: "/mês", YEARLY: "/ano" };

export const formatMoney = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const formatOfferPrice = (offer: Pick<OfferData, "price" | "billing">) =>
  offer.price === null ? "Sob consulta" : `${formatMoney(offer.price)}${billingSuffix[offer.billing]}`;

export const emptyOffer = (): OfferData => ({
  name: "",
  kind: "PRODUCT",
  summary: null,
  description: null,
  price: null,
  billing: "ONE_TIME",
  paymentTerms: null,
  maxDiscountPercent: null,
  audience: null,
  pains: [],
  benefits: [],
  differentiators: [],
  proofs: [],
  restrictions: [],
  objections: [],
  guarantee: null,
  url: null,
});

export const toOfferData = (offer: OfferData): OfferData => ({
  name: offer.name,
  kind: offer.kind,
  summary: offer.summary,
  description: offer.description,
  price: offer.price,
  billing: offer.billing,
  paymentTerms: offer.paymentTerms,
  maxDiscountPercent: offer.maxDiscountPercent,
  audience: offer.audience,
  pains: offer.pains,
  benefits: offer.benefits,
  differentiators: offer.differentiators,
  proofs: offer.proofs,
  restrictions: offer.restrictions,
  objections: offer.objections,
  guarantee: offer.guarantee,
  url: offer.url,
});

/** "1.234,56", "1234.56" ou vazio → número ou nulo; NaN quando não dá para ler. */
export const parseDecimal = (raw: string): number | null => {
  const text = raw.trim();
  if (!text) return null;
  const normalized = text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text;
  return Number(normalized);
};

export const coherencePlaceLabel: Record<OfferCoherencePlace, string> = {
  AI_AGENT: "Agente de IA",
  POST: "Postagem",
  TEMPLATE: "Modelo do WhatsApp",
  STRATEGY: "Estratégia",
};

export const severityInfo: Record<OfferCoherenceIssue["severity"], { label: string; className: string }> = {
  HIGH: { label: "Grave", className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
  MEDIUM: { label: "Atenção", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  LOW: { label: "Leve", className: "bg-muted text-muted-foreground" },
};
