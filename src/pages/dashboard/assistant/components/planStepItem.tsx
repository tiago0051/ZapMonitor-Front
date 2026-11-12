import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Check, ChevronRight, Pencil, ShieldAlert, Undo2, X } from "lucide-react";
import { useState, type FC } from "react";
import { stepStatusInfo } from "../assistantUtils";
import { StatusChip } from "./assistantDialogs";

type PlanStepItemProps = {
  step: AssistantStep;
  canEditInput: boolean;
  busy: boolean;
  onApprove: (confirmSensitive: boolean) => void;
  onReject: () => void;
  onEditInput: () => void;
  onUndo: () => void;
};

const dependsOnText = (positions: number[]) => {
  if (positions.length === 1) return `Depende do passo ${positions[0]}`;
  const sorted = [...positions].sort((a, b) => a - b);
  return `Depende dos passos ${sorted.slice(0, -1).join(", ")} e ${sorted[sorted.length - 1]}`;
};

export const PlanStepItem: FC<PlanStepItemProps> = ({ step, canEditInput, busy, onApprove, onReject, onEditInput, onUndo }) => {
  const [readSensitive, setReadSensitive] = useState(false);
  const status = stepStatusInfo[step.status];
  const isPending = step.status === "PENDING";
  const decide = isPending && step.canDecide;
  const checkboxId = `assistant-step-read-${step.id}`;

  return (
    <li className="grid gap-2 rounded-lg border p-3">
      <div className="flex items-start gap-2">
        <span
          aria-hidden
          className="bg-muted flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold tabular-nums"
        >
          {step.position}
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-medium break-words">
              <span className="sr-only">Passo {step.position}: </span>
              {step.title}
            </p>
            <StatusChip label={status.label} className={status.className} />
            {step.sensitive && (
              <span className="inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] font-medium text-red-800 dark:bg-red-500/20 dark:text-red-300">
                <ShieldAlert className="h-3 w-3" />
                sensível
              </span>
            )}
          </div>
          {step.preview && <p className="text-muted-foreground text-sm break-words">{step.preview}</p>}
          {step.dependsOn.length > 0 && <p className="text-muted-foreground text-xs">{dependsOnText(step.dependsOn)}</p>}
        </div>
      </div>

      {step.previewDetail && (
        <details className="group ml-8">
          <summary className="text-muted-foreground hover:text-foreground flex cursor-pointer list-none items-center gap-1 text-xs font-medium select-none [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
            Ver o que este passo faz
          </summary>
          <pre className="bg-muted/50 mt-2 max-h-72 overflow-auto rounded-md p-3 font-mono text-xs break-words whitespace-pre-wrap">
            {step.previewDetail}
          </pre>
        </details>
      )}

      {step.status === "REJECTED" && step.rejectReason && (
        <p className="text-muted-foreground ml-8 text-xs">Motivo da recusa: {step.rejectReason}</p>
      )}
      {step.status === "STALE" && (
        <p className="ml-8 text-xs text-amber-700 dark:text-amber-300">
          O que este passo ia mudar foi alterado depois do plano. Peça ao assistente para refazer a proposta.
        </p>
      )}
      {step.resultSummary && (
        <p className="ml-8 rounded-md bg-emerald-50 px-2 py-1.5 text-xs text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
          {step.resultSummary}
        </p>
      )}
      {step.error && <p className="text-destructive bg-destructive/10 ml-8 rounded-md px-2 py-1.5 text-xs">{step.error}</p>}
      {step.undoneAt && <p className="text-muted-foreground ml-8 text-xs">Desfeito em {format(new Date(step.undoneAt), "dd/MM HH:mm")}</p>}
      {isPending && !step.canDecide && (
        <p className="text-muted-foreground ml-8 text-xs">Aguardando quem tem permissão para aprovar este passo.</p>
      )}

      {decide && step.sensitive && (
        <div className="ml-8 flex items-start gap-2 rounded-md border border-red-200 p-2 dark:border-red-500/30">
          <Checkbox
            id={checkboxId}
            checked={readSensitive}
            onCheckedChange={(checked) => setReadSensitive(checked === true)}
            className="mt-0.5"
          />
          <Label htmlFor={checkboxId} className="grid gap-0.5 leading-snug font-normal">
            <span className="font-medium">Li o que este passo faz</span>
            <span className="text-muted-foreground text-xs">Ele pode mandar mensagem a clientes, gastar verba ou pôr algo no ar.</span>
          </Label>
        </div>
      )}

      {(decide || (isPending && canEditInput) || step.canUndo) && (
        <div className="ml-8 flex flex-wrap gap-2">
          {decide && (
            <>
              <Button size="sm" disabled={busy || (step.sensitive && !readSensitive)} onClick={() => onApprove(step.sensitive)}>
                <Check className="h-4 w-4" />
                Aprovar
              </Button>
              <Button size="sm" variant="outline" disabled={busy} onClick={onReject}>
                <X className="h-4 w-4" />
                Recusar
              </Button>
            </>
          )}
          {isPending && canEditInput && (
            <Button size="sm" variant="ghost" disabled={busy} onClick={onEditInput}>
              <Pencil className="h-4 w-4" />
              Editar entrada
            </Button>
          )}
          {step.canUndo && (
            <Button size="sm" variant="outline" disabled={busy} onClick={onUndo}>
              <Undo2 className="h-4 w-4" />
              Desfazer
            </Button>
          )}
        </div>
      )}
    </li>
  );
};
