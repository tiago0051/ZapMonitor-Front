// Criação de modelos pela tela: as mesmas regras da Meta que o servidor confere, para avisar enquanto a pessoa digita

export const TEMPLATE_LIMITS = {
  name: 512,
  headerText: 60,
  body: 1024,
  footer: 60,
  buttonText: 25,
  buttons: 10,
  urlButtons: 2,
  copyCodeExample: 15,
  example: 200,
} as const;

export const templateCategoryInfo: Record<WhatsappTemplateCategory, { label: string; description: string; examples: string }> = {
  UTILITY: {
    label: "Utilidade",
    description: "Sobre algo que o contato já fez ou pediu: pedido, contrato, conta, agendamento. Sem nenhum conteúdo promocional.",
    examples: "Confirmação de pagamento, status da proposta, lembrete de vencimento, documento pendente.",
  },
  MARKETING: {
    label: "Marketing",
    description: "Ofertas, novidades, convites e reengajamento. Qualquer trecho promocional faz a Meta tratar como marketing.",
    examples: 'Crédito disponível, campanha, desconto, "faz tempo que não falamos", aniversário.',
  },
  AUTHENTICATION: {
    label: "Autenticação",
    description: "Só para enviar código de verificação. O texto é fixo da Meta e é enviado pelo sistema que gera o código.",
    examples: '"123456 é seu código de verificação."',
  },
};

export const buttonTypeLabel: Record<WhatsappTemplateDraftButtonType, string> = {
  QUICK_REPLY: "Resposta rápida",
  URL: "Abrir link",
  PHONE_NUMBER: "Ligar",
  COPY_CODE: "Copiar código",
};

export const headerFormatLabel: Record<WhatsappTemplateDraftHeaderFormat | "NONE", string> = {
  NONE: "Sem cabeçalho",
  TEXT: "Texto",
  IMAGE: "Imagem",
  VIDEO: "Vídeo",
  DOCUMENT: "Documento",
};

export const emptyTemplateDraft = (language: string): WhatsappTemplateDraft => ({
  name: "",
  language,
  category: "UTILITY",
  header: null,
  body: "",
  footer: "",
  buttons: [],
  examples: {},
  authentication: { securityRecommendation: true, codeExpirationMinutes: 10, buttonText: "Copiar código" },
});

const NAME_PATTERN = /^[a-z0-9_]+$/;
const VARIABLE_PATTERN = /\{\{\s*([^{}]*?)\s*\}\}/g;
const NAMED_VARIABLE_PATTERN = /^[a-z][a-z0-9_]*$/;
const POSITIONAL_VARIABLE_PATTERN = /^[1-9][0-9]*$/;

/** Nome no formato da Meta: minúsculas, números e sublinhado. */
export function normalizeTemplateName(value: string, trimEdges = true): string {
  const name = value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/_+/g, "_")
    .substring(0, TEMPLATE_LIMITS.name);
  // Enquanto digita, mantém o "_" do fim para a próxima palavra
  return trimEdges ? name.replace(/^_|_$/g, "") : name.replace(/^_/, "");
}

export function readDraftVariables(text: string | null | undefined): string[] {
  if (!text) return [];
  const names: string[] = [];
  for (const match of text.matchAll(VARIABLE_PATTERN)) if (!names.includes(match[1])) names.push(match[1]);
  return names;
}

const isAuthentication = (draft: WhatsappTemplateDraft) => draft.category === "AUTHENTICATION";
const headerText = (draft: WhatsappTemplateDraft) => (draft.header?.format === "TEXT" ? (draft.header.text ?? "") : "");

/** Próxima variável para inserir no texto: {{n}} seguindo a numeração ou {{nome}} quando o texto usa nomes. */
export function nextVariable(text: string | null | undefined): string {
  const names = readDraftVariables(text);
  const numbers = names.filter((name) => POSITIONAL_VARIABLE_PATTERN.test(name)).map(Number);
  if (names.length && !numbers.length) return "{{variavel}}";
  return `{{${numbers.length ? Math.max(...numbers) + 1 : 1}}}`;
}

/** Variáveis do cabeçalho e do texto que pedem exemplo, com a chave do envio. */
export function draftExampleFields(draft: WhatsappTemplateDraft) {
  if (isAuthentication(draft)) return [];
  return [
    ...readDraftVariables(headerText(draft)).map((name) => ({ key: `header.${name}`, label: `Cabeçalho {{${name}}}` })),
    ...readDraftVariables(draft.body).map((name) => ({ key: `body.${name}`, label: `Texto {{${name}}}` })),
  ];
}

function validateVariables(names: string[], where: string, errors: string[]) {
  const positional = names.filter((name) => POSITIONAL_VARIABLE_PATTERN.test(name));
  const invalid = names.filter((name) => !POSITIONAL_VARIABLE_PATTERN.test(name) && !NAMED_VARIABLE_PATTERN.test(name));

  for (const name of invalid)
    errors.push(
      `${where}: a variável {{${name}}} é inválida. Use números ({{1}}) ou nomes em minúsculas com sublinhado ({{primeiro_nome}})`,
    );

  if (positional.length && positional.length !== names.length)
    errors.push(`${where}: não misture variáveis numeradas ({{1}}) com nomeadas ({{nome}})`);

  if (positional.length === names.length && positional.length) {
    const numbers = positional.map(Number).sort((a, b) => a - b);
    if (numbers.some((number, index) => number !== index + 1))
      errors.push(
        `${where}: as variáveis numeradas precisam ser sequenciais a partir de {{1}} (${numbers.map((n) => `{{${n}}}`).join(", ")})`,
      );
  }
}

/** Regras da Meta. Lista vazia quando o modelo pode ser enviado para aprovação. */
export function validateTemplateDraft(draft: WhatsappTemplateDraft, options: { headerFile?: File | null } = {}): string[] {
  const errors: string[] = [];

  if (!draft.name) errors.push("Informe o nome do modelo");
  else if (!NAME_PATTERN.test(draft.name))
    errors.push("O nome só pode ter letras minúsculas, números e sublinhado (_), sem espaços ou acentos");

  if (isAuthentication(draft)) {
    const minutes = draft.authentication?.codeExpirationMinutes;
    if (minutes !== null && minutes !== undefined && (!Number.isInteger(minutes) || minutes < 1 || minutes > 90))
      errors.push("A validade do código deve ser de 1 a 90 minutos");
    if ((draft.authentication?.buttonText?.trim().length ?? 0) > TEMPLATE_LIMITS.buttonText)
      errors.push(`O texto do botão pode ter até ${TEMPLATE_LIMITS.buttonText} caracteres`);
    return errors;
  }

  if (draft.header?.format === "TEXT") {
    const text = draft.header.text?.trim() ?? "";
    const names = readDraftVariables(text);
    if (!text) errors.push("Escreva o texto do cabeçalho ou escolha outro tipo");
    if (text.length > TEMPLATE_LIMITS.headerText) errors.push(`O cabeçalho pode ter até ${TEMPLATE_LIMITS.headerText} caracteres`);
    if (/[\r\n]/.test(text)) errors.push("O cabeçalho não pode ter quebra de linha");
    if (/[*_~`]/.test(text.replace(VARIABLE_PATTERN, ""))) errors.push("O cabeçalho não aceita formatação (*, _, ~)");
    if (names.length > 1) errors.push("O cabeçalho aceita no máximo 1 variável");
    validateVariables(names, "Cabeçalho", errors);
  } else if (draft.header?.format && options.headerFile === null) {
    errors.push(`Escolha o arquivo de exemplo do cabeçalho (${headerFormatLabel[draft.header.format].toLowerCase()})`);
  }

  const body = draft.body?.trim() ?? "";
  const bodyNames = readDraftVariables(body);
  if (!body) errors.push("Escreva o texto da mensagem");
  if (body.length > TEMPLATE_LIMITS.body) errors.push(`O texto pode ter até ${TEMPLATE_LIMITS.body} caracteres (tem ${body.length})`);
  if (body && /^\{\{[^{}]*\}\}/.test(body)) errors.push("O texto não pode começar com uma variável");
  if (body && /\{\{[^{}]*\}\}$/.test(body)) errors.push("O texto não pode terminar com uma variável; complete a frase depois dela");
  if (/\{\{[^{}]*\}\}\s*\{\{[^{}]*\}\}/.test(body))
    errors.push("Separe as variáveis com texto; duas variáveis seguidas são recusadas pela Meta");
  if (/\n{3,}/.test(body)) errors.push("Use no máximo uma linha em branco seguida no texto");
  validateVariables(bodyNames, "Texto", errors);

  const fixedWords = body.replace(VARIABLE_PATTERN, " ").split(/\s+/).filter(Boolean).length;
  if (bodyNames.length > 0 && fixedWords < bodyNames.length * 2 + 1)
    errors.push("Tem variáveis demais para o tamanho do texto; escreva mais texto fixo em volta delas");

  const headerNames = readDraftVariables(headerText(draft));
  const isNumbered = (names: string[]) => names.every((name) => POSITIONAL_VARIABLE_PATTERN.test(name));
  if (headerNames.length && bodyNames.length && isNumbered(headerNames) !== isNumbered(bodyNames))
    errors.push("Use o mesmo formato de variável no cabeçalho e no texto: todas numeradas ({{1}}) ou todas nomeadas ({{nome}})");

  const footer = draft.footer?.trim() ?? "";
  if (footer.length > TEMPLATE_LIMITS.footer) errors.push(`O rodapé pode ter até ${TEMPLATE_LIMITS.footer} caracteres`);
  if (readDraftVariables(footer).length) errors.push("O rodapé não aceita variáveis");

  for (const field of draftExampleFields(draft)) {
    const value = draft.examples?.[field.key]?.trim();
    if (!value) errors.push(`Informe um exemplo para ${field.label}`);
    else if (value.length > TEMPLATE_LIMITS.example) errors.push(`O exemplo de ${field.label} está longo demais`);
    else if (/[\r\n\t]/.test(value) || / {4,}/.test(value))
      errors.push(`O exemplo de ${field.label} não pode ter quebra de linha ou tabulação`);
  }

  validateButtons(draft.buttons ?? [], errors);

  return errors;
}

function validateButtons(buttons: WhatsappTemplateDraftButton[], errors: string[]) {
  if (buttons.length > TEMPLATE_LIMITS.buttons) errors.push(`O modelo aceita até ${TEMPLATE_LIMITS.buttons} botões`);

  const count = (type: WhatsappTemplateDraftButtonType) => buttons.filter((button) => button.type === type).length;
  if (count("URL") > TEMPLATE_LIMITS.urlButtons) errors.push(`O modelo aceita até ${TEMPLATE_LIMITS.urlButtons} botões de link`);
  if (count("PHONE_NUMBER") > 1) errors.push("O modelo aceita só 1 botão de ligação");
  if (count("COPY_CODE") > 1) errors.push("O modelo aceita só 1 botão de copiar código");

  const quickIndexes = buttons.map((button, index) => (button.type === "QUICK_REPLY" ? index : -1)).filter((index) => index >= 0);
  if (quickIndexes.length > 1 && quickIndexes.at(-1)! - quickIndexes[0] + 1 !== quickIndexes.length)
    errors.push("Deixe os botões de resposta rápida juntos, antes ou depois dos botões de ação");

  const texts = new Set<string>();
  buttons.forEach((button, index) => {
    const where = `Botão ${index + 1}`;
    const text = button.text?.trim() ?? "";

    if (button.type !== "COPY_CODE") {
      if (!text) errors.push(`${where}: escreva o texto do botão`);
      if (text.length > TEMPLATE_LIMITS.buttonText) errors.push(`${where}: o texto pode ter até ${TEMPLATE_LIMITS.buttonText} caracteres`);
      if (readDraftVariables(text).length) errors.push(`${where}: o texto do botão não aceita variáveis`);
      if (text && texts.has(text.toLowerCase())) errors.push(`${where}: já existe um botão com o texto "${text}"`);
      texts.add(text.toLowerCase());
    }

    if (button.type === "URL") {
      const url = button.url?.trim() ?? "";
      const names = readDraftVariables(url);
      if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(url.replace(VARIABLE_PATTERN, "x")))
        errors.push(`${where}: informe um link válido começando com https://`);
      if (names.length > 1 || (names.length === 1 && !/\{\{\s*1\s*\}\}$/.test(url)))
        errors.push(`${where}: o link aceita só uma variável {{1}}, no final`);
      if (names.length === 1 && !button.example?.trim()) errors.push(`${where}: informe um exemplo para o final do link`);
    }

    if (button.type === "PHONE_NUMBER") {
      const digits = (button.phoneNumber ?? "").replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 20) errors.push(`${where}: informe o telefone com DDI e DDD, como +55 11 99999-9999`);
    }

    if (button.type === "COPY_CODE") {
      const example = button.example?.trim() ?? "";
      if (!example) errors.push(`${where}: informe um código de exemplo`);
      if (example.length > TEMPLATE_LIMITS.copyCodeExample)
        errors.push(`${where}: o código de exemplo pode ter até ${TEMPLATE_LIMITS.copyCodeExample} caracteres`);
    }
  });
}

/** Rascunho no formato de modelo, para usar a mesma prévia da lista e do envio. */
export function draftToPreviewTemplate(draft: WhatsappTemplateDraft): WhatsappTemplate {
  const authentication = isAuthentication(draft);
  const minutes = draft.authentication?.codeExpirationMinutes;
  const examples = draft.examples ?? {};

  return {
    id: "draft",
    name: draft.name,
    clientId: "",
    description: null,
    language: draft.language,
    createdAt: new Date().toISOString(),
    synced: true,
    wabaId: null,
    category: draft.category,
    status: null,
    rejectedReason: null,
    syncedAt: null,
    headerFormat: authentication ? null : (draft.header?.format ?? null),
    headerText: authentication ? null : headerText(draft) || null,
    bodyText: authentication
      ? `*123456* é seu código de verificação.${draft.authentication?.securityRecommendation ? " Para sua segurança, não o compartilhe." : ""}`
      : draft.body || "Escreva o texto da mensagem",
    footerText: authentication ? (minutes ? `Este código expira em ${minutes} minutos.` : null) : draft.footer?.trim() || null,
    buttons: authentication
      ? [{ type: "COPY_CODE", text: draft.authentication?.buttonText?.trim() || "Copiar código", url: null }]
      : (draft.buttons ?? []).map((button) => ({
          type: button.type,
          text: button.type === "COPY_CODE" ? "Copiar código" : button.text || buttonTypeLabel[button.type],
          url: button.url ?? null,
        })),
    parameters: Object.entries(examples)
      .filter(([, value]) => value?.trim())
      .map(([key, value]) => ({
        key,
        source: key.startsWith("header") ? "HEADER" : "BODY",
        name: key.split(".")[1],
        label: key,
        example: value,
      })),
    sendable: true,
    unavailableReason: null,
  };
}

/** Modelo existente (ex.: recusado) como ponto de partida para um novo. */
export function templateToDraft(template: WhatsappTemplate): WhatsappTemplateDraft {
  const category = (
    ["MARKETING", "UTILITY", "AUTHENTICATION"].includes(template.category ?? "") ? template.category : "UTILITY"
  ) as WhatsappTemplateCategory;
  const headerFormat = template.headerFormat && template.headerFormat !== "LOCATION" ? template.headerFormat : null;

  return {
    ...emptyTemplateDraft(template.language),
    name: template.name,
    category,
    header: headerFormat ? { format: headerFormat, text: template.headerText } : null,
    body: template.bodyText ?? "",
    footer: template.footerText ?? "",
    buttons: template.buttons
      .filter((button) => ["QUICK_REPLY", "URL", "PHONE_NUMBER", "COPY_CODE"].includes(button.type))
      .map((button) => ({ type: button.type as WhatsappTemplateDraftButtonType, text: button.text ?? "", url: button.url })),
    examples: Object.fromEntries(
      template.parameters.filter((parameter) => parameter.source !== "BUTTON").map((parameter) => [parameter.key, parameter.example ?? ""]),
    ),
  };
}

/** Corpo enviado ao servidor: só o que vale para a categoria. */
export function cleanDraftForSubmit(draft: WhatsappTemplateDraft): WhatsappTemplateDraft {
  if (isAuthentication(draft))
    return { name: draft.name, language: draft.language, category: draft.category, authentication: draft.authentication };

  const keys = new Set(draftExampleFields(draft).map((field) => field.key));
  return {
    name: draft.name,
    language: draft.language,
    category: draft.category,
    header: draft.header?.format === "TEXT" ? { format: "TEXT", text: draft.header.text?.trim() ?? "" } : (draft.header ?? null),
    body: draft.body?.trim() ?? "",
    footer: draft.footer?.trim() || undefined,
    buttons: (draft.buttons ?? []).map((button) => ({
      type: button.type,
      text: button.text?.trim() ?? "",
      url: button.type === "URL" ? button.url?.trim() : undefined,
      phoneNumber: button.type === "PHONE_NUMBER" ? button.phoneNumber?.trim() : undefined,
      example: button.type === "URL" || button.type === "COPY_CODE" ? button.example?.trim() || undefined : undefined,
    })) as WhatsappTemplateDraftButton[],
    examples: Object.fromEntries(Object.entries(draft.examples ?? {}).filter(([key]) => keys.has(key))),
  };
}
