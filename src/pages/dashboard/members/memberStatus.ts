export const memberStatusLabel: Record<MemberStatus, string> = {
  ACTIVE: "Ativo",
  INACTIVE: "Inativo",
  PENDING: "Convite pendente",
};

export const memberStatusVariant: Record<MemberStatus, "default" | "secondary" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  PENDING: "outline",
};
