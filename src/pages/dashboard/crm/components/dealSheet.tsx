import { LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { crmService } from "@/services/api/crmService";
import { formatPhoneNumber } from "@/utils/formatString";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageCircle, RotateCcw } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  contactChatPath,
  crmSelectClassName,
  crmTextareaClassName,
  dealContactName,
  dealStatusLabel,
  findPipelineStage,
  stageFlowResultLabel,
} from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";
import { useDealActions } from "../useDealActions";

type DealSheetProps = {
  dealId: string | null;
  onClose: () => void;
};

const fieldLabel: Record<string, string> = { title: "título", value: "valor", notes: "notas", ownerUserId: "responsável" };

const describeEvent = (event: DealEvent) => {
  const payload = (event.payload ?? {}) as Record<string, string | string[] | null>;

  switch (event.type) {
    case "CREATED":
      return `Criou o negócio em ${payload.stageName}`;
    case "STAGE_CHANGED":
      return `Moveu de ${payload.fromStageName ?? "—"} para ${payload.stageName}${payload.lostReason ? ` (motivo: ${payload.lostReason})` : ""}`;
    case "GROUP_CHANGED":
      return `Transferiu de ${payload.fromServiceGroupName ?? "sem grupo"} para ${payload.serviceGroupName ?? "sem grupo"}`;
    case "REOPENED":
      return `Reabriu o negócio em ${payload.stageName}`;
    case "FLOW_TRIGGERED":
      return `Fluxo da etapa ${payload.flowName ? `"${payload.flowName}" ` : ""}${stageFlowResultLabel[payload.result as StageFlowResult] ?? ""}`;
    case "UPDATED":
      return `Alterou ${((payload.fields as string[]) ?? []).map((field) => fieldLabel[field] ?? field).join(", ")}`;
  }
};

const statusVariant: Record<DealStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
};

// A key do pai recria o formulário quando o negócio muda no servidor, trazendo os valores salvos
const DealDetailsForm: FC<{ deal: Deal }> = ({ deal }) => {
  const { client } = useClientContext();
  const { members } = useCrmOptions();
  const actions = useDealActions();

  const [title, setTitle] = useState(deal.title);
  const [value, setValue] = useState(deal.value === null ? "" : String(deal.value));
  const [ownerUserId, setOwnerUserId] = useState(deal.owner?.id ?? "");
  const [notes, setNotes] = useState(deal.notes ?? "");

  const parsedValue = value.trim() === "" ? null : Number(value.replace(",", "."));
  const isValueInvalid = parsedValue !== null && (Number.isNaN(parsedValue) || parsedValue < 0);

  const saveDetails = () => {
    if (!title.trim() || isValueInvalid) return;

    actions.updateDeal.mutate(
      {
        params: { clientId: client.id, dealId: deal.id },
        body: { title: title.trim(), value: parsedValue, notes: notes.trim() || null, ownerUserId: ownerUserId || null },
      },
      { onSuccess: () => toast.success("Negócio atualizado") },
    );
  };

  return (
    <section className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="deal-title">Título</Label>
        <Input id="deal-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-value">Valor (R$)</Label>
        <Input
          id="deal-value"
          inputMode="decimal"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="0,00"
          aria-invalid={isValueInvalid}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-owner">Responsável</Label>
        <select id="deal-owner" value={ownerUserId} onChange={(event) => setOwnerUserId(event.target.value)} className={crmSelectClassName}>
          <option value="">Sem responsável</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name ?? member.email}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-notes">Notas</Label>
        <textarea
          id="deal-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={5000}
          className={crmTextareaClassName}
        />
      </div>
      <Button onClick={saveDetails} disabled={!title.trim() || isValueInvalid || actions.isPending}>
        Salvar
      </Button>
    </section>
  );
};

export const DealSheet: FC<DealSheetProps> = ({ dealId, onClose }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const { pipelines, allServiceGroups } = useCrmOptions();
  const actions = useDealActions();

  const dealQuery = useQuery({
    queryKey: ["crm", "deals", "detail", dealId],
    queryFn: () => crmService.findDeal({ params: { clientId: client.id, dealId: dealId! } }),
    enabled: !!dealId,
  });
  const eventsQuery = useQuery({
    queryKey: ["crm", "deals", "events", dealId],
    queryFn: () => crmService.findDealEvents({ params: { clientId: client.id, dealId: dealId! } }),
    enabled: !!dealId,
  });

  const deal = dealQuery.data;
  const pipeline = pipelines.find((item) => item.id === deal?.pipelineId);

  const transferTo = (serviceGroupId: string) => {
    if (!deal) return;

    actions.transferDeal.mutate(
      { params: { clientId: client.id, dealId: deal.id }, body: { serviceGroupId: serviceGroupId || null } },
      { onSuccess: () => toast.success("Negócio transferido") },
    );
  };

  const reopen = () => {
    if (!deal) return;

    actions.reopenDeal.mutate(
      { params: { clientId: client.id, dealId: deal.id }, body: {} },
      { onSuccess: () => toast.success("Negócio reaberto") },
    );
  };

  return (
    <Sheet open={!!dealId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{deal?.title ?? "Negócio"}</SheetTitle>
          <SheetDescription>
            {deal ? `${dealContactName(deal.contact)} · ${formatPhoneNumber(deal.contact.phoneNumber)}` : "Carregando..."}
          </SheetDescription>
        </SheetHeader>

        {!deal && <LoadingState />}

        {deal && (
          <div className="space-y-6 px-4 pb-6">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={statusVariant[deal.status]} variant="secondary">
                {dealStatusLabel[deal.status]}
              </Badge>
              <span className="text-muted-foreground text-xs">{pipeline?.name}</span>
              <Button variant="outline" size="sm" className="ml-auto" asChild>
                <Link to={contactChatPath(baseUrl, deal.contact)}>
                  <MessageCircle className="h-3.5 w-3.5" />
                  Abrir conversa
                </Link>
              </Button>
            </div>

            <section className="space-y-3">
              <div className="grid gap-2">
                <Label htmlFor="deal-stage">Etapa</Label>
                <select
                  id="deal-stage"
                  value={deal.stageId}
                  disabled={deal.status !== "OPEN" || actions.isPending}
                  onChange={(event) => {
                    const stage = findPipelineStage(pipeline, event.target.value);
                    if (stage) actions.requestMove(deal, stage);
                  }}
                  className={crmSelectClassName}
                >
                  {pipeline?.stages.map((stage) => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name}
                    </option>
                  ))}
                </select>
              </div>

              {deal.status !== "OPEN" && (
                <div className="bg-muted/50 space-y-2 rounded-lg p-3 text-sm">
                  {deal.closedAt && <p>Encerrado em {format(new Date(deal.closedAt), "PPp", { locale: ptBR })}</p>}
                  {deal.lostReason && <p className="text-muted-foreground">Motivo: {deal.lostReason}</p>}
                  <Button size="sm" variant="outline" onClick={reopen} disabled={actions.isPending}>
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reabrir negócio
                  </Button>
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="deal-group">Grupo de atendimento</Label>
                <select
                  id="deal-group"
                  value={deal.serviceGroup?.id ?? ""}
                  disabled={actions.isPending}
                  onChange={(event) => transferTo(event.target.value)}
                  className={crmSelectClassName}
                >
                  {can("crm.viewAll") && <option value="">Sem grupo</option>}
                  {allServiceGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">O grupo define quem vê o negócio.</p>
              </div>
            </section>

            <DealDetailsForm key={`${deal.id}-${deal.updatedAt}`} deal={deal} />

            <section>
              <p className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">Histórico</p>
              {eventsQuery.isLoading && <LoadingState className="justify-start py-2" />}
              <ol className="space-y-3">
                {eventsQuery.data?.map((event) => (
                  <li key={event.id} className="border-l-2 pl-3 text-sm">
                    <p>{describeEvent(event)}</p>
                    <p className="text-muted-foreground text-xs">
                      {event.user?.name ?? "Fluxo automático"} · {format(new Date(event.createdAt), "PPp", { locale: ptBR })}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </div>
        )}
        {actions.lostReasonDialog}
      </SheetContent>
    </Sheet>
  );
};
