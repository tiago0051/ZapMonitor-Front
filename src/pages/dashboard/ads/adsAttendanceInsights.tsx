import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { formatCount, formatMoney } from "./adsUtils";

const bucketLabel: Record<AdResponseBucket, string> = {
  UP_TO_5: "Até 5 min",
  UP_TO_15: "5 a 15 min",
  UP_TO_60: "15 a 60 min",
  OVER_60: "Mais de 1 hora",
  NO_REPLY: "Sem resposta da equipe",
};

const percent = (value: number | null) => (value === null ? "—" : `${Math.round(value * 100)}%`);

type Props = { account: AdAccount; startDate: string; endDate: string };

/** Quanto o tempo de resposta e o horário de chegada pesam nas vendas dos anúncios. */
export const AdsAttendanceInsights: FC<Props> = ({ account, startDate, endDate }) => {
  const { client } = useClientContext();
  const responseQuery = useQuery({
    queryKey: ["metaAds", "responseTime", client.id, account.id, startDate, endDate],
    queryFn: () => metaAdsService.findResponseAnalysis(client.id, account.id, { startDate, endDate }),
  });
  const hoursQuery = useQuery({
    queryKey: ["metaAds", "hours", client.id, account.id, startDate, endDate],
    queryFn: () => metaAdsService.findHourAnalysis(client.id, account.id, { startDate, endDate }),
  });
  const response = responseQuery.data;
  const hours = hoursQuery.data;
  if (!response?.deals && !hours?.deals) return null;

  const maxDeals = Math.max(1, ...(hours?.hours.map((row) => row.deals) ?? [1]));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {response && response.deals > 0 && (
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Custo de não responder</h3>
            <p className="text-muted-foreground text-xs">
              Tempo até a primeira mensagem de alguém da equipe nos {formatCount(response.deals)} negócios dos anúncios. Resposta automática
              não conta.
            </p>
          </div>
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Primeira resposta</TableHead>
                  <TableHead className="text-right">Negócios</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Taxa</TableHead>
                  <TableHead className="text-right">Verba</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {response.buckets.map((row) => (
                  <TableRow key={row.bucket}>
                    <TableCell>{bucketLabel[row.bucket]}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(row.deals)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCount(row.won)}</TableCell>
                    <TableCell className="text-right tabular-nums">{percent(row.winRate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(row.spend, account.currency)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-sm">
            {formatMoney(response.slowSpend, account.currency)} da verba trouxeram leads atendidos depois de 5 minutos
            {response.lostSales !== null && response.lostSales > 0
              ? `. Com a taxa de quem foi atendido rápido, eles teriam feito cerca de ${formatCount(response.lostSales, 1)} vendas a mais.`
              : "."}
          </p>
        </div>
      )}

      {hours && hours.deals > 0 && (
        <div className="space-y-2">
          <div>
            <h3 className="text-sm font-semibold">Quando os leads chegam</h3>
            <p className="text-muted-foreground text-xs">
              Negócios por hora de chegada; as barras escuras são do horário da equipe. A taxa de venda aparece ao passar o mouse.
            </p>
          </div>
          <div className="flex h-28 items-end gap-0.5 rounded-lg border p-2" role="img" aria-label="Negócios por hora de chegada">
            {hours.hours.map((row) => (
              <div
                key={row.hour}
                className="flex h-full flex-1 flex-col items-center justify-end gap-1"
                title={`${row.hour}h: ${row.deals} negócios, ${row.won} vendas (${percent(row.winRate)})`}
              >
                <div
                  className={cn("w-full rounded-sm", row.teamOpen ? "bg-primary" : "bg-primary/30")}
                  style={{ height: `${(row.deals / maxDeals) * 100}%`, minHeight: row.deals ? 2 : 0 }}
                />
                <span className="text-muted-foreground text-[9px] tabular-nums">{row.hour % 3 === 0 ? row.hour : ""}</span>
              </div>
            ))}
          </div>
          {hours.outsideShare !== null && (
            <p className="text-sm">
              {percent(hours.outsideShare)} dos negócios chegam com a equipe fechada e vendem {percent(hours.outsideWinRate)}, contra{" "}
              {percent(hours.insideWinRate)} de quem chega no horário.
              {hours.outsideShare >= 0.2 &&
                hours.outsideWinRate !== null &&
                hours.insideWinRate !== null &&
                hours.outsideWinRate < hours.insideWinRate * 0.7 &&
                " Vale programar a veiculação para o horário da equipe ou ter uma resposta automática que segure esses leads."}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
