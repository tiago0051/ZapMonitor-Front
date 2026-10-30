import z from "zod";

export const memberRoleShape = {
  role: z.enum(["IMPLANTER", "ADMIN", "ATTENDANT", "CUSTOM"]),
  permissionGroupId: z.string(),
};

export const refineMemberRole = (data: { role: TenantRole; permissionGroupId: string }, context: z.RefinementCtx) => {
  if (data.role === "CUSTOM" && !data.permissionGroupId)
    context.addIssue({ code: "custom", message: "Selecione o grupo de permissão", path: ["permissionGroupId"] });
};
