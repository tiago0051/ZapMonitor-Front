import { ErrorState, LoadingState } from "@/components/state-message";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { memberService } from "@/services/api/memberService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { toast } from "sonner";

// Só quem é alcançado pela regra decide sobre ela (o back confere de novo)
const ROLES_THAT_DECIDE: TenantRole[] = ["ADMIN", "IMPLANTER"];

/** Segurança do cliente: exigir verificação em duas etapas de administradores. */
export const SecurityTab = () => {
  const { client, access } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const canDecide = ROLES_THAT_DECIDE.includes(access.role);

  const securityQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["clientSecurity", client.id],
    queryFn: () => memberService.findSecurity(client.id),
  });

  const update = useMutation({
    mutationFn: (requireTwoFactor: boolean) => memberService.updateSecurity(client.id, { requireTwoFactor }),
    onError: requestErrorHandling,
    onSuccess: (data) => {
      queryClient.setQueryData(["clientSecurity", client.id], data);
      // Quem ainda não ativou passa a ser levado para a tela de segurança
      queryClient.invalidateQueries({ queryKey: ["clientAccess", client.id] });
      queryClient.invalidateQueries({ queryKey: ["auditLogs", client.id] });
      toast.success(
        data.requireTwoFactor
          ? "Pronto. Administradores sem a verificação ativa serão levados a ativar no próximo acesso."
          : "A verificação em duas etapas deixou de ser obrigatória.",
      );
    },
  });

  if (securityQuery.isLoading) return <LoadingState />;
  if (securityQuery.isError)
    return (
      <ErrorState
        message="Não foi possível buscar as configurações de segurança."
        onRetry={() => securityQuery.refetch()}
        isRetrying={securityQuery.isFetching}
      />
    );

  return (
    <div className="max-w-xl space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="require-two-factor" className="text-sm font-medium">
            Exigir verificação em duas etapas para administradores
          </Label>
          <p className="text-muted-foreground text-sm">
            Administradores e implantadores precisam usar um app autenticador no celular para entrar. Quem ainda não ativou é levado para
            ativar logo depois do login.
          </p>
          {!canDecide && <p className="text-muted-foreground text-xs">Só administradores podem mudar esta opção.</p>}
        </div>
        <Switch
          id="require-two-factor"
          checked={securityQuery.data?.requireTwoFactor ?? false}
          disabled={!canDecide || update.isPending}
          onCheckedChange={(checked) => update.mutate(checked)}
        />
      </div>
      <p className="text-muted-foreground text-sm">
        Para ativar na sua conta, vá em{" "}
        <Link to={`${baseUrl}/configuration?tab=account`} className="underline underline-offset-4">
          Senha e segurança
        </Link>
        . Na lista de usuários, quem já ativou aparece com o selo "Duas etapas".
      </p>
    </div>
  );
};
