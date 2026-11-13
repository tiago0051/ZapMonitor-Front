import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, Image as ImageIcon, ImagePlus, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { socialTextareaClassName } from "../posts/postsUtils";
import {
  BASE_IMAGE_ACCEPT,
  briefExamples,
  creativeKindLabel,
  creativePurposeHint,
  creativePurposeLabel,
  defaultRatio,
  imageRatios,
  MAX_BASE_IMAGES,
  videoRatios,
} from "./studioUtils";

type StudioNewFormProps = {
  defaults?: CreativeProjectDefaults;
  onCreated: (project: CreativeProject) => void;
  onCancel?: () => void;
};

const kindIcon: Record<CreativeKind, typeof ImageIcon> = { IMAGE: ImageIcon, VIDEO: Film };

/** Novo criativo: instruções, imagens base (ex.: fotos do produto) e formato; cria, envia as imagens e já manda gerar. */
export const StudioNewForm: FC<StudioNewFormProps> = ({ defaults, onCreated, onCancel }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<CreativeKind>(defaults?.kind ?? "IMAGE");
  const [purpose, setPurpose] = useState<CreativePurpose>(defaults?.purpose ?? "AD");
  const [ratio, setRatio] = useState<CreativeAspectRatio>(
    defaults?.aspectRatio ?? defaultRatio(defaults?.kind ?? "IMAGE", defaults?.purpose ?? "AD"),
  );
  const [brief, setBrief] = useState(defaults?.brief ?? "");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState(8);
  const [variations, setVariations] = useState(2);
  const [useBrand, setUseBrand] = useState(true);
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<string | null>(null);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const ratios = kind === "VIDEO" ? videoRatios : imageRatios;

  const selectKind = (value: CreativeKind) => {
    setKind(value);
    setRatio(defaultRatio(value, purpose));
  };
  const selectPurpose = (value: CreativePurpose) => {
    setPurpose(value);
    setRatio(defaultRatio(kind, value));
  };

  const create = useMutation({
    mutationFn: async () => {
      setStep("Criando...");
      let project = await creativeStudioService.create(client.id, {
        title: title.trim() || undefined,
        kind,
        purpose,
        brief: brief.trim(),
        aspectRatio: ratio,
        durationSeconds: kind === "VIDEO" ? duration : undefined,
        useBrand,
      });
      for (const [index, file] of files.entries()) {
        setStep(`Enviando imagem ${index + 1} de ${files.length}...`);
        project = await creativeStudioService.addBaseImage(client.id, project.id, file);
      }
      setStep("Enviando para a IA...");
      try {
        project = await creativeStudioService.generate(client.id, project.id, kind === "IMAGE" ? variations : undefined);
      } catch (error) {
        // O criativo fica salvo: o usuário ajusta e gera de novo na própria tela
        requestErrorHandling(error);
      }
      return project;
    },
    onError: requestErrorHandling,
    onSettled: () => setStep(null),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["creativeStudio", client.id, "list"] });
      if (project.generations.length)
        toast.success(kind === "VIDEO" ? "A IA está gravando o vídeo (leva alguns minutos)" : "A IA está criando");
      onCreated(project);
    },
  });

  const addFiles = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const room = MAX_BASE_IMAGES - files.length;
    if (picked.length > room) toast.warning(`Use até ${MAX_BASE_IMAGES} imagens base`);
    setFiles((current) => [...current, ...picked.slice(0, Math.max(0, room))]);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">O que criar</legend>
          <div className="grid grid-cols-2 gap-2">
            {(["IMAGE", "VIDEO"] as CreativeKind[]).map((value) => {
              const Icon = kindIcon[value];
              return (
                <button
                  key={value}
                  type="button"
                  disabled={defaults?.lockKind && value !== defaults.kind}
                  aria-pressed={kind === value}
                  onClick={() => selectKind(value)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 text-left text-sm disabled:opacity-40",
                    kind === value ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-accent/40",
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                  <span className="font-medium">{creativeKindLabel[value]}</span>
                </button>
              );
            })}
          </div>
        </fieldset>
        <fieldset className="grid gap-1.5">
          <legend className="mb-1.5 text-sm font-medium">Para onde vai</legend>
          <div className="grid grid-cols-3 gap-2">
            {(["AD", "POST", "FREE"] as CreativePurpose[]).map((value) => (
              <button
                key={value}
                type="button"
                title={creativePurposeHint[value]}
                aria-pressed={purpose === value}
                onClick={() => selectPurpose(value)}
                className={cn(
                  "rounded-lg border p-3 text-sm font-medium",
                  purpose === value ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-accent/40",
                )}
              >
                {creativePurposeLabel[value]}
              </button>
            ))}
          </div>
        </fieldset>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="studio-brief">Instruções do criativo</Label>
        <textarea
          id="studio-brief"
          value={brief}
          maxLength={5000}
          autoFocus
          placeholder={briefExamples[kind][0]}
          onChange={(event) => setBrief(event.target.value)}
          className={cn(socialTextareaClassName, "min-h-28")}
        />
        <div className="flex flex-wrap gap-1">
          {briefExamples[kind].map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setBrief(example)}
              className="text-muted-foreground hover:bg-accent rounded-full border px-2 py-0.5 text-left text-xs"
            >
              {example}
            </button>
          ))}
        </div>
        <p className="text-muted-foreground text-xs">
          Diga o que deve aparecer, o cenário, o texto da arte (se houver), a oferta e o clima. Quanto mais claro, melhor.
        </p>
      </div>

      <div className="grid gap-1.5">
        <span className="text-sm font-medium">Imagens base (opcional)</span>
        <p className="text-muted-foreground text-xs">
          Envie fotos do produto (ex.: o móvel de vários ângulos). A IA mantém o produto fiel e cria o cenário, a luz e a arte em volta
          dele. Até {MAX_BASE_IMAGES} imagens.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {files.map((file, index) => (
            <div key={`${file.name}-${index}`} className="group relative overflow-hidden rounded-md border">
              <img src={previews[index]} alt={file.name} className="aspect-square w-full object-cover" />
              <Button
                type="button"
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 h-7 w-7"
                aria-label={`Remover ${file.name}`}
                onClick={() => setFiles((current) => current.filter((_, position) => position !== index))}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          {files.length < MAX_BASE_IMAGES && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs"
            >
              <ImagePlus className="h-5 w-5" aria-hidden />
              Adicionar
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
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-sm font-medium">Formato</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ratios.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={ratio === option.value}
              onClick={() => setRatio(option.value)}
              className={cn(
                "grid justify-items-start rounded-lg border p-2 text-left text-sm",
                ratio === option.value ? "border-primary bg-primary/5 ring-primary ring-1" : "hover:bg-accent/40",
              )}
            >
              <span className="font-medium">{option.label}</span>
              <span className="text-muted-foreground text-xs">{option.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {kind === "IMAGE" ? (
          <div className="grid gap-1.5">
            <Label htmlFor="studio-variations">Variações de uma vez</Label>
            <div className="flex gap-1" id="studio-variations" role="group">
              {[1, 2, 3, 4].map((value) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={variations === value ? "secondary" : "outline"}
                  aria-pressed={variations === value}
                  onClick={() => setVariations(value)}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-1.5">
            <Label htmlFor="studio-duration">Duração: {duration} segundos</Label>
            <input
              id="studio-duration"
              type="range"
              min={4}
              max={15}
              value={duration}
              onChange={(event) => setDuration(Number(event.target.value))}
              className="max-w-xs"
            />
          </div>
        )}
        <label className="flex items-center gap-2 self-end text-sm">
          <Switch checked={useBrand} onCheckedChange={setUseBrand} />
          Usar a identidade da marca (logo, cores e estilo)
        </label>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="studio-title">Nome (opcional)</Label>
        <Input
          id="studio-title"
          value={title}
          maxLength={200}
          placeholder="Sem nome, usa o começo das instruções"
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" disabled={(!brief.trim() && !files.length) || create.isPending}>
          <Sparkles className="mr-2 h-4 w-4" aria-hidden />
          {step ?? (kind === "VIDEO" ? "Criar e gerar o vídeo" : "Criar e gerar")}
        </Button>
      </div>
    </form>
  );
};
