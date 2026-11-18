import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { marketingReportService, marketingReportUrl } from "@/services/api/marketingReportService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Copy, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

const monthLabel = (month: string) => format(new Date(`${month}-01T12:00`), "MMMM 'de' yyyy", { locale: ptBR });

const copyLink = async (token: string) => {
  try {
    await navigator.clipboard.writeText(marketingReportUrl(token));
    toast.success("Link copiado");
  } catch {
    toast.error("Não deu para copiar; selecione o link e copie");
  }
};

/**
 * "Gerar relatório do mês": cria a foto do mês com um link público só de leitura (vale 30 dias) para mandar ao dono ou ao
 * cliente. A lista mostra os links gerados e deixa revogar.
 */
export const MarketingReportButton: FC<{ className?: string }> = ({ className }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [open, setOpen] = useState(false);
  const months = [0, 1, 2].map((offset) => format(subMonths(new Date(), offset), "yyyy-MM"));
  // Nos primeiros dias, o mês passado é o que faz sentido mandar
  const [month, setMonth] = useState(new Date().getDate() <= 5 ? months[1] : months[0]);

  const reportsQuery = useQuery({
    enabled: open,
    queryKey: ["marketingReports", client.id],
    queryFn: () => marketingReportService.findAll(client.id),
  });
  const create = useMutation({
    mutationFn: () => marketingReportService.create(client.id, { month }),
    onError: requestErrorHandling,
    onSuccess: (report) => {
      queryClient.invalidateQueries({ queryKey: ["marketingReports", client.id] });
      void copyLink(report.token);
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) => marketingReportService.revoke(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketingReports", client.id] });
      toast.success("Link revogado; quem tiver o endereço não vê mais o relatório");
    },
  });

  const latest = create.data;
  const reports = reportsQuery.data ?? [];

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}>
        <FileText className="h-4 w-4" aria-hidden />
        Gerar relatório do mês
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Relatório do mês</DialogTitle>
            <DialogDescription>
              Gasto, conversas, vendas do CRM, custo por venda, reuniões, o que a IA mudou e os próximos passos, num link que qualquer
              pessoa abre sem login. O link vale 30 dias e você pode revogar quando quiser.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-1">
              <Label htmlFor="report-month">Mês</Label>
              <select
                id="report-month"
                value={month}
                onChange={(event) => setMonth(event.target.value)}
                className="border-input bg-background h-9 rounded-md border px-3 text-sm capitalize"
              >
                {months.map((option) => (
                  <option key={option} value={option}>
                    {monthLabel(option)}
                  </option>
                ))}
              </select>
            </div>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" aria-hidden />}
              {create.isPending ? "Juntando os números..." : "Gerar link"}
            </Button>
          </div>

          {latest && (
            <div className="grid gap-2 rounded-lg border border-emerald-300 bg-emerald-50 p-3 dark:border-emerald-800 dark:bg-emerald-950">
              <p className="text-sm font-medium">Link pronto (já copiado)</p>
              <div className="flex gap-2">
                <Input readOnly value={marketingReportUrl(latest.token)} onFocus={(event) => event.target.select()} aria-label="Link" />
                <Button size="icon" variant="outline" aria-label="Copiar link" onClick={() => void copyLink(latest.token)}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button asChild size="icon" variant="outline" aria-label="Abrir relatório">
                  <a href={marketingReportUrl(latest.token)} target="_blank" rel="noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          )}

          {reports.length > 0 && (
            <section className="grid gap-2" aria-label="Links gerados">
              <h3 className="text-sm font-medium">Links gerados</h3>
              <ul className="divide-y rounded-lg border">
                {reports.map((report) => (
                  <li key={report.id} className="flex flex-wrap items-center gap-2 p-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="capitalize">{monthLabel(report.month)}</p>
                      <p className="text-muted-foreground text-xs">
                        Gerado em {format(new Date(report.createdAt), "dd/MM HH:mm")} ·{" "}
                        {report.revokedAt
                          ? "revogado"
                          : report.available
                            ? `vale até ${format(new Date(report.expiresAt), "dd/MM")}`
                            : "expirado"}
                      </p>
                    </div>
                    {report.available && (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => void copyLink(report.token)}>
                          <Copy className="h-4 w-4" aria-hidden />
                          Copiar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          disabled={revoke.isPending}
                          onClick={async () => {
                            if (
                              await confirm({
                                title: "Revogar o link?",
                                description: "Quem tiver o endereço não vai mais conseguir abrir este relatório.",
                                destructive: true,
                                confirmLabel: "Revogar",
                              })
                            )
                              revoke.mutate(report.id);
                          }}
                        >
                          Revogar
                        </Button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
};
