import { LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { crmService } from "@/services/api/crmService";
import { formatPhoneNumber } from "@/utils/formatString";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PhoneOff, RotateCcw, UserRound } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";
import { Link } from "react-router";
import { toast } from "sonner";
import {
  crmSelectClassName,
  crmTextareaClassName,
  dealContactName,
  dealStatusLabel,
  findPipelineStage,
  toCustomFieldsBody,
  toCustomFieldsForm,
} from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";
import { CustomFieldInput } from "./customFieldInput";
import { describeEvent, eventDetail } from "./dealEventText";
import { DealActivityForm } from "./dealActivityForm";
import { DealTasks } from "./dealTasks";
import { AiFieldUpdates } from "@/components/aiFieldUpdates/aiFieldUpdates";
import { OpenChatButton } from "../chatDock/openChatButton";
import { DealAiInsight } from "./dealAiInsight";
import { DealItems } from "./dealItems";
import { DealScript } from "./dealScript";
import { DealOriginDetails } from "./dealOrigin";
import { useDealActions } from "../useDealActions";

type DealSheetProps = {
  dealId: string | null;
  onClose: () => void;
};

const statusVariant: Record<DealStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700",
  WON: "bg-green-50 text-green-700",
  LOST: "bg-red-50 text-red-700",
};

type DetailsValues = { title: string; value: string; ownerUserId: string; notes: string; custom: Record<string, string> };

const toDetailsValues = (deal: Deal, fields: CrmField[]): DetailsValues => ({
  title: deal.title,
  value: deal.value === null ? "" : String(deal.value),
  ownerUserId: deal.owner?.id ?? "",
  notes: deal.notes ?? "",
  custom: toCustomFieldsForm(fields, deal.customFields),
});

type BaseField = Exclude<keyof DetailsValues, "custom">;
const BASE_FIELDS: BaseField[] = ["title", "value", "ownerUserId", "notes"];

/**
 * O formulário guarda só o que a pessoa mexeu; o resto acompanha o servidor. Assim um refetch (tempo real, IA,
 * troca de etapa) não apaga o que foi digitado e os campos não tocados continuam atualizados.
 */
const DealDetailsForm: FC<{ deal: Deal; onDirtyChange: (dirty: boolean) => void }> = ({ deal, onDirtyChange }) => {
  const { client } = useClientContext();
  const { members, activeFields } = useCrmOptions();
  const actions = useDealActions();

  const server = toDetailsValues(deal, activeFields);
  const [edits, setEdits] = useState<Partial<Record<BaseField, string>>>({});
  // Só os campos editados vão para a API, para nada ser apagado se a lista de campos chegar depois do formulário
  const [customEdits, setCustomEdits] = useState<Record<string, string>>({});
  // Valores do servidor quando a edição começou, para avisar se alguém mudou o negócio no meio
  const [snapshot, setSnapshot] = useState<DetailsValues | null>(null);

  const title = edits.title ?? server.title;
  const value = edits.value ?? server.value;
  const ownerUserId = edits.ownerUserId ?? server.ownerUserId;
  const notes = edits.notes ?? server.notes;
  const customValues = { ...server.custom, ...customEdits };
  const editedFields = activeFields.filter((field) => field.id in customEdits);

  const isDirty =
    BASE_FIELDS.some((key) => edits[key] !== undefined && edits[key] !== server[key]) ||
    editedFields.some((field) => customEdits[field.id] !== server.custom[field.id]);
  const changedOnServer =
    isDirty &&
    !!snapshot &&
    (BASE_FIELDS.some((key) => snapshot[key] !== server[key]) ||
      activeFields.some((field) => (snapshot.custom[field.id] ?? "") !== (server.custom[field.id] ?? "")));

  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  });
  useEffect(() => {
    onDirtyChangeRef.current(isDirty);
  }, [isDirty]);
  useEffect(() => () => onDirtyChangeRef.current(false), []);

  const startEditing = () => setSnapshot((current) => current ?? server);
  const editField = (key: BaseField, next: string) => {
    startEditing();
    setEdits((current) => ({ ...current, [key]: next }));
  };
  const resetEdits = () => {
    setEdits({});
    setCustomEdits({});
    setSnapshot(null);
  };

  const parsedValue = value.trim() === "" ? null : Number(value.replace(",", "."));
  const isValueInvalid = parsedValue !== null && (Number.isNaN(parsedValue) || parsedValue < 0);

  const saveDetails = () => {
    if (!title.trim() || isValueInvalid) return;

    actions.updateDeal.mutate(
      {
        params: { clientId: client.id, dealId: deal.id },
        body: {
          title: title.trim(),
          value: parsedValue,
          notes: notes.trim() || null,
          ownerUserId: ownerUserId || null,
          ...(editedFields.length > 0 && { customFields: toCustomFieldsBody(editedFields, customEdits) }),
        },
      },
      {
        onSuccess: () => {
          resetEdits();
          toast.success("Negócio atualizado");
        },
      },
    );
  };

  return (
    <section className="space-y-3">
      {changedOnServer && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          <span>Atualizado por outra pessoa enquanto você editava.</span>
          <Button size="sm" variant="outline" onClick={resetEdits}>
            Recarregar
          </Button>
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="deal-title">Título</Label>
        <Input id="deal-title" value={title} onChange={(event) => editField("title", event.target.value)} maxLength={120} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-value">Valor (R$)</Label>
        <Input
          id="deal-value"
          inputMode="decimal"
          value={value}
          onChange={(event) => editField("value", event.target.value)}
          placeholder="0,00"
          aria-invalid={isValueInvalid}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="deal-owner">Responsável</Label>
        <select
          id="deal-owner"
          value={ownerUserId}
          onChange={(event) => editField("ownerUserId", event.target.value)}
          className={crmSelectClassName}
        >
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
        <p className="text-muted-foreground -mt-1 text-xs">
          Resumo fixo do negócio. Para guardar ligações e conversas, use "Registrar atividade" em Atividades.
        </p>
        <textarea
          id="deal-notes"
          value={notes}
          onChange={(event) => editField("notes", event.target.value)}
          maxLength={5000}
          className={crmTextareaClassName}
        />
      </div>
      {activeFields.map((field) => (
        <div key={field.id} className="grid gap-2">
          <Label htmlFor={`deal-field-${field.id}`}>{field.name}</Label>
          <CustomFieldInput
            id={`deal-field-${field.id}`}
            field={field}
            value={customValues[field.id] ?? ""}
            onChange={(value) => {
              startEditing();
              setCustomEdits((current) => ({ ...current, [field.id]: value }));
            }}
          />
        </div>
      ))}
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

  // Fechar a ficha com alterações não salvas pergunta antes
  const [isFormDirty, setIsFormDirty] = useState(false);
  const { guard, guardDialog } = useUnsavedChangesGuard(isFormDirty);
  const close = () => guard(onClose);

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

  const queryClient = useQueryClient();
  const [contactPhone, setContactPhone] = useState("");
  const linkContact = useMutation({
    mutationFn: crmService.linkDealContact,
    onError: requestErrorHandling,
    onSuccess: () => {
      setContactPhone("");
      queryClient.invalidateQueries({ queryKey: ["crm", "deals"] });
      queryClient.invalidateQueries({ queryKey: ["metaAds", "leads"] });
      toast.success("Telefone adicionado. O negócio agora tem contato no WhatsApp.");
    },
  });

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
    <Sheet open={!!dealId} onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="pr-6 break-words">{deal?.title ?? "Negócio"}</SheetTitle>
          <SheetDescription className="break-words">
            {!deal
              ? "Carregando..."
              : [
                  deal.contact
                    ? `${dealContactName(deal.contact)} · ${formatPhoneNumber(deal.contact.phoneNumber)}`
                    : deal.person?.name || "Sem telefone",
                  deal.person?.email,
                ]
                  .filter(Boolean)
                  .join(" · ")}
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
              {deal.person && can("contacts.view") && (
                <Button variant="ghost" size="sm" className={deal.contact ? undefined : "ml-auto"} asChild>
                  <Link to={`${baseUrl}/contacts/${deal.person.id}`}>
                    <UserRound className="h-3.5 w-3.5" />
                    Ver ficha
                  </Link>
                </Button>
              )}
              {deal.contact && (
                // Com a janela no rodapé, a ficha fecha para a conversa ficar visível
                <OpenChatButton contact={deal.contact} className="ml-auto" onOpened={close} />
              )}
            </div>

            {!deal.contact && (
              <form
                className="space-y-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 dark:border-amber-700/60 dark:bg-amber-950/30"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (contactPhone.trim())
                    linkContact.mutate({ params: { clientId: client.id, dealId: deal.id }, body: { phone: contactPhone.trim() } });
                }}
              >
                <p className="flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-300">
                  <PhoneOff className="h-4 w-4" />
                  Este negócio ainda não tem telefone
                </p>
                <p className="text-muted-foreground text-xs">
                  O lead chegou sem um telefone válido. Ao adicionar, o ZapMonitor liga o contato do WhatsApp ao negócio (ou cria um novo) e
                  libera a conversa e os fluxos da etapa.
                </p>
                <div className="flex gap-2">
                  <Input
                    type="tel"
                    placeholder="(11) 99999-8888"
                    aria-label="Telefone do contato"
                    value={contactPhone}
                    onChange={(event) => setContactPhone(event.target.value)}
                  />
                  <Button type="submit" disabled={!contactPhone.trim() || linkContact.isPending}>
                    Adicionar
                  </Button>
                </div>
              </form>
            )}

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

            {/* key: cada negócio aberto começa em "Detalhes" */}
            <Tabs key={deal.id} defaultValue="details" className="gap-4">
              <TabsList className="w-full">
                <TabsTrigger value="details">Detalhes</TabsTrigger>
                <TabsTrigger value="tasks">
                  Tarefas
                  {deal.openTaskCount > 0 && <span className="text-muted-foreground tabular-nums">({deal.openTaskCount})</span>}
                </TabsTrigger>
                <TabsTrigger value="history">
                  Atividades
                  {!!eventsQuery.data?.length && <span className="text-muted-foreground tabular-nums">({eventsQuery.data.length})</span>}
                </TabsTrigger>
              </TabsList>

              {/* forceMount: trocar de aba não perde o que foi digitado e não salvo */}
              <TabsContent value="details" forceMount className="space-y-6 data-[state=inactive]:hidden">
                {deal.origin && <DealOriginDetails origin={deal.origin} />}

                {can("offers.view") && <DealScript deal={deal} />}

                <DealAiInsight deal={deal} pipeline={pipeline} onMove={(stage) => actions.requestMove(deal, stage)} />

                <AiFieldUpdates
                  owner={{ dealId: deal.id }}
                  onAccepted={() => queryClient.invalidateQueries({ queryKey: ["crm", "deals"] })}
                />

                <DealDetailsForm key={deal.id} deal={deal} onDirtyChange={setIsFormDirty} />

                {can("offers.view") && (
                  <DealItems
                    key={deal.id}
                    deal={deal}
                    onSaved={() => queryClient.invalidateQueries({ queryKey: ["dealScript", client.id, deal.id] })}
                  />
                )}
              </TabsContent>

              <TabsContent value="tasks" forceMount className="data-[state=inactive]:hidden">
                <DealTasks deal={deal} />
              </TabsContent>

              <TabsContent value="history" forceMount className="data-[state=inactive]:hidden">
                <section className="space-y-4">
                  <h3 className="sr-only">Histórico</h3>
                  <DealActivityForm key={deal.id} deal={deal} />
                  {eventsQuery.isLoading && <LoadingState className="justify-start py-2" />}
                  {eventsQuery.isSuccess && eventsQuery.data.length === 0 && (
                    <p className="text-muted-foreground text-sm">Nada registrado ainda.</p>
                  )}
                  <ol className="space-y-3">
                    {eventsQuery.data?.map((event) => (
                      <li key={event.id} className="border-l-2 pl-3 text-sm">
                        <p>{describeEvent(event)}</p>
                        {eventDetail(event) && <p className="text-muted-foreground whitespace-pre-line">{eventDetail(event)}</p>}
                        <p className="text-muted-foreground text-xs">
                          {event.user?.name ?? "Fluxo automático"} · {format(new Date(event.createdAt), "PPp", { locale: ptBR })}
                        </p>
                      </li>
                    ))}
                  </ol>
                </section>
              </TabsContent>
            </Tabs>
          </div>
        )}
        {actions.dialogs}
        {guardDialog}
      </SheetContent>
    </Sheet>
  );
};
