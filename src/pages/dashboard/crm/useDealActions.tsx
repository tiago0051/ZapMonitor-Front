import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { crmTextareaClassName } from "./crmUtils";

type PendingLoss = { deal: Deal; stage: PipelineStage };

// Opção da lista para escrever um motivo que não está cadastrado
const OTHER_REASON = "other";

/**
 * Ações sobre negócios, compartilhadas pelo quadro, pelo detalhe e pelo painel do chat. Mover para a etapa de
 * perda pede o motivo antes; por isso o hook devolve o diálogo que precisa ser renderizado junto.
 */
export const useDealActions = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const [pendingLoss, setPendingLoss] = useState<PendingLoss | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [lostReasonId, setLostReasonId] = useState("");

  const lostReasonsQuery = useQuery({
    queryKey: ["crm", "lostReasons", client.id],
    queryFn: () => crmService.findAllLostReasons({ params: { clientId: client.id } }),
    enabled: !!pendingLoss,
  });
  const activeLostReasons = (lostReasonsQuery.data ?? []).filter((reason) => reason.active);
  // Sem motivos cadastrados, o motivo é sempre escrito
  const isWritingReason = activeLostReasons.length === 0 || lostReasonId === OTHER_REASON;
  const canConfirmLoss = isWritingReason ? !!lostReason.trim() : !!lostReasonId;

  const onSuccess = () => queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });

  const moveDeal = useMutation({ mutationFn: crmService.moveDeal, onError: requestErrorHandling, onSuccess });
  const updateDeal = useMutation({ mutationFn: crmService.updateDeal, onError: requestErrorHandling, onSuccess });
  const transferDeal = useMutation({ mutationFn: crmService.transferDeal, onError: requestErrorHandling, onSuccess });
  const reopenDeal = useMutation({ mutationFn: crmService.reopenDeal, onError: requestErrorHandling, onSuccess });
  const createDeal = useMutation({ mutationFn: crmService.createDeal, onError: requestErrorHandling, onSuccess });

  const requestMove = (deal: Deal, stage: PipelineStage) => {
    if (deal.stageId === stage.id) return;

    if (stage.type === "LOST") {
      setLostReason("");
      setLostReasonId("");
      setPendingLoss({ deal, stage });
      return;
    }

    moveDeal.mutate(
      { params: { clientId: client.id, dealId: deal.id }, body: { stageId: stage.id } },
      { onSuccess: () => stage.type === "WON" && toast.success("Negócio ganho!") },
    );
  };

  const confirmLoss = () => {
    if (!pendingLoss || !canConfirmLoss) return;

    moveDeal.mutate(
      {
        params: { clientId: client.id, dealId: pendingLoss.deal.id },
        body: isWritingReason
          ? { stageId: pendingLoss.stage.id, lostReason: lostReason.trim() }
          : { stageId: pendingLoss.stage.id, lostReasonId },
      },
      { onSuccess: () => setPendingLoss(null) },
    );
  };

  const lostReasonDialog = (
    <Dialog open={!!pendingLoss} onOpenChange={(open) => !open && setPendingLoss(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Marcar como perdido</DialogTitle>
          <DialogDescription>O motivo fica no histórico do negócio e ajuda a entender por que as vendas não fecham.</DialogDescription>
        </DialogHeader>
        {activeLostReasons.length > 0 && (
          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-medium">Motivo da perda</legend>
            {[...activeLostReasons, { id: OTHER_REASON, name: "Outro motivo" }].map((reason) => (
              <label key={reason.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="deal-lost-reason-option"
                  value={reason.id}
                  checked={lostReasonId === reason.id}
                  onChange={() => setLostReasonId(reason.id)}
                  className="accent-primary h-4 w-4"
                />
                {reason.name}
              </label>
            ))}
          </fieldset>
        )}
        {isWritingReason && !lostReasonsQuery.isLoading && (
          <div className="grid gap-2">
            <Label htmlFor="deal-lost-reason">{activeLostReasons.length > 0 ? "Descreva o motivo" : "Motivo da perda"}</Label>
            <textarea
              id="deal-lost-reason"
              value={lostReason}
              onChange={(event) => setLostReason(event.target.value)}
              maxLength={500}
              placeholder="Ex.: Fechou com a concorrência"
              className={crmTextareaClassName}
              autoFocus
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingLoss(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmLoss} disabled={!canConfirmLoss || moveDeal.isPending}>
            Marcar como perdido
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return {
    requestMove,
    lostReasonDialog,
    moveDeal,
    updateDeal,
    transferDeal,
    reopenDeal,
    createDeal,
    isPending: moveDeal.isPending || updateDeal.isPending || transferDeal.isPending || reopenDeal.isPending || createDeal.isPending,
  };
};
