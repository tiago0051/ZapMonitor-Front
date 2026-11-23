import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { cn } from "@/lib/utils";
import { salesCoachService } from "@/services/api/salesCoachService";
import { attendantDisplayName } from "@/utils/attendantName";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CornerDownLeft, GraduationCap, Info, Loader2, Sparkles } from "lucide-react";
import { useEffect, useState, type FC } from "react";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Link } from "react-router";
import { contactDisplayName } from "../../contactDisplayName";
import { insertIntoDraft } from "../../conversationDrafts";
import { fillQuickReply } from "../../quickReplies/quickReplies";

type Props = { contact: WhatsappContactMessage };

/**
 * Coach de vendas na conversa: alertas-chave por regra, a dica da IA quando a pessoa pede (vai para a caixa de texto, nunca
 * é enviada sozinha) e o feedback do último atendimento analisado.
 */
export const ConversationCoach: FC<Props> = ({ contact }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const [tipFor, setTipFor] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  const alertsQuery = useQuery({
    queryKey: ["salesCoach", client.id, "alerts", contact.id],
    queryFn: () => salesCoachService.alerts(client.id, contact.id),
    refetchInterval: 60_000,
  });
  const coachingsQuery = useQuery({
    queryKey: ["salesCoach", client.id, "coachings", contact.id],
    queryFn: () => salesCoachService.coachings(client.id, contact.id),
  });
  const { socket } = useSocketContext();
  const baseUrl = useBaseUrl();
  const { refetch: refetchCoachings } = coachingsQuery;
  const { refetch: refetchAlerts } = alertsQuery;

  // A análise chega depois do resumo do atendimento: o mesmo aviso do histórico recarrega o feedback e os alertas
  useEffect(() => {
    const event = `contact:${contact.id}:service:update`;
    const reload = () => {
      refetchCoachings();
      refetchAlerts();
    };
    socket.on(event, reload);
    return () => {
      socket.off(event, reload);
    };
  }, [contact.id, socket, refetchCoachings, refetchAlerts]);
  const tip = useMutation({
    mutationFn: () => salesCoachService.tip(client.id, contact.id),
    onError: requestErrorHandling,
    onSuccess: () => setTipFor(contact.id),
  });

  const alerts = alertsQuery.data ?? [];
  const lastFeedback = coachingsQuery.data?.[0] ?? null;
  const tipResult = tipFor === contact.id ? tip.data : undefined;
  const insert = (text: string) =>
    insertIntoDraft(
      contact.id,
      fillQuickReply(text, { contactName: contactDisplayName(contact, ""), attendantName: attendantDisplayName(user) }),
    );

  return (
    <div className="mb-5 space-y-3">
      {alerts.length > 0 && (
        <ul className="space-y-1.5" aria-label="Alertas da conversa">
          {alerts.map((alert, index) => (
            <li
              key={`${alert.kind}-${alert.dealId ?? index}`}
              className={cn(
                "flex gap-2 rounded-lg p-2 text-xs",
                alert.severity === "HIGH"
                  ? "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
                  : "bg-sky-50 text-sky-900 dark:bg-sky-950/40 dark:text-sky-200",
              )}
            >
              {alert.severity === "HIGH" ? (
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span>{alert.message}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="space-y-2">
        <Button size="sm" variant="outline" className="w-full" disabled={tip.isPending} onClick={() => tip.mutate()}>
          {tip.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {tipResult ? "Nova dica" : "O que responder agora?"}
        </Button>
        {tipResult && (
          <div className="bg-muted/50 space-y-1.5 rounded-lg p-2 text-xs">
            <p>
              <span className="font-semibold">Situação: </span>
              {tipResult.situation}
            </p>
            <p>
              <span className="font-semibold">Próximo passo: </span>
              {tipResult.nextStep}
            </p>
            <p className="bg-card rounded-md border p-2 text-sm whitespace-pre-wrap">{tipResult.message}</p>
            <p className="text-muted-foreground">{tipResult.why}</p>
            <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => insert(tipResult.message)}>
              <CornerDownLeft className="h-3.5 w-3.5" />
              Usar na mensagem
            </Button>
          </div>
        )}
      </div>

      {lastFeedback && (
        <div className="rounded-lg border p-2 text-xs">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 text-left font-semibold"
            aria-expanded={showFeedback}
            onClick={() => setShowFeedback((value) => !value)}
          >
            <span className="flex items-center gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" />
              Feedback do último atendimento · {lastFeedback.score}/100
            </span>
            <span className="text-muted-foreground font-normal">{showFeedback ? "Fechar" : "Ver"}</span>
          </button>
          {showFeedback && (
            <div className="mt-2 space-y-1.5">
              <p>{lastFeedback.summary}</p>
              {lastFeedback.strengths.length > 0 && (
                <p>
                  <span className="font-semibold">Acertos: </span>
                  {lastFeedback.strengths.join("; ")}
                </p>
              )}
              {lastFeedback.improvements.length > 0 && (
                <p>
                  <span className="font-semibold">Para melhorar: </span>
                  {lastFeedback.improvements.join("; ")}
                </p>
              )}
              {lastFeedback.missedOpportunity && (
                <p>
                  <span className="font-semibold">Oportunidade: </span>
                  {lastFeedback.missedOpportunity}
                </p>
              )}
              {lastFeedback.suggestedMessage && <p className="text-muted-foreground italic">"{lastFeedback.suggestedMessage}"</p>}
              <Link className="text-primary underline-offset-4 hover:underline" to={`${baseUrl}/management?tab=coaching`}>
                Ver o coach completo
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
