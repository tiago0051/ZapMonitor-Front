import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { crmService } from "@/services/api/crmService";
import { emailCampaignService } from "@/services/api/emailCampaignService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { selectClassName } from "../audienceSources";
import { describeSendWindow, formatCount, isFutureSchedule, sendWindowError, toLocalInputValue } from "../broadcastUtils";
import { SendWindowFields } from "../components/sendWindowFields";
import { EmailAudienceStep } from "./emailAudienceStep";
import { emptyEmailAudience, summarizeEmailAudience, type EmailAudienceSources } from "./emailCampaignUtils";
import { EmailPreviewFrame } from "./emailPreviewFrame";

const STEPS = ["Mensagem", "Público", "Revisão"] as const;

export const EmailCampaignNew = () => {
  const { client, canUseCrm, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [senderId, setSenderId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [sources, setSources] = useState<EmailAudienceSources>(emptyEmailAudience);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendWindow, setSendWindow] = useState<BroadcastSendWindow | null>(null);
  const [capDays, setCapDays] = useState("");
  const [clickPipelineId, setClickPipelineId] = useState("");
  const [clickStageId, setClickStageId] = useState("");
  const [consent, setConsent] = useState(false);
  const [abEnabled, setAbEnabled] = useState(false);
  const [subjectB, setSubjectB] = useState("");
  const [abPercent, setAbPercent] = useState(20);
  const [abMetric, setAbMetric] = useState<EmailAbMetric>("OPEN");
  const [abWaitHours, setAbWaitHours] = useState(4);
  const [confirmSend, setConfirmSend] = useState(false);

  const optionsQuery = useQuery({
    queryKey: ["emailCampaigns", client.id, "options"],
    queryFn: () => emailCampaignService.options(client.id),
  });
  const senders = optionsQuery.data?.senders ?? [];
  const templates = optionsQuery.data?.templates ?? [];

  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });
  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active);
  const clickPipeline = pipelines.find((pipeline) => pipeline.id === clickPipelineId);

  const summary = useMemo(() => summarizeEmailAudience(sources), [sources]);
  const firstContactId = summary.ready.find((row) => row.contactId)?.contactId ?? undefined;

  const previewQuery = useQuery({
    queryKey: ["emailCampaigns", client.id, "preview", templateId, firstContactId],
    queryFn: () => emailCampaignService.preview(client.id, { templateId, contactId: firstContactId }),
    enabled: !!templateId,
  });

  const stepError = (() => {
    if (step === 0) {
      if (!name.trim()) return "Dê um nome para a campanha";
      if (!senderId) return "Escolha o remetente";
      if (!templateId) return "Escolha o modelo";
    }
    if (step === 1 && summary.ready.length === 0) return "Inclua pelo menos uma pessoa com e-mail válido";
    return null;
  })();

  const createMutation = useMutation({
    mutationFn: (action: "draft" | "now" | "schedule") =>
      emailCampaignService.create(client.id, {
        name: name.trim(),
        senderId,
        templateId,
        recipients: summary.ready,
        sendWindow,
        frequencyCapDays: capDays ? Number(capDays) : null,
        clickPipelineId: clickPipelineId || null,
        clickStageId: clickStageId || null,
        abTest: abEnabled ? { subjectB: subjectB.trim(), testPercent: abPercent, metric: abMetric, waitMinutes: abWaitHours * 60 } : null,
        consentConfirmed: consent,
        start: action === "now",
        scheduledAt: action === "schedule" ? new Date(scheduledAt).toISOString() : undefined,
      }),
    onError: requestErrorHandling,
    onSuccess: (campaign, action) => {
      queryClient.invalidateQueries({ queryKey: ["emailCampaigns", client.id] });
      const waiting = action === "now" && campaign.status === "SCHEDULED";
      toast.success(
        action === "draft" ? "Rascunho salvo" : action === "schedule" || waiting ? "Campanha agendada" : "Campanha iniciada",
        waiting ? { description: "Agora está fora da janela de envio; começa no próximo horário permitido." } : undefined,
      );
      navigate(`${baseUrl}/broadcasts/email/${campaign.id}`);
    },
  });

  const busy = createMutation.isPending;
  const scheduleDate = scheduledAt ? new Date(scheduledAt) : null;
  const scheduleError =
    when !== "schedule"
      ? null
      : !scheduledAt
        ? "Escolha a data e a hora"
        : !isFutureSchedule(scheduledAt)
          ? "Escolha um horário no futuro"
          : null;
  const capError = capDays && !(Number(capDays) >= 1 && Number(capDays) <= 90) ? "O limite vai de 1 a 90 dias" : null;
  const clickError = clickPipelineId && !clickStageId ? "Escolha a etapa do funil para quem clicar" : null;
  // Metade do teste com cada assunto; cada versão precisa de pelo menos 10 pessoas
  const abSize = Math.floor((summary.ready.length * abPercent) / 100 / 2) * 2;
  const abError = !abEnabled
    ? null
    : !subjectB.trim()
      ? "Escreva o assunto B"
      : abSize < 20
        ? `Com ${formatCount(summary.ready.length)} pessoas o teste fica pequeno: aumente a parte da lista ou tire o teste`
        : null;
  const settingsError =
    sendWindowError(sendWindow) ??
    capError ??
    clickError ??
    abError ??
    (!consent ? "Confirme que as pessoas aceitaram receber e-mails" : null);
  const template = templates.find((item) => item.id === templateId);
  const reviewError = settingsError ?? scheduleError;
  const sender = senders.find((item) => item.id === senderId);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${baseUrl}/broadcasts?canal=email`} aria-label="Voltar para as campanhas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Nova campanha de e-mail</h1>
          <p className="text-muted-foreground text-sm">Um modelo de e-mail enviado pelo domínio da empresa para uma lista de pessoas.</p>
        </div>
      </div>

      <ol className="flex flex-wrap gap-2 text-sm">
        {STEPS.map((label, index) => (
          <li key={label}>
            <button
              type="button"
              disabled={index > step || busy}
              onClick={() => setStep(index)}
              className={cn(
                "rounded-full border px-3 py-1",
                index === step && "border-primary bg-primary/10 font-medium",
                index > step && "text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>{STEPS[step]}</CardTitle>
            {step === 1 && (
              <CardDescription>
                Some quantas fontes quiser. E-mails repetidos entram uma vez só; descadastrados e e-mails que voltaram são tirados no envio.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {step === 0 && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="email-campaign-name">Nome da campanha</Label>
                  <Input
                    id="email-campaign-name"
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Oferta de novembro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email-campaign-sender">Remetente</Label>
                  <select
                    id="email-campaign-sender"
                    className={selectClassName}
                    value={senderId}
                    disabled={optionsQuery.isLoading}
                    onChange={(event) => setSenderId(event.target.value)}
                  >
                    <option value="">
                      {optionsQuery.isLoading ? "Carregando..." : senders.length ? "Selecione" : "Nenhum remetente verificado"}
                    </option>
                    {senders.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.fromName} &lt;{item.fromEmail}&gt;
                      </option>
                    ))}
                  </select>
                  {optionsQuery.isSuccess && !senders.length && (
                    <p className="text-muted-foreground text-xs">
                      Cadastre e verifique o domínio em Configurações › Envio de e-mail
                      {can("emailSettings.manage") ? "" : " (peça a quem administra a conta)"}.
                    </p>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email-campaign-template">Modelo</Label>
                  <select
                    id="email-campaign-template"
                    className={selectClassName}
                    value={templateId}
                    disabled={optionsQuery.isLoading}
                    onChange={(event) => setTemplateId(event.target.value)}
                  >
                    <option value="">{templates.length ? "Selecione" : "Nenhum modelo criado"}</option>
                    {templates.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                        {item.subject ? ` · ${item.subject}` : ""}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-xs">
                    O modelo é copiado para a campanha: editar o modelo depois não muda o que já foi montado.
                  </p>
                </div>
              </>
            )}

            {step === 1 && <EmailAudienceStep value={sources} onChange={setSources} />}

            {step === 2 && (
              <div className="grid gap-4">
                <dl className="grid grid-cols-3 gap-3">
                  {[
                    ["Vão receber", summary.ready.length],
                    ["Repetidos", summary.duplicates],
                    ["E-mails inválidos", summary.invalid],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg border p-3">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="text-xl font-semibold tabular-nums">{formatCount(Number(count))}</dd>
                    </div>
                  ))}
                </dl>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Quando enviar</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="email-campaign-when"
                        checked={when === "now"}
                        onChange={() => setWhen("now")}
                        disabled={busy}
                      />
                      Agora
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="email-campaign-when"
                        checked={when === "schedule"}
                        disabled={busy}
                        onChange={() => {
                          setWhen("schedule");
                          if (!scheduledAt) setScheduledAt(toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
                        }}
                      />
                      Agendar
                    </label>
                  </div>
                  {when === "schedule" && (
                    <div className="grid gap-1.5">
                      <Label htmlFor="email-campaign-scheduled-at" className="text-xs">
                        Data e hora de início
                      </Label>
                      <Input
                        id="email-campaign-scheduled-at"
                        type="datetime-local"
                        className="h-9 w-full min-w-0 sm:w-60"
                        value={scheduledAt}
                        min={toLocalInputValue(new Date())}
                        disabled={busy}
                        onChange={(event) => setScheduledAt(event.target.value)}
                      />
                    </div>
                  )}
                  <SendWindowFields value={sendWindow} onChange={setSendWindow} idPrefix="email-campaign-window" disabled={busy} />
                </div>

                {canUseCrm && (
                  <div className="grid gap-3 rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">Quem clicar</p>
                      <p className="text-muted-foreground text-xs">
                        O clique sempre entra no histórico do negócio da pessoa. Escolha um funil para criar o negócio de quem ainda não tem
                        um aberto nele (só para quem tem ficha).
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1.5">
                        <Label htmlFor="email-campaign-click-pipeline" className="text-xs">
                          Funil
                        </Label>
                        <select
                          id="email-campaign-click-pipeline"
                          className={selectClassName}
                          value={clickPipelineId}
                          disabled={busy}
                          onChange={(event) => {
                            setClickPipelineId(event.target.value);
                            setClickStageId("");
                          }}
                        >
                          <option value="">Não criar negócio</option>
                          {pipelines.map((pipeline) => (
                            <option key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {clickPipeline && (
                        <div className="grid gap-1.5">
                          <Label htmlFor="email-campaign-click-stage" className="text-xs">
                            Etapa
                          </Label>
                          <select
                            id="email-campaign-click-stage"
                            className={selectClassName}
                            value={clickStageId}
                            disabled={busy}
                            onChange={(event) => setClickStageId(event.target.value)}
                          >
                            <option value="">Selecione</option>
                            {clickPipeline.stages.map((stage) => (
                              <option key={stage.id} value={stage.id}>
                                {stage.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid gap-3 rounded-lg border p-3">
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      id="email-campaign-ab"
                      checked={abEnabled}
                      disabled={busy}
                      onCheckedChange={(checked) => setAbEnabled(checked === true)}
                    />
                    <span>
                      <span className="font-medium">Teste A/B de assunto</span>
                      <span className="text-muted-foreground block text-xs">
                        Uma parte da lista recebe o assunto A ou o B; depois da espera, o que tiver mais aberturas (ou cliques) vai para o
                        resto.
                      </span>
                    </span>
                  </label>
                  {abEnabled && (
                    <div className="grid gap-3 pl-6">
                      <p className="text-sm">
                        <span className="text-muted-foreground">Assunto A (do modelo): </span>
                        {template?.subject || "sem assunto"}
                      </p>
                      <div className="grid gap-1.5">
                        <Label htmlFor="email-campaign-subject-b" className="text-xs">
                          Assunto B
                        </Label>
                        <Input
                          id="email-campaign-subject-b"
                          value={subjectB}
                          maxLength={300}
                          disabled={busy}
                          placeholder="Ex.: {{contato.primeiro_nome}}, sua condição especial acaba hoje"
                          onChange={(event) => setSubjectB(event.target.value)}
                        />
                        <p className="text-muted-foreground text-xs">
                          Aceita as mesmas variáveis do modelo, como {"{{contato.primeiro_nome}}"}.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="email-campaign-ab-percent" className="text-xs">
                            Parte da lista no teste
                          </Label>
                          <select
                            id="email-campaign-ab-percent"
                            className={selectClassName}
                            value={abPercent}
                            disabled={busy}
                            onChange={(event) => setAbPercent(Number(event.target.value))}
                          >
                            {[10, 20, 30, 40, 50].map((value) => (
                              <option key={value} value={value}>
                                {value}%
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="email-campaign-ab-metric" className="text-xs">
                            Vence quem tiver mais
                          </Label>
                          <select
                            id="email-campaign-ab-metric"
                            className={selectClassName}
                            value={abMetric}
                            disabled={busy}
                            onChange={(event) => setAbMetric(event.target.value as EmailAbMetric)}
                          >
                            <option value="OPEN">Aberturas</option>
                            <option value="CLICK">Cliques</option>
                          </select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label htmlFor="email-campaign-ab-wait" className="text-xs">
                            Esperar o resultado
                          </Label>
                          <select
                            id="email-campaign-ab-wait"
                            className={selectClassName}
                            value={abWaitHours}
                            disabled={busy}
                            onChange={(event) => setAbWaitHours(Number(event.target.value))}
                          >
                            {[1, 2, 4, 8, 12, 24, 48].map((value) => (
                              <option key={value} value={value}>
                                {value} {value === 1 ? "hora" : "horas"}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {formatCount(abSize / 2)} recebem o A, {formatCount(abSize / 2)} recebem o B e{" "}
                        {formatCount(summary.ready.length - abSize)} recebem o vencedor.
                        {abMetric === "OPEN" && " Aberturas são aproximadas; com links no e-mail, cliques decidem melhor."}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Cuidados com o domínio</p>
                  <div className="grid gap-1.5">
                    <Label htmlFor="email-campaign-cap-days" className="text-xs">
                      Não enviar a quem recebeu outra campanha de e-mail nos últimos dias (opcional)
                    </Label>
                    <Input
                      id="email-campaign-cap-days"
                      type="number"
                      min={1}
                      max={90}
                      className="w-32"
                      value={capDays}
                      disabled={busy}
                      placeholder="Ex.: 7"
                      onChange={(event) => setCapDays(event.target.value)}
                    />
                  </div>
                  <label className="flex items-start gap-2 text-sm">
                    <Checkbox
                      id="email-campaign-consent"
                      checked={consent}
                      disabled={busy}
                      onCheckedChange={(checked) => setConsent(checked === true)}
                    />
                    <span>
                      As pessoas desta lista aceitaram receber e-mails desta empresa ou já são clientes.
                      <span className="text-muted-foreground block text-xs">
                        E-mail para quem não pediu vira spam e rejeição. Com mais de 5% de e-mails que voltam ou 0,1% de marcações como spam
                        a campanha pausa sozinha, para proteger o domínio. Todo e-mail sai com o link de descadastro.
                      </span>
                    </span>
                  </label>
                </div>

                {confirmSend ? (
                  <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm">
                      {when === "schedule" ? "Agendar" : "Enviar agora"} para {formatCount(summary.ready.length)}{" "}
                      {summary.ready.length === 1 ? "pessoa" : "pessoas"} como {sender?.fromEmail}
                      {when === "schedule" && scheduleDate && `, começando em ${format(scheduleDate, "dd/MM/yyyy 'às' HH:mm")}`}
                      {sendWindow && ` (${describeSendWindow(sendWindow).toLowerCase()})`}
                      {abEnabled && `, com teste A/B em ${abPercent}% da lista e o vencedor depois de ${abWaitHours}h`}? Dá para pausar
                      depois, mas o que já saiu não volta.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={busy} onClick={() => createMutation.mutate(when)}>
                        {busy ? "Salvando..." : when === "schedule" ? "Confirmar agendamento" : "Confirmar envio"}
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={() => setConfirmSend(false)}>
                        Voltar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <Button disabled={busy || !summary.ready.length || !!reviewError} onClick={() => setConfirmSend(true)}>
                      {when === "schedule" ? "Agendar" : "Enviar agora"}
                    </Button>
                    <Button
                      variant="outline"
                      disabled={busy || !summary.ready.length || !!settingsError}
                      onClick={() => createMutation.mutate("draft")}
                    >
                      Salvar rascunho
                    </Button>
                    {reviewError && <p className="text-muted-foreground text-xs">{reviewError}</p>}
                  </div>
                )}
              </div>
            )}

            {step < 2 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                <p className="text-muted-foreground text-sm">
                  {stepError ?? (step >= 1 ? `${formatCount(summary.ready.length)} prontas para receber` : "")}
                </p>
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="ghost" onClick={() => setStep(step - 1)}>
                      Voltar
                    </Button>
                  )}
                  <Button disabled={!!stepError} onClick={() => setStep(step + 1)}>
                    Continuar
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {templateId && (
          <EmailPreviewFrame
            className="lg:sticky lg:top-4"
            subject={previewQuery.data?.subject}
            html={previewQuery.data?.html}
            isLoading={previewQuery.isLoading}
            note={firstContactId ? "Prévia com os dados da primeira ficha da lista." : "Prévia com os valores padrão das variáveis."}
          />
        )}
      </div>
    </div>
  );
};
