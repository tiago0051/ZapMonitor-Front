export const billingSuffix: Record<OfferBilling, string> = { ONE_TIME: "", MONTHLY: "/mês", YEARLY: "/ano" };
export const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const formatProposalDate = (value: string) => new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
