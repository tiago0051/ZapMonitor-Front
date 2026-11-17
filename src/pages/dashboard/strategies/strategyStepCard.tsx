import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarPlus, ClipboardCopy, Film, Loader2, PencilRuler } from "lucide-react";
import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { StrategyLinkList } from "./strategyLinkList";
import { StrategyValidationDialog } from "./strategyValidationDialog";
import { actionInfo, copyText, savePilotPrefill, selectClassName, stepDailyBudget, stepStatusInfo, verdictInfo } from "./strategyUtils";

type Props = {
  strategy: MarketingStrategy;
  step: MarketingStrategyStep;
  canManage: boolean;
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

/** Passo do plano: o que fazer, por quê, como medir, os atalhos para executar e o que já nasceu dele. */
export const StrategyStepCard: FC<Props> = ({ strategy, step, canManage, onSaved }) => {
  const { client, can, canUseAds } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const info = actionInfo[step.action];
  const Icon = info.icon;
  const isReady = strategy.status === "READY";
  const [validating, setValidating] = useState<MarketingStrategyLink | null>(null);

  const setStatus = useMutation({
    mutationFn: (status: MarketingStepStatus) => marketingStrategyService.setStepStatus(client.id, strategy.id, step.id, status),
    onError: requestErrorHandling,
    onSuccess: onSaved,
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
        copied
          ? "Briefing copiado. O que você criar agora no módulo fica ligado a este passo."
          : "O que você criar agora no módulo fica ligado a este passo.",
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

  const shortcut = moduleShortcuts[step.action];
  const busy = execute.isPending || setStatus.isPending || openModule.isPending;
  const startsOn = step.startsOn ? new Date(step.startsOn) : null;
  const canAds = canUseAds && can("ads.manage");
  const usesVideoPlatforms = strategy.brief.channels.some((channel) => channel === "GOOGLE_ADS" || channel === "TIKTOK_ADS");
  const usesMeta = strategy.brief.channels.includes("META_ADS") || !usesVideoPlatforms;

  return (
    <li className={cn("grid gap-3 rounded-lg border p-4", step.status === "SKIPPED" && "opacity-60")}>
      <div className="flex flex-wrap items-start gap-3">
        <span className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums">
          {step.order}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="font-medium">{step.title}</p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span className="inline-flex items-center gap-1">
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {info.label}
              {step.channel && ` · ${step.channel}`}
            </span>
            {startsOn && (
              <span>
                A partir de {format(startsOn, "dd/MM")} · {step.durationDays} dia(s)
              </span>
            )}
            <code title="Marca do passo no nome do que ele cria">{step.marker}</code>
            {step.verdict && (
              <span
                className={cn("rounded px-1.5 py-0.5 font-medium", verdictInfo[step.verdict].className)}
                title={step.verdictReason ?? undefined}
              >
                {verdictInfo[step.verdict].label}
              </span>
            )}
          </div>
        </div>
        {canManage ? (
          <select
            aria-label={`Andamento do passo ${step.order}`}
            className={cn(selectClassName, "w-32")}
            value={step.status}
            disabled={busy || !isReady}
            onChange={(event) => setStatus.mutate(event.target.value as MarketingStepStatus)}
          >
            {Object.entries(stepStatusInfo).map(([value, status]) => (
              <option key={value} value={value}>
                {status.label}
              </option>
            ))}
          </select>
        ) : (
          <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", stepStatusInfo[step.status].className)}>
            {stepStatusInfo[step.status].label}
          </span>
        )}
      </div>

      <div className="grid gap-3 text-sm md:grid-cols-2">
        <p className="whitespace-pre-line">{step.what}</p>
        <div className="space-y-2">
          {step.why && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Por quê: </span>
              {step.why}
            </p>
          )}
          {step.metric && (
            <p className="text-muted-foreground">
              <span className="text-foreground font-medium">Como medir: </span>
              {step.metric}
              {step.target && ` (referência: ${step.target})`}
            </p>
          )}
          {step.verdictReason && <p className="text-muted-foreground text-xs">{step.verdictReason}</p>}
        </div>
      </div>

      {canManage && isReady && (
        <div className="flex flex-wrap gap-2">
          {step.action === "AD_CAMPAIGN" && canAds && (
            <>
              {usesMeta && (
                <Button
                  size="sm"
                  onClick={openPilot}
                  title="Abre o piloto com o briefing do passo; a campanha nasce com a marca da estratégia"
                >
                  <Icon className="h-4 w-4" />
                  Montar no piloto
                </Button>
              )}
              {usesMeta && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  title="Abre Criar campanha; a campanha criada lá fica ligada a este passo"
                  onClick={() => openModule.mutate({ kind: "AD_DRAFT", path: "ads?tab=create" })}
                >
                  <PencilRuler className="h-4 w-4" />
                  Criar à mão
                </Button>
              )}
              {usesVideoPlatforms && (
                <Button
                  size="sm"
                  variant={usesMeta ? "outline" : "default"}
                  disabled={busy}
                  title="Escolha a conta do YouTube ou do TikTok em Anúncios; a campanha criada fica ligada a este passo"
                  onClick={() => openModule.mutate({ kind: "AD_VIDEO_CAMPAIGN", path: "ads?tab=create" })}
                >
                  <Film className="h-4 w-4" />
                  Campanha de vídeo
                </Button>
              )}
            </>
          )}
          {step.action === "SOCIAL_POST" && canUseAds && can("posts.manage") && (
            <Button size="sm" disabled={busy} onClick={() => execute.mutate("SOCIAL_POST")}>
              {execute.isPending && execute.variables === "SOCIAL_POST" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Icon className="h-4 w-4" />
              )}
              Criar rascunho de postagem
            </Button>
          )}
          {shortcut && can(shortcut.permission) && (
            <Button size="sm" disabled={busy} onClick={() => openModule.mutate({ kind: shortcut.kind, path: shortcut.path })}>
              {openModule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
              {shortcut.label}
            </Button>
          )}
          {can("planner.manage") && (
            <Button size="sm" variant="outline" disabled={busy} onClick={() => execute.mutate("PLANNER_TASK")}>
              {execute.isPending && execute.variables === "PLANNER_TASK" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarPlus className="h-4 w-4" />
              )}
              Virar tarefa
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (await copyText(step.briefing)) toast.success("Briefing copiado");
              else toast.error("Não foi possível copiar. Selecione o texto do passo e copie manualmente.");
            }}
          >
            <ClipboardCopy className="h-4 w-4" />
            Copiar briefing
          </Button>
        </div>
      )}

      {step.links.length > 0 && (
        <StrategyLinkList links={step.links} canManage={canManage} onValidate={setValidating} onUnlink={(id) => unlink.mutate(id)} />
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
