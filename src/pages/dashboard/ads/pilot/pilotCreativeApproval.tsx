import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, Rocket, X } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { assetOriginLabel, pilotTextareaClassName } from "./pilotUtils";

type Props = { account: AdAccount; run: AdPilotRun };

type Draft = {
  approved: boolean;
  primaryText: string;
  headline: string;
  description: string;
  welcomeMessage: string;
  script: AdPilotVideoScript | null;
};

type Scene = NonNullable<AdPilotVideoScript["cenas"]>[number];

// Vídeo é aprovado pelo roteiro (gerado depois); imagem precisa já estar pronta
const canApprove = (creative: AdPilotRunCreative) => (creative.format === "VIDEO" ? !!creative.script : !!creative.assetId);

/**
 * Criativos gerados pelo piloto: o usuário aprova, recusa ou ajusta os textos e os roteiros dos vídeos, e só os aprovados entram
 * na campanha.
 */
export const PilotCreativeApproval: FC<Props> = ({ account, run }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("ads.manage");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      run.creatives.map((creative) => [
        creative.key,
        {
          // Na primeira vez os que têm imagem ou roteiro já vêm marcados; numa nova tentativa, vale a decisão anterior
          approved: creative.status === "PENDING" ? canApprove(creative) : creative.status === "APPROVED",
          primaryText: creative.primaryText,
          headline: creative.headline,
          description: creative.description ?? "",
          welcomeMessage: creative.welcomeMessage,
          script: creative.script,
        },
      ]),
    ),
  );
  const update = (key: string, changes: Partial<Draft>) => setDrafts((current) => ({ ...current, [key]: { ...current[key], ...changes } }));
  const updateScript = (key: string, changes: Partial<AdPilotVideoScript>) =>
    setDrafts((current) => ({ ...current, [key]: { ...current[key], script: { ...current[key].script, ...changes } } }));
  const updateScene = (key: string, index: number, changes: Partial<Scene>) =>
    setDrafts((current) => {
      const cenas = [...(current[key].script?.cenas ?? [])];
      cenas[index] = { ...cenas[index], ...changes };
      return { ...current, [key]: { ...current[key], script: { ...current[key].script, cenas } } };
    });

  const decide = useMutation({
    mutationFn: (approveAny: boolean) =>
      metaAdsService.decidePilotCreatives({
        params: { clientId: client.id },
        runId: run.id,
        creatives: run.creatives.map((creative) => {
          const draft = drafts[creative.key];
          return {
            key: creative.key,
            approved: approveAny && draft.approved,
            primaryText: draft.primaryText,
            headline: draft.headline,
            description: draft.description.trim() || null,
            welcomeMessage: draft.welcomeMessage,
            ...(creative.format === "VIDEO" && { script: draft.script }),
          };
        }),
      }),
    onError: requestErrorHandling,
    onSuccess: (_, approveAny) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotRuns", client.id, account.id] });
      toast.success(approveAny ? "O piloto está montando a campanha com os criativos aprovados" : "Criativos recusados");
    },
  });

  const approved = run.creatives.filter((creative) => canApprove(creative) && drafts[creative.key]?.approved);
  const videosToGenerate = approved.filter((creative) => creative.format === "VIDEO" && !creative.assetId).length;

  return (
    <div className="space-y-3 pt-2">
      <div className="grid gap-3 xl:grid-cols-2">
        {run.creatives.map((creative) => {
          const draft = drafts[creative.key];
          const isVideo = creative.format === "VIDEO";
          const disabled = !canManage || !canApprove(creative) || decide.isPending;
          return (
            <article
              key={creative.key}
              className={cn("flex flex-col gap-3 rounded-lg border p-3 sm:flex-row", !draft.approved && "opacity-70")}
            >
              {creative.videoUrl ? (
                <video
                  src={creative.videoUrl}
                  controls
                  playsInline
                  className="aspect-[9/16] w-full max-w-48 shrink-0 rounded bg-black object-contain sm:w-36"
                />
              ) : creative.assetPreviewUrl ? (
                <img
                  src={creative.assetPreviewUrl}
                  alt={`Criativo ${creative.angle}`}
                  className="aspect-square w-full max-w-64 shrink-0 rounded object-cover sm:h-36 sm:w-36"
                />
              ) : (
                <div className="bg-muted text-muted-foreground flex aspect-square w-full max-w-64 shrink-0 flex-col items-center justify-center gap-1 rounded p-2 text-center text-xs sm:h-36 sm:w-36">
                  {isVideo && <Film className="h-5 w-5" />}
                  {isVideo ? "O vídeo é gerado depois que o roteiro for aprovado" : creative.assetId ? "Sem prévia" : "Imagem não gerada"}
                </div>
              )}
              <div className="min-w-0 flex-1 space-y-2 text-sm">
                <label className="flex cursor-pointer flex-wrap items-center gap-2">
                  <Checkbox
                    checked={draft.approved}
                    disabled={disabled}
                    onCheckedChange={(checked) => update(creative.key, { approved: checked === true })}
                  />
                  <span className="font-medium">{creative.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {isVideo ? "Vídeo" : "Imagem"} · {creative.angle}
                    {creative.assetOrigin && ` · ${assetOriginLabel[creative.assetOrigin]}`}
                  </span>
                </label>
                {creative.error && <p className="text-destructive text-xs">{creative.error}</p>}

                {isVideo && draft.script && (
                  <fieldset className="space-y-2 rounded-md border p-2" disabled={disabled}>
                    <legend className="px-1 text-xs font-medium">Roteiro do vídeo</legend>
                    <div className="grid gap-1">
                      <Label htmlFor={`${creative.key}-hook`} className="text-xs">
                        Abertura (2 primeiros segundos)
                      </Label>
                      <Input
                        id={`${creative.key}-hook`}
                        maxLength={400}
                        value={draft.script.gancho ?? ""}
                        onChange={(event) => updateScript(creative.key, { gancho: event.target.value })}
                      />
                    </div>
                    {(draft.script.cenas ?? []).map((scene, index) => (
                      <div key={index} className="bg-muted/40 grid gap-1 rounded p-2">
                        <p className="text-muted-foreground text-xs">
                          Cena {index + 1}
                          {scene.tempo && ` · ${scene.tempo}`}
                        </p>
                        <Input
                          aria-label={`Fala da cena ${index + 1}`}
                          placeholder="Fala"
                          maxLength={400}
                          value={scene.fala ?? ""}
                          onChange={(event) => updateScene(creative.key, index, { fala: event.target.value })}
                        />
                        <Input
                          aria-label={`Legenda da cena ${index + 1}`}
                          placeholder="Texto na tela"
                          maxLength={200}
                          value={scene.legenda ?? ""}
                          onChange={(event) => updateScene(creative.key, index, { legenda: event.target.value })}
                        />
                        <Input
                          aria-label={`Imagem da cena ${index + 1}`}
                          placeholder="O que aparece na imagem"
                          maxLength={400}
                          value={scene.imagem ?? ""}
                          onChange={(event) => updateScene(creative.key, index, { imagem: event.target.value })}
                        />
                      </div>
                    ))}
                    <div className="grid gap-1">
                      <Label htmlFor={`${creative.key}-cta`} className="text-xs">
                        Chamada final
                      </Label>
                      <Input
                        id={`${creative.key}-cta`}
                        maxLength={300}
                        value={draft.script.chamada ?? ""}
                        onChange={(event) => updateScript(creative.key, { chamada: event.target.value })}
                      />
                    </div>
                    {creative.videoUrl && (
                      <p className="text-muted-foreground text-xs">Se mudar o roteiro, o vídeo é gerado de novo ao montar a campanha.</p>
                    )}
                  </fieldset>
                )}

                <div className="grid gap-1">
                  <Label htmlFor={`${creative.key}-headline`} className="text-xs">
                    Título
                  </Label>
                  <Input
                    id={`${creative.key}-headline`}
                    maxLength={255}
                    disabled={disabled}
                    value={draft.headline}
                    onChange={(event) => update(creative.key, { headline: event.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${creative.key}-text`} className="text-xs">
                    Texto principal
                  </Label>
                  <textarea
                    id={`${creative.key}-text`}
                    className={cn(pilotTextareaClassName, "min-h-20")}
                    rows={3}
                    maxLength={2000}
                    disabled={disabled}
                    value={draft.primaryText}
                    onChange={(event) => update(creative.key, { primaryText: event.target.value })}
                  />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor={`${creative.key}-welcome`} className="text-xs">
                    Mensagem de boas-vindas no WhatsApp
                  </Label>
                  <Input
                    id={`${creative.key}-welcome`}
                    maxLength={500}
                    disabled={disabled}
                    value={draft.welcomeMessage}
                    onChange={(event) => update(creative.key, { welcomeMessage: event.target.value })}
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {canManage && (
        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={approved.length === 0 || decide.isPending} onClick={() => decide.mutate(true)}>
            <Rocket className="h-4 w-4" />
            Montar campanha com {approved.length} criativo(s)
          </Button>
          <Button variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate(false)}>
            <X className="h-4 w-4" />
            Recusar todos
          </Button>
          <p className="text-muted-foreground text-xs">
            {videosToGenerate > 0 && `${videosToGenerate} vídeo(s) serão gerados antes, alguns minutos cada. `}A campanha vira um rascunho
            pausado: nada vai para a Meta sem a sua revisão.
          </p>
        </div>
      )}
    </div>
  );
};
