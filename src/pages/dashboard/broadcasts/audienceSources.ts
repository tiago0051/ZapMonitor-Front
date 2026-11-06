import { parsePastedList, type AudienceRow, type VariableMapping } from "./broadcastUtils";

export type AudienceSources = {
  tags: AudienceRow[];
  crm: AudienceRow[];
  csv: { fileName: string; headers: string[]; rows: string[][]; phoneColumn: string; nameColumn: string } | null;
  pasted: string;
};

export const emptyAudienceSources: AudienceSources = { tags: [], crm: [], csv: null, pasted: "" };

export const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm";

export const fromContact = (contact: BroadcastAudienceContact): AudienceRow => ({
  phoneNumber: contact.phoneNumber,
  name: contact.name,
  surname: contact.surname,
  dealTitle: contact.dealTitle,
  fields: contact.fields,
  columns: {},
});

export const guessColumn = (headers: string[], pattern: RegExp) => headers.find((header) => pattern.test(header.toLowerCase())) ?? "";

/** Linhas da planilha como pessoas do público, pela coluna do telefone e a do nome. */
export const csvRows = (csv: AudienceSources["csv"]): AudienceRow[] => {
  if (!csv?.phoneColumn) return [];
  const phoneIndex = csv.headers.indexOf(csv.phoneColumn);
  const nameIndex = csv.nameColumn ? csv.headers.indexOf(csv.nameColumn) : -1;

  return csv.rows.map((row) => ({
    phoneNumber: row[phoneIndex] ?? "",
    name: nameIndex >= 0 ? row[nameIndex] || null : null,
    surname: null,
    dealTitle: null,
    fields: {},
    columns: Object.fromEntries(csv.headers.map((header, index) => [header, row[index] ?? ""])),
  }));
};

export const allAudienceRows = (sources: AudienceSources) => [
  ...sources.crm,
  ...sources.tags,
  ...csvRows(sources.csv),
  ...parsePastedList(sources.pasted),
];

export const defaultMapping = (parameters: WhatsappTemplateParameter[]): Record<string, VariableMapping> =>
  Object.fromEntries(
    parameters.map((parameter, index) => [
      parameter.key,
      // A primeira variável do texto costuma ser o nome
      parameter.source === "BODY" && index === parameters.findIndex((item) => item.source === "BODY")
        ? { source: { kind: "firstName" }, fallback: "" }
        : { source: { kind: "fixed", value: "" }, fallback: "" },
    ]),
  );

export const emptyReply: BroadcastReply = { flowId: null, pipelineId: null, stageId: null, serviceGroupId: null };
