import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Target } from "lucide-react";
import { type FC, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type Props = { kinds: MarketingIntentKind[]; className?: string };

/**
 * Faixa no módulo de destino quando o usuário veio do atalho de um passo: o próximo item criado aqui fica ligado ao passo.
 * Cancelar desfaz o atalho no servidor, para nada ser ligado sem querer.
 */
export const StrategyIntentBanner: FC<Props> = ({ kinds, className }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const queryKey = ["marketingStrategy", client.id, "intent", kinds.join(",")];

  const query = useQuery({
    queryKey,
    queryFn: () => marketingStrategyService.findActiveIntent(client.id, kinds),
    enabled: can("strategies.manage"),
    staleTime: 30_000,
    // O atalho é consumido quando o item nasce; reconsulta para a faixa sumir sem recarregar a página
    refetchInterval: (q) => (q.state.data ? 20_000 : false),
  });
  const cancel = useMutation({
    mutationFn: () => marketingStrategyService.cancelIntents(client.id, kinds),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.setQueryData(queryKey, null);
      toast.success("Pronto: o que você criar aqui não fica ligado à estratégia");
    },
  });

  const intent = query.data;
  if (!intent) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950",
        className,
      )}
    >
      <Target className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
      <p className="min-w-0 flex-1">
        Criando para o passo {intent.stepOrder} ({intent.stepTitle}) da estratégia{" "}
        <Link to={`${baseUrl}/strategies/${intent.strategyId}`} className="font-medium underline-offset-2 hover:underline">
          {intent.strategyName}
        </Link>
        . O próximo item que você criar aqui fica ligado a ela.
      </p>
      <Button size="sm" variant="ghost" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
        Cancelar
      </Button>
    </div>
  );
};

/** Página de altura cheia com a faixa em cima, sem criar uma segunda barra de rolagem. */
export const StrategyIntentFrame: FC<{ kinds: MarketingIntentKind[]; children: ReactNode }> = ({ kinds, children }) => (
  <div className="flex h-full flex-col">
    <StrategyIntentBanner kinds={kinds} className="mx-4 mt-4 shrink-0 md:mx-6" />
    <div className="min-h-0 flex-1">{children}</div>
  </div>
);
