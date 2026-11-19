import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SegmentPicker } from "@/components/segment/segmentPicker";
import { emptySegmentRules } from "@/components/segment/segmentUtils";
import { type FC } from "react";
import { toast } from "sonner";
import { formatCount, parseCsv, parsePastedList } from "../broadcastUtils";
import { guessColumn, selectClassName, type AudienceSources } from "../audienceSources";

type AudienceStepProps = {
  value: AudienceSources;
  onChange: (value: AudienceSources) => void;
};

export const AudienceStep: FC<AudienceStepProps> = ({ value, onChange }) => {
  const readCsv = async (file: File | undefined) => {
    if (!file) return onChange({ ...value, csv: null });
    const { headers, rows } = parseCsv(await file.text());
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
        phoneColumn: guessColumn(headers, /tel|fone|celular|whats|phone|n[uú]mero/),
        nameColumn: guessColumn(headers, /nome|name/),
      },
    });
  };

  const pastedCount = parsePastedList(value.pasted).length;

  return (
    <Tabs defaultValue={value.csv ? "csv" : value.pasted.trim() ? "paste" : "segment"} className="grid gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        <TabsTrigger value="segment">Contatos (segmento) {value.segment && "✓"}</TabsTrigger>
        <TabsTrigger value="csv">Planilha {value.csv && `(${formatCount(value.csv.rows.length)})`}</TabsTrigger>
        <TabsTrigger value="paste">Lista colada {pastedCount > 0 && `(${formatCount(pastedCount)})`}</TabsTrigger>
      </TabsList>

      <TabsContent value="segment" className="grid gap-3">
        {value.segment ? (
          <>
            <SegmentPicker
              value={value.segment}
              onChange={(segment) => onChange({ ...value, segment })}
              channel="WHATSAPP"
              idPrefix="broadcast-segment"
            />
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
              Escolha quem recebe pelas etiquetas, pelo funil (só negócios em aberto, se quiser), pela origem, por campos e mais, com regras
              para tirar quem não deve receber. A lista é montada no servidor na hora de salvar a campanha.
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
          <Label htmlFor="broadcast-csv">Arquivo CSV com cabeçalho na primeira linha</Label>
          <Input id="broadcast-csv" type="file" accept=".csv,text/csv" onChange={(event) => readCsv(event.target.files?.[0])} />
        </div>
        {value.csv && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="broadcast-csv-phone">Coluna do telefone</Label>
              <select
                id="broadcast-csv-phone"
                className={selectClassName}
                value={value.csv.phoneColumn}
                onChange={(event) => onChange({ ...value, csv: { ...value.csv!, phoneColumn: event.target.value } })}
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
              <Label htmlFor="broadcast-csv-name">Coluna do nome</Label>
              <select
                id="broadcast-csv-name"
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
              {value.csv.fileName}: {formatCount(value.csv.rows.length)} linhas. As outras colunas podem preencher as variáveis no próximo
              passo.
            </p>
          </div>
        )}
      </TabsContent>

      <TabsContent value="paste" className="grid gap-2">
        <Label htmlFor="broadcast-paste">Um número por linha; o nome pode vir depois de vírgula ou ponto e vírgula</Label>
        <textarea
          id="broadcast-paste"
          className="border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 min-h-40 w-full rounded-md border bg-transparent px-3 py-2 font-mono text-sm shadow-xs outline-none focus-visible:ring-[3px]"
          placeholder={"11 99999-8888; Maria\n21 98888-7777; João"}
          value={value.pasted}
          onChange={(event) => onChange({ ...value, pasted: event.target.value })}
        />
      </TabsContent>
    </Tabs>
  );
};
