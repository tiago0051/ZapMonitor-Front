import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { socialPostService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Film, GalleryHorizontal, Image as ImageIcon, Plus, Sparkles } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { PostSetupNotice } from "./postSetupNotice";
import { isSocialPostBusy, socialFormatLabel, socialPlatformLabel, socialStatusInfo, socialTextareaClassName } from "./postsUtils";

const TAKE = 20;

const statusFilters: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "READY,GENERATING,FAILED", label: "Rascunhos" },
  { value: "SCHEDULED", label: "Agendadas" },
  { value: "PUBLISHED,PARTIAL,PUBLISHING", label: "Publicadas" },
];

const formatOptions: { value: SocialPostFormat; icon: typeof ImageIcon; hint: string }[] = [
  { value: "IMAGE", icon: ImageIcon, hint: "Uma imagem com legenda" },
  { value: "CAROUSEL", icon: GalleryHorizontal, hint: "De 2 a 5 imagens em sequência" },
  { value: "REEL", icon: Film, hint: "Roteiro e vídeo vertical com IA" },
];

const ideaExamples = [
  "Promoção de Dia dos Pais: 20% em todos os perfumes até domingo",
  "Dicas para economizar na conta de luz no verão",
  "Bastidores: como preparamos os pedidos antes da entrega",
];

const NewPostDialog: FC<{ open: boolean; onOpenChange: (open: boolean) => void; setup?: SocialPostSetup }> = ({
  open,
  onOpenChange,
  setup,
}) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [idea, setIdea] = useState("");
  const [postFormat, setPostFormat] = useState<SocialPostFormat>("IMAGE");
  const [imageCount, setImageCount] = useState(3);
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["INSTAGRAM", "FACEBOOK"]);

  const create = useMutation({
    mutationFn: () =>
      socialPostService.create(client.id, {
        idea: idea.trim(),
        format: postFormat,
        platforms,
        imageCount: postFormat === "CAROUSEL" ? imageCount : undefined,
      }),
    onError: requestErrorHandling,
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id] });
      onOpenChange(false);
      setIdea("");
      navigate(`${baseUrl}/posts/${post.id}`);
    },
  });

  const togglePlatform = (platform: SocialPlatform, checked: boolean) =>
    setPlatforms((current) => (checked ? [...new Set([...current, platform])] : current.filter((item) => item !== platform)));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  const instagramUnavailable = !!setup?.metaPageId && !setup.instagramAccountId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Nova postagem</DialogTitle>
          <DialogDescription>
            Conte a ideia: a IA escreve a legenda e as hashtags e cria as imagens (ou o roteiro do reel) no visual da sua marca. Você revisa
            tudo antes de publicar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="post-idea">Ideia</Label>
            <textarea
              id="post-idea"
              value={idea}
              maxLength={5000}
              autoFocus
              placeholder={ideaExamples[0]}
              onChange={(event) => setIdea(event.target.value)}
              className={socialTextareaClassName}
            />
            <div className="flex flex-wrap gap-1">
              {ideaExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setIdea(example)}
                  className="text-muted-foreground hover:bg-accent rounded-full border px-2 py-0.5 text-xs"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <fieldset className="grid gap-1.5">
            <legend className="mb-1.5 text-sm font-medium">Formato</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {formatOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={postFormat === option.value}
                  onClick={() => setPostFormat(option.value)}
                  className={cn(
                    "grid justify-items-start gap-1 rounded-lg border p-3 text-left text-sm",
                    postFormat === option.value ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-accent/40",
                  )}
                >
                  <option.icon className="h-4 w-4" aria-hidden />
                  <span className="font-medium">{socialFormatLabel[option.value]}</span>
                  <span className="text-muted-foreground text-xs">{option.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {postFormat === "CAROUSEL" && (
            <div className="grid gap-1.5">
              <Label htmlFor="post-image-count">Imagens geradas pela IA</Label>
              <input
                id="post-image-count"
                type="range"
                min={2}
                max={5}
                value={imageCount}
                onChange={(event) => setImageCount(Number(event.target.value))}
                className="max-w-xs"
              />
              <span className="text-muted-foreground text-xs">
                {imageCount} imagens. Depois dá para gerar mais ou enviar as suas, até 10.
              </span>
            </div>
          )}

          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium">Onde publicar</legend>
            {(["INSTAGRAM", "FACEBOOK"] as SocialPlatform[]).map((platform) => (
              <label key={platform} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={platforms.includes(platform)}
                  onCheckedChange={(checked) => togglePlatform(platform, checked === true)}
                />
                {socialPlatformLabel[platform]}
                {platform === "INSTAGRAM" && setup?.instagramUsername && (
                  <span className="text-muted-foreground">@{setup.instagramUsername}</span>
                )}
                {platform === "FACEBOOK" && setup?.pageName && <span className="text-muted-foreground">{setup.pageName}</span>}
                {platform === "INSTAGRAM" && instagramUnavailable && (
                  <span className="text-xs text-amber-700 dark:text-amber-300">sem Instagram ligado à página</span>
                )}
              </label>
            ))}
          </fieldset>

          <Button type="submit" disabled={!idea.trim() || !platforms.length || create.isPending}>
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            {create.isPending ? "Enviando para a IA..." : "Criar com IA"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const PostThumb: FC<{ post: SocialPost }> = ({ post }) => {
  const media = post.media.find((item) => item.status === "DONE" && item.url);
  if (!media) return <div className="bg-muted aspect-[4/5] w-20 shrink-0 rounded-md" aria-hidden />;
  if (media.kind === "VIDEO")
    return (
      <video src={media.url ?? undefined} muted playsInline className="aspect-[9/16] w-20 shrink-0 rounded-md bg-black object-cover" />
    );

  return <img src={media.url ?? undefined} alt="" loading="lazy" className="aspect-[4/5] w-20 shrink-0 rounded-md object-cover" />;
};

export const Posts = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const setupQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["socialPosts", client.id, "setup"],
    queryFn: () => socialPostService.findSetup(client.id),
  });
  const query = useQuery({
    queryKey: ["socialPosts", client.id, "list", status, page],
    queryFn: () => socialPostService.findAll(client.id, { page, take: TAKE, status: status || undefined }),
    refetchInterval: (current) => (current.state.data?.items.some(isSocialPostBusy) ? 5000 : false),
  });

  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / TAKE));
  const items = query.data?.items ?? [];

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Postagens</h1>
          <p className="text-muted-foreground text-sm">
            Da ideia à publicação no Instagram e no Facebook: a IA cria imagens, legendas, hashtags e reels no visual da sua marca.
          </p>
        </div>
        {can("posts.manage") && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            Nova postagem
          </Button>
        )}
      </div>

      {setupQuery.data && <PostSetupNotice setup={setupQuery.data} />}

      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={status === filter.value ? "secondary" : "ghost"}
            aria-pressed={status === filter.value}
            onClick={() => {
              setStatus(filter.value);
              setPage(1);
            }}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {query.isLoading && <LoadingState label="Carregando postagens..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar as postagens." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title={status ? "Nenhuma postagem aqui" : "Nenhuma postagem ainda"}
          description="Clique em Nova postagem, conte a ideia e a IA monta o conteúdo para você revisar."
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-2">
          {items.map((post) => {
            const info = socialStatusInfo[post.status];
            return (
              <Link
                key={post.id}
                to={`${baseUrl}/posts/${post.id}`}
                className="hover:bg-accent/40 focus-visible:ring-ring flex gap-3 rounded-xl border p-3 outline-none focus-visible:ring-2"
              >
                <PostThumb post={post} />
                <div className="grid min-w-0 flex-1 content-start gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", info.className)}>{info.label}</span>
                    <span className="text-muted-foreground text-xs">
                      {socialFormatLabel[post.format]} · {post.platforms.map((platform) => socialPlatformLabel[platform]).join(" e ")}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm">{post.caption || post.idea}</p>
                  <p className="text-muted-foreground text-xs tabular-nums">
                    {post.status === "SCHEDULED" && post.scheduledAt
                      ? `Agendada para ${format(new Date(post.scheduledAt), "dd/MM/yyyy 'às' HH:mm")}`
                      : post.publishedAt
                        ? `Publicada em ${format(new Date(post.publishedAt), "dd/MM/yyyy 'às' HH:mm")}`
                        : `Criada em ${format(new Date(post.createdAt), "dd/MM/yyyy 'às' HH:mm")}`}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground tabular-nums">
            {page} de {pages}
          </span>
          <Button size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage(page + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <NewPostDialog open={creating} onOpenChange={setCreating} setup={setupQuery.data} />
    </div>
  );
};
