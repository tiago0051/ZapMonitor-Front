import { Button } from "@/components/ui/button";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, QrCode } from "lucide-react";
import { useState, type FC } from "react";
import { DialogWhatsappWebQrCode } from "./dialogWhatsappWebQrCode";

type WhatsappWebConnectButtonProps = {
  clientId: string;
  disabled?: boolean;
};

// Cria o número por QR code e já abre o QR code para a leitura
export const WhatsappWebConnectButton: FC<WhatsappWebConnectButtonProps> = ({ clientId, disabled }) => {
  const [configurationId, setConfigurationId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: whatsappService.createWhatsappWebConfiguration,
    onError: requestErrorHandling,
    onSuccess: (configuration) => {
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
      setConfigurationId(configuration.id);
    },
  });

  return (
    <>
      <Button
        variant="outline"
        disabled={disabled || createMutation.isPending}
        onClick={() => createMutation.mutate({ params: { clientId } })}
      >
        {createMutation.isPending ? <Loader2 className="animate-spin" /> : <QrCode />}
        Conectar por QR code
      </Button>
      <DialogWhatsappWebQrCode
        clientId={clientId}
        configurationId={configurationId}
        onOpenChange={(open) => !open && setConfigurationId(null)}
      />
    </>
  );
};
