import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { crmService } from "@/services/api/crmService";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, Plus, RefreshCw, Trash2, Users } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { AudienceLiftDialog } from "./audienceLiftDialog";

const sourceLabel: Record<AdCrmAudienceSource, string> = {
  WON: "Clientes (negócios ganhos)",
  OPEN: "Em negociação (negócios abertos)",
  ALL: "Todos os contatos com negócio",
  REENGAGE: "Conversou e não comprou",
};

// Uma linha explicando quem entra em cada opção
const sourceHelp: Record<AdCrmAudienceSource, string> = {
  WON: "Quem já comprou. Bom para excluir das campanhas de venda ou achar parecidos.",
  OPEN: "Quem está negociando agora.",
  ALL: "Todo contato que tem algum negócio no CRM.",
  REENGAGE:
    "Chegou pelos anúncios nos últimos 90 dias, conversou e não comprou. Quem comprou ou pediu para não receber mensagens fica de fora.",
};

// Grupo de controle só mede quem ainda pode comprar: não vale para clientes (já compraram) nem semelhantes
const controlSources: AdCrmAudienceSource[] = ["OPEN", "REENGAGE", "ALL"];
const controlOptions = [0, 10, 20, 30];

const selectClassName = cn(crmSelectClassName, "h-8 text-xs");

/** Públicos na Meta com os telefones do CRM (em hash) e semelhantes a eles. */
export const AdsCrmAudiences: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can, access } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<AdCrmAudienceKind>("CUSTOM");
  const [source, setSource] = useState<AdCrmAudienceSource>("WON");
  const [pipelineId, setPipelineId] = useState("");
  const [originAudienceId, setOriginAudienceId] = useState("");
  const [ratioPercent, setRatioPercent] = useState(1);
  const [controlPercent, setControlPercent] = useState(0);
  const [liftAudience, setLiftAudience] = useState<AdCrmAudience | null>(null);

  const audiencesQuery = useQuery({
    queryKey: ["metaAds", "crmAudiences", client.id, account.id],
    queryFn: () => metaAdsService.findCrmAudiences({ params }),
  });
  const pipelinesQuery = useQuery({
    queryKey: ["crm", "pipelines", client.id],
    queryFn: () => crmService.findAllPipelines({ params: { clientId: client.id } }),
    enabled: access.crmEnabled,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metaAds", "crmAudiences"] });
  const notify = (audience: AdCrmAudience) =>
    audience.status === "FAILED" ? toast.error(audience.error ?? "A Meta não aceitou o público") : toast.success("Público enviado à Meta");
  const create = useMutation({
    mutationFn: metaAdsService.createCrmAudience,
    onError: requestErrorHandling,
    onSuccess: (audience) => {
      invalidate();
      notify(audience);
      setIsCreating(false);
      setName("");
      setControlPercent(0);
    },
  });
  const sync = useMutation({
    mutationFn: metaAdsService.syncCrmAudience,
    onError: requestErrorHandling,
    onSuccess: (audience) => {
      invalidate();
      notify(audience);
    },
  });
  const remove = useMutation({ mutationFn: metaAdsService.deleteCrmAudience, onError: requestErrorHandling, onSuccess: invalidate });

  const audiences = audiencesQuery.data ?? [];
  const customAudiences = audiences.filter((audience) => audience.kind === "CUSTOM" && audience.metaAudienceId);
  const allowsControl = kind === "CUSTOM" && controlSources.includes(source);
  const isValid = name.trim() !== "" && (kind === "CUSTOM" || !!originAudienceId);

  return (
    <section className="space-y-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <Users className="text-primary h-4 w-4" />
        <h3 className="text-sm font-semibold">Públicos do CRM</h3>
        {can("ads.manage") && !isCreating && (
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4" />
            Novo público
          </Button>
        )}
      </div>
      <p className="text-muted-foreground text-xs">
        Os telefones vão para a Meta só em hash. Use para excluir quem já comprou ou está negociando, ou para achar pessoas parecidas com os
        clientes. Categorias especiais (crédito, emprego, moradia) não aceitam semelhantes.
      </p>

      {isCreating && (
        <div className="space-y-2 rounded-md border border-dashed p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1">
              <Label htmlFor="crm-audience-name" className="text-xs">
                Nome
              </Label>
              <Input id="crm-audience-name" maxLength={200} value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="crm-audience-kind" className="text-xs">
                Tipo
              </Label>
              <select
                id="crm-audience-kind"
                className={selectClassName}
                value={kind}
                onChange={(event) => setKind(event.target.value as AdCrmAudienceKind)}
              >
                <option value="CUSTOM">Contatos do CRM</option>
                <option value="LOOKALIKE" disabled={customAudiences.length === 0}>
                  Semelhante a um público do CRM
                </option>
              </select>
            </div>
            {kind === "CUSTOM" ? (
              <>
                <div className="grid gap-1">
                  <Label htmlFor="crm-audience-source" className="text-xs">
                    Quem entra
                  </Label>
                  <select
                    id="crm-audience-source"
                    className={selectClassName}
                    value={source}
                    onChange={(event) => setSource(event.target.value as AdCrmAudienceSource)}
                  >
                    {(Object.keys(sourceLabel) as AdCrmAudienceSource[]).map((option) => (
                      <option key={option} value={option}>
                        {sourceLabel[option]}
                      </option>
                    ))}
                  </select>
                  <p className="text-muted-foreground text-xs">{sourceHelp[source]}</p>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="crm-audience-pipeline" className="text-xs">
                    Funil
                  </Label>
                  <select
                    id="crm-audience-pipeline"
                    className={selectClassName}
                    value={pipelineId}
                    onChange={(event) => setPipelineId(event.target.value)}
                  >
                    <option value="">Todos os funis</option>
                    {pipelinesQuery.data?.map((pipeline) => (
                      <option key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </option>
                    ))}
                  </select>
                </div>
                {allowsControl && (
                  <div className="grid gap-1 sm:col-span-2">
                    <Label htmlFor="crm-audience-control" className="text-xs">
                      Grupo de controle
                    </Label>
                    <select
                      id="crm-audience-control"
                      className={cn(selectClassName, "sm:max-w-64")}
                      value={controlPercent}
                      onChange={(event) => setControlPercent(Number(event.target.value))}
                    >
                      {controlOptions.map((option) => (
                        <option key={option} value={option}>
                          {option === 0 ? "Sem grupo de controle" : `${option}% do público`}
                        </option>
                      ))}
                    </select>
                    <p className="text-muted-foreground text-xs">
                      Uma parte sorteada não recebe o anúncio. Comparando quanto cada grupo compra, dá para ver as vendas que o anúncio
                      realmente traz.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid gap-1">
                  <Label htmlFor="crm-audience-origin" className="text-xs">
                    Parecido com
                  </Label>
                  <select
                    id="crm-audience-origin"
                    className={selectClassName}
                    value={originAudienceId}
                    onChange={(event) => setOriginAudienceId(event.target.value)}
                  >
                    <option value="">Escolha</option>
                    {customAudiences.map((audience) => (
                      <option key={audience.id} value={audience.id}>
                        {audience.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="crm-audience-ratio" className="text-xs">
                    Tamanho: {ratioPercent}% do Brasil (1% é o mais parecido)
                  </Label>
                  <input
                    id="crm-audience-ratio"
                    type="range"
                    min={1}
                    max={10}
                    value={ratioPercent}
                    onChange={(event) => setRatioPercent(Number(event.target.value))}
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={!isValid || create.isPending}
              onClick={() =>
                create.mutate({
                  params,
                  body:
                    kind === "CUSTOM"
                      ? {
                          name: name.trim(),
                          kind,
                          source,
                          pipelineId: pipelineId || null,
                          ...(allowsControl && controlPercent > 0 && { controlPercent }),
                        }
                      : { name: name.trim(), kind, originAudienceId, ratio: ratioPercent / 100 },
                })
              }
            >
              {create.isPending ? "Enviando…" : "Criar na Meta"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsCreating(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {audiencesQuery.isLoading && <LoadingState className="justify-start py-2" />}
      {audiences.length === 0 && !audiencesQuery.isLoading && <p className="text-muted-foreground text-sm">Nenhum público do CRM ainda.</p>}
      <ul className="divide-y">
        {audiences.map((audience) => (
          <li key={audience.id} className="flex flex-wrap items-center gap-2 py-2">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                {audience.name}
                {audience.controlPercent > 0 && (
                  <span className="rounded bg-sky-50 px-1.5 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-300">
                    Controle {audience.controlPercent}%
                  </span>
                )}
              </p>
              <p className="text-muted-foreground text-xs">
                {audience.kind === "LOOKALIKE"
                  ? `Semelhante (${Math.round((audience.ratio ?? 0.01) * 100)}%)`
                  : `${sourceLabel[audience.source ?? "WON"]} · ${audience.contactsCount.toLocaleString("pt-BR")} contatos`}
                {audience.lastSyncedAt && ` · enviado em ${format(new Date(audience.lastSyncedAt), "dd/MM HH:mm")}`}
              </p>
              {audience.error && (
                <p className={cn("text-xs", audience.status === "FAILED" ? "text-destructive" : "text-amber-700 dark:text-amber-400")}>
                  {audience.error}
                </p>
              )}
            </div>
            {audience.controlPercent > 0 && (
              <Button size="sm" variant="outline" className="h-8" onClick={() => setLiftAudience(audience)}>
                <BarChart3 className="h-4 w-4" />
                Ver resultado
              </Button>
            )}
            {can("ads.manage") && (
              <>
                {audience.kind === "CUSTOM" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label={`Atualizar ${audience.name}`}
                    title="Atualizar com os contatos atuais"
                    disabled={sync.isPending}
                    onClick={() => sync.mutate({ params: { clientId: client.id, audienceId: audience.id } })}
                  >
                    <RefreshCw className={cn("h-4 w-4", sync.isPending && "animate-spin")} />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Tirar ${audience.name}`}
                  title="Tirar do ZapMonitor (na Meta o público continua)"
                  disabled={remove.isPending}
                  onClick={() => remove.mutate({ params: { clientId: client.id, audienceId: audience.id } })}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
          </li>
        ))}
      </ul>
      <AudienceLiftDialog account={account} audience={liftAudience} onOpenChange={(open) => !open && setLiftAudience(null)} />
    </section>
  );
};
