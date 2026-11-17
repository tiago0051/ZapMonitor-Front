import { useBaseUrl } from "@/hooks/use-baseUrl";
import { AlertTriangle, Loader2 } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";

type ResourceUsageNoticeProps = {
  usage: ResourceUsage | undefined;
  isLoading: boolean;
  // Ex.: "o agente" / "o grupo", para a orientação
  resourceLabel: string;
  onNavigate: () => void;
};

/** Lista os fluxos que usam o recurso no diálogo de exclusão; com algum uso, a exclusão fica bloqueada. */
export const ResourceUsageNotice: FC<ResourceUsageNoticeProps> = ({ usage, isLoading, resourceLabel, onNavigate }) => {
  const baseUrl = useBaseUrl();

  if (isLoading)
    return (
      <p className="text-muted-foreground flex items-center justify-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        Verificando onde é usado...
      </p>
    );

  if (!usage?.flows.length) return null;

  return (
    <div className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-left text-sm dark:border-amber-700/60 dark:bg-amber-950/30">
      <p className="flex items-center gap-1.5 font-medium text-amber-800 dark:text-amber-300">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        Usado em:
      </p>
      <ul className="space-y-1">
        {usage.flows.map((flow) => (
          <li key={flow.flowId}>
            <Link to={`${baseUrl}/configuration/flow/${flow.flowId}`} onClick={onNavigate} className="underline underline-offset-2">
              {flow.description}
            </Link>
          </li>
        ))}
      </ul>
      <p className="text-muted-foreground text-xs">
        Abra esses fluxos e troque ou remova {resourceLabel} antes de excluir. Assim nenhum contato fica sem atendimento.
      </p>
    </div>
  );
};
