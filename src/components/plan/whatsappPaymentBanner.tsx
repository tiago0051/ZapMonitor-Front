import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CreditCard } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";

// A marca muda quando a Meta recusa ou volta a entregar um modelo; a cada 5 minutos basta
const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Faixa no topo do painel, para todos, enquanto a Meta recusa os modelos por problema de pagamento da conta do WhatsApp. */
export const WhatsappPaymentBanner: FC = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();

  const issuesQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsappPaymentIssues", client.id],
    queryFn: () => whatsappService.findPaymentIssues(client.id),
    refetchInterval: REFRESH_INTERVAL_MS,
    staleTime: REFRESH_INTERVAL_MS,
  });

  const issues = issuesQuery.data ?? [];
  if (!issues.length) return null;

  const [first] = issues;
  const numbers = issues.map((issue) => issue.phoneNumber).join(", ");
  const canFix = can("channels.manage");

  return (
    <div
      role="alert"
      className="flex shrink-0 items-start gap-2 border-b bg-red-50 px-4 py-2 text-sm text-red-900 dark:bg-red-950/40 dark:text-red-200"
    >
      <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="min-w-0">
        <span className="font-medium">Problema no pagamento do WhatsApp</span> ({issues.length > 1 ? "números" : "número"} {numbers}, desde{" "}
        {format(new Date(first.since), "dd/MM HH:mm")}): {first.message}{" "}
        {canFix ? (
          <>
            <a href={first.billingUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
              Regularizar na Meta
            </a>
            {" · "}
            <Link to={`${baseUrl}/configuration?tab=numbers`} className="underline underline-offset-2">
              Ver números
            </Link>
          </>
        ) : (
          "Avise o administrador da empresa."
        )}
      </p>
    </div>
  );
};
