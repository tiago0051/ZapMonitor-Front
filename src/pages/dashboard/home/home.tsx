import { ErrorState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { homeService } from "@/services/api/homeService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ListChecks } from "lucide-react";
import type { FC } from "react";
import { FaWhatsapp } from "react-icons/fa";
import { Link } from "react-router";
import { GettingStarted } from "./components/gettingStarted";
import { useGuideSteps, useGuideVisibility } from "./components/gettingStartedSteps";
import { HomeMetrics } from "./components/homeMetrics";
import { HomeShortcuts } from "./components/homeShortcuts";

// Fila e conversas mudam o tempo todo; o resto é barato de recontar
const REFRESH_INTERVAL_MS = 60 * 1000;

const greeting = (date: Date) => {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

export const HomePage: FC = () => {
  const baseUrl = useBaseUrl();
  const { client, can } = useClientContext();
  const { user } = useUserContext();

  const overviewQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["home", "overview", client.id],
    queryFn: () =>
      homeService.findOverview({ params: { clientId: client.id }, queries: { timezoneOffset: new Date().getTimezoneOffset() } }),
    refetchInterval: REFRESH_INTERVAL_MS,
  });

  const steps = useGuideSteps(overviewQuery.data?.onboarding);
  const { isHidden, setHidden } = useGuideVisibility(client.id, user?.id ?? "");
  const pendingSteps = steps.filter((step) => !step.done).length;
  const showGuide = !isHidden && pendingSteps > 0;

  const now = new Date();
  const firstName = user?.name?.trim().split(/\s+/)[0];

  return (
    <div className="mx-auto size-full max-w-7xl overflow-auto px-4 py-6">
      <div className="space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted-foreground text-sm first-letter:uppercase">{format(now, "EEEE, d 'de' MMMM", { locale: ptBR })}</p>
            <h1 className="text-2xl font-semibold">
              {greeting(now)}
              {firstName ? `, ${firstName}` : ""}!
            </h1>
            <p className="text-muted-foreground text-sm">Veja como está o {client.name} e continue de onde parou.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {isHidden && pendingSteps > 0 && (
              <Button variant="outline" onClick={() => setHidden(false)}>
                <ListChecks className="h-4 w-4" />
                Primeiros passos ({steps.length - pendingSteps}/{steps.length})
              </Button>
            )}
            {can("whatsapp.chat") && (
              <Button asChild className="bg-green-600 text-white hover:bg-green-700">
                <Link to={`${baseUrl}/whatsapp`}>
                  <FaWhatsapp className="h-4 w-4" />
                  Abrir atendimento
                </Link>
              </Button>
            )}
          </div>
        </header>

        {showGuide && <GettingStarted steps={steps} onHide={() => setHidden(true)} />}

        {overviewQuery.isError ? (
          <ErrorState
            message="Não foi possível carregar o resumo."
            onRetry={() => overviewQuery.refetch()}
            isRetrying={overviewQuery.isFetching}
          />
        ) : (
          <HomeMetrics metrics={overviewQuery.data?.metrics} isLoading={overviewQuery.isLoading} />
        )}

        <HomeShortcuts />
      </div>
    </div>
  );
};
