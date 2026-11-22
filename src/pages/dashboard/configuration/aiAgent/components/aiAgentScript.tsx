import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { salesScriptService } from "@/services/api/salesScriptService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { FC } from "react";
import { toast } from "sonner";
import { selectClassName } from "@/pages/dashboard/offers/offerUtils";

/** Roteiro de vendas que o agente segue: entra inteiro em cada resposta e o agente conduz a conversa pelas etapas. */
export const AiAgentScript: FC<{ clientId: string; aiAgentId: string }> = ({ clientId, aiAgentId }) => {
  const { can } = useClientContext();
  const queryClient = useQueryClient();
  const scriptsQuery = useQuery({
    queryKey: ["salesScripts", clientId, false],
    queryFn: () => salesScriptService.findAll(clientId),
    enabled: can("offers.view"),
  });
  const currentQuery = useQuery({
    queryKey: ["aiAgentScript", clientId, aiAgentId],
    queryFn: () => salesScriptService.findAgentScript(clientId, aiAgentId),
  });

  const save = useMutation({
    mutationFn: (salesScriptId: string | null) => salesScriptService.setAgentScript(clientId, aiAgentId, salesScriptId),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      queryClient.setQueryData(["aiAgentScript", clientId, aiAgentId], result);
      toast.success(result.salesScriptId ? "O agente passa a seguir o roteiro" : "Roteiro tirado do agente");
    },
  });

  const scripts = scriptsQuery.data ?? [];
  if (!can("offers.view") || (!scriptsQuery.isLoading && scripts.length === 0 && !currentQuery.data?.salesScriptId)) return null;

  return (
    <div className="grid gap-1 border-t pt-3">
      <Label htmlFor="agent-sales-script">Roteiro de vendas que o agente segue</Label>
      <select
        id="agent-sales-script"
        className={selectClassName}
        value={currentQuery.data?.salesScriptId ?? ""}
        disabled={save.isPending || currentQuery.isLoading}
        onChange={(event) => save.mutate(event.target.value || null)}
      >
        <option value="">Nenhum (só as instruções do agente)</option>
        {scripts.map((script) => (
          <option key={script.id} value={script.id}>
            {script.name}
          </option>
        ))}
      </select>
      <p className="text-muted-foreground text-xs">
        O agente descobre em que etapa o contato está e só avança quando aparece o sinal da etapa, uma pergunta por vez.
      </p>
    </div>
  );
};
