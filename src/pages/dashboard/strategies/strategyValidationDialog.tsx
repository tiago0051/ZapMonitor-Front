import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Loader2, ShieldCheck } from "lucide-react";
import { useState, type FC } from "react";
import { linkKindLabel } from "./strategyUtils";

type Props = {
  strategy: MarketingStrategy;
  link: MarketingStrategyLink;
  canManage: boolean;
  onClose: () => void;
  onSaved: (strategy: MarketingStrategy) => void;
};

const scoreClassName = (score: number, max: number) =>
  score / max >= 0.7
    ? "text-green-700 dark:text-green-400"
    : score / max >= 0.5
      ? "text-amber-700 dark:text-amber-400"
      : "text-destructive";

/** Validador: a IA avalia o anúncio ligado contra o playbook, o passo e as regras de política. */
export const StrategyValidationDialog: FC<Props> = ({ strategy, link, canManage, onClose, onSaved }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [result, setResult] = useState<MarketingAdValidation | null>(link.validation?.result ?? null);

  const validate = useMutation({
    mutationFn: () =>
      marketingStrategyService.validateAd(client.id, strategy.id, {
        kind: link.kind as "AD_DRAFT" | "AD_VIDEO_CAMPAIGN",
        objectId: link.objectId,
      }),
    onError: requestErrorHandling,
    onSuccess: async (validation) => {
      setResult(validation);
      const saved = await queryClient.fetchQuery({
        queryKey: ["marketingStrategy", client.id, strategy.id],
        queryFn: () => marketingStrategyService.find(client.id, strategy.id),
      });
      onSaved(saved);
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Validar anúncio</DialogTitle>
          <DialogDescription>
            {linkKindLabel[link.kind]} do passo, avaliado contra os princípios de "{strategy.playbook?.name ?? "estratégia"}", a mensagem
            central e as regras de política do segmento. Valide de novo depois de mudar os textos.
          </DialogDescription>
        </DialogHeader>

        {validate.isPending ? (
          <div role="status" className="text-muted-foreground flex items-center gap-2 py-6 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />A IA está lendo o anúncio…
          </div>
        ) : result ? (
          <div className="grid gap-4">
            <div className="flex flex-wrap items-baseline gap-3">
              <span className={cn("text-3xl font-semibold tabular-nums", scoreClassName(result.score, 100))}>{result.score}</span>
              <span className="text-muted-foreground text-sm">de 100</span>
              {link.validation && !validate.data && (
                <span className="text-muted-foreground text-xs">
                  avaliado em {format(new Date(link.validation.updatedAt), "dd/MM HH:mm")}
                </span>
              )}
            </div>
            {result.summary && <p className="text-sm">{result.summary}</p>}

            {result.compliance.length > 0 && (
              <ul className="grid gap-1.5">
                {result.compliance.map((issue, index) => (
                  <li
                    key={index}
                    className={cn(
                      "flex gap-2 rounded-md border p-2 text-sm",
                      issue.severity === "BLOCK" ? "border-destructive/40 text-destructive" : "border-amber-300 dark:border-amber-800",
                    )}
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    {issue.severity === "BLOCK" ? "Bloqueia a publicação: " : "Atenção: "}
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <tbody>
                  {result.criteria.map((criterion) => (
                    <tr key={criterion.key} className="border-b last:border-0">
                      <th scope="row" className="py-2 pr-3 text-left font-medium whitespace-nowrap">
                        {criterion.label}
                      </th>
                      <td className={cn("py-2 pr-3 font-semibold tabular-nums", scoreClassName(criterion.score, 10))}>
                        {criterion.score}/10
                      </td>
                      <td className="text-muted-foreground py-2">{criterion.comment}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {result.suggestions.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-medium">O que mudar</p>
                <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                  {result.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground py-4 text-sm">Este anúncio ainda não foi avaliado.</p>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
          {canManage && (
            <Button disabled={validate.isPending} onClick={() => validate.mutate()}>
              <ShieldCheck className="h-4 w-4" />
              {result ? "Validar de novo" : "Validar com a IA"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
