import { EmptyState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, Sparkles, Trash2, Upload } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { adPlatformLabel } from "../adsUtils";
import { AdsVideoScripts } from "./adsVideoScripts";

const textarea = "border-input bg-background min-h-16 w-full rounded-md border px-3 py-2 text-sm";

const STATUS_LABEL: Record<AdVideoCampaignStatus, string> = {
  DRAFT: "Rascunho",
  PUBLISHING: "Publicando",
  PUBLISHED: "Publicada pausada",
  FAILED: "Falhou",
};

const lines = (text: string) =>
  text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

/**
 * Campanhas de vídeo do YouTube (Demand Gen) e do TikTok: o gestor dá o objetivo, a verba e os vídeos, a IA escreve os
 * textos e a publicação cria tudo pausado, com o link rastreado como destino.
 */
export const AdsVideoCampaigns: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const params = { clientId: client.id, accountId: account.id };
  const campaignsQuery = useQuery({
    queryKey: ["metaAds", "videoCampaigns", client.id, account.id],
    queryFn: () => adsPlatformService.findVideoCampaigns({ params }),
  });

  return (
    <div className="space-y-8">
      <VideoPilotToggle account={account} />
      <AdsVideoScripts account={account} />
      {can("ads.manage") && <NewVideoCampaign account={account} />}

      <section className="space-y-3">
        <h2 className="text-base font-semibold">Campanhas montadas aqui</h2>
        {campaignsQuery.isLoading && <LoadingState className="justify-start py-2" />}
        {campaignsQuery.data?.length === 0 && (
          <EmptyState
            title="Nenhuma campanha ainda"
            description="Monte a primeira acima: a IA escreve os textos e você revisa antes de publicar."
          />
        )}
        {(campaignsQuery.data ?? []).map((campaign) => (
          <VideoCampaignCard key={`${campaign.id}-${campaign.status}`} campaign={campaign} account={account} />
        ))}
      </section>
    </div>
  );
};

const NewVideoCampaign: FC<{ account: AdAccount }> = ({ account }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const isGoogle = account.platform === "GOOGLE";
  const params = { clientId: client.id, accountId: account.id };
  const [form, setForm] = useState({
    objective: "",
    dailyBudget: "50",
    whatsappConfigurationId: "",
    message: "Olá! Vi o anúncio e quero saber mais",
    businessName: "",
    youtubeLinks: "",
  });
  const [videos, setVideos] = useState<AdVideoCampaignVideo[]>([]);
  const [sparkCode, setSparkCode] = useState("");
  // YouTube: o id entra na lista de links; TikTok: na lista de vídeos enviados
  const addVideo = (video: AdVideoCampaignVideo) =>
    isGoogle
      ? setForm((current) => ({ ...current, youtubeLinks: [current.youtubeLinks.trim(), video.id].filter(Boolean).join("\n") }))
      : setVideos((current) => [...current, video]);
  const [logoAsset, setLogoAsset] = useState<string | null>(null);

  const configurationsQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id, "ads"],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
  });

  const uploadVideo = useMutation({
    mutationFn: adsPlatformService.uploadVideo,
    onError: requestErrorHandling,
    onSuccess: (video) => {
      addVideo(video);
      toast.success(isGoogle ? "Vídeo enviado ao YouTube como não listado" : "Vídeo enviado ao TikTok");
    },
  });
  const authorizeSpark = useMutation({
    mutationFn: adsPlatformService.authorizeSparkPost,
    onError: requestErrorHandling,
    onSuccess: (video) => {
      addVideo(video);
      setSparkCode("");
      toast.success("Post do criador autorizado para Spark Ads");
    },
  });
  const uploadLogo = useMutation({
    mutationFn: adsPlatformService.uploadLogo,
    onError: requestErrorHandling,
    onSuccess: (data) => {
      setLogoAsset(data.logoAsset);
      toast.success("Logo enviada ao Google Ads");
    },
  });
  const create = useMutation({
    mutationFn: adsPlatformService.createVideoCampaign,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "videoCampaigns", client.id, account.id] });
      setForm((current) => ({ ...current, objective: "", youtubeLinks: "" }));
      setVideos([]);
      toast.success("Textos prontos. Revise abaixo e publique.");
    },
  });

  const campaignVideos: AdVideoCampaignVideo[] = isGoogle
    ? lines(form.youtubeLinks).map((link, index) => ({ id: link, name: `Vídeo ${index + 1}` }))
    : videos;
  const canCreate =
    form.objective.trim() && Number(form.dailyBudget) > 0 && form.whatsappConfigurationId && campaignVideos.length > 0 && !create.isPending;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Nova campanha de vídeo no {adPlatformLabel[account.platform]}</h2>
        <p className="text-muted-foreground text-xs">
          Conte o que vender e envie os vídeos. A IA escreve os textos no limite da plataforma; a campanha é publicada pausada, com o link
          rastreado que leva ao WhatsApp, e você liga na aba Campanhas.
        </p>
      </div>

      <form
        className="grid gap-3 rounded-lg border p-3 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (!canCreate) return;
          create.mutate({
            params,
            body: {
              objective: form.objective,
              dailyBudget: Number(form.dailyBudget),
              whatsappConfigurationId: form.whatsappConfigurationId,
              message: form.message,
              businessName: form.businessName,
              logoAsset,
              videos: campaignVideos,
            },
          });
        }}
      >
        <div className="grid gap-1 sm:col-span-2">
          <Label htmlFor="video-objective" className="text-xs">
            O que a campanha deve vender
          </Label>
          <textarea
            id="video-objective"
            className={textarea}
            maxLength={2000}
            placeholder="Ex.: consignado INSS para aposentados de SP, com atendimento pelo WhatsApp"
            value={form.objective}
            onChange={(event) => setForm({ ...form, objective: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="video-budget" className="text-xs">
            Verba por dia ({account.currency})
          </Label>
          <Input
            id="video-budget"
            type="number"
            min={1}
            step="0.01"
            value={form.dailyBudget}
            onChange={(event) => setForm({ ...form, dailyBudget: event.target.value })}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="video-number" className="text-xs">
            Número de WhatsApp
          </Label>
          <select
            id="video-number"
            className={crmSelectClassName}
            value={form.whatsappConfigurationId}
            onChange={(event) => setForm({ ...form, whatsappConfigurationId: event.target.value })}
          >
            <option value="">Escolha</option>
            {(configurationsQuery.data?.items ?? []).map((configuration) => (
              <option key={configuration.id} value={configuration.id}>
                {configuration.phoneNumber}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-1">
          <Label htmlFor="video-message" className="text-xs">
            Mensagem que abre no WhatsApp
          </Label>
          <Input id="video-message" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="video-business" className="text-xs">
            Nome da empresa no anúncio
          </Label>
          <Input
            id="video-business"
            maxLength={isGoogle ? 25 : 40}
            value={form.businessName}
            onChange={(event) => setForm({ ...form, businessName: event.target.value })}
          />
        </div>

        {isGoogle ? (
          <>
            <div className="grid gap-1 sm:col-span-2">
              <Label htmlFor="video-youtube" className="text-xs">
                Links dos vídeos no YouTube (um por linha; podem ser não listados)
              </Label>
              <textarea
                id="video-youtube"
                className={textarea}
                placeholder="https://youtube.com/shorts/..."
                value={form.youtubeLinks}
                onChange={(event) => setForm({ ...form, youtubeLinks: event.target.value })}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="video-youtube-file" className="text-muted-foreground text-xs">
                  Ou envie o arquivo ao canal (fica não listado):
                </Label>
                <Input
                  id="video-youtube-file"
                  type="file"
                  accept="video/*"
                  className="w-auto"
                  disabled={uploadVideo.isPending}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) uploadVideo.mutate({ params, file });
                    event.target.value = "";
                  }}
                />
                {uploadVideo.isPending && <span className="text-muted-foreground text-xs">Enviando ao YouTube…</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              <Label htmlFor="video-logo" className="text-xs">
                Logo quadrada (exigida pelo Demand Gen)
              </Label>
              <Input
                id="video-logo"
                type="file"
                accept="image/png,image/jpeg"
                className="w-auto"
                disabled={uploadLogo.isPending}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadLogo.mutate({ params, file });
                  event.target.value = "";
                }}
              />
              {logoAsset && <Badge variant="secondary">Logo enviada</Badge>}
            </div>
          </>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="video-file" className="text-xs">
              Vídeos verticais (até 200 MB cada, até 5)
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                className="w-auto"
                disabled={uploadVideo.isPending || videos.length >= 5}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadVideo.mutate({ params, file });
                  event.target.value = "";
                }}
              />
              {uploadVideo.isPending && (
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Upload className="h-3 w-3 animate-pulse" />
                  Enviando ao TikTok…
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div className="grid min-w-0 flex-1 gap-1">
                <Label htmlFor="video-spark" className="text-xs">
                  Ou use o post de um criador (Spark Ads): cole o código que ele gerou no app
                </Label>
                <Input id="video-spark" value={sparkCode} onChange={(event) => setSparkCode(event.target.value)} />
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!sparkCode.trim() || authorizeSpark.isPending || videos.length >= 5}
                onClick={() => authorizeSpark.mutate({ params, body: { authCode: sparkCode.trim() } })}
              >
                Autorizar post
              </Button>
            </div>
            {videos.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {videos.map((video) => (
                  <li key={video.id}>
                    <Badge variant="secondary" className="gap-1">
                      {video.kind === "SPARK" ? `Spark: ${video.name}` : video.name}
                      <button
                        type="button"
                        aria-label={`Tirar ${video.name}`}
                        onClick={() => setVideos((current) => current.filter((item) => item.id !== video.id))}
                      >
                        ×
                      </button>
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <GeneratedVideosPicker account={account} onUse={addVideo} />

        <div className="sm:col-span-2">
          <Button type="submit" size="sm" disabled={!canCreate}>
            <Sparkles className="h-4 w-4" />
            {create.isPending ? "A IA está escrevendo…" : "Montar com a IA"}
          </Button>
        </div>
      </form>
    </section>
  );
};

const VideoCampaignCard: FC<{ campaign: AdVideoCampaign; account: AdAccount }> = ({ campaign, account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const isGoogle = account.platform === "GOOGLE";
  const params = { clientId: client.id, campaignId: campaign.id };
  const plan = campaign.plan;
  const [draft, setDraft] = useState(() => ({
    campaignName: plan?.campaignName ?? "",
    adTexts: (plan?.adTexts ?? []).join("\n"),
    headlines: (plan?.headlines ?? []).join("\n"),
    longHeadlines: (plan?.longHeadlines ?? []).join("\n"),
    descriptions: (plan?.descriptions ?? []).join("\n"),
  }));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["metaAds", "videoCampaigns", client.id, account.id] });
  const save = useMutation({
    mutationFn: adsPlatformService.updateVideoCampaign,
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Textos salvos");
    },
  });
  const regenerate = useMutation({ mutationFn: adsPlatformService.regenerateVideoPlan, onError: requestErrorHandling, onSuccess: refresh });
  const publish = useMutation({
    mutationFn: adsPlatformService.publishVideoCampaign,
    onError: (error) => {
      refresh();
      requestErrorHandling(error);
    },
    onSuccess: () => {
      refresh();
      queryClient.invalidateQueries({ queryKey: ["metaAds", "structure"] });
      toast.success("Campanha criada pausada. Ligue na aba Campanhas quando quiser.");
    },
  });
  const remove = useMutation({ mutationFn: adsPlatformService.deleteVideoCampaign, onError: requestErrorHandling, onSuccess: refresh });

  const editable = campaign.status === "DRAFT" || campaign.status === "FAILED";
  const blocked = campaign.compliance.filter((issue) => issue.severity === "BLOCK");
  const field = (key: keyof typeof draft, label: string, hint: string) => (
    <div className="grid gap-1">
      <Label htmlFor={`${campaign.id}-${key}`} className="text-xs">
        {label} <span className="text-muted-foreground">({hint})</span>
      </Label>
      <textarea
        id={`${campaign.id}-${key}`}
        className={textarea}
        disabled={!editable}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
      />
    </div>
  );

  return (
    <article className="space-y-3 rounded-lg border p-3">
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="min-w-0 flex-1 truncate text-sm font-semibold">{plan?.campaignName ?? "Campanha de vídeo"}</h3>
        <Badge variant={campaign.status === "FAILED" ? "destructive" : "secondary"}>{STATUS_LABEL[campaign.status]}</Badge>
        <span className="text-muted-foreground text-xs">
          {campaign.request.videos.length} vídeo(s) · {campaign.request.dailyBudget} {account.currency}/dia ·{" "}
          {format(new Date(campaign.createdAt), "dd/MM HH:mm")}
        </span>
      </header>

      <p className="text-muted-foreground text-xs">{campaign.request.objective}</p>
      {plan?.rationale && <p className="text-xs">IA: {plan.rationale}</p>}

      {plan && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1 sm:col-span-2">
            <Label htmlFor={`${campaign.id}-name`} className="text-xs">
              Nome da campanha
            </Label>
            <Input
              id={`${campaign.id}-name`}
              disabled={!editable}
              value={draft.campaignName}
              onChange={(event) => setDraft({ ...draft, campaignName: event.target.value })}
            />
          </div>
          {isGoogle ? (
            <>
              {field("headlines", "Títulos", "até 40 caracteres, um por linha")}
              {field("longHeadlines", "Títulos longos", "até 90, um por linha")}
              {field("descriptions", "Descrições", "até 90, uma por linha")}
            </>
          ) : (
            field("adTexts", "Texto de cada anúncio", "até 100 caracteres, um por vídeo")
          )}
        </div>
      )}

      {campaign.compliance.length > 0 && (
        <ul className="space-y-1 text-xs">
          {campaign.compliance.map((issue, index) => (
            <li key={index} className={issue.severity === "BLOCK" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}>
              <AlertTriangle className="mr-1 inline h-3 w-3" />
              {issue.message} {issue.excerpt && `Trecho: "${issue.excerpt}".`} {issue.suggestion}
            </li>
          ))}
        </ul>
      )}
      {editable && campaign.missing.length > 0 && <p className="text-muted-foreground text-xs">Falta: {campaign.missing.join("; ")}.</p>}
      {campaign.error && <p className="text-destructive text-xs">{campaign.error}</p>}
      {campaign.status === "PUBLISHED" && (
        <p className="text-xs">
          Criada pausada no {adPlatformLabel[account.platform]} (campanha {campaign.result.campaignId}). A primeira sincronização traz para
          a aba Campanhas, onde você liga.
        </p>
      )}

      {editable && can("ads.manage") && (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={save.isPending}
            onClick={() =>
              save.mutate({
                params,
                body: {
                  plan: {
                    campaignName: draft.campaignName,
                    adTexts: lines(draft.adTexts),
                    headlines: lines(draft.headlines),
                    longHeadlines: lines(draft.longHeadlines),
                    descriptions: lines(draft.descriptions),
                  },
                },
              })
            }
          >
            Salvar textos
          </Button>
          <Button size="sm" variant="outline" disabled={regenerate.isPending} onClick={() => regenerate.mutate({ params })}>
            <Sparkles className="h-4 w-4" />
            {regenerate.isPending ? "Reescrevendo…" : "Reescrever com a IA"}
          </Button>
          {can("ads.approve") && (
            <Button
              size="sm"
              disabled={publish.isPending || campaign.missing.length > 0 || blocked.length > 0}
              onClick={() => publish.mutate({ params })}
            >
              {publish.isPending ? "Publicando…" : "Publicar pausada"}
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            aria-label="Apagar rascunho"
            disabled={remove.isPending}
            onClick={() => remove.mutate({ params })}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </article>
  );
};

/** Revisão diária dos vídeos: propõe trocar os fracos (com roteiros novos) e pausar quando o grupo tem outros no ar. */
const VideoPilotToggle: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const pilotQuery = useQuery({
    queryKey: ["metaAds", "videoPilot", client.id, account.id],
    queryFn: () => adsPlatformService.findVideoPilot({ params }),
  });
  const setPilot = useMutation({
    mutationFn: adsPlatformService.setVideoPilot,
    onError: requestErrorHandling,
    onSuccess: (data) => queryClient.setQueryData(["metaAds", "videoPilot", client.id, account.id], data),
  });

  return (
    <section className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-sm font-semibold">Piloto automático de vídeo</h2>
        <p className="text-muted-foreground text-xs">
          Todo dia de manhã, os vídeos que perderam na régua de vendas ou cansaram ganham 3 roteiros novos em Sugestões, e a pausa do vídeo
          fraco vai para Mudanças quando o grupo tem outros no ar. Nada é aplicado sem aprovação.
        </p>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <Switch
          checked={!!pilotQuery.data?.enabled}
          disabled={!can("ads.manage") || setPilot.isPending || pilotQuery.isLoading}
          onCheckedChange={(enabled) => setPilot.mutate({ params, body: { enabled } })}
        />
        {pilotQuery.data?.enabled ? "Ligado" : "Desligado"}
      </label>
    </section>
  );
};

/** Vídeos gerados pela IA prontos para entrar na campanha; o envio à plataforma acontece ao usar. */
const GeneratedVideosPicker: FC<{ account: AdAccount; onUse: (video: AdVideoCampaignVideo) => void }> = ({ account, onUse }) => {
  const { client } = useClientContext();
  const generationsQuery = useQuery({
    queryKey: ["metaAds", "videoGenerations", client.id, account.id],
    queryFn: () => adsPlatformService.findVideoGenerations({ params: { clientId: client.id, accountId: account.id } }),
  });
  const send = useMutation({
    mutationFn: adsPlatformService.sendGeneratedVideo,
    onError: requestErrorHandling,
    onSuccess: (video) => {
      onUse(video);
      toast.success("Vídeo da IA enviado e adicionado à campanha");
    },
  });
  const ready = (generationsQuery.data ?? []).filter((generation) => generation.status === "DONE");
  if (!ready.length) return null;

  return (
    <div className="space-y-1 sm:col-span-2">
      <p className="text-xs font-medium">Vídeos gerados pela IA</p>
      <ul className="flex flex-wrap gap-2">
        {ready.map((generation) => (
          <li key={generation.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
            {generation.url ? (
              <a href={generation.url} target="_blank" rel="noreferrer" className="underline">
                {format(new Date(generation.createdAt), "dd/MM HH:mm")}
              </a>
            ) : (
              format(new Date(generation.createdAt), "dd/MM HH:mm")
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              disabled={send.isPending}
              onClick={() => send.mutate({ params: { clientId: client.id, generationId: generation.id } })}
            >
              Usar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
};
