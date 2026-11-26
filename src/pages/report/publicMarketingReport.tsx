import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { marketingReportService, marketingReportPdfUrl } from "@/services/api/marketingReportService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useEffect } from "react";
import { useParams } from "react-router";
import { MarketingReportView } from "./marketingReportView";

/** Página pública do relatório do mês: sem login, só leitura, pelo token do link. */
export const PublicMarketingReport = () => {
  const { token = "" } = useParams();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["publicMarketingReport", token],
    queryFn: () => marketingReportService.findPublic(token),
    retry: false,
  });

  useEffect(() => {
    document.title = query.data ? `Relatório · ${query.data.clientName}` : "Relatório de marketing";
  }, [query.data]);

  return (
    <div className="bg-background min-h-dvh">
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        {query.isLoading && <LoadingState label="Carregando relatório..." />}
        {query.isError && <ErrorState message="Este relatório não existe mais ou o link expirou. Peça um link novo a quem enviou." />}
        {query.data && (
          <>
            <div className="mb-4 flex justify-end print:hidden">
              <Button variant="outline" size="sm" asChild>
                <a href={marketingReportPdfUrl(token)} download>
                  <Download className="h-4 w-4" aria-hidden />
                  Baixar PDF
                </a>
              </Button>
            </div>
            <MarketingReportView data={query.data} />
            <p className="text-muted-foreground mt-8 text-xs">
              Link somente leitura, válido até {format(new Date(query.data.expiresAt), "dd/MM/yyyy")}.
            </p>
          </>
        )}
      </main>
    </div>
  );
};
