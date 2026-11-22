import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { offerService } from "@/services/api/offerService";
import { salesScriptService } from "@/services/api/salesScriptService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, MessagesSquare, Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SalesScriptEditorDialog } from "./salesScriptEditorDialog";
import { scriptChannelLabel, scriptMethodLabel } from "./salesScriptUtils";

/** Roteiros de vendas: o caminho da conversa até o fechamento, por oferta e canal. */
export const SalesScriptsTab = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("offers.manage");
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<SalesScript | "new" | null>(null);

  const scriptsQuery = useQuery({
    queryKey: ["salesScripts", client.id, showArchived],
    queryFn: () => salesScriptService.findAll(client.id, showArchived),
  });
  const offersQuery = useQuery({ queryKey: ["offers", client.id, true], queryFn: () => offerService.findAll(client.id, true) });
  const offerName = new Map((offersQuery.data ?? []).map((offer) => [offer.id, offer.name]));
  const scripts = scriptsQuery.data ?? [];

  const archive = useMutation({
    mutationFn: ({ script, archived }: { script: SalesScript; archived: boolean }) =>
      salesScriptService.setArchived(client.id, script.id, archived),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["salesScripts", client.id] });
      toast.success(saved.status === "ARCHIVED" ? "Roteiro arquivado" : "Roteiro reativado");
    },
  });

  const newButton = canManage && (
    <Button onClick={() => setEditing("new")}>
      <Plus className="h-4 w-4" />
      Novo roteiro
    </Button>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Etapas da venda com perguntas, falas prontas e sinais para avançar. O atendente vê o roteiro na conversa e no negócio, e o agente
          de IA pode seguir um roteiro.
        </p>
        {newButton}
      </div>
      <label className="flex w-fit cursor-pointer items-center gap-2 text-sm">
        <Switch id="scripts-archived" checked={showArchived} onCheckedChange={setShowArchived} />
        Mostrar arquivados
      </label>

      {scriptsQuery.isLoading ? (
        <LoadingState />
      ) : scriptsQuery.isError ? (
        <ErrorState message="Não foi possível carregar os roteiros" onRetry={() => scriptsQuery.refetch()} />
      ) : scripts.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="Nenhum roteiro ainda"
          description="Escolha a oferta e o canal e a IA monta o roteiro. Depois de algumas vendas, ela revisa o roteiro com base nas conversas ganhas e perdidas."
          action={newButton}
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {scripts.map((script) => (
            <li key={script.id} className={cn("grid gap-2 rounded-lg border p-4", script.status === "ARCHIVED" && "opacity-70")}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="bg-muted rounded px-1.5 py-0.5 font-medium">{scriptChannelLabel[script.channel]}</span>
                <span className="bg-muted rounded px-1.5 py-0.5 font-medium">{scriptMethodLabel[script.method].label}</span>
                {script.status === "ARCHIVED" && <span className="bg-muted rounded px-1.5 py-0.5 font-medium">Arquivado</span>}
                <span className="text-muted-foreground ml-auto tabular-nums">versão {script.version}</span>
              </div>
              <button
                type="button"
                className="focus-visible:ring-ring/50 grid gap-1 rounded text-left outline-none focus-visible:ring-[3px]"
                onClick={() => setEditing(script)}
              >
                <span className="font-medium">{script.name}</span>
                <span className="text-muted-foreground text-sm">
                  {script.offerId ? (offerName.get(script.offerId) ?? "Oferta") : "Atendimento em geral"} · {script.stages.length} etapa(s)
                </span>
                <span className="text-muted-foreground text-xs">{script.stages.map((stage) => stage.name).join(" → ")}</span>
              </button>
              {canManage && (
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={archive.isPending}
                    onClick={() => archive.mutate({ script, archived: script.status === "ACTIVE" })}
                  >
                    {script.status === "ACTIVE" ? <Archive className="h-4 w-4" /> : <ArchiveRestore className="h-4 w-4" />}
                    {script.status === "ACTIVE" ? "Arquivar" : "Reativar"}
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && <SalesScriptEditorDialog script={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
    </div>
  );
};
