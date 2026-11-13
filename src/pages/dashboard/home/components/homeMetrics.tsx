import { Skeleton } from "@/components/ui/skeleton";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { formatNumber } from "@/lib/utils";
import { BookUser, Columns3, Headset, Hourglass, Inbox, Megaphone, MessagesSquare, type LucideIcon } from "lucide-react";
import { Link } from "react-router";

const formatCurrency = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: value >= 1000 ? 0 : 2 });

type Metric = { id: string; label: string; value: string; detail: string; icon: LucideIcon; url: string; highlight?: boolean };

const buildMetrics = (metrics: HomeMetrics): Metric[] => {
  const items: (Metric | null)[] = [
    metrics.queueWaiting === undefined
      ? null
      : {
          id: "queue",
          label: "Na fila agora",
          value: formatNumber(metrics.queueWaiting),
          detail: metrics.queueWaiting > 0 ? "Esperando um atendente" : "Ninguém esperando",
          icon: Hourglass,
          url: "whatsapp",
          highlight: metrics.queueWaiting > 0,
        },
    metrics.myConversations === undefined
      ? null
      : {
          id: "mine",
          label: "Suas conversas",
          value: formatNumber(metrics.myConversations),
          detail: "Com você agora",
          icon: Inbox,
          url: "whatsapp",
        },
    metrics.inService === undefined
      ? null
      : {
          id: "inService",
          label: "Em atendimento",
          value: formatNumber(metrics.inService),
          detail: "Com a equipe agora",
          icon: Headset,
          url: "management?tab=inProgress",
        },
    metrics.servicesToday === undefined
      ? null
      : {
          id: "today",
          label: "Atendimentos hoje",
          value: formatNumber(metrics.servicesToday),
          detail: "Conversas iniciadas desde 0h",
          icon: MessagesSquare,
          url: "management?tab=performance",
        },
    metrics.newContactsLast7Days === undefined
      ? null
      : {
          id: "contacts",
          label: "Contatos novos",
          value: formatNumber(metrics.newContactsLast7Days),
          detail: "Nos últimos 7 dias",
          icon: BookUser,
          url: "contacts",
        },
    metrics.openDeals === undefined
      ? null
      : {
          id: "deals",
          label: "Negócios em aberto",
          value: formatNumber(metrics.openDeals.count),
          detail: metrics.openDeals.value > 0 ? `${formatCurrency(metrics.openDeals.value)} no funil` : "No funil de vendas",
          icon: Columns3,
          url: "crm",
        },
    metrics.activeBroadcasts === undefined
      ? null
      : {
          id: "broadcasts",
          label: "Campanhas ativas",
          value: formatNumber(metrics.activeBroadcasts),
          detail: "Agendadas, enviando ou pausadas",
          icon: Megaphone,
          url: "broadcasts",
        },
  ];

  return items.filter((item) => item !== null);
};

export const HomeMetrics = ({ metrics, isLoading }: { metrics?: HomeMetrics; isLoading: boolean }) => {
  const baseUrl = useBaseUrl();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const items = metrics ? buildMetrics(metrics) : [];
  if (items.length === 0) return null;

  return (
    <section aria-labelledby="home-metrics" className="space-y-3">
      <h2 id="home-metrics" className="text-lg font-semibold">
        Resumo
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`${baseUrl}/${item.url}`}
            className="bg-card hover:bg-muted/60 focus-visible:ring-ring rounded-xl border p-4 shadow-xs transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <span className="text-muted-foreground flex items-center gap-2 text-xs">
              <item.icon className="h-4 w-4 shrink-0" aria-hidden />
              <span className="truncate">{item.label}</span>
            </span>
            <span className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-semibold tabular-nums">{item.value}</span>
              {item.highlight && <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />}
            </span>
            <span className="text-muted-foreground mt-0.5 block truncate text-xs">{item.detail}</span>
          </Link>
        ))}
      </div>
    </section>
  );
};
