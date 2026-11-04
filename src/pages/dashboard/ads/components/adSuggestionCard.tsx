import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Check, Clock, RotateCcw, Wand2, X } from "lucide-react";
import { useState, type FC } from "react";
import { addDaysToDate, suggestionActionLabel, suggestionPriorityInfo, suggestionSourceLabel, targetLevelLabel } from "../adsUtils";

const Detail: FC<{ label: string; text: string }> = ({ label, text }) =>
  text ? (
    <div>
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  ) : null;

type AdSuggestionCardProps = { suggestion: AdSuggestion; currency: string; compact?: boolean };

/** Sugestão com o problema, a evidência, a mudança e o impacto; quem gerencia aceita, recusa, adia ou reabre. */
export const AdSuggestionCard: FC<AdSuggestionCardProps> = ({ suggestion, currency, compact }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(!compact);
  const [postponeDate, setPostponeDate] = useState(() => addDaysToDate(new Date().toISOString().substring(0, 10), 7));
  const priority = suggestionPriorityInfo[suggestion.priority];

  const decide = useMutation({
    mutationFn: metaAdsService.decideSuggestion,
    onError: requestErrorHandling,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metaAds", "suggestions"] }),
  });
  const send = (status: AdSuggestionStatus, postponedUntil?: string) =>
    decide.mutate({
      params: { clientId: client.id, suggestionId: suggestion.id },
      body: { status, postponedUntil: postponedUntil ? new Date(`${postponedUntil}T09:00:00`).toISOString() : null },
    });

  return (
    <article className="bg-card space-y-3 rounded-lg border p-3">
      <header className="flex flex-wrap items-start gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", priority.className)}>{priority.label}</span>
        <div className="min-w-0 flex-1">
          <button type="button" className="text-left text-sm font-semibold hover:underline" onClick={() => setIsOpen((value) => !value)}>
            {suggestion.title}
          </button>
          <p className="text-muted-foreground text-xs">
            {suggestion.targetLevel && suggestion.targetName
              ? `${targetLevelLabel[suggestion.targetLevel]}: ${suggestion.targetName}`
              : "Conta inteira"}{" "}
            · {suggestionSourceLabel[suggestion.source]} · {format(new Date(suggestion.createdAt), "dd/MM HH:mm")}
          </p>
        </div>
        <span className="bg-primary/10 text-primary inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium">
          <Wand2 className="h-3 w-3" />
          {suggestionActionLabel(suggestion.action, currency)}
        </span>
      </header>

      {isOpen && (
        <div className="grid gap-2 sm:grid-cols-2">
          <Detail label="Problema" text={suggestion.problem} />
          <Detail label="Evidência" text={suggestion.evidence} />
          <Detail label="Mudança proposta" text={suggestion.proposedChange} />
          <Detail label="Impacto esperado" text={suggestion.expectedImpact} />
        </div>
      )}

      {suggestion.status !== "OPEN" && (
        <p className="text-muted-foreground text-xs">
          {suggestion.status === "ACCEPTED" && "Aceita"}
          {suggestion.status === "REJECTED" && "Recusada"}
          {suggestion.status === "POSTPONED" &&
            `Adiada até ${suggestion.postponedUntil ? format(new Date(suggestion.postponedUntil), "dd/MM/yyyy", { locale: ptBR }) : "—"}`}
          {suggestion.decidedByName && ` por ${suggestion.decidedByName}`}
          {suggestion.decidedAt && ` em ${format(new Date(suggestion.decidedAt), "dd/MM HH:mm")}`}
          {suggestion.status === "ACCEPTED" && ". A aplicação na Meta com aprovação chega na próxima fase."}
        </p>
      )}

      {can("ads.manage") && (
        <footer className="flex flex-wrap gap-2">
          {suggestion.status === "OPEN" ? (
            <>
              <Button size="sm" disabled={decide.isPending} onClick={() => send("ACCEPTED")}>
                <Check className="h-3.5 w-3.5" />
                Aceitar
              </Button>
              <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => send("REJECTED")}>
                <X className="h-3.5 w-3.5" />
                Recusar
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="ghost" disabled={decide.isPending}>
                    <Clock className="h-3.5 w-3.5" />
                    Adiar
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-60 space-y-2">
                  <p className="text-xs">A sugestão volta a ficar aberta em:</p>
                  <Input type="date" value={postponeDate} onChange={(event) => setPostponeDate(event.target.value)} />
                  <Button size="sm" className="w-full" disabled={!postponeDate} onClick={() => send("POSTPONED", postponeDate)}>
                    Adiar
                  </Button>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <Button size="sm" variant="ghost" disabled={decide.isPending} onClick={() => send("OPEN")}>
              <RotateCcw className="h-3.5 w-3.5" />
              Reabrir
            </Button>
          )}
        </footer>
      )}
    </article>
  );
};
