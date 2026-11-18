import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Rocket, Target } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { clearPilotPrefill, takePilotPrefill } from "../../strategies/strategyUtils";
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
  // Aberto pelo passo de uma estratégia: objetivo, notas e teto vêm do briefing e da verba do mês, e a campanha nasce marcada
  const [strategyPrefill, setStrategyPrefill] = useState(() => takePilotPrefill(client.id));
  const [budget, setBudget] = useState(() =>
    strategyPrefill?.maxDailyBudget ? String(strategyPrefill.maxDailyBudget).replace(".", ",") : "",
  );
  const [goal, setGoal] = useState(strategyPrefill?.goal ?? "");
  const [notes, setNotes] = useState(strategyPrefill?.notes ?? "");
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
          strategyStepId: strategyPrefill?.strategyStepId ?? null,
        },
      }),
    onError: requestErrorHandling,
    onSuccess: () => {
      if (strategyPrefill) {
        clearPilotPrefill();
        setStrategyPrefill(null);
        queryClient.invalidateQueries({ queryKey: ["marketingStrategy", client.id] });
      }
      queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotRuns", client.id, account.id] });
      toast.success("O piloto está montando a campanha. Em alguns minutos o rascunho fica pronto para você ligar as artes.");
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
          Dê o comando e o piloto monta a campanha inteira — conjuntos, públicos, verba, textos e o prompt da arte de cada anúncio — sem
          gerar nenhuma imagem ou vídeo. Sem histórico, um teste com 2 conjuntos por 7 a 10 dias; com histórico, repete o que vendeu. No
          rascunho, em cada anúncio, você escolhe uma arte existente ou abre o estúdio com o prompt já preenchido e gera só quando quiser.
          Nada vai para a Meta sem a sua revisão.
        </p>
      </div>

      {can("ads.manage") && strategyPrefill && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-sky-300 bg-sky-50 p-3 text-sm dark:border-sky-800 dark:bg-sky-950">
          <Target className="h-4 w-4 shrink-0 text-sky-700 dark:text-sky-300" aria-hidden />
          <p className="min-w-0 flex-1">
            Campanha do passo <strong>{strategyPrefill.label}</strong>. A campanha e os conjuntos vão levar a marca da estratégia no nome.
            {strategyPrefill.maxDailyBudget
              ? ` O teto por dia veio da verba do mês da estratégia (${strategyPrefill.maxDailyBudget.toLocaleString("pt-BR")} ${account.currency}); ajuste se quiser.`
              : ""}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              clearPilotPrefill();
              setStrategyPrefill(null);
            }}
          >
            Não ligar à estratégia
          </Button>
        </div>
      )}

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
                Para vídeo, a IA escreve o roteiro e ele vira o prompt do anúncio. O vídeo só é gerado quando você pedir no estúdio, e leva
                alguns minutos cada.
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
              Montar campanha com o piloto
            </Button>
            {!hasBase && <p className="text-muted-foreground text-xs">Preencha a base da marca primeiro.</p>}
            <p className="text-muted-foreground text-xs">
              Montar não gera artes; cada imagem e vídeo criado no estúdio consome a cota de IA.
            </p>
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
                {run.status !== "AWAITING_APPROVAL" && run.creatives.some((creative) => creative.videoUrl) && (
                  // Depois de aprovado, o vídeo é gerado na montagem: aqui dá para assistir o que entrou na campanha
                  <div className="flex flex-wrap gap-3 pt-2">
                    {run.creatives
                      .filter((creative) => creative.videoUrl)
                      .map((creative) => (
                        <figure key={creative.key} className="w-36 space-y-1">
                          <video
                            src={creative.videoUrl!}
                            controls
                            playsInline
                            preload="metadata"
                            className="aspect-[9/16] w-full rounded bg-black object-contain"
                          />
                          <figcaption className="text-muted-foreground truncate text-xs" title={creative.name}>
                            {creative.name}
                          </figcaption>
                          <a href={creative.videoUrl!} target="_blank" rel="noreferrer" className="text-primary text-xs underline">
                            Abrir em outra aba
                          </a>
                        </figure>
                      ))}
                  </div>
                )}
              </div>
              {run.draftId && (
                <Button size="sm" variant="outline" onClick={() => onOpenDraft(run.draftId!)}>
                  {run.creatives.some((creative) => creative.prompt && !creative.assetId)
                    ? "Abrir rascunho e criar as artes"
                    : "Revisar rascunho"}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
