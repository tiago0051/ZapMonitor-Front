import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { flowService } from "@/services/api/flowService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { History, Loader2, Minus, Pencil, Phone, Plus } from "lucide-react";
import { useMemo, useState, type FC } from "react";
import { diffFlowDefinitions } from "./flowDiff";
import { flowNodeConfigs } from "./flowNodeConfig";
import { useNodeSummary } from "./useNodeSummary";

const DiffRow: FC<{ node: FlowDefinitionNode; kind: "added" | "removed" | "changed" }> = ({ node, kind }) => {
  const summary = useNodeSummary(node.type, node.data);
  const config = flowNodeConfigs[node.type];
  const Icon = kind === "added" ? Plus : kind === "removed" ? Minus : Pencil;
  const tone =
    kind === "added"
      ? "text-emerald-700 dark:text-emerald-400"
      : kind === "removed"
        ? "text-red-700 dark:text-red-400"
        : "text-amber-700 dark:text-amber-400";

  return (
    <li className="flex items-start gap-2 text-sm">
      <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${tone}`} />
      <span className="min-w-0">
        <span className="font-medium">{config.label}</span>
        <span className="text-muted-foreground"> · {summary}</span>
      </span>
    </li>
  );
};

type PublishDialogProps = {
  flow: Flow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  // Números (já formatados) em que o fluxo começa os atendimentos
  phoneNumbers: string[];
  onConfirm: (options: { activate: boolean }) => void;
};

/** Confirmação do publicar, com o resumo do que muda em relação à versão no ar e a opção de já ativar. */
export const PublishFlowDialog: FC<PublishDialogProps> = (props) => (
  <Dialog open={props.open} onOpenChange={props.onOpenChange}>
    {/* O conteúdo só existe aberto: assim o "Ativar agora" volta ao padrão a cada abertura */}
    {props.open && <PublishFlowDialogContent {...props} />}
  </Dialog>
);

const PublishFlowDialogContent: FC<PublishDialogProps> = ({ flow, onOpenChange, isPending, phoneNumbers, onConfirm }) => {
  const draft = flow.draftDefinition;
  const diff = useMemo(() => (draft ? diffFlowDefinitions(flow.definition, draft) : null), [flow.definition, draft]);
  const isFirstVersion = flow.version === 0;
  const hasNodeChanges = !!diff && diff.added.length + diff.removed.length + diff.changed.length > 0;
  const isQueueFlow = flow.kind === "QUEUE";
  const isArchived = !!flow.archivedAt;
  // Fluxo inativo já sai ativado por padrão: é o que quase todo mundo quer ao publicar
  const [activateNow, setActivateNow] = useState(!flow.active && !isArchived);
  const willBeLive = flow.active || activateNow;

  return (
    <DialogContent className="max-h-[85dvh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{isFirstVersion ? "Publicar a primeira versão" : `Publicar a versão ${flow.version + 1}`}</DialogTitle>
        <DialogDescription>
          {flow.active
            ? "O fluxo já está ativo: os novos atendimentos passam a usar esta versão na hora. Os atendimentos em andamento terminam na versão em que começaram."
            : willBeLive
              ? "O fluxo vai ser publicado e ativado: os novos atendimentos já passam por ele."
              : "O fluxo continua inativo: a versão publicada só passa a atender quando você ativar o fluxo."}
        </DialogDescription>
      </DialogHeader>

      {!flow.active &&
        (isArchived ? (
          <p className="text-muted-foreground text-sm">Este fluxo está arquivado. Desarquive na lista de fluxos para poder ativá-lo.</p>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <Label htmlFor="flow-publish-activate" className="flex-col items-start gap-0.5">
              <span>Ativar agora</span>
              <span className="text-muted-foreground text-xs font-normal">Desligue para publicar e ativar depois</span>
            </Label>
            <Switch id="flow-publish-activate" checked={activateNow} onCheckedChange={setActivateNow} disabled={isPending} />
          </div>
        ))}

      {/* Onde o fluxo passa a valer, para o usuário não publicar achando que já está atendendo */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium">{willBeLive ? "Onde vai atender" : "Onde vai atender quando ativado"}</p>
        {isQueueFlow ? (
          <p className="text-muted-foreground text-sm">
            Roda nos grupos de atendimento que usam este fluxo de fila, enquanto o contato espera.
          </p>
        ) : phoneNumbers.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {phoneNumbers.map((phoneNumber) => (
              <li key={phoneNumber} className="bg-muted flex items-center gap-1 rounded-md px-2 py-1 text-sm">
                <Phone className="h-3.5 w-3.5" />
                {phoneNumber}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Nenhum número ligado: escolha um número em "Números", no topo do editor, para ele começar a atender. Sem número, o fluxo só roda
            quando outro fluxo chama ele pelo nó "Ir para fluxo".
          </p>
        )}
      </div>

      {!isFirstVersion && diff && (
        <div className="space-y-2">
          <p className="text-sm font-medium">O que muda em relação à versão {flow.version}</p>
          {hasNodeChanges ? (
            <ul className="space-y-1.5">
              {diff.added.map((node) => (
                <DiffRow key={`a-${node.id}`} node={node} kind="added" />
              ))}
              {diff.changed.map((node) => (
                <DiffRow key={`c-${node.id}`} node={node} kind="changed" />
              ))}
              {diff.removed.map((node) => (
                <DiffRow key={`r-${node.id}`} node={node} kind="removed" />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhum nó mudou.</p>
          )}
          {diff.edgeChanges > 0 && (
            <p className="text-muted-foreground text-sm">{diff.edgeChanges} conexão(ões) criada(s) ou removida(s).</p>
          )}
          {diff.followUpChanged && <p className="text-muted-foreground text-sm">O follow-up mudou.</p>}
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button onClick={() => onConfirm({ activate: !flow.active && activateNow })} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {!flow.active && activateNow ? "Publicar e ativar" : "Publicar"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};

type DiscardDialogProps = {
  flow: Flow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
};

export const DiscardDraftDialog: FC<DiscardDialogProps> = ({ flow, open, onOpenChange, isPending, onConfirm }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Descartar o rascunho?</DialogTitle>
        <DialogDescription>
          O editor volta para a versão {flow.version}, a que está publicada. As alterações do rascunho não podem ser recuperadas.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
          Cancelar
        </Button>
        <Button variant="destructive" onClick={onConfirm} disabled={isPending}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Descartar rascunho
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

type VersionHistoryProps = {
  clientId: string;
  flow: Flow;
  disabled: boolean;
  restoringVersionId: string | null;
  onRestore: (version: FlowVersion) => void;
} & PanelControlProps;

/**
 * No celular os painéis do cabeçalho abrem pelo menu "⋯": ficam controlados por fora e ancorados no elemento
 * posicionado mais próximo, sem botão próprio.
 */
export type PanelControlProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  anchorOnly?: boolean;
};

/** Versões publicadas; restaurar copia a versão para o rascunho, que precisa ser publicado de novo. */
export const FlowVersionHistory: FC<VersionHistoryProps> = ({
  clientId,
  flow,
  disabled,
  restoringVersionId,
  onRestore,
  open,
  onOpenChange,
  anchorOnly,
}) => {
  const versionsQuery = useQuery({
    queryKey: ["flowVersions", clientId, flow.id, flow.version],
    queryFn: () => flowService.findVersions({ params: { clientId, flowId: flow.id } }),
    enabled: flow.version > 0,
  });

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      {anchorOnly ? (
        <PopoverAnchor asChild>
          <span aria-hidden className="pointer-events-none absolute inset-0" />
        </PopoverAnchor>
      ) : (
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Histórico de versões" title="Histórico de versões" disabled={flow.version === 0}>
            <History className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] space-y-2">
        <p className="text-sm font-medium">Versões publicadas</p>
        <p className="text-muted-foreground text-xs">Restaurar copia a versão para o rascunho. Ela só volta ao ar quando você publicar.</p>
        {versionsQuery.isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}
        {versionsQuery.isError && <p className="text-destructive text-sm">Não foi possível carregar as versões.</p>}
        <ul className="max-h-72 divide-y overflow-y-auto">
          {(versionsQuery.data ?? []).map((version) => (
            <li key={version.id} className="flex items-center gap-2 py-2">
              <div className="min-w-0 flex-1 text-sm">
                <p className="font-medium">
                  Versão {version.version}
                  {version.current && <span className="text-muted-foreground font-normal"> · no ar</span>}
                </p>
                <p className="text-muted-foreground truncate text-xs">
                  {format(new Date(version.createdAt), "dd/MM/yyyy HH:mm")}
                  {version.publishedByName && ` · ${version.publishedByName}`}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                disabled={disabled || !!restoringVersionId}
                title={disabled ? "Salve ou descarte as alterações do editor antes" : undefined}
                onClick={() => onRestore(version)}
              >
                {restoringVersionId === version.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Restaurar
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
};
