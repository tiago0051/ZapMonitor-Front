import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { aiFieldUpdateService } from "@/services/api/aiFieldUpdateService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type AiFieldUpdatesProps = {
  // Ficha do contato ou negócio
  owner: { contactId: string } | { dealId: string };
  // Chamado depois de aceitar, para recarregar a ficha ou o negócio
  onAccepted?: () => void;
};

const sourceLabel: Record<AiFieldUpdateSource, string> = {
  SERVICE_SUMMARY: "resumo do atendimento",
  DEAL_ANALYSIS: "análise do negócio",
  AGENT: "agente de IA",
};

const Evidence: FC<{ text: string | null }> = ({ text }) =>
  text ? <blockquote className="text-muted-foreground border-l-2 pl-2 text-xs italic">“{text}”</blockquote> : null;

/** Sugestões da IA para aceitar ou descartar e o que ela já preencheu, sempre com o trecho da conversa. */
export const AiFieldUpdates: FC<AiFieldUpdatesProps> = ({ owner, onAccepted }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const ownerId = "contactId" in owner ? owner.contactId : owner.dealId;
  const queryKey = ["aiFieldUpdates", client.id, ownerId];

  const query = useQuery({
    queryKey,
    queryFn: () =>
      "contactId" in owner
        ? aiFieldUpdateService.findByContact(client.id, owner.contactId)
        : aiFieldUpdateService.findByDeal(client.id, owner.dealId),
  });

  const resolve = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      accept ? aiFieldUpdateService.accept(client.id, id) : aiFieldUpdateService.dismiss(client.id, id),
    onError: requestErrorHandling,
    onSuccess: (_result, { accept }) => {
      queryClient.invalidateQueries({ queryKey });
      if (accept) {
        onAccepted?.();
        toast.success("Valor da IA gravado");
      }
    },
  });

  const updates = query.data ?? [];
  const pending = updates.filter((update) => update.status === "PENDING");
  const history = updates.filter((update) => update.status === "APPLIED" || update.status === "ACCEPTED");
  if (pending.length === 0 && history.length === 0) return null;

  return (
    <section className="grid gap-2">
      <h3 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
        <Sparkles className="text-primary h-3 w-3" />
        Preenchimento pela IA
      </h3>

      {pending.map((update) => (
        <div key={update.id} className="border-primary/30 bg-primary/5 grid gap-1.5 rounded-lg border px-3 py-2 text-sm">
          <p>
            <span className="font-medium">{update.label}:</span> {update.value}
            {update.previousValue && <span className="text-muted-foreground"> (hoje: {update.previousValue})</span>}
          </p>
          <Evidence text={update.evidence} />
          <div className="flex gap-2">
            <Button size="sm" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: update.id, accept: true })}>
              Usar este valor
            </Button>
            <Button size="sm" variant="ghost" disabled={resolve.isPending} onClick={() => resolve.mutate({ id: update.id, accept: false })}>
              Descartar
            </Button>
          </div>
        </div>
      ))}

      {history.length > 0 && (
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground justify-self-start text-xs underline-offset-2 hover:underline"
          aria-expanded={showHistory}
          onClick={() => setShowHistory((current) => !current)}
        >
          {showHistory ? "Esconder" : "Ver"} o que a IA preencheu ({history.length})
        </button>
      )}
      {showHistory && (
        <ul className="grid gap-2">
          {history.map((update) => (
            <li key={update.id} className="grid gap-1 text-sm">
              <p>
                <span className="font-medium">{update.label}:</span> {update.value}
              </p>
              <p className="text-muted-foreground text-xs">
                {update.status === "ACCEPTED" ? "Sugestão aceita" : "Preenchido"} pelo {sourceLabel[update.source]} em{" "}
                {format(new Date(update.createdAt), "dd/MM/yyyy HH:mm")}
              </p>
              <Evidence text={update.evidence} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
