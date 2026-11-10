import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  buttonTypeLabel,
  cleanDraftForSubmit,
  draftExampleFields,
  draftToPreviewTemplate,
  emptyTemplateDraft,
  headerFormatLabel,
  nextVariable,
  normalizeTemplateName,
  TEMPLATE_LIMITS,
  templateCategoryInfo,
  templateToDraft,
  validateTemplateDraft,
} from "@/components/whatsappTemplate/templateDraftUtils";
import { TemplatePreview } from "@/components/whatsappTemplate/templatePreview";
import { headerFileAccept, type TemplateHeaderFileType } from "@/components/whatsappTemplate/templateUtils";
import { whatsappContants } from "@/contants/whatsappContants";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { MobilePreviewSheet } from "@/pages/dashboard/broadcasts/components/mobilePreviewSheet";
import { templateService } from "@/services/api/templateService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { formatConfigurationPhoneNumber, isWhatsappWeb } from "@/utils/whatsappConfiguration";
import { BlockBlobClient } from "@azure/storage-blob";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Braces, Plus, Send, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { TemplateAiGenerator, TemplateAiReview, textareaClassName } from "./components/templateAiAssistant";

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

const CATEGORIES: WhatsappTemplateCategory[] = ["UTILITY", "MARKETING", "AUTHENTICATION"];
const HEADER_FORMATS = ["NONE", "TEXT", "IMAGE", "VIDEO", "DOCUMENT"] as const;
const BUTTON_TYPES: WhatsappTemplateDraftButtonType[] = ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"];

const headerFileTypeOf = (format: WhatsappTemplateDraftHeaderFormat | undefined): TemplateHeaderFileType | null =>
  format === "IMAGE" ? "image" : format === "VIDEO" ? "video" : format === "DOCUMENT" ? "document" : null;

const Counter: FC<{ value: string | null | undefined; max: number }> = ({ value, max }) => {
  const length = value?.length ?? 0;
  return (
    <span className={cn("text-xs tabular-nums", length > max ? "text-destructive" : "text-muted-foreground")}>
      {length}/{max}
    </span>
  );
};

const Section: FC<{ title: string; description?: string; children: ReactNode }> = ({ title, description, children }) => (
  <section className="grid gap-3 border-t pt-5 first:border-t-0 first:pt-0">
    <div>
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
    </div>
    {children}
  </section>
);

/** Cria o modelo direto na conta do WhatsApp do número, com ajuda da IA, sem abrir o Gerenciador da Meta. */
export const WhatsappTemplateNew = () => {
  const { clientId } = useParams();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const backUrl = `${baseUrl}/configuration?tab=template`;

  // "Corrigir e reenviar" de um modelo recusado chega com o modelo no state da navegação
  const baseTemplate = (location.state as { template?: WhatsappTemplate } | null)?.template;
  const [draft, setDraft] = useState<WhatsappTemplateDraft>(() => {
    if (!baseTemplate) return emptyTemplateDraft(whatsappContants.DEFAULT_TEMPLATE_LANGUAGE);
    const initial = templateToDraft(baseTemplate);
    return { ...initial, name: normalizeTemplateName(`${initial.name}_v2`) };
  });
  const [configurationId, setConfigurationId] = useState("");
  const [description, setDescription] = useState("");
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [previousDraft, setPreviousDraft] = useState<WhatsappTemplateDraft | null>(null);
  const [review, setReview] = useState<{ result: WhatsappTemplateAssistResult; key: string } | null>(null);
  const [showErrors, setShowErrors] = useState(false);

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", clientId],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: clientId! }, queries: { page: 1, take: 100 } }),
  });
  const configurations = (configurationsQuery.data?.items ?? []).filter((configuration) => !isWhatsappWeb(configuration));
  const selectedConfiguration = configurations.find((configuration) => configuration.id === configurationId);
  const effectiveConfigurationId = configurationId || (configurations.length === 1 ? configurations[0].id : "");

  const update = (changes: Partial<WhatsappTemplateDraft>) => setDraft((current) => ({ ...current, ...changes }));
  const isAuthentication = draft.category === "AUTHENTICATION";
  const headerFileType = headerFileTypeOf(draft.header?.format);
  const exampleFields = draftExampleFields(draft);
  const buttons = draft.buttons ?? [];

  const cleaned = useMemo(() => cleanDraftForSubmit(draft), [draft]);
  const draftKey = JSON.stringify(cleaned);
  const errors = validateTemplateDraft(draft, { headerFile: headerFileType ? headerFile : undefined });
  const previewTemplate = draftToPreviewTemplate(draft);
  const hasContent = isAuthentication || !!draft.body?.trim();

  const applyDraft = (next: WhatsappTemplateDraft) => {
    setPreviousDraft(draft);
    // A IA não escolhe o arquivo; mantém o cabeçalho de mídia que já estava escolhido
    setDraft({ ...next, authentication: next.authentication ?? draft.authentication });
    if (headerFileTypeOf(next.header?.format) !== headerFileType) setHeaderFile(null);
  };

  const reviewMutation = useMutation({
    mutationFn: templateService.assist,
    onError: requestErrorHandling,
    onSuccess: (result) => setReview({ result, key: draftKey }),
  });

  const handleReview = () =>
    reviewMutation.mutate({ params: { clientId: clientId! }, body: { mode: "review", draft: cleaned, language: draft.language } });

  const createMutation = useMutation({
    mutationFn: async () => {
      let headerFileId: string | undefined;
      if (headerFileType && headerFile) {
        const { fileId, url } = await whatsappService.getTemplateHeaderUploadUrl({
          params: { clientId: clientId!, configurationId: effectiveConfigurationId, fileType: headerFileType },
          body: { fileName: headerFile.name, fileSize: headerFile.size, mimeType: headerFile.type },
        });
        await new BlockBlobClient(url).uploadData(headerFile, {
          blobHTTPHeaders: { blobContentType: headerFile.type },
          blockSize: headerFile.size,
        });
        headerFileId = fileId;
      }

      return templateService.createMeta({
        params: { clientId: clientId! },
        body: { configurationId: effectiveConfigurationId, draft: cleaned, headerFileId, description: description.trim() || undefined },
      });
    },
    onError: requestErrorHandling,
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ["whatsappTemplates", clientId] });

      if (template.status === "APPROVED") toast.success("Modelo aprovado pela Meta e pronto para uso");
      else if (template.status === "REJECTED")
        toast.error("A Meta recusou o modelo", { description: template.rejectedReason ?? undefined });
      else
        toast.success("Modelo enviado para aprovação", {
          description: "A Meta costuma responder em minutos. O status muda sozinho na lista de templates.",
        });

      if (template.category && template.category !== draft.category)
        toast.info(
          `A Meta classificou o modelo como ${templateCategoryInfo[template.category as WhatsappTemplateCategory]?.label ?? template.category}`,
        );

      navigate(backUrl);
    },
  });

  const handleSubmit = () => {
    setShowErrors(true);
    if (!effectiveConfigurationId) return toast.error("Escolha o número que vai usar o modelo");
    if (errors.length) return toast.error("Corrija os pontos indicados antes de enviar");
    createMutation.mutate();
  };

  const insertInBody = (snippet: string) => {
    const textarea = bodyRef.current;
    const body = draft.body ?? "";
    const start = textarea?.selectionStart ?? body.length;
    const end = textarea?.selectionEnd ?? body.length;
    const selected = body.slice(start, end);
    const value = snippet === "*" || snippet === "_" ? `${snippet}${selected || "texto"}${snippet}` : snippet;
    update({ body: body.slice(0, start) + value + body.slice(end) });
    requestAnimationFrame(() => {
      textarea?.focus();
      textarea?.setSelectionRange(start + value.length, start + value.length);
    });
  };

  const updateButton = (index: number, changes: Partial<WhatsappTemplateDraftButton>) =>
    update({ buttons: buttons.map((button, current) => (current === index ? { ...button, ...changes } : button)) });

  const moveButton = (index: number, direction: -1 | 1) => {
    const next = [...buttons];
    const [item] = next.splice(index, 1);
    next.splice(index + direction, 0, item);
    update({ buttons: next });
  };

  const busy = createMutation.isPending;
  const reviewOutdated = !!review && review.key !== draftKey;
  const categoryWarning = review && !reviewOutdated && review.result.category !== draft.category;

  const preview = (
    <div className="grid gap-2">
      <TemplatePreview template={previewTemplate} headerFileName={headerFile?.name} />
      <p className="text-muted-foreground text-xs">As variáveis aparecem com os exemplos informados.</p>
    </div>
  );

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex items-start gap-2">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backUrl} aria-label="Voltar para os templates">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold">Novo modelo</h1>
          <p className="text-muted-foreground text-sm">
            Criado direto na conta do WhatsApp do número e enviado para aprovação da Meta, sem abrir o Gerenciador.
          </p>
        </div>
        <MobilePreviewSheet description="Como o contato vai ver a mensagem.">{preview}</MobilePreviewSheet>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card className="min-w-0">
          <CardHeader>
            <CardTitle>Conteúdo</CardTitle>
            <CardDescription>
              Monte à mão ou peça para a IA escrever. A conferência das regras da Meta acontece enquanto você digita.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5">
            <Section title="Número" description="O modelo fica na conta do WhatsApp (WABA) deste número e vale para todos os números dela.">
              <select
                id="template-configuration"
                className={selectClassName}
                value={effectiveConfigurationId}
                disabled={busy}
                onChange={(event) => setConfigurationId(event.target.value)}
              >
                <option value="" disabled>
                  {configurationsQuery.isLoading ? "Carregando..." : "Selecione"}
                </option>
                {configurations.map((configuration) => (
                  <option key={configuration.id} value={configuration.id} disabled={!configuration.wabaId}>
                    {formatConfigurationPhoneNumber(configuration)}
                    {!configuration.wabaId ? " · conta ainda não identificada" : ""}
                  </option>
                ))}
              </select>
              {!configurationsQuery.isLoading && configurations.length === 0 && (
                <p className="text-destructive text-sm">Nenhum número da API oficial cadastrado. Números por QR code não usam modelos.</p>
              )}
              {selectedConfiguration && !selectedConfiguration.wabaId && (
                <p className="text-muted-foreground text-sm">A conta deste número é identificada na primeira mensagem recebida por ele.</p>
              )}
            </Section>

            <TemplateAiGenerator
              clientId={clientId!}
              draft={cleaned}
              hasContent={hasContent && !!draft.body?.trim()}
              disabled={busy}
              onGenerated={(result) => {
                applyDraft(result.suggestion);
                setReview({ result, key: JSON.stringify(cleanDraftForSubmit(result.suggestion)) });
                toast.success("Modelo escrito pela IA", { description: "Confira o texto e os exemplos antes de enviar." });
              }}
              onUndo={
                previousDraft
                  ? () => {
                      setDraft(previousDraft);
                      setPreviousDraft(null);
                    }
                  : undefined
              }
            />

            <Section title="Categoria" description="A Meta confere e pode reclassificar. Cada categoria tem preço e regras próprias.">
              <div role="radiogroup" className="grid gap-2 md:grid-cols-3">
                {CATEGORIES.map((category) => {
                  const info = templateCategoryInfo[category];
                  const selected = draft.category === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      disabled={busy}
                      onClick={() => update({ category })}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-3 text-left text-sm transition-colors",
                        selected ? "border-primary bg-primary/5 ring-primary/30 ring-2" : "hover:bg-muted/50",
                      )}
                    >
                      <span className="font-medium">{info.label}</span>
                      <span className="text-muted-foreground text-xs">{info.description}</span>
                      <span className="text-muted-foreground text-xs italic">{info.examples}</span>
                    </button>
                  );
                })}
              </div>
            </Section>

            <Section title="Identificação">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
                <div className="grid gap-2">
                  <Label htmlFor="template-name">Nome</Label>
                  <Input
                    id="template-name"
                    value={draft.name}
                    disabled={busy}
                    placeholder="lembrete_parcela_vencendo"
                    onChange={(event) => update({ name: normalizeTemplateName(event.target.value, false) })}
                    onBlur={() => update({ name: normalizeTemplateName(draft.name) })}
                  />
                  <p className="text-muted-foreground text-xs">Minúsculas, números e _. Não aparece para o contato.</p>
                </div>
                <div className="grid content-start gap-2">
                  <Label htmlFor="template-language">Idioma</Label>
                  <select
                    id="template-language"
                    className={selectClassName}
                    value={draft.language}
                    disabled={busy}
                    onChange={(event) => update({ language: event.target.value })}
                  >
                    {whatsappContants.TEMPLATE_LANGUAGES.map((language) => (
                      <option key={language.code} value={language.code}>
                        {language.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="template-description">Descrição interna (opcional)</Label>
                <Input
                  id="template-description"
                  value={description}
                  disabled={busy}
                  maxLength={500}
                  placeholder="Para que a equipe usa este modelo"
                  onChange={(event) => setDescription(event.target.value)}
                />
              </div>
            </Section>

            {isAuthentication ? (
              <Section title="Código de verificação" description="O texto é fixo da Meta; você escolhe só os complementos.">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={draft.authentication?.securityRecommendation ?? true}
                    disabled={busy}
                    onCheckedChange={(checked) =>
                      update({ authentication: { ...draft.authentication, securityRecommendation: checked === true } })
                    }
                  />
                  Incluir "Para sua segurança, não o compartilhe."
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="grid gap-2">
                    <Label htmlFor="template-auth-expiration">Validade do código (minutos)</Label>
                    <Input
                      id="template-auth-expiration"
                      type="number"
                      min={1}
                      max={90}
                      value={draft.authentication?.codeExpirationMinutes ?? ""}
                      disabled={busy}
                      onChange={(event) =>
                        update({
                          authentication: {
                            ...draft.authentication,
                            codeExpirationMinutes: event.target.value ? Number(event.target.value) : null,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="template-auth-button">Texto do botão</Label>
                    <Input
                      id="template-auth-button"
                      value={draft.authentication?.buttonText ?? ""}
                      disabled={busy}
                      maxLength={TEMPLATE_LIMITS.buttonText}
                      onChange={(event) => update({ authentication: { ...draft.authentication, buttonText: event.target.value } })}
                    />
                  </div>
                </div>
                <p className="text-muted-foreground text-xs">
                  Modelos de autenticação são enviados pelo sistema que gera o código (pela API), não pelo atendimento ou campanhas.
                </p>
              </Section>
            ) : (
              <>
                <Section title="Cabeçalho" description="Opcional. Texto curto ou uma mídia que você escolhe a cada envio.">
                  <div className="flex flex-wrap gap-2">
                    {HEADER_FORMATS.map((format) => {
                      const selected = (draft.header?.format ?? "NONE") === format;
                      return (
                        <Button
                          key={format}
                          type="button"
                          size="sm"
                          variant={selected ? "default" : "outline"}
                          disabled={busy}
                          onClick={() => {
                            update({
                              header: format === "NONE" ? null : { format, text: format === "TEXT" ? (draft.header?.text ?? "") : null },
                            });
                            setHeaderFile(null);
                          }}
                        >
                          {headerFormatLabel[format]}
                        </Button>
                      );
                    })}
                  </div>
                  {draft.header?.format === "TEXT" && (
                    <div className="grid gap-1">
                      <div className="flex gap-2">
                        <Input
                          id="template-header-text"
                          value={draft.header.text ?? ""}
                          disabled={busy}
                          placeholder="Ex.: Seu pedido {{1}}"
                          onChange={(event) => update({ header: { format: "TEXT", text: event.target.value } })}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          title="Adicionar variável"
                          aria-label="Adicionar variável no cabeçalho"
                          disabled={busy || exampleFields.some((field) => field.key.startsWith("header."))}
                          onClick={() => update({ header: { format: "TEXT", text: `${draft.header?.text ?? ""} {{1}}`.trimStart() } })}
                        >
                          <Braces className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-end">
                        <Counter value={draft.header.text} max={TEMPLATE_LIMITS.headerText} />
                      </div>
                    </div>
                  )}
                  {headerFileType && (
                    <div className="grid gap-2">
                      <Label htmlFor="template-header-file">Arquivo de exemplo</Label>
                      <Input
                        id="template-header-file"
                        type="file"
                        accept={headerFileAccept[headerFileType]}
                        disabled={busy}
                        onChange={(event) => setHeaderFile(event.target.files?.[0] ?? null)}
                      />
                      <p className="text-muted-foreground text-xs">
                        Só para a Meta avaliar. No envio, você escolhe o arquivo de cada mensagem.
                      </p>
                    </div>
                  )}
                </Section>

                <Section
                  title="Texto da mensagem"
                  description="Use *negrito*, _itálico_ e variáveis para o que muda por contato (nome, valor, data)."
                >
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => insertInBody(nextVariable(draft.body))}
                    >
                      <Braces className="h-4 w-4" />
                      Variável
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => insertInBody("*")}
                      aria-label="Negrito"
                    >
                      <span className="font-bold">N</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => insertInBody("_")}
                      aria-label="Itálico"
                    >
                      <span className="italic">I</span>
                    </Button>
                  </div>
                  <textarea
                    ref={bodyRef}
                    id="template-body"
                    rows={7}
                    value={draft.body ?? ""}
                    disabled={busy}
                    onChange={(event) => update({ body: event.target.value })}
                    className={textareaClassName}
                    placeholder="Olá {{1}}, a parcela do seu contrato vence em {{2}}. Se já pagou, desconsidere esta mensagem."
                  />
                  <div className="flex justify-end">
                    <Counter value={draft.body} max={TEMPLATE_LIMITS.body} />
                  </div>

                  {exampleFields.length > 0 && (
                    <div className="bg-muted/40 grid gap-3 rounded-lg border p-3">
                      <div>
                        <p className="text-sm font-medium">Exemplos das variáveis</p>
                        <p className="text-muted-foreground text-xs">
                          A Meta usa os exemplos para avaliar o modelo. Não use dados reais de clientes.
                        </p>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {exampleFields.map((field) => (
                          <div key={field.key} className="grid gap-1">
                            <Label htmlFor={`template-example-${field.key}`}>{field.label}</Label>
                            <Input
                              id={`template-example-${field.key}`}
                              value={draft.examples?.[field.key] ?? ""}
                              disabled={busy}
                              placeholder="Ex.: Maria"
                              onChange={(event) => update({ examples: { ...draft.examples, [field.key]: event.target.value } })}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Section>

                <Section title="Rodapé" description="Opcional. Texto curto e cinza no fim da mensagem, sem variáveis.">
                  <div className="grid gap-1">
                    <Input
                      id="template-footer"
                      value={draft.footer ?? ""}
                      disabled={busy}
                      placeholder="Ex.: Responda SAIR para não receber mais"
                      onChange={(event) => update({ footer: event.target.value })}
                    />
                    <div className="flex justify-end">
                      <Counter value={draft.footer} max={TEMPLATE_LIMITS.footer} />
                    </div>
                  </div>
                </Section>

                <Section title="Botões" description="Opcional. Até 10; respostas rápidas ficam juntas.">
                  {buttons.map((button, index) => (
                    <div key={index} className="grid gap-3 rounded-lg border p-3">
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Tipo do botão ${index + 1}`}
                          className={cn(selectClassName, "w-auto")}
                          value={button.type}
                          disabled={busy}
                          onChange={(event) => updateButton(index, { type: event.target.value as WhatsappTemplateDraftButtonType })}
                        >
                          {BUTTON_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {buttonTypeLabel[type]}
                            </option>
                          ))}
                        </select>
                        <div className="ml-auto flex">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Mover para cima"
                            disabled={busy || index === 0}
                            onClick={() => moveButton(index, -1)}
                          >
                            <ArrowUp className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Mover para baixo"
                            disabled={busy || index === buttons.length - 1}
                            onClick={() => moveButton(index, 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            aria-label="Remover botão"
                            className="hover:text-destructive"
                            disabled={busy}
                            onClick={() => update({ buttons: buttons.filter((_, current) => current !== index) })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        {button.type !== "COPY_CODE" && (
                          <div className="grid gap-1">
                            <Label htmlFor={`template-button-text-${index}`}>Texto</Label>
                            <Input
                              id={`template-button-text-${index}`}
                              value={button.text}
                              disabled={busy}
                              maxLength={TEMPLATE_LIMITS.buttonText}
                              onChange={(event) => updateButton(index, { text: event.target.value })}
                            />
                          </div>
                        )}
                        {button.type === "URL" && (
                          <>
                            <div className="grid gap-1">
                              <Label htmlFor={`template-button-url-${index}`}>Link</Label>
                              <Input
                                id={`template-button-url-${index}`}
                                value={button.url ?? ""}
                                disabled={busy}
                                placeholder="https://site.com.br/pedido/{{1}}"
                                onChange={(event) => updateButton(index, { url: event.target.value })}
                              />
                            </div>
                            {/\{\{\s*1\s*\}\}$/.test(button.url ?? "") && (
                              <div className="grid gap-1">
                                <Label htmlFor={`template-button-example-${index}`}>Exemplo do final do link</Label>
                                <Input
                                  id={`template-button-example-${index}`}
                                  value={button.example ?? ""}
                                  disabled={busy}
                                  placeholder="12345"
                                  onChange={(event) => updateButton(index, { example: event.target.value })}
                                />
                              </div>
                            )}
                          </>
                        )}
                        {button.type === "PHONE_NUMBER" && (
                          <div className="grid gap-1">
                            <Label htmlFor={`template-button-phone-${index}`}>Telefone</Label>
                            <Input
                              id={`template-button-phone-${index}`}
                              value={button.phoneNumber ?? ""}
                              disabled={busy}
                              placeholder="+55 11 99999-9999"
                              onChange={(event) => updateButton(index, { phoneNumber: event.target.value })}
                            />
                          </div>
                        )}
                        {button.type === "COPY_CODE" && (
                          <div className="grid gap-1">
                            <Label htmlFor={`template-button-code-${index}`}>Código de exemplo</Label>
                            <Input
                              id={`template-button-code-${index}`}
                              value={button.example ?? ""}
                              disabled={busy}
                              maxLength={TEMPLATE_LIMITS.copyCodeExample}
                              placeholder="CUPOM10"
                              onChange={(event) => updateButton(index, { example: event.target.value })}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {buttons.length < TEMPLATE_LIMITS.buttons && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="justify-self-start"
                      disabled={busy}
                      onClick={() => update({ buttons: [...buttons, { type: "QUICK_REPLY", text: "" }] })}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar botão
                    </Button>
                  )}
                </Section>
              </>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:sticky lg:top-0">
          <Card className="hidden lg:flex">
            <CardHeader>
              <CardTitle>Prévia</CardTitle>
            </CardHeader>
            <CardContent>{preview}</CardContent>
          </Card>

          <TemplateAiReview
            draft={draft}
            result={review?.result ?? null}
            outdated={reviewOutdated}
            isPending={reviewMutation.isPending}
            disabled={busy || !hasContent}
            onReview={handleReview}
            onUseCategory={(category) => update({ category })}
            onApplySuggestion={() => review && applyDraft(review.result.suggestion)}
          />

          <Card>
            <CardContent className="grid gap-3">
              {errors.length > 0 && (showErrors || hasContent) ? (
                <ul className="grid gap-1 text-sm">
                  {errors.slice(0, showErrors ? errors.length : 4).map((error) => (
                    <li key={error} className="text-destructive">
                      • {error}
                    </li>
                  ))}
                  {!showErrors && errors.length > 4 && <li className="text-muted-foreground text-xs">e mais {errors.length - 4}</li>}
                </ul>
              ) : (
                errors.length === 0 && (
                  <p className="text-sm text-green-700 dark:text-green-400">Pronto para enviar: segue as regras da Meta.</p>
                )
              )}
              {categoryWarning && (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  A IA indicou a categoria {templateCategoryInfo[review.result.category].label}. Se enviar como{" "}
                  {templateCategoryInfo[draft.category].label}, a Meta pode reclassificar ou recusar.
                </p>
              )}
              <Button type="button" onClick={handleSubmit} disabled={busy}>
                <Send className="h-4 w-4" />
                {busy ? "Enviando..." : "Enviar para aprovação"}
              </Button>
              <p className="text-muted-foreground text-xs">
                A Meta costuma responder em minutos (às vezes até 24 horas). Depois de criado, o nome não pode ser reutilizado por 30 dias
                se o modelo for apagado.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
