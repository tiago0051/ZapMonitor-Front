import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { offerService } from "@/services/api/offerService";
import { formatOfferPrice } from "@/pages/dashboard/offers/offerUtils";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Loader2, Sparkles } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { channelOptions, goalLabel, selectClassName, textareaClassName } from "./strategyUtils";

type Props = {
  onClose: () => void;
  // Sem estratégia, cria uma nova; com ela, refaz o plano com o briefing e o playbook editados
  strategy?: MarketingStrategy;
};

const emptyBrief = (): MarketingBrief => ({
  product: "",
  description: "",
  price: null,
  audience: null,
  differentiator: null,
  goal: "SALES",
  deadlineDays: null,
  monthlyBudget: null,
  channels: ["META_ADS", "SOCIAL", "WHATSAPP_BASE"],
  notes: null,
});

/** Briefing do produto: o que a IA precisa para escolher a estratégia e montar os passos. */
export const StrategyBriefDialog: FC<Props> = ({ onClose, strategy }) => {
  const { client, canUseAds, canUseOrganic, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [brief, setBrief] = useState<MarketingBrief>(() => strategy?.brief ?? emptyBrief());
  const [playbookSlug, setPlaybookSlug] = useState(strategy?.requestedPlaybookSlug ?? "");
  const [offerId, setOfferId] = useState(strategy?.offerId ?? "");
  const canSeeOffers = can("offers.view");
  // Ao refazer com detalhes já preenchidos, eles aparecem abertos
  const [hasDetails] = useState(
    () =>
      !!strategy &&
      !!(
        strategy.brief.price ||
        strategy.brief.audience ||
        strategy.brief.differentiator ||
        strategy.brief.monthlyBudget ||
        strategy.brief.deadlineDays ||
        strategy.brief.notes ||
        strategy.requestedPlaybookSlug
      ),
  );
  const offersQuery = useQuery({
    queryKey: ["offers", client.id, false],
    queryFn: () => offerService.findAll(client.id),
    enabled: canSeeOffers,
  });
  const offers = offersQuery.data ?? [];

  /** Escolher a oferta preenche o briefing com o cadastro; o que a pessoa já escreveu continua. */
  const chooseOffer = (id: string) => {
    setOfferId(id);
    const offer = offers.find((item) => item.id === id);
    if (!offer) return;
    setBrief((current) => ({
      ...current,
      product: current.product.trim() ? current.product : offer.name,
      description: current.description.trim() ? current.description : offer.description || offer.summary || "",
      price: current.price || formatOfferPrice(offer),
      audience: current.audience || offer.audience,
      differentiator: current.differentiator || offer.differentiators.slice(0, 3).join("; ") || null,
    }));
  };
  const update = (changes: Partial<MarketingBrief>) => setBrief((current) => ({ ...current, ...changes }));

  const playbooksQuery = useQuery({
    queryKey: ["marketingPlaybooks", client.id],
    queryFn: () => marketingStrategyService.findPlaybooks(client.id),
    staleTime: Infinity,
  });
  const playbooks = playbooksQuery.data ?? [];
  const selectedPlaybook = playbooks.find((item) => item.slug === playbookSlug);
  const channels = channelOptions.filter((option) => (!option.requiresAds || canUseAds) && (!option.requiresOrganic || canUseOrganic));

  const save = useMutation({
    mutationFn: () => {
      const body = { brief, playbookSlug: playbookSlug || null, offerId: offerId || null };
      return strategy
        ? marketingStrategyService.regenerate(client.id, strategy.id, body)
        : marketingStrategyService.create(client.id, body);
    },
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: ["marketingStrategies", client.id] });
      queryClient.setQueryData(["marketingStrategy", client.id, saved.id], saved);
      toast.success("A IA está montando a estratégia. Leva cerca de um minuto.");
      onClose();
      if (!strategy) navigate(`${baseUrl}/strategies/${saved.id}`);
    },
  });

  const canSubmit = !!brief.product.trim() && !!brief.description.trim() && !save.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) save.mutate();
  };
  const numberOrNull = (value: string) => (value.trim() === "" ? null : Math.max(0, Math.round(Number(value))));

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{strategy ? "Refazer a estratégia" : "Nova estratégia"}</DialogTitle>
            <DialogDescription>
              Conte o que quer vender e o objetivo; a IA escolhe a estratégia e monta os passos. Ela também lê a identidade da marca.
              {strategy && " O que já foi criado pelos passos continua ligado à estratégia."}
            </DialogDescription>
          </DialogHeader>

          {canSeeOffers && offers.length > 0 && (
            <div className="grid gap-1">
              <Label htmlFor="brief-offer">Oferta do cadastro</Label>
              <select id="brief-offer" className={selectClassName} value={offerId} onChange={(event) => chooseOffer(event.target.value)}>
                <option value="">Nenhuma (descrever abaixo)</option>
                {offers.map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name} · {formatOfferPrice(offer)}
                  </option>
                ))}
              </select>
              <p className="text-muted-foreground text-xs">
                A IA usa o cadastro inteiro (preço, condições, provas e objeções), e anúncios e postagens da estratégia falam a mesma coisa.
              </p>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="brief-product">Produto ou serviço</Label>
              <Input
                id="brief-product"
                maxLength={200}
                placeholder="Ex.: Clareamento dental a laser"
                value={brief.product}
                onChange={(event) => update({ product: event.target.value })}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="brief-description">Como ele é e o que resolve</Label>
              <textarea
                id="brief-description"
                rows={4}
                maxLength={3000}
                className={textareaClassName}
                placeholder="O que é, para que serve, como é entregue, quanto tempo leva, o que o cliente ganha"
                value={brief.description}
                onChange={(event) => update({ description: event.target.value })}
              />
            </div>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="brief-goal">Objetivo</Label>
              <select
                id="brief-goal"
                className={selectClassName}
                value={brief.goal}
                onChange={(event) => update({ goal: event.target.value as MarketingGoal })}
              >
                {Object.entries(goalLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Canais que pode usar</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {channels.map((option) => (
                <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                  <Checkbox
                    checked={brief.channels.includes(option.value)}
                    onCheckedChange={(checked) =>
                      update({
                        channels: checked
                          ? [...brief.channels, option.value]
                          : brief.channels.filter((channel) => channel !== option.value),
                      })
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
            <p className="text-muted-foreground text-xs">O atendimento pelo WhatsApp (fluxos e IA) sempre entra.</p>
          </fieldset>

          <details className="group rounded-lg border" open={hasDetails}>
            <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
              <span className="flex-1">
                Mais detalhes{" "}
                <span className="text-muted-foreground font-normal">(opcional: preço, público, verba, prazo, estratégia)</span>
              </span>
              <ChevronDown className="text-muted-foreground h-4 w-4 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <div className="grid gap-4 border-t p-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-1">
                  <Label htmlFor="brief-price">Preço</Label>
                  <Input
                    id="brief-price"
                    maxLength={200}
                    placeholder="Ex.: R$ 900 ou 3x de R$ 300"
                    value={brief.price ?? ""}
                    onChange={(event) => update({ price: event.target.value || null })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="brief-audience">Para quem</Label>
                  <Input
                    id="brief-audience"
                    maxLength={1000}
                    placeholder="Ex.: mulheres de 25 a 45 anos em Curitiba"
                    value={brief.audience ?? ""}
                    onChange={(event) => update({ audience: event.target.value || null })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="brief-differentiator">Diferencial</Label>
                  <Input
                    id="brief-differentiator"
                    maxLength={1000}
                    placeholder="Ex.: resultado em 3 sessões, sem sensibilidade"
                    value={brief.differentiator ?? ""}
                    onChange={(event) => update({ differentiator: event.target.value || null })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="brief-budget">Verba de anúncio por mês (R$)</Label>
                  <Input
                    id="brief-budget"
                    type="number"
                    min={0}
                    placeholder="Ex.: 1500"
                    value={brief.monthlyBudget ?? ""}
                    onChange={(event) => update({ monthlyBudget: numberOrNull(event.target.value) })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="brief-deadline">Prazo para o resultado (dias)</Label>
                  <Input
                    id="brief-deadline"
                    type="number"
                    min={7}
                    max={365}
                    placeholder="Ex.: 60"
                    value={brief.deadlineDays ?? ""}
                    onChange={(event) => update({ deadlineDays: numberOrNull(event.target.value) })}
                  />
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="brief-notes">Observações</Label>
                <textarea
                  id="brief-notes"
                  rows={2}
                  maxLength={2000}
                  className={textareaClassName}
                  placeholder="Ex.: temos 40 depoimentos em vídeo; não podemos dar desconto; foco em dezembro"
                  value={brief.notes ?? ""}
                  onChange={(event) => update({ notes: event.target.value || null })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="brief-playbook">Estratégia</Label>
                <select
                  id="brief-playbook"
                  className={selectClassName}
                  value={playbookSlug}
                  disabled={playbooksQuery.isLoading}
                  onChange={(event) => setPlaybookSlug(event.target.value)}
                >
                  <option value="">A IA escolhe a que mais combina</option>
                  {playbooks.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                      {item.segmentStat ? ` · validada em ${item.segmentStat.rate}% das empresas do seu segmento` : ""}
                    </option>
                  ))}
                </select>
                {selectedPlaybook && (
                  <p className="text-muted-foreground text-xs">
                    {selectedPlaybook.origin}. {selectedPlaybook.summary}
                    {selectedPlaybook.segmentStat &&
                      ` Validada em ${selectedPlaybook.segmentStat.validated} de ${selectedPlaybook.segmentStat.clients} empresas do seu segmento.`}
                  </p>
                )}
                {!playbookSlug && playbooks.some((item) => item.segmentStat) && (
                  <p className="text-muted-foreground text-xs">A IA leva em conta o que já se validou em empresas do seu segmento.</p>
                )}
              </div>
            </div>
          </details>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {strategy ? "Refazer com a IA" : "Montar com a IA"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
