import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { offerService } from "@/services/api/offerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { formatMoney, parseDecimal, selectClassName } from "@/pages/dashboard/offers/offerUtils";

type Row = { key: string; offerId: string; name: string; quantity: string; unitPrice: string; discount: string };

let rowSeq = 0;
const newKey = () => `row-${++rowSeq}`;

const toRow = (item: DealItem): Row => ({
  key: newKey(),
  offerId: item.offerId ?? "",
  name: item.name,
  quantity: String(item.quantity).replace(".", ","),
  unitPrice: String(item.unitPrice).replace(".", ","),
  discount: item.discountPercent ? String(item.discountPercent).replace(".", ",") : "",
});

const rowTotal = (row: Row) => {
  const quantity = parseDecimal(row.quantity) ?? 0;
  const price = parseDecimal(row.unitPrice) ?? 0;
  const discount = parseDecimal(row.discount) ?? 0;
  if ([quantity, price, discount].some(Number.isNaN)) return 0;
  return Math.round(quantity * price * (1 - discount / 100) * 100) / 100;
};

/**
 * O que está sendo vendido no negócio: ofertas do cadastro (preço vem dele) ou itens digitados. Com itens, o valor do
 * negócio passa a ser a soma. Desconto acima do máximo da oferta só para quem cadastra ofertas.
 */
export const DealItems: FC<{ deal: Deal }> = ({ deal }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canExceedDiscount = can("offers.manage");
  const [rows, setRows] = useState<Row[] | null>(null);

  const offersQuery = useQuery({ queryKey: ["offers", client.id, false], queryFn: () => offerService.findAll(client.id) });
  const itemsQuery = useQuery({
    queryKey: ["dealItems", client.id, deal.id],
    queryFn: () => offerService.findDealItems(client.id, deal.id),
  });
  const offers = offersQuery.data ?? [];
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));
  const current = rows ?? (itemsQuery.data?.items ?? []).map(toRow);
  const isEditing = rows !== null;

  const save = useMutation({
    mutationFn: () =>
      offerService.replaceDealItems(
        client.id,
        deal.id,
        current.map((row) => ({
          offerId: row.offerId || null,
          name: row.offerId ? null : row.name.trim(),
          quantity: parseDecimal(row.quantity) ?? 1,
          unitPrice: parseDecimal(row.unitPrice),
          discountPercent: parseDecimal(row.discount) ?? 0,
        })),
      ),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      queryClient.setQueryData(["dealItems", client.id, deal.id], result);
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
      setRows(null);
      toast.success(result.total !== null ? `Itens salvos. Valor do negócio: ${formatMoney(result.total)}` : "Itens salvos");
    },
  });

  const edit = (key: string, changes: Partial<Row>) => setRows(current.map((row) => (row.key === key ? { ...row, ...changes } : row)));
  const addRow = () => {
    const first = offers[0];
    setRows([
      ...current,
      {
        key: newKey(),
        offerId: first?.id ?? "",
        name: "",
        quantity: "1",
        unitPrice: first?.price != null ? String(first.price).replace(".", ",") : "",
        discount: "",
      },
    ]);
  };

  const problems = current.map((row) => {
    const offer = row.offerId ? offerById.get(row.offerId) : undefined;
    const discount = parseDecimal(row.discount) ?? 0;
    if (!row.offerId && !row.name.trim()) return "Informe o nome";
    if (row.unitPrice.trim() === "" || Number.isNaN(parseDecimal(row.unitPrice))) return "Informe o preço";
    if (Number.isNaN(parseDecimal(row.quantity)) || (parseDecimal(row.quantity) ?? 0) <= 0) return "Quantidade inválida";
    if (offer && !canExceedDiscount && discount > (offer.maxDiscountPercent ?? 0))
      return offer.maxDiscountPercent ? `Desconto máximo: ${offer.maxDiscountPercent}%` : "Esta oferta não tem desconto liberado";
    return null;
  });
  const total = current.reduce((sum, row) => sum + rowTotal(row), 0);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-medium">O que está sendo vendido</h3>
          <p className="text-muted-foreground text-xs">Com itens, o valor do negócio passa a ser a soma deles.</p>
        </div>
        <Button size="sm" variant="outline" onClick={addRow} disabled={current.length >= 30}>
          <Plus className="h-4 w-4" />
          Item
        </Button>
      </div>

      {itemsQuery.isLoading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens...
        </p>
      ) : current.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-3 text-sm">
          Nenhum item. Adicione as ofertas do negócio para o valor e as propostas saírem com o preço certo.
        </p>
      ) : (
        <ul className="space-y-2">
          {current.map((row, index) => {
            const offer = row.offerId ? offerById.get(row.offerId) : undefined;
            return (
              <li key={row.key} className="grid gap-2 rounded-md border p-2">
                <div className="flex gap-2">
                  <select
                    id={`deal-item-offer-${row.key}`}
                    aria-label={`Oferta do item ${index + 1}`}
                    className={selectClassName}
                    value={row.offerId}
                    onChange={(event) => {
                      const next = offerById.get(event.target.value);
                      edit(row.key, {
                        offerId: event.target.value,
                        unitPrice: next?.price != null ? String(next.price).replace(".", ",") : row.unitPrice,
                        discount: "",
                      });
                    }}
                  >
                    {offers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                    {row.offerId && !offer && <option value={row.offerId}>{row.name} (arquivada)</option>}
                    <option value="">Outro item (digitar)</option>
                  </select>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={`Remover item ${index + 1}`}
                    onClick={() => setRows(current.filter((item) => item.key !== row.key))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {!row.offerId && (
                  <Input
                    id={`deal-item-name-${row.key}`}
                    aria-label={`Nome do item ${index + 1}`}
                    maxLength={200}
                    placeholder="Nome do item"
                    value={row.name}
                    onChange={(event) => edit(row.key, { name: event.target.value })}
                  />
                )}
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    id={`deal-item-qty-${row.key}`}
                    aria-label={`Quantidade do item ${index + 1}`}
                    inputMode="decimal"
                    placeholder="Qtd."
                    value={row.quantity}
                    onChange={(event) => edit(row.key, { quantity: event.target.value })}
                  />
                  <Input
                    id={`deal-item-price-${row.key}`}
                    aria-label={`Preço unitário do item ${index + 1}`}
                    inputMode="decimal"
                    placeholder="Preço"
                    value={row.unitPrice}
                    onChange={(event) => edit(row.key, { unitPrice: event.target.value })}
                  />
                  <Input
                    id={`deal-item-discount-${row.key}`}
                    aria-label={`Desconto em % do item ${index + 1}`}
                    inputMode="decimal"
                    placeholder="Desc. %"
                    value={row.discount}
                    onChange={(event) => edit(row.key, { discount: event.target.value })}
                  />
                </div>
                <div className="flex flex-wrap justify-between gap-2 text-xs">
                  <span className={problems[index] ? "text-destructive" : "text-muted-foreground"}>
                    {problems[index] ??
                      (offer?.maxDiscountPercent
                        ? `Desconto até ${offer.maxDiscountPercent}%`
                        : offer
                          ? "Sem desconto liberado"
                          : "Item avulso")}
                  </span>
                  <span className="tabular-nums">{formatMoney(rowTotal(row))}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {(isEditing || current.length > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium tabular-nums">Total: {formatMoney(total)}</span>
          {isEditing && (
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setRows(null)} disabled={save.isPending}>
                Descartar
              </Button>
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending || problems.some(Boolean)}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar itens
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
