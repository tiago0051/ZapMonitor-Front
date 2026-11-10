import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { flowService } from "@/services/api/flowService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Circle, X } from "lucide-react";
import { useState } from "react";

const dismissedKey = (clientId: string) => `zapmonitor:firstStepsDismissed:${clientId}`;

const readDismissed = (clientId: string) => {
  try {
    return localStorage.getItem(dismissedKey(clientId)) === "1";
  } catch {
    return false;
  }
};

type Step = { id: string; label: string; description: string; tab: string; done: boolean; permission: Permission };

/**
 * Roteiro de implantação para clientes novos: número → grupo → fluxo. A IA é do sistema e não precisa de configuração.
 * Reaproveita as mesmas chaves de consulta das seções, então os passos se atualizam quando a seção muda os dados.
 */
export const FirstStepsChecklist = ({ clientId, onSelectTab }: { clientId: string; onSelectTab: (tab: string) => void }) => {
  const { can } = useClientContext();
  const [isDismissed, setIsDismissed] = useState(() => readDismissed(clientId));

  const canNumbers = can("channels.manage");
  const canGroups = can("serviceGroups.manage");
  const canFlows = can("flows.manage");
  const isVisible = !isDismissed && (canNumbers || canGroups || canFlows);

  const usageQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappConfigurations", clientId, "usage"],
    queryFn: () => whatsappService.findNumberUsage({ params: { clientId } }),
    enabled: isVisible && canNumbers,
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

  if (!isVisible) return null;

  const enabledQueries = [canNumbers && usageQuery, canGroups && serviceGroupsQuery, canFlows && flowsQuery].filter((query) => !!query);
  // Só aparece com tudo carregado, para não piscar passos errados; com erro, some sem atrapalhar a tela
  if (enabledQueries.some((query) => !query.isSuccess)) return null;

  const usage = usageQuery.data;
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
      label: "Criar um grupo de atendimento",
      description: "Defina quem atende e quais números cada grupo recebe.",
      tab: "serviceGroup",
      permission: "serviceGroups.manage" as const,
      done: (serviceGroupsQuery.data?.length ?? 0) > 0,
    },
    {
      id: "flow",
      label: "Criar e ativar um fluxo",
      description: "Monte o caminho do atendimento, publique e ative.",
      tab: "flow",
      permission: "flows.manage" as const,
      done: (flowsQuery.data ?? []).some((flow) => flow.active),
    },
  ].filter((step) => can(step.permission));

  const doneCount = steps.filter((step) => step.done).length;
  if (doneCount === steps.length) return null;

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
            {doneCount} de {steps.length} concluídos. Siga a ordem para começar a atender pelo WhatsApp.
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
                ) : (
                  <Circle className="text-muted-foreground h-5 w-5 shrink-0" aria-hidden />
                )}
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm font-medium", step.done && "text-muted-foreground line-through")}>
                    {step.label}
                    <span className="sr-only">{step.done ? " (concluído)" : " (pendente)"}</span>
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
