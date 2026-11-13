import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { socialPostService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { format, setHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { eventTypeInfo, plannerSelectClassName, plannerTextareaClassName, postFormatLabel } from "./plannerUtils";

type PlannerCreateDialogProps = {
  day: Date | null;
  onClose: () => void;
  onCreateTask: (day: Date) => void;
};

/** O que criar num dia: tarefa e postagem aqui mesmo; disparo, e-mail e anúncio no módulo de cada um. */
export const PlannerCreateDialog: FC<PlannerCreateDialogProps> = ({ day, onClose, onCreateTask }) => {
  const { client, can, access } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [writingPost, setWritingPost] = useState(false);
  const [idea, setIdea] = useState("");
  const [postFormat, setPostFormat] = useState<SocialPostFormat>("IMAGE");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["INSTAGRAM", "FACEBOOK"]);

  const createPost = useMutation({
    mutationFn: () =>
      socialPostService.create(client.id, {
        idea: idea.trim(),
        format: postFormat,
        platforms,
        imageCount: postFormat === "CAROUSEL" ? 3 : undefined,
        plannedFor: setHours(day!, 12).toISOString(),
      }),
    onError: requestErrorHandling,
    onSuccess: (post) => {
      queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id] });
      queryClient.invalidateQueries({ queryKey: ["planner", client.id] });
      onClose();
      navigate(`${baseUrl}/posts/${post.id}`);
    },
  });

  if (!day) return null;

  const options = [
    can("planner.manage") && {
      type: "PLANNER_TASK" as const,
      label: "Tarefa",
      hint: "Ex.: criar os criativos da semana",
      action: () => onCreateTask(day),
    },
    can("posts.manage") &&
      access.adsEnabled && {
        type: "SOCIAL_POST" as const,
        label: "Postagem",
        hint: "A IA escreve e cria as imagens",
        action: () => setWritingPost(true),
      },
    can("broadcasts.send") && {
      type: "WHATSAPP_BROADCAST" as const,
      label: "Disparo de WhatsApp",
      hint: "Agende o envio na campanha",
      action: () => navigate(`${baseUrl}/broadcasts/new`),
    },
    can("broadcasts.send") && {
      type: "EMAIL_CAMPAIGN" as const,
      label: "Campanha de e-mail",
      hint: "Agende o envio na campanha",
      action: () => navigate(`${baseUrl}/broadcasts/email/new`),
    },
    can("ads.manage") &&
      access.adsEnabled && {
        type: "AD_CAMPAIGN" as const,
        label: "Campanha de anúncio",
        hint: "Crie pausada e agende a ativação",
        action: () => navigate(`${baseUrl}/ads?tab=create`),
      },
  ].filter(Boolean) as { type: PlannerEventType; label: string; hint: string; action: () => void }[];

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (idea.trim() && platforms.length) createPost.mutate();
  };

  return (
    <Dialog open={!!day} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{writingPost ? "Nova postagem" : "Criar"}</DialogTitle>
          <DialogDescription className="capitalize">{format(day, "EEEE, dd 'de' MMMM", { locale: ptBR })}</DialogDescription>
        </DialogHeader>

        {!writingPost && (
          <div className="grid gap-2">
            {options.length === 0 && (
              <p className="text-muted-foreground text-sm">Você não tem permissão para criar itens no planejamento.</p>
            )}
            {options.map((option) => {
              const info = eventTypeInfo[option.type];
              const Icon = info.icon;
              return (
                <button
                  key={option.type}
                  type="button"
                  onClick={option.action}
                  className="hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-lg border p-3 text-left outline-none focus-visible:ring-2"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded ${info.className}`}>
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="grid">
                    <span className="text-sm font-medium">{option.label}</span>
                    <span className="text-muted-foreground text-xs">{option.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {writingPost && (
          <form onSubmit={onSubmit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="planner-post-idea">Ideia</Label>
              <textarea
                id="planner-post-idea"
                value={idea}
                maxLength={5000}
                autoFocus
                placeholder="Ex.: 3 dicas para escolher o presente de Natal"
                onChange={(event) => setIdea(event.target.value)}
                className={plannerTextareaClassName}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="planner-post-format">Formato</Label>
              <select
                id="planner-post-format"
                value={postFormat}
                onChange={(event) => setPostFormat(event.target.value as SocialPostFormat)}
                className={plannerSelectClassName}
              >
                {(Object.keys(postFormatLabel) as SocialPostFormat[]).map((value) => (
                  <option key={value} value={value}>
                    {postFormatLabel[value]}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="flex flex-wrap gap-4">
              <legend className="sr-only">Redes</legend>
              {(["INSTAGRAM", "FACEBOOK"] as SocialPlatform[]).map((platform) => (
                <div key={platform} className="flex items-center gap-2">
                  <Checkbox
                    id={`planner-post-${platform}`}
                    checked={platforms.includes(platform)}
                    onCheckedChange={(checked) =>
                      setPlatforms((current) =>
                        checked === true ? [...new Set([...current, platform])] : current.filter((item) => item !== platform),
                      )
                    }
                  />
                  <Label htmlFor={`planner-post-${platform}`} className="font-normal">
                    {platform === "INSTAGRAM" ? "Instagram" : "Facebook"}
                  </Label>
                </div>
              ))}
            </fieldset>
            <p className="text-muted-foreground text-xs">
              A postagem fica em rascunho neste dia; você revisa e agenda o horário na tela dela.
            </p>
            <div className="flex justify-between gap-2">
              <Button type="button" variant="ghost" onClick={() => setWritingPost(false)}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Voltar
              </Button>
              <Button type="submit" disabled={!idea.trim() || !platforms.length || createPost.isPending}>
                {createPost.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" aria-hidden />}
                Criar com IA
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
