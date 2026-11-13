import { useConfirm } from "@/components/confirm-dialog";
import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, ImagePlus, Loader2, RotateCcw, Sparkles, Star, Trash2, Wand2, X } from "lucide-react";
import { useRef, useState, type FC, type ReactNode } from "react";
import { toast } from "sonner";
import { socialTextareaClassName } from "../posts/postsUtils";
import {
  BASE_IMAGE_ACCEPT,
  changeExamples,
  creativeKindLabel,
  creativePurposeLabel,
  imageRatios,
  isGenerationBusy,
  MAX_BASE_IMAGES,
  ratioClassName,
  videoRatios,
} from "./studioUtils";

type StudioWorkspaceProps = {
  projectId: string;
  // Botões de destino da versão escolhida (usar no anúncio, na postagem...)
  renderActions?: (generation: CreativeGeneration, project: CreativeProject) => ReactNode;
  onDeleted?: () => void;
};

const GenerationMedia: FC<{ generation: CreativeGeneration; ratio: CreativeAspectRatio; large?: boolean }> = ({
  generation,
  ratio,
  large,
}) => {
  const box = cn("w-full rounded-lg", ratioClassName[ratio]);
  if (generation.status === "DONE" && generation.url)
    return generation.kind === "VIDEO" ? (
      <video
        src={generation.url}
        controls={large}
        muted={!large}
        playsInline
        loop={!large}
        className={cn(box, "bg-black object-contain")}
      />
    ) : (
      <img
        src={generation.url}
        alt={`Versão ${generation.number}`}
        className={cn(box, large ? "bg-muted object-contain" : "object-cover")}
        loading="lazy"
      />
    );

  return (
    <div className={cn(box, "bg-muted text-muted-foreground flex flex-col items-center justify-center gap-2 p-3 text-center text-xs")}>
      {isGenerationBusy(generation) ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          {large && (generation.kind === "VIDEO" ? "A IA está gravando o vídeo (leva alguns minutos)" : "A IA está criando a imagem")}
        </>
      ) : (
        <span className="text-red-700 dark:text-red-300">{large ? (generation.error ?? "Não foi possível gerar") : "Falhou"}</span>
      )}
    </div>
  );
};

/** Um criativo do estúdio: pedido e imagens base à esquerda; versões, alteração e destinos à direita. */
export const StudioWorkspace: FC<StudioWorkspaceProps> = ({ projectId, renderActions, onDeleted }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const queryKey = ["creativeStudio", client.id, "project", projectId];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [brief, setBrief] = useState<string | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [variations, setVariations] = useState(2);

  const query = useQuery({
    queryKey,
    queryFn: () => creativeStudioService.findOne(client.id, projectId),
    refetchInterval: (current) => (current.state.data?.generations.some(isGenerationBusy) ? 4000 : false),
  });
  const project = query.data;

  // Atualiza a tela com a resposta e escolhe a versão nova, se houver
  const apply = (updated: CreativeProject, selectNewest = false) => {
    queryClient.setQueryData(queryKey, updated);
    queryClient.invalidateQueries({ queryKey: ["creativeStudio", client.id, "list"] });
    if (selectNewest) setSelectedId(updated.generations[updated.generations.length - 1]?.id ?? null);
  };

  const save = useMutation({
    mutationFn: (body: Parameters<typeof creativeStudioService.update>[2]) => creativeStudioService.update(client.id, projectId, body),
    onError: requestErrorHandling,
    onSuccess: (updated) => apply(updated),
  });
  const generate = useMutation({
    mutationFn: async () => {
      if (brief !== null && brief !== project?.brief) await creativeStudioService.update(client.id, projectId, { brief });
      return creativeStudioService.generate(client.id, projectId, project?.kind === "IMAGE" ? variations : undefined);
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => apply(updated, true),
  });
  const change = useMutation({
    mutationFn: (generationId: string) => creativeStudioService.requestChange(client.id, projectId, generationId, instruction.trim()),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      setInstruction("");
      apply(updated, true);
    },
  });
  const retry = useMutation({
    mutationFn: (generationId: string) => creativeStudioService.retry(client.id, projectId, generationId),
    onError: requestErrorHandling,
    onSuccess: (updated) => apply(updated),
  });
  const favorite = useMutation({
    mutationFn: (generation: CreativeGeneration) =>
      creativeStudioService.setFavorite(client.id, projectId, generation.id, !generation.favorite),
    onError: requestErrorHandling,
    onSuccess: (updated) => apply(updated),
  });
  const removeGeneration = useMutation({
    mutationFn: (generationId: string) => creativeStudioService.deleteGeneration(client.id, projectId, generationId),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      setSelectedId(null);
      apply(updated);
    },
  });
  const addImages = useMutation({
    mutationFn: async (files: File[]) => {
      let updated = project!;
      for (const file of files) updated = await creativeStudioService.addBaseImage(client.id, projectId, file);
      return updated;
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => apply(updated),
  });
  const removeImage = useMutation({
    mutationFn: (imageId: string) => creativeStudioService.removeBaseImage(client.id, projectId, imageId),
    onError: requestErrorHandling,
    onSuccess: (updated) => apply(updated),
  });
  const removeProject = useMutation({
    mutationFn: () => creativeStudioService.delete(client.id, projectId),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creativeStudio", client.id, "list"] });
      toast.success("Criativo excluído");
      onDeleted?.();
    },
  });

  if (query.isLoading) return <LoadingState label="Abrindo o criativo..." />;
  if (query.isError || !project)
    return <ErrorState message="Não foi possível abrir o criativo." onRetry={() => query.refetch()} isRetrying={query.isFetching} />;

  const generations = project.generations;
  const newestDone = [...generations].reverse().find((item) => item.status === "DONE");
  const selected = generations.find((item) => item.id === selectedId) ?? newestDone ?? generations[generations.length - 1] ?? null;
  const parentOf = (generation: CreativeGeneration) => generations.find((item) => item.id === generation.parentId);
  const videoBusy = project.kind === "VIDEO" && generations.some(isGenerationBusy);
  const ratios = project.kind === "VIDEO" ? videoRatios : imageRatios;
  const currentBrief = brief ?? project.brief;

  const pickFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    const room = MAX_BASE_IMAGES - project.baseImages.length;
    if (files.length > room) toast.warning(`Use até ${MAX_BASE_IMAGES} imagens base`);
    if (room > 0 && files.length) addImages.mutate(files.slice(0, room));
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      {confirmDialog}
      <section className="grid content-start gap-4" aria-label="Pedido">
        <div className="grid gap-1.5">
          <Label htmlFor="studio-project-title">Nome</Label>
          <Input
            id="studio-project-title"
            value={title ?? project.title}
            maxLength={200}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={() => title !== null && title.trim() && title !== project.title && save.mutate({ title })}
          />
          <p className="text-muted-foreground text-xs">
            {creativeKindLabel[project.kind]} · {creativePurposeLabel[project.purpose]}
          </p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="studio-project-brief">Instruções do criativo</Label>
          <textarea
            id="studio-project-brief"
            value={currentBrief}
            maxLength={5000}
            onChange={(event) => setBrief(event.target.value)}
            onBlur={() => brief !== null && brief !== project.brief && save.mutate({ brief })}
            className={cn(socialTextareaClassName, "min-h-28")}
          />
          <p className="text-muted-foreground text-xs">
            Vale para as próximas gerações. Para mexer em uma versão pronta, use “Pedir alteração”.
          </p>
        </div>

        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Imagens base</span>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
            {project.baseImages.map((image) => (
              <div key={image.id} className="relative overflow-hidden rounded-md border">
                <img src={image.url} alt={image.name} title={image.name} className="aspect-square w-full object-cover" loading="lazy" />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-1 right-1 h-7 w-7"
                  aria-label={`Remover ${image.name}`}
                  disabled={removeImage.isPending}
                  onClick={() => removeImage.mutate(image.id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
            {project.baseImages.length < MAX_BASE_IMAGES && (
              <button
                type="button"
                disabled={addImages.isPending}
                onClick={() => inputRef.current?.click()}
                className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs"
              >
                {addImages.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" aria-hidden />}
                {addImages.isPending ? "Enviando..." : "Adicionar"}
              </button>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={BASE_IMAGE_ACCEPT}
            onChange={(event) => {
              pickFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <p className="text-muted-foreground text-xs">Fotos do produto: a IA mantém o produto fiel e cria o cenário em volta.</p>
        </div>

        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Formato</legend>
          <div className="flex flex-wrap gap-1">
            {ratios.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={project.aspectRatio === option.value ? "secondary" : "outline"}
                aria-pressed={project.aspectRatio === option.value}
                title={option.hint}
                disabled={save.isPending}
                onClick={() => save.mutate({ aspectRatio: option.value })}
              >
                {option.label} <span className="text-muted-foreground ml-1 text-xs">{option.value}</span>
              </Button>
            ))}
          </div>
        </fieldset>

        {project.kind === "VIDEO" && (
          <div className="grid gap-1.5">
            <Label htmlFor="studio-project-duration">Duração: {project.durationSeconds ?? 8} segundos</Label>
            <input
              id="studio-project-duration"
              type="range"
              min={4}
              max={15}
              defaultValue={project.durationSeconds ?? 8}
              onMouseUp={(event) => save.mutate({ durationSeconds: Number(event.currentTarget.value) })}
              onTouchEnd={(event) => save.mutate({ durationSeconds: Number(event.currentTarget.value) })}
              onKeyUp={(event) => save.mutate({ durationSeconds: Number(event.currentTarget.value) })}
              className="max-w-xs"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm">
          <Switch checked={project.useBrand} disabled={save.isPending} onCheckedChange={(checked) => save.mutate({ useBrand: checked })} />
          Usar a identidade da marca (logo, cores e estilo)
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {project.kind === "IMAGE" && (
            <div className="flex items-center gap-1" role="group" aria-label="Variações">
              {[1, 2, 3, 4].map((value) => (
                <Button
                  key={value}
                  size="sm"
                  variant={variations === value ? "secondary" : "ghost"}
                  aria-pressed={variations === value}
                  onClick={() => setVariations(value)}
                  title={`${value} ${value > 1 ? "variações" : "variação"}`}
                >
                  {value}
                </Button>
              ))}
            </div>
          )}
          <Button
            disabled={generate.isPending || videoBusy || (!currentBrief.trim() && !project.baseImages.length)}
            onClick={() => generate.mutate()}
          >
            <Sparkles className="mr-2 h-4 w-4" aria-hidden />
            {generate.isPending
              ? "Enviando..."
              : project.kind === "VIDEO"
                ? generations.length
                  ? "Gerar outro vídeo"
                  : "Gerar vídeo"
                : generations.length
                  ? "Gerar novas variações"
                  : "Gerar"}
          </Button>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground justify-self-start"
          disabled={removeProject.isPending}
          onClick={async () => {
            if (
              await confirm({
                title: "Excluir este criativo?",
                description: "Todas as versões e imagens base serão apagadas.",
                destructive: true,
              })
            )
              removeProject.mutate();
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" aria-hidden />
          Excluir criativo
        </Button>
      </section>

      <section className="grid content-start gap-4" aria-label="Versões">
        {!selected ? (
          <div className="text-muted-foreground grid place-items-center rounded-xl border border-dashed p-10 text-center text-sm">
            Escreva as instruções, envie as imagens base e clique em Gerar.
          </div>
        ) : (
          <>
            <div className="grid gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold">
                  Versão {selected.number}
                  {selected.parentId && (
                    <span className="text-muted-foreground ml-2 text-sm font-normal">
                      alteração da V{parentOf(selected)?.number ?? "?"}
                    </span>
                  )}
                </h2>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label={selected.favorite ? "Tirar dos favoritos" : "Marcar como favorita"}
                    aria-pressed={selected.favorite}
                    onClick={() => favorite.mutate(selected)}
                  >
                    <Star className={cn("h-4 w-4", selected.favorite && "fill-amber-400 text-amber-500")} />
                  </Button>
                  {selected.url && (
                    <Button size="icon" variant="ghost" asChild aria-label="Baixar">
                      <a href={selected.url} target="_blank" rel="noreferrer" download>
                        <Download className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Excluir versão"
                    disabled={isGenerationBusy(selected) || removeGeneration.isPending}
                    onClick={async () => {
                      if (await confirm({ title: `Excluir a versão ${selected.number}?`, destructive: true }))
                        removeGeneration.mutate(selected.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {selected.instruction && <p className="text-muted-foreground text-sm">Alteração pedida: {selected.instruction}</p>}
              <div
                className={cn(
                  "mx-auto w-full",
                  project.aspectRatio === "9:16" ? "max-w-xs" : project.aspectRatio === "16:9" ? "" : "max-w-md",
                )}
              >
                <GenerationMedia generation={selected} ratio={project.aspectRatio} large />
              </div>
              {selected.status === "FAILED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="justify-self-start"
                  disabled={retry.isPending}
                  onClick={() => retry.mutate(selected.id)}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                  Tentar de novo
                </Button>
              )}
            </div>

            {selected.status === "DONE" && (
              <>
                {renderActions && <div className="flex flex-wrap gap-2">{renderActions(selected, project)}</div>}
                <div className="grid gap-1.5 rounded-xl border p-3">
                  <Label htmlFor="studio-change">Pedir alteração nesta versão</Label>
                  <textarea
                    id="studio-change"
                    value={instruction}
                    maxLength={2000}
                    placeholder={changeExamples[0]}
                    onChange={(event) => setInstruction(event.target.value)}
                    className={cn(socialTextareaClassName, "min-h-16")}
                  />
                  <div className="flex flex-wrap gap-1">
                    {changeExamples.map((example) => (
                      <button
                        key={example}
                        type="button"
                        onClick={() => setInstruction(example)}
                        className="text-muted-foreground hover:bg-accent rounded-full border px-2 py-0.5 text-xs"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {selected.kind === "VIDEO"
                      ? "A IA aplica a alteração no vídeo e mantém o resto; sai uma versão nova e esta continua guardada."
                      : "A IA mexe só no que você pediu e mantém o resto da arte; sai uma versão nova e esta continua guardada."}
                  </p>
                  <Button
                    className="justify-self-start"
                    disabled={!instruction.trim() || change.isPending || videoBusy}
                    onClick={() => change.mutate(selected.id)}
                  >
                    <Wand2 className="mr-2 h-4 w-4" aria-hidden />
                    {change.isPending ? "Enviando..." : "Pedir alteração"}
                  </Button>
                </div>
              </>
            )}
          </>
        )}

        {generations.length > 0 && (
          <div className="grid gap-2">
            <h3 className="text-sm font-medium">Todas as versões</h3>
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
              {[...generations].reverse().map((generation) => (
                <button
                  key={generation.id}
                  type="button"
                  onClick={() => setSelectedId(generation.id)}
                  aria-pressed={selected?.id === generation.id}
                  aria-label={`Versão ${generation.number}`}
                  className={cn(
                    "relative overflow-hidden rounded-md border text-left",
                    selected?.id === generation.id && "ring-primary ring-2",
                  )}
                >
                  <GenerationMedia generation={generation} ratio={project.aspectRatio} />
                  <span className="bg-background/80 absolute bottom-1 left-1 rounded px-1 text-[10px] font-medium tabular-nums">
                    V{generation.number}
                  </span>
                  {generation.favorite && (
                    <Star className="absolute top-1 right-1 h-3 w-3 fill-amber-400 text-amber-500" aria-label="Favorita" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
