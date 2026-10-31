import { tenantRoleLabel } from "@/contants/permissionContants";

export const getMembershipRoleLabel = (membership: ImplanterUserMembership) =>
  membership.role === "CUSTOM" ? (membership.permissionGroupName ?? tenantRoleLabel.CUSTOM) : tenantRoleLabel[membership.role];
