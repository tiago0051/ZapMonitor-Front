type TenantRole = "IMPLANTER" | "ADMIN" | "SUPERVISOR" | "ATTENDANT" | "CUSTOM";

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
  | "api.manage"
  | "crm.view"
  | "crm.viewAll"
  | "crm.manage"
  | "ads.view"
  | "ads.manage"
  | "ads.approve";

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
  // O plano do tenant inclui o módulo CRM
  crmEnabled: boolean;
  // O plano do tenant inclui o módulo de anúncios
  adsEnabled: boolean;
  // Vencimento do plano, para o aviso dos últimos dias
  plan?: PlanStatus;
};
