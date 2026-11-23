type MemberStatus = "ACTIVE" | "INACTIVE" | "PENDING";

type Member = {
  id: string;
  name: string | null;
  email: string;
  status: MemberStatus;
  role: TenantRole;
  permissionGroupId: string | null;
  permissionGroupName: string | null;
  createdAt: string;
  // Verificação em duas etapas ativa
  twoFactorEnabled?: boolean;
};

type AuditEntityType =
  "FLOW" | "AI_AGENT" | "SERVICE_GROUP" | "WHATSAPP_NUMBER" | "PERMISSION_GROUP" | "MEMBER" | "INVITATION" | "SETTINGS" | "OFFER";

// Uma linha do histórico de alterações do tenant
type AuditLog = {
  id: string;
  userId: string | null;
  userName: string | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string | null;
  entityName: string | null;
  summary: string;
  metadata: unknown;
  createdAt: string;
};
