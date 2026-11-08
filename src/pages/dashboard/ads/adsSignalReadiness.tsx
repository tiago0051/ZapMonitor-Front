import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";

// Mesma régua do back: eventos por semana para a Meta otimizar por eles
const WEEKLY_TARGET = 50;
const EVENT_GOALS = new Set(["OFFSITE_CONVERSIONS", "VALUE", "CONVERSIONS"]);

const goalLabel: Record<string, string> = {
  CONVERSATIONS: "Conversas",
  REPLIES: "Respostas",
  LEAD_GENERATION: "Leads",
  QUALITY_LEAD: "Leads de qualidade",
  OFFSITE_CONVERSIONS: "Conversões",
  VALUE: "Valor",
  LINK_CLICKS: "Cliques",
  REACH: "Alcance",
};

/** Conjuntos ativos: quantos leads qualificados e compras a Meta recebeu na semana e se já dá para otimizar por eles. */
export const AdsSignalReadiness: FC<{ account: AdAccount }> = ({ account }) => {
  const { client } = useClientContext();
  const query = useQuery({
    queryKey: ["metaAds", "signalReadiness", client.id, account.id],
    queryFn: () => metaAdsService.findSignalReadiness(client.id, account.id),
  });
  const rows = query.data ?? [];
  if (!rows.length) return null;

  return (
    <div className="space-y-2">
      <div>
        <h3 className="text-sm font-semibold">Otimizar pelo evento certo</h3>
        <p className="text-muted-foreground text-xs">
          Com cerca de {WEEKLY_TARGET} leads qualificados (ou compras) por semana num conjunto, a Meta consegue otimizar por eles em vez de
          por conversa e passa a buscar quem compra. A análise de IA sugere a troca quando o conjunto chega lá.
        </p>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conjunto</TableHead>
              <TableHead>Otimiza por</TableHead>
              <TableHead className="text-right">Qualificados (7 dias)</TableHead>
              <TableHead className="text-right">Compras (7 dias)</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const optimizingByEvent = EVENT_GOALS.has(row.optimizationGoal ?? "");
              const status = optimizingByEvent
                ? { text: "Já otimiza por evento", className: "text-muted-foreground" }
                : row.ready
                  ? {
                      text: `Pronto para ${row.ready === "PURCHASE" ? "compra" : "lead qualificado"}`,
                      className: "text-green-700 dark:text-green-400 font-medium",
                    }
                  : { text: `Faltam ${row.missingQualified} qualificados na semana`, className: "text-muted-foreground" };
              return (
                <TableRow key={row.adSetId}>
                  <TableCell className="max-w-64">
                    <p className="truncate font-medium">{row.name}</p>
                    {row.campaignName && <p className="text-muted-foreground truncate text-xs">{row.campaignName}</p>}
                  </TableCell>
                  <TableCell className="text-sm">{goalLabel[row.optimizationGoal ?? ""] ?? row.optimizationGoal ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.qualified}</TableCell>
                  <TableCell className="text-right tabular-nums">{row.purchases}</TableCell>
                  <TableCell className={cn("text-sm", status.className)}>{status.text}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
