import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { formatConfigurationPhoneNumber, isWhatsappWeb } from "@/utils/whatsappConfiguration";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";

type DeleteWhatsappConfigurationButtonProps = {
  clientId: string;
  whatsappConfiguration: WhatsappConfiguration;
};

// Exclusão lógica: as conversas continuam no histórico, mas o número some da lista e libera a vaga do plano
export const DeleteWhatsappConfigurationButton: FC<DeleteWhatsappConfigurationButtonProps> = ({ clientId, whatsappConfiguration }) => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: whatsappService.deleteConfiguration,
    onError: requestErrorHandling,
    onSuccess: () => {
      // A lista e o uso do plano ficam sob a mesma chave
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
      toast.success("Número excluído");
    },
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Excluir" disabled={deleteMutation.isPending}>
          {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir número?</AlertDialogTitle>
          <AlertDialogDescription>
            {formatConfigurationPhoneNumber(whatsappConfiguration)} deixará de enviar e receber mensagens e sairá da lista, liberando a vaga
            do plano. As conversas continuam no histórico.
            {isWhatsappWeb(whatsappConfiguration) && " A sessão também será removida do celular."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={() => deleteMutation.mutate({ params: { clientId, configurationId: whatsappConfiguration.id } })}
          >
            Excluir
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
