import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { whatsappService } from "@/services/api/whatsappService";
import { useQuery } from "@tanstack/react-query";
import { endOfDay, startOfDay } from "date-fns";
import { ChevronDown, Columns3, List, SlidersHorizontal, Users } from "lucide-react";
import { useState, type DragEvent } from "react";
import { Link } from "react-router";
import { useLocalStorage } from "usehooks-ts";
import { DEAL_DRAG_TYPE, DealCard } from "./components/dealCard";
import { DealSheet } from "./components/dealSheet";
import { DealList } from "./components/dealList";
import { useCrmRealtime } from "./useCrmRealtime";
import { crmSelectClassName, formatCurrency, staleDays, sumDealValues } from "./crmUtils";
import { useCrmOptions } from "./useCrmOptions";
import { useDealActions } from "./useDealActions";

// Data do campo (aaaa-mm-dd) no fuso do navegador, para o período cobrir o dia inteiro de quem filtra
const parseDateInput = (value: string) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export const CrmBoard = () => {
  const { client, can } = useClientContext();
  const { user } = useUserContext();
  const baseUrl = useBaseUrl();
  const { canViewAll, activePipelines, visibleServiceGroups, members, isLoading } = useCrmOptions();
  const actions = useDealActions();

  const [storedPipelineId, setStoredPipelineId] = useLocalStorage<string | null>(`crm:pipeline:${client.id}`, null);
  // Vazio = todos os grupos que o usuário pode ver
  const [storedServiceGroupIds, setStoredServiceGroupIds] = useLocalStorage<string[]>(`crm:serviceGroups:${client.id}`, []);
  const [ownerUserId, setOwnerUserId] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  // "" todas; NONE sem anúncio; AD_MESSAGE e LEAD_FORM pelo tipo; campaign:<id> uma campanha
  const [origin, setOrigin] = useState("");
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [dropStageId, setDropStageId] = useState<string | null>(null);
  const [view, setView] = useLocalStorage<"board" | "list">(`crm:view:${client.id}`, "board");
  useCrmRealtime();

  const pipeline = activePipelines.find((item) => item.id === storedPipelineId) ?? activePipelines[0];
  // Grupos lembrados que deixaram de existir ou de ser do usuário saem do filtro
  const selectedServiceGroupIds = storedServiceGroupIds.filter((id) => visibleServiceGroups.some((group) => group.id === id));
  const hasNoServiceGroup = !canViewAll && !isLoading && visibleServiceGroups.length === 0;

  const categoriesQuery = useQuery({
    queryKey: ["whatsappCategories", client.id, "crm"],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({ params: { clientId: client.id }, queries: { page: 1, take: 100, text: "" } }),
  });

  const queries: FindDealBoardRequestQuery = {
    pipelineId: pipeline?.id ?? "",
    serviceGroupIds: selectedServiceGroupIds.length ? selectedServiceGroupIds.join(",") : undefined,
    ownerUserId: onlyMine ? user?.id : ownerUserId || undefined,
    categoryId: categoryId || undefined,
    startDate: startDate ? startOfDay(parseDateInput(startDate)).toISOString() : undefined,
    endDate: endDate ? endOfDay(parseDateInput(endDate)).toISOString() : undefined,
    ...(origin.startsWith("campaign:")
      ? { originMetaCampaignId: origin.substring("campaign:".length) }
      : origin && { originType: origin as DealOriginType | "NONE" }),
  };

  const originCampaignsQuery = useQuery({
    queryKey: ["crm", "originCampaigns", client.id, pipeline?.id],
    queryFn: () => crmService.findOriginCampaigns({ params: { clientId: client.id, pipelineId: pipeline!.id } }),
    enabled: !!pipeline && !hasNoServiceGroup,
  });

  const boardQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["crm", "deals", "board", client.id, queries],
    queryFn: () => crmService.findBoard({ params: { clientId: client.id }, queries }),
    enabled: !!pipeline && !hasNoServiceGroup,
  });

  const deals = boardQuery.data ?? [];
  const findDeal = (dealId: string) => deals.find((deal) => deal.id === dealId);

  const toggleServiceGroup = (serviceGroupId: string, checked: boolean) =>
    setStoredServiceGroupIds(
      checked ? [...selectedServiceGroupIds, serviceGroupId] : selectedServiceGroupIds.filter((id) => id !== serviceGroupId),
    );

  const handleDrop = (event: DragEvent<HTMLDivElement>, stage: PipelineStage) => {
    event.preventDefault();
    setDropStageId(null);

    const deal = findDeal(event.dataTransfer.getData(DEAL_DRAG_TYPE));
    if (deal?.status === "OPEN") actions.requestMove(deal, stage);
  };

  if (isLoading) return <LoadingState className="h-full" />;

  if (activePipelines.length === 0)
    return (
      <EmptyState
        className="h-full"
        icon={Columns3}
        title="Nenhum funil ativo"
        description={
          can("crm.manage") ? "Crie um funil para começar a acompanhar os negócios." : "Peça a um administrador para criar um funil."
        }
        action={
          can("crm.manage") && (
            <Button asChild>
              <Link to={`${baseUrl}/configuration?tab=pipeline`}>Criar funil</Link>
            </Button>
          )
        }
      />
    );

  if (hasNoServiceGroup)
    return (
      <EmptyState
        className="h-full"
        icon={Users}
        title="Você não participa de nenhum grupo de atendimento"
        description="Os negócios aparecem para os membros do grupo de cada um. Peça para ser incluído em um grupo."
      />
    );

  const serviceGroupLabel =
    selectedServiceGroupIds.length === 0
      ? canViewAll
        ? "Todos os negócios"
        : "Todos os meus grupos"
      : selectedServiceGroupIds.length === 1
        ? visibleServiceGroups.find((group) => group.id === selectedServiceGroupIds[0])?.name
        : `${selectedServiceGroupIds.length} grupos`;

  // Filtros guardados em "Mais filtros", contados no botão
  const extraFilterCount = [categoryId, origin, startDate || endDate].filter(Boolean).length;
  const clearExtraFilters = () => {
    setCategoryId("");
    setOrigin("");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
        <select
          aria-label="Funil"
          title="Funil"
          value={pipeline?.id}
          onChange={(event) => setStoredPipelineId(event.target.value)}
          className={cn(crmSelectClassName, "w-44 font-medium")}
        >
          {activePipelines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-44 justify-between font-normal" aria-label="Grupos de atendimento">
              <span className="flex min-w-0 items-center gap-1.5">
                <Users className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{serviceGroupLabel}</span>
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 space-y-2">
            {visibleServiceGroups.length === 0 && <p className="text-muted-foreground text-sm">Nenhum grupo cadastrado.</p>}
            {visibleServiceGroups.map((group) => (
              <label key={group.id} className="flex cursor-pointer items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedServiceGroupIds.includes(group.id)}
                  onCheckedChange={(checked) => toggleServiceGroup(group.id, checked === true)}
                />
                <span className="truncate">{group.name}</span>
              </label>
            ))}
            {selectedServiceGroupIds.length > 0 && (
              <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setStoredServiceGroupIds([])}>
                Limpar seleção
              </Button>
            )}
            <p className="text-muted-foreground text-xs">
              {canViewAll
                ? "Sem seleção, aparecem todos os negócios, inclusive os sem grupo."
                : "Sem seleção, aparecem os negócios de todos os seus grupos."}
            </p>
          </PopoverContent>
        </Popover>

        <select
          aria-label="Responsável"
          title="Responsável"
          value={onlyMine ? "" : ownerUserId}
          disabled={onlyMine}
          onChange={(event) => setOwnerUserId(event.target.value)}
          className={cn(crmSelectClassName, "w-44")}
        >
          <option value="">Todos os responsáveis</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? member.email}
            </option>
          ))}
        </select>

        <label className="flex h-9 cursor-pointer items-center gap-2 px-1 text-sm whitespace-nowrap">
          <Checkbox checked={onlyMine} onCheckedChange={(checked) => setOnlyMine(checked === true)} />
          Só os meus
        </label>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="font-normal">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Mais filtros
              {extraFilterCount > 0 && (
                <span className="bg-primary text-primary-foreground rounded-full px-1.5 text-[11px] font-semibold tabular-nums">
                  {extraFilterCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 space-y-3">
            <div className="grid gap-1">
              <Label htmlFor="crm-category" className="text-xs">
                Categoria
              </Label>
              <select
                id="crm-category"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
                className={crmSelectClassName}
              >
                <option value="">Todas</option>
                {categoriesQuery.data?.items.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-1">
              <Label htmlFor="crm-origin" className="text-xs">
                Origem
              </Label>
              <select id="crm-origin" value={origin} onChange={(event) => setOrigin(event.target.value)} className={crmSelectClassName}>
                <option value="">Todas</option>
                <option value="AD_MESSAGE">Anúncio no WhatsApp</option>
                <option value="LEAD_FORM">Formulário de cadastro</option>
                <option value="NONE">Sem anúncio</option>
                {!!originCampaignsQuery.data?.length && (
                  <optgroup label="Campanha">
                    {originCampaignsQuery.data.map((campaign) => (
                      <option key={campaign.metaCampaignId} value={`campaign:${campaign.metaCampaignId}`}>
                        {campaign.name ?? `Campanha ${campaign.metaCampaignId}`}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </div>

            <div className="grid gap-1">
              <span className="text-xs font-medium">Criados entre</span>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  type="date"
                  aria-label="Criados a partir de"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
                <Input type="date" aria-label="Criados até" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
              </div>
            </div>

            {extraFilterCount > 0 && (
              <Button variant="link" size="sm" className="h-auto px-0" onClick={clearExtraFilters}>
                Limpar estes filtros
              </Button>
            )}
          </PopoverContent>
        </Popover>

        <div className="ml-auto flex rounded-md border p-0.5" role="group" aria-label="Visualização">
          {(["board", "list"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={view === option}
              onClick={() => setView(option)}
              className={cn(
                "flex items-center gap-1.5 rounded px-2.5 py-1 text-sm",
                view === option ? "bg-muted font-medium" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option === "board" ? <Columns3 className="h-3.5 w-3.5" /> : <List className="h-3.5 w-3.5" />}
              {option === "board" ? "Quadro" : "Lista"}
            </button>
          ))}
        </div>
      </div>

      {boardQuery.isError ? (
        <ErrorState
          message="Não foi possível carregar os negócios."
          onRetry={() => boardQuery.refetch()}
          isRetrying={boardQuery.isFetching}
        />
      ) : view === "list" && pipeline ? (
        boardQuery.isLoading ? (
          <LoadingState />
        ) : (
          <DealList deals={deals} pipeline={pipeline} onOpen={(deal) => setOpenDealId(deal.id)} />
        )
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {pipeline?.stages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
            const total = sumDealValues(stageDeals);
            const staleCount = stageDeals.filter((deal) => staleDays(deal, stage) !== null).length;

            return (
              <div
                key={stage.id}
                onDragOver={(event) => {
                  if (!event.dataTransfer.types.includes(DEAL_DRAG_TYPE)) return;
                  event.preventDefault();
                  setDropStageId(stage.id);
                }}
                onDragLeave={() => setDropStageId((current) => (current === stage.id ? null : current))}
                onDrop={(event) => handleDrop(event, stage)}
                className={cn(
                  "bg-muted/40 flex w-72 shrink-0 flex-col rounded-xl border transition-colors",
                  dropStageId === stage.id && "border-primary bg-primary/5",
                )}
              >
                <div
                  className="border-b px-3 py-2.5"
                  style={{ borderTopColor: stage.color, borderTopWidth: 3, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold">{stage.name}</p>
                    <span className="text-muted-foreground bg-background rounded-full px-2 text-xs">{stageDeals.length}</span>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {formatCurrency(total)}
                    {staleCount > 0 && <span className="text-sky-700 dark:text-sky-300"> · {staleCount} esfriando</span>}
                  </p>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {boardQuery.isLoading && <LoadingState className="py-4" />}
                  {stageDeals.map((deal) => (
                    <DealCard
                      key={deal.id}
                      deal={deal}
                      stage={stage}
                      draggable={deal.status === "OPEN"}
                      onOpen={(item) => setOpenDealId(item.id)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DealSheet dealId={openDealId} onClose={() => setOpenDealId(null)} />
      {actions.dialogs}
    </div>
  );
};
