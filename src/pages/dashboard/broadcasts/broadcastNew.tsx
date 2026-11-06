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
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { estimateCostUsd, formatCount, formatUsd, RECIPIENTS_PER_REQUEST, summarizeAudience, type VariableMapping } from "./broadcastUtils";
import { allAudienceRows, defaultMapping, emptyAudienceSources, selectClassName, type AudienceSources } from "./audienceSources";
import { AudienceStep } from "./components/audienceStep";
import { VariablesStep } from "./components/variablesStep";

const STEPS = ["Mensagem", "Público", "Variáveis", "Revisão"] as const;

export const BroadcastNew = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [configurationId, setConfigurationId] = useState("");
  const [template, setTemplate] = useState<WhatsappTemplate | null>(null);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [sources, setSources] = useState<AudienceSources>(emptyAudienceSources);
  const [mapping, setMapping] = useState<Record<string, VariableMapping>>({});
  const [testPhone, setTestPhone] = useState("");
  const [confirmSend, setConfirmSend] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
  });
  const configurations = (configurationsQuery.data?.items ?? []).filter((configuration) => configuration.enabled);

  const templatesQuery = useQuery({
    queryKey: ["whatsappTemplates", client.id, configurationId],
    queryFn: () => templateService.findAll({ params: { clientId: client.id }, queries: { configurationId } }),
    enabled: !!configurationId,
  });
  const templates = (templatesQuery.data ?? []).filter((item) => item.synced);

  const crmFieldsQuery = useQuery({
    queryKey: ["crm", "fields", client.id],
    queryFn: () => crmService.findAllCrmFields({ params: { clientId: client.id } }),
    enabled: sources.crm.length > 0,
  });

  const parameters = useMemo(() => template?.parameters ?? [], [template]);
  const rows = useMemo(() => allAudienceRows(sources), [sources]);
  const summary = useMemo(() => summarizeAudience(rows, parameters, mapping), [rows, parameters, mapping]);
  const fileType = headerFileType(template);
  const firstReady = summary.ready[0];

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
    if (step === 1 && rows.length === 0) return "Inclua pelo menos uma pessoa";
    if (step === 2 && summary.ready.length === 0) return "Nenhuma pessoa com todas as variáveis preenchidas";
    return null;
  })();

  const headerFileId = async () =>
    (await buildTemplateSendBody(client.id, configurationId, { template, variables: {}, headerFile })).headerFileId;

  const testMutation = useMutation({
    mutationFn: async () =>
      broadcastService.sendTest(client.id, {
        configurationId,
        templateId: template!.id,
        phoneNumber: testPhone,
        variables: firstReady?.variables,
        headerFileId: await headerFileId(),
      }),
    onError: requestErrorHandling,
    onSuccess: () => toast.success("Teste enviado", { description: "Confira no WhatsApp do número de teste." }),
  });

  const createMutation = useMutation({
    mutationFn: async (start: boolean) => {
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
      // Cria em rascunho, completa em lotes e só então inicia, para o envio não começar pela metade da lista
      let broadcast = await broadcastService.create(client.id, {
        name: name.trim(),
        configurationId,
        templateId: template!.id,
        headerFileId: fileId,
        recipients: chunks[0],
      });
      for (let index = 1; index < chunks.length; index++) {
        await broadcastService.addRecipients(client.id, broadcast.id, chunks[index]);
        setUploadProgress(Math.round(((index + 1) / chunks.length) * 100));
      }
      setUploadProgress(100);
      if (start) broadcast = await broadcastService.action(client.id, broadcast.id, "start");
      return broadcast;
    },
    onError: (error) => {
      setUploadProgress(null);
      requestErrorHandling(error);
    },
    onSuccess: (broadcast, start) => {
      queryClient.invalidateQueries({ queryKey: ["broadcasts", client.id] });
      toast.success(start ? "Campanha iniciada" : "Rascunho salvo");
      navigate(`${baseUrl}/broadcasts/${broadcast.id}`);
    },
  });

  const estimate = estimateCostUsd(template?.category ?? null, summary.ready.length);
  const busy = createMutation.isPending;

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`${baseUrl}/broadcasts`} aria-label="Voltar para as campanhas">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Nova campanha</h1>
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
            <CardTitle>{STEPS[step]}</CardTitle>
            {step === 1 && <CardDescription>Some quantas fontes quiser. Números repetidos entram uma vez só.</CardDescription>}
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
                  </select>
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
                hasCrmRows={sources.crm.length > 0}
              />
            )}

            {step === 3 && (
              <div className="grid gap-4">
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Vão receber", summary.ready.length],
                    ["Repetidos", summary.duplicates],
                    ["Números inválidos", summary.invalid],
                    ["Sem variável", summary.missingVariables],
                  ].map(([label, count]) => (
                    <div key={label} className="rounded-lg border p-3">
                      <dt className="text-muted-foreground text-xs">{label}</dt>
                      <dd className="text-xl font-semibold tabular-nums">{formatCount(Number(count))}</dd>
                    </div>
                  ))}
                </dl>
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
                      disabled={!testPhone.trim() || !firstReady || testMutation.isPending}
                      onClick={() => testMutation.mutate()}
                    >
                      {testMutation.isPending ? "Enviando..." : "Enviar teste"}
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">O teste usa as variáveis da primeira pessoa da lista.</p>
                </div>

                {uploadProgress !== null && (
                  <div className="grid gap-1">
                    <Progress value={uploadProgress} />
                    <p className="text-muted-foreground text-xs">Salvando a lista: {uploadProgress}%</p>
                  </div>
                )}

                {confirmSend ? (
                  <div className="grid gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/30">
                    <p className="text-sm">
                      Enviar agora para {formatCount(summary.ready.length)} {summary.ready.length === 1 ? "pessoa" : "pessoas"} pelo número{" "}
                      {configurations.find((item) => item.id === configurationId)?.phoneNumber}? Dá para pausar depois, mas o que já saiu
                      não volta.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button disabled={busy} onClick={() => createMutation.mutate(true)}>
                        {busy ? "Iniciando..." : "Confirmar envio"}
                      </Button>
                      <Button variant="ghost" disabled={busy} onClick={() => setConfirmSend(false)}>
                        Voltar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={busy || !summary.ready.length} onClick={() => setConfirmSend(true)}>
                      Enviar agora
                    </Button>
                    <Button variant="outline" disabled={busy || !summary.ready.length} onClick={() => createMutation.mutate(false)}>
                      Salvar rascunho
                    </Button>
                  </div>
                )}
              </div>
            )}

            {step < 3 && (
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

        {template && (
          <div className="grid gap-2 lg:sticky lg:top-4">
            <p className="text-muted-foreground text-xs">
              Prévia{firstReady ? ` para ${firstReady.row.name || firstReady.row.phoneNumber}` : ""}
            </p>
            <TemplatePreview template={template} variables={firstReady?.variables} headerFileName={headerFile?.name} />
          </div>
        )}
      </div>
    </div>
  );
};
