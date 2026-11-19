import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { broadcastService } from "@/services/api/broadcastService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { formatCount, formatUsd } from "../broadcastUtils";

const formatBrl = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

/** Janela de atribuição do cliente, com troca rápida para quem pode disparar. */
const AttributionWindow: FC = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["broadcasts", client.id, "attribution"],
    queryFn: () => broadcastService.attributionDays(client.id),
  });
  const save = useMutation({
    mutationFn: (days: number) => broadcastService.setAttributionDays(client.id, days),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id, "attribution"] });
      setEditing(null);
      toast.success("Janela de atribuição salva", { description: "Vale para os próximos negócios." });
    },
  });
  const days = query.data?.days;
  const value = Number(editing);
  const valid = Number.isInteger(value) && value >= 1 && value <= 90;

  if (editing !== null)
    return (
      <form
        className="flex flex-wrap items-center gap-2 text-xs"
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) save.mutate(value);
        }}
      >
        <span className="text-muted-foreground">Conta o negócio até</span>
        <Input
          aria-label="Dias da janela de atribuição"
          type="number"
          min={1}
          max={90}
          className="h-8 w-20"
          value={editing}
          onChange={(event) => setEditing(event.target.value)}
        />
        <span className="text-muted-foreground">dias depois da resposta</span>
        <Button type="submit" size="sm" disabled={!valid || save.isPending}>
          Salvar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(null)}>
          Cancelar
        </Button>
      </form>
    );

  return (
    <p className="text-muted-foreground text-xs">
      Conta o negócio que nasce ou avança até {days ?? "…"} dias depois de a pessoa responder ao disparo (ou clicar no e-mail).
      {can("broadcasts.send") && days !== undefined && (
        <Button type="button" variant="link" size="sm" className="h-auto px-1 py-0 text-xs" onClick={() => setEditing(String(days))}>
          Alterar
        </Button>
      )}
    </p>
  );
};

type CampaignSalesProps = { deals: CampaignDealResults; costUsd?: number | null };

/** Quanto a campanha vendeu: negócios, ganhos, valor ganho e, no WhatsApp, o custo por venda. */
export const CampaignSales: FC<CampaignSalesProps> = ({ deals, costUsd }) => {
  const costPerSale = costUsd !== undefined && costUsd !== null && deals.won > 0 ? costUsd / deals.won : null;
  const items: [string, string][] = [
    ["Negócios", formatCount(deals.deals)],
    ["Ganhos", formatCount(deals.won)],
    ["Vendido", formatBrl(deals.wonValue)],
    ...(costUsd !== undefined ? [["Custo por venda", costPerSale !== null ? formatUsd(costPerSale) : "—"] as [string, string]] : []),
  ];

  return (
    <section className="grid gap-2">
      <p className="font-medium">Quanto vendeu</p>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border p-3">
            <dt className="text-muted-foreground text-xs">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      {costUsd !== undefined && (
        <p className="text-muted-foreground text-xs">O custo por venda usa o valor estimado das mensagens cobradas pela Meta, em dólar.</p>
      )}
      <AttributionWindow />
    </section>
  );
};
