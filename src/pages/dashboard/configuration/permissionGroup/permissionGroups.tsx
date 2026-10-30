import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { permissionGroupService } from "@/services/api/permissionGroupService";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ShieldCheck, Users } from "lucide-react";
import { useParams } from "react-router";
import { DialogDeletePermissionGroup } from "./components/dialogDeletePermissionGroup";
import { DialogSavePermissionGroup } from "./components/dialogSavePermissionGroup";
import { usePermissionCatalog } from "./usePermissionCatalog";

export const PermissionGroups = () => {
  const { clientId } = useParams();

  const findAllPermissionGroupsQuery = useSuspenseQuery({
    queryKey: ["permissionGroups", clientId],
    queryFn: () => permissionGroupService.findAll({ params: { clientId: clientId! } }),
  });

  const { getLabel } = usePermissionCatalog(clientId!);

  const permissionGroups = findAllPermissionGroupsQuery.data;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Grupos de permissão</CardTitle>
          <CardDescription>
            Monte perfis de acesso sob medida. Usuários com o papel personalizado recebem as permissões do grupo escolhido.
          </CardDescription>
        </div>
        <DialogSavePermissionGroup clientId={clientId!} />
      </CardHeader>
      <CardContent>
        {permissionGroups.length === 0 && <p className="text-muted-foreground text-sm">Nenhum grupo de permissão cadastrado.</p>}

        {permissionGroups.length > 0 && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {permissionGroups.map((permissionGroup) => (
              <div key={permissionGroup.id} className="bg-card text-card-foreground flex flex-col gap-3 rounded-xl border p-4 shadow-xs">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="truncate text-base font-semibold">{permissionGroup.name}</h3>
                  <div className="flex shrink-0">
                    <DialogSavePermissionGroup clientId={clientId!} permissionGroup={permissionGroup} />
                    <DialogDeletePermissionGroup clientId={clientId!} permissionGroup={permissionGroup} />
                  </div>
                </div>

                {permissionGroup.description && <p className="text-muted-foreground line-clamp-2 text-sm">{permissionGroup.description}</p>}

                <div className="text-sm">
                  <div className="text-muted-foreground mb-1 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {permissionGroup.permissions.length} permissão(ões)
                  </div>
                  <p className="line-clamp-3">{permissionGroup.permissions.map(getLabel).join(", ") || "—"}</p>
                </div>

                <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Users className="h-3.5 w-3.5" />
                  {permissionGroup.memberCount} usuário(s)
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
