import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { crmSelectClassName, dealStatusLabel, findPipelineStage, formatCurrency } from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";
import { useDealActions } from "../useDealActions";
import { useCrmRealtime } from "../useCrmRealtime";
import { DealSheet } from "./dealSheet";

type ContactDealsProps = {
  contact: WhatsappContactMessage;
};

/** Negócios do contato no chat: mover de etapa, abrir o detalhe e criar um negócio sem sair da conversa. */
export const ContactDeals: FC<ContactDealsProps> = ({ contact }) => {
  const { client } = useClientContext();
  const { canViewAll, pipelines, activePipelines, visibleServiceGroups } = useCrmOptions();
  const actions = useDealActions();
  useCrmRealtime();

  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newPipelineId, setNewPipelineId] = useState("");
  const [newServiceGroupId, setNewServiceGroupId] = useState("");

  const dealsQuery = useQuery({
    queryKey: ["crm", "deals", "contact", contact.id],
    queryFn: () => crmService.findContactDeals({ params: { clientId: client.id, contactId: contact.id } }),
  });
  const deals = dealsQuery.data ?? [];

  // Um contato tem no máximo um negócio aberto por funil
  const availablePipelines = activePipelines.filter(
    (pipeline) => !deals.some((deal) => deal.pipelineId === pipeline.id && deal.status === "OPEN"),
  );
  // Por padrão o negócio fica no grupo do contato, se o usuário puder vê-lo ali
  const defaultServiceGroupId =
    visibleServiceGroups.find((group) => group.id === contact.serviceGroupId)?.id ??
    (canViewAll ? "" : (visibleServiceGroups[0]?.id ?? ""));

  const startCreating = () => {
    setNewPipelineId(availablePipelines[0]?.id ?? "");
    setNewServiceGroupId(defaultServiceGroupId);
    setIsCreating(true);
  };

  const create = () => {
    if (!newPipelineId) return;

    actions.createDeal.mutate(
      {
        params: { clientId: client.id },
        body: { pipelineId: newPipelineId, whatsappContactId: contact.id, serviceGroupId: newServiceGroupId || null },
      },
      {
        onSuccess: () => {
          toast.success("Negócio criado");
          setIsCreating(false);
        },
      },
    );
  };

  return (
    <div className="space-y-3">
      {dealsQuery.isLoading && <LoadingState className="py-2" />}
      {!dealsQuery.isLoading && deals.length === 0 && !isCreating && (
        <p className="text-muted-foreground text-xs">Este contato ainda não tem negócios que você possa ver.</p>
      )}

      {deals.map((deal) => {
        const pipeline = pipelines.find((item) => item.id === deal.pipelineId);

        return (
          <div key={deal.id} className="space-y-2 rounded-lg border p-3">
            <div className="flex items-start justify-between gap-2">
              <button type="button" className="min-w-0 text-left" onClick={() => setOpenDealId(deal.id)}>
                <p className="truncate text-sm font-medium hover:underline">{deal.title}</p>
                <p className="text-muted-foreground truncate text-xs">{pipeline?.name}</p>
              </button>
              {deal.value !== null && <span className="shrink-0 text-xs font-semibold text-green-700">{formatCurrency(deal.value)}</span>}
            </div>

            {deal.status === "OPEN" ? (
              <select
                aria-label="Etapa do negócio"
                value={deal.stageId}
                disabled={actions.isPending}
                onChange={(event) => {
                  const stage = findPipelineStage(pipeline, event.target.value);
                  if (stage) actions.requestMove(deal, stage);
                }}
                className={crmSelectClassName}
              >
                {pipeline?.stages.map((stage) => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-muted-foreground text-xs">
                {dealStatusLabel[deal.status]} em {findPipelineStage(pipeline, deal.stageId)?.name}
              </p>
            )}
          </div>
        );
      })}

      {isCreating ? (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="grid gap-1">
            <Label htmlFor="new-deal-pipeline" className="text-xs">
              Funil
            </Label>
            <select
              id="new-deal-pipeline"
              value={newPipelineId}
              onChange={(event) => setNewPipelineId(event.target.value)}
              className={crmSelectClassName}
            >
              {availablePipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="new-deal-group" className="text-xs">
              Grupo de atendimento
            </Label>
            <select
              id="new-deal-group"
              value={newServiceGroupId}
              onChange={(event) => setNewServiceGroupId(event.target.value)}
              className={crmSelectClassName}
            >
              {canViewAll && <option value="">Sem grupo</option>}
              {visibleServiceGroups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={create} disabled={!newPipelineId || (!canViewAll && !newServiceGroupId) || actions.isPending}>
              Criar negócio
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        availablePipelines.length > 0 &&
        (canViewAll || visibleServiceGroups.length > 0) && (
          <Button size="sm" variant="outline" onClick={startCreating}>
            <Plus className="h-3.5 w-3.5" />
            Novo negócio
          </Button>
        )
      )}

      <DealSheet dealId={openDealId} onClose={() => setOpenDealId(null)} />
      {actions.dialogs}
    </div>
  );
};
