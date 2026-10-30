import { tenantRoleLabel } from "@/contants/permissionContants";

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

export const getMemberRoleLabel = (member: Member) =>
  member.role === "CUSTOM" ? (member.permissionGroupName ?? tenantRoleLabel.CUSTOM) : tenantRoleLabel[member.role];
