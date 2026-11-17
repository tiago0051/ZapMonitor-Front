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
import { ArrowRight, Check, Clock, RotateCcw, Send, Wand2, X } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import {
  addDaysToDate,
  changeStateLabel,
  changeStatusInfo,
  suggestionActionLabel,
  suggestionPriorityInfo,
  suggestionSourceLabel,
  targetLevelLabel,
} from "../adsUtils";

const Detail: FC<{ label: string; text: string }> = ({ label, text }) =>
  text ? (
    <div>
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide uppercase">{label}</p>
      <p className="text-sm whitespace-pre-wrap">{text}</p>
    </div>
  ) : null;

// Motivos comuns de recusa: viram aprendizado para a IA não repetir a ideia
const REJECT_REASONS = [
  "Não mexer nesta campanha",
  "Verba já está no limite",
  "Momento errado (sazonal)",
  "Os dados não convencem",
  "Já fiz de outro jeito",
];

type AdSuggestionCardProps = { suggestion: AdSuggestion; currency: string; compact?: boolean };

/** Sugestão com o problema, a evidência, a mudança e o impacto; quem gerencia aceita, recusa, adia ou reabre. */
export const AdSuggestionCard: FC<AdSuggestionCardProps> = ({ suggestion, currency, compact }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(!compact);
  const [postponeDate, setPostponeDate] = useState(() => addDaysToDate(new Date().toISOString().substring(0, 10), 7));
  const priority = suggestionPriorityInfo[suggestion.priority];

  const [rejectReasons, setRejectReasons] = useState<string[]>([]);
  const [rejectText, setRejectText] = useState("");
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  // Só ações que o sistema executa podem ser aplicadas; MANUAL é orientação
  const isExecutable = !!suggestion.action && suggestion.action.type !== "MANUAL";
  const canApprove = can("ads.approve");

  const decide = useMutation({
    mutationFn: metaAdsService.decideSuggestion,
    onError: requestErrorHandling,
    onSuccess: (decided, { body }) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["metaAds", "changes"] });
      if (body.applyNow && decided.change?.status === "APPLIED") toast.success("Mudança aplicada");
      else if (body.applyNow && decided.change?.status === "BLOCKED") toast.warning("A trava bloqueou a mudança; veja o motivo no card");
      else if (body.status === "ACCEPTED" && !body.applyNow && decided.change) toast.success("Enviada para aprovação");
    },
  });
  const send = (status: AdSuggestionStatus, options: { postponedUntil?: string; note?: string; applyNow?: boolean } = {}) =>
    decide.mutate({
      params: { clientId: client.id, suggestionId: suggestion.id },
      body: {
        status,
        note: options.note ?? null,
        applyNow: options.applyNow,
        postponedUntil: options.postponedUntil ? new Date(`${options.postponedUntil}T09:00:00`).toISOString() : null,
      },
    });
  const reject = () => {
    const note = [...rejectReasons, rejectText.trim()].filter(Boolean).join(". ");
    send("REJECTED", { note: note || undefined });
    setIsRejectOpen(false);
  };

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
          {suggestion.status === "ACCEPTED" &&
            !suggestion.change &&
            suggestion.action?.type === "MANUAL" &&
            ". Faça a mudança no Gerenciador de Anúncios."}
        </p>
      )}

      {suggestion.change && suggestion.action && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-muted rounded px-2 py-1">{changeStateLabel(suggestion.action.type, suggestion.change.before, currency)}</span>
          <ArrowRight className="text-muted-foreground h-3.5 w-3.5" />
          <span className="bg-primary/10 text-primary rounded px-2 py-1 font-medium">
            {changeStateLabel(suggestion.action.type, suggestion.change.after, currency)}
          </span>
        </div>
      )}

      {suggestion.status === "REJECTED" && suggestion.decisionNote && (
        <p className="text-muted-foreground text-xs">Motivo: {suggestion.decisionNote}</p>
      )}

      {suggestion.change && (
        <p className="flex flex-wrap items-center gap-2 text-xs">
          <span className={cn("rounded px-1.5 py-0.5 font-medium", changeStatusInfo[suggestion.change.status].className)}>
            {changeStatusInfo[suggestion.change.status].label}
          </span>
          {suggestion.change.status === "PENDING_APPROVAL" && (
            <span className="text-muted-foreground">{canApprove ? "Aprove na aba Mudanças." : "Quem aprova os anúncios foi avisado."}</span>
          )}
          {suggestion.change.status === "BLOCKED" && <span className="text-muted-foreground">Bloqueada pela trava:</span>}
          {suggestion.change.error && suggestion.change.status !== "APPLIED" && (
            <span className="text-destructive">{suggestion.change.error}</span>
          )}
        </p>
      )}

      {can("ads.manage") && (
        <footer className="flex flex-wrap gap-2">
          {suggestion.status === "OPEN" ? (
            <>
              {isExecutable && canApprove ? (
                <Button size="sm" disabled={decide.isPending} onClick={() => send("ACCEPTED", { applyNow: true })}>
                  <Check className="h-3.5 w-3.5" />
                  Aplicar agora
                </Button>
              ) : isExecutable ? (
                <Button size="sm" disabled={decide.isPending} onClick={() => send("ACCEPTED")}>
                  <Send className="h-3.5 w-3.5" />
                  Enviar para aprovação
                </Button>
              ) : (
                <Button size="sm" disabled={decide.isPending} onClick={() => send("ACCEPTED")}>
                  <Check className="h-3.5 w-3.5" />
                  Aceitar
                </Button>
              )}
              <Popover open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                <PopoverTrigger asChild>
                  <Button size="sm" variant="outline" disabled={decide.isPending}>
                    <X className="h-3.5 w-3.5" />
                    Recusar
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-72 space-y-2">
                  <p className="text-xs">Por que não? A IA aprende com o motivo e não repete a ideia.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {REJECT_REASONS.map((reason) => {
                      const isSelected = rejectReasons.includes(reason);
                      return (
                        <button
                          key={reason}
                          type="button"
                          aria-pressed={isSelected}
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-xs",
                            isSelected ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                          )}
                          onClick={() =>
                            setRejectReasons((current) => (isSelected ? current.filter((item) => item !== reason) : [...current, reason]))
                          }
                        >
                          {reason}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    className="border-input bg-background focus-visible:ring-ring w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-1 focus-visible:outline-none"
                    rows={2}
                    maxLength={600}
                    placeholder="Outro motivo (opcional)"
                    value={rejectText}
                    onChange={(event) => setRejectText(event.target.value)}
                  />
                  <Button size="sm" className="w-full" onClick={reject}>
                    Recusar
                  </Button>
                </PopoverContent>
              </Popover>
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
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={!postponeDate}
                    onClick={() => send("POSTPONED", { postponedUntil: postponeDate })}
                  >
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
