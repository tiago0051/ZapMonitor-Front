import { EmptyState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useGoogleCalendarLogin } from "@/hooks/use-googleCalendarLogin";
import { googleCalendarService } from "@/services/api/googleCalendarService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Conta Google cuja agenda os agentes de IA controlam; a ferramenta é ligada em cada agente. */
export const GoogleCalendarSettings = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);

  const connectionQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["googleCalendar", "connection", client.id],
    queryFn: () => googleCalendarService.findConnection({ params: { clientId: client.id } }),
  });
  const connection = connectionQuery.data;
  const isRevoked = connection.status === "REVOKED";

  // A ferramenta dos agentes mostra a conexão e as agendas; tudo muda junto
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["googleCalendar"] });
    queryClient.invalidateQueries({ queryKey: ["aiAgentTool"] });
  };

  const connect = useMutation({
    mutationFn: googleCalendarService.connect,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Google Agenda conectado. Ligue a agenda nos agentes de IA.");
    },
  });
  const disconnect = useMutation({
    mutationFn: googleCalendarService.disconnect,
    onError: requestErrorHandling,
    onSuccess: () => {
      setIsConfirmingDisconnect(false);
      invalidate();
      toast.success("Google Agenda desconectado");
    },
  });

  const { launch, isConfigured, isReady } = useGoogleCalendarLogin({
    onCode: (code) => connect.mutate({ params: { clientId: client.id }, body: { code } }),
    onCancel: () => toast.info("Conexão com o Google cancelada"),
    onError: (message) => toast.error(message),
  });

  const canLaunch = isConfigured && connection.configured && isReady && !connect.isPending && !disconnect.isPending;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Google Agenda</CardTitle>
          <CardDescription>
            Conecte a conta Google da agenda que os agentes de IA vão controlar: ver horários livres, marcar, remarcar e desmarcar sessões.
            Depois ligue o Google Agenda em cada agente, em Agentes de IA → Ferramentas.
          </CardDescription>
        </div>
        <Button variant={connection.connected && !isRevoked ? "outline" : "default"} onClick={launch} disabled={!canLaunch}>
          {connection.connected ? "Reconectar" : "Conectar com o Google"}
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {(!isConfigured || !connection.configured) && (
          <p className="text-destructive text-sm">
            O login com o Google não está configurado neste ambiente (VITE_GOOGLE_OAUTH_CLIENT_ID no painel e GOOGLE_OAUTH_CLIENT_ID /
            GOOGLE_OAUTH_CLIENT_SECRET no servidor).
          </p>
        )}

        {!connection.connected && (
          <EmptyState
            title="O Google Agenda ainda não está conectado"
            description="Entre com a conta Google dona da agenda (ou com acesso para editá-la) e marque todas as permissões pedidas."
          />
        )}

        {connection.connected && (
          <>
            <div className="space-y-1 text-sm">
              <p>
                Conectado como <span className="font-medium">{connection.googleEmail}</span>
                {connection.connectedAt && ` · desde ${format(new Date(connection.connectedAt), "dd/MM/yyyy")}`}
              </p>
              {isRevoked && (
                <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />O Google recusou o acesso (permissão removida ou senha trocada).
                  Enquanto não reconectar, os agentes avisam o contato e passam a conversa para a equipe.
                </p>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {isConfirmingDisconnect ? (
                <>
                  <p className="text-sm">Os agentes deixam de usar a agenda. As sessões já marcadas continuam no Google Agenda.</p>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={disconnect.isPending}
                    onClick={() => disconnect.mutate({ params: { clientId: client.id } })}
                  >
                    Desconectar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsConfirmingDisconnect(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsConfirmingDisconnect(true)}>
                  Desconectar o Google Agenda
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
