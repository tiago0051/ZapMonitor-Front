import { useConfirm } from "@/components/confirm-dialog";
import { DisabledReason } from "@/components/disabled-reason";
import { EmptyState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, Check, Loader2, Megaphone, Play, Plus, Rocket, Save, Sparkles, Trash2, Undo2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { effectiveStatusInfo, formatCount, formatMoney, statusToneClassName } from "../adsUtils";
import { AdStatusToggle } from "../components/adStatusToggle";
import { SteppedProgress } from "../components/steppedProgress";
import { AdsAssetLibrary } from "./adsAssetLibrary";
import { DeliveryFields } from "./deliveryFields";
import { BriefFields, RoutingFields } from "./draftFields";
import { PlanEditor } from "./planEditor";
import { PublishChecklist } from "./publishChecklist";
import { buildPublishChecklist } from "./publishChecklistUtils";
import { useCampaignOptions } from "./useCampaignOptions";

const statusInfo: Record<AdDraftStatus, { label: string; className: string }> = {
  DRAFT: { label: "Rascunho", className: "bg-muted text-muted-foreground" },
  PUBLISHING: { label: "Criando na Meta", className: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" },
  PUBLISHED: { label: "Criada pausada", className: "bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300" },
  FAILED: { label: "Parou no meio", className: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  ACTIVE: { label: "Ativa", className: "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300" },
};

/**
 * Status para mostrar: depois de ativada, a campanha pode ser pausada na Meta, pela IA ou à mão; então vale o status
 * da última sincronização, não o do rascunho.
 */
const draftStatusDisplay = (draft: AdCampaignDraft) => {
  if (draft.status === "ACTIVE" && draft.campaignStatus && draft.campaignStatus !== "ACTIVE") {
    const info = effectiveStatusInfo(draft.campaignStatus);
    return { label: info.label, className: statusToneClassName[info.tone] };
  }

  return statusInfo[draft.status];
};

const GENERATE_STEPS = ["Lendo o pedido e as métricas da conta…", "Analisando públicos e criativos…", "Montando o plano…"];

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

const isDraftLocked = (draft: AdCampaignDraft, canManage: boolean) =>
  !!draft.published?.campaignId || draft.status === "PUBLISHING" || !canManage;

type DraftEditorProps = { account: AdAccount; draft: AdCampaignDraft; onBack: () => void };

const DraftEditor: FC<DraftEditorProps> = ({ account, draft, onBack }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const options = useCampaignOptions(account);
  const [name, setName] = useState(draft.name);
  const [brief, setBrief] = useState(draft.brief);
  const savedRouting: AdDraftRouting = {
    whatsappConfigurationId: draft.whatsappConfigurationId,
    metaPageId: draft.metaPageId,
    flowId: draft.flowId,
    pipelineId: draft.pipelineId,
    stageId: draft.stageId,
    serviceGroupId: draft.serviceGroupId,
  };
  const [routing, setRouting] = useState<AdDraftRouting>(savedRouting);
  const [plan, setPlan] = useState(draft.plan);
  // O editor remonta a cada versão salva (key = updatedAt), então o rascunho do servidor é a referência
  const isDirty =
    JSON.stringify({ name, brief, routing, plan }) !==
    JSON.stringify({ name: draft.name, brief: draft.brief, routing: savedRouting, plan: draft.plan });
  const { guard, guardDialog } = useUnsavedChangesGuard(isDirty && !isDraftLocked(draft, can("ads.manage")));
  const { confirm, confirmDialog } = useConfirm();
  const params = { clientId: client.id, draftId: draft.id };
  const isLocked = isDraftLocked(draft, can("ads.manage"));
  const status = draftStatusDisplay(draft);

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
  const [isConfirmingUndo, setIsConfirmingUndo] = useState(false);
  const undo = useMutation({
    mutationFn: metaAdsService.undoDraftPublication,
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      refresh(updated);
      setIsConfirmingUndo(false);
      toast.success("Campanha excluída da Meta. Corrija o plano e crie de novo.");
    },
  });
  const isBusy = save.isPending || generate.isPending || publish.isPending || activate.isPending || undo.isPending;
  // Criada (ou criada pela metade) e ainda não ativada: dá para excluir da Meta e voltar ao rascunho
  const canUndo =
    can("ads.manage") && !!draft.published?.campaignId && (draft.status === "FAILED" || draft.status === "PUBLISHED") && !draft.activatedAt;
  const canPublish = can("ads.manage") && (draft.status === "DRAFT" || draft.status === "FAILED");
  const deliveryQuery = useQuery({
    queryKey: ["metaAds", "deliveryOptions", client.id],
    queryFn: () => metaAdsService.findDeliveryOptions({ params: { clientId: client.id } }),
    enabled: !!plan && !draft.published?.campaignId,
  });
  const checklist = buildPublishChecklist({
    routing,
    plan,
    assets: options.assets,
    durationDays: brief.durationDays,
    delivery: deliveryQuery.data,
  });
  const missingCount = checklist.filter((item) => !item.ok).length;

  const confirmRemove = async () => {
    const ok = await confirm({
      title: `Apagar a campanha "${draft.name}"?`,
      description: "O rascunho, o plano e os textos montados aqui são apagados. Nada foi criado na Meta.",
      confirmLabel: "Apagar campanha",
      destructive: true,
    });
    if (ok) remove.mutate({ params });
  };

  return (
    <div className="space-y-6">
      {guardDialog}
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => guard(onBack)}>
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
        {!isLocked && (
          <span
            aria-live="polite"
            className={cn("flex items-center gap-1 text-xs", isDirty ? "text-amber-700 dark:text-amber-400" : "text-muted-foreground")}
          >
            {isDirty ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                Alterações não salvas
              </>
            ) : (
              <>
                <Check className="h-3.5 w-3.5" />
                Salvo
              </>
            )}
          </span>
        )}
        {!draft.published?.campaignId && can("ads.manage") && (
          <Button
            size="icon"
            variant="ghost"
            className="ml-auto h-8 w-8"
            aria-label="Apagar a campanha"
            disabled={remove.isPending}
            onClick={confirmRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {draft.error && draft.status === "FAILED" && (
        <p className="text-destructive flex items-start gap-2 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {draft.error} O que já foi criado ficou pausado. Se o erro estiver na Meta, tente de novo e a criação continua de onde parou; se
          precisar mudar o plano (verba, público, criativo), exclua da Meta e volte ao rascunho.
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
        <SteppedProgress active={generate.isPending} steps={GENERATE_STEPS} />
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
        {plan && (
          <DeliveryFields
            plan={plan}
            durationDays={brief.durationDays}
            currency={account.currency}
            options={deliveryQuery.data}
            disabled={isLocked}
            onChange={(changes) => setPlan({ ...plan, ...changes })}
            onDurationChange={(durationDays) => setBrief({ ...brief, durationDays })}
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
        {canPublish && (
          <div className="space-y-2">
            <p className="text-sm font-medium">
              {missingCount === 0 ? "Pronto para criar" : `Pronto para criar? Falta${missingCount > 1 ? "m" : ""} ${missingCount} item(ns)`}
            </p>
            <PublishChecklist items={checklist} />
          </div>
        )}
        {draft.publishErrors.length > 0 && !draft.published?.campaignId && (
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Conferido pelo servidor na última versão salva:</p>
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-400">
              {draft.publishErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          Tudo nasce pausado na Meta. Depois de conferir no Gerenciador de Anúncios, ative por aqui. A conversa de quem clicar vai para o
          fluxo e o funil escolhidos.
        </p>
        <div className="flex flex-wrap gap-2">
          {canPublish && (
            <Button disabled={isBusy || missingCount > 0} onClick={() => publish.mutate()}>
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
          {/* Já ativada: pausar e reativar a campanha sem passar pela IA */}
          {draft.status === "ACTIVE" && draft.published?.campaignId && draft.campaignStatus && (
            <AdStatusToggle
              accountId={account.id}
              level="campaign"
              metaId={draft.published.campaignId}
              status={draft.campaignStatus}
              size="sm"
            />
          )}
          {canUndo &&
            (isConfirmingUndo ? (
              <>
                <Button variant="destructive" disabled={isBusy} onClick={() => undo.mutate({ params })}>
                  {undo.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                  Confirmar exclusão na Meta
                </Button>
                <Button variant="ghost" disabled={undo.isPending} onClick={() => setIsConfirmingUndo(false)}>
                  Cancelar
                </Button>
                <p className="text-muted-foreground basis-full text-xs">
                  Exclui da Meta a campanha, os conjuntos, os anúncios e os criativos criados por aqui. O plano fica salvo para você
                  corrigir e criar de novo.
                </p>
              </>
            ) : (
              <Button variant="outline" disabled={isBusy} onClick={() => setIsConfirmingUndo(true)}>
                <Undo2 className="h-4 w-4" />
                Excluir da Meta e voltar ao rascunho
              </Button>
            ))}
          {canPublish && missingCount > 0 && (
            <DisabledReason className="basis-full">Complete os itens acima para criar a campanha na Meta.</DisabledReason>
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
            <div className="grid w-full flex-1 gap-1 sm:w-auto sm:min-w-64">
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
        {!!draftsQuery.data?.length && (
          <ul className="divide-y rounded-lg border">
            {draftsQuery.data.map((draft) => (
              <li key={draft.id}>
                <button
                  type="button"
                  className="hover:bg-muted/50 flex w-full flex-wrap items-center gap-2 px-3 py-2 text-left"
                  onClick={() => setOpenDraftId(draft.id)}
                >
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{draft.name}</span>
                  {draft.plan && (
                    <span className="text-muted-foreground text-xs">
                      {draft.plan.teamHoursOnly && draft.brief.durationDays
                        ? `${formatMoney(draft.plan.dailyBudget * draft.brief.durationDays, account.currency)} no total`
                        : `${formatMoney(draft.plan.dailyBudget, account.currency)}/dia`}
                    </span>
                  )}
                  <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", draftStatusDisplay(draft).className)}>
                    {draftStatusDisplay(draft).label}
                  </span>
                  <span className="text-muted-foreground text-xs">{format(new Date(draft.updatedAt), "dd/MM HH:mm")}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Biblioteca de criativos</h3>
        <AdsAssetLibrary account={account} assets={assetsQuery.data ?? []} />
      </div>
    </section>
  );
};
