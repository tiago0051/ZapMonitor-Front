import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { memberService } from "@/services/api/memberService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type DialogCancelInvitationProps = {
  clientId: string;
  invitationId: string;
};

export const DialogCancelInvitation: FC<DialogCancelInvitationProps> = ({ clientId, invitationId }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();

  const cancelInvitation = useMutation({
    mutationFn: memberService.cancelInvitation,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      toast.success("Convite cancelado com sucesso");
      setIsOpen(false);
    },
  });

  const handleCancel = () => {
    cancelInvitation.mutate({ params: { clientId, invitationId } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
          Cancelar convite
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[320px] max-w-[90vw] rounded-xl p-4">
        <DialogHeader className="flex flex-col items-center justify-center gap-2 text-center sm:text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <X className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>

          <DialogTitle className="text-center">Cancelar convite</DialogTitle>
          <DialogDescription className="text-center">
            Tem certeza que deseja cancelar este convite? O convidado não poderá mais aceitá-lo.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={cancelInvitation.isPending}>
            Voltar
          </Button>
          <Button type="button" variant="destructive" onClick={handleCancel} disabled={cancelInvitation.isPending}>
            Cancelar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
