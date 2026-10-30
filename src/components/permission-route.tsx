import { useClientContext } from "@/context/ClientContext/clientContext";
import { ShieldOff } from "lucide-react";
import type { FC, ReactNode } from "react";

type PermissionRouteProps = {
  permission: Permission;
  children: ReactNode;
};

export const NoPermission = () => (
  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
    <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-full">
      <ShieldOff className="text-muted-foreground h-6 w-6" />
    </div>
    <h2 className="text-lg font-semibold">Acesso restrito</h2>
    <p className="text-muted-foreground max-w-sm text-sm">
      Você não tem permissão para acessar esta página. Fale com um administrador do cliente.
    </p>
  </div>
);

export const PermissionRoute: FC<PermissionRouteProps> = ({ permission, children }) => {
  const { can } = useClientContext();

  if (!can(permission)) return <NoPermission />;

  return children;
};
