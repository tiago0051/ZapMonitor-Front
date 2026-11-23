type SalesAlertKind = "WAITING_REPLY" | "HANDOFF" | "QUALIFIED_NO_PROPOSAL" | "PROPOSAL_DRAFT" | "PROPOSAL_VIEWED" | "HOT_NO_NEXT_STEP";

/** Alerta-chave da conversa, por regra (sem IA). */
type SalesAlert = { kind: SalesAlertKind; severity: "HIGH" | "MEDIUM"; dealId: string | null; message: string };

/** Dica sob demanda: em que pé a conversa está e a próxima mensagem. */
type SalesTip = { situation: string; nextStep: string; message: string; why: string };

/** Análise de um atendimento feito por uma pessoa. */
type ServiceCoaching = {
  id: string;
  whatsappServiceId: string;
  whatsappContactId: string;
  userId: string;
  score: number;
  summary: string;
  strengths: string[];
  improvements: string[];
  missedOpportunity: string | null;
  suggestedMessage: string | null;
  createdAt: string;
};

type TeamCoachingEntry = {
  userId: string;
  name: string;
  services: number;
  avgScore: number;
  // Nota da metade mais recente menos a da mais antiga; nula com poucos atendimentos
  trend: number | null;
  topImprovements: { text: string; count: number }[];
  topStrengths: { text: string; count: number }[];
};

type TeamCoachingReport = {
  days: number;
  since: string;
  // Quem vê a gestão vê a equipe; os demais, só os próprios
  everyone: boolean;
  entries: TeamCoachingEntry[];
  recent: {
    id: string;
    userId: string;
    name: string;
    whatsappContactId: string;
    score: number;
    summary: string;
    improvements: string[];
    createdAt: string;
  }[];
};
