import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { brandIdentityService, socialPostService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addHours, format } from "date-fns";
import {
  ArrowLeft,
  ArrowLeftRight,
  CalendarClock,
  ExternalLink,
  Film,
  ImagePlus,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Palette,
  Trash2,
  Upload,
} from "lucide-react";
import { useRef, useState, type FC } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { CreativeStudioDialog } from "../studio/creativeStudioDialog";
import { toast } from "sonner";
import { PostSetupNotice } from "./postSetupNotice";
import {
  editableStatuses,
  isSocialPostBusy,
  socialFormatLabel,
  socialPlatformLabel,
  socialStatusInfo,
  socialTextareaClassName,
  toLocalInputValue,
} from "./postsUtils";

const CAPTION_LIMIT = 2200;

type PostMutation = (post: SocialPost) => void;

const MediaCard: FC<{ post: SocialPost; media: SocialPostMedia; editable: boolean; onChange: PostMutation; index: number }> = ({
  post,
  media,
  editable,
  onChange,
  index,
}) => {
  const { client } = useClientContext();
  const [editingPrompt, setEditingPrompt] = useState(false);
  const [prompt, setPrompt] = useState(media.prompt ?? "");
  const running = media.status === "QUEUED" || media.status === "RUNNING";

  const regenerate = useMutation({
    mutationFn: () => socialPostService.regenerateImage(client.id, post.id, media.id, prompt.trim() || undefined),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      setEditingPrompt(false);
      onChange(updated);
    },
  });
  const remove = useMutation({
    mutationFn: () => socialPostService.deleteMedia(client.id, post.id, media.id),
    onError: requestErrorHandling,
    onSuccess: onChange,
  });
  const moveFirst = useMutation({
    mutationFn: () =>
      socialPostService.reorderMedia(client.id, post.id, [
        media.id,
        ...post.media.filter((item) => item.id !== media.id).map((item) => item.id),
      ]),
    onError: requestErrorHandling,
    onSuccess: onChange,
  });

  return (
    <article className="grid content-start gap-2 rounded-xl border p-2">
      <div className="relative">
        {media.kind === "VIDEO" && media.url ? (
          <video src={media.url} controls playsInline className="aspect-[9/16] w-full rounded-lg bg-black object-contain" />
        ) : media.url ? (
          <img src={media.url} alt={`Imagem ${index + 1}`} className="aspect-[4/5] w-full rounded-lg object-cover" />
        ) : (
          <div
            className={cn(
              "bg-muted text-muted-foreground grid w-full place-items-center rounded-lg p-4 text-center text-xs",
              media.kind === "VIDEO" ? "aspect-[9/16]" : "aspect-[4/5]",
            )}
          >
            {running ? (
              <span className="grid justify-items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                {media.kind === "VIDEO" ? "A IA está gravando o vídeo (leva alguns minutos)" : "A IA está criando a imagem"}
              </span>
            ) : (
              <span className="text-red-700 dark:text-red-300">{media.error ?? "Não foi possível gerar"}</span>
            )}
          </div>
        )}
        {post.format === "CAROUSEL" && (
          <span className="bg-background/80 absolute top-2 left-2 rounded px-1.5 text-xs font-medium tabular-nums">{index + 1}</span>
        )}
      </div>

      {editingPrompt && (
        <div className="grid gap-1.5">
          <Label htmlFor={`prompt-${media.id}`} className="text-xs">
            O que a imagem deve mostrar
          </Label>
          <textarea
            id={`prompt-${media.id}`}
            value={prompt}
            maxLength={4000}
            onChange={(event) => setPrompt(event.target.value)}
            className={socialTextareaClassName}
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={regenerate.isPending} onClick={() => regenerate.mutate()}>
              Gerar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingPrompt(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {editable && !editingPrompt && (
        <div className="flex flex-wrap gap-1">
          {media.kind === "IMAGE" && media.origin === "GENERATED" && (
            <Button size="sm" variant="ghost" disabled={running} onClick={() => setEditingPrompt(true)}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" aria-hidden />
              Gerar de novo
            </Button>
          )}
          {post.format === "CAROUSEL" && index > 0 && (
            <Button size="sm" variant="ghost" disabled={moveFirst.isPending} onClick={() => moveFirst.mutate()}>
              <ArrowLeftRight className="mr-1 h-3.5 w-3.5" aria-hidden />
              Usar como capa
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            disabled={running || remove.isPending}
            onClick={() => remove.mutate()}
            aria-label="Excluir mídia"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </Button>
        </div>
      )}
    </article>
  );
};

const ScriptEditor: FC<{ script: SocialScript; onChange: (script: SocialScript) => void; disabled: boolean }> = ({
  script,
  onChange,
  disabled,
}) => {
  const scenes = script.cenas ?? [];
  const setScene = (index: number, field: keyof SocialScriptScene, value: string) =>
    onChange({ ...script, cenas: scenes.map((scene, position) => (position === index ? { ...scene, [field]: value } : scene)) });

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="script-hook">Gancho (primeiros 2 segundos)</Label>
        <Input
          id="script-hook"
          value={script.gancho ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ ...script, gancho: event.target.value })}
        />
      </div>
      {scenes.map((scene, index) => (
        <fieldset key={index} className="grid gap-2 rounded-lg border p-2">
          <legend className="flex items-center gap-1 px-1 text-xs font-medium">
            Cena {index + 1} {scene.tempo && <span className="text-muted-foreground">({scene.tempo})</span>}
            {!disabled && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                aria-label={`Remover cena ${index + 1}`}
                onClick={() => onChange({ ...script, cenas: scenes.filter((_, position) => position !== index) })}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
              </Button>
            )}
          </legend>
          <Input
            aria-label="O que aparece"
            placeholder="O que aparece"
            value={scene.imagem ?? ""}
            disabled={disabled}
            onChange={(event) => setScene(index, "imagem", event.target.value)}
          />
          <Input
            aria-label="Fala"
            placeholder="Fala"
            value={scene.fala ?? ""}
            disabled={disabled}
            onChange={(event) => setScene(index, "fala", event.target.value)}
          />
          <Input
            aria-label="Texto na tela"
            placeholder="Texto na tela"
            value={scene.legenda ?? ""}
            disabled={disabled}
            onChange={(event) => setScene(index, "legenda", event.target.value)}
          />
        </fieldset>
      ))}
      {!disabled && scenes.length < 6 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="justify-self-start"
          onClick={() => onChange({ ...script, cenas: [...scenes, {}] })}
        >
          <Plus className="mr-2 h-4 w-4" aria-hidden />
          Adicionar cena
        </Button>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="script-cta">Chamada final</Label>
        <Input
          id="script-cta"
          value={script.chamada ?? ""}
          disabled={disabled}
          onChange={(event) => onChange({ ...script, chamada: event.target.value })}
        />
      </div>
    </div>
  );
};

const PostEditorForm: FC<{ post: SocialPost; setup?: SocialPostSetup; fixedHashtags: string[] }> = ({ post, setup, fixedHashtags }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // Postagem criada para usar o estúdio: abre ele direto no formulário de criativo novo
  const [studioOpen, setStudioOpen] = useState(searchParams.get("studio") === "1");

  const [caption, setCaption] = useState(post.caption ?? "");
  const [hashtags, setHashtags] = useState(post.hashtags.join(" "));
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(post.platforms);
  const [script, setScript] = useState<SocialScript>(post.script ?? { cenas: [] });
  const [instruction, setInstruction] = useState("");
  const [scheduledAt, setScheduledAt] = useState(
    toLocalInputValue(post.scheduledAt ? new Date(post.scheduledAt) : addHours(new Date(), 2)),
  );

  const editable = editableStatuses.includes(post.status) && can("posts.manage");
  const canPublish = can("posts.publish") && ["READY", "FAILED", "PARTIAL", "SCHEDULED"].includes(post.status);
  const busy = isSocialPostBusy(post);
  const dirty =
    caption !== (post.caption ?? "") ||
    hashtags.trim() !== post.hashtags.join(" ") ||
    platforms.slice().sort().join() !== post.platforms.slice().sort().join() ||
    JSON.stringify(script) !== JSON.stringify(post.script ?? { cenas: [] });

  const apply = (updated: SocialPost) => {
    queryClient.setQueryData(["socialPosts", client.id, "post", post.id], updated);
    queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id, "list"] });
  };
  const parseTags = () => hashtags.split(/[\s,]+/).filter(Boolean);

  const save = useMutation({
    mutationFn: () =>
      socialPostService.update(client.id, post.id, {
        caption,
        hashtags: parseTags(),
        platforms,
        script: post.format === "REEL" ? script : undefined,
      }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      toast.success("Postagem salva");
    },
  });
  // Antes de publicar, agendar ou gerar o vídeo, o que foi editado na tela é salvo
  const saveIfDirty = async () => {
    if (dirty) apply(await save.mutateAsync());
  };

  const rewrite = useMutation({
    mutationFn: async () => {
      await saveIfDirty();
      return socialPostService.rewrite(client.id, post.id, instruction.trim() || undefined);
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      setCaption(updated.caption ?? "");
      setHashtags(updated.hashtags.join(" "));
      setInstruction("");
      toast.success("Texto reescrito pela IA");
    },
  });
  const addImage = useMutation({
    mutationFn: () => socialPostService.addImage(client.id, post.id),
    onError: requestErrorHandling,
    onSuccess: apply,
  });
  const upload = useMutation({
    mutationFn: (file: File) => socialPostService.uploadMedia(client.id, post.id, file),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      toast.success("Arquivo enviado");
    },
  });
  const generateVideo = useMutation({
    mutationFn: async () => {
      await saveIfDirty();
      return socialPostService.generateVideo(client.id, post.id);
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      toast.success("A IA começou a gerar o vídeo; leva alguns minutos");
    },
  });
  const publish = useMutation({
    mutationFn: async () => {
      await saveIfDirty();
      return socialPostService.publish(client.id, post.id);
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      toast.success("Publicando...");
    },
  });
  const schedule = useMutation({
    mutationFn: async () => {
      await saveIfDirty();
      return socialPostService.schedule(client.id, post.id, new Date(scheduledAt).toISOString());
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      toast.success(`Agendada para ${format(new Date(scheduledAt), "dd/MM 'às' HH:mm")}`);
    },
  });
  const unschedule = useMutation({
    mutationFn: () => socialPostService.unschedule(client.id, post.id),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      apply(updated);
      toast.success("Agendamento cancelado");
    },
  });
  const remove = useMutation({
    mutationFn: () => socialPostService.remove(client.id, post.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id, "list"] });
      toast.success("Postagem excluída");
      navigate(`${baseUrl}/posts`);
    },
  });

  const confirmPublish = async () => {
    const where = platforms.map((platform) => socialPlatformLabel[platform]).join(" e ");
    if (await confirm({ title: `Publicar agora no ${where}?`, description: "A postagem fica visível para todos os seguidores." }))
      publish.mutate();
  };
  const confirmDelete = async () => {
    const published = post.targets.some((target) => target.status === "PUBLISHED");
    if (
      await confirm({
        title: "Excluir esta postagem?",
        description: published
          ? "Ela some daqui, mas continua no Facebook e no Instagram; para tirar de lá, apague pela própria rede."
          : undefined,
        destructive: true,
      })
    )
      remove.mutate();
  };

  const images = post.media.filter((media) => media.kind === "IMAGE");
  const videos = post.media.filter((media) => media.kind === "VIDEO");
  const allTags = [...new Set([...fixedHashtags, ...parseTags().map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))])];
  const finalLength = caption.trim().length + (allTags.length ? allTags.join(" ").length + 2 : 0);
  const info = socialStatusInfo[post.status];
  const canAddImage = editable && post.format !== "REEL" && images.length < (post.format === "CAROUSEL" ? 10 : 1);

  return (
    <div className="grid gap-4">
      {confirmDialog}
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", info.className)}>{info.label}</span>
        <span className="text-muted-foreground text-sm">{socialFormatLabel[post.format]}</span>
        {post.status === "SCHEDULED" && post.scheduledAt && (
          <span className="text-sm">para {format(new Date(post.scheduledAt), "dd/MM/yyyy 'às' HH:mm")}</span>
        )}
        {busy && <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" aria-label="Atualizando" />}
      </div>
      <p className="text-muted-foreground text-sm">
        <span className="font-medium">Ideia:</span> {post.idea}
      </p>
      {post.error && <p className="rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">{post.error}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <section className="grid content-start gap-3" aria-label="Mídias">
          <h2 className="font-semibold">
            {post.format === "REEL" ? "Vídeo" : post.format === "CAROUSEL" ? "Imagens do carrossel" : "Imagem"}
          </h2>
          {post.status === "GENERATING" && !post.media.length && post.format !== "REEL" && (
            <LoadingState label="A IA está escrevendo a postagem e criando as imagens..." />
          )}
          <div className={cn("grid gap-3", post.format === "REEL" ? "max-w-xs" : "grid-cols-2 xl:grid-cols-3")}>
            {(post.format === "REEL" ? videos : images).map((media, index) => (
              <MediaCard key={media.id} post={post} media={media} index={index} editable={editable} onChange={apply} />
            ))}
          </div>
          {editable && (
            <div className="flex flex-wrap gap-2">
              {canAddImage && (
                <Button variant="outline" size="sm" disabled={addImage.isPending} onClick={() => addImage.mutate()}>
                  <ImagePlus className="mr-2 h-4 w-4" aria-hidden />
                  Gerar {images.length ? "outra" : "a"} imagem com IA
                </Button>
              )}
              {(canAddImage || post.format === "REEL") && (
                <Button variant="outline" size="sm" onClick={() => setStudioOpen(true)}>
                  <Palette className="mr-2 h-4 w-4" aria-hidden />
                  Criar no estúdio
                </Button>
              )}
              {(canAddImage || post.format === "REEL") && (
                <Button variant="outline" size="sm" disabled={upload.isPending} onClick={() => fileRef.current?.click()}>
                  <Upload className="mr-2 h-4 w-4" aria-hidden />
                  {upload.isPending ? "Enviando..." : post.format === "REEL" ? "Enviar meu vídeo" : "Enviar minha imagem"}
                </Button>
              )}
              <CreativeStudioDialog
                open={studioOpen}
                startNew={searchParams.get("studio") === "1"}
                onOpenChange={(open) => {
                  setStudioOpen(open);
                  if (!open && searchParams.has("studio")) setSearchParams({}, { replace: true });
                }}
                description="Envie as fotos do produto e as instruções: a IA cria a imagem ou o vídeo, você pede alterações e usa a versão que ficar melhor nesta postagem."
                defaults={{
                  kind: post.format === "REEL" ? "VIDEO" : "IMAGE",
                  lockKind: true,
                  purpose: "POST",
                  aspectRatio: post.format === "REEL" ? "9:16" : "4:5",
                  brief: post.idea,
                }}
                pickLabel={post.format === "REEL" ? "Usar como vídeo do reel" : "Usar na postagem"}
                onPick={async (generation) => {
                  try {
                    apply(await creativeStudioService.attachToPost(client.id, generation.id, post.id));
                    toast.success(post.format === "REEL" ? "Vídeo do reel atualizado" : "Imagem adicionada à postagem");
                  } catch (error) {
                    requestErrorHandling(error);
                    throw error;
                  }
                }}
              />
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={post.format === "REEL" ? "video/mp4,video/quicktime" : "image/png,image/jpeg,image/webp"}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) upload.mutate(file);
                  event.target.value = "";
                }}
              />
            </div>
          )}

          {post.format === "REEL" && (
            <div className="grid gap-3 rounded-xl border p-3">
              <div>
                <h3 className="font-medium">Roteiro do reel</h3>
                <p className="text-muted-foreground text-xs">
                  Revise o roteiro e gere o vídeo com IA (até 15 segundos, vertical). Também dá para gravar seguindo o roteiro e enviar o
                  seu vídeo.
                </p>
              </div>
              {post.status === "GENERATING" ? (
                <LoadingState label="A IA está escrevendo o roteiro..." />
              ) : (
                <ScriptEditor script={script} onChange={setScript} disabled={!editable} />
              )}
              {editable && (
                <Button
                  className="justify-self-start"
                  disabled={
                    generateVideo.isPending || busy || !(script.cenas ?? []).some((scene) => scene.fala?.trim() || scene.imagem?.trim())
                  }
                  onClick={() => generateVideo.mutate()}
                >
                  <Film className="mr-2 h-4 w-4" aria-hidden />
                  {videos.some((media) => media.status === "DONE") ? "Gerar outro vídeo" : "Gerar vídeo com IA"}
                </Button>
              )}
            </div>
          )}
        </section>

        <section className="grid content-start gap-4" aria-label="Texto e publicação">
          <div className="grid gap-1.5">
            <Label htmlFor="post-caption">Legenda</Label>
            <textarea
              id="post-caption"
              value={caption}
              maxLength={CAPTION_LIMIT}
              disabled={!editable || post.status === "GENERATING"}
              placeholder={post.status === "GENERATING" ? "A IA está escrevendo..." : "Escreva a legenda"}
              onChange={(event) => setCaption(event.target.value)}
              className={cn(socialTextareaClassName, "min-h-48")}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="post-hashtags">Hashtags</Label>
            <Input
              id="post-hashtags"
              value={hashtags}
              disabled={!editable}
              placeholder="#exemplo #outra"
              onChange={(event) => setHashtags(event.target.value)}
            />
            <p
              className={cn(
                "text-xs tabular-nums",
                finalLength > CAPTION_LIMIT || allTags.length > 30 ? "text-red-600" : "text-muted-foreground",
              )}
            >
              {fixedHashtags.length ? `Fixas da marca: ${fixedHashtags.join(" ")} · ` : ""}
              {allTags.length} hashtags (máx. 30) · {finalLength} de {CAPTION_LIMIT} caracteres
            </p>
          </div>

          {editable && (
            <div className="bg-muted/40 grid gap-2 rounded-lg border p-3">
              <Label htmlFor="post-instruction" className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" aria-hidden />
                Pedir ajuste à IA
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="post-instruction"
                  value={instruction}
                  placeholder="Ex.: mais curto, mais divertido, fale do frete grátis"
                  onChange={(event) => setInstruction(event.target.value)}
                />
                <Button variant="secondary" disabled={rewrite.isPending || post.status === "GENERATING"} onClick={() => rewrite.mutate()}>
                  {rewrite.isPending ? "Reescrevendo..." : "Reescrever"}
                </Button>
              </div>
            </div>
          )}

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium">Onde publicar</legend>
            {(["INSTAGRAM", "FACEBOOK"] as SocialPlatform[]).map((platform) => {
              const target = post.targets.find((item) => item.platform === platform);
              return (
                <div key={platform} className="flex flex-wrap items-center gap-2 text-sm">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={platforms.includes(platform)}
                      disabled={!editable || target?.status === "PUBLISHED"}
                      onCheckedChange={(checked) =>
                        setPlatforms((current) =>
                          checked === true ? [...new Set([...current, platform])] : current.filter((item) => item !== platform),
                        )
                      }
                    />
                    {socialPlatformLabel[platform]}
                    <span className="text-muted-foreground">
                      {platform === "INSTAGRAM" ? (setup?.instagramUsername ? `@${setup.instagramUsername}` : "") : (setup?.pageName ?? "")}
                    </span>
                  </label>
                  {target?.status === "PUBLISHED" && (
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300">
                      publicada
                      {target.permalink && (
                        <a href={target.permalink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 underline">
                          ver <ExternalLink className="h-3 w-3" aria-hidden />
                        </a>
                      )}
                    </span>
                  )}
                  {target?.status === "FAILED" && <span className="text-xs text-red-700 dark:text-red-300">{target.error}</span>}
                  {target?.status === "PUBLISHING" && <span className="text-muted-foreground text-xs">publicando...</span>}
                </div>
              );
            })}
          </fieldset>

          <div className="flex flex-wrap gap-2">
            {editable && (
              <Button variant="outline" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                {save.isPending ? "Salvando..." : "Salvar"}
              </Button>
            )}
            {canPublish && (
              <Button disabled={publish.isPending || busy || !platforms.length} onClick={confirmPublish}>
                <Send className="mr-2 h-4 w-4" aria-hidden />
                {post.status === "FAILED" || post.status === "PARTIAL" ? "Tentar publicar de novo" : "Publicar agora"}
              </Button>
            )}
          </div>

          {canPublish && post.status !== "PARTIAL" && (
            <div className="grid gap-2 rounded-lg border p-3">
              <Label htmlFor="post-schedule" className="flex items-center gap-1">
                <CalendarClock className="h-4 w-4" aria-hidden />
                Agendar
              </Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="post-schedule"
                  type="datetime-local"
                  value={scheduledAt}
                  min={toLocalInputValue(new Date())}
                  onChange={(event) => setScheduledAt(event.target.value)}
                  className="sm:w-60"
                />
                <Button
                  variant="secondary"
                  disabled={schedule.isPending || busy || !scheduledAt || !platforms.length}
                  onClick={() => schedule.mutate()}
                >
                  {post.status === "SCHEDULED" ? "Mudar horário" : "Agendar"}
                </Button>
                {post.status === "SCHEDULED" && (
                  <Button variant="ghost" disabled={unschedule.isPending} onClick={() => unschedule.mutate()}>
                    Cancelar agendamento
                  </Button>
                )}
              </div>
            </div>
          )}

          {can("posts.manage") && post.status !== "PUBLISHING" && (
            <Button variant="ghost" className="text-destructive justify-self-start" disabled={remove.isPending} onClick={confirmDelete}>
              <Trash2 className="mr-2 h-4 w-4" aria-hidden />
              Excluir postagem
            </Button>
          )}
        </section>
      </div>
    </div>
  );
};

export const PostEditor = () => {
  const { postId = "" } = useParams();
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();

  const query = useQuery({
    queryKey: ["socialPosts", client.id, "post", postId],
    queryFn: () => socialPostService.findOne(client.id, postId),
    refetchInterval: (current) => (current.state.data && isSocialPostBusy(current.state.data) ? 4000 : false),
  });
  const setupQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["socialPosts", client.id, "setup"],
    queryFn: () => socialPostService.findSetup(client.id),
  });
  const brandQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["brandIdentity", client.id],
    queryFn: () => brandIdentityService.find(client.id),
  });

  const post = query.data;
  // O formulário recomeça quando a IA termina de escrever (o texto chega depois da criação)
  const formKey = post
    ? `${post.id}-${post.status === "GENERATING" ? "generating" : "ready"}-${post.caption === null ? "empty" : "text"}`
    : "";

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to={`${baseUrl}/posts`}>
            <ArrowLeft className="mr-1 h-4 w-4" aria-hidden />
            Postagens
          </Link>
        </Button>
      </div>
      {setupQuery.data && <PostSetupNotice setup={setupQuery.data} />}
      {query.isLoading && <LoadingState label="Carregando postagem..." />}
      {query.isError && (
        <ErrorState message="Não foi possível abrir a postagem." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {post && <PostEditorForm key={formKey} post={post} setup={setupQuery.data} fixedHashtags={brandQuery.data?.fixedHashtags ?? []} />}
    </div>
  );
};
