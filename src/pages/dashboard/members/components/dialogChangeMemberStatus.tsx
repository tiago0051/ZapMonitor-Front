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
import { UserCheck, UserX } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type DialogChangeMemberStatusProps = {
  clientId: string;
  userId: string;
  action: "activate" | "deactivate";
};

const content = {
  activate: {
    trigger: "Ativar",
    title: "Ativar membro",
    description: "Tem certeza que deseja ativar este membro? Ele voltará a ter acesso a este cliente.",
    confirm: "Ativar",
    icon: UserCheck,
    iconClassName: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    buttonVariant: "default" as const,
    successMessage: "Membro ativado com sucesso",
  },
  deactivate: {
    trigger: "Desativar",
    title: "Desativar membro",
    description: "Tem certeza que deseja desativar este membro? Ele perderá o acesso a este cliente.",
    confirm: "Desativar",
    icon: UserX,
    iconClassName: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    buttonVariant: "destructive" as const,
    successMessage: "Membro desativado com sucesso",
  },
};

export const DialogChangeMemberStatus: FC<DialogChangeMemberStatusProps> = ({ clientId, userId, action }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const config = content[action];
  const Icon = config.icon;

  const changeStatus = useMutation({
    mutationFn: action === "activate" ? memberService.activate : memberService.deactivate,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      toast.success(config.successMessage);
      setIsOpen(false);
    },
  });

  const handleConfirm = () => {
    changeStatus.mutate({ params: { clientId, userId } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {config.trigger}
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[320px] max-w-[90vw] rounded-xl p-4">
        <DialogHeader className="flex flex-col items-center justify-center gap-2 text-center sm:text-center">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.iconClassName}`}>
            <Icon className="h-5 w-5" />
          </div>

          <DialogTitle className="text-center">{config.title}</DialogTitle>
          <DialogDescription className="text-center">{config.description}</DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={changeStatus.isPending}>
            Voltar
          </Button>
          <Button type="button" variant={config.buttonVariant} onClick={handleConfirm} disabled={changeStatus.isPending}>
            {config.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
