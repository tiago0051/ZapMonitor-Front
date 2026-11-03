import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { crmTextareaClassName } from "./crmUtils";

type PendingLoss = { deal: Deal; stage: PipelineStage };

/**
 * Ações sobre negócios, compartilhadas pelo quadro, pelo detalhe e pelo painel do chat. Mover para a etapa de
 * perda pede o motivo antes; por isso o hook devolve o diálogo que precisa ser renderizado junto.
 */
export const useDealActions = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const [pendingLoss, setPendingLoss] = useState<PendingLoss | null>(null);
  const [lostReason, setLostReason] = useState("");

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
      setPendingLoss({ deal, stage });
      return;
    }

    moveDeal.mutate(
      { params: { clientId: client.id, dealId: deal.id }, body: { stageId: stage.id } },
      { onSuccess: () => stage.type === "WON" && toast.success("Negócio ganho!") },
    );
  };

  const confirmLoss = () => {
    if (!pendingLoss || !lostReason.trim()) return;

    moveDeal.mutate(
      {
        params: { clientId: client.id, dealId: pendingLoss.deal.id },
        body: { stageId: pendingLoss.stage.id, lostReason: lostReason.trim() },
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
        <div className="grid gap-2">
          <Label htmlFor="deal-lost-reason">Motivo da perda</Label>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => setPendingLoss(null)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={confirmLoss} disabled={!lostReason.trim() || moveDeal.isPending}>
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
