import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { emailCampaignService } from "@/services/api/emailCampaignService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { guessColumn, selectClassName } from "../audienceSources";
import { formatCount } from "../broadcastUtils";
import { parsePastedEmails, readEmailCsv, type EmailAudienceSources } from "./emailCampaignUtils";

type EmailAudienceStepProps = {
  value: EmailAudienceSources;
  onChange: (value: EmailAudienceSources) => void;
};

type Target = "crm" | "tags" | "all";

/** Público da campanha de e-mail: fichas do funil, das etiquetas ou todas, planilha e lista colada. */
export const EmailAudienceStep: FC<EmailAudienceStepProps> = ({ value, onChange }) => {
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
    mutationFn: (input: { target: Target; body: Parameters<typeof emailCampaignService.findAudience>[1] }) =>
      emailCampaignService.findAudience(client.id, input.body),
    onError: requestErrorHandling,
    onSuccess: ({ contacts, suppressed }, input) => {
      onChange({ ...value, [input.target]: contacts });
      toast.success(`${formatCount(contacts.length)} ${contacts.length === 1 ? "ficha com e-mail" : "fichas com e-mail"}`, {
        description: suppressed ? `${formatCount(suppressed)} descadastrados ou com e-mail que voltou ficaram de fora.` : undefined,
      });
    },
  });

  const categories = categoriesQuery.data?.items ?? [];
  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active);
  const pipeline = pipelines.find((item) => item.id === pipelineId);
  const toggle = (list: string[], id: string, checked: boolean) => (checked ? [...list, id] : list.filter((item) => item !== id));

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

  const clearButton = (target: Target, label: string) =>
    value[target].length > 0 && (
      <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, [target]: [] })}>
        Tirar {formatCount(value[target].length)} {label}
      </Button>
    );

  const pastedCount = parsePastedEmails(value.pasted).length;
  const counter = (count: number) => (count > 0 ? ` (${formatCount(count)})` : "");

  return (
    <Tabs defaultValue={canUseCrm ? "crm" : "tags"} className="grid gap-4">
      <TabsList className="flex h-auto w-full flex-wrap justify-start">
        {canUseCrm && <TabsTrigger value="crm">Funil do CRM{counter(value.crm.length)}</TabsTrigger>}
        <TabsTrigger value="tags">Etiquetas{counter(value.tags.length)}</TabsTrigger>
        <TabsTrigger value="all">Todos os contatos{counter(value.all.length)}</TabsTrigger>
        <TabsTrigger value="csv">Planilha{counter(value.csv?.rows.length ?? 0)}</TabsTrigger>
        <TabsTrigger value="paste">Lista colada{counter(pastedCount)}</TabsTrigger>
      </TabsList>

      {canUseCrm && (
        <TabsContent value="crm" className="grid gap-3">
          <div className="grid gap-2">
            <Label htmlFor="email-campaign-pipeline">Funil</Label>
            <select
              id="email-campaign-pipeline"
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
              Buscar fichas do funil
            </Button>
            {clearButton("crm", "do funil")}
          </div>
          <p className="text-muted-foreground text-xs">
            Entra o e-mail principal da ficha de cada negócio; quem não tem e-mail fica de fora.
          </p>
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
            Buscar fichas das etiquetas
          </Button>
          {clearButton("tags", "das etiquetas")}
        </div>
      </TabsContent>

      <TabsContent value="all" className="grid gap-3">
        <p className="text-muted-foreground text-sm">Todas as fichas de contato com e-mail válido, sem os descadastrados.</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={audienceMutation.isPending}
            onClick={() => audienceMutation.mutate({ target: "all", body: { allContacts: true } })}
          >
            Buscar todas as fichas
          </Button>
          {clearButton("all", "fichas")}
        </div>
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
