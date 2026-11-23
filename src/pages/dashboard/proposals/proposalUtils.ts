export const proposalStatusInfo: Record<ProposalStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  PENDING_APPROVAL: { label: "Aguardando aprovação", className: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" },
  READY: { label: "Pronta", className: "bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300" },
  SENT: { label: "Enviada", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" },
  ACCEPTED: { label: "Aceita", className: "bg-green-100 text-green-800 dark:bg-green-950/50 dark:text-green-300" },
  DECLINED: { label: "Recusada", className: "bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300" },
  EXPIRED: { label: "Vencida", className: "bg-muted text-muted-foreground" },
};

export const sectionKindLabel: Record<ProposalSectionKind, string> = {
  CONTEXT: "O que entendemos",
  SOLUTION: "Solução",
  BENEFITS: "Benefícios",
  ITEMS: "Investimento (tabela de itens)",
  TIMELINE: "Prazos e etapas",
  PROOFS: "Provas e garantia",
  ABOUT: "Sobre a empresa",
  NEXT_STEPS: "Próximos passos",
  CUSTOM: "Livre",
};

export const isProposalLocked = (proposal: Pick<Proposal, "status">) => proposal.status === "ACCEPTED" || proposal.status === "DECLINED";

/** "Vista 3x, a última em 21/11 14:02" ou "Ainda não abriu". */
export const viewSummary = (proposal: Proposal) => {
  if (!proposal.sentAt) return null;
  if (!proposal.viewCount) return "Ainda não abriu";
  const last = proposal.lastViewedAt
    ? new Date(proposal.lastViewedAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })
    : "";
  return `Aberta ${proposal.viewCount}x${last ? `, a última em ${last}` : ""}`;
};
