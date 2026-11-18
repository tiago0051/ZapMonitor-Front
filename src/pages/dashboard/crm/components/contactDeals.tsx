import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState, type FC } from "react";
import { crmSelectClassName, dealStatusLabel, findPipelineStage, formatCurrency, pipelinesForNewDeal } from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";
import { useDealActions } from "../useDealActions";
import { useCrmRealtime } from "../useCrmRealtime";
import { DealSheet } from "./dealSheet";
import { NewDealForm } from "./newDealForm";

// A conversa aberta no atendimento ou a ficha do contato (que junta os negócios de todas as conversas dela)
type ContactDealsProps =
  { contact: WhatsappContactMessage; person?: never } | { person: { id: string; name: string | null }; contact?: never };

/**
 * Negócios do contato no chat e na ficha: mover de etapa, abrir o detalhe e criar um negócio completo (funil, etapa,
 * título e valor) sem sair da tela.
 */
export const ContactDeals: FC<ContactDealsProps> = ({ contact, person }) => {
  const { client } = useClientContext();
  const { canViewAll, pipelines, activePipelines, visibleServiceGroups } = useCrmOptions();
  const actions = useDealActions();
  useCrmRealtime();

  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const dealsQuery = useQuery({
    queryKey: contact ? ["crm", "deals", "contact", contact.id] : ["crm", "deals", "person", person!.id],
    queryFn: () =>
      contact
        ? crmService.findContactDeals({ params: { clientId: client.id, contactId: contact.id } })
        : crmService.findPersonDeals({ params: { clientId: client.id, personId: person!.id } }),
  });
  const deals = dealsQuery.data ?? [];

  const availablePipelines = pipelinesForNewDeal(activePipelines, deals);
  // Por padrão o negócio fica no grupo do contato, se o usuário puder vê-lo ali
  const defaultServiceGroupId =
    visibleServiceGroups.find((group) => group.id === contact?.serviceGroupId)?.id ??
    (canViewAll ? "" : (visibleServiceGroups[0]?.id ?? ""));

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
        <NewDealForm
          target={contact ? { whatsappContactId: contact.id } : { contactId: person!.id }}
          pipelines={availablePipelines}
          defaultServiceGroupId={defaultServiceGroupId}
          idPrefix={`new-deal-${contact?.id ?? person!.id}`}
          onCreated={() => setIsCreating(false)}
          onCancel={() => setIsCreating(false)}
        />
      ) : (
        activePipelines.length > 0 &&
        (canViewAll || visibleServiceGroups.length > 0) && (
          <Button size="sm" variant="outline" onClick={() => setIsCreating(true)}>
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
