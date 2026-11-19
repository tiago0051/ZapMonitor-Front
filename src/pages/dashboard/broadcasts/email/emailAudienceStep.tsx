import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentPicker } from "@/components/segment/segmentPicker";
import { emptySegmentRules } from "@/components/segment/segmentUtils";
import { type FC } from "react";
import { toast } from "sonner";
import { guessColumn, selectClassName } from "../audienceSources";
import { formatCount } from "../broadcastUtils";
import { parsePastedEmails, readEmailCsv, type EmailAudienceSources } from "./emailCampaignUtils";

type EmailAudienceStepProps = {
  value: EmailAudienceSources;
  onChange: (value: EmailAudienceSources) => void;
};

/** Público da campanha de e-mail: fichas por segmento (resolvido no servidor), planilha e lista colada. */
export const EmailAudienceStep: FC<EmailAudienceStepProps> = ({ value, onChange }) => {
  const readCsv = async (file: File | undefined) => {
    if (!file) return onChange({ ...value, csv: null });
    const { headers, rows } = await readEmailCsv(file);
    if (!headers.length || !rows.length) {
      toast.error("A planilha está vazia ou sem cabeçalho na primeira linha");
      return;
    }
    onChange({
      ...value,
      csv: {
        fileName: file.name,
        headers,
        rows,
        emailColumn: guessColumn(headers, /e-?mail/),
        nameColumn: guessColumn(headers, /nome|name/),
      },
    });
  };

  const pastedCount = parsePastedEmails(value.pasted).length;
  const counter = (count: number) => (count > 0 ? ` (${formatCount(count)})` : "");

  return (
    <Tabs defaultValue={value.csv ? "csv" : value.pasted.trim() ? "paste" : "segment"} className="grid gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="segment">Contatos (segmento) {value.segment && "✓"}</TabsTrigger>
        <TabsTrigger value="csv">Planilha{counter(value.csv?.rows.length ?? 0)}</TabsTrigger>
        <TabsTrigger value="paste">Lista colada{counter(pastedCount)}</TabsTrigger>
      </TabsList>

      <TabsContent value="segment" className="grid gap-3">
        {value.segment ? (
          <>
            <SegmentPicker
              value={value.segment}
              onChange={(segment) => onChange({ ...value, segment })}
              channel="EMAIL"
              idPrefix="email-segment"
            />
            <p className="text-muted-foreground text-xs">
              Entra o e-mail principal válido de cada ficha, com o negócio aberto mais recente para as variáveis; descadastrados ficam de
              fora no envio.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="justify-self-start"
              onClick={() => onChange({ ...value, segment: null })}
            >
              Não usar segmento
            </Button>
          </>
        ) : (
          <div className="grid gap-2">
            <p className="text-muted-foreground text-sm">
              Escolha as fichas pelas etiquetas, pelo funil, pela origem, por campos e mais, com regras para tirar quem não deve receber.
            </p>
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={() => onChange({ ...value, segment: { segmentId: null, rules: emptySegmentRules() } })}
            >
              Usar contatos do sistema
            </Button>
          </div>
        )}
      </TabsContent>

      <TabsContent value="csv" className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="email-campaign-csv">Arquivo CSV com cabeçalho na primeira linha</Label>
          <Input id="email-campaign-csv" type="file" accept=".csv,text/csv" onChange={(event) => readCsv(event.target.files?.[0])} />
        </div>
        {value.csv && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="email-campaign-csv-email">Coluna do e-mail</Label>
              <select
                id="email-campaign-csv-email"
                className={selectClassName}
                value={value.csv.emailColumn}
                onChange={(event) => onChange({ ...value, csv: { ...value.csv!, emailColumn: event.target.value } })}
              >
                <option value="">Selecione</option>
                {value.csv.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email-campaign-csv-name">Coluna do nome</Label>
              <select
                id="email-campaign-csv-name"
                className={selectClassName}
                value={value.csv.nameColumn}
                onChange={(event) => onChange({ ...value, csv: { ...value.csv!, nameColumn: event.target.value } })}
              >
                <option value="">Sem nome</option>
                {value.csv.headers.map((header) => (
                  <option key={header} value={header}>
                    {header}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-muted-foreground text-xs sm:col-span-2">
              {value.csv.fileName}: {formatCount(value.csv.rows.length)} linhas. Quem está na planilha não tem ficha, então as variáveis do
              contato usam o nome da coluna e o valor padrão do modelo.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="paste" className="grid gap-2">
        <Label htmlFor="email-campaign-paste">Um e-mail por linha; o nome pode vir depois de vírgula ou ponto e vírgula</Label>
        <textarea
          id="email-campaign-paste"
          className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 min-h-40 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          placeholder={"maria@empresa.com; Maria\njoao@gmail.com; João"}
          value={value.pasted}
          onChange={(event) => onChange({ ...value, pasted: event.target.value })}
        />
      </TabsContent>
    </Tabs>
  );
};
