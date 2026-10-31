import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { implanterService } from "@/services/api/implanterService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

export const DialogSendPasswordReset: FC<{ user: ImplanterUser }> = ({ user }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const sendPasswordReset = useMutation({
    mutationFn: implanterService.sendPasswordReset,
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success("E-mail de redefinição enviado");
      setIsOpen(false);
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          Redefinir senha
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[320px] max-w-[90vw] rounded-xl p-4">
        <DialogHeader className="flex flex-col items-center justify-center gap-2 text-center sm:text-center">
          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
            <KeyRound className="h-5 w-5" />
          </div>
          <DialogTitle className="text-center">Redefinir senha</DialogTitle>
          <DialogDescription className="text-center">
            Enviaremos para {user.email} um link para criar uma nova senha. O link vale por 1 hora.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={sendPasswordReset.isPending}>
            Voltar
          </Button>
          <Button
            type="button"
            onClick={() => sendPasswordReset.mutate({ params: { userId: user.id } })}
            disabled={sendPasswordReset.isPending}
          >
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
