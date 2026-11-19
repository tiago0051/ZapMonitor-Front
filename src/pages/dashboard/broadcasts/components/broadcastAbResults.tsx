import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { broadcastService } from "@/services/api/broadcastService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Trophy } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { formatCount, rate } from "../broadcastUtils";

const percent = (value: number | null) => (value === null ? "—" : `${value}%`);

/** Teste A/B de modelo: os dois lado a lado, o vencedor e a escolha na mão enquanto o teste roda. */
export const BroadcastAbResults: FC<{ broadcast: Broadcast; results: BroadcastMetrics["ab"] }> = ({ broadcast, results }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const abTest = broadcast.abTest!;
  const testing = abTest.phase === "TESTING";
  const metricLabel = abTest.metric === "REPLY" ? "respostas" : "negócios";

  const choose = useMutation({
    mutationFn: (variant: "A" | "B") => broadcastService.chooseAbWinner(client.id, broadcast.id, variant),
    onError: requestErrorHandling,
    onSuccess: (_, variant) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id] });
      toast.success(`Modelo ${variant} escolhido; o resto da lista recebe ele`);
    },
  });

  return (
    <section className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-semibold">Teste A/B de modelo</h2>
        <p className="text-muted-foreground text-xs">
          {abTest.testPercent}% da lista no teste · vence quem tiver mais {metricLabel} por mensagem enviada
          {testing &&
            (abTest.decideAt
              ? ` · resultado em ${format(new Date(abTest.decideAt), "dd/MM 'às' HH:mm")}`
              : ` · espera de ${abTest.waitHours}h depois de começar`)}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {(["A", "B"] as const).map((variant) => {
          const totals = results?.[variant];
          const winner = abTest.winner === variant;
          return (
            <div
              key={variant}
              className={cn(
                "grid gap-2 rounded-lg border p-3",
                winner && "border-green-300 bg-green-50/60 dark:border-green-900 dark:bg-green-950/20",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  Modelo {variant}: {variant === "A" ? broadcast.templateName : abTest.templateName}
                </p>
                {winner && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-300">
                    <Trophy className="h-3.5 w-3.5" /> Vencedor
                  </span>
                )}
              </div>
              <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
                <div>
                  <dt className="text-muted-foreground text-xs">Enviadas</dt>
                  <dd className="font-semibold">{formatCount(totals?.sent ?? 0)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Respostas</dt>
                  <dd className="font-semibold">
                    {formatCount(totals?.replied ?? 0)}{" "}
                    <span className="text-muted-foreground text-xs">{percent(rate(totals?.replied ?? 0, totals?.sent ?? 0))}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground text-xs">Negócios</dt>
                  <dd className="font-semibold">
                    {formatCount(totals?.deals ?? 0)}{" "}
                    <span className="text-muted-foreground text-xs">{percent(rate(totals?.deals ?? 0, totals?.sent ?? 0))}</span>
                  </dd>
                </div>
              </dl>
              {testing && broadcast.startedAt && can("broadcasts.send") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  disabled={choose.isPending}
                  onClick={() => choose.mutate(variant)}
                >
                  Escolher o {variant} agora
                </Button>
              )}
            </div>
          );
        })}
      </div>
      {testing && (
        <p className="text-muted-foreground text-xs">
          Enquanto o teste roda, o resto da lista espera. Empate ou sem resultado fica com o modelo A.
        </p>
      )}
    </section>
  );
};
