import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { permissionGroupService } from "@/services/api/permissionGroupService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2, X } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type DialogDeletePermissionGroupProps = {
  clientId: string;
  permissionGroup: PermissionGroup;
};

export const DialogDeletePermissionGroup: FC<DialogDeletePermissionGroupProps> = ({ clientId, permissionGroup }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const isInUse = permissionGroup.memberCount > 0;

  const deletePermissionGroup = useMutation({
    mutationFn: permissionGroupService.delete,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissionGroups", clientId] });
      toast.success("Grupo excluído com sucesso");
      setIsOpen(false);
    },
  });

  const handleDelete = () => {
    deletePermissionGroup.mutate({ params: { clientId, permissionGroupId: permissionGroup.id } });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive h-8 w-8 shrink-0">
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[320px] max-w-[90vw] rounded-xl p-4">
        <DialogHeader className="flex flex-col items-center justify-center gap-2 text-center sm:text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
            <X className="h-5 w-5 text-red-600 dark:text-red-400" />
          </div>

          <DialogTitle className="text-center">Excluir grupo</DialogTitle>
          <DialogDescription className="text-center">
            {isInUse
              ? `${permissionGroup.memberCount} usuário(s) usam ${permissionGroup.name}. Altere o papel deles na tela de usuários antes de excluir.`
              : `O grupo ${permissionGroup.name} será excluído. Convites pendentes com ele entrarão como atendente.`}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:justify-end">
          <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={deletePermissionGroup.isPending}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isInUse || deletePermissionGroup.isPending}>
            Excluir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
