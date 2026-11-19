import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { metaAdsService } from "@/services/api/metaAdsService";
import { socialPostService } from "@/services/api/socialPostService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Rocket } from "lucide-react";
import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { fieldSelectClassName } from "../ads/campaign/campaignUtils";

/**
 * Impulsionar no WhatsApp: a mídia da postagem vai para a biblioteca de criativos e nasce o rascunho de uma campanha de
 * conversa no WhatsApp, com a legenda e o teto de verba. A pessoa revisa no rascunho antes de ir para a Meta.
 */
export const PostBoostDialog: FC<{ post: SocialPost; open: boolean; onOpenChange: (open: boolean) => void }> = ({
  post,
  open,
  onOpenChange,
}) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const accountsQuery = useQuery({
    enabled: open,
    queryKey: ["metaAds", "accounts", client.id],
    queryFn: () => metaAdsService.findAccounts({ params: { clientId: client.id } }),
  });
  const configurationsQuery = useQuery({
    enabled: open,
    queryKey: ["whatsappConfigurations", client.id, "ads"],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
  });
  const accounts = (accountsQuery.data ?? []).filter((account) => account.platform === "META");
  const configurations = configurationsQuery.data?.items ?? [];
  const [accountId, setAccountId] = useState("");
  const [configurationId, setConfigurationId] = useState("");
  const [budget, setBudget] = useState("20");
  const [days, setDays] = useState("7");
  const account = accounts.find((item) => item.id === accountId) ?? accounts[0];
  const budgetValue = Number(budget.replace(",", "."));
  const daysValue = Math.round(Number(days));

  const boost = useMutation({
    mutationFn: () =>
      socialPostService.boost(client.id, post.id, {
        adAccountId: account!.id,
        dailyBudget: budgetValue,
        durationDays: daysValue,
        whatsappConfigurationId: configurationId || undefined,
      }),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      toast.success("Rascunho criado com a mídia e a legenda. Revise e publique em Anúncios.");
      onOpenChange(false);
      navigate(`${baseUrl}/ads?draft=${result.draftId}`);
    },
  });

  const valid = !!account && budgetValue >= 1 && daysValue >= 1 && daysValue <= 90;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Impulsionar no WhatsApp</DialogTitle>
          <DialogDescription>
            A {post.format === "REEL" ? "mídia do reel" : post.format === "STORY" ? "mídia do story" : "imagem"} e a legenda viram um
            anúncio que leva as pessoas a conversar com você no WhatsApp. Nasce como rascunho: nada é gasto até você revisar e ativar.
          </DialogDescription>
        </DialogHeader>
        {accountsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando contas...</p>
        ) : !accounts.length ? (
          <p className="text-muted-foreground text-sm">Nenhuma conta de anúncio da Meta conectada. Conecte em Configurações › Anúncios.</p>
        ) : (
          <div className="grid gap-3">
            {accounts.length > 1 && (
              <div className="grid gap-1">
                <Label htmlFor="boost-account">Conta de anúncio</Label>
                <select
                  id="boost-account"
                  className={fieldSelectClassName}
                  value={account?.id ?? ""}
                  onChange={(event) => setAccountId(event.target.value)}
                >
                  {accounts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="boost-budget">Teto por dia ({account?.currency ?? "BRL"})</Label>
                <Input id="boost-budget" inputMode="decimal" value={budget} onChange={(event) => setBudget(event.target.value)} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="boost-days">Dias no ar</Label>
                <Input id="boost-days" type="number" min={1} max={90} value={days} onChange={(event) => setDays(event.target.value)} />
              </div>
            </div>
            {budgetValue >= 1 && daysValue >= 1 && (
              <p className="text-muted-foreground text-xs">
                Gasto máximo previsto: {(budgetValue * daysValue).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}{" "}
                {account?.currency ?? "BRL"} em {daysValue} dia(s). As travas de gasto da conta continuam valendo.
              </p>
            )}
            <div className="grid gap-1">
              <Label htmlFor="boost-number">Número de WhatsApp</Label>
              <select
                id="boost-number"
                className={fieldSelectClassName}
                value={configurationId}
                onChange={(event) => setConfigurationId(event.target.value)}
              >
                <option value="">Escolher no rascunho</option>
                {configurations.map((configuration) => (
                  <option key={configuration.id} value={configuration.id}>
                    {configuration.phoneNumber}
                  </option>
                ))}
              </select>
            </div>
            <Button disabled={!valid || boost.isPending} onClick={() => boost.mutate()}>
              <Rocket className="mr-2 h-4 w-4" aria-hidden />
              {boost.isPending ? "Enviando a mídia para a Meta..." : "Criar rascunho do anúncio"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
