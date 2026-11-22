import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmService } from "@/services/api/crmService";
import { offerService } from "@/services/api/offerService";
import { salesScriptService } from "@/services/api/salesScriptService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Loader2, Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { selectClassName, textareaClassName } from "./offerUtils";
import { emptyStage, scriptChannelLabel, scriptMethodLabel, toScriptData } from "./salesScriptUtils";

type Props = { onClose: () => void; script?: SalesScript };

type StageListKey = "questions" | "lines" | "advanceSignals" | "avoid";

const STAGE_LISTS: { key: StageListKey; label: string; placeholder: string }[] = [
  { key: "questions", label: "Perguntas", placeholder: "O que fez você procurar agora?" },
  { key: "lines", label: "Falas prontas", placeholder: "Entendi, {primeiro_nome}. Posso te mostrar como funciona?" },
  { key: "advanceSignals", label: "Avance quando", placeholder: "Disse o prazo e quem decide" },
  { key: "avoid", label: "Evite", placeholder: "Falar de preço antes de entender a dor" },
];

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const emptyScript = (): SalesScriptData => ({
  name: "",
  offerId: null,
  pipelineId: null,
  channel: "WHATSAPP",
  method: "CONSULTIVE",
  stages: [],
  notes: null,
});

// As listas ficam em texto (uma por linha) enquanto a pessoa edita
type EditableStage = Omit<SalesScriptStage, StageListKey> & Record<StageListKey, string>;
const toEditable = (stage: SalesScriptStage): EditableStage => ({
  ...stage,
  questions: stage.questions.join("\n"),
  lines: stage.lines.join("\n"),
  advanceSignals: stage.advanceSignals.join("\n"),
  avoid: stage.avoid.join("\n"),
});
const fromEditable = (stage: EditableStage): SalesScriptStage => ({
  ...stage,
  questions: lines(stage.questions),
  lines: lines(stage.lines),
  advanceSignals: lines(stage.advanceSignals),
  avoid: lines(stage.avoid),
});

/** Roteiro de vendas: etapas com objetivo, perguntas, falas e sinais, ligado à oferta e às etapas do funil. */
export const SalesScriptEditorDialog: FC<Props> = ({ onClose, script }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("offers.manage");
  const [data, setData] = useState<Omit<SalesScriptData, "stages">>(() => toScriptData(script ?? emptyScript()));
  const [stages, setStages] = useState<EditableStage[]>(() => (script?.stages ?? []).map(toEditable));
  const [draftNotes, setDraftNotes] = useState("");
  const [improvement, setImprovement] = useState<SalesScriptImprovement | null>(null);
  const update = (changes: Partial<SalesScriptData>) => setData((current) => ({ ...current, ...changes }));

  const offersQuery = useQuery({ queryKey: ["offers", client.id, false], queryFn: () => offerService.findAll(client.id) });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: can("crm.view"),
  });
  const pipeline = pipelinesQuery.data?.find((item) => item.id === data.pipelineId);

  const draft = useMutation({
    mutationFn: () =>
      salesScriptService.draft(client.id, { offerId: data.offerId, channel: data.channel, method: data.method, notes: draftNotes || null }),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      setData((current) => ({ ...current, name: current.name.trim() || result.name, notes: result.notes }));
      setStages(result.stages.map(toEditable));
      toast.success("A IA montou o roteiro. Revise as falas antes de salvar.");
    },
  });

  const improve = useMutation({
    mutationFn: () => salesScriptService.improve(client.id, script!.id),
    onError: requestErrorHandling,
    onSuccess: setImprovement,
  });

  const save = useMutation({
    mutationFn: () => {
      const body: SalesScriptData = { ...data, name: data.name.trim(), stages: stages.map(fromEditable) };
      return script ? salesScriptService.update(client.id, script.id, body) : salesScriptService.create(client.id, body);
    },
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salesScripts", client.id] });
      toast.success(script ? "Roteiro atualizado" : "Roteiro criado");
      onClose();
    },
  });

  const editStage = (index: number, changes: Partial<EditableStage>) =>
    setStages((current) => current.map((stage, i) => (i === index ? { ...stage, ...changes } : stage)));
  const moveStage = (index: number, delta: number) =>
    setStages((current) => {
      const next = [...current];
      const [stage] = next.splice(index, 1);
      next.splice(index + delta, 0, stage);
      return next;
    });

  const canSubmit = canManage && !!data.name.trim() && stages.some((stage) => stage.name.trim()) && !save.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) save.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-4xl">
        <form onSubmit={submit} className="grid gap-5">
          <DialogHeader>
            <DialogTitle>{script ? (canManage ? "Editar roteiro" : script.name) : "Novo roteiro de vendas"}</DialogTitle>
            <DialogDescription>
              O atendente vê o roteiro na conversa e no negócio do CRM, e o agente de IA que usar este roteiro conduz a venda pelas etapas.
            </DialogDescription>
          </DialogHeader>

          <fieldset disabled={!canManage} className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="script-name">Nome</Label>
              <Input
                id="script-name"
                maxLength={200}
                placeholder="Ex.: Venda do Plano Pro pelo WhatsApp"
                value={data.name}
                onChange={(event) => update({ name: event.target.value })}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="script-offer">Oferta</Label>
              <select
                id="script-offer"
                className={selectClassName}
                value={data.offerId ?? ""}
                onChange={(event) => update({ offerId: event.target.value || null })}
              >
                <option value="">Atendimento em geral</option>
                {(offersQuery.data ?? []).map((offer) => (
                  <option key={offer.id} value={offer.id}>
                    {offer.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="script-pipeline">Funil do CRM</Label>
              <select
                id="script-pipeline"
                className={selectClassName}
                value={data.pipelineId ?? ""}
                onChange={(event) => {
                  update({ pipelineId: event.target.value || null });
                  setStages((current) => current.map((stage) => ({ ...stage, pipelineStageId: null })));
                }}
              >
                <option value="">Nenhum</option>
                {(pipelinesQuery.data ?? [])
                  .filter((item) => item.active)
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="script-channel">Canal</Label>
              <select
                id="script-channel"
                className={selectClassName}
                value={data.channel}
                onChange={(event) => update({ channel: event.target.value as SalesScriptChannel })}
              >
                {Object.entries(scriptChannelLabel).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="script-method">Método</Label>
              <select
                id="script-method"
                className={selectClassName}
                value={data.method}
                onChange={(event) => update({ method: event.target.value as SalesScriptMethod })}
              >
                {Object.entries(scriptMethodLabel).map(([value, info]) => (
                  <option key={value} value={value}>
                    {info.label} · {info.description}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          {canManage && (
            <section className="bg-muted/40 grid gap-2 rounded-lg border p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{stages.length ? "Refazer com a IA" : "Montar com a IA"}</p>
                  <p className="text-muted-foreground text-xs">
                    Usa a oferta, o canal, o método e o tom da marca. {stages.length > 0 && "As etapas atuais são substituídas."}
                  </p>
                </div>
                {script && (
                  <Button type="button" size="sm" variant="outline" disabled={improve.isPending} onClick={() => improve.mutate()}>
                    {improve.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                    {improve.isPending ? "Lendo as conversas..." : "Melhorar com conversas reais"}
                  </Button>
                )}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="script-draft-notes"
                  aria-label="Pedido para a IA"
                  maxLength={2000}
                  placeholder="Opcional: ex.: clientes chegam pelo anúncio e já perguntam o preço"
                  value={draftNotes}
                  onChange={(event) => setDraftNotes(event.target.value)}
                />
                <Button type="button" size="sm" disabled={draft.isPending} onClick={() => draft.mutate()}>
                  {draft.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {draft.isPending ? "Montando..." : "Gerar"}
                </Button>
              </div>
            </section>
          )}

          {improvement && (
            <section className="grid gap-2 rounded-lg border border-green-300 p-3 dark:border-green-800">
              <p className="text-sm font-medium">
                Revisão a partir de {improvement.basedOn.won} conversa(s) ganha(s) e {improvement.basedOn.lost} perdida(s)
              </p>
              {improvement.learnings.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">O que as conversas mostram</p>
                  <ul className="list-disc pl-5 text-sm">
                    {improvement.learnings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              {improvement.changes.length > 0 && (
                <div>
                  <p className="text-muted-foreground text-xs font-medium uppercase">O que muda no roteiro</p>
                  <ul className="list-disc pl-5 text-sm">
                    {improvement.changes.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={() => setImprovement(null)}>
                  Dispensar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setStages(improvement.stages.map(toEditable));
                    update({ notes: improvement.notes });
                    setImprovement(null);
                    toast.success("Revisão aplicada. Confira e salve.");
                  }}
                >
                  Aplicar no roteiro
                </Button>
              </div>
            </section>
          )}

          <fieldset disabled={!canManage} className="grid gap-3">
            <div className="grid gap-1">
              <Label htmlFor="script-notes">Regras gerais</Label>
              <textarea
                id="script-notes"
                rows={2}
                maxLength={3000}
                className={textareaClassName}
                placeholder="Ex.: sempre se apresentar pelo nome; nunca mandar áudio na primeira mensagem"
                value={data.notes ?? ""}
                onChange={(event) => update({ notes: event.target.value || null })}
              />
            </div>

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Etapas</h3>
              {canManage && stages.length < 10 && (
                <Button type="button" size="sm" variant="outline" onClick={() => setStages([...stages, toEditable(emptyStage())])}>
                  <Plus className="h-4 w-4" />
                  Etapa
                </Button>
              )}
            </div>
            {stages.length === 0 && (
              <p className="text-muted-foreground rounded-md border border-dashed p-4 text-sm">
                Nenhuma etapa ainda. Use "Gerar" para a IA montar a partir da oferta, ou adicione as etapas à mão.
              </p>
            )}
            <ol className="grid gap-3">
              {stages.map((stage, index) => (
                <li key={index} className="grid gap-2 rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground text-xs font-medium tabular-nums">Etapa {index + 1}</span>
                    {canManage && (
                      <div className="ml-auto flex gap-1">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Subir etapa ${index + 1}`}
                          disabled={index === 0}
                          onClick={() => moveStage(index, -1)}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Descer etapa ${index + 1}`}
                          disabled={index === stages.length - 1}
                          onClick={() => moveStage(index, 1)}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label={`Remover etapa ${index + 1}`}
                          onClick={() => setStages(stages.filter((_, i) => i !== index))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                    <Input
                      id={`stage-name-${index}`}
                      aria-label={`Nome da etapa ${index + 1}`}
                      maxLength={120}
                      placeholder="Ex.: Diagnóstico"
                      value={stage.name}
                      onChange={(event) => editStage(index, { name: event.target.value })}
                    />
                    <Input
                      id={`stage-goal-${index}`}
                      aria-label={`Objetivo da etapa ${index + 1}`}
                      maxLength={600}
                      placeholder="Objetivo: entender a dor, o prazo e quem decide"
                      value={stage.goal}
                      onChange={(event) => editStage(index, { goal: event.target.value })}
                    />
                  </div>
                  {pipeline && (
                    <select
                      id={`stage-pipeline-${index}`}
                      aria-label={`Etapa do funil ligada à etapa ${index + 1}`}
                      className={selectClassName}
                      value={stage.pipelineStageId ?? ""}
                      onChange={(event) => editStage(index, { pipelineStageId: event.target.value || null })}
                    >
                      <option value="">Sem etapa do funil</option>
                      {pipeline.stages.map((item) => (
                        <option key={item.id} value={item.id}>
                          Funil: {item.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="grid gap-2 sm:grid-cols-2">
                    {STAGE_LISTS.map((list) => (
                      <div key={list.key} className="grid gap-1">
                        <Label htmlFor={`stage-${list.key}-${index}`} className="text-xs">
                          {list.label} <span className="text-muted-foreground font-normal">(uma por linha)</span>
                        </Label>
                        <textarea
                          id={`stage-${list.key}-${index}`}
                          rows={3}
                          className={textareaClassName}
                          placeholder={list.placeholder}
                          value={stage[list.key]}
                          onChange={(event) => editStage(index, { [list.key]: event.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </fieldset>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {canManage ? "Cancelar" : "Fechar"}
            </Button>
            {canManage && (
              <Button type="submit" disabled={!canSubmit}>
                {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                {script ? "Salvar" : "Criar roteiro"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
