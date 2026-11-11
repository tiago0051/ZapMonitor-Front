import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Rocket } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { fieldSelectClassName } from "../campaign/campaignUtils";
import { PilotCreativeApproval } from "./pilotCreativeApproval";
import { pilotRunStatusInfo, pilotStepLabel, pilotTextareaClassName } from "./pilotUtils";

type Props = {
  account: AdAccount;
  brand: AdBrandProfile;
  configurations: { id: string; phoneNumber: string }[];
  pages: { metaPageId: string; name: string }[];
  onOpenDraft: (draftId: string) => void;
};

/**
 * O usuário dá o teto de verba; a IA lê o histórico e gera os criativos. Depois que o usuário aprova, o piloto monta a campanha
 * (de teste, se não houver histórico) só com os aprovados.
 */
export const PilotCampaign: FC<Props> = ({ account, brand, configurations, pages, onOpenDraft }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const [budget, setBudget] = useState("");
  const [goal, setGoal] = useState("");
  const [notes, setNotes] = useState("");
  const [whatsappConfigurationId, setWhatsappConfigurationId] = useState(brand.whatsappConfigurationId ?? "");
  const [metaPageId, setMetaPageId] = useState(brand.metaPageId ?? "");
  const [creativeFormat, setCreativeFormat] = useState<AdPilotFormatChoice>("IMAGE");

  const runsQuery = useQuery({
    queryKey: ["metaAds", "pilotRuns", client.id, account.id],
    queryFn: () => metaAdsService.findPilotRuns({ params }),
    // Enquanto uma execução roda, acompanha as etapas
    refetchInterval: (query) => (query.state.data?.some((run) => run.status === "RUNNING") ? 4000 : false),
  });
  const request = useMutation({
    mutationFn: () =>
      metaAdsService.requestPilotCampaign({
        params,
        body: {
          maxDailyBudget: Number(budget.replace(",", ".")),
          goal: goal.trim() || null,
          notes: notes.trim() || null,
          whatsappConfigurationId: whatsappConfigurationId || null,
          metaPageId: metaPageId || null,
          format: creativeFormat,
        },
      }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotRuns", client.id, account.id] });
      toast.success("O piloto começou a gerar os criativos. Leva alguns minutos; depois é só aprovar.");
    },
  });

  const runs = (runsQuery.data ?? []).filter((run) => run.kind === "CAMPAIGN");
  // Criativos esperando aprovação seguram uma nova montagem, para não gerar imagens em dobro
  const isRunning = runs.some((run) => run.status === "RUNNING" || run.status === "AWAITING_APPROVAL");
  const budgetValue = Number(budget.replace(",", "."));
  const hasBase = !!brand.profile || !!brand.baseText?.trim();
  const canRequest = can("ads.manage") && hasBase && budgetValue >= 1 && !isRunning && !request.isPending;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">4. Montar campanha</h2>
        <p className="text-muted-foreground text-sm">
          Primeiro o piloto gera os criativos e mostra para você aprovar, recusar ou ajustar os textos. Depois monta a campanha só com os
          aprovados: sem histórico, um teste com 2 conjuntos por 7 a 10 dias; com histórico, repete o que vendeu. A campanha vira um
          rascunho em Criar campanha: nada vai para a Meta sem a sua revisão.
        </p>
      </div>

      {can("ads.manage") && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="grid gap-1">
              <Label htmlFor="pilot-budget" className="text-xs">
                Teto de verba por dia ({account.currency})
              </Label>
              <Input
                id="pilot-budget"
                inputMode="decimal"
                placeholder="Ex.: 50"
                value={budget}
                onChange={(event) => setBudget(event.target.value)}
              />
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pilot-number" className="text-xs">
                Número de WhatsApp
              </Label>
              <select
                id="pilot-number"
                className={fieldSelectClassName}
                value={whatsappConfigurationId}
                onChange={(event) => setWhatsappConfigurationId(event.target.value)}
              >
                <option value="">Escolher depois</option>
                {configurations.map((configuration) => (
                  <option key={configuration.id} value={configuration.id}>
                    {configuration.phoneNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pilot-campaign-page" className="text-xs">
                Página ligada ao número
              </Label>
              <select
                id="pilot-campaign-page"
                className={fieldSelectClassName}
                value={metaPageId}
                onChange={(event) => setMetaPageId(event.target.value)}
              >
                <option value="">A da identidade</option>
                {pages.map((page) => (
                  <option key={page.metaPageId} value={page.metaPageId}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="pilot-goal" className="text-xs">
                Objetivo (opcional)
              </Label>
              <Input
                id="pilot-goal"
                placeholder="Ex.: vender consignado INSS"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-1">
            <Label htmlFor="pilot-format" className="text-xs">
              Formato dos criativos
            </Label>
            <select
              id="pilot-format"
              className={cn(fieldSelectClassName, "w-full sm:w-72")}
              value={creativeFormat}
              onChange={(event) => setCreativeFormat(event.target.value as AdPilotFormatChoice)}
            >
              <option value="IMAGE">Imagens</option>
              <option value="VIDEO">Vídeos (a IA escreve o roteiro)</option>
              <option value="MIXED">Imagens e vídeos (a IA escolhe)</option>
            </select>
            {creativeFormat !== "IMAGE" && (
              <p className="text-muted-foreground text-xs">
                Para vídeo, a IA escreve o roteiro e você revisa antes. O vídeo só é gerado depois que o roteiro é aprovado, até 2 por
                campanha, e leva alguns minutos cada.
              </p>
            )}
          </div>
          <div className="grid gap-1">
            <Label htmlFor="pilot-notes" className="text-xs">
              Pedido para a IA (opcional)
            </Label>
            <textarea
              id="pilot-notes"
              className={cn(pilotTextareaClassName, "min-h-16")}
              rows={2}
              maxLength={2000}
              placeholder="Ex.: crie uma campanha com os 3 criativos de maior CTR; use os vencedores e um criativo novo; foco em Curitiba"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
            <p className="text-muted-foreground text-xs">
              A IA vê todos os anúncios da conta com CTR, vendas e veredito (vencedor, perdedor ou em aprendizado) e pode reaproveitar a
              imagem ou o vídeo deles. O pedido vale acima das regras do modo; só o teto de verba e as políticas da Meta valem acima dele.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={!canRequest} onClick={() => request.mutate()}>
              <Rocket className="h-4 w-4" />
              Gerar criativos com o piloto
            </Button>
            {!hasBase && <p className="text-muted-foreground text-xs">Preencha a base da marca primeiro.</p>}
            <p className="text-muted-foreground text-xs">Cada imagem e cada vídeo gerado consome a cota de IA.</p>
          </div>
        </div>
      )}

      {runs.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {runs.map((run) => (
            <li key={run.id} className="flex flex-wrap items-start gap-3 p-3">
              <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", pilotRunStatusInfo[run.status].className)}>
                {pilotRunStatusInfo[run.status].label}
              </span>
              <div className="min-w-0 flex-1 text-sm">
                <p>
                  {run.mode === "TEST" ? "Campanha de teste" : run.mode === "SCALE" ? "Campanha de escala" : "Campanha"}
                  {run.maxDailyBudget !== null && ` · teto de ${run.maxDailyBudget} ${account.currency}/dia`}
                  <span className="text-muted-foreground text-xs"> · {format(new Date(run.startedAt), "dd/MM HH:mm")}</span>
                </p>
                {run.status === "RUNNING" && (
                  <p className="text-muted-foreground flex items-center gap-1 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {run.step ? pilotStepLabel[run.step] : "Na fila"}…
                  </p>
                )}
                {run.summary && <p className="text-muted-foreground text-xs">{run.summary}</p>}
                {run.error && <p className="text-destructive text-xs">{run.error}</p>}
                {run.status === "AWAITING_APPROVAL" && <PilotCreativeApproval account={account} run={run} />}
              </div>
              {run.draftId && (
                <Button size="sm" variant="outline" onClick={() => onOpenDraft(run.draftId!)}>
                  Revisar rascunho
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
