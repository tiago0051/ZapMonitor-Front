import { Navigate, Outlet, useLocation, useParams } from "react-router";
import { ClientContext } from "./clientContext";
import { useQueryClient, useSuspenseQueries } from "@tanstack/react-query";
import { useEffect } from "react";
import { PLAN_EXPIRED_EVENT } from "@/services/api/api";
import { clientService } from "@/services/api/clientService";

export const ClientProvider = () => {
  const { clientId } = useParams<{ clientId: string }>();

  const [findClientQuery, findMyAccessQuery] = useSuspenseQueries({
    queries: [
      {
        meta: { errorHandledInline: true },
        queryKey: ["client", clientId],
        queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
      },
      {
        meta: { errorHandledInline: true },
        queryKey: ["clientAccess", clientId],
        queryFn: () => clientService.findMyAccess({ params: { clientId: clientId! } }),
      },
    ],
  });

  // Plano venceu com a tela aberta: recarrega o acesso, que falha e mostra a tela de bloqueio
  const queryClient = useQueryClient();
  useEffect(() => {
    const handlePlanExpired = () => queryClient.resetQueries({ queryKey: ["clientAccess", clientId] });

    window.addEventListener(PLAN_EXPIRED_EVENT, handlePlanExpired);
    return () => window.removeEventListener(PLAN_EXPIRED_EVENT, handlePlanExpired);
  }, [queryClient, clientId]);

  const location = useLocation();

  const client = findClientQuery.data;
  const access = findMyAccessQuery.data;

  const can = (permission: Permission) => access.permissions.includes(permission);
  const canUseCrm = access.crmEnabled && can("crm.view");
  const canUseAds = access.adsEnabled && can("ads.view");

  // O cliente exige verificação em duas etapas e a pessoa ainda não ativou: só a tela de segurança fica liberada
  const accountPath = `/dashboard/client/${clientId}/configuration`;
  const isOnAccountPage = location.pathname.startsWith(accountPath) && new URLSearchParams(location.search).get("tab") === "account";
  if (access.twoFactorSetupRequired && !isOnAccountPage) return <Navigate to={`${accountPath}?tab=account`} replace />;

  return (
    <ClientContext.Provider value={{ client, access, can, canUseCrm, canUseAds }}>
      <Outlet />
    </ClientContext.Provider>
  );
};
