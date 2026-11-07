import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { emailCampaignService } from "@/services/api/emailCampaignService";
import { emailSequenceService } from "@/services/api/emailSequenceService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { selectClassName } from "../audienceSources";
import { describeSendWindow, formatCount, sendWindowError } from "../broadcastUtils";
import { SendWindowFields } from "../components/sendWindowFields";
import { delayUnits, describeDelay, enrollmentStatusInfo, splitDelay, stopReasonLabel, type DelayUnit } from "./sequenceUtils";

const MAX_STEPS = 10;
const MAX_DELAY_MINUTES = 90 * 1440;

type StepDraft = { key: string; amount: string; unit: DelayUnit; templateId: string };

const toDraft = (step: EmailSequenceStep, index: number): StepDraft => {
  const { amount, unit } = splitDelay(step.delayMinutes);
  return { key: `${index}-${Math.random()}`, amount: String(amount), unit, templateId: step.templateId ?? "" };
};

const draftMinutes = (step: StepDraft) => Number(step.amount) * (delayUnits.find((item) => item.value === step.unit)?.minutes ?? 1);

const newStep = (first: boolean): StepDraft => ({
  key: String(Math.random()),
  amount: first ? "0" : "2",
  unit: first ? "minutes" : "days",
  templateId: "",
});

const emptySequence: EmailSequence = {
  id: "",
  name: "",
  senderId: null,
  active: false,
  stopOnWhatsappReply: true,
  stopOnDealWon: true,
  sendWindow: null,
  steps: [{ delayMinutes: 0, templateId: null }],
  enrollments: { active: 0, completed: 0, stopped: 0 },
  createdAt: "",
  updatedAt: "",
};

/** Criar ou editar a sequência; com ela salva, mostra quem está nela. */
export const EmailSequenceEditor = () => {
  const { sequenceId } = useParams<{ sequenceId: string }>();
  const { client } = useClientContext();
  const isNew = !sequenceId;

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["emailSequences", client.id, "detail", sequenceId],
    queryFn: () => emailSequenceService.findOne(client.id, sequenceId!),
    enabled: !isNew,
  });

  if (!isNew && query.isLoading) return <LoadingState label="Carregando a sequência..." />;
  if (!isNew && (query.isError || !query.data))
    return <ErrorState message="Não foi possível abrir a sequência." onRetry={() => query.refetch()} isRetrying={query.isFetching} />;

  const sequence = isNew ? emptySequence : query.data!;
  return <SequenceForm key={`${sequence.id}-${sequence.updatedAt}-${sequence.active}`} sequence={sequence} isNew={isNew} />;
};

const SequenceForm: FC<{ sequence: EmailSequence; isNew: boolean }> = ({ sequence, isNew }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const canEdit = can("broadcasts.send");

  const [name, setName] = useState(sequence.name);
  const [senderId, setSenderId] = useState(sequence.senderId ?? "");
  const [stopOnWhatsappReply, setStopOnWhatsappReply] = useState(sequence.stopOnWhatsappReply);
  const [stopOnDealWon, setStopOnDealWon] = useState(sequence.stopOnDealWon);
  const [sendWindow, setSendWindow] = useState<BroadcastSendWindow | null>(sequence.sendWindow);
  const [steps, setSteps] = useState<StepDraft[]>(sequence.steps.map(toDraft));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ["emailCampaigns", client.id, "options"],
    queryFn: () => emailCampaignService.options(client.id),
    enabled: canEdit,
  });
  const senders = optionsQuery.data?.senders ?? [];
  const templates = optionsQuery.data?.templates ?? [];

  const body = (): EmailSequenceInput => ({
    name: name.trim(),
    senderId: senderId || null,
    stopOnWhatsappReply,
    stopOnDealWon,
    sendWindow,
    steps: steps.map((step) => ({ delayMinutes: draftMinutes(step), templateId: step.templateId || null })),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["emailSequences", client.id] });

  const save = useMutation({
    mutationFn: () =>
      isNew ? emailSequenceService.create(client.id, body()) : emailSequenceService.update(client.id, sequence.id, body()),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      refresh();
      toast.success("Sequência salva");
      if (isNew) navigate(`${baseUrl}/broadcasts/sequences/${saved.id}`, { replace: true });
    },
  });
  const toggle = useMutation({
    mutationFn: async () => {
      // Liga já com o que está na tela
      if (!sequence.active && dirty) await emailSequenceService.update(client.id, sequence.id, body());
      return emailSequenceService.setActive(client.id, sequence.id, !sequence.active);
    },
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      refresh();
      toast.success(saved.active ? "Sequência ligada" : "Sequência desligada; quem está nela espera até ligar de novo");
    },
  });
  const remove = useMutation({
    mutationFn: () => emailSequenceService.remove(client.id, sequence.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Sequência excluída");
      navigate(`${baseUrl}/broadcasts?canal=sequencias`);
    },
  });

  const dirty =
    JSON.stringify(body()) !==
    JSON.stringify({
      name: sequence.name,
      senderId: sequence.senderId,
      stopOnWhatsappReply: sequence.stopOnWhatsappReply,
      stopOnDealWon: sequence.stopOnDealWon,
      sendWindow: sequence.sendWindow,
      steps: sequence.steps,
    });

  const stepError = steps
    .map((step, index) => {
      const minutes = draftMinutes(step);
      if (step.amount === "" || !Number.isInteger(minutes) || minutes < 0 || minutes > MAX_DELAY_MINUTES)
        return `A espera do e-mail ${index + 1} vai de 0 a 90 dias`;
      return null;
    })
    .find(Boolean);
  const formError = !name.trim() ? "Dê um nome para a sequência" : (stepError ?? sendWindowError(sendWindow));
  const activationError = !senderId
    ? "Escolha o remetente para ligar"
    : steps.some((step) => !step.templateId)
      ? "Escolha o modelo de todos os e-mails para ligar"
      : null;
  const busy = save.isPending || toggle.isPending || remove.isPending;
  const disabled = !canEdit || busy;

  const updateStep = (index: number, changes: Partial<StepDraft>) =>
    setSteps(steps.map((step, position) => (position === index ? { ...step, ...changes } : step)));
  const moveStep = (index: number, offset: number) => {
    const next = [...steps];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    setSteps(next);
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`${baseUrl}/broadcasts?canal=sequencias`} aria-label="Voltar para as sequências">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold">{isNew ? "Nova sequência" : sequence.name}</h1>
              {!isNew && (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-xs font-medium",
                    sequence.active
                      ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {sequence.active ? "Ligada" : "Desligada"}
                </span>
              )}
            </div>
            <p className="text-muted-foreground text-sm">Cada pessoa recebe os e-mails no ritmo dela, a partir de quando entrou.</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={disabled || !!formError || (!isNew && !dirty)} onClick={() => save.mutate()}>
              {isNew ? "Criar sequência" : "Salvar"}
            </Button>
            {!isNew && (
              <Button
                variant={sequence.active ? "outline" : "default"}
                disabled={disabled || (!sequence.active && (!!formError || !!activationError))}
                title={!sequence.active ? (formError ?? activationError ?? undefined) : undefined}
                onClick={() => toggle.mutate()}
              >
                {sequence.active ? "Desligar" : "Ligar"}
              </Button>
            )}
            {!isNew && !sequence.active && (
              <Button variant="ghost" disabled={disabled} onClick={() => setConfirmDelete(true)}>
                Excluir
              </Button>
            )}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between dark:border-amber-900 dark:bg-amber-950/30">
          <p className="text-sm">Excluir a sequência e o histórico de quem passou por ela? Os e-mails já enviados continuam na ficha.</p>
          <div className="flex gap-2">
            <Button variant="destructive" disabled={busy} onClick={() => remove.mutate()}>
              Excluir
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirmDelete(false)}>
              Voltar
            </Button>
          </div>
        </div>
      )}

      {(formError || (!sequence.active && activationError)) && canEdit && (
        <p className="text-muted-foreground text-sm">{formError ?? activationError}</p>
      )}

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>E-mails</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="sequence-name">Nome</Label>
              <Input
                id="sequence-name"
                value={name}
                maxLength={120}
                disabled={disabled}
                placeholder="Ex.: Boas-vindas de novos leads"
                onChange={(event) => setName(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sequence-sender">Remetente</Label>
              <select
                id="sequence-sender"
                className={selectClassName}
                value={senderId}
                disabled={disabled}
                onChange={(event) => setSenderId(event.target.value)}
              >
                <option value="">{senders.length ? "Selecione" : "Nenhum remetente verificado"}</option>
                {senders.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.fromName} &lt;{item.fromEmail}&gt;
                  </option>
                ))}
                {senderId && !senders.some((item) => item.id === senderId) && <option value={senderId}>Remetente atual</option>}
              </select>
            </div>

            <ol className="grid gap-3">
              {steps.map((step, index) => (
                <li key={step.key} className="grid gap-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium">E-mail {index + 1}</p>
                    {canEdit && (
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Subir o e-mail ${index + 1}`}
                          disabled={disabled || index === 0}
                          onClick={() => moveStep(index, -1)}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-label={`Descer o e-mail ${index + 1}`}
                          disabled={disabled || index === steps.length - 1}
                          onClick={() => moveStep(index, 1)}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground h-7 w-7"
                          aria-label={`Tirar o e-mail ${index + 1}`}
                          disabled={disabled || steps.length === 1}
                          onClick={() => setSteps(steps.filter((_, position) => position !== index))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="grid gap-1.5">
                      <Label htmlFor={`step-${index}-amount`} className="text-xs">
                        Esperar
                      </Label>
                      <Input
                        id={`step-${index}-amount`}
                        type="number"
                        min={0}
                        className="w-24"
                        value={step.amount}
                        disabled={disabled}
                        onChange={(event) => updateStep(index, { amount: event.target.value })}
                      />
                    </div>
                    <select
                      aria-label={`Unidade da espera do e-mail ${index + 1}`}
                      className={cn(selectClassName, "w-32")}
                      value={step.unit}
                      disabled={disabled}
                      onChange={(event) => updateStep(index, { unit: event.target.value as DelayUnit })}
                    >
                      {delayUnits.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-muted-foreground pb-2 text-xs">{index === 0 ? "depois de entrar" : "depois do anterior"}</p>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor={`step-${index}-template`} className="text-xs">
                      Modelo
                    </Label>
                    <select
                      id={`step-${index}-template`}
                      className={selectClassName}
                      value={step.templateId}
                      disabled={disabled}
                      onChange={(event) => updateStep(index, { templateId: event.target.value })}
                    >
                      <option value="">{templates.length ? "Selecione" : "Crie um modelo em E-mails › Modelos"}</option>
                      {templates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                      {step.templateId && !templates.some((item) => item.id === step.templateId) && (
                        <option value={step.templateId}>Modelo atual</option>
                      )}
                    </select>
                  </div>
                </li>
              ))}
            </ol>
            {canEdit && steps.length < MAX_STEPS && (
              <Button
                variant="outline"
                className="justify-self-start"
                disabled={disabled}
                onClick={() => setSteps([...steps, newStep(false)])}
              >
                <Plus className="mr-2 h-4 w-4" />
                Mais um e-mail
              </Button>
            )}
            <p className="text-muted-foreground text-xs">
              O modelo é lido na hora de cada envio, com os dados da ficha e do negócio aberto da pessoa. Mudar a sequência ligada vale para
              os próximos e-mails de quem já está nela.
            </p>
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Regras</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-3">
                <p className="text-sm font-medium">A pessoa sai da sequência quando</p>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={stopOnWhatsappReply}
                    disabled={disabled}
                    onCheckedChange={(checked) => setStopOnWhatsappReply(checked === true)}
                  />
                  Manda mensagem no WhatsApp
                </label>
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox checked={stopOnDealWon} disabled={disabled} onCheckedChange={(checked) => setStopOnDealWon(checked === true)} />
                  Ganha um negócio no CRM
                </label>
                <p className="text-muted-foreground text-xs">Quem se descadastra ou tem o e-mail devolvido sai sempre.</p>
              </div>
              <SendWindowFields value={sendWindow} onChange={setSendWindow} idPrefix="sequence-window" disabled={disabled} />
              {!canEdit && (
                <p className="text-muted-foreground text-xs">
                  {steps.map((step, index) => describeDelay(draftMinutes(step), index === 0)).join(" · ")}
                  {sendWindow && ` · ${describeSendWindow(sendWindow)}`}
                </p>
              )}
            </CardContent>
          </Card>
          {!isNew && <SequenceEnrollments sequence={sequence} />}
        </div>
      </div>
    </div>
  );
};

const TAKE = 30;

const statusFilters: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "ACTIVE", label: "Em andamento" },
  { value: "COMPLETED", label: "Terminaram" },
  { value: "STOPPED", label: "Saíram" },
];

const SequenceEnrollments: FC<{ sequence: EmailSequence }> = ({ sequence }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["emailSequences", client.id, "enrollments", sequence.id, status, page],
    queryFn: () =>
      emailSequenceService.findEnrollments(client.id, { sequenceId: sequence.id, status: status || undefined, page, take: TAKE }),
  });
  const stop = useMutation({
    mutationFn: (id: string) => emailSequenceService.stopEnrollment(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["emailSequences", client.id] });
      toast.success("Tirada da sequência");
    },
  });

  const items = query.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / TAKE));
  const total = sequence.steps.length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pessoas</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3">
        <dl className="grid grid-cols-3 gap-2 text-sm tabular-nums">
          {[
            ["Em andamento", sequence.enrollments.active],
            ["Terminaram", sequence.enrollments.completed],
            ["Saíram", sequence.enrollments.stopped],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border p-2">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="text-lg font-semibold">{formatCount(Number(value))}</dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap gap-1">
          {statusFilters.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={status === filter.value ? "secondary" : "ghost"}
              aria-pressed={status === filter.value}
              onClick={() => {
                setStatus(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </Button>
          ))}
        </div>
        {query.isLoading && <LoadingState label="Carregando..." />}
        {query.isSuccess && items.length === 0 && (
          <EmptyState
            title="Ninguém aqui"
            description='Coloque pessoas pela ficha do contato ou com o nó "Sequência de e-mails" de um fluxo.'
          />
        )}
        {items.length > 0 && (
          <ul className="divide-y rounded-lg border">
            {items.map((item) => {
              const info = enrollmentStatusInfo[item.status];
              return (
                <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link to={`${baseUrl}/contacts/${item.contactId}`} className="font-medium hover:underline">
                      {item.contactName || "Sem nome"}
                    </Link>
                    <p className="text-muted-foreground text-xs">
                      {Math.min(item.stepIndex, total)} de {total} e-mails
                      {item.status === "ACTIVE" && item.nextRunAt && ` · próximo em ${format(new Date(item.nextRunAt), "dd/MM HH:mm")}`}
                      {item.status === "STOPPED" && item.stoppedReason && ` · ${stopReasonLabel[item.stoppedReason] ?? item.stoppedReason}`}
                      {item.source === "FLOW" ? " · pelo fluxo" : ""}
                    </p>
                  </div>
                  <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", info.className)}>{info.label}</span>
                  {can("broadcasts.send") && item.status === "ACTIVE" && (
                    <Button variant="ghost" size="sm" disabled={stop.isPending} onClick={() => stop.mutate(item.id)}>
                      Tirar
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-muted-foreground tabular-nums">
              {page} de {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
