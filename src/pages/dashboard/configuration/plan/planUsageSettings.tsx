import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { planUsageService } from "@/services/api/planUsageService";
import { useQuery } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, Bot, CreditCard, PauseCircle } from "lucide-react";
import type { FC } from "react";
import { useParams } from "react-router";

const AI_WARNING_PERCENT = 80;

const AI_KIND_LABELS: { kind: AiUsageKind; label: string; hint: string }[] = [
  { kind: "AGENT", label: "Agentes de IA", hint: "respostas no atendimento, no simulador e no teste do agente" },
  { kind: "TEXT", label: "Textos", hint: "resumos, leitura de áudios e imagens, anúncios, postagens e assistente" },
  { kind: "IMAGE", label: "Imagens", hint: "artes criadas no estúdio, em anúncios e postagens" },
  { kind: "VIDEO", label: "Vídeos", hint: "vídeos criados no estúdio e em anúncios" },
];

const formatPercent = (value: number) => `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const formatAmount = (value: number, unit: PlanResourceUsage["unit"]) =>
  unit === "gb"
    ? `${value.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} GB`
    : value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

// Verde até 80%, amarelo até acabar, vermelho quando acabou
const levelClassName = (percent: number) =>
  percent >= 100
    ? "[&_[data-slot=progress-indicator]]:bg-red-500 bg-red-500/15"
    : percent >= AI_WARNING_PERCENT
      ? "[&_[data-slot=progress-indicator]]:bg-amber-500 bg-amber-500/15"
      : "";

const UsageBar: FC<{ percent: number; className?: string }> = ({ percent, className }) => (
  <Progress value={Math.min(100, Math.max(0, percent))} className={cn(levelClassName(percent), className)} />
);

const AiUsageCard: FC<{ ai: AiMonthUsage }> = ({ ai }) => {
  // O mês volta a zerar no primeiro dia do mês seguinte
  const renewal = format(addDays(new Date(ai.monthEnd), 1), "d 'de' MMMM", { locale: ptBR });

  if (!ai.includesAi)
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-4 w-4" /> Inteligência artificial
          </CardTitle>
          <CardDescription>
            Seu plano não inclui IA. Agentes de IA, resumos e criação de artes ficam desligados. Fale com o implantador responsável para
            incluir.
          </CardDescription>
        </CardHeader>
      </Card>
    );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bot className="h-4 w-4" /> Inteligência artificial do mês
        </CardTitle>
        <CardDescription>Tudo o que a IA faz gasta deste limite. Ele volta a zero em {renewal}.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <p className="text-3xl font-semibold tabular-nums">{formatPercent(ai.percent)}</p>
            <p className="text-muted-foreground text-right text-sm">usado do limite do mês</p>
          </div>
          <UsageBar percent={ai.percent} className="h-3" />
          {!ai.paused && (
            <p className={cn("text-sm", ai.forecastPercent >= 100 ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
              No ritmo atual, o mês deve fechar em cerca de {formatPercent(ai.forecastPercent)}
              {ai.forecastPercent >= 100 ? ": o limite deve acabar antes do fim do mês." : "."}
            </p>
          )}
        </div>

        {ai.paused ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <PauseCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              A IA do mês acabou. Os agentes de IA pararam de responder e os contatos que chegarem vão direto para a fila dos atendentes. A
              IA volta sozinha em {renewal}; para voltar antes, fale com o implantador responsável e aumente o limite.
            </p>
          </div>
        ) : (
          ai.percent >= AI_WARNING_PERCENT && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Você já usou mais de {AI_WARNING_PERCENT}% da IA do mês. Quando chegar a 100%, os agentes de IA param e os contatos vão para
                a fila dos atendentes.
              </p>
            </div>
          )
        )}

        <div className="space-y-3">
          <p className="text-sm font-medium">Onde foi usado</p>
          {AI_KIND_LABELS.map(({ kind, label, hint }) => (
            <div key={kind} className="space-y-1">
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <p className="min-w-0">
                  {label} <span className="text-muted-foreground text-xs">— {hint}</span>
                </p>
                <span className="shrink-0 tabular-nums">{formatPercent(ai.byKindPercent[kind])}</span>
              </div>
              <Progress value={Math.min(100, ai.byKindPercent[kind])} className="h-1.5" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const ResourcesCard: FC<{ resources: PlanResourceUsage[] }> = ({ resources }) => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-base">
        <CreditCard className="h-4 w-4" /> Recursos do plano
      </CardTitle>
      <CardDescription>Atendimentos e e-mails contam no mês; os demais, o que está em uso agora.</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      {resources.map((resource) => {
        const percent = resource.limit > 0 ? (resource.used / resource.limit) * 100 : 100;

        return (
          <div key={resource.resource} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <p className="min-w-0">{resource.label}</p>
              <span className="shrink-0 tabular-nums">
                {formatAmount(resource.used, resource.unit)} de {formatAmount(resource.limit, resource.unit)}
              </span>
            </div>
            <UsageBar percent={percent} className="h-1.5" />
          </div>
        );
      })}
    </CardContent>
  </Card>
);

/** Consumo do mês: IA (com previsão e avisos) e os recursos do plano. */
export const PlanUsageSettings = () => {
  const { clientId } = useParams();

  const planUsageQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["planUsage", clientId],
    queryFn: () => planUsageService.findOverview(clientId!),
  });

  if (planUsageQuery.isLoading) return <LoadingState label="Carregando o consumo do mês..." />;
  if (!planUsageQuery.data)
    return (
      <ErrorState
        message="Não foi possível carregar o consumo do mês."
        onRetry={() => planUsageQuery.refetch()}
        isRetrying={planUsageQuery.isFetching}
      />
    );

  const { hasPlan, ai, resources } = planUsageQuery.data;
  if (!hasPlan)
    return (
      <EmptyState
        icon={CreditCard}
        title="Nenhum plano vinculado"
        description="Quando o implantador definir o plano desta empresa, o consumo do mês aparece aqui."
      />
    );

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Plano e consumo</h2>
        <p className="text-muted-foreground text-sm">Quanto do plano já foi usado neste mês. Para aumentar, fale com o implantador.</p>
      </div>
      <AiUsageCard ai={ai} />
      {resources.length > 0 && <ResourcesCard resources={resources} />}
    </div>
  );
};
