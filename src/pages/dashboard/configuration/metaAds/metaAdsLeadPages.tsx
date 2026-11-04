import { LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { crmService } from "@/services/api/crmService";
import { metaAdsService } from "@/services/api/metaAdsService";
import { serviceGroupService } from "@/services/api/serviceGroupService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";

const emptyTarget: AdLeadPageTarget = { pipelineId: null, stageId: null, serviceGroupId: null };

type TargetFieldsProps = {
  idPrefix: string;
  target: AdLeadPageTarget;
  pipelines: Pipeline[];
  serviceGroups: NamedSummary[];
  disabled: boolean;
  onChange: (target: AdLeadPageTarget) => void;
};

/** Funil, etapa e grupo do negócio criado pelo lead. */
const TargetFields: FC<TargetFieldsProps> = ({ idPrefix, target, pipelines, serviceGroups, disabled, onChange }) => {
  const pipeline = pipelines.find((item) => item.id === target.pipelineId);
  const openStages = pipeline?.stages.filter((stage) => stage.type === "OPEN") ?? [];

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-pipeline`} className="text-xs">
          Funil
        </Label>
        <select
          id={`${idPrefix}-pipeline`}
          value={target.pipelineId ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ ...target, pipelineId: event.target.value || null, stageId: null })}
          className={cn(crmSelectClassName, "h-8")}
        >
          <option value="">Só criar o contato</option>
          {pipelines.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-stage`} className="text-xs">
          Etapa
        </Label>
        <select
          id={`${idPrefix}-stage`}
          value={target.stageId ?? ""}
          disabled={disabled || !pipeline}
          onChange={(event) => onChange({ ...target, stageId: event.target.value || null })}
          className={cn(crmSelectClassName, "h-8")}
        >
          <option value="">Primeira etapa</option>
          {openStages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor={`${idPrefix}-group`} className="text-xs">
          Grupo de atendimento
        </Label>
        <select
          id={`${idPrefix}-group`}
          value={target.serviceGroupId ?? ""}
          disabled={disabled || !pipeline}
          onChange={(event) => onChange({ ...target, serviceGroupId: event.target.value || null })}
          className={cn(crmSelectClassName, "h-8")}
        >
          <option value="">Sem grupo</option>
          {serviceGroups.map((group) => (
            <option key={group.id} value={group.id}>
              {group.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

/** Páginas do Facebook cujos formulários de cadastro viram contato e negócio no CRM. */
export const MetaAdsLeadPages = () => {
  const { client, access } = useClientContext();
  const queryClient = useQueryClient();
  const [newPageId, setNewPageId] = useState("");
  const [newTarget, setNewTarget] = useState<AdLeadPageTarget>(emptyTarget);

  const pagesQuery = useQuery({
    queryKey: ["metaAds", "leadPages", client.id],
    queryFn: () => metaAdsService.findLeadPages({ params: { clientId: client.id } }),
  });
  const availableQuery = useQuery({
    queryKey: ["metaAds", "availablePages", client.id],
    queryFn: () => metaAdsService.findAvailablePages({ params: { clientId: client.id } }),
  });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: access.crmEnabled,
  });
  const serviceGroupsQuery = useQuery({
    queryKey: ["serviceGroups", client.id],
    queryFn: () => serviceGroupService.findAll({ params: { clientId: client.id } }),
  });

  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active);
  const serviceGroups = serviceGroupsQuery.data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metaAds"] });

  const linkPage = useMutation({
    mutationFn: metaAdsService.linkLeadPage,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      setNewPageId("");
      setNewTarget(emptyTarget);
      toast.success("Página ligada. Os próximos leads dos formulários dela entram no CRM.");
    },
  });
  const updatePage = useMutation({
    mutationFn: metaAdsService.updateLeadPage,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Destino dos leads atualizado");
    },
  });
  const unlinkPage = useMutation({
    mutationFn: metaAdsService.unlinkLeadPage,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Página desligada");
    },
  });
  const isPending = linkPage.isPending || updatePage.isPending || unlinkPage.isPending;

  const unlinkedPages = (availableQuery.data ?? []).filter((page) => !page.linked);
  const newPage = unlinkedPages.find((page) => page.metaPageId === newPageId);

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Formulários de cadastro</h3>
        <p className="text-muted-foreground text-xs">
          Cada lead vira um contato com o telefone do formulário e, com um funil escolhido, um negócio com as respostas nas notas. Respostas
          cuja pergunta tem o nome de um campo personalizado preenchem o campo.
        </p>
      </div>

      {pagesQuery.isLoading && <LoadingState className="justify-start py-2" />}

      {!!pagesQuery.data?.length && (
        <ul className="divide-y rounded-lg border">
          {pagesQuery.data.map((page) => (
            <li key={page.id} className="space-y-2 px-3 py-3">
              <div className="flex items-center gap-2">
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{page.name}</p>
                <Badge variant="secondary">Recebendo leads</Badge>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isPending}
                  onClick={() => unlinkPage.mutate({ params: { clientId: client.id, leadPageId: page.id } })}
                >
                  Desligar
                </Button>
              </div>
              <TargetFields
                idPrefix={`lead-page-${page.id}`}
                target={{ pipelineId: page.pipelineId, stageId: page.stageId, serviceGroupId: page.serviceGroupId }}
                pipelines={pipelines}
                serviceGroups={serviceGroups}
                disabled={isPending}
                onChange={(target) => updatePage.mutate({ params: { clientId: client.id, leadPageId: page.id }, body: target })}
              />
            </li>
          ))}
        </ul>
      )}

      {availableQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {availableQuery.isError && (
        <p className="text-muted-foreground text-sm">
          Não foi possível listar as páginas. Reconecte a Meta autorizando as páginas e a leitura de leads.
        </p>
      )}
      {availableQuery.data && unlinkedPages.length === 0 && !pagesQuery.data?.length && (
        <p className="text-muted-foreground text-sm">Esta conexão não enxerga nenhuma página. Reconecte e marque as páginas no login.</p>
      )}

      {unlinkedPages.length > 0 && (
        <div className="space-y-2 rounded-lg border border-dashed p-3">
          <div className="grid gap-1">
            <Label htmlFor="lead-page-new" className="text-xs">
              Ligar uma página
            </Label>
            <select
              id="lead-page-new"
              value={newPageId}
              onChange={(event) => setNewPageId(event.target.value)}
              className={cn(crmSelectClassName, "h-8 sm:w-72")}
            >
              <option value="">Escolha a página</option>
              {unlinkedPages.map((page) => (
                <option key={page.metaPageId} value={page.metaPageId} disabled={!page.hasAccess}>
                  {page.name}
                  {!page.hasAccess && " (sem acesso)"}
                </option>
              ))}
            </select>
          </div>
          {newPage && (
            <>
              <TargetFields
                idPrefix="lead-page-new"
                target={newTarget}
                pipelines={pipelines}
                serviceGroups={serviceGroups}
                disabled={isPending}
                onChange={setNewTarget}
              />
              <Button
                size="sm"
                disabled={isPending}
                onClick={() => linkPage.mutate({ params: { clientId: client.id }, body: { metaPageId: newPage.metaPageId, ...newTarget } })}
              >
                Ligar página
              </Button>
            </>
          )}
        </div>
      )}
    </section>
  );
};
