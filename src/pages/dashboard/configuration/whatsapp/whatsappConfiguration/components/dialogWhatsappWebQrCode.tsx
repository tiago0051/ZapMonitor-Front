import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { formatConfigurationPhoneNumber } from "@/utils/whatsappConfiguration";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import { useEffect, type FC } from "react";
import { toast } from "sonner";

type DialogWhatsappWebQrCodeProps = {
  clientId: string;
  // Número por QR code sendo conectado; nulo com o diálogo fechado
  configurationId: string | null;
  onOpenChange: (open: boolean) => void;
};

// Enquanto aguarda a leitura o QR code muda a cada ~20s; a consulta curta também percebe a conexão logo após a leitura
const POLLING_INTERVAL_MS = 2000;

export const DialogWhatsappWebQrCode: FC<DialogWhatsappWebQrCodeProps> = ({ clientId, configurationId, onOpenChange }) => {
  const queryClient = useQueryClient();
  const isOpen = !!configurationId;
  const params = { clientId, configurationId: configurationId ?? "" };

  const statusQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappWebStatus", clientId, configurationId],
    queryFn: () => whatsappService.findWhatsappWebStatus({ params }),
    enabled: isOpen,
    gcTime: 0,
    // DISCONNECTED também segue consultando: logo após a leitura a sessão reinicia antes de ficar conectada
    refetchInterval: (query) => {
      const status = query.state.data?.connectionStatus;
      return !status || status === "PENDING" || status === "DISCONNECTED" ? POLLING_INTERVAL_MS : false;
    },
  });

  const status = statusQuery.data;
  const connectionStatus = status?.connectionStatus;

  // Atualiza a lista e o uso do plano quando a situação muda (conectado, desconectado...)
  useEffect(() => {
    if (!connectionStatus) return;
    queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
    if (connectionStatus === "CONNECTED") toast.success("Número conectado com sucesso");
  }, [connectionStatus, clientId, queryClient]);

  const reconnectMutation = useMutation({
    mutationFn: whatsappService.reconnectWhatsappWeb,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsappWebStatus", clientId, configurationId] });
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Conectar por QR code</DialogTitle>
          <DialogDescription>
            No celular, abra o WhatsApp e toque em <strong>Aparelhos conectados</strong> &gt; <strong>Conectar um aparelho</strong>.
            Depois aponte a câmera para o QR code abaixo.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center">
          {statusQuery.isLoading && <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />}

          {statusQuery.isError && !status && <p className="text-destructive text-sm">Não foi possível consultar a conexão do número.</p>}

          {connectionStatus === "PENDING" &&
            (status?.qrCode ? (
              <img src={status.qrCode} alt="QR code para conectar o WhatsApp" className="h-64 w-64 rounded-md border bg-white p-2" />
            ) : (
              <>
                <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
                <p className="text-muted-foreground text-sm">Gerando QR code...</p>
              </>
            ))}

          {connectionStatus === "CONNECTED" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600" />
              <p className="font-medium">Número conectado</p>
              <p className="text-muted-foreground text-sm">{status && formatConfigurationPhoneNumber(status)}</p>
            </>
          )}

          {(connectionStatus === "DISCONNECTED" || connectionStatus === "LOGGED_OUT") && (
            <>
              <p className="text-sm">
                {connectionStatus === "LOGGED_OUT"
                  ? "O aparelho foi desconectado no celular."
                  : "A conexão caiu. Aguarde a reconexão ou gere um novo QR code."}
              </p>
              <Button
                variant="outline"
                disabled={reconnectMutation.isPending}
                onClick={() => reconnectMutation.mutate({ params })}
              >
                {reconnectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Gerar novo QR code
              </Button>
            </>
          )}

          {status?.connectionError && connectionStatus !== "CONNECTED" && (
            <p className="text-destructive text-sm">{status.connectionError}</p>
          )}
        </div>

        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <p>
            Esta conexão não é oficial: o WhatsApp pode banir o número se ele enviar mensagens em massa ou não solicitadas. Modelos e
            campanhas não estão disponíveis para números por QR code.
          </p>
        </div>

        <DialogFooter>
          <Button variant={connectionStatus === "CONNECTED" ? "default" : "outline"} onClick={() => onOpenChange(false)}>
            {connectionStatus === "CONNECTED" ? "Concluir" : "Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
