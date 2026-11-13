import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ownerService } from "@/services/api/ownerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";

/** Exclusão do tenant: o dono confirma digitando o nome. Num tenant que já está sendo excluído, retoma a exclusão. */
export const DialogDeleteClient: FC<{ client: OwnerClient }> = ({ client }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [confirmationName, setConfirmationName] = useState<string>("");
  const queryClient = useQueryClient();
  const isDeleting = !!client.deletingAt;

  const deleteClient = useMutation({
    mutationFn: ownerService.deleteClient,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner"] });
      toast.success(isDeleting ? "Exclusão retomada" : "Exclusão iniciada. Os dados do tenant estão sendo apagados.");
      setIsOpen(false);
    },
  });

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    setConfirmationName("");
  };

  const nameMatches = confirmationName.trim() === client.name.trim();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          {isDeleting ? "Retomar exclusão" : "Excluir"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excluir {client.name}</DialogTitle>
          <DialogDescription>
            {isDeleting
              ? "A exclusão deste tenant já começou. Retome se ela parou no meio do caminho."
              : "Ninguém mais acessa o tenant e os números de WhatsApp são desligados na hora. Depois, todos os dados são apagados: conversas, contatos, CRM, fluxos, anúncios, e-mails, plano e arquivos. Não dá para desfazer."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor={`delete-client-${client.id}`}>
            Digite <span className="font-semibold">{client.name}</span> para confirmar
          </Label>
          <Input
            id={`delete-client-${client.id}`}
            value={confirmationName}
            autoComplete="off"
            onChange={(event) => setConfirmationName(event.currentTarget.value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!nameMatches || deleteClient.isPending}
            onClick={() => deleteClient.mutate({ params: { clientId: client.id }, body: { confirmationName } })}
          >
            {isDeleting ? "Retomar exclusão" : "Excluir tenant"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
