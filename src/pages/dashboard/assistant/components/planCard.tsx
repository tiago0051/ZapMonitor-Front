import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { cn } from "@/lib/utils";
import { assistantService } from "@/services/api/assistantService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { CheckCheck, ClipboardList, Loader2, Play, X } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { assistantKeys, isPlanRunning, planStatusInfo, storePlan } from "../assistantUtils";
import { ReasonDialog, StatusChip, StepInputDialog } from "./assistantDialogs";
import { PlanStepItem } from "./planStepItem";

type PlanCardProps = {
  plan: AssistantPlan;
  highlighted?: boolean;
  className?: string;
};

// Recusa de um passo ou do plano inteiro
type RejectTarget = { kind: "step"; step: AssistantStep } | { kind: "plan" };

/** Plano proposto pelo assistente: cada passo é aprovado por quem tem a permissão dele e depois o plano é executado. */
export const PlanCard: FC<PlanCardProps> = ({ plan: initialPlan, highlighted, className }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [editingStep, setEditingStep] = useState<AssistantStep | null>(null);

  const planQuery = useQuery({
    queryKey: assistantKeys.plan(client.id, initialPlan.id),
    queryFn: () => assistantService.findPlan(client.id, initialPlan.id),
    initialData: initialPlan,
    staleTime: 10_000,
    // Acompanha a execução até terminar
    refetchInterval: (query) => (query.state.data && isPlanRunning(query.state.data.status) ? 3000 : false),
  });
  const plan = planQuery.data;

  // Quando a execução termina, atualiza o histórico e a conversa
  const wasRunning = useRef(isPlanRunning(plan.status));
  useEffect(() => {
    if (isPlanRunning(plan.status)) {
      wasRunning.current = true;
      return;
    }
    if (!wasRunning.current) return;
    wasRunning.current = false;
    storePlan(queryClient, client.id, plan);
    if (plan.status === "DONE") toast.success("Plano executado");
    else if (plan.status === "PARTIAL") toast.warning("Plano executado em parte. Veja os passos que falharam.");
    else if (plan.status === "FAILED") toast.error("O plano falhou. Veja o erro em cada passo.");
  }, [plan, queryClient, client.id]);

  const onPlan = (updated: AssistantPlan) => storePlan(queryClient, client.id, updated);

  const decide = useMutation({
    mutationFn: (variables: { stepId: string; approved: boolean; reason?: string; confirmSensitive?: boolean }) =>
      assistantService.decideStep(client.id, plan.id, variables.stepId, {
        approved: variables.approved,
        reason: variables.reason,
        confirmSensitive: variables.confirmSensitive,
      }),
    onSuccess: (updated) => {
      onPlan(updated);
      setRejectTarget(null);
    },
    onError: requestErrorHandling,
  });
  const editInput = useMutation({
    mutationFn: (variables: { stepId: string; input: Record<string, unknown> }) =>
      assistantService.editStepInput(client.id, plan.id, variables.stepId, variables.input),
    onSuccess: (updated) => {
      onPlan(updated);
      setEditingStep(null);
      toast.success("Entrada do passo atualizada");
    },
    onError: requestErrorHandling,
  });
  const undo = useMutation({
    mutationFn: (stepId: string) => assistantService.undoStep(client.id, plan.id, stepId),
    onSuccess: (updated) => {
      onPlan(updated);
      toast.success("Passo desfeito");
    },
    onError: requestErrorHandling,
  });
  const approvePending = useMutation({
    mutationFn: () => assistantService.approvePending(client.id, plan.id),
    onSuccess: onPlan,
    onError: requestErrorHandling,
  });
  const rejectPlan = useMutation({
    mutationFn: (reason?: string) => assistantService.rejectPlan(client.id, plan.id, reason),
    onSuccess: (updated) => {
      onPlan(updated);
      setRejectTarget(null);
      toast.success("Plano recusado");
    },
    onError: requestErrorHandling,
  });
  const execute = useMutation({
    mutationFn: () => assistantService.executePlan(client.id, plan.id),
    onSuccess: (updated) => {
      wasRunning.current = true;
      onPlan(updated);
    },
    onError: requestErrorHandling,
  });

  const busy =
    decide.isPending || editInput.isPending || undo.isPending || approvePending.isPending || rejectPlan.isPending || execute.isPending;
  const steps = [...plan.steps].sort((a, b) => a.position - b.position);
  const awaiting = plan.status === "AWAITING_APPROVAL";
  const running = isPlanRunning(plan.status);
  const isMine = !!user && plan.createdById === user.id;
  const canApproveOthers = steps.some((step) => step.status === "PENDING" && step.canDecide && !step.sensitive);
  const canRejectPlan = awaiting && (isMine || steps.some((step) => step.canDecide));
  const status = planStatusInfo[plan.status];

  const handleUndo = async (step: AssistantStep) => {
    const ok = await confirm({
      title: `Desfazer o passo ${step.position}?`,
      description: `"${step.title}" volta a ficar como estava antes do plano.`,
      confirmLabel: "Desfazer",
      destructive: true,
    });
    if (ok) undo.mutate(step.id);
  };
  const handleExecute = async () => {
    const approved = steps.filter((step) => step.status === "APPROVED").length;
    const ok = await confirm({
      title: "Executar o plano?",
      description: `${approved === 1 ? "O passo aprovado roda" : `Os ${approved} passos aprovados rodam`} agora. Os recusados ficam de fora.`,
      confirmLabel: "Executar",
    });
    if (ok) execute.mutate();
  };

  return (
    <section
      id={`assistant-plan-${plan.id}`}
      aria-label={`Plano: ${plan.title}`}
      className={cn(
        "bg-card grid min-w-0 scroll-mt-4 gap-3 rounded-xl border p-3 transition-shadow sm:p-4",
        highlighted && "ring-primary ring-2",
        className,
      )}
    >
      <header className="grid gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <ClipboardList className="text-muted-foreground h-4 w-4 shrink-0" />
          <h3 className="min-w-0 text-sm font-semibold break-words sm:text-base">{plan.title}</h3>
          <StatusChip label={status.label} className={status.className} />
          {running && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" aria-label="Executando" />}
        </div>
        {plan.goal && <p className="text-muted-foreground text-sm">{plan.goal}</p>}
        <p className="text-muted-foreground text-xs">
          Proposto em {format(new Date(plan.createdAt), "dd/MM/yyyy HH:mm")}
          {awaiting && plan.expiresAt && ` · expira em ${format(new Date(plan.expiresAt), "dd/MM HH:mm")}`}
          {plan.finishedAt && ` · terminou em ${format(new Date(plan.finishedAt), "dd/MM HH:mm")}`}
        </p>
      </header>

      {plan.status === "REJECTED" && plan.rejectionReason && (
        <p className="text-muted-foreground text-sm">Motivo da recusa: {plan.rejectionReason}</p>
      )}
      {plan.resultSummary && <p className="bg-muted/50 rounded-md px-3 py-2 text-sm whitespace-pre-wrap">{plan.resultSummary}</p>}
      {plan.reviewSummary && (
        <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 dark:border-sky-500/30 dark:bg-sky-500/10">
          <p className="text-xs font-semibold text-sky-900 dark:text-sky-200">Revisão do efeito</p>
          <p className="text-sm whitespace-pre-wrap">{plan.reviewSummary}</p>
        </div>
      )}

      <ol className="grid gap-2">
        {steps.map((step) => (
          <PlanStepItem
            key={step.id}
            step={step}
            busy={busy}
            canEditInput={awaiting && (isMine || step.canDecide)}
            onApprove={(confirmSensitive) =>
              decide.mutate({ stepId: step.id, approved: true, confirmSensitive: confirmSensitive || undefined })
            }
            onReject={() => setRejectTarget({ kind: "step", step })}
            onEditInput={() => setEditingStep(step)}
            onUndo={() => handleUndo(step)}
          />
        ))}
      </ol>

      {(canApproveOthers || canRejectPlan || awaiting || plan.canExecute) && (
        <footer className="flex flex-col-reverse gap-2 border-t pt-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          {canRejectPlan && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRejectTarget({ kind: "plan" })}>
              <X className="h-4 w-4" />
              Recusar plano
            </Button>
          )}
          {canApproveOthers && (
            <Button variant="outline" size="sm" disabled={busy} onClick={() => approvePending.mutate()}>
              {approvePending.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Aprovar os demais
            </Button>
          )}
          {(awaiting || plan.canExecute) && (
            <Button size="sm" disabled={busy || !plan.canExecute} onClick={handleExecute}>
              {execute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Executar plano
            </Button>
          )}
          {awaiting && !plan.canExecute && (
            <p className="text-muted-foreground text-xs sm:order-first sm:mr-auto">
              Dá para executar quando os passos tiverem a aprovação de quem pode aprová-los.
            </p>
          )}
        </footer>
      )}

      <ReasonDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        title={rejectTarget?.kind === "step" ? `Recusar o passo ${rejectTarget.step.position}?` : "Recusar o plano inteiro?"}
        description={
          rejectTarget?.kind === "step" ? "Os passos que dependem dele também ficam de fora." : "Nenhum passo deste plano será executado."
        }
        confirmLabel={rejectTarget?.kind === "step" ? "Recusar passo" : "Recusar plano"}
        isPending={decide.isPending || rejectPlan.isPending}
        onConfirm={(reason) => {
          if (rejectTarget?.kind === "step") decide.mutate({ stepId: rejectTarget.step.id, approved: false, reason });
          else rejectPlan.mutate(reason);
        }}
      />
      <StepInputDialog
        step={editingStep}
        onOpenChange={(open) => !open && setEditingStep(null)}
        isPending={editInput.isPending}
        onSave={(input) => editingStep && editInput.mutate({ stepId: editingStep.id, input })}
      />
      {confirmDialog}
    </section>
  );
};
