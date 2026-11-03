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
import { ChevronDown, Columns3, Users } from "lucide-react";
import { useState, type DragEvent } from "react";
import { Link } from "react-router";
import { useLocalStorage } from "usehooks-ts";
import { DEAL_DRAG_TYPE, DealCard } from "./components/dealCard";
import { DealSheet } from "./components/dealSheet";
import { crmSelectClassName, formatCurrency, sumDealValues } from "./crmUtils";
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
  const [openDealId, setOpenDealId] = useState<string | null>(null);
  const [dropStageId, setDropStageId] = useState<string | null>(null);

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
  };

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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-end gap-3 border-b p-4">
        <div className="mr-2">
          <h1 className="text-2xl font-semibold">CRM</h1>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="crm-pipeline" className="text-xs">
            Funil
          </Label>
          <select
            id="crm-pipeline"
            value={pipeline?.id}
            onChange={(event) => setStoredPipelineId(event.target.value)}
            className={cn(crmSelectClassName, "w-48")}
          >
            {activePipelines.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <span className="text-xs font-medium">Grupos</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-48 justify-between font-normal">
                <span className="truncate">{serviceGroupLabel}</span>
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
        </div>

        <div className="grid gap-1">
          <Label htmlFor="crm-owner" className="text-xs">
            Responsável
          </Label>
          <select
            id="crm-owner"
            value={onlyMine ? "" : ownerUserId}
            disabled={onlyMine}
            onChange={(event) => setOwnerUserId(event.target.value)}
            className={cn(crmSelectClassName, "w-44")}
          >
            <option value="">Todos</option>
            {members.map((member) => (
              <option key={member.id} value={member.id}>
                {member.name ?? member.email}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1">
          <Label htmlFor="crm-category" className="text-xs">
            Categoria
          </Label>
          <select
            id="crm-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={cn(crmSelectClassName, "w-40")}
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
          <span className="text-xs font-medium">Criados entre</span>
          <div className="flex items-center gap-1">
            <Input
              type="date"
              aria-label="Criados a partir de"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-36"
            />
            <Input
              type="date"
              aria-label="Criados até"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="w-36"
            />
          </div>
        </div>

        <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
          <Checkbox checked={onlyMine} onCheckedChange={(checked) => setOnlyMine(checked === true)} />
          Só os meus
        </label>
      </div>

      {boardQuery.isError ? (
        <ErrorState
          message="Não foi possível carregar os negócios."
          onRetry={() => boardQuery.refetch()}
          isRetrying={boardQuery.isFetching}
        />
      ) : (
        <div className="flex flex-1 gap-3 overflow-x-auto p-4">
          {pipeline?.stages.map((stage) => {
            const stageDeals = deals.filter((deal) => deal.stageId === stage.id);
            const total = sumDealValues(stageDeals);

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
                  <p className="text-muted-foreground text-xs">{formatCurrency(total)}</p>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto p-2">
                  {boardQuery.isLoading && <LoadingState className="py-4" />}
                  {stageDeals.map((deal) => (
                    <DealCard key={deal.id} deal={deal} draggable={deal.status === "OPEN"} onOpen={(item) => setOpenDealId(item.id)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DealSheet dealId={openDealId} onClose={() => setOpenDealId(null)} />
      {actions.lostReasonDialog}
    </div>
  );
};
