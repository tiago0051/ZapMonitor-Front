import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { cn } from "@/lib/utils";
import { marketingStrategyService, ownerPlaybookService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Eye, EyeOff, ExternalLink, Loader2, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { actionInfo, goalLabel, textareaClassName } from "./strategyUtils";

const sourceLabel: Record<MarketingPlaybook["source"], string | null> = {
  SYSTEM: null,
  EDITED: "Editado pelo dono",
  CUSTOM: "Criado pelo dono",
};

const toData = (playbook: MarketingPlaybook): MarketingPlaybookData => ({
  slug: playbook.slug,
  name: playbook.name,
  origin: playbook.origin,
  summary: playbook.summary,
  bestFor: playbook.bestFor,
  avoidWhen: playbook.avoidWhen,
  goals: playbook.goals,
  principles: playbook.principles,
  phases: playbook.phases,
  validation: playbook.validation,
  wikiSlugs: playbook.wikiSlugs,
  sources: playbook.sources,
});

/** Biblioteca: as estratégias conhecidas que a IA usa, com o aproveitamento no segmento do cliente. O dono edita aqui. */
export const StrategyLibrary: FC = () => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const isOwner = !!user?.isOwner;
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [editor, setEditor] = useState<{ playbook: MarketingPlaybook | null; base: MarketingPlaybookData } | null>(null);

  const clientQuery = useQuery({
    queryKey: ["marketingPlaybooks", client.id],
    queryFn: () => marketingStrategyService.findPlaybooks(client.id),
  });
  // O dono vê também os escondidos, para mostrar de novo
  const ownerQuery = useQuery({ queryKey: ["marketingPlaybooks", "owner"], queryFn: ownerPlaybookService.findAll, enabled: isOwner });
  const query = isOwner ? ownerQuery : clientQuery;
  const statBySlug = new Map((clientQuery.data ?? []).map((playbook) => [playbook.slug, playbook.segmentStat]));

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["marketingPlaybooks"] });
  };
  const toggle = useMutation({
    mutationFn: (playbook: MarketingPlaybook) => ownerPlaybookService.setEnabled(playbook.slug, !playbook.enabled),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      refresh();
      toast.success(saved.enabled ? "Playbook visível para a IA" : "Playbook escondido: a IA deixa de usar");
    },
  });
  const reset = useMutation({
    mutationFn: (slug: string) => ownerPlaybookService.resetOrDelete(slug),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Pronto");
    },
  });

  if (query.isLoading) return <LoadingState />;
  if (query.isError || !query.data) return <ErrorState message="Não foi possível carregar a biblioteca" onRetry={() => query.refetch()} />;

  return (
    <div className="space-y-4">
      {confirmDialog}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Estratégias conhecidas e usadas no mercado. A IA só monta planos a partir delas. Quando há empresas suficientes do mesmo segmento,
          aparece em quantas a estratégia se validou.
        </p>
        {isOwner && (
          <Button
            variant="outline"
            onClick={() => setEditor({ playbook: null, base: { ...toData(query.data[0]), slug: "novo-playbook", name: "Novo playbook" } })}
          >
            <Plus className="h-4 w-4" />
            Novo playbook
          </Button>
        )}
      </div>

      <ul className="grid gap-3">
        {query.data.map((playbook) => {
          const stat = statBySlug.get(playbook.slug) ?? playbook.segmentStat;
          return (
            <li key={playbook.slug} className={cn("rounded-lg border", !playbook.enabled && "opacity-60")}>
              <details className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-start gap-2 p-4 [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{playbook.name}</span>
                      {isOwner && sourceLabel[playbook.source] && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          {sourceLabel[playbook.source]}
                        </span>
                      )}
                      {isOwner && !playbook.enabled && <span className="bg-muted rounded px-1.5 py-0.5 text-xs">Escondido</span>}
                      {stat && (
                        <span className="rounded bg-green-100 px-1.5 py-0.5 text-xs text-green-800 dark:bg-green-950 dark:text-green-300">
                          Validada em {stat.validated} de {stat.clients} empresas do seu segmento
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground text-xs">{playbook.origin}</p>
                    <p className="text-sm">{playbook.summary}</p>
                  </div>
                  <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="grid gap-4 border-t p-4 text-sm md:grid-cols-2">
                  <div className="space-y-3">
                    <p>
                      <span className="font-medium">Objetivos: </span>
                      {playbook.goals.map((goal) => goalLabel[goal]).join("; ")}
                    </p>
                    <List title="Indicada para" items={playbook.bestFor} />
                    <List title="Evitar quando" items={playbook.avoidWhen} />
                    <List title="Princípios" items={playbook.principles} />
                    <List title="Como validar" items={playbook.validation} />
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
                  </div>
                  <ol className="space-y-3">
                    {playbook.phases.map((phase) => (
                      <li key={phase.name}>
                        <p className="font-medium">{phase.name}</p>
                        <p className="text-muted-foreground text-xs">{phase.goal}</p>
                        <ul className="mt-1 space-y-1">
                          {phase.steps.map((step) => {
                            const StepIcon = actionInfo[step.action]?.icon;
                            return (
                              <li key={step.title} className="flex gap-2">
                                {StepIcon && <StepIcon className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />}
                                <span>
                                  <span className="font-medium">{step.title}:</span> {step.what}
                                  {step.metric && <span className="text-muted-foreground"> (mede: {step.metric})</span>}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </li>
                    ))}
                  </ol>
                  {isOwner && (
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <Button size="sm" variant="outline" onClick={() => setEditor({ playbook, base: toData(playbook) })}>
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" disabled={toggle.isPending} onClick={() => toggle.mutate(playbook)}>
                        {playbook.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {playbook.enabled ? "Esconder da IA" : "Mostrar para a IA"}
                      </Button>
                      {playbook.source !== "SYSTEM" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={reset.isPending}
                          onClick={async () => {
                            const custom = playbook.source === "CUSTOM";
                            if (
                              await confirm({
                                title: custom ? "Excluir o playbook?" : "Voltar ao texto do sistema?",
                                description: custom
                                  ? "Estratégias que já usam este playbook continuam com o plano, mas sem a referência."
                                  : "As suas edições neste playbook serão descartadas.",
                                confirmLabel: custom ? "Excluir" : "Voltar ao padrão",
                                destructive: custom,
                              })
                            )
                              reset.mutate(playbook.slug);
                          }}
                        >
                          {playbook.source === "CUSTOM" ? <Trash2 className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                          {playbook.source === "CUSTOM" ? "Excluir" : "Voltar ao padrão"}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </details>
            </li>
          );
        })}
      </ul>

      {editor && <PlaybookEditor editing={editor.playbook} base={editor.base} onClose={() => setEditor(null)} onSaved={refresh} />}
    </div>
  );
};

const List: FC<{ title: string; items: string[] }> = ({ title, items }) => (
  <div>
    <p className="font-medium">{title}</p>
    <ul className="text-muted-foreground list-disc space-y-0.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  </div>
);

/** Editor do dono: o playbook em JSON (mesmo formato do código); o servidor confere tudo antes de salvar. */
const PlaybookEditor: FC<{ editing: MarketingPlaybook | null; base: MarketingPlaybookData; onClose: () => void; onSaved: () => void }> = ({
  editing,
  base,
  onClose,
  onSaved,
}) => {
  const [text, setText] = useState(() => JSON.stringify(base, null, 2));
  const [parseError, setParseError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (playbook: MarketingPlaybookData) =>
      editing ? ownerPlaybookService.update(editing.slug, playbook) : ownerPlaybookService.create(playbook),
    onError: requestErrorHandling,
    onSuccess: () => {
      onSaved();
      toast.success(editing ? "Playbook salvo" : "Playbook criado");
      onClose();
    },
  });

  const submit = () => {
    try {
      const parsed = JSON.parse(text) as MarketingPlaybookData;
      setParseError(null);
      save.mutate(parsed);
    } catch (error) {
      setParseError(`JSON inválido: ${(error as Error).message}`);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Editar "${editing.name}"` : "Novo playbook"}</DialogTitle>
          <DialogDescription>
            Ações dos passos: AD_CAMPAIGN, SOCIAL_POST, FLOW, BROADCAST, EMAIL_CAMPAIGN, EMAIL_SEQUENCE, WHATSAPP_TEMPLATE ou TASK.
            Objetivos: SALES, LEADS, LAUNCH, AWARENESS ou RECURRENCE.{editing ? " O código (slug) não muda." : ""}
          </DialogDescription>
        </DialogHeader>
        <textarea
          aria-label="Playbook em JSON"
          spellCheck={false}
          rows={24}
          className={cn(textareaClassName, "font-mono text-xs")}
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        {parseError && <p className="text-destructive text-sm">{parseError}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={save.isPending} onClick={submit}>
            {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
