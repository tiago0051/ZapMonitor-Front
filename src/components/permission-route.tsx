import { useClientContext } from "@/context/ClientContext/clientContext";
import { ShieldOff } from "lucide-react";
import type { FC, ReactNode } from "react";

type PermissionRouteProps = {
  permission?: Permission;
  // Basta uma destas permissões
  anyPermission?: Permission[];
  // Exige também que o plano inclua o módulo CRM
  requiresCrm?: boolean;
  // Exige também que o plano inclua o módulo de anúncios
  requiresAds?: boolean;
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

export const PermissionRoute: FC<PermissionRouteProps> = ({ permission, anyPermission, requiresCrm, requiresAds, children }) => {
  const { can, access } = useClientContext();

  if (
    (permission && !can(permission)) ||
    (anyPermission && !anyPermission.some((item) => can(item))) ||
    (requiresCrm && !access.crmEnabled) ||
    (requiresAds && !access.adsEnabled)
  )
    return <NoPermission />;

  return children;
};
