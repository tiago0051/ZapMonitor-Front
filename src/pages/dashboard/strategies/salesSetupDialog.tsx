import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { marketingStrategyService } from "@/services/api/marketingStrategyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { Link } from "react-router";
import { selectClassName } from "./strategyUtils";

type Props = {
  strategy: MarketingStrategy;
  stepId: string;
  onClose: () => void;
  // Recarrega a estratégia para mostrar os itens ligados
  onDone: () => void;
};

const NEW = "";

/**
 * "Montar a venda": a partir da oferta da estratégia, monta (ou reaproveita) o roteiro e o agente de IA e cria o fluxo SDR
 * inativo, em rascunho. Nada vai para o ar sem a pessoa testar e publicar o fluxo.
 */
export const SalesSetupDialog: FC<Props> = ({ strategy, stepId, onClose, onDone }) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  // Nulo = ainda não escolhido: vale a sugestão (o primeiro funil e grupo, o agente que já vende a oferta, o roteiro da oferta)
  const [pickedPipelineId, setPipelineId] = useState<string | null>(null);
  const [pickedServiceGroupId, setServiceGroupId] = useState<string | null>(null);
  const [pickedAiAgentId, setAiAgentId] = useState<string | null>(null);
  const [pickedSalesScriptId, setSalesScriptId] = useState<string | null>(null);

  const options = useQuery({
    queryKey: ["marketingStrategy", client.id, strategy.id, "salesSetup"],
    queryFn: () => marketingStrategyService.findSalesSetupOptions(client.id, strategy.id),
  });

  const data = options.data;
  const pipelineId = pickedPipelineId ?? data?.pipelines[0]?.id ?? "";
  const serviceGroupId = pickedServiceGroupId ?? data?.serviceGroups[0]?.id ?? "";
  const aiAgentId = pickedAiAgentId ?? data?.linked.aiAgentId ?? data?.aiAgents.find((agent) => agent.sellsOffer)?.id ?? NEW;
  const salesScriptId = pickedSalesScriptId ?? data?.linked.salesScriptId ?? data?.salesScripts[0]?.id ?? NEW;

  const setup = useMutation({
    mutationFn: () =>
      marketingStrategyService.setupSales(client.id, strategy.id, {
        stepId,
        pipelineId,
        serviceGroupId,
        aiAgentId: aiAgentId || null,
        salesScriptId: salesScriptId || null,
      }),
    onError: requestErrorHandling,
    onSuccess: onDone,
  });

  const result = setup.data;
  const canSubmit = !!data && data.blockers.length === 0 && !!pipelineId && !!serviceGroupId && !setup.isPending;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSubmit) setup.mutate();
  };

  return (
    <Dialog open onOpenChange={(open) => !open && !setup.isPending && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Montar a camada de venda</DialogTitle>
          <DialogDescription>
            Roteiro, agente de IA e um fluxo SDR para atender, qualificar e passar os leads para a equipe. O fluxo nasce desligado, em
            rascunho: teste no simulador e publique quando estiver bom.
          </DialogDescription>
        </DialogHeader>

        {options.isLoading && <LoadingState className="py-6" />}
        {options.isError && <ErrorState className="py-6" message="Não foi possível carregar as opções. Tente de novo." />}

        {result ? (
          <div className="grid gap-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-400">
              <CheckCircle2 className="h-4 w-4" />
              Camada de venda montada e ligada à estratégia
            </p>
            <ul className="grid gap-1.5">
              <li>
                Roteiro: <span className="font-medium">{result.salesScript.name}</span>
                {result.salesScript.created && " (novo, escrito pela IA)"}
              </li>
              <li>
                Agente: <span className="font-medium">{result.aiAgent.name}</span>
                {result.aiAgent.created ? " (novo; revise o prompt)" : " (agora também vende a oferta)"}
              </li>
              <li>
                Fluxo: <span className="font-medium">{result.flow.name}</span> (desligado, em rascunho)
              </li>
            </ul>
            {!result.offerHasCriteria && (
              <p className="flex gap-2 rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A oferta ainda não tem critérios de qualificação. Cadastre-os para o
                agente saber quando o lead está pronto para a equipe.
              </p>
            )}
            {result.issues.length > 0 && (
              <div className="rounded-md bg-amber-50 p-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                <p className="font-medium">Ajuste no fluxo antes de publicar:</p>
                <ul className="list-disc pl-5">
                  {result.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}
            <p className="text-muted-foreground">
              Próximos passos: revise o agente, teste o fluxo no simulador, publique e ligue o fluxo ao número ou às campanhas da
              estratégia. Para prospectar, use "Prospectar quem autorizou" no passo: o disparo vai só para quem aceitou receber mensagens e
              as respostas caem no fluxo SDR.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Fechar
              </Button>
              <Button asChild>
                <Link to={`${baseUrl}/configuration/flow/${result.flow.id}`}>Abrir o fluxo</Link>
              </Button>
            </DialogFooter>
          </div>
        ) : (
          data && (
            <form onSubmit={submit} className="grid gap-4">
              {data.blockers.length > 0 && (
                <ul className="list-disc rounded-md bg-amber-50 p-3 pl-7 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  {data.blockers.map((blocker) => (
                    <li key={blocker}>{blocker}</li>
                  ))}
                </ul>
              )}
              {data.offer && (
                <p className="text-sm">
                  Oferta: <span className="font-medium">{data.offer.name}</span>
                  {!data.offer.hasCriteria && (
                    <span className="text-muted-foreground block text-xs">
                      Sem critérios de qualificação ainda.{" "}
                      <Link to={`${baseUrl}/offers`} className="text-primary underline-offset-4 hover:underline">
                        Cadastrar na oferta
                      </Link>
                    </span>
                  )}
                </p>
              )}
              {data.linked.flowId && (
                <p className="text-muted-foreground rounded-md border border-dashed p-2 text-xs">
                  Esta estratégia já tem um fluxo de venda ligado. Montar de novo cria outro fluxo em rascunho.
                </p>
              )}

              <div className="grid gap-1">
                <Label htmlFor="sales-setup-pipeline">Funil onde o agente cria e move os negócios</Label>
                <select
                  id="sales-setup-pipeline"
                  className={selectClassName}
                  value={pipelineId}
                  onChange={(event) => setPipelineId(event.target.value)}
                >
                  {data.pipelines.length === 0 && <option value="">Cadastre um funil no CRM</option>}
                  {data.pipelines.map((pipeline) => (
                    <option key={pipeline.id} value={pipeline.id}>
                      {pipeline.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="sales-setup-group">Grupo que recebe os qualificados e quem pede atendente</Label>
                <select
                  id="sales-setup-group"
                  className={selectClassName}
                  value={serviceGroupId}
                  onChange={(event) => setServiceGroupId(event.target.value)}
                >
                  {data.serviceGroups.length === 0 && <option value="">Cadastre um grupo de atendimento</option>}
                  {data.serviceGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="sales-setup-agent">Agente de IA</Label>
                <select
                  id="sales-setup-agent"
                  className={selectClassName}
                  value={aiAgentId}
                  onChange={(event) => setAiAgentId(event.target.value)}
                >
                  <option value={NEW}>Criar um agente novo (a IA escreve o prompt)</option>
                  {data.aiAgents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name}
                      {agent.sellsOffer ? " · já vende a oferta" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid gap-1">
                <Label htmlFor="sales-setup-script">Roteiro de vendas</Label>
                <select
                  id="sales-setup-script"
                  className={selectClassName}
                  value={salesScriptId}
                  onChange={(event) => setSalesScriptId(event.target.value)}
                >
                  <option value={NEW}>Criar um roteiro novo para a oferta (pela IA)</option>
                  {data.salesScripts.map((script) => (
                    <option key={script.id} value={script.id}>
                      {script.name}
                    </option>
                  ))}
                </select>
                <p className="text-muted-foreground text-xs">O agente segue o roteiro, a menos que já siga outro.</p>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" disabled={setup.isPending} onClick={onClose}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!canSubmit}>
                  {setup.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {setup.isPending ? "Montando…" : "Montar a venda"}
                </Button>
              </DialogFooter>
            </form>
          )
        )}
      </DialogContent>
    </Dialog>
  );
};
