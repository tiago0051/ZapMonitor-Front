import { EmptyState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Loader2, Megaphone, Play, Plus, Rocket, Save, Sparkles, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { formatCount, formatMoney } from "../adsUtils";
import { AdsAssetLibrary } from "./adsAssetLibrary";
import { BriefFields, RoutingFields } from "./draftFields";
import { PlanEditor } from "./planEditor";
import { useCampaignOptions } from "./useCampaignOptions";

const statusInfo: Record<AdDraftStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  PUBLISHING: { label: "Criando na Meta", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  PUBLISHED: { label: "Criada pausada", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  FAILED: { label: "Parou no meio", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  ACTIVE: { label: "Ativa", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
};

const emptyBrief = (): AdCampaignBrief => ({
  goal: "",
  product: "",
  offer: null,
  audienceDescription: null,
  region: null,
  dailyBudget: 50,
  durationDays: null,
  notes: null,
});
const emptyRouting = (): AdDraftRouting => ({
  whatsappConfigurationId: null,
  metaPageId: null,
  flowId: null,
  pipelineId: null,
  stageId: null,
  serviceGroupId: null,
});

/** Comparação dos dois conjuntos do teste A/B com as vendas do CRM. */
const AbTestResult: FC<{ draft: AdCampaignDraft; currency: string }> = ({ draft, currency }) => {
  const { client } = useClientContext();
  const resultQuery = useQuery({
    queryKey: ["metaAds", "abTest", client.id, draft.id],
    queryFn: () => metaAdsService.findAbTest({ params: { clientId: client.id, draftId: draft.id } }),
  });
  const cells = resultQuery.data ?? [];
  if (cells.length !== 2) return null;

  // Ganha quem vende mais barato; sem vendas, quem traz conversa mais barata
  const score = (cell: AdAbTestCell) =>
    cell.row?.costPerWonDeal ?? (cell.row?.costPerConversation ? cell.row.costPerConversation * 1000 : Infinity);
  const winner = score(cells[0]) === score(cells[1]) ? null : score(cells[0]) < score(cells[1]) ? "A" : "B";

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold">Teste A/B</h3>
      {draft.published?.studyError && (
        <p className="text-muted-foreground text-xs">
          O estudo da Meta não foi criado ({draft.published.studyError}); a comparação abaixo usa as métricas de cada conjunto.
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Conjunto</TableHead>
              <TableHead className="text-right">Gasto</TableHead>
              <TableHead className="text-right">Conversas</TableHead>
              <TableHead className="text-right">Custo/conversa</TableHead>
              <TableHead className="text-right">Negócios</TableHead>
              <TableHead className="text-right">Vendas</TableHead>
              <TableHead className="text-right">Custo/venda</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cells.map((cell) => (
              <TableRow key={cell.cell} className={cn(winner === cell.cell && "bg-green-50/60 dark:bg-green-950/20")}>
                <TableCell className="font-medium">
                  {cell.cell}
                  {cell.row?.name && ` · ${cell.row.name}`}
                  {winner === cell.cell && <span className="ml-2 text-xs text-green-700">à frente</span>}
                </TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(cell.row?.spend ?? 0, currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(cell.row?.metaConversations ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(cell.row?.costPerConversation ?? null, currency)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(cell.row?.deals ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCount(cell.row?.wonDeals ?? 0)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatMoney(cell.row?.costPerWonDeal ?? null, currency)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <p className="text-muted-foreground text-xs">
        Espere pelo menos uma semana e algumas dezenas de conversas antes de escolher o vencedor.
      </p>
    </section>
  );
};

type DraftEditorProps = { account: AdAccount; draft: AdCampaignDraft; onBack: () => void };

const DraftEditor: FC<DraftEditorProps> = ({ account, draft, onBack }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const options = useCampaignOptions(account);
  const [name, setName] = useState(draft.name);
  const [brief, setBrief] = useState(draft.brief);
  const [routing, setRouting] = useState<AdDraftRouting>({
    whatsappConfigurationId: draft.whatsappConfigurationId,
    metaPageId: draft.metaPageId,
    flowId: draft.flowId,
    pipelineId: draft.pipelineId,
    stageId: draft.stageId,
    serviceGroupId: draft.serviceGroupId,
  });
  const [plan, setPlan] = useState(draft.plan);
  const params = { clientId: client.id, draftId: draft.id };
  const isLocked = !!draft.published?.campaignId || draft.status === "PUBLISHING" || !can("ads.manage");
  const status = statusInfo[draft.status];

  const refresh = (updated: AdCampaignDraft) => {
    queryClient.setQueryData(["metaAds", "draft", client.id, draft.id], updated);
    queryClient.invalidateQueries({ queryKey: ["metaAds", "drafts"] });
  };
  const save = useMutation({
    mutationFn: metaAdsService.updateDraft,
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      refresh(updated);
      toast.success("Campanha salva");
    },
  });
  const generate = useMutation({
    mutationFn: async () => {
      await metaAdsService.updateDraft({ params, body: { name: name.trim(), brief, ...routing } });
      return metaAdsService.generatePlan({ params });
    },
    onError: requestErrorHandling,
    onSuccess: refresh,
  });
  const publish = useMutation({
    mutationFn: async () => {
      await metaAdsService.updateDraft({ params, body: { name: name.trim(), brief, ...routing, ...(plan && { plan }) } });
      return metaAdsService.publishDraft({ params });
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      refresh(updated);
      if (updated.status === "PUBLISHED") toast.success("Campanha criada pausada na Meta. Revise e ative.");
      else toast.error(updated.error ?? "A criação parou no meio");
    },
  });
  const activate = useMutation({
    mutationFn: metaAdsService.activateDraft,
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      refresh(updated);
      toast.success("Campanha ativada. A Meta revisa os anúncios antes de entregar.");
    },
  });
  const remove = useMutation({
    mutationFn: metaAdsService.deleteDraft,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "drafts"] });
      onBack();
    },
  });
  const isBusy = save.isPending || generate.isPending || publish.isPending || activate.isPending;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Campanhas
        </Button>
        <Input
          aria-label="Nome"
          className="h-9 max-w-sm"
          maxLength={200}
          disabled={isLocked}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
        {!draft.published?.campaignId && can("ads.manage") && (
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-8 w-8"
            aria-label="Apagar a campanha"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ params })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {draft.error && draft.status === "FAILED" && (
        <p className="text-destructive flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {draft.error} O que já foi criado ficou pausado; corrigindo, tente de novo e a criação continua de onde parou.
        </p>
      )}

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">1. O pedido</h3>
        <BriefFields brief={brief} currency={account.currency} disabled={isLocked} onChange={setBrief} />
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">2. Para onde vai a conversa</h3>
        {options.isLoading ? (
          <LoadingState className="justify-start py-2" />
        ) : (
          <RoutingFields routing={routing} options={options} disabled={isLocked} onChange={setRouting} />
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold">3. O plano</h3>
          {!isLocked && (
            <Button
              size="sm"
              variant={plan ? "outline" : "default"}
              disabled={isBusy || !brief.goal.trim() || !brief.product.trim()}
              onClick={() => generate.mutate()}
            >
              {generate.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {plan ? "Gerar outro plano com IA" : "Gerar plano com IA"}
            </Button>
          )}
        </div>
        {generate.isPending && (
          <p className="text-muted-foreground text-sm">A IA está montando a campanha a partir do pedido e do histórico da conta…</p>
        )}
        {!plan && !generate.isPending && (
          <p className="text-muted-foreground text-sm">Descreva o pedido e gere o plano. Você revisa e muda tudo antes de criar na Meta.</p>
        )}
        {plan && (
          <PlanEditor
            key={draft.updatedAt}
            account={account}
            plan={plan}
            audiences={options.audiences}
            assets={options.assets}
            disabled={isLocked}
            onChange={setPlan}
          />
        )}
      </section>

      {!isLocked && (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            disabled={isBusy}
            onClick={() => save.mutate({ params, body: { name: name.trim(), brief, ...routing, ...(plan && { plan }) } })}
          >
            <Save className="h-4 w-4" />
            Salvar
          </Button>
        </div>
      )}

      <section className="space-y-3 rounded-lg border p-3">
        <h3 className="text-sm font-semibold">4. Revisão e publicação</h3>
        {draft.publishErrors.length > 0 && !draft.published?.campaignId && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
            {draft.publishErrors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">
          Tudo nasce pausado na Meta. Depois de conferir no Gerenciador de Anúncios, ative por aqui. A conversa de quem clicar vai para o
          fluxo e o funil escolhidos.
        </p>
        <div className="flex flex-wrap gap-2">
          {can("ads.manage") && (draft.status === "DRAFT" || draft.status === "FAILED") && (
            <Button disabled={isBusy} onClick={() => publish.mutate()}>
              {publish.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
              {draft.status === "FAILED" ? "Continuar a criação" : "Criar pausada na Meta"}
            </Button>
          )}
          {can("ads.approve") && draft.status === "PUBLISHED" && (
            <Button disabled={isBusy} onClick={() => activate.mutate({ params })}>
              <Play className="h-4 w-4" />
              Ativar campanha
            </Button>
          )}
          {draft.status === "PUBLISHED" && !can("ads.approve") && (
            <p className="text-muted-foreground text-sm">Quem aprova anúncios ativa a campanha.</p>
          )}
          {draft.publishedAt && (
            <p className="text-muted-foreground self-center text-xs">Criada em {format(new Date(draft.publishedAt), "dd/MM HH:mm")}</p>
          )}
          {draft.activatedAt && (
            <p className="text-muted-foreground self-center text-xs">· ativada em {format(new Date(draft.activatedAt), "dd/MM HH:mm")}</p>
          )}
        </div>
      </section>

      {draft.published?.campaignId && plan?.abTest.enabled && <AbTestResult draft={draft} currency={account.currency} />}
    </div>
  );
};

/** Criação de campanhas de clique para WhatsApp a partir de um objetivo, com a biblioteca de criativos. */
export const AdsCampaignBuilder: FC<{ account: AdAccount; initialDraftId?: string | null }> = ({ account, initialDraftId = null }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [openDraftId, setOpenDraftId] = useState<string | null>(initialDraftId);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const params = { clientId: client.id, accountId: account.id };

  const draftsQuery = useQuery({
    queryKey: ["metaAds", "drafts", client.id, account.id],
    queryFn: () => metaAdsService.findDrafts({ params }),
  });
  const draftQuery = useQuery({
    queryKey: ["metaAds", "draft", client.id, openDraftId],
    queryFn: () => metaAdsService.findDraft({ params: { clientId: client.id, draftId: openDraftId! } }),
    enabled: !!openDraftId,
  });
  const assetsQuery = useQuery({
    queryKey: ["metaAds", "assets", client.id, account.id],
    queryFn: () => metaAdsService.findAssets({ params }),
  });

  const create = useMutation({
    mutationFn: metaAdsService.createDraft,
    onError: requestErrorHandling,
    onSuccess: (draft) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "drafts"] });
      setIsCreating(false);
      setNewName("");
      setOpenDraftId(draft.id);
    },
  });

  if (openDraftId) {
    if (draftQuery.isLoading || !draftQuery.data) return <LoadingState />;
    return <DraftEditor key={draftQuery.data.updatedAt} account={account} draft={draftQuery.data} onBack={() => setOpenDraftId(null)} />;
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Campanhas montadas aqui</h3>
          {can("ads.manage") && !isCreating && (
            <Button size="sm" className="ml-auto" onClick={() => setIsCreating(true)}>
              <Plus className="h-4 w-4" />
              Nova campanha
            </Button>
          )}
        </div>
        {isCreating && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
            <div className="grid min-w-64 flex-1 gap-1">
              <Label htmlFor="new-draft-name" className="text-xs">
                Nome
              </Label>
              <Input
                id="new-draft-name"
                maxLength={200}
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Consignado INSS - novembro"
              />
            </div>
            <Button
              disabled={!newName.trim() || create.isPending}
              onClick={() =>
                create.mutate({
                  params,
                  body: {
                    name: newName.trim(),
                    brief: { ...emptyBrief(), goal: newName.trim(), product: newName.trim() },
                    ...emptyRouting(),
                  },
                })
              }
            >
              Começar
            </Button>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        )}
        {draftsQuery.isLoading && <LoadingState className="justify-start py-2" />}
        {draftsQuery.data?.length === 0 && !isCreating && (
          <EmptyState
            icon={Megaphone}
            title="Nenhuma campanha montada aqui"
            description="Descreva o objetivo, o produto e a verba; a IA propõe a estrutura, os públicos e os textos, e você publica pausada para revisar."
          />
        )}
        <ul className="divide-y rounded-lg border">
          {draftsQuery.data?.map((draft) => (
            <li key={draft.id}>
              <button
                type="button"
                className="hover:bg-muted/50 flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
                onClick={() => setOpenDraftId(draft.id)}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{draft.name}</span>
                {draft.plan && (
                  <span className="text-muted-foreground text-xs">{formatMoney(draft.plan.dailyBudget, account.currency)}/dia</span>
                )}
                <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", statusInfo[draft.status].className)}>
                  {statusInfo[draft.status].label}
                </span>
                <span className="text-muted-foreground text-xs">{format(new Date(draft.updatedAt), "dd/MM HH:mm")}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Biblioteca de criativos</h3>
        <AdsAssetLibrary account={account} assets={assetsQuery.data ?? []} />
      </div>
    </section>
  );
};
