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
import { formatConfigurationPhoneNumber } from "@/utils/whatsappConfiguration";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { DialogWhatsappWebQrCode } from "./dialogWhatsappWebQrCode";

type WhatsappWebActionsProps = {
  clientId: string;
  whatsappConfiguration: WhatsappConfiguration;
};

// Ações da linha de um número por QR code: gerar um novo QR code ou encerrar a sessão no celular
export const WhatsappWebActions: FC<WhatsappWebActionsProps> = ({ clientId, whatsappConfiguration }) => {
  const [qrCodeConfigurationId, setQrCodeConfigurationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const params = { clientId, configurationId: whatsappConfiguration.id };
  const { connectionStatus } = whatsappConfiguration;

  const reconnectMutation = useMutation({
    mutationFn: whatsappService.reconnectWhatsappWeb,
    onError: requestErrorHandling,
    onSuccess: (configuration) => {
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
      // Descarta o status anterior para o diálogo não mostrar a situação antiga
      queryClient.removeQueries({ queryKey: ["whatsappWebStatus", clientId, configuration.id] });
      setQrCodeConfigurationId(configuration.id);
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: whatsappService.disconnectWhatsappWeb,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
      toast.success("Número desconectado");
    },
  });

  // Pendente pode tanto gerar outro QR code quanto desistir da conexão
  const canReconnect = connectionStatus !== "CONNECTED";
  const canDisconnect = connectionStatus === "CONNECTED" || connectionStatus === "PENDING";

  return (
    <>
      {canReconnect && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Reconectar"
          disabled={reconnectMutation.isPending}
          onClick={() => reconnectMutation.mutate({ params })}
        >
          {reconnectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      )}

      {canDisconnect && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" title="Desconectar" disabled={disconnectMutation.isPending}>
              {disconnectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unplug className="h-4 w-4" />}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Desconectar número?</AlertDialogTitle>
              <AlertDialogDescription>
                {formatConfigurationPhoneNumber(whatsappConfiguration)} deixará de enviar e receber mensagens e a sessão será removida do
                celular. Para usar de novo, será preciso ler um novo QR code.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className={buttonVariants({ variant: "destructive" })} onClick={() => disconnectMutation.mutate({ params })}>
                Desconectar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      <DialogWhatsappWebQrCode
        clientId={clientId}
        configurationId={qrCodeConfigurationId}
        onOpenChange={(open) => !open && setQrCodeConfigurationId(null)}
      />
    </>
  );
};
