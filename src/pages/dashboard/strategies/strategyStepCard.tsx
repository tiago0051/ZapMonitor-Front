import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Bot,
  CalendarPlus,
  Check,
  ChevronDown,
  ClipboardCopy,
  Film,
  Info,
  Loader2,
  MoreHorizontal,
  PencilRuler,
  Play,
  RotateCcw,
  Send,
  SkipForward,
} from "lucide-react";
import { useState, type FC, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { SalesSetupDialog } from "./salesSetupDialog";
import { StrategyLinkList } from "./strategyLinkList";
import { StrategyMarkerHelp } from "./strategyMarkerHelp";
import { StrategyValidationDialog } from "./strategyValidationDialog";
import {
  actionInfo,
  copyText,
  salesFlowId,
  salesSetupCovering,
  savePilotPrefill,
  stepDailyBudget,
  stepStatusInfo,
  verdictInfo,
} from "./strategyUtils";

type Props = {
  strategy: MarketingStrategy;
  step: MarketingStrategyStep;
  canManage: boolean;
  isCurrent: boolean;
  expanded: boolean;
  onToggle: () => void;
  onSaved: (strategy: MarketingStrategy) => void;
};

type ModuleShortcut = { kind: MarketingIntentKind; path: string; label: string; permission: Permission };

// Atalhos que abrem o módulo: o próximo item criado lá (em até 2 horas) nasce ligado ao passo
const moduleShortcuts: Partial<Record<MarketingStepAction, ModuleShortcut>> = {
  FLOW: { kind: "FLOW", path: "configuration?tab=flow", label: "Criar fluxo", permission: "flows.manage" },
  BROADCAST: { kind: "BROADCAST", path: "broadcasts/new", label: "Criar disparo", permission: "broadcasts.send" },
  EMAIL_CAMPAIGN: {
    kind: "EMAIL_CAMPAIGN",
    path: "broadcasts/email/new",
    label: "Criar campanha de e-mail",
    permission: "broadcasts.send",
  },
  EMAIL_SEQUENCE: { kind: "EMAIL_SEQUENCE", path: "broadcasts/sequences/new", label: "Criar sequência", permission: "broadcasts.send" },
  WHATSAPP_TEMPLATE: {
    kind: "WHATSAPP_TEMPLATE",
    path: "configuration/templates/new",
    label: "Criar modelo",
    permission: "templates.manage",
  },
};

type StepAction = { key: string; label: string; icon: ReactNode; title?: string; onClick: () => void };

/**
 * Passo do plano. Fechado mostra só o essencial (número, título, tipo, prazo e andamento); aberto mostra o que fazer, o
 * botão principal para executar e o que já nasceu dele. As ações menos usadas ficam no menu "Mais".
 */
export const StrategyStepCard: FC<Props> = ({ strategy, step, canManage, isCurrent, expanded, onToggle, onSaved }) => {
  const { client, can, canUseAds } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const info = actionInfo[step.action];
  const Icon = info.icon;
  const isReady = strategy.status === "READY";
  const [validating, setValidating] = useState<MarketingStrategyLink | null>(null);
  const [isSettingUpSales, setIsSettingUpSales] = useState(false);

  const setStatus = useMutation({
    mutationFn: (status: MarketingStepStatus) => marketingStrategyService.setStepStatus(client.id, strategy.id, step.id, status),
    onError: requestErrorHandling,
    onSuccess: (saved, status) => {
      onSaved(saved);
      if (status === "DONE") toast.success(`Passo ${step.order} feito`);
    },
  });
  const execute = useMutation({
    mutationFn: (as: "PLANNER_TASK" | "SOCIAL_POST") => marketingStrategyService.executeStep(client.id, strategy.id, step.id, as),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      onSaved(result.strategy);
      if (result.kind === "SOCIAL_POST") {
        toast.success("A IA está escrevendo a postagem", {
          action: { label: "Abrir", onClick: () => navigate(`${baseUrl}/posts/${result.objectId}`) },
        });
      } else toast.success("Tarefa criada no Planejamento");
    },
  });
  const openModule = useMutation({
    mutationFn: async ({ kind }: { kind: MarketingIntentKind; path: string }) => {
      await marketingStrategyService.createIntent(client.id, strategy.id, step.id, kind);
      return copyText(step.briefing);
    },
    onError: requestErrorHandling,
    onSuccess: (copied, { path }) => {
      toast.success(
        copied ? "Briefing copiado. O que você criar agora fica ligado a este passo." : "O que você criar agora fica ligado a este passo.",
      );
      navigate(`${baseUrl}/${path}`);
    },
  });
  const unlink = useMutation({
    mutationFn: (linkId: string) => marketingStrategyService.unlink(client.id, strategy.id, linkId),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      onSaved(saved);
      toast.success("Item desligado da estratégia");
    },
  });

  const openPilot = () => {
    savePilotPrefill({
      clientId: client.id,
      strategyStepId: step.id,
      label: `${step.marker} ${step.title}`,
      goal: step.title.substring(0, 500),
      notes: step.briefing.substring(0, 2000),
      maxDailyBudget: stepDailyBudget(strategy),
    });
    navigate(`${baseUrl}/ads?tab=pilot`);
  };
  const copyBriefing = async () => {
    if (await copyText(step.briefing)) toast.success("Briefing copiado");
    else toast.error("Não foi possível copiar. Abra o briefing e copie o texto.");
  };

  const busy = execute.isPending || setStatus.isPending || openModule.isPending;
  const startsOn = step.startsOn ? new Date(step.startsOn) : null;
  const canAds = canUseAds && can("ads.manage");
  const usesVideoPlatforms = strategy.brief.channels.some((channel) => channel === "GOOGLE_ADS" || channel === "TIKTOK_ADS");
  const usesMeta = strategy.brief.channels.includes("META_ADS") || !usesVideoPlatforms;
  const sdrFlowId = salesFlowId(strategy);
  const coveredBy = salesSetupCovering(strategy, step);
  const isClosed = step.status === "DONE" || step.status === "SKIPPED";

  // Ações do passo: a primeira vira o botão principal, as outras vão para o menu "Mais"
  const actions: StepAction[] = [];
  if (step.action === "AD_CAMPAIGN" && canAds) {
    if (usesMeta)
      actions.push({
        key: "pilot",
        label: "Montar no piloto",
        icon: <Icon className="h-4 w-4" />,
        title: "Abre o piloto com o briefing do passo; a campanha nasce ligada à estratégia",
        onClick: openPilot,
      });
    if (usesVideoPlatforms)
      actions.push({
        key: "video",
        label: "Campanha de vídeo",
        icon: <Film className="h-4 w-4" />,
        title: "Escolha a conta do YouTube ou do TikTok; a campanha criada fica ligada a este passo",
        onClick: () => openModule.mutate({ kind: "AD_VIDEO_CAMPAIGN", path: "ads?tab=create" }),
      });
    if (usesMeta)
      actions.push({
        key: "manual",
        label: "Criar campanha à mão",
        icon: <PencilRuler className="h-4 w-4" />,
        onClick: () => openModule.mutate({ kind: "AD_DRAFT", path: "ads?tab=create" }),
      });
  }
  if (step.action === "SALES_SETUP") {
    actions.push({
      key: "sales",
      label: sdrFlowId ? "Montar de novo" : "Montar a venda",
      icon: <Icon className="h-4 w-4" />,
      title: "Monta roteiro, agente de IA e o fluxo SDR (desligado, em rascunho) a partir da oferta",
      onClick: () => setIsSettingUpSales(true),
    });
    if (sdrFlowId) {
      // Com a venda montada, o principal passa a ser abrir o fluxo para testar e publicar
      actions.unshift({
        key: "open-flow",
        label: "Abrir o fluxo de venda",
        icon: <Play className="h-4 w-4" />,
        onClick: () => navigate(`${baseUrl}/configuration/flow/${sdrFlowId}`),
      });
      if (can("broadcasts.send"))
        actions.push({
          key: "prospect",
          label: "Prospectar quem autorizou",
          icon: <Send className="h-4 w-4" />,
          title: "Disparo para quem autorizou receber mensagens; quem responder cai no fluxo de venda",
          onClick: () =>
            openModule.mutate({
              kind: "BROADCAST",
              path: `broadcasts/new?replyFlowId=${sdrFlowId}&name=${encodeURIComponent(`Prospecção ${step.marker}`)}`,
            }),
        });
    }
  }
  if (step.action === "SOCIAL_POST" && canUseAds && can("posts.manage")) {
    actions.push({
      key: "post",
      label: "Criar rascunho de postagem",
      icon:
        execute.isPending && execute.variables === "SOCIAL_POST" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Icon className="h-4 w-4" />
        ),
      onClick: () => execute.mutate("SOCIAL_POST"),
    });
  }
  const shortcut = moduleShortcuts[step.action];
  if (shortcut && can(shortcut.permission) && !coveredBy) {
    // Disparo da estratégia com venda montada: as respostas já caem no fluxo de venda
    const path =
      step.action === "BROADCAST" && sdrFlowId
        ? `${shortcut.path}?replyFlowId=${sdrFlowId}&name=${encodeURIComponent(`${step.marker} ${step.title}`.substring(0, 120))}`
        : shortcut.path;
    actions.push({
      key: "shortcut",
      label: shortcut.label,
      icon: openModule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />,
      onClick: () => openModule.mutate({ kind: shortcut.kind, path }),
    });
  }
  if (!isClosed && !coveredBy)
    actions.push({
      key: "assistant",
      label: "Aplicar com o assistente",
      icon: <Bot className="h-4 w-4" />,
      title: "O assistente monta o item do passo com o briefing e liga à estratégia; nada muda sem a sua aprovação",
      onClick: () =>
        navigate(
          `${baseUrl}/assistant?mensagem=${encodeURIComponent(
            `Aplique o passo ${step.order} "${step.title}" da estratégia "${strategy.name}" (estrategiaId ${strategy.id}, passoId ${step.id}).`,
          )}`,
        ),
    });
  if (can("planner.manage"))
    actions.push({
      key: "task",
      label: "Virar tarefa no Planejamento",
      icon: <CalendarPlus className="h-4 w-4" />,
      onClick: () => execute.mutate("PLANNER_TASK"),
    });
  actions.push({ key: "copy", label: "Copiar briefing", icon: <ClipboardCopy className="h-4 w-4" />, onClick: copyBriefing });

  const [primary, ...secondary] = coveredBy ? [] : actions;
  const menuActions = coveredBy ? actions.filter((action) => action.key === "copy") : secondary;

  return (
    <li
      id={`step-${step.id}`}
      className={cn(
        "scroll-mt-4 rounded-lg border transition-colors",
        isCurrent && !isClosed && "border-primary/60 ring-primary/20 ring-2",
        step.status === "SKIPPED" && "opacity-60",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="hover:bg-muted/40 focus-visible:ring-ring/50 flex w-full items-start gap-3 rounded-lg p-3 text-left outline-none focus-visible:ring-[3px] sm:p-4"
      >
        <StepBadge step={step} />
        <span className="min-w-0 flex-1 space-y-1">
          <span className={cn("block font-medium", step.status === "SKIPPED" && "line-through")}>{step.title}</span>
          <span className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {info.label}
            </span>
            <span>
              {startsOn ? `A partir de ${format(startsOn, "dd/MM")}` : `Dia ${step.startDay + 1}`} · {step.durationDays} dia(s)
            </span>
            {step.links.length > 0 && <span>{step.links.length} item(ns) criado(s)</span>}
            {step.verdict && (
              <span className={cn("rounded px-1.5 py-0.5 font-medium", verdictInfo[step.verdict].className)}>
                {verdictInfo[step.verdict].label}
              </span>
            )}
          </span>
        </span>
        {isCurrent && !isClosed ? (
          <span className="bg-primary text-primary-foreground shrink-0 rounded px-1.5 py-0.5 text-xs font-medium">Agora</span>
        ) : (
          step.status !== "TODO" && (
            <span className={cn("shrink-0 rounded px-1.5 py-0.5 text-xs font-medium", stepStatusInfo[step.status].className)}>
              {stepStatusInfo[step.status].label}
            </span>
          )
        )}
        <ChevronDown
          className={cn("text-muted-foreground mt-1 h-4 w-4 shrink-0 transition-transform", expanded && "rotate-180")}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="grid gap-3 border-t px-3 py-3 text-sm sm:px-4 sm:pl-14">
          {coveredBy && (
            <div className="bg-muted/60 flex flex-wrap items-center gap-2 rounded-md p-3">
              <Info className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
              <p className="min-w-0 flex-1">
                Isto já é feito no passo {coveredBy.order}, “{coveredBy.title}”: o fluxo de venda atende, qualifica e faz o follow-up.
              </p>
              {canManage && isReady && step.status !== "SKIPPED" && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus.mutate("SKIPPED")}>
                  <SkipForward className="h-4 w-4" />
                  Pular este passo
                </Button>
              )}
            </div>
          )}

          <p className="whitespace-pre-line">{step.what}</p>
          {(step.why || step.metric) && (
            <dl className="text-muted-foreground grid gap-1">
              {step.why && (
                <div>
                  <dt className="text-foreground inline font-medium">Por quê: </dt>
                  <dd className="inline">{step.why}</dd>
                </div>
              )}
              {step.metric && (
                <div>
                  <dt className="text-foreground inline font-medium">Como saber se deu certo: </dt>
                  <dd className="inline">
                    {step.metric}
                    {step.target && ` (referência: ${step.target})`}
                  </dd>
                </div>
              )}
            </dl>
          )}
          {step.verdict && step.verdictReason && <p className="text-muted-foreground text-xs">{step.verdictReason}</p>}

          {canManage && isReady && (
            <div className="flex flex-wrap items-center gap-2">
              {primary && (
                <Button size="sm" disabled={busy} title={primary.title} onClick={primary.onClick}>
                  {primary.icon}
                  {primary.label}
                </Button>
              )}
              {step.status !== "DONE" && !coveredBy && (
                <Button size="sm" variant="outline" disabled={busy} onClick={() => setStatus.mutate("DONE")}>
                  {setStatus.isPending && setStatus.variables === "DONE" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  Marcar como feito
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" disabled={busy} aria-label={`Mais ações do passo ${step.order}`}>
                    <MoreHorizontal className="h-4 w-4" />
                    Mais
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {menuActions.map((action) => (
                    <DropdownMenuItem key={action.key} title={action.title} onSelect={action.onClick}>
                      {action.icon}
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  {step.status === "TODO" && (
                    <DropdownMenuItem onSelect={() => setStatus.mutate("DOING")}>
                      <Play className="h-4 w-4" />
                      Marcar como em andamento
                    </DropdownMenuItem>
                  )}
                  {step.status !== "SKIPPED" && (
                    <DropdownMenuItem onSelect={() => setStatus.mutate("SKIPPED")}>
                      <SkipForward className="h-4 w-4" />
                      Pular este passo
                    </DropdownMenuItem>
                  )}
                  {step.status !== "TODO" && (
                    <DropdownMenuItem onSelect={() => setStatus.mutate("TODO")}>
                      <RotateCcw className="h-4 w-4" />
                      Voltar para “a fazer”
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {step.links.length > 0 && (
            <div className="grid gap-1.5">
              <p className="text-muted-foreground text-xs font-medium">Criado neste passo</p>
              <StrategyLinkList links={step.links} canManage={canManage} onValidate={setValidating} onUnlink={(id) => unlink.mutate(id)} />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {step.briefing && (
              <details className="group w-full">
                <summary className="text-muted-foreground inline-flex cursor-pointer list-none items-center gap-1 text-xs underline-offset-2 hover:underline [&::-webkit-details-marker]:hidden">
                  Ver o briefing que vai para a IA
                  <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="bg-muted/40 mt-2 rounded-md p-3 text-xs break-words whitespace-pre-line">{step.briefing}</p>
              </details>
            )}
            {step.action === "AD_CAMPAIGN" && <StrategyMarkerHelp marker={step.marker} isStep />}
          </div>
        </div>
      )}

      {isSettingUpSales && (
        <SalesSetupDialog
          strategy={strategy}
          stepId={step.id}
          onClose={() => setIsSettingUpSales(false)}
          onDone={() => {
            marketingStrategyService
              .find(client.id, strategy.id)
              .then(onSaved)
              .catch(() => undefined);
          }}
        />
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
    </li>
  );
};

/** Número do passo; vira um visto quando feito e fica tracejado quando pulado. */
const StepBadge = ({ step }: { step: MarketingStrategyStep }) => {
  if (step.status === "DONE")
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-600 text-white" aria-label="Feito">
        <Check className="h-4 w-4" />
      </span>
    );

  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums",
        step.status === "SKIPPED" && "text-muted-foreground border border-dashed",
        step.status === "DOING" && "bg-primary text-primary-foreground",
        step.status === "TODO" && "bg-muted text-foreground",
      )}
    >
      {step.order}
    </span>
  );
};
