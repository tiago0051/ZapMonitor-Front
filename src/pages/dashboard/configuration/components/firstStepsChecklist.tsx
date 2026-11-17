import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { aiAgentService } from "@/services/api/aiAgentService";
import { flowService } from "@/services/api/flowService";
import { homeService } from "@/services/api/homeService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Circle, FlaskConical, X } from "lucide-react";
import { useState } from "react";

const dismissedKey = (clientId: string) => `zapmonitor:firstStepsDismissed:${clientId}`;

const readDismissed = (clientId: string) => {
  try {
    return localStorage.getItem(dismissedKey(clientId)) === "1";
  } catch {
    return false;
  }
};

// done nulo: passo só de ação, sem como saber se foi feito
type Step = { id: string; label: string; description: string; tab: string; done: boolean | null; permission: Permission };

/**
 * Roteiro de implantação para clientes novos: número → grupo → fluxo → agente de IA → teste. A IA é do sistema e não precisa de chave.
 * Reaproveita as mesmas chaves de consulta das seções, então os passos se atualizam quando a seção muda os dados.
 */
export const FirstStepsChecklist = ({ clientId, onSelectTab }: { clientId: string; onSelectTab: (tab: string) => void }) => {
  const { can } = useClientContext();
  const [isDismissed, setIsDismissed] = useState(() => readDismissed(clientId));

  const canNumbers = can("channels.manage");
  const canGroups = can("serviceGroups.manage");
  const canFlows = can("flows.manage");
  const canAiAgents = can("aiAgents.manage");
  const isVisible = !isDismissed && (canNumbers || canGroups || canFlows);

  const usageQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappConfigurations", clientId, "usage"],
    queryFn: () => whatsappService.findNumberUsage({ params: { clientId } }),
    enabled: isVisible && canNumbers,
  });
  // Números ativos (a listagem só traz os ligados), para conferir se cada um tem fluxo
  const numbersQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappConfigurations", clientId, "firstSteps"],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId }, queries: { page: 1, take: 100 } }),
    enabled: isVisible && canFlows,
  });
  const serviceGroupsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["serviceGroups", clientId],
    queryFn: () => serviceGroupService.findAll({ params: { clientId } }),
    enabled: isVisible && canGroups,
  });
  const flowsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["flows", clientId],
    queryFn: () => flowService.findAll({ params: { clientId } }),
    enabled: isVisible && canFlows,
  });

  const aiAgentsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["aiAgents", clientId],
    queryFn: () => aiAgentService.findAll({ params: { clientId } }),
    enabled: isVisible && canAiAgents,
  });
  // Mesma consulta do Início: diz se o plano inclui IA e se algum fluxo já foi testado
  const overviewQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["home", "overview", clientId],
    queryFn: () =>
      homeService.findOverview({ params: { clientId }, queries: { timezoneOffset: new Date().getTimezoneOffset() } }),
    enabled: isVisible,
  });

  if (!isVisible) return null;

  const enabledQueries = [
    canNumbers && usageQuery,
    canGroups && serviceGroupsQuery,
    canFlows && flowsQuery,
    canFlows && numbersQuery,
    canAiAgents && aiAgentsQuery,
  ].filter((query) => !!query);
  // Só aparece com tudo carregado, para não piscar passos errados; com erro, some sem atrapalhar a tela
  if (enabledQueries.some((query) => !query.isSuccess) || overviewQuery.isPending) return null;

  const usage = usageQuery.data;
  const onboarding = overviewQuery.data?.onboarding;
  // Número sem fluxo de atendimento ativo não responde ninguém, mesmo com outro fluxo ativo
  const numberIdsWithFlow = new Set(
    (flowsQuery.data ?? []).filter((flow) => flow.active && flow.kind === "SERVICE").flatMap((flow) => flow.whatsappConfigurationIds),
  );
  const activeNumbers = numbersQuery.data?.items ?? [];
  const numbersWithoutFlow = activeNumbers.filter((number) => !numberIdsWithFlow.has(number.id)).length;
  const steps: Step[] = [
    {
      id: "numbers",
      label: "Conectar um número de WhatsApp",
      description: "Pela API oficial ou por QR code.",
      tab: "numbers",
      permission: "channels.manage" as const,
      done: !!usage && usage.used + usage.whatsappWeb.used > 0,
    },
    {
      id: "serviceGroup",
      label: "Criar um grupo de atendimento com pessoas",
      description: "Defina quem atende e quais números cada grupo recebe. Grupo sem ninguém deixa a fila parada.",
      tab: "serviceGroup",
      permission: "serviceGroups.manage" as const,
      done: (serviceGroupsQuery.data ?? []).some((group) => group.userIds.length > 0),
    },
    {
      id: "flow",
      label: "Ativar um fluxo em cada número",
      description:
        numbersWithoutFlow > 0 && activeNumbers.length > numbersWithoutFlow
          ? `${numbersWithoutFlow} ${numbersWithoutFlow === 1 ? "número ainda não tem" : "números ainda não têm"} fluxo ativo e não ${numbersWithoutFlow === 1 ? "responde" : "respondem"} ninguém.`
          : "Monte o caminho do atendimento, publique, ative e escolha os números.",
      tab: "flow",
      permission: "flows.manage" as const,
      done: activeNumbers.length > 0 && numbersWithoutFlow === 0,
    },
    // Só quando o plano inclui IA
    ...(onboarding?.aiAvailable
      ? [
          {
            id: "aiAgent",
            label: "Criar um agente de IA",
            description: "Ele responde os contatos no fluxo e passa para a equipe quando precisar.",
            tab: "aiAgent",
            permission: "aiAgents.manage" as const,
            done: (aiAgentsQuery.data?.length ?? 0) > 0,
          },
        ]
      : []),
    {
      id: "testFlow",
      label: "Testar o fluxo no simulador",
      description: "Abra o fluxo e clique em Simular para conversar com ele antes dos clientes.",
      tab: "flow",
      permission: "flows.manage" as const,
      // Sem o resumo do Início, vira só um atalho
      done: onboarding ? onboarding.hasTestedFlow : null,
    },
  ].filter((step) => can(step.permission));

  const checkableSteps = steps.filter((step) => step.done !== null);
  const doneCount = checkableSteps.filter((step) => step.done).length;
  if (doneCount === checkableSteps.length) return null;

  const dismiss = () => {
    setIsDismissed(true);
    try {
      localStorage.setItem(dismissedKey(clientId), "1");
    } catch {
      // Sem armazenamento, o card volta na próxima visita
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle>Primeiros passos</CardTitle>
          <CardDescription>
            {doneCount} de {checkableSteps.length} concluídos. Siga a ordem para começar a atender pelo WhatsApp.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" className="-mt-1 h-8 w-8 shrink-0" aria-label="Dispensar primeiros passos" onClick={dismiss}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <ol className="divide-y rounded-lg border">
          {steps.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onSelectTab(step.tab)}
                className="hover:bg-muted/60 flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors"
              >
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                ) : step.done === null ? (
                  <FlaskConical className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                    {step.label}
                    <span className="sr-only">{step.done ? " (concluído)" : step.done === null ? " (atalho)" : " (pendente)"}</span>
                  </span>
                  {!step.done && <span className="text-muted-foreground block text-xs">{step.description}</span>}
                </span>
                <ChevronRight className="text-muted-foreground h-4 w-4 shrink-0" aria-hidden />
              </button>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
