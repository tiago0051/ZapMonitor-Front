import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { broadcastService } from "@/services/api/broadcastService";
import { crmService } from "@/services/api/crmService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { formatCount, parseCsv, parsePastedList } from "../broadcastUtils";
import { fromContact, guessColumn, selectClassName, type AudienceSources } from "../audienceSources";

type AudienceStepProps = {
  value: AudienceSources;
  onChange: (value: AudienceSources) => void;
};

export const AudienceStep: FC<AudienceStepProps> = ({ value, onChange }) => {
  const { client, canUseCrm } = useClientContext();
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [pipelineId, setPipelineId] = useState("");
  const [stageIds, setStageIds] = useState<string[]>([]);

  const categoriesQuery = useQuery({
    queryKey: ["whatsappCategories", client.id, "broadcast"],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({ params: { clientId: client.id }, queries: { page: 1, take: 200, text: "" } }),
  });

  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: canUseCrm,
  });

  const audienceMutation = useMutation({
    mutationFn: (input: { target: "tags" | "crm"; body: Parameters<typeof broadcastService.findAudience>[1] }) =>
      broadcastService.findAudience(client.id, input.body),
    onError: requestErrorHandling,
    onSuccess: (contacts, input) => {
      onChange({ ...value, [input.target]: contacts.map(fromContact) });
      toast.success(`${formatCount(contacts.length)} ${contacts.length === 1 ? "contato encontrado" : "contatos encontrados"}`);
    },
  });

  const categories = categoriesQuery.data?.items ?? [];
  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active);
  const pipeline = pipelines.find((item) => item.id === pipelineId);

  const toggle = (list: string[], id: string, checked: boolean) => (checked ? [...list, id] : list.filter((item) => item !== id));

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
    <Tabs defaultValue={canUseCrm ? "crm" : "tags"} className="grid gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        {canUseCrm && <TabsTrigger value="crm">Funil do CRM {value.crm.length > 0 && `(${formatCount(value.crm.length)})`}</TabsTrigger>}
        <TabsTrigger value="tags">Etiquetas {value.tags.length > 0 && `(${formatCount(value.tags.length)})`}</TabsTrigger>
        <TabsTrigger value="csv">Planilha {value.csv && `(${formatCount(value.csv.rows.length)})`}</TabsTrigger>
        <TabsTrigger value="paste">Lista colada {pastedCount > 0 && `(${formatCount(pastedCount)})`}</TabsTrigger>
      </TabsList>

      {canUseCrm && (
        <TabsContent value="crm" className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="broadcast-pipeline">Funil</Label>
            <select
              id="broadcast-pipeline"
              className={selectClassName}
              value={pipelineId}
              onChange={(event) => {
                setPipelineId(event.target.value);
                setStageIds([]);
              }}
            >
              <option value="">Selecione</option>
              {pipelines.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          {pipeline && (
            <div className="grid gap-2">
              <Label>Etapas (nenhuma marcada vale o funil inteiro)</Label>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {pipeline.stages.map((stage) => (
                  <label key={stage.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={stageIds.includes(stage.id)}
                      onCheckedChange={(checked) => setStageIds(toggle(stageIds, stage.id, checked === true))}
                    />
                    {stage.name}
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!pipelineId || audienceMutation.isPending}
              onClick={() => audienceMutation.mutate({ target: "crm", body: { pipelineId, stageIds } })}
            >
              Buscar contatos do funil
            </Button>
            {value.crm.length > 0 && (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, crm: [] })}>
                Tirar {formatCount(value.crm.length)} do funil
              </Button>
            )}
          </div>
        </TabsContent>
      )}

      <TabsContent value="tags" className="grid gap-3">
        {categories.length === 0 && <p className="text-muted-foreground text-sm">Nenhuma etiqueta cadastrada.</p>}
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {categories.map((category) => (
            <label key={category.id} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={categoryIds.includes(category.id)}
                onCheckedChange={(checked) => setCategoryIds(toggle(categoryIds, category.id, checked === true))}
              />
              {category.name}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={!categoryIds.length || audienceMutation.isPending}
            onClick={() => audienceMutation.mutate({ target: "tags", body: { categoryIds } })}
          >
            Buscar contatos das etiquetas
          </Button>
          {value.tags.length > 0 && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, tags: [] })}>
              Tirar {formatCount(value.tags.length)} das etiquetas
            </Button>
          )}
        </div>
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
