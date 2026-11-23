import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  PartyPopper,
  RotateCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { StrategyBriefDialog } from "./strategyBriefDialog";
import { StrategyLinkList } from "./strategyLinkList";
import { StrategyMarkerHelp } from "./strategyMarkerHelp";
import { StrategyMissionCard } from "./strategyMissionCard";
import { StrategyResultsPanel } from "./strategyResultsPanel";
import { StrategyReviewPanel } from "./strategyReviewPanel";
import { StrategyStepCard } from "./strategyStepCard";
import { channelOptions, currentStep, formatMoney, goalLabel, strategyStatusInfo, verdictInfo } from "./strategyUtils";
import { StrategyValidationDialog } from "./strategyValidationDialog";

type DetailTab = "steps" | "results" | "about";
const TABS: DetailTab[] = ["steps", "results", "about"];

/**
 * Estratégia: o passo a passo vem primeiro, com o passo da vez em destaque. Resultados e o "porquê" da estratégia
 * (playbook, princípios, briefing) ficam em abas, para não empurrar os passos para baixo.
 */
export const StrategyDetailPage = () => {
  const { strategyId = "" } = useParams();
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isRedoOpen, setIsRedoOpen] = useState(false);
  const [validating, setValidating] = useState<MarketingStrategyLink | null>(null);
  // Passos abertos ou fechados pela pessoa; sem escolha, só o passo da vez fica aberto
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const canManage = can("strategies.manage");
  const tabParam = searchParams.get("tab") as DetailTab | null;
  const tab: DetailTab = tabParam && TABS.includes(tabParam) ? tabParam : "steps";

  const strategyQuery = useQuery({
    queryKey: ["marketingStrategy", client.id, strategyId],
    queryFn: () => marketingStrategyService.find(client.id, strategyId),
    refetchInterval: (query) => (query.state.data?.status === "GENERATING" ? 4000 : false),
  });
  const strategy = strategyQuery.data;

  const onSaved = (saved: MarketingStrategy) => {
    queryClient.setQueryData(["marketingStrategy", client.id, saved.id], saved);
    queryClient.invalidateQueries({ queryKey: ["marketingStrategies", client.id] });
  };

  const archive = useMutation({
    mutationFn: (archived: boolean) => marketingStrategyService.update(client.id, strategyId, { archived }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      onSaved(saved);
      toast.success(saved.status === "ARCHIVED" ? "Estratégia arquivada" : "Estratégia de volta à lista");
    },
  });
  const remove = useMutation({
    mutationFn: () => marketingStrategyService.delete(client.id, strategyId),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketingStrategies", client.id] });
      toast.success("Estratégia excluída");
      navigate(`${baseUrl}/strategies`);
    },
  });
  const unlink = useMutation({
    mutationFn: (linkId: string) => marketingStrategyService.unlink(client.id, strategyId, linkId),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      onSaved(saved);
      toast.success("Item desligado da estratégia");
    },
  });
  const retry = useMutation({
    mutationFn: () => marketingStrategyService.regenerate(client.id, strategyId, {}),
    onError: requestErrorHandling,
    onSuccess: onSaved,
  });

  if (strategyQuery.isLoading) return <LoadingState />;
  if (strategyQuery.isError || !strategy)
    return <ErrorState message="Não foi possível carregar a estratégia" onRetry={() => strategyQuery.refetch()} />;

  const status = strategyStatusInfo[strategy.status];
  const phases = strategy.steps.reduce<{ name: string; steps: MarketingStrategyStep[] }[]>((groups, step) => {
    const last = groups.at(-1);
    if (last?.name === step.phase) last.steps.push(step);
    else groups.push({ name: step.phase, steps: [step] });
    return groups;
  }, []);
  const doneCount = strategy.steps.filter((step) => step.status === "DONE").length;
  const closedCount = strategy.steps.filter((step) => step.status === "DONE" || step.status === "SKIPPED").length;
  const progress = strategy.steps.length ? Math.round((closedCount / strategy.steps.length) * 100) : 0;
  const isGenerating = strategy.status === "GENERATING";
  const hasPlan = strategy.status === "READY" || strategy.status === "ARCHIVED";
  const current = currentStep(strategy.steps);
  const hasVerdict = !!strategy.verdict && strategy.verdict !== "NO_DATA";

  const setTab = (next: string) => setSearchParams(next === "steps" ? {} : { tab: next }, { replace: true });
  const isExpanded = (step: MarketingStrategyStep) => toggled[step.id] ?? step.id === current?.id;
  const goToStep = (step: MarketingStrategyStep) => {
    setTab("steps");
    setToggled((state) => ({ ...state, [step.id]: true }));
    requestAnimationFrame(() => document.getElementById(`step-${step.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const confirmDelete = async () => {
    const linked = strategy.steps.reduce((sum, step) => sum + step.links.length, strategy.unassignedLinks.length);
    if (
      await confirm({
        title: "Excluir a estratégia?",
        description: linked
          ? `Os ${linked} item(ns) criados por ela (campanhas, postagens, tarefas) continuam existindo, mas perdem o vínculo com a estratégia.`
          : "O passo a passo será apagado.",
        confirmLabel: "Excluir",
        destructive: true,
      })
    )
      remove.mutate();
  };

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-4xl space-y-5 p-4 md:p-6">
        {confirmDialog}

        <header className="flex items-start gap-2">
          <Button variant="ghost" size="icon" asChild className="-ml-2 shrink-0">
            <Link to={`${baseUrl}/strategies`} aria-label="Voltar para as estratégias" title="Voltar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1 space-y-1">
            <h1 className="text-xl font-semibold text-balance sm:text-2xl">{strategy.name}</h1>
            <p className="text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
              {hasVerdict && (
                <span
                  className={cn("rounded px-1.5 py-0.5 text-xs font-medium", verdictInfo[strategy.verdict!].className)}
                  title={strategy.verdictReason ?? undefined}
                >
                  {verdictInfo[strategy.verdict!].label}
                </span>
              )}
              <span>
                {strategy.brief.product} · {goalLabel[strategy.brief.goal]}
              </span>
            </p>
          </div>
          {canManage && !isGenerating && (
            <div className="flex shrink-0 gap-1">
              <Button variant="outline" size="sm" onClick={() => setIsRedoOpen(true)} title="Mudar o briefing e montar o plano de novo">
                <Sparkles className="h-4 w-4" />
                <span className="hidden sm:inline">Refazer</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Mais opções da estratégia">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem disabled={archive.isPending} onSelect={() => archive.mutate(strategy.status !== "ARCHIVED")}>
                    {strategy.status === "ARCHIVED" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                    {strategy.status === "ARCHIVED" ? "Desarquivar" : "Arquivar"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" disabled={remove.isPending} onSelect={confirmDelete}>
                    <Trash2 className="h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </header>

        {isGenerating && (
          <div role="status" className="bg-muted/40 flex items-center gap-3 rounded-lg border p-4 text-sm">
            <Loader2 className="h-5 w-5 shrink-0 animate-spin" />A IA está lendo o produto e a base da marca, escolhendo a estratégia e
            montando os passos. Leva cerca de um minuto.
          </div>
        )}

        {strategy.status === "FAILED" && (
          <div role="alert" className="border-destructive/40 flex flex-wrap items-center gap-3 rounded-lg border p-4 text-sm">
            <p className="text-destructive min-w-0 flex-1">{strategy.error ?? "A IA não conseguiu montar a estratégia."}</p>
            {canManage && (
              <Button variant="outline" size="sm" disabled={retry.isPending} onClick={() => retry.mutate()}>
                <RotateCw className="h-4 w-4" />
                Tentar de novo
              </Button>
            )}
          </div>
        )}

        {hasPlan && strategy.steps.length > 0 && (
          <section aria-label="Andamento" className="bg-muted/30 grid gap-3 rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Progress value={progress} className="h-2 flex-1" aria-label="Passos concluídos" />
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                {doneCount} de {strategy.steps.length} passos feitos
              </span>
            </div>
            {current ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <p className="min-w-0 flex-1 text-sm">
                  <span className="text-muted-foreground">Próximo passo: </span>
                  <span className="font-medium">
                    {current.order}. {current.title}
                  </span>
                </p>
                {tab !== "steps" || !isExpanded(current) ? (
                  <Button size="sm" variant="outline" onClick={() => goToStep(current)}>
                    Ir para o passo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            ) : (
              <p className="flex items-center gap-2 text-sm">
                <PartyPopper className="h-4 w-4 text-green-600" aria-hidden />
                Todos os passos foram feitos. Acompanhe o que deu resultado na aba Resultados.
              </p>
            )}
          </section>
        )}

        {hasPlan && (
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full sm:w-auto">
              <TabsTrigger value="steps">Passo a passo</TabsTrigger>
              <TabsTrigger value="results">Resultados</TabsTrigger>
              <TabsTrigger value="about">Sobre a estratégia</TabsTrigger>
            </TabsList>

            <TabsContent value="steps" className="space-y-6 pt-4">
              {strategy.coreMessage && (
                <p className="border-primary/50 border-l-2 pl-3 text-sm">
                  <span className="text-muted-foreground block text-xs">Mensagem central de tudo o que a estratégia cria</span>
                  {strategy.coreMessage}
                </p>
              )}
              {phases.map((phase, index) => (
                <section key={`${index}-${phase.name}`} className="space-y-2">
                  <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{phase.name}</h2>
                  <ol className="grid gap-2">
                    {phase.steps.map((step) => (
                      <StrategyStepCard
                        key={step.id}
                        strategy={strategy}
                        step={step}
                        canManage={canManage}
                        isCurrent={step.id === current?.id}
                        expanded={isExpanded(step)}
                        onToggle={() => setToggled((state) => ({ ...state, [step.id]: !isExpanded(step) }))}
                        onSaved={onSaved}
                      />
                    ))}
                  </ol>
                </section>
              ))}

              {strategy.unassignedLinks.length > 0 && (
                <section className="space-y-2">
                  <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">Ligados à estratégia sem passo</h2>
                  <p className="text-muted-foreground text-xs">Itens ligados à mão ou de uma versão anterior do plano.</p>
                  <StrategyLinkList
                    links={strategy.unassignedLinks}
                    canManage={canManage}
                    onValidate={setValidating}
                    onUnlink={(linkId) => unlink.mutate(linkId)}
                  />
                </section>
              )}
            </TabsContent>

            <TabsContent value="results" className="grid gap-4 pt-4">
              <StrategyResultsPanel strategy={strategy} canManage={canManage} onSaved={onSaved} />
              <div className="grid gap-4 lg:grid-cols-2">
                <StrategyReviewPanel strategy={strategy} canManage={canManage} />
                <StrategyMissionCard strategy={strategy} canManage={canManage} />
              </div>
            </TabsContent>

            <TabsContent value="about" className="grid gap-4 pt-4">
              <StrategyAbout strategy={strategy} />
              <StrategyBriefSummary brief={strategy.brief} startsOn={strategy.startsOn} />
              <StrategyMarkerHelp marker={strategy.marker} />
            </TabsContent>
          </Tabs>
        )}

        {validating && (
          <StrategyValidationDialog
            strategy={strategy}
            link={validating}
            canManage={canManage}
            onClose={() => setValidating(null)}
            onSaved={onSaved}
          />
        )}

        {isRedoOpen && <StrategyBriefDialog strategy={strategy} onClose={() => setIsRedoOpen(false)} />}
      </div>
    </div>
  );
};

/** Por que esta estratégia: o playbook escolhido, a justificativa, os princípios e como validar. */
const StrategyAbout = ({ strategy }: { strategy: MarketingStrategy }) => {
  if (!strategy.playbook) return null;
  const { playbook } = strategy;

  return (
    <section className="grid gap-4 rounded-lg border p-4">
      <div className="space-y-1">
        <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Estratégia escolhida</p>
        <h2 className="text-lg font-semibold">{playbook.name}</h2>
        <p className="text-muted-foreground text-xs">{playbook.origin}</p>
      </div>
      {strategy.rationale && <p className="text-sm">{strategy.rationale}</p>}
      {strategy.summary && <p className="text-muted-foreground text-sm">{strategy.summary}</p>}
      {strategy.secondaryPlaybook && (
        <p className="text-muted-foreground text-xs">
          Complementada por <span className="text-foreground font-medium">{strategy.secondaryPlaybook.name}</span>
          {strategy.secondaryPlaybook.summary && `: ${strategy.secondaryPlaybook.summary}`}
        </p>
      )}
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="mb-1 font-medium">Princípios</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4">
            {playbook.principles.map((principle) => (
              <li key={principle}>{principle}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="mb-1 font-medium">Como saber se funcionou</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-4">
            {playbook.validation.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
      {playbook.sources.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {playbook.sources.map((source) => (
            <a
              key={source.url}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              {source.title}
            </a>
          ))}
        </div>
      )}
    </section>
  );
};

/** O que foi pedido para a IA: produto, público, prazo, verba e canais. */
const StrategyBriefSummary = ({ brief, startsOn }: { brief: MarketingBrief; startsOn: string | null }) => {
  const channels = brief.channels.map((channel) => channelOptions.find((option) => option.value === channel)?.label ?? channel);
  const items: [string, string | null][] = [
    ["Objetivo", goalLabel[brief.goal]],
    ["Preço", brief.price],
    ["Público", brief.audience],
    ["Diferencial", brief.differentiator],
    ["Prazo", brief.deadlineDays ? `${brief.deadlineDays} dia(s)` : null],
    ["Começou em", startsOn ? format(new Date(startsOn), "dd/MM/yyyy") : null],
    ["Verba por mês", brief.monthlyBudget ? formatMoney(brief.monthlyBudget) : null],
    ["Canais", channels.length ? channels.join("; ") : null],
  ];

  return (
    <section className="grid gap-3 rounded-lg border p-4 text-sm">
      <h2 className="font-medium">O que foi pedido para a IA</h2>
      <p className="font-medium">{brief.product}</p>
      {brief.description && <p className="text-muted-foreground whitespace-pre-line">{brief.description}</p>}
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {items
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="break-words">{value}</dd>
            </div>
          ))}
      </dl>
      {brief.notes && (
        <div>
          <p className="text-muted-foreground text-xs">Observações</p>
          <p className="whitespace-pre-line">{brief.notes}</p>
        </div>
      )}
    </section>
  );
};
