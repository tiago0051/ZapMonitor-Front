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
import { broadcastService } from "@/services/api/broadcastService";
import { crmService } from "@/services/api/crmService";
import { flowService } from "@/services/api/flowService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import type { FC } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { billedCostUsd, formatCount, formatUsd, rate, recipientsToCsv } from "../broadcastUtils";

const EXPORT_PAGE = 200;

const categoryLabel: Record<string, string> = {
  MARKETING: "marketing",
  UTILITY: "utilidade",
  AUTHENTICATION: "autenticação",
  SERVICE: "serviço",
};

/** Descadastros, mensagens cobradas e o que acontece com quem responde. */
export const BroadcastResults: FC<{ broadcast: Broadcast }> = ({ broadcast }) => {
  const { client, canUseCrm } = useClientContext();
  const sending = broadcast.status === "SENDING";

  const metricsQuery = useQuery({
    queryKey: ["broadcasts", client.id, "metrics", broadcast.id],
    queryFn: () => broadcastService.metrics(client.id, broadcast.id),
    enabled: !!broadcast.startedAt,
    refetchInterval: sending ? 15000 : false,
  });
  const flowsQuery = useQuery({
    queryKey: ["flows", client.id, "broadcast"],
    queryFn: () => flowService.findAll({ params: { clientId: client.id } }),
    enabled: !!broadcast.reply.flowId,
    retry: false,
    meta: { errorHandledInline: true },
  });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: canUseCrm && !!broadcast.reply.pipelineId,
  });

  const metrics = metricsQuery.data;
  const billedTotal = metrics ? Object.values(metrics.billable).reduce((sum, value) => sum + value, 0) : 0;
  const billedCost = metrics ? billedCostUsd(metrics.billable) : null;
  const optOutRate = metrics ? rate(metrics.optedOut, broadcast.totals.delivered) : null;

  const flowName = broadcast.reply.flowId
    ? (flowsQuery.data?.find((flow) => flow.id === broadcast.reply.flowId)?.name ?? "fluxo escolhido")
    : "o fluxo do número";
  const pipeline = pipelinesQuery.data?.find((item) => item.id === broadcast.reply.pipelineId);
  const stageName = pipeline?.stages.find((stage) => stage.id === broadcast.reply.stageId)?.name ?? "primeira etapa aberta";

  return (
    <div className="grid gap-3 rounded-xl border p-4 text-sm">
      <p>
        <span className="text-muted-foreground">Quem responde: </span>
        atendido por {flowName}
        {broadcast.reply.pipelineId && `, vira negócio no funil ${pipeline?.name ?? "escolhido"} (${stageName})`}.
      </p>
      {broadcast.frequencyCapDays && (
        <p>
          <span className="text-muted-foreground">Limite de frequência: </span>
          não envia a quem recebeu outra campanha de marketing nos últimos {broadcast.frequencyCapDays} dias.
        </p>
      )}
      {metrics && (
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-muted-foreground text-xs">Pediram para sair</dt>
            <dd className="font-medium tabular-nums">
              {formatCount(metrics.optedOut)}
              {optOutRate !== null && ` · ${optOutRate}% dos entregues`}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Cobradas pela Meta</dt>
            <dd className="font-medium tabular-nums">
              {formatCount(billedTotal)}
              {billedCost !== null && ` · cerca de ${formatUsd(billedCost)}`}
            </dd>
            {billedTotal > 0 && (
              <dd className="text-muted-foreground text-xs">
                {Object.entries(metrics.billable)
                  .map(([category, count]) => `${formatCount(count)} de ${categoryLabel[category] ?? category.toLowerCase()}`)
                  .join(", ")}
                . O valor vem da tabela pública; a fatura da Meta é a referência.
              </dd>
            )}
          </div>
        </dl>
      )}
    </div>
  );
};

/** Duplicar a campanha e exportar os destinatários. */
export const BroadcastMoreActions: FC<{ broadcast: Broadcast; canSend: boolean }> = ({ broadcast, canSend }) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const started = !!broadcast.startedAt;

  const duplicateMutation = useMutation({
    mutationFn: (audience: "ALL" | "NOT_READ" | "NOT_REPLIED") => broadcastService.duplicate(client.id, broadcast.id, audience),
    onError: requestErrorHandling,
    onSuccess: (copy) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id] });
      toast.success("Rascunho criado", { description: `${formatCount(copy.totals.total)} destinatários. Revise e inicie quando quiser.` });
      navigate(`${baseUrl}/broadcasts/${copy.id}`);
    },
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      const recipients: BroadcastRecipient[] = [];
      for (let page = 1; ; page++) {
        const result = await broadcastService.findRecipients(client.id, broadcast.id, { page, take: EXPORT_PAGE });
        recipients.push(...result.items);
        if (recipients.length >= result.total || result.items.length === 0) break;
      }
      return recipients;
    },
    onError: requestErrorHandling,
    onSuccess: (recipients) => {
      const url = URL.createObjectURL(new Blob([recipientsToCsv(recipients)], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${broadcast.name.replace(/[^\p{L}\p{N} _-]+/gu, "").trim() || "campanha"}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });

  const busy = duplicateMutation.isPending || exportMutation.isPending;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={busy}>
          {exportMutation.isPending ? "Exportando..." : duplicateMutation.isPending ? "Duplicando..." : "Mais"}
          <ChevronDown className="ml-1 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => exportMutation.mutate()}>Exportar destinatários (CSV)</DropdownMenuItem>
        {canSend && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => duplicateMutation.mutate("ALL")}>Duplicar campanha</DropdownMenuItem>
            {started && (
              <DropdownMenuItem onSelect={() => duplicateMutation.mutate("NOT_READ")}>Nova campanha para quem não leu</DropdownMenuItem>
            )}
            {started && (
              <DropdownMenuItem onSelect={() => duplicateMutation.mutate("NOT_REPLIED")}>
                Nova campanha para quem não respondeu
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
