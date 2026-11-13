import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone } from "lucide-react";
import { FiInstagram } from "react-icons/fi";
import { useState, type FC } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { socialPlatformLabel, socialTextareaClassName } from "../posts/postsUtils";
import { ratioClassName } from "./studioUtils";

/** Manda a versão para a biblioteca de criativos de uma conta da Meta; de lá ela entra nas campanhas. */
const SendToAdsDialog: FC<{ generation: CreativeGeneration; open: boolean; onOpenChange: (open: boolean) => void }> = ({
  generation,
  open,
  onOpenChange,
}) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const accountsQuery = useQuery({
    enabled: open,
    queryKey: ["metaAds", "accounts", client.id],
    queryFn: () => metaAdsService.findAccounts({ params: { clientId: client.id } }),
  });
  const accounts = (accountsQuery.data ?? []).filter((account) => account.platform === "META");
  const [accountId, setAccountId] = useState<string | null>(null);
  const selected = accountId ?? accounts[0]?.id ?? null;

  const send = useMutation({
    mutationFn: () => creativeStudioService.sendToAds(client.id, generation.id, selected!),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "assets"] });
      toast.success(
        generation.kind === "VIDEO"
          ? "Vídeo na biblioteca de criativos; a Meta leva alguns minutos para processar"
          : "Imagem na biblioteca de criativos da conta",
      );
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usar em anúncio</DialogTitle>
          <DialogDescription>
            A versão {generation.number} vai para a biblioteca de criativos da conta. Depois é só escolher ela ao criar a campanha em
            Anúncios.
          </DialogDescription>
        </DialogHeader>
        {accountsQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Carregando contas...</p>
        ) : !accounts.length ? (
          <p className="text-muted-foreground text-sm">Nenhuma conta de anúncio da Meta conectada. Conecte em Configurações › Anúncios.</p>
        ) : (
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Conta de anúncio</legend>
            {accounts.map((account) => (
              <label key={account.id} className="flex items-center gap-2 text-sm">
                <input type="radio" name="studio-ad-account" checked={selected === account.id} onChange={() => setAccountId(account.id)} />
                {account.name}
                <span className="text-muted-foreground text-xs">{account.metaAccountId}</span>
              </label>
            ))}
          </fieldset>
        )}
        <Button disabled={!selected || send.isPending} onClick={() => send.mutate()}>
          {send.isPending ? "Enviando para a Meta..." : "Enviar para a biblioteca"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

/** Cria a postagem com a versão (ou várias imagens, em carrossel); a IA escreve a legenda. */
const CreatePostDialog: FC<{
  project: CreativeProject;
  generation: CreativeGeneration;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}> = ({ project, generation, open, onOpenChange }) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["INSTAGRAM", "FACEBOOK"]);
  const [idea, setIdea] = useState(project.brief);
  const [picked, setPicked] = useState<string[]>([generation.id]);
  const images = project.generations.filter((item) => item.kind === "IMAGE" && item.status === "DONE" && item.url);
  const ids = generation.kind === "VIDEO" ? [generation.id] : picked;

  const create = useMutation({
    mutationFn: () => creativeStudioService.createPost(client.id, { generationIds: ids, platforms, idea: idea.trim() || undefined }),
    onError: requestErrorHandling,
    onSuccess: (post) => {
      toast.success("Postagem criada; a IA está escrevendo a legenda");
      navigate(`${baseUrl}/posts/${post.id}`);
    },
  });

  const toggle = (id: string) =>
    setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 10)));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Criar postagem</DialogTitle>
          <DialogDescription>
            {generation.kind === "VIDEO"
              ? "O vídeo vira um reel. A IA escreve a legenda e as hashtags e você revisa antes de publicar."
              : "Uma imagem vira postagem simples; duas ou mais viram carrossel, na ordem marcada. A IA escreve a legenda."}
          </DialogDescription>
        </DialogHeader>

        {generation.kind === "IMAGE" && images.length > 1 && (
          <div className="grid gap-1.5">
            <span className="text-sm font-medium">Imagens ({picked.length})</span>
            <div className="grid grid-cols-4 gap-2">
              {images.map((item) => {
                const order = picked.indexOf(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={order >= 0}
                    onClick={() => toggle(item.id)}
                    className={cn("relative overflow-hidden rounded-md border", order >= 0 && "ring-primary ring-2")}
                  >
                    <img
                      src={item.url ?? undefined}
                      alt={`Versão ${item.number}`}
                      className={cn("w-full object-cover", ratioClassName[project.aspectRatio])}
                    />
                    <span className="bg-background/80 absolute bottom-1 left-1 rounded px-1 text-[10px] tabular-nums">
                      {order >= 0 ? `${order + 1}º · ` : ""}V{item.number}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="studio-post-idea">Ideia da legenda</Label>
          <textarea
            id="studio-post-idea"
            value={idea}
            maxLength={5000}
            onChange={(event) => setIdea(event.target.value)}
            className={socialTextareaClassName}
          />
        </div>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-sm font-medium">Onde publicar</legend>
          {(["INSTAGRAM", "FACEBOOK"] as SocialPlatform[]).map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={platforms.includes(platform)}
                onCheckedChange={(checked) =>
                  setPlatforms((current) =>
                    checked === true ? [...new Set([...current, platform])] : current.filter((item) => item !== platform),
                  )
                }
              />
              {socialPlatformLabel[platform]}
            </label>
          ))}
        </fieldset>

        <Button disabled={!platforms.length || !ids.length || create.isPending} onClick={() => create.mutate()}>
          {create.isPending ? "Criando a postagem..." : "Criar postagem"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

/** Destinos da versão escolhida na tela do estúdio: anúncio e postagem, conforme as permissões. */
export const StudioDestinations: FC<{ project: CreativeProject; generation: CreativeGeneration }> = ({ project, generation }) => {
  const { can } = useClientContext();
  const [dialog, setDialog] = useState<"ads" | "post" | null>(null);

  return (
    <>
      {can("ads.manage") && (
        <Button variant="outline" onClick={() => setDialog("ads")}>
          <Megaphone className="mr-2 h-4 w-4" aria-hidden />
          Usar em anúncio
        </Button>
      )}
      {can("posts.manage") && (
        <Button variant="outline" onClick={() => setDialog("post")}>
          <FiInstagram className="mr-2 h-4 w-4" aria-hidden />
          Criar postagem
        </Button>
      )}
      {dialog === "ads" && <SendToAdsDialog generation={generation} open onOpenChange={(open) => !open && setDialog(null)} />}
      {dialog === "post" && (
        <CreatePostDialog
          key={generation.id}
          project={project}
          generation={generation}
          open
          onOpenChange={(open) => !open && setDialog(null)}
        />
      )}
    </>
  );
};
