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
};
