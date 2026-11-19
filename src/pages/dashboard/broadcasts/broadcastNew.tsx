import { DisabledReason } from "@/components/disabled-reason";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { TemplatePreview } from "@/components/whatsappTemplate/templatePreview";
import {
  buildTemplateSendBody,
  headerFileAccept,
  headerFileLabel,
  headerFileType,
  templateCategoryLabel,
  templateStatusInfo,
} from "@/components/whatsappTemplate/templateUtils";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { broadcastService } from "@/services/api/broadcastService";
import { crmService } from "@/services/api/crmService";
import { templateService } from "@/services/api/templateService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling, requestErrorMessage } from "@/utils/request";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { segmentRulesError } from "@/components/segment/segmentUtils";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import {
  describeSendWindow,
  estimateCostUsd,
  focusPendingField,
  isFutureSchedule,
  formatCount,
  formatUsd,
  RECIPIENTS_PER_REQUEST,
  sendWindowError,
  summarizeAudience,
  toLocalInputValue,
  type VariableMapping,
} from "./broadcastUtils";
import { MobilePreviewSheet } from "./components/mobilePreviewSheet";
import { SendWindowFields } from "./components/sendWindowFields";
import { ReplySettingsFields } from "./components/replySettingsFields";
import { Checkbox } from "@/components/ui/checkbox";
import {
  allAudienceRows,
  defaultMapping,
  emptyAudienceSources,
  emptyReply,
  selectClassName,
  type AudienceSources,
} from "./audienceSources";
import { AudienceStep } from "./components/audienceStep";
import { VariablesStep } from "./components/variablesStep";
import { formatConfigurationPhoneNumber, isWhatsappWeb, WHATSAPP_WEB_TEMPLATE_HINT } from "@/utils/whatsappConfiguration";

const STEPS = ["Mensagem", "Público", "Variáveis", "Revisão"] as const;

// Erro depois que a campanha já existe como rascunho (o back recusou iniciar/agendar)
class DraftKeptError extends Error {
  constructor(
    readonly broadcastId: string,
    readonly cause: unknown,
  ) {
    super("Rascunho mantido");
  }
}

export const BroadcastNew = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  // O plano do mês abre já com o nome da ação (?name=)
  const [searchParams] = useSearchParams();
  const [name, setName] = useState(() => searchParams.get("name")?.substring(0, 191) ?? "");
  const [configurationId, setConfigurationId] = useState("");
  const [template, setTemplate] = useState<WhatsappTemplate | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [sources, setSources] = useState<AudienceSources>(emptyAudienceSources);
  const [mapping, setMapping] = useState<Record<string, VariableMapping>>({});
  const [testPhone, setTestPhone] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [when, setWhen] = useState<"now" | "schedule">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sendWindow, setSendWindow] = useState<BroadcastSendWindow | null>(null);
  const [reply, setReply] = useState<BroadcastReply>(emptyReply);
  const [capDays, setCapDays] = useState("");
  const [consent, setConsent] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
  });
  const enabledConfigurations = (configurationsQuery.data?.items ?? []).filter((configuration) => configuration.enabled);
  // Campanha usa modelos da Meta, que só a API oficial envia
  const configurations = enabledConfigurations.filter((configuration) => !isWhatsappWeb(configuration));
  const whatsappWebConfigurations = enabledConfigurations.filter(isWhatsappWeb);

  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", client.id, configurationId],
    queryFn: () => templateService.findAll({ params: { clientId: client.id }, queries: { configurationId } }),
    enabled: !!configurationId,
  });
  const templates = (templatesQuery.data ?? []).filter((item) => item.synced);

  const crmFieldsQuery = useQuery({
    queryKey: ["crm", "fields", client.id],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: client.id } }),
    enabled: !!sources.segment,
  });

  const parameters = useMemo(() => template?.parameters ?? [], [template]);
  const rows = useMemo(() => allAudienceRows(sources), [sources]);
  const summary = useMemo(() => summarizeAudience(rows, parameters, mapping), [rows, parameters, mapping]);
  const fileType = headerFileType(template);
  const capEnabled = template?.category === "MARKETING";
  const segment = sources.segment;
  const segmentError = segment ? segmentRulesError(segment.rules) : null;

  // Revisão no servidor: quem do segmento entra, repetidos com a planilha e quem fica de fora (descadastro, frequência)
  const localPhones = useMemo(() => summary.ready.map(({ row }) => row.phoneNumber), [summary]);
  const phonesKey = useMemo(() => {
    let hash = 0;
    for (const phone of localPhones) for (let index = 0; index < phone.length; index++) hash = (hash * 31 + phone.charCodeAt(index)) | 0;
    return `${localPhones.length}:${hash}`;
  }, [localPhones]);
  const [previewInput] = useDebounceValue(
    { segmentRules: segment && !segmentError ? segment.rules : null, mapping, capDays: capEnabled && capDays ? Number(capDays) : null },
    500,
    // Objeto novo a cada render: compara pelo conteúdo para não reagendar sem fim
    { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) },
  );
  const previewQuery = useQuery({
    queryKey: ["broadcasts", client.id, "audiencePreview", template?.id, previewInput, phonesKey],
    queryFn: () =>
      broadcastService.previewAudience(client.id, {
        templateId: template!.id,
        segment: previewInput.segmentRules ? { rules: previewInput.segmentRules, mapping: previewInput.mapping } : undefined,
        phones: localPhones,
        frequencyCapDays:
          previewInput.capDays && previewInput.capDays >= 1 && previewInput.capDays <= 90 ? previewInput.capDays : undefined,
      }),
    enabled: step >= 2 && !!template && (!!previewInput.segmentRules || localPhones.length > 0),
    placeholderData: keepPreviousData,
  });
  const preview = previewQuery.data;
  const segmentReady = segment ? (preview?.segment?.ready ?? null) : 0;
  // Prontas para receber antes das regras do envio (descadastro e frequência); nulo enquanto o segmento é contado
  const readyCount = segmentReady === null ? null : segmentReady + summary.ready.length;
  const willReceive = preview?.willReceive ?? summary.ready.length;
  const sample = preview?.segment?.sample
    ? { name: preview.segment.sample.name || preview.segment.sample.phoneNumber, variables: preview.segment.sample.variables }
    : summary.ready[0]
      ? { name: summary.ready[0].row.name || summary.ready[0].row.phoneNumber, variables: summary.ready[0].variables }
      : null;

  const selectTemplate = (templateId: string) => {
    const selected = templates.find((item) => item.id === templateId) ?? null;
    setTemplate(selected);
    setHeaderFile(null);
    setMapping(defaultMapping(selected?.parameters ?? []));
  };

  const stepError = (() => {
    if (step === 0) {
      if (!name.trim()) return "Dê um nome para a campanha";
      if (!configurationId) return "Escolha o número de envio";
      if (!template) return "Escolha o modelo";
      if (!template.sendable) return template.unavailableReason ?? "Este modelo não pode ser enviado";
      if (fileType && !headerFile) return `Escolha o arquivo: ${headerFileLabel[fileType].toLowerCase()}`;
    }
    if (step === 1 && segmentError) return segmentError;
    if (step === 1 && rows.length === 0 && !segment) return "Inclua pelo menos uma pessoa";
    if (step === 2 && readyCount === null)
      return previewQuery.isError ? "Não foi possível contar o segmento" : "Contando as pessoas do segmento...";
    if (step === 2 && readyCount === 0) return "Nenhuma pessoa com telefone e todas as variáveis preenchidas";
    return null;
  })();
  // Campo que resolve o bloqueio da etapa, para levar a pessoa até ele ao tocar em "Continuar"
  const stepErrorField = (() => {
    if (step !== 0 || !stepError) return null;
    if (!name.trim()) return "broadcast-name";
    if (!configurationId) return "broadcast-configuration";
    if (!template || !template.sendable) return "broadcast-template";
    return "broadcast-header-file";
  })();

  const headerFileId = async () =>
    (await buildTemplateSendBody(client.id, configurationId, { template, variables: {}, headerFile })).headerFileId;

  const testMutation = useMutation({
    mutationFn: async () =>
      broadcastService.sendTest(client.id, {
        configurationId,
        templateId: template!.id,
        phoneNumber: testPhone,
        variables: sample?.variables,
        headerFileId: await headerFileId(),
      }),
    onError: requestErrorHandling,
    onSuccess: () => toast.success("Teste enviado", { description: "Confira no WhatsApp do número de teste." }),
  });

  // Campanha já criada nesta tela cujo envio da lista falhou no meio: nova tentativa continua dela em vez de criar outra
  const pendingUpload = useRef<{ id: string; signature: string; uploadedChunks: number } | null>(null);

  const createMutation = useMutation({
    mutationFn: async (action: "draft" | "now" | "schedule") => {
      const recipients: BroadcastRecipientInput[] = summary.ready.map(({ row, variables }) => ({
        phoneNumber: row.phoneNumber,
        name: row.name ?? undefined,
        variables: parameters.length ? variables : undefined,
      }));
      const chunks: BroadcastRecipientInput[][] = [];
      for (let index = 0; index < recipients.length; index += RECIPIENTS_PER_REQUEST)
        chunks.push(recipients.slice(index, index + RECIPIENTS_PER_REQUEST));

      setUploadProgress(0);
      const fileId = await headerFileId();
      const body = {
        name: name.trim(),
        configurationId,
        templateId: template!.id,
        headerFileId: fileId,
        sendWindow: sendWindow ?? undefined,
        reply: Object.values(reply).some(Boolean) ? reply : undefined,
        frequencyCapDays: capEnabled && capDays ? Number(capDays) : undefined,
        consentConfirmed: consent,
        segment: segment ? { rules: segment.rules, mapping } : undefined,
      };
      // O arquivo do cabeçalho muda a cada envio; fica fora da comparação
      const signature = JSON.stringify({ ...body, headerFileId: undefined, recipients });
      const resumable = pendingUpload.current?.signature === signature ? pendingUpload.current : null;
      pendingUpload.current = null;

      // Cria em rascunho, completa em lotes e só então inicia, para o envio não começar pela metade da lista
      let broadcast: Broadcast | null = null;
      let broadcastId = resumable?.id;
      let uploadedChunks = resumable?.uploadedChunks ?? 0;
      if (!broadcastId) {
        broadcast = await broadcastService.create(client.id, { ...body, recipients: chunks[0] ?? [] });
        broadcastId = broadcast.id;
        uploadedChunks = 1;
      }
      for (let index = uploadedChunks; index < chunks.length; index++) {
        try {
          await broadcastService.addRecipients(client.id, broadcastId, chunks[index]);
        } catch (error) {
          pendingUpload.current = { id: broadcastId, signature, uploadedChunks: index };
          throw error;
        }
        setUploadProgress(Math.round(((index + 1) / chunks.length) * 100));
      }
      setUploadProgress(100);
      try {
        if (action === "now") broadcast = await broadcastService.action(client.id, broadcastId, "start");
        if (action === "schedule") broadcast = await broadcastService.schedule(client.id, broadcastId, new Date(scheduledAt).toISOString());
        if (!broadcast) broadcast = await broadcastService.findOne(client.id, broadcastId);
      } catch (error) {
        // A lista já está completa no rascunho: leva até ele em vez de deixar um novo clique criar outra campanha
        throw new DraftKeptError(broadcastId, error);
      }
      return broadcast;
    },
    onError: (error) => {
      setUploadProgress(null);
      if (error instanceof DraftKeptError) {
        queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id] });
        toast.error("A campanha foi salva como rascunho, mas não começou", {
          description: `${requestErrorMessage(error.cause)} — depois de resolver, use "Iniciar envio" no rascunho.`,
          duration: 10000,
        });
        navigate(`${baseUrl}/broadcasts/${error.broadcastId}`);
        return;
      }
      requestErrorHandling(error);
    },
    onSuccess: (broadcast, action) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id] });
      const waiting = action === "now" && broadcast.status === "SCHEDULED";
      toast.success(
        action === "draft" ? "Rascunho salvo" : action === "schedule" || waiting ? "Campanha agendada" : "Campanha iniciada",
        waiting ? { description: "Agora está fora da janela de envio; começa no próximo horário permitido." } : undefined,
      );
      navigate(`${baseUrl}/broadcasts/${broadcast.id}`);
    },
  });

  const estimate = estimateCostUsd(template?.category ?? null, willReceive);
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
  // Lista vinda de fora do sistema pede a confirmação de que as pessoas aceitaram receber
  const needsConsent = !!sources.csv || sources.pasted.trim().length > 0;
  const capError = capEnabled && capDays && !(Number(capDays) >= 1 && Number(capDays) <= 90) ? "O limite vai de 1 a 90 dias" : null;
  const settingsError = sendWindowError(sendWindow) ?? capError ?? (needsConsent && !consent ? "Confirme o consentimento da lista" : null);
  const reviewError = settingsError ?? scheduleError;
  const reviewErrorField = sendWindowError(sendWindow)
    ? "broadcast-window-start"
    : capError
      ? "broadcast-cap-days"
      : needsConsent && !consent
        ? "broadcast-consent"
        : scheduleError
          ? "broadcast-scheduled-at"
          : null;

  const previewNote = `Prévia${sample ? ` para ${sample.name}` : ""}`;
  const previewContent = template && (
    <TemplatePreview template={template} variables={sample?.variables} headerFileName={headerFile?.name} />
  );
  const leftOut = [
    ["Descadastrados", preview?.optedOut ?? 0],
    ["Receberam marketing há pouco", preview?.frequencyCap ?? 0],
    [
      "Sem número válido",
      summary.invalid + (preview?.invalid ?? 0) + (preview?.segment ? preview.segment.invalid + preview.segment.noPhone : 0),
    ],
    ["Sem variável preenchida", summary.missingVariables + (preview?.segment?.missingVariables ?? 0)],
    ["Repetidos", summary.duplicates + (preview?.duplicates ?? 0)],
  ] as const;
  const leftOutTotal = leftOut.reduce((sum, [, value]) => sum + value, 0);

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${baseUrl}/broadcasts`} aria-label="Voltar para os disparos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Novo disparo pelo WhatsApp</h1>
          <p className="text-muted-foreground text-sm">Disparo de um modelo aprovado pela Meta para uma lista de pessoas.</p>
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
                index < step && "text-foreground",
                index > step && "text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </button>
          </li>
        ))}
      </ol>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle>{STEPS[step]}</CardTitle>
              {previewContent && <MobilePreviewSheet description={previewNote}>{previewContent}</MobilePreviewSheet>}
            </div>
            {step === 1 && (
              <CardDescription>
                Use um segmento dos contatos e, se quiser, some uma planilha ou lista. Números repetidos entram uma vez só.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="grid gap-4">
            {step === 0 && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="broadcast-name">Nome da campanha</Label>
                  <Input
                    id="broadcast-name"
                    value={name}
                    maxLength={120}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Ex.: Oferta de novembro"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="broadcast-configuration">Enviar pelo número</Label>
                  <select
                    id="broadcast-configuration"
                    className={selectClassName}
                    value={configurationId}
                    onChange={(event) => {
                      setConfigurationId(event.target.value);
                      selectTemplate("");
                    }}
                  >
                    <option value="">Selecione</option>
                    {configurations.map((configuration) => (
                      <option key={configuration.id} value={configuration.id}>
                        {configuration.phoneNumber}
                      </option>
                    ))}
                    {whatsappWebConfigurations.map((configuration) => (
                      <option key={configuration.id} value={configuration.id} disabled>
                        {formatConfigurationPhoneNumber(configuration)} (QR code)
                      </option>
                    ))}
                  </select>
                  {whatsappWebConfigurations.length > 0 && <p className="text-muted-foreground text-xs">{WHATSAPP_WEB_TEMPLATE_HINT}.</p>}
                </div>
                {configurationId && (
                  <div className="grid gap-2">
                    <Label htmlFor="broadcast-template">Modelo</Label>
                    <select
                      id="broadcast-template"
                      className={selectClassName}
                      value={template?.id ?? ""}
                      disabled={templatesQuery.isLoading}
                      onChange={(event) => selectTemplate(event.target.value)}
                    >
                      <option value="">
                        {templatesQuery.isLoading ? "Carregando..." : templates.length ? "Selecione" : "Nenhum modelo sincronizado"}
                      </option>
                      {templates.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({item.language}) · {templateCategoryLabel[item.category ?? ""] ?? item.category}
                          {!item.sendable ? ` · ${templateStatusInfo(item).label}` : ""}
                        </option>
                      ))}
                    </select>
                    {template?.category === "MARKETING" && (
                      <p className="text-muted-foreground text-xs">Modelo de marketing: quem pediu para não receber fica de fora.</p>
                    )}
                  </div>
                )}
                {fileType && (
                  <div className="grid gap-2">
                    <Label htmlFor="broadcast-header-file">{headerFileLabel[fileType]}</Label>
                    <Input
                      id="broadcast-header-file"
                      type="file"
                      accept={headerFileAccept[fileType]}
                      onChange={(event) => setHeaderFile(event.target.files?.[0] ?? null)}
                    />
                  </div>
                )}
              </>
            )}

            {step === 1 && <AudienceStep value={sources} onChange={setSources} />}

            {step === 2 && (
              <VariablesStep
                parameters={parameters}
                mapping={mapping}
                onChange={setMapping}
                csvHeaders={sources.csv?.headers ?? []}
                crmFields={crmFieldsQuery.data ?? []}
                hasCrmRows={!!segment}
              />
            )}

            {step === 3 && (
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <p className="text-2xl font-semibold tabular-nums">{formatCount(willReceive)}</p>
                    <p className="text-muted-foreground text-sm">
                      {willReceive === 1 ? "pessoa vai receber" : "pessoas vão receber"}
                      {previewQuery.isFetching && " · atualizando..."}
                    </p>
                  </div>
                  {leftOutTotal > 0 && (
                    <div className="grid gap-1 rounded-lg border p-3">
                      <p className="text-sm font-medium">{formatCount(leftOutTotal)} ficam de fora</p>
                      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
                        {leftOut
                          .filter(([, value]) => value > 0)
                          .map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-2">
                              <dt className="text-muted-foreground">{label}</dt>
                              <dd className="tabular-nums">{formatCount(value)}</dd>
                            </div>
                          ))}
                      </dl>
                    </div>
                  )}
                </div>
                <p className="text-muted-foreground text-sm">
                  {estimate !== null
                    ? `Custo estimado na Meta: cerca de ${formatUsd(estimate)}, pela tabela pública de ${templateCategoryLabel[template?.category ?? ""]?.toLowerCase()} para números do Brasil. A cobrança vem na fatura da conta do WhatsApp.`
                    : "Sem estimativa de custo para esta categoria de modelo."}
                  {template?.category === "MARKETING" && " Quem pediu para não receber marketing é tirado ao salvar."}
                </p>

                <div className="grid gap-2 rounded-lg border p-3">
                  <Label htmlFor="broadcast-test-phone">Enviar um teste antes</Label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      id="broadcast-test-phone"
                      type="tel"
                      value={testPhone}
                      onChange={(event) => setTestPhone(event.target.value)}
                      placeholder="Seu número, ex.: 11 99999-8888"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!testPhone.trim() || !sample || testMutation.isPending}
                      onClick={() => testMutation.mutate()}
                    >
                      {testMutation.isPending ? "Enviando..." : "Enviar teste"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">O teste usa as variáveis da primeira pessoa da lista.</p>
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Quando enviar</p>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <label className="flex items-center gap-2">
                      <input type="radio" name="broadcast-when" checked={when === "now"} onChange={() => setWhen("now")} disabled={busy} />
                      Agora
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="broadcast-when"
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
                      <Label htmlFor="broadcast-scheduled-at" className="text-xs">
                        Data e hora de início
                      </Label>
                      <Input
                        id="broadcast-scheduled-at"
                        type="datetime-local"
                        className="h-9 w-full min-w-0 sm:w-60"
                        value={scheduledAt}
                        min={toLocalInputValue(new Date())}
                        disabled={busy}
                        onChange={(event) => setScheduledAt(event.target.value)}
                      />
                    </div>
                  )}
                  <SendWindowFields value={sendWindow} onChange={setSendWindow} idPrefix="broadcast-window" disabled={busy} />
                </div>

                <div className="grid gap-3 rounded-lg border p-3">
                  <p className="text-sm font-medium">Quem responder</p>
                  <ReplySettingsFields value={reply} onChange={setReply} disabled={busy} />
                </div>

                {(capEnabled || needsConsent) && (
                  <div className="grid gap-3 rounded-lg border p-3">
                    <p className="text-sm font-medium">Cuidados com o número</p>
                    {capEnabled && (
                      <div className="grid gap-1.5">
                        <Label htmlFor="broadcast-cap-days" className="text-xs">
                          Não enviar a quem recebeu outra campanha de marketing nos últimos dias (opcional)
                        </Label>
                        <Input
                          id="broadcast-cap-days"
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
                    )}
                    {needsConsent && (
                      <label className="flex items-start gap-2 text-sm">
                        <Checkbox
                          id="broadcast-consent"
                          checked={consent}
                          disabled={busy}
                          onCheckedChange={(checked) => setConsent(checked === true)}
                        />
                        <span>
                          As pessoas da planilha e da lista colada aceitaram receber mensagens desta empresa pelo WhatsApp.
                          <span className="text-muted-foreground block text-xs">
                            Mensagem para quem não pediu gera denúncias, derruba a qualidade do número e expõe a empresa à LGPD.
                          </span>
                        </span>
                      </label>
                    )}
                  </div>
                )}

                {uploadProgress !== null && (
                  <div className="grid gap-1">
                    <Progress value={uploadProgress} />
                    <p className="text-muted-foreground text-xs">Salvando a lista: {uploadProgress}%</p>
                  </div>
                )}

                {confirmSend ? (
                  <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm">
                      {when === "schedule" ? "Agendar" : "Enviar agora"} para {formatCount(willReceive)}{" "}
                      {willReceive === 1 ? "pessoa" : "pessoas"} pelo número{" "}
                      {configurations.find((item) => item.id === configurationId)?.phoneNumber}
                      {when === "schedule" && scheduleDate && `, começando em ${format(scheduleDate, "dd/MM/yyyy 'às' HH:mm")}`}
                      {sendWindow && ` (${describeSendWindow(sendWindow).toLowerCase()})`}? Dá para pausar depois, mas o que já saiu não
                      volta.
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
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* O span recebe o toque quando o botão está bloqueado e leva ao campo pendente */}
                      <span onClick={() => !busy && reviewError && focusPendingField(reviewErrorField)}>
                        <Button disabled={busy || !readyCount || !!reviewError} onClick={() => setConfirmSend(true)}>
                          {when === "schedule" ? "Agendar" : "Enviar agora"}
                        </Button>
                      </span>
                      <span onClick={() => !busy && settingsError && focusPendingField(reviewErrorField)}>
                        <Button
                          variant="outline"
                          disabled={busy || !readyCount || !!settingsError}
                          onClick={() => createMutation.mutate("draft")}
                        >
                          Salvar rascunho
                        </Button>
                      </span>
                    </div>
                    <DisabledReason>{reviewError}</DisabledReason>
                  </div>
                )}
              </div>
            )}

            {step < 3 && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
                {stepError ? (
                  <DisabledReason className="text-sm">{stepError}</DisabledReason>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {step >= 2 && readyCount !== null ? `${formatCount(readyCount)} prontas para receber` : ""}
                  </p>
                )}
                <div className="flex gap-2">
                  {step > 0 && (
                    <Button variant="ghost" onClick={() => setStep(step - 1)}>
                      Voltar
                    </Button>
                  )}
                  <span onClick={() => stepError && focusPendingField(stepErrorField)}>
                    <Button disabled={!!stepError} onClick={() => setStep(step + 1)}>
                      Continuar
                    </Button>
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {previewContent && (
          <div className="hidden gap-2 lg:sticky lg:top-4 lg:grid">
            <p className="text-muted-foreground text-xs">{previewNote}</p>
            {previewContent}
          </div>
        )}
      </div>
    </div>
  );
};
