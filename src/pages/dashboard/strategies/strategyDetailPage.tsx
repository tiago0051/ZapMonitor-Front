import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Archive, ArchiveRestore, ArrowLeft, ExternalLink, Loader2, RotateCw, Sparkles, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { StrategyBriefDialog } from "./strategyBriefDialog";
import { StrategyLinkList } from "./strategyLinkList";
import { StrategyResultsPanel } from "./strategyResultsPanel";
import { StrategyReviewPanel } from "./strategyReviewPanel";
import { StrategyStepCard } from "./strategyStepCard";
import { goalLabel, strategyStatusInfo, verdictInfo } from "./strategyUtils";
import { StrategyValidationDialog } from "./strategyValidationDialog";

/** Estratégia: o playbook escolhido e por quê, a mensagem central e os passos com atalhos. */
export const StrategyDetailPage = () => {
  const { strategyId = "" } = useParams();
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [isRedoOpen, setIsRedoOpen] = useState(false);
  const [validating, setValidating] = useState<MarketingStrategyLink | null>(null);
  const canManage = can("strategies.manage");

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
  const isGenerating = strategy.status === "GENERATING";

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
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
      {confirmDialog}
      <div className="flex flex-wrap items-start gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${baseUrl}/strategies`} aria-label="Voltar para as estratégias" title="Voltar">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
            {strategy.verdict && strategy.verdict !== "NO_DATA" && (
              <span
                className={cn("rounded px-1.5 py-0.5 text-xs font-medium", verdictInfo[strategy.verdict].className)}
                title={strategy.verdictReason ?? undefined}
              >
                {verdictInfo[strategy.verdict].label}
              </span>
            )}
            <code
              className="bg-muted rounded px-1.5 py-0.5 text-xs"
              title="Vai no nome das campanhas e conjuntos criados pela estratégia, para reconhecer no Gerenciador de Anúncios"
            >
              {strategy.marker}
            </code>
            {strategy.steps.length > 0 && (
              <span className="text-muted-foreground text-xs tabular-nums">
                {doneCount}/{strategy.steps.length} passos feitos
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-balance">{strategy.name}</h1>
          <p className="text-muted-foreground text-sm">
            {strategy.brief.product} · {goalLabel[strategy.brief.goal]}
            {strategy.startsOn && ` · começou em ${format(new Date(strategy.startsOn), "dd/MM/yyyy")}`}
          </p>
        </div>
        {canManage && !isGenerating && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsRedoOpen(true)}>
              <Sparkles className="h-4 w-4" />
              Refazer
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={archive.isPending}
              aria-label={strategy.status === "ARCHIVED" ? "Desarquivar" : "Arquivar"}
              title={strategy.status === "ARCHIVED" ? "Desarquivar" : "Arquivar"}
              onClick={() => archive.mutate(strategy.status !== "ARCHIVED")}
            >
              {strategy.status === "ARCHIVED" ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={remove.isPending}
              aria-label="Excluir estratégia"
              title="Excluir"
              onClick={confirmDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

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

      {strategy.playbook && (
        <section className="grid gap-4 rounded-lg border p-4 md:grid-cols-[2fr_1fr]">
          <div className="min-w-0 space-y-3">
            <div>
              <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">Estratégia escolhida</p>
              <h2 className="text-lg font-semibold">{strategy.playbook.name}</h2>
              <p className="text-muted-foreground text-xs">{strategy.playbook.origin}</p>
            </div>
            {strategy.rationale && <p className="text-sm">{strategy.rationale}</p>}
            {strategy.summary && <p className="text-muted-foreground text-sm">{strategy.summary}</p>}
            {strategy.coreMessage && (
              <p className="bg-muted/50 rounded-md p-3 text-sm">
                <span className="text-muted-foreground block text-xs">Mensagem central</span>
                {strategy.coreMessage}
              </p>
            )}
            {strategy.secondaryPlaybook && (
              <p className="text-muted-foreground text-xs">Complementada por: {strategy.secondaryPlaybook.name}</p>
            )}
          </div>
          <div className="min-w-0 space-y-3 text-sm">
            <div>
              <p className="mb-1 font-medium">Princípios</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                {strategy.playbook.principles.map((principle) => (
                  <li key={principle}>{principle}</li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 font-medium">Como saber se funcionou</p>
              <ul className="text-muted-foreground list-disc space-y-1 pl-4">
                {strategy.playbook.validation.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            {strategy.playbook.sources.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {strategy.playbook.sources.map((source) => (
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
          </div>
        </section>
      )}

      {(strategy.status === "READY" || strategy.status === "ARCHIVED") && (
        <div className="grid gap-4 lg:grid-cols-2">
          <StrategyResultsPanel strategy={strategy} canManage={canManage} onSaved={onSaved} />
          <StrategyReviewPanel strategy={strategy} canManage={canManage} />
        </div>
      )}

      {phases.map((phase, index) => (
        <section key={`${index}-${phase.name}`} className="space-y-3">
          <h2 className="text-base font-semibold">{phase.name}</h2>
          <ol className="grid gap-3">
            {phase.steps.map((step) => (
              <StrategyStepCard key={step.id} strategy={strategy} step={step} canManage={canManage} onSaved={onSaved} />
            ))}
          </ol>
        </section>
      ))}

      {strategy.unassignedLinks.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-muted-foreground text-sm font-medium">Ligados à estratégia sem passo (ou de versões anteriores do plano)</h2>
          <StrategyLinkList
            links={strategy.unassignedLinks}
            canManage={canManage}
            onValidate={setValidating}
            onUnlink={(linkId) => unlink.mutate(linkId)}
          />
        </section>
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
  );
};
