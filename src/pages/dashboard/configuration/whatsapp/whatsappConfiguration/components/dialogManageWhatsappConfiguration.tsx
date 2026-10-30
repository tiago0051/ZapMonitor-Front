import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import parsePhoneNumberFromString from "libphonenumber-js";
import { Loader2, Settings2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type DialogManageWhatsappConfigurationProps = {
  clientId: string;
  whatsappConfiguration: WhatsappConfiguration;
};

export const DialogManageWhatsappConfiguration: FC<DialogManageWhatsappConfigurationProps> = ({ clientId, whatsappConfiguration }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [authorizationToken, setAuthorizationToken] = useState("");
  const queryClient = useQueryClient();

  const params = { clientId, configurationId: whatsappConfiguration.id };

  const webhookQuery = useQuery({
    queryKey: ["whatsappConfigurationWebhook", clientId, whatsappConfiguration.id],
    queryFn: () => whatsappService.findConfigurationWebhook({ params }),
    enabled: isOpen,
    retry: false,
  });

  const updateToken = useMutation({
    mutationFn: whatsappService.updateConfigurationToken,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurations", clientId] });
      queryClient.invalidateQueries({ queryKey: ["whatsappConfigurationWebhook", clientId, whatsappConfiguration.id] });
      toast.success("Token atualizado");
      setAuthorizationToken("");
    },
  });

  const phoneNumber =
    parsePhoneNumberFromString(whatsappConfiguration.phoneNumber)?.format("INTERNATIONAL") ?? whatsappConfiguration.phoneNumber;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) setAuthorizationToken("");
      }}
    >
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Gerenciar número">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {phoneNumber}
            <Badge variant={whatsappConfiguration.enabled ? "default" : "secondary"}>
              {whatsappConfiguration.enabled ? "Ativo" : "Desativado"}
            </Badge>
          </DialogTitle>
          <DialogDescription>ID do número na Meta: {whatsappConfiguration.phoneNumberId}</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label>Webhook em uso</Label>
          {webhookQuery.isLoading && <p className="text-muted-foreground text-sm">Consultando a Meta...</p>}
          {webhookQuery.isError && (
            <p className="text-destructive text-sm">Não foi possível consultar a Meta. O token pode ter expirado; atualize-o abaixo.</p>
          )}
          {webhookQuery.data && (
            <p className="bg-muted rounded-md p-2 font-mono text-xs break-all">
              {webhookQuery.data.effectiveUrl ?? "Nenhum webhook configurado para este número"}
            </p>
          )}
        </div>

        <form
          id={`form-token-${whatsappConfiguration.id}`}
          className="space-y-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            updateToken.mutate({ params, body: { authorizationToken: authorizationToken.trim() } });
          }}
        >
          <Label htmlFor={`token-${whatsappConfiguration.id}`}>Novo token de acesso</Label>
          <Input
            id={`token-${whatsappConfiguration.id}`}
            type="password"
            value={authorizationToken}
            onChange={(e) => setAuthorizationToken(e.target.value)}
            placeholder="Cole o token gerado no painel da Meta"
            disabled={updateToken.isPending}
          />
          <p className="text-muted-foreground text-xs">Use quando o envio de mensagens parar por token expirado ou revogado.</p>
        </form>

        <DialogFooter>
          <Button
            type="submit"
            form={`form-token-${whatsappConfiguration.id}`}
            disabled={updateToken.isPending || !authorizationToken.trim()}
          >
            {updateToken.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Atualizar token
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
