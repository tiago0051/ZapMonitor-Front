import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { selectClassName } from "./strategyUtils";

type Props = { strategy: MarketingStrategy; onClose: () => void; onSaved: (strategy: MarketingStrategy) => void };

const platformLabel: Record<LinkableCampaign["platform"], string> = { META: "Meta", GOOGLE: "YouTube", TIKTOK: "TikTok" };

/** Liga à estratégia uma campanha que já existe na conta (criada antes ou fora do ZapMonitor). */
export const StrategyLinkCampaignDialog: FC<Props> = ({ strategy, onClose, onSaved }) => {
  const { client } = useClientContext();
  const [search, setSearch] = useState("");
  const [campaignId, setCampaignId] = useState("");
  const [stepId, setStepId] = useState("");

  const campaignsQuery = useQuery({
    queryKey: ["marketingLinkableCampaigns", client.id],
    queryFn: () => marketingStrategyService.findLinkableCampaigns(client.id),
  });
  const campaigns = (campaignsQuery.data ?? []).filter(
    (campaign) => campaign.strategyId !== strategy.id && campaign.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const selected = campaignsQuery.data?.find((campaign) => campaign.id === campaignId);

  const link = useMutation({
    mutationFn: () => marketingStrategyService.linkCampaign(client.id, strategy.id, { campaignId, stepId: stepId || null }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      onSaved(saved);
      toast.success("Campanha ligada à estratégia");
      onClose();
    },
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ligar campanha</DialogTitle>
          <DialogDescription>
            A campanha passa a contar nos resultados da estratégia e a IA de anúncios a trata como parte do plano. Dica: campanhas com{" "}
            {strategy.marker} no nome são ligadas sozinhas na próxima sincronização.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-1">
            <Label htmlFor="link-search">Campanha</Label>
            <Input id="link-search" placeholder="Buscar pelo nome" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select
              aria-label="Campanha"
              size={6}
              className={`${selectClassName} h-auto py-1`}
              value={campaignId}
              onChange={(event) => setCampaignId(event.target.value)}
            >
              {campaignsQuery.isLoading && <option disabled>Carregando…</option>}
              {!campaignsQuery.isLoading && campaigns.length === 0 && <option disabled>Nenhuma campanha encontrada</option>}
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id}>
                  {platformLabel[campaign.platform]} · {campaign.name}
                  {campaign.strategyId ? " (em outra estratégia)" : ""}
                </option>
              ))}
            </select>
            {selected?.strategyId && (
              <p className="text-xs text-amber-700 dark:text-amber-400">Ela sai da outra estratégia: cada campanha conta para uma só.</p>
            )}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="link-step">Passo</Label>
            <select id="link-step" className={selectClassName} value={stepId} onChange={(event) => setStepId(event.target.value)}>
              <option value="">Só a estratégia, sem passo</option>
              {strategy.steps.map((step) => (
                <option key={step.id} value={step.id}>
                  {step.order}. {step.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={!campaignId || link.isPending} onClick={() => link.mutate()}>
            {link.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Ligar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
