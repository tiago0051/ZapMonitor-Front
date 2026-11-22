import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { offerService } from "@/services/api/offerService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { formatOfferPrice } from "@/pages/dashboard/offers/offerUtils";

/**
 * Ofertas que o agente vende. Entram inteiras em cada resposta (preço, condições, provas e objeções), então o agente
 * nunca inventa preço nem desconto.
 */
export const AiAgentOffers: FC<{ clientId: string; aiAgentId: string }> = ({ clientId, aiAgentId }) => {
  const { can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const canSeeOffers = can("offers.view");
  const [selected, setSelected] = useState<string[] | null>(null);

  const offersQuery = useQuery({
    queryKey: ["offers", clientId, false],
    queryFn: () => offerService.findAll(clientId),
    enabled: canSeeOffers,
  });
  const linkedQuery = useQuery({
    queryKey: ["aiAgentOffers", clientId, aiAgentId],
    queryFn: () => offerService.findAgentOffers(clientId, aiAgentId),
  });

  const saved = linkedQuery.data?.offerIds ?? [];
  const current = selected ?? saved;
  const isDirty = selected !== null && (selected.length !== saved.length || selected.some((id, index) => id !== saved[index]));

  const save = useMutation({
    mutationFn: () => offerService.setAgentOffers(clientId, aiAgentId, current),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      queryClient.setQueryData(["aiAgentOffers", clientId, aiAgentId], result);
      setSelected(null);
      toast.success("Ofertas do agente salvas");
    },
  });

  const offers = offersQuery.data ?? [];
  const toggle = (id: string, checked: boolean) => setSelected(checked ? [...current, id] : current.filter((item) => item !== id));

  return (
    <section className="mb-6 grid gap-3 rounded-lg border p-4">
      <div>
        <h3 className="text-sm font-medium">O que este agente vende</h3>
        <p className="text-muted-foreground text-xs">
          As ofertas marcadas entram inteiras em cada resposta: preço, condições, provas e respostas às objeções. O agente não oferece
          desconto acima do máximo da oferta.
        </p>
      </div>
      {!canSeeOffers ? (
        <p className="text-muted-foreground text-sm">Você não tem permissão para ver as ofertas.</p>
      ) : offersQuery.isLoading || linkedQuery.isLoading ? (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando ofertas...
        </p>
      ) : offers.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Nenhuma oferta cadastrada.{" "}
          <Link className="text-primary underline-offset-4 hover:underline" to={`${baseUrl}/offers`}>
            Cadastrar ofertas
          </Link>
        </p>
      ) : (
        <>
          <ul className="grid gap-2 sm:grid-cols-2">
            {offers.map((offer) => (
              <li key={offer.id}>
                <label className="hover:bg-muted/40 flex cursor-pointer items-start gap-2 rounded-md border p-2 text-sm">
                  <Checkbox
                    className="mt-0.5"
                    checked={current.includes(offer.id)}
                    onCheckedChange={(checked) => toggle(offer.id, checked === true)}
                  />
                  <span className="grid">
                    <span className="font-medium">{offer.name}</span>
                    <span className="text-muted-foreground text-xs tabular-nums">{formatOfferPrice(offer)}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex justify-end">
            <Button size="sm" disabled={!isDirty || save.isPending || current.length > 10} onClick={() => save.mutate()}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar ofertas
            </Button>
          </div>
          {current.length > 10 && <p className="text-destructive text-xs">Escolha até 10 ofertas por agente.</p>}
        </>
      )}
    </section>
  );
};
