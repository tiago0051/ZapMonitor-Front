import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { assistantService } from "@/services/api/assistantService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { History } from "lucide-react";
import { useMemo, type FC } from "react";
import { assistantKeys, auditActionLabel, auditOutcomeInfo } from "./assistantUtils";
import { StatusChip } from "./components/assistantDialogs";
import { useAssistantTools } from "./useAssistantTools";

/** Tudo o que o assistente consultou, propôs, aprovou, executou e desfez. */
export const AuditTab: FC = () => {
  const { client, can } = useClientContext();
  const auditQuery = useQuery({
    queryKey: assistantKeys.audit(client.id),
    queryFn: () => assistantService.findAudit(client.id),
  });
  const toolsQuery = useAssistantTools();
  const toolNames = useMemo(() => new Map(toolsQuery.data?.map((tool) => [tool.name, tool.description])), [toolsQuery.data]);

  if (auditQuery.isLoading) return <LoadingState label="Carregando histórico..." />;
  if (auditQuery.isError)
    return (
      <ErrorState message="Não foi possível buscar o histórico." onRetry={() => auditQuery.refetch()} isRetrying={auditQuery.isFetching} />
    );

  const entries = auditQuery.data ?? [];
  const scope = can("members.manage")
    ? "Mostra o que todas as pessoas fizeram com o assistente."
    : "Mostra o que você fez com o assistente.";
  if (entries.length === 0) return <EmptyState icon={History} title="Nada no histórico ainda" description={scope} />;

  const toolText = (tool: string | null) => (tool ? (toolNames.get(tool) ?? tool) : "—");

  return (
    <div className="grid gap-2">
      <p className="text-muted-foreground text-xs">{scope}</p>

      {/* Celular: cartões */}
      <ul className="grid gap-2 md:hidden">
        {entries.map((entry) => {
          const outcome = auditOutcomeInfo[entry.outcome];
          return (
            <li key={entry.id} className="grid gap-1 rounded-lg border p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-medium">{auditActionLabel[entry.action] ?? entry.action}</span>
                <StatusChip label={outcome.label} className={outcome.className} />
                <span className="text-muted-foreground ml-auto text-xs tabular-nums">
                  {format(new Date(entry.createdAt), "dd/MM HH:mm")}
                </span>
              </div>
              <p className="text-muted-foreground text-xs break-words">{toolText(entry.tool)}</p>
              {entry.detail && <p className="text-xs break-words">{entry.detail}</p>}
            </li>
          );
        })}
      </ul>

      {/* Computador: tabela */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs">
            <tr>
              <th className="px-3 py-2 font-medium">Quando</th>
              <th className="px-3 py-2 font-medium">Ação</th>
              <th className="px-3 py-2 font-medium">Ferramenta</th>
              <th className="px-3 py-2 font-medium">Resultado</th>
              <th className="px-3 py-2 font-medium">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const outcome = auditOutcomeInfo[entry.outcome];
              return (
                <tr key={entry.id} className="border-t align-top">
                  <td className="px-3 py-2 whitespace-nowrap tabular-nums">{format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}</td>
                  <td className="px-3 py-2 whitespace-nowrap">{auditActionLabel[entry.action] ?? entry.action}</td>
                  <td className="max-w-64 px-3 py-2 break-words">{toolText(entry.tool)}</td>
                  <td className="px-3 py-2">
                    <StatusChip label={outcome.label} className={outcome.className} />
                  </td>
                  <td className="text-muted-foreground max-w-md px-3 py-2 break-words">{entry.detail ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
