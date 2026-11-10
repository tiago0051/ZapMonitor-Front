import { ErrorState, LoadingState } from "@/components/state-message";
import { cn } from "@/lib/utils";
import type { UseQueryResult } from "@tanstack/react-query";
import { CheckCircle2, ShieldAlert, ShieldCheck } from "lucide-react";
import type { FC } from "react";
import { complianceFieldLabel, focusComplianceIssue } from "./complianceUtils";

const severityInfo: Record<AdComplianceSeverity, { label: string; className: string; chipClassName: string }> = {
  BLOCK: {
    label: "Impede publicar",
    className: "border-red-200 bg-red-50/60 dark:border-red-900/60 dark:bg-red-950/20",
    chipClassName: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300",
  },
  WARN: {
    label: "Atenção",
    className: "border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20",
    chipClassName: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
};

type Props = {
  query: UseQueryResult<AdComplianceIssue[]>;
  plan: AdCampaignPlan;
  // Plano mudou depois de salvar: a revisão mostrada é da última versão salva
  isStale: boolean;
};

/** Revisão de políticas do rascunho salvo: o que impede publicar e o que só pede atenção. */
export const CompliancePanel: FC<Props> = ({ query, plan, isStale }) => {
  const issues = query.data ?? [];
  const blocking = issues.filter((issue) => issue.severity === "BLOCK");
  const warnings = issues.filter((issue) => issue.severity === "WARN");
  const creativeName = (key: string) => plan.creatives.find((creative) => creative.key === key)?.name.trim() || key;

  const summary =
    issues.length === 0
      ? "Nenhum problema encontrado"
      : [
          blocking.length > 0 && `${blocking.length} ${blocking.length > 1 ? "itens impedem" : "item impede"} publicar`,
          warnings.length > 0 && `${warnings.length} ${warnings.length > 1 ? "avisos" : "aviso"}`,
        ]
          .filter(Boolean)
          .join(" · ");

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {blocking.length > 0 ? (
          <ShieldAlert className="text-destructive h-4 w-4 shrink-0" />
        ) : (
          <ShieldCheck className="h-4 w-4 shrink-0 text-green-600" />
        )}
        <p className="text-sm font-medium">Revisão de políticas</p>
      </div>
      {query.isLoading ? (
        <LoadingState label="Revisando os textos…" className="justify-start py-2" />
      ) : query.isError ? (
        <ErrorState
          message="Não foi possível revisar os textos"
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
          className="py-4"
        />
      ) : (
        <>
          <p className={cn("flex items-center gap-1.5 text-sm", issues.length === 0 && "text-muted-foreground")}>
            {issues.length === 0 && <CheckCircle2 className="h-4 w-4 text-green-600" />}
            {summary}
          </p>
          {isStale && <p className="text-xs text-amber-700 dark:text-amber-400">Você mudou o plano. Salve para revisar de novo.</p>}
          {issues.length > 0 && (
            <ul className="space-y-2">
              {[...blocking, ...warnings].map((issue, index) => {
                const info = severityInfo[issue.severity];
                const where = [
                  issue.creativeKey && `Anúncio "${creativeName(issue.creativeKey)}"`,
                  issue.field && complianceFieldLabel[issue.field],
                ]
                  .filter(Boolean)
                  .join(" · ");
                const canFocus = !!issue.creativeKey || issue.field === "specialAdCategory";

                return (
                  <li key={`${issue.ruleId}-${issue.creativeKey}-${issue.field}-${index}`}>
                    <button
                      type="button"
                      disabled={!canFocus}
                      onClick={() => focusComplianceIssue(issue)}
                      className={cn(
                        "focus-visible:ring-ring/50 w-full space-y-1 rounded-md border p-2 text-left outline-none focus-visible:ring-[3px]",
                        info.className,
                        canFocus ? "cursor-pointer hover:brightness-95 dark:hover:brightness-110" : "cursor-default",
                      )}
                    >
                      <span className="flex flex-wrap items-center gap-2">
                        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", info.chipClassName)}>{info.label}</span>
                        {where && <span className="text-muted-foreground text-xs">{where}</span>}
                      </span>
                      {issue.excerpt && <span className="block text-sm italic">“{issue.excerpt}”</span>}
                      <span className="block text-sm">{issue.message}</span>
                      <span className="text-muted-foreground block text-xs">
                        <span className="text-foreground font-medium">Como resolver:</span> {issue.suggestion}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
      <p className="text-muted-foreground text-xs">
        A revisão pega os problemas mais comuns antes de gastar, mas não substitui a análise da Meta, que revisa cada anúncio ao ativar.
      </p>
    </div>
  );
};
