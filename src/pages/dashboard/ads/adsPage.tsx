import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronRight, Megaphone, RefreshCw } from "lucide-react";
import { Fragment, useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useLocalStorage } from "usehooks-ts";
import {
  budgetLabel,
  campaignObjectiveLabel,
  destinationTypeLabel,
  effectiveStatusInfo,
  optimizationGoalLabel,
  statusToneClassName,
  syncStatusLabel,
} from "./adsUtils";
import { AdsDailySummary } from "./adsDailySummary";
import { AdsLeads } from "./adsLeads";
import { AdsConversionEvents } from "./adsConversionEvents";
import { AdsSuggestions } from "./adsSuggestions";
import { AdsChanges } from "./adsChanges";
import { AdsAutomation } from "./adsAutomation";
import { AdsCampaignBuilder } from "./campaign/adsCampaignBuilder";
import { AdsCrmAudiences } from "./campaign/adsCrmAudiences";
import { AdsStrategyChatTab } from "./adsStrategyChatTab";
import { AdsResults } from "./adsResults";

const StatusChip: FC<{ status: string }> = ({ status }) => {
  const info = effectiveStatusInfo(status);
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", statusToneClassName[info.tone])}>{info.label}</span>
  );
};

const AdRows: FC<{ adSet: MetaAdSet }> = ({ adSet }) => (
  <>
    {adSet.ads.map((ad) => (
      <TableRow key={ad.metaId} className="bg-muted/20">
        <TableCell className="pl-16">
          <p className="text-sm">{ad.name}</p>
          {ad.creative?.title && <p className="text-muted-foreground line-clamp-1 text-xs">{ad.creative.title}</p>}
        </TableCell>
        <TableCell>
          <StatusChip status={ad.effectiveStatus} />
        </TableCell>
        <TableCell className="text-muted-foreground text-xs">
          {ad.creative?.callToActionType?.replaceAll("_", " ").toLowerCase() ?? "—"}
        </TableCell>
        <TableCell />
      </TableRow>
    ))}
  </>
);

const CampaignRows: FC<{ campaign: MetaCampaign; currency: string }> = ({ campaign, currency }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openAdSetIds, setOpenAdSetIds] = useState<string[]>([]);
  const toggleAdSet = (metaId: string) =>
    setOpenAdSetIds((ids) => (ids.includes(metaId) ? ids.filter((id) => id !== metaId) : [...ids, metaId]));

  return (
    <>
      <TableRow className="cursor-pointer" onClick={() => setIsOpen((value) => !value)}>
        <TableCell>
          <span className="flex items-center gap-1.5">
            {isOpen ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
            <span className="font-medium">{campaign.name}</span>
          </span>
          <p className="text-muted-foreground pl-5 text-xs">
            {campaignObjectiveLabel[campaign.objective ?? ""] ?? campaign.objective ?? "Sem objetivo"} · {campaign.adSets.length}{" "}
            conjunto(s)
          </p>
        </TableCell>
        <TableCell>
          <StatusChip status={campaign.effectiveStatus} />
        </TableCell>
        <TableCell className="text-xs">{campaign.bidStrategy?.replaceAll("_", " ").toLowerCase() ?? "—"}</TableCell>
        <TableCell className="text-right text-sm whitespace-nowrap tabular-nums">
          {budgetLabel(campaign, currency) ?? <span className="text-muted-foreground text-xs">no conjunto</span>}
        </TableCell>
      </TableRow>

      {isOpen &&
        campaign.adSets.map((adSet) => (
          <Fragment key={adSet.metaId}>
            <TableRow className="bg-muted/10 cursor-pointer" onClick={() => toggleAdSet(adSet.metaId)}>
              <TableCell className="pl-8">
                <span className="flex items-center gap-1.5">
                  {openAdSetIds.includes(adSet.metaId) ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <span className="text-sm">{adSet.name}</span>
                </span>
                <p className="text-muted-foreground pl-5 text-xs">
                  {optimizationGoalLabel[adSet.optimizationGoal ?? ""] ?? adSet.optimizationGoal ?? "—"}
                  {adSet.destinationType && ` · ${destinationTypeLabel[adSet.destinationType] ?? adSet.destinationType}`} ·{" "}
                  {adSet.ads.length} anúncio(s)
                </p>
              </TableCell>
              <TableCell>
                <StatusChip status={adSet.effectiveStatus} />
              </TableCell>
              <TableCell className="text-xs">{adSet.billingEvent?.replaceAll("_", " ").toLowerCase() ?? "—"}</TableCell>
              <TableCell className="text-right text-sm whitespace-nowrap tabular-nums">{budgetLabel(adSet, currency) ?? "—"}</TableCell>
            </TableRow>
            {openAdSetIds.includes(adSet.metaId) && <AdRows adSet={adSet} />}
          </Fragment>
        ))}
    </>
  );
};

/** Resultados, estrutura e leads das contas de anúncio copiados da Meta; só leitura por enquanto. */
export const AdsPage = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const [storedAccountId, setStoredAccountId] = useLocalStorage<string | null>(`ads:account:${client.id}`, null);
  const [tab, setTab] = useLocalStorage<string>(`ads:tab:${client.id}`, "results");

  const connectionQuery = useQuery({
    queryKey: ["metaAds", "connection", client.id],
    queryFn: () => metaAdsService.findConnection({ params: { clientId: client.id } }),
  });
  const accounts = connectionQuery.data?.accounts ?? [];
  const account = accounts.find((item) => item.id === storedAccountId) ?? accounts[0];

  const structureQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "structure", client.id, account?.id],
    queryFn: () => metaAdsService.findStructure({ params: { clientId: client.id, accountId: account!.id } }),
    enabled: !!account,
    // Enquanto sincroniza, acompanha o fim da cópia
    refetchInterval: (query) =>
      query.state.data?.account.syncStatus === "SYNCING" || query.state.data?.account.syncStatus === "PENDING" ? 5000 : false,
  });

  const syncAccount = useMutation({
    mutationFn: metaAdsService.syncAccount,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      toast.success("Sincronização agendada");
    },
  });

  if (connectionQuery.isLoading) return <LoadingState className="h-full" />;

  if (accounts.length === 0)
    return (
      <EmptyState
        className="h-full"
        icon={Megaphone}
        title="Nenhuma conta de anúncio vinculada"
        description={
          can("ads.manage") ? "Conecte a Meta e vincule as contas em Configurações." : "Peça a um administrador para conectar a Meta."
        }
        action={
          can("ads.manage") && (
            <Button asChild>
              <Link to={`${baseUrl}/configuration?tab=metaAds`}>Conectar a Meta</Link>
            </Button>
          )
        }
      />
    );

  const structure = structureQuery.data;
  const currentAccount = structure?.account ?? account;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-end gap-4 border-b p-4">
        <h1 className="mr-2 text-2xl font-semibold">Anúncios</h1>
        <div className="grid gap-1">
          <Label htmlFor="ads-account" className="text-xs">
            Conta de anúncio
          </Label>
          <select
            id="ads-account"
            value={account.id}
            onChange={(event) => setStoredAccountId(event.target.value)}
            className={cn(crmSelectClassName, "w-64")}
          >
            {accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <p className="text-muted-foreground pb-2 text-xs">
          {syncStatusLabel[currentAccount.syncStatus]}
          {currentAccount.lastSyncedAt && ` · atualizada em ${format(new Date(currentAccount.lastSyncedAt), "dd/MM HH:mm")}`}
          {currentAccount.syncError && <span className="text-destructive"> · {currentAccount.syncError}</span>}
        </p>
        {can("ads.manage") && (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            disabled={syncAccount.isPending}
            onClick={() => syncAccount.mutate({ params: { clientId: client.id, accountId: account.id } })}
          >
            <RefreshCw className="h-4 w-4" />
            Sincronizar agora
          </Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden">
        <TabsList className="mx-4 mt-3">
          <TabsTrigger value="results">Resultados</TabsTrigger>
          <TabsTrigger value="create">Criar campanha</TabsTrigger>
          <TabsTrigger value="suggestions">Sugestões</TabsTrigger>
          {can("ads.manage") && <TabsTrigger value="strategy">Estratégia</TabsTrigger>}
          <TabsTrigger value="changes">Mudanças</TabsTrigger>
          <TabsTrigger value="automation">Automação</TabsTrigger>
          <TabsTrigger value="campaigns">Campanhas{structure && ` (${structure.campaigns.length})`}</TabsTrigger>
          <TabsTrigger value="audiences">Públicos{structure && ` (${structure.audiences.length})`}</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
          <TabsTrigger value="conversions">Eventos</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="min-h-0 flex-1 space-y-8 overflow-auto p-4">
          <AdsDailySummary key={currentAccount.id} account={currentAccount} />
          <AdsResults key={currentAccount.id} account={currentAccount} />
        </TabsContent>

        <TabsContent value="create" className="min-h-0 flex-1 overflow-auto p-4">
          <AdsCampaignBuilder key={currentAccount.id} account={currentAccount} />
        </TabsContent>

        <TabsContent value="suggestions" className="min-h-0 flex-1 overflow-auto p-4">
          <AdsSuggestions key={currentAccount.id} account={currentAccount} />
        </TabsContent>

        {can("ads.manage") && (
          <TabsContent value="strategy" className="min-h-0 flex-1 overflow-auto p-4">
            <AdsStrategyChatTab key={currentAccount.id} account={currentAccount} />
          </TabsContent>
        )}

        <TabsContent value="changes" className="min-h-0 flex-1 overflow-auto p-4">
          <AdsChanges key={currentAccount.id} account={currentAccount} />
        </TabsContent>

        <TabsContent value="automation" className="min-h-0 flex-1 overflow-auto p-4">
          <AdsAutomation key={currentAccount.id} account={currentAccount} />
        </TabsContent>

        <TabsContent value="leads" className="min-h-0 flex-1 overflow-auto p-4">
          <AdsLeads />
        </TabsContent>

        <TabsContent value="conversions" className="min-h-0 flex-1 overflow-auto p-4">
          <AdsConversionEvents />
        </TabsContent>

        {(tab === "campaigns" || tab === "audiences") && structureQuery.isLoading && <LoadingState />}
        {(tab === "campaigns" || tab === "audiences") && structureQuery.isError && (
          <ErrorState
            message="Não foi possível carregar a conta."
            onRetry={() => structureQuery.refetch()}
            isRetrying={structureQuery.isFetching}
          />
        )}

        {structure && (
          <>
            <TabsContent value="campaigns" className="min-h-0 flex-1 overflow-auto p-4">
              {structure.campaigns.length === 0 ? (
                <EmptyState title="Nenhuma campanha nesta conta" description="Campanhas excluídas na Meta não aparecem aqui." />
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Campanha / conjunto / anúncio</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Lance / cobrança</TableHead>
                        <TableHead className="text-right">Orçamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {structure.campaigns.map((campaign) => (
                        <CampaignRows key={campaign.metaId} campaign={campaign} currency={structure.account.currency} />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="audiences" className="min-h-0 flex-1 space-y-4 overflow-auto p-4">
              <AdsCrmAudiences account={currentAccount} />

              {structure.audiences.length === 0 ? (
                <EmptyState title="Nenhum público personalizado nesta conta" />
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Público</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead className="text-right">Tamanho aproximado</TableHead>
                        <TableHead>Entrega</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {structure.audiences.map((audience) => (
                        <TableRow key={audience.metaId}>
                          <TableCell className="font-medium">{audience.name}</TableCell>
                          <TableCell className="text-xs">{audience.subtype?.toLowerCase() ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {audience.approximateCount === null ? "—" : `${audience.approximateCount.toLocaleString("pt-BR")}+`}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">{audience.deliveryStatus ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
};
