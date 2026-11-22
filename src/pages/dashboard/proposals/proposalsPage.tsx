import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { formatMoney, selectClassName, textareaClassName } from "@/pages/dashboard/offers/offerUtils";
import { proposalService } from "@/services/api/proposalService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, FileSignature, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";
import { ProposalEditorDialog } from "./proposalEditorDialog";
import { proposalStatusInfo, sectionKindLabel, viewSummary } from "./proposalUtils";

const DEFAULT_SECTIONS: ProposalTemplateSection[] = [
  { kind: "CONTEXT", title: "O que entendemos", instructions: "Resuma, com as palavras do cliente, a situação, a dor e o objetivo." },
  { kind: "SOLUTION", title: "Nossa proposta", instructions: "Explique como a oferta resolve exatamente essa dor." },
  { kind: "BENEFITS", title: "O que você ganha", instructions: 'De 3 a 5 benefícios concretos, em tópicos começando com "- ".' },
  { kind: "ITEMS", title: "Investimento", instructions: "Tabela dos itens." },
  { kind: "PROOFS", title: "Por que confiar", instructions: "Só as provas e a garantia cadastradas na oferta." },
  { kind: "NEXT_STEPS", title: "Próximos passos", instructions: "O que acontece depois do aceite, em 2 a 4 passos numerados." },
];

/** Propostas comerciais: indicadores, as que esperam aprovação ou resposta e os modelos. */
export const ProposalsPage = () => {
  const { can } = useClientContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "templates" ? "templates" : "proposals";

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-5xl space-y-6 p-4 md:p-6">
        <div className="max-w-2xl space-y-1">
          <h1 className="text-2xl font-semibold">Propostas</h1>
          <p className="text-muted-foreground text-sm">
            Propostas comerciais com a marca da empresa, criadas no negócio do CRM. Acompanhe quem abriu, quem aceitou e quanto vendeu.
          </p>
        </div>
        <Tabs value={tab} onValueChange={(value) => setSearchParams(value === "templates" ? { tab: "templates" } : {}, { replace: true })}>
          <TabsList>
            <TabsTrigger value="proposals">Propostas</TabsTrigger>
            <TabsTrigger value="templates">Modelos</TabsTrigger>
          </TabsList>
          <TabsContent value="proposals" className="space-y-6 pt-4">
            {can("crm.viewAll") && <ProposalStatsPanel />}
            <ProposalList />
          </TabsContent>
          <TabsContent value="templates" className="pt-4">
            <ProposalTemplates />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

const ProposalStatsPanel = () => {
  const { client } = useClientContext();
  const [days, setDays] = useState(90);
  const statsQuery = useQuery({ queryKey: ["proposalStats", client.id, days], queryFn: () => proposalService.stats(client.id, days) });
  const stats = statsQuery.data;

  const tiles = stats
    ? [
        { label: "Enviadas", value: String(stats.sent) },
        { label: "Aceitas", value: String(stats.accepted) },
        { label: "Taxa de aceite", value: stats.acceptanceRate === null ? "—" : `${stats.acceptanceRate.toLocaleString("pt-BR")}%` },
        { label: "Vendido", value: formatMoney(stats.acceptedValue) },
        { label: "Ticket médio", value: stats.averageTicket === null ? "—" : formatMoney(stats.averageTicket) },
        {
          label: "Tempo até o aceite",
          value:
            stats.medianHoursToAccept === null
              ? "—"
              : stats.medianHoursToAccept < 48
                ? `${stats.medianHoursToAccept} h`
                : `${Math.round(stats.medianHoursToAccept / 24)} dias`,
        },
      ]
    : [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Resultados</h2>
        <select
          id="proposal-stats-days"
          aria-label="Período"
          className={cn(selectClassName, "w-auto")}
          value={days}
          onChange={(event) => setDays(Number(event.target.value))}
        >
          <option value={30}>Últimos 30 dias</option>
          <option value={90}>Últimos 90 dias</option>
          <option value={365}>Últimos 12 meses</option>
        </select>
      </div>
      {statsQuery.isLoading ? (
        <LoadingState />
      ) : !stats ? null : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {tiles.map((tile) => (
              <div key={tile.label} className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">{tile.label}</p>
                <p className="text-lg font-semibold tabular-nums">{tile.value}</p>
              </div>
            ))}
          </div>
          {(stats.byOffer.length > 0 || stats.byUser.length > 0) && (
            <div className="grid gap-3 md:grid-cols-2">
              {stats.byOffer.length > 0 && <ConversionTable title="Por oferta" rows={stats.byOffer} />}
              {stats.byUser.length > 0 && (
                <ConversionTable
                  title="Por vendedor"
                  rows={stats.byUser.map((row) => ({ ...row, name: row.userName ?? "Sem responsável" }))}
                />
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
};

const ConversionTable: FC<{ title: string; rows: { name: string; sent: number; accepted: number; value: number }[] }> = ({
  title,
  rows,
}) => (
  <div className="overflow-x-auto rounded-lg border">
    <table className="w-full text-sm tabular-nums">
      <caption className="text-muted-foreground px-3 pt-2 text-left text-xs">{title}</caption>
      <thead>
        <tr className="text-muted-foreground text-xs">
          <th className="px-3 py-2 text-left font-medium">Nome</th>
          <th className="px-3 py-2 text-right font-medium">Enviadas</th>
          <th className="px-3 py-2 text-right font-medium">Aceitas</th>
          <th className="px-3 py-2 text-right font-medium">Vendido</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name} className="border-t">
            <td className="px-3 py-2">{row.name}</td>
            <td className="px-3 py-2 text-right">{row.sent}</td>
            <td className="px-3 py-2 text-right">
              {row.accepted}{" "}
              {row.sent > 0 && <span className="text-muted-foreground">({Math.round((row.accepted / row.sent) * 100)}%)</span>}
            </td>
            <td className="px-3 py-2 text-right">{formatMoney(row.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

const ProposalList = () => {
  const { client } = useClientContext();
  const [status, setStatus] = useState<ProposalStatus | "">("");
  const [openId, setOpenId] = useState<string | null>(null);
  const listQuery = useQuery({
    queryKey: ["proposals", client.id, status],
    queryFn: () => proposalService.findAll(client.id, { ...(status ? { status } : {}), days: 365 }),
  });
  const proposals = listQuery.data ?? [];

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium">Propostas</h2>
        <select
          id="proposal-status-filter"
          aria-label="Situação"
          className={cn(selectClassName, "w-auto")}
          value={status}
          onChange={(event) => setStatus(event.target.value as ProposalStatus | "")}
        >
          <option value="">Todas</option>
          {Object.entries(proposalStatusInfo).map(([value, info]) => (
            <option key={value} value={value}>
              {info.label}
            </option>
          ))}
        </select>
      </div>
      {listQuery.isLoading ? (
        <LoadingState />
      ) : listQuery.isError ? (
        <ErrorState message="Não foi possível carregar as propostas" onRetry={() => listQuery.refetch()} />
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={FileSignature}
          title="Nenhuma proposta"
          description='Abra um negócio no CRM, adicione o que está sendo vendido e use a aba "Propostas" para criar com a IA.'
        />
      ) : (
        <ul className="grid gap-2">
          {proposals.map((proposal) => (
            <li key={proposal.id}>
              <button
                type="button"
                className="hover:bg-muted/40 focus-visible:ring-ring/50 grid w-full gap-1 rounded-lg border p-3 text-left text-sm outline-none focus-visible:ring-[3px] sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4"
                onClick={() => setOpenId(proposal.id)}
              >
                <span className="font-medium tabular-nums">Nº {proposal.number}</span>
                <span className="grid min-w-0">
                  <span className="truncate">{proposal.title}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {proposal.dealTitle}
                    {viewSummary(proposal) ? ` · ${viewSummary(proposal)}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", proposalStatusInfo[proposal.status].className)}>
                    {proposalStatusInfo[proposal.status].label}
                  </span>
                  <span className="tabular-nums">{formatMoney(proposal.total)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {openId && <ProposalEditorDialog proposalId={openId} onClose={() => setOpenId(null)} />}
    </section>
  );
};

const ProposalTemplates = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("offers.manage");
  const [editing, setEditing] = useState<ProposalTemplate | "new" | null>(null);
  const { confirm, confirmDialog } = useConfirm();
  const templatesQuery = useQuery({ queryKey: ["proposalTemplates", client.id], queryFn: () => proposalService.findTemplates(client.id) });
  const archive = useMutation({
    mutationFn: (id: string) => proposalService.archiveTemplate(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates", client.id] });
      toast.success("Modelo arquivado");
    },
  });
  const templates = templatesQuery.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground max-w-2xl text-sm">
          Quais seções entram, em que ordem e o que a IA escreve em cada uma. Sem modelo cadastrado, vale o padrão do sistema. Logo e cores
          vêm da identidade da marca.
        </p>
        {canManage && (
          <Button onClick={() => setEditing("new")}>
            <Plus className="h-4 w-4" />
            Novo modelo
          </Button>
        )}
      </div>
      {templatesQuery.isLoading ? (
        <LoadingState />
      ) : templates.length === 0 ? (
        <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
          Usando o modelo padrão: o que entendemos, nossa proposta, o que você ganha, investimento, por que confiar e próximos passos.
        </p>
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {templates.map((template) => (
            <li key={template.id} className="grid gap-1 rounded-lg border p-3 text-sm">
              <button type="button" className="text-left font-medium" onClick={() => setEditing(template)}>
                {template.name}
                {template.isDefault && <span className="text-muted-foreground ml-2 text-xs font-normal">padrão</span>}
              </button>
              <span className="text-muted-foreground text-xs">
                {template.sections.map((section) => section.title).join(" → ")} · válida por {template.validityDays} dias
              </span>
              {canManage && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-fit"
                  onClick={async () => {
                    if (await confirm({ title: `Arquivar "${template.name}"?`, confirmLabel: "Arquivar" })) archive.mutate(template.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Arquivar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editing && <TemplateDialog template={editing === "new" ? undefined : editing} onClose={() => setEditing(null)} />}
      {confirmDialog}
    </section>
  );
};

const TemplateDialog: FC<{ template?: ProposalTemplate; onClose: () => void }> = ({ template, onClose }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("offers.manage");
  const [data, setData] = useState<Omit<ProposalTemplate, "id">>(
    () => template ?? { name: "", isDefault: false, sections: DEFAULT_SECTIONS, terms: null, validityDays: 15, accentColor: null },
  );
  const update = (changes: Partial<typeof data>) => setData((current) => ({ ...current, ...changes }));
  const editSection = (index: number, changes: Partial<ProposalTemplateSection>) =>
    update({ sections: data.sections.map((section, i) => (i === index ? { ...section, ...changes } : section)) });
  const move = (index: number, delta: number) => {
    const sections = [...data.sections];
    const [section] = sections.splice(index, 1);
    sections.splice(index + delta, 0, section);
    update({ sections });
  };

  const save = useMutation({
    mutationFn: () => proposalService.saveTemplate(client.id, { ...data, name: data.name.trim() }, template?.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposalTemplates", client.id] });
      toast.success("Modelo salvo");
      onClose();
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canManage && data.name.trim() && data.sections.length) save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>{template ? "Editar modelo" : "Novo modelo de proposta"}</DialogTitle>
            <DialogDescription>A IA segue a instrução de cada seção. Seção vazia não aparece na proposta.</DialogDescription>
          </DialogHeader>
          <fieldset disabled={!canManage} className="grid gap-4">
            <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
              <div className="grid gap-1">
                <Label htmlFor="template-name">Nome</Label>
                <Input id="template-name" maxLength={200} value={data.name} onChange={(event) => update({ name: event.target.value })} />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="template-validity">Validade (dias)</Label>
                <Input
                  id="template-validity"
                  type="number"
                  min={1}
                  max={180}
                  value={data.validityDays}
                  onChange={(event) => update({ validityDays: Math.max(1, Math.min(180, Number(event.target.value) || 15)) })}
                />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="template-color">Cor de destaque</Label>
                <Input
                  id="template-color"
                  type="color"
                  value={data.accentColor ?? "#1f4e79"}
                  onChange={(event) => update({ accentColor: event.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={data.isDefault} onCheckedChange={(checked) => update({ isDefault: checked === true })} />
              Usar como padrão nas novas propostas
            </label>

            <ol className="grid gap-2">
              {data.sections.map((section, index) => (
                <li key={index} className="grid gap-2 rounded-md border p-2">
                  <div className="flex flex-wrap gap-2">
                    <select
                      id={`template-kind-${index}`}
                      aria-label={`Tipo da seção ${index + 1}`}
                      className={cn(selectClassName, "w-auto")}
                      value={section.kind}
                      onChange={(event) => editSection(index, { kind: event.target.value as ProposalSectionKind })}
                    >
                      {Object.entries(sectionKindLabel).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <Input
                      id={`template-title-${index}`}
                      aria-label={`Título da seção ${index + 1}`}
                      className="min-w-40 flex-1"
                      maxLength={120}
                      value={section.title}
                      onChange={(event) => editSection(index, { title: event.target.value })}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Subir"
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Descer"
                      disabled={index === data.sections.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remover seção"
                      onClick={() => update({ sections: data.sections.filter((_, i) => i !== index) })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {section.kind !== "ITEMS" && (
                    <Input
                      id={`template-instructions-${index}`}
                      aria-label={`O que a IA escreve na seção ${index + 1}`}
                      maxLength={1000}
                      placeholder="O que a IA escreve aqui"
                      value={section.instructions}
                      onChange={(event) => editSection(index, { instructions: event.target.value })}
                    />
                  )}
                </li>
              ))}
            </ol>
            {data.sections.length < 12 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-fit"
                onClick={() => update({ sections: [...data.sections, { kind: "CUSTOM", title: "Nova seção", instructions: "" }] })}
              >
                <Plus className="h-4 w-4" />
                Seção
              </Button>
            )}
            <div className="grid gap-1">
              <Label htmlFor="template-terms">Condições gerais (rodapé de toda proposta)</Label>
              <textarea
                id="template-terms"
                rows={3}
                maxLength={5000}
                className={textareaClassName}
                placeholder="Ex.: Proposta sujeita à análise de crédito. Preços em reais."
                value={data.terms ?? ""}
                onChange={(event) => update({ terms: event.target.value || null })}
              />
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {canManage ? "Cancelar" : "Fechar"}
            </Button>
            {canManage && (
              <Button type="submit" disabled={save.isPending || !data.name.trim() || !data.sections.length}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar modelo
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
