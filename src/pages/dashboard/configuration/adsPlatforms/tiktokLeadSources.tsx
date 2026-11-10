import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

/**
 * Formulários instantâneos do TikTok: os leads do anunciante viram contato e, com funil, negócio, como os da Meta.
 * Chegam pelo webhook; o que não chegou dá para importar pelo id da Central de Leads.
 */
export const TikTokLeadSources: FC<{ accounts: AdAccount[] }> = ({ accounts }) => {
  const { client, access } = useClientContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ advertiserId: accounts[0]?.metaAccountId ?? "", pipelineId: "", stageId: "" });
  const [leadId, setLeadId] = useState("");

  const sourcesQuery = useQuery({
    queryKey: ["metaAds", "tiktokLeadSources", client.id],
    queryFn: () => adsPlatformService.findTikTokLeadSources({ params: { clientId: client.id } }),
  });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: access.crmEnabled,
  });
  const pipelines = (pipelinesQuery.data ?? []).filter((pipeline) => pipeline.active);
  const stages = pipelines.find((pipeline) => pipeline.id === form.pipelineId)?.stages ?? [];

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metaAds", "tiktokLeadSources", client.id] });
  const link = useMutation({
    mutationFn: adsPlatformService.linkTikTokLeadSource,
    onError: requestErrorHandling,
    onSuccess: (source) => {
      invalidate();
      if (source.subscriptionError) toast.warning("Formulários ligados, mas o aviso automático do TikTok falhou; importe os leads pelo id");
      else toast.success("Formulários ligados. Os próximos leads entram sozinhos.");
    },
  });
  const unlink = useMutation({
    mutationFn: adsPlatformService.unlinkTikTokLeadSource,
    onError: requestErrorHandling,
    onSuccess: invalidate,
  });
  const importLead = useMutation({
    mutationFn: adsPlatformService.importTikTokLead,
    onError: requestErrorHandling,
    onSuccess: () => {
      setLeadId("");
      queryClient.invalidateQueries({ queryKey: ["metaAds", "leads"] });
      toast.success("Lead importado. Ele aparece na aba Leads em instantes.");
    },
  });

  const sources = sourcesQuery.data ?? [];

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Formulários de cadastro (leads)</h3>
        <p className="text-muted-foreground text-xs">
          Cada lead dos formulários instantâneos do anunciante vira contato e, com funil escolhido, negócio no CRM com o anúncio de origem.
        </p>
      </div>

      {sources.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {sources.map((source) => (
            <li key={source.id} className="flex flex-wrap items-center gap-3 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{source.name}</p>
                <p className="text-muted-foreground text-xs">
                  {source.pipelineId
                    ? `Negócio no funil ${pipelines.find((item) => item.id === source.pipelineId)?.name ?? ""}`
                    : "Só contato"}
                </p>
                {source.subscriptionError && (
                  <p className="flex items-start gap-1 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    Aviso automático indisponível ({source.subscriptionError}); importe os leads pelo id.
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Desligar ${source.name}`}
                disabled={unlink.isPending}
                onClick={() => unlink.mutate({ params: { clientId: client.id, sourceId: source.id } })}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="grid gap-2 rounded-lg border p-3 sm:grid-cols-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (!form.advertiserId) return;
          link.mutate({
            params: { clientId: client.id },
            body: { advertiserId: form.advertiserId, pipelineId: form.pipelineId || null, stageId: form.stageId || null },
          });
        }}
      >
        <div className="grid gap-1">
          <Label htmlFor="tiktok-lead-advertiser" className="text-xs">
            Anunciante
          </Label>
          <select
            id="tiktok-lead-advertiser"
            className={crmSelectClassName}
            value={form.advertiserId}
            onChange={(event) => setForm({ ...form, advertiserId: event.target.value })}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.metaAccountId}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="tiktok-lead-pipeline" className="text-xs">
            Funil do negócio
          </Label>
          <select
            id="tiktok-lead-pipeline"
            className={crmSelectClassName}
            value={form.pipelineId}
            onChange={(event) => setForm({ ...form, pipelineId: event.target.value, stageId: "" })}
          >
            <option value="">Só criar o contato</option>
            {pipelines.map((pipeline) => (
              <option key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="tiktok-lead-stage" className="text-xs">
            Etapa
          </Label>
          <select
            id="tiktok-lead-stage"
            className={crmSelectClassName}
            disabled={!form.pipelineId}
            value={form.stageId}
            onChange={(event) => setForm({ ...form, stageId: event.target.value })}
          >
            <option value="">Primeira etapa</option>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-3">
          <Button type="submit" size="sm" disabled={!form.advertiserId || link.isPending}>
            Ligar formulários
          </Button>
        </div>
      </form>

      {sources.length > 0 && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (leadId.trim()) importLead.mutate({ params: { clientId: client.id }, body: { leadId: leadId.trim() } });
          }}
        >
          <div className="grid min-w-0 flex-1 gap-1">
            <Label htmlFor="tiktok-lead-import" className="text-xs">
              Importar um lead pelo id (Central de Leads do TikTok)
            </Label>
            <Input id="tiktok-lead-import" value={leadId} onChange={(event) => setLeadId(event.target.value)} />
          </div>
          <Button type="submit" size="sm" variant="outline" disabled={!leadId.trim() || importLead.isPending}>
            Importar
          </Button>
        </form>
      )}
    </section>
  );
};
