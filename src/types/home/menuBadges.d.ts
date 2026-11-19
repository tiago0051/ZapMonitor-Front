// Contadores do menu lateral; nulo no que o usuário não vê ou o plano não inclui
type MenuBadges = {
  queueWaiting: number | null;
  plannerTasksDue: number | null;
  crmTasksDue: number | null;
  adsApprovals: number | null;
  postsApprovals: number | null;
};
