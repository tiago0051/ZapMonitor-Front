type TenantRole = "IMPLANTER" | "ADMIN" | "ATTENDANT" | "CUSTOM";

type Permission =
  | "whatsapp.chat"
  | "email.view"
  | "reports.view"
  | "members.manage"
  | "management.view"
  | "permissionGroups.manage"
  | "flows.manage"
  | "serviceGroups.manage"
  | "aiAgents.manage"
  | "templates.manage"
  | "categories.manage"
  | "channels.manage"
  | "aiConfig.manage"
  | "api.manage";

type PermissionDefinition = {
  key: Permission;
  module: string;
  label: string;
  description: string;
  implanterOnly: boolean;
};

type PermissionGroup = {
  id: string;
  name: string;
  description: string | null;
  permissions: Permission[];
  memberCount: number;
  createdAt: string;
  updatedAt: string;
};

type TenantAccess = {
  role: TenantRole;
  permissionGroupId: string | null;
  permissionGroupName: string | null;
  permissions: Permission[];
};
