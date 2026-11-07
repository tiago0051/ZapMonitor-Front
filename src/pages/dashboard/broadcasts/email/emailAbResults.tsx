import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { emailCampaignService } from "@/services/api/emailCampaignService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trophy } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { formatCount, rate } from "../broadcastUtils";

const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

/** Resultado do teste A/B de assunto: as duas versões lado a lado e o vencedor (ou a escolha na mão). */
export const EmailAbResults: FC<{ campaign: EmailCampaign; subjectA: string }> = ({ campaign, subjectA }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const abTest = campaign.abTest!;
  const testing = abTest.phase === "TESTING";
  const metricLabel = abTest.metric === "OPEN" ? "aberturas" : "cliques";

  const choose = useMutation({
    mutationFn: (variant: "A" | "B") => emailCampaignService.chooseAbWinner(client.id, campaign.id, variant),
    onError: requestErrorHandling,
    onSuccess: (_, variant) => {
      queryClient.invalidateQueries({ queryKey: ["emailCampaigns", client.id] });
      toast.success(`Assunto ${variant} escolhido; o resto da lista recebe ele`);
    },
  });

  const variants = (["A", "B"] as const).map((variant) => {
    const totals = abTest.results?.[variant];
    return {
      variant,
      subject: variant === "A" ? subjectA : abTest.subjectB,
      totals,
      openRate: totals ? rate(totals.opened, totals.delivered) : null,
      clickRate: totals ? rate(totals.clicked, totals.delivered) : null,
    };
  });

  return (
    <section className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Teste A/B de assunto</h2>
        <p className="text-muted-foreground text-xs">
          {abTest.testPercent}% da lista no teste · vence quem tiver mais {metricLabel}
          {testing &&
            (abTest.decideAt
              ? ` · resultado em ${format(new Date(abTest.decideAt), "dd/MM 'às' HH:mm")}`
              : ` · espera de ${Math.round(abTest.waitMinutes / 60)}h depois do envio do teste`)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {variants.map((item) => {
          const winner = abTest.winner === item.variant;
          return (
            <div
              key={item.variant}
              className={cn("grid gap-2 rounded-lg border p-3", winner && "border-green-500 bg-green-50/50 dark:bg-green-950/20")}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold">Assunto {item.variant}</span>
                {winner && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                    <Trophy className="h-3.5 w-3.5" />
                    Vencedor
                  </span>
                )}
              </div>
              <p className="text-sm break-words">{item.subject}</p>
              <dl className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                <div>
                  <dt className="text-muted-foreground">Entregues</dt>
                  <dd className="font-medium">{formatCount(item.totals?.delivered ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Abertura</dt>
                  <dd className={cn("font-medium", abTest.metric === "OPEN" && "text-foreground")}>{percent(item.openRate)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Clique</dt>
                  <dd className="font-medium">{percent(item.clickRate)}</dd>
                </div>
              </dl>
              {testing && can("broadcasts.send") && (
                <Button
                  size="sm"
                  variant="outline"
                  className="justify-self-start"
                  disabled={choose.isPending}
                  onClick={() => choose.mutate(item.variant)}
                >
                  Escolher o {item.variant} agora
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {testing && (
        <p className="text-muted-foreground text-xs">
          O resto da lista espera o resultado. Escolher agora encerra o teste e manda o assunto escolhido para quem falta.
        </p>
      )}
    </section>
  );
};
