import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus, Target } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StrategyLibrary } from "./strategyLibrary";
import { useState } from "react";
import { Link } from "react-router";
import { StrategyBriefDialog } from "./strategyBriefDialog";
import { goalLabel, strategyStatusInfo, verdictInfo } from "./strategyUtils";

/** Estratégias de marketing: o cliente descreve o produto e a IA monta o passo a passo a partir de estratégias conhecidas. */
export const StrategiesPage = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const canManage = can("strategies.manage");

  const strategiesQuery = useQuery({
    queryKey: ["marketingStrategies", client.id],
    queryFn: () => marketingStrategyService.findAll(client.id),
    refetchInterval: (query) => (query.state.data?.some((item) => item.status === "GENERATING") ? 4000 : false),
  });
  const strategies = strategiesQuery.data ?? [];
  const active = strategies.filter((item) => item.status !== "ARCHIVED");
  const archived = strategies.filter((item) => item.status === "ARCHIVED");

  const newButton = canManage && (
    <Button onClick={() => setIsCreateOpen(true)}>
      <Plus className="h-4 w-4" />
      Nova estratégia
    </Button>
  );

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h1 className="text-2xl font-semibold">Estratégias</h1>
          <p className="text-muted-foreground text-sm">
            Descreva o produto e a IA monta um passo a passo seguindo estratégias conhecidas no mercado. Cada passo cria o rascunho certo
            (campanha, postagem, tarefa) e tudo o que nasce dela leva a marca da estratégia, para dar para medir o que funcionou.
          </p>
        </div>
        {newButton}
      </div>

      <Tabs defaultValue="strategies">
        <TabsList>
          <TabsTrigger value="strategies">Minhas estratégias</TabsTrigger>
          <TabsTrigger value="library">Biblioteca</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="pt-4">
          <StrategyLibrary />
        </TabsContent>
        <TabsContent value="strategies" className="pt-4">
          {strategiesQuery.isLoading ? (
            <LoadingState />
          ) : strategiesQuery.isError ? (
            <ErrorState message="Não foi possível carregar as estratégias" onRetry={() => strategiesQuery.refetch()} />
          ) : strategies.length === 0 ? (
            <EmptyState
              icon={Target}
              title="Nenhuma estratégia ainda"
              description="Conte qual produto quer vender, para quem e com qual objetivo. A IA escolhe a estratégia que combina e monta os passos com metas."
              action={newButton}
            />
          ) : (
            <div className="space-y-6">
              <StrategyList strategies={active} baseUrl={baseUrl} />
              {archived.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-muted-foreground text-sm font-medium">Arquivadas</h2>
                  <StrategyList strategies={archived} baseUrl={baseUrl} />
                </section>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {isCreateOpen && <StrategyBriefDialog onClose={() => setIsCreateOpen(false)} />}
    </div>
  );
};

const StrategyList = ({ strategies, baseUrl }: { strategies: MarketingStrategySummary[]; baseUrl: string }) => (
  <ul className="grid gap-3 md:grid-cols-2">
    {strategies.map((strategy) => {
      const status = strategyStatusInfo[strategy.status];
      const progress = strategy.stepCount ? Math.round((strategy.doneCount / strategy.stepCount) * 100) : 0;

      return (
        <li key={strategy.id}>
          <Link
            to={`${baseUrl}/strategies/${strategy.id}`}
            className="hover:bg-muted/40 focus-visible:ring-ring/50 grid h-full gap-2 rounded-lg border p-4 outline-none focus-visible:ring-[3px]"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
              {strategy.verdict && strategy.verdict !== "NO_DATA" && (
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", verdictInfo[strategy.verdict].className)}>
                  {verdictInfo[strategy.verdict].label}
                </span>
              )}
            </div>
            {strategy.verdict && strategy.verdict !== "NO_DATA" && strategy.verdictReason && (
              <p className="text-muted-foreground text-xs">{strategy.verdictReason}</p>
            )}
            <p className="font-medium">{strategy.name}</p>
            <p className="text-muted-foreground text-sm">
              {goalLabel[strategy.goal]}
              {strategy.playbook && ` · ${strategy.playbook.name}`}
            </p>
            {strategy.status === "FAILED" && strategy.error && <p className="text-destructive text-sm">{strategy.error}</p>}
            {strategy.stepCount > 0 && (
              <div className="flex items-center gap-2 text-xs">
                <div
                  className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Passos feitos"
                >
                  <div className="h-full bg-green-600" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-muted-foreground tabular-nums">
                  {strategy.doneCount}/{strategy.stepCount} passos
                </span>
              </div>
            )}
            <p className="text-muted-foreground text-xs">
              Criada em {format(new Date(strategy.createdAt), "dd/MM/yyyy")}
              {strategy.linkCount > 0 && ` · ${strategy.linkCount} item(ns) criados por ela`}
            </p>
          </Link>
        </li>
      );
    })}
  </ul>
);
