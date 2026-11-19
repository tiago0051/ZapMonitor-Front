import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft } from "lucide-react";
import type { FC } from "react";
import { useServiceActions } from "@/pages/dashboard/whatsapp/components/chatView/hooks/useServiceActions";
import { TransferDialog } from "@/pages/dashboard/whatsapp/components/chatView/components/transferDialog";

/** Botão "Transferir" da Gestão: mesmo diálogo do atendimento (colega ou grupo, com nota). */
export const ManagementTransfer: FC<{ contactId: string; contactName: string }> = ({ contactId, contactName }) => {
  const queryClient = useQueryClient();
  const serviceActions = useServiceActions({
    contact: { id: contactId },
    onTransferred: () => {
      queryClient.invalidateQueries({ queryKey: ["management", "inProgress"] });
      queryClient.invalidateQueries({ queryKey: ["management", "queue"] });
    },
  });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        disabled={serviceActions.isPending}
        onClick={() => serviceActions.setIsTransferDialogOpen(true)}
      >
        <ArrowRightLeft className="h-3.5 w-3.5" />
        Transferir
      </Button>
      <TransferDialog contact={{ id: contactId }} contactName={contactName} serviceActions={serviceActions} />
    </>
  );
};
