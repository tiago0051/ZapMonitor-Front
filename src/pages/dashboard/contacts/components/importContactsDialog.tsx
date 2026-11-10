import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DisabledReason } from "@/components/disabled-reason";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { guessColumn, selectClassName } from "@/pages/dashboard/broadcasts/audienceSources";
import { formatCount, parseCsv } from "@/pages/dashboard/broadcasts/broadcastUtils";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { toast } from "sonner";

const CHUNK = 500;

type Csv = { fileName: string; headers: string[]; rows: string[][] };

const baseColumns = [
  { key: "name", label: "Nome", pattern: /^nome|name/ },
  { key: "phone", label: "Telefone", pattern: /tel|fone|celular|whats|phone/ },
  { key: "email", label: "E-mail", pattern: /e-?mail/ },
  { key: "document", label: "CPF/CNPJ", pattern: /cpf|cnpj|documento/ },
  { key: "notes", label: "Observações", pattern: /obs|nota/ },
] as const;

type BaseKey = (typeof baseColumns)[number]["key"];

/** Importa fichas de uma planilha CSV: escolhe as colunas, o que fazer com quem já existe e mostra os erros por linha. */
export const ImportContactsDialog = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [csv, setCsv] = useState<Csv | null>(null);
  const [columns, setColumns] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<"skip" | "update">("skip");
  const [progress, setProgress] = useState<number | null>(null);
  const [result, setResult] = useState<ContactImportResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fieldsQuery = useQuery({
    queryKey: ["contacts", "fields", client.id],
    queryFn: () => contactService.findFields(client.id),
    enabled: open,
  });
  const fields = (fieldsQuery.data ?? []).filter((field) => field.active);

  const reset = () => {
    setCsv(null);
    setColumns({});
    setMode("skip");
    setProgress(null);
    setResult(null);
  };

  const readFile = async (file: File | undefined) => {
    setResult(null);
    if (!file) return setCsv(null);
    const { headers, rows } = parseCsv(await file.text());
    if (!headers.length || !rows.length) {
      toast.error("A planilha está vazia ou sem cabeçalho na primeira linha");
      return;
    }
    setCsv({ fileName: file.name, headers, rows });
    setColumns(Object.fromEntries(baseColumns.map((column) => [column.key, guessColumn(headers, column.pattern)])));
  };

  const valueOf = (row: string[], header: string | undefined) => {
    if (!header || !csv) return null;
    return row[csv.headers.indexOf(header)]?.trim() || null;
  };

  const run = async () => {
    if (!csv) return;
    const rows: ContactImportRow[] = csv.rows.map((row) => ({
      ...(Object.fromEntries(baseColumns.map((column) => [column.key, valueOf(row, columns[column.key])])) as Record<
        BaseKey,
        string | null
      >),
      customFields: Object.fromEntries(
        fields.map((field) => [field.id, valueOf(row, columns[`field:${field.id}`])]).filter(([, value]) => value !== null),
      ),
    }));

    const total: ContactImportResult = { created: 0, updated: 0, skipped: 0, failed: 0, errors: [] };
    setProgress(0);
    try {
      for (let index = 0; index < rows.length; index += CHUNK) {
        // A linha 1 é o cabeçalho
        const part = await contactService.importRows(client.id, { rows: rows.slice(index, index + CHUNK), mode, firstLine: index + 2 });
        total.created += part.created;
        total.updated += part.updated;
        total.skipped += part.skipped;
        total.failed += part.failed;
        total.errors.push(...part.errors);
        setProgress(Math.round(((index + CHUNK) / rows.length) * 100));
      }
      setResult(total);
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    } catch (error) {
      requestErrorHandling(error);
      setResult(total);
    } finally {
      setProgress(null);
    }
  };

  const busy = progress !== null;
  const hasIdentity = !!columns.name || !!columns.phone || !!columns.email;

  const allColumns = [
    ...baseColumns.map((column) => ({ key: column.key as string, label: column.label })),
    ...fields.map((field) => ({ key: `field:${field.id}`, label: field.name })),
  ];
  const mappedColumns = allColumns.filter((column) => !!columns[column.key]);
  const previewRows = csv?.rows.slice(0, 3) ?? [];

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (busy) return;
        if (value) reset();
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="mr-2 h-4 w-4" />
          Importar planilha
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar contatos</DialogTitle>
          <DialogDescription>
            CSV com cabeçalho na primeira linha, separado por vírgula ou ponto e vírgula. Cada linha vira uma ficha.
          </DialogDescription>
        </DialogHeader>

        {!result && (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="import-contacts-file">Arquivo</Label>
              {/* Área de soltar: também abre o seletor de arquivos ao tocar/clicar (funciona no celular) */}
              <label
                htmlFor="import-contacts-file"
                onDragOver={(event) => {
                  event.preventDefault();
                  if (!busy) setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setIsDragging(false);
                  if (!busy) readFile(event.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "focus-within:ring-ring/50 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed px-4 py-6 text-center transition-colors focus-within:ring-[3px]",
                  isDragging ? "border-primary bg-primary/5" : "hover:bg-muted/50",
                  busy && "pointer-events-none opacity-50",
                )}
              >
                {csv ? <FileSpreadsheet className="text-muted-foreground h-6 w-6" /> : <Upload className="text-muted-foreground h-6 w-6" />}
                <span className="text-sm font-medium">{csv ? csv.fileName : "Escolher arquivo CSV"}</span>
                <span className="text-muted-foreground text-xs">
                  {csv ? "Toque para trocar o arquivo" : "Toque para escolher ou arraste o arquivo para cá"}
                </span>
                <input
                  id="import-contacts-file"
                  type="file"
                  accept=".csv,text/csv"
                  disabled={busy}
                  className="sr-only"
                  onChange={(event) => {
                    readFile(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
            </div>

            {csv && (
              <>
                <p className="text-muted-foreground text-sm">
                  {csv.fileName}: {formatCount(csv.rows.length)} linhas.
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  {allColumns.map((column) => (
                    <div key={column.key} className="grid gap-1.5">
                      <Label htmlFor={`import-column-${column.key}`} className="text-xs">
                        {column.label}
                      </Label>
                      <select
                        id={`import-column-${column.key}`}
                        className={selectClassName}
                        value={columns[column.key] ?? ""}
                        disabled={busy}
                        onChange={(event) => setColumns({ ...columns, [column.key]: event.target.value })}
                      >
                        <option value="">Não importar</option>
                        {csv.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                {mappedColumns.length > 0 && previewRows.length > 0 && (
                  <div className="grid gap-1.5">
                    <p className="text-sm font-medium">Prévia das primeiras linhas</p>
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-muted/50">
                          <tr>
                            {mappedColumns.map((column) => (
                              <th key={column.key} scope="col" className="px-2 py-1.5 font-medium whitespace-nowrap">
                                {column.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {previewRows.map((row, rowIndex) => (
                            <tr key={rowIndex} className="border-t">
                              {mappedColumns.map((column) => {
                                const value = valueOf(row, columns[column.key]);
                                return (
                                  <td key={column.key} className="max-w-48 truncate px-2 py-1.5">
                                    {value ?? <span className="text-muted-foreground">—</span>}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {!hasIdentity && <DisabledReason>Escolha a coluna de nome, telefone ou e-mail para importar.</DisabledReason>}

                <fieldset className="grid gap-2">
                  <legend className="mb-1 text-sm font-medium">Telefone ou e-mail que já está numa ficha</legend>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="radio" name="import-mode" checked={mode === "skip"} disabled={busy} onChange={() => setMode("skip")} />
                    <span>Pular a linha</span>
                  </label>
                  <label className="flex items-start gap-2 text-sm">
                    <input type="radio" name="import-mode" checked={mode === "update"} disabled={busy} onChange={() => setMode("update")} />
                    <span>
                      Completar a ficha existente
                      <span className="text-muted-foreground block text-xs">
                        Preenche só o que está vazio; nada que já foi digitado é trocado.
                      </span>
                    </span>
                  </label>
                </fieldset>

                {busy && (
                  <div className="grid gap-1">
                    <Progress value={progress} />
                    <p className="text-muted-foreground text-xs">Importando: {progress}%</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {result && (
          <div className="grid gap-3">
            <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ["Criadas", result.created],
                ["Completadas", result.updated],
                ["Puladas", result.skipped],
                ["Com erro", result.failed],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border p-2">
                  <dt className="text-muted-foreground text-xs">{label}</dt>
                  <dd className="text-xl font-semibold tabular-nums">{formatCount(Number(value))}</dd>
                </div>
              ))}
            </dl>
            {result.errors.length > 0 && (
              <div className="grid gap-1">
                <p className="text-sm font-medium">Linhas com erro</p>
                <ul className="max-h-48 overflow-y-auto rounded-lg border text-sm">
                  {result.errors.map((error) => (
                    <li key={error.line} className="border-b px-3 py-1.5 last:border-b-0">
                      <span className="font-medium tabular-nums">Linha {error.line}:</span> {error.message}
                    </li>
                  ))}
                </ul>
                {result.failed > result.errors.length && (
                  <p className="text-muted-foreground text-xs">Mostrando as primeiras {result.errors.length} de cada lote.</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => setOpen(false)}>Fechar</Button>
          ) : (
            <Button disabled={!csv || !hasIdentity || busy} onClick={run}>
              {busy ? "Importando..." : csv ? `Importar ${formatCount(csv.rows.length)} linhas` : "Importar"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
