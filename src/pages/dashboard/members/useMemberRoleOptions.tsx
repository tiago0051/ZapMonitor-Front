import { useClientContext } from "@/context/ClientContext/clientContext";
import { permissionGroupService } from "@/services/api/permissionGroupService";
import { useQuery } from "@tanstack/react-query";

const roles: TenantRole[] = ["IMPLANTER", "ADMIN", "SUPERVISOR", "ATTENDANT", "CUSTOM"];

const supervisorPermissions: Permission[] = ["whatsapp.chat", "reports.view", "email.view", "management.view"];

/**
 * Espelha a regra do backend: ninguém concede, nem altera quem tem, um acesso maior que o próprio.
 */
export const useMemberRoleOptions = (clientId: string) => {
  const { access, can } = useClientContext();

  const findAllPermissionGroupsQuery = useQuery({
    queryKey: ["permissionGroups", clientId],
    queryFn: () => permissionGroupService.findAll({ params: { clientId } }),
  });

  const permissionGroups = findAllPermissionGroupsQuery.data ?? [];

  const canGrantPermissionGroup = (permissionGroup: PermissionGroup) => permissionGroup.permissions.every(can);

  const canGrantRole = (role: TenantRole) => {
    if (role === "IMPLANTER") return access.role === "IMPLANTER";
    if (role === "ADMIN") return access.role === "IMPLANTER" || access.role === "ADMIN";
    if (role === "SUPERVISOR") return supervisorPermissions.every(can);
    if (role === "ATTENDANT") return can("whatsapp.chat");
    return true;
  };

  const canManageMember = (member: Member) => {
    if (member.role !== "CUSTOM") return canGrantRole(member.role);

    const permissionGroup = permissionGroups.find((item) => item.id === member.permissionGroupId);
    return !permissionGroup || canGrantPermissionGroup(permissionGroup);
  };

  return {
    roleOptions: roles.filter(canGrantRole),
    permissionGroupOptions: permissionGroups.filter(canGrantPermissionGroup),
    canManageMember,
    isLoading: findAllPermissionGroupsQuery.isLoading,
  };
};
