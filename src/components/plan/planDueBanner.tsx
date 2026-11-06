import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { CalendarClock } from "lucide-react";
import type { FC } from "react";
import { formatPlanDate } from "./planExpired";

// Mesmo prazo do e-mail ao implantador
const WARNING_DAYS = 7;

/**
 * Aviso dos últimos dias do plano para quem administra o tenant, e de plano vencido para o implantador
 * (que continua entrando). Os demais usuários só veem a tela de bloqueio quando vence.
 */
export const PlanDueBanner: FC = () => {
  const { access, can } = useClientContext();
  const plan = access.plan;
  const isImplanter = access.role === "IMPLANTER";
  if (!plan?.dueDate || plan.daysUntilDue === null || !(isImplanter || can("members.manage"))) return null;
  if (!plan.expired && plan.daysUntilDue > WARNING_DAYS) return null;

  const date = formatPlanDate(plan.dueDate);
  const text = plan.expired
    ? `O plano venceu em ${date}. Os usuários deste cliente estão sem acesso até a renovação; o atendimento automático continua.`
    : plan.daysUntilDue === 0
      ? `O plano vence hoje (${date}). Sem renovação, os usuários perdem o acesso à meia-noite.`
      : `O plano vence em ${plan.daysUntilDue} dia(s), em ${date}. Sem renovação, os usuários perdem o acesso no dia seguinte.`;

  return (
    <div
      role="status"
      className={cn(
        "flex shrink-0 items-start gap-2 border-b px-4 py-2 text-sm",
        plan.expired
          ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200"
          : "bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
      )}
    >
      <CalendarClock className="mt-0.5 h-4 w-4 shrink-0" />
      <p>
        {text} {isImplanter ? "Renove pelo painel do implantador." : "Fale com o implantador responsável para renovar."}
      </p>
    </div>
  );
};
