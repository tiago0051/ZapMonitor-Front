import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Heart, ImageUp, Info, MessageCircle, RefreshCw, Share2, Trash2 } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { fieldSelectClassName } from "../campaign/campaignUtils";
import { identitySourceInfo } from "./pilotUtils";

type Props = {
  account: AdAccount;
  brand: AdBrandProfile;
  pages: { metaPageId: string; name: string }[];
  onChange: (brand: AdBrandProfile) => void;
};

const SOURCE_LABEL: { key: "page" | "facebookPosts" | "instagram"; label: string }[] = [
  { key: "page", label: "Página e foto" },
  { key: "facebookPosts", label: "Postagens do Facebook" },
  { key: "instagram", label: "Instagram" },
];

/** Logo, cores, estilo e as postagens que mais engajaram, lidos da página e do Instagram. */
export const PilotIdentity: FC<Props> = ({ account, brand, pages, onChange }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };
  const canManage = can("ads.manage");
  const logoInput = useRef<HTMLInputElement>(null);
  const [pageId, setPageId] = useState(brand.metaPageId ?? "");

  const logoQuery = useQuery({
    queryKey: ["metaAds", "pilotLogo", client.id, account.id, brand.hasLogo, brand.identityUpdatedAt, brand.logoUploaded],
    queryFn: () => metaAdsService.findBrandLogo({ params }),
    enabled: brand.hasLogo,
  });
  const afterLogo = (updated: AdBrandProfile) => {
    onChange(updated);
    queryClient.invalidateQueries({ queryKey: ["metaAds", "pilotLogo", client.id, account.id] });
  };

  const refresh = useMutation({
    mutationFn: () => metaAdsService.refreshBrandIdentity({ params, metaPageId: pageId || null }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      afterLogo(updated);
      toast.success("Identidade lida");
    },
  });
  const uploadLogo = useMutation({
    mutationFn: (file: File) => metaAdsService.uploadBrandLogo({ params, file }),
    onError: requestErrorHandling,
    onSuccess: afterLogo,
  });
  const deleteLogo = useMutation({
    mutationFn: () => metaAdsService.deleteBrandLogo({ params }),
    onError: requestErrorHandling,
    onSuccess: afterLogo,
  });

  const identity = brand.identity;
  const sources = brand.identitySources;
  const topPosts = [...brand.posts]
    .filter((post) => post.mediaUrl)
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 12);
  const isBusy = refresh.isPending || uploadLogo.isPending || deleteLogo.isPending;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">2. Identidade visual</h2>
        <p className="text-muted-foreground text-sm">
          A IA lê a foto da página como logo, as postagens do Facebook e do Instagram e o engajamento de cada uma para tirar cores, estilo e
          os temas que o público mais responde.
        </p>
      </div>

      {brand.missingOptionalScopes.length > 0 && (
        <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Opcional: para ler as postagens, a conexão com a Meta precisa de <b>{brand.missingOptionalScopes.join(" e ")}</b>. Sem elas o
            piloto usa a foto da página e a base da marca. Para ativar, inclua essas permissões na configuração do login do app e reconecte
            em Configurações → Anúncios da Meta.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="grid gap-1">
          <Label htmlFor="pilot-page" className="text-xs">
            Página da marca
          </Label>
          <select
            id="pilot-page"
            className={cn(fieldSelectClassName, "w-64")}
            disabled={!canManage || isBusy}
            value={pageId}
            onChange={(event) => setPageId(event.target.value)}
          >
            <option value="">A primeira da conexão</option>
            {pages.map((page) => (
              <option key={page.metaPageId} value={page.metaPageId}>
                {page.name}
              </option>
            ))}
          </select>
        </div>
        {canManage && (
          <Button size="sm" disabled={isBusy || brand.identityStatus === "SYNCING"} onClick={() => refresh.mutate()}>
            <RefreshCw className={cn("h-4 w-4", refresh.isPending && "animate-spin")} />
            {refresh.isPending ? "Lendo página e postagens…" : identity ? "Ler de novo" : "Ler identidade"}
          </Button>
        )}
        {brand.identityUpdatedAt && (
          <p className="text-muted-foreground pb-2 text-xs">
            Lida em {format(new Date(brand.identityUpdatedAt), "dd/MM/yyyy HH:mm")}
            {brand.instagramUsername && ` · Instagram @${brand.instagramUsername}`}
          </p>
        )}
      </div>
      {brand.identityError && <p className="text-destructive text-sm">{brand.identityError}</p>}

      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="bg-muted/40 flex aspect-square items-center justify-center overflow-hidden rounded-lg border">
            {logoQuery.data?.dataUrl ? (
              <img src={logoQuery.data.dataUrl} alt="Logo da marca" className="h-full w-full object-contain" />
            ) : (
              <p className="text-muted-foreground p-4 text-center text-xs">Sem logo. Leia a identidade ou envie a logo.</p>
            )}
          </div>
          <p className="text-muted-foreground text-[11px]">{brand.logoUploaded ? "Logo enviada por você" : "Foto da página"}</p>
          {canManage && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={isBusy} onClick={() => logoInput.current?.click()}>
                <ImageUp className="h-4 w-4" />
                Enviar logo
              </Button>
              {brand.logoUploaded && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Voltar a usar a foto da página"
                  disabled={isBusy}
                  onClick={() => deleteLogo.mutate()}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <input
                ref={logoInput}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadLogo.mutate(file);
                  event.target.value = "";
                }}
              />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {sources && (
            <div className="flex flex-wrap gap-2">
              {SOURCE_LABEL.map(({ key, label }) => (
                <span key={key} className={cn("rounded px-2 py-0.5 text-xs font-medium", identitySourceInfo[sources[key]].className)}>
                  {label}: {identitySourceInfo[sources[key]].label}
                </span>
              ))}
            </div>
          )}
          {identity ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                {identity.colors.map((color) => (
                  <span key={color} className="flex items-center gap-1.5 text-xs">
                    <span className="h-5 w-5 rounded border" style={{ backgroundColor: color }} />
                    {color}
                  </span>
                ))}
              </div>
              <p>
                <span className="text-muted-foreground">Estilo: </span>
                {identity.visualStyle}
              </p>
              {identity.engagingThemes.length > 0 && (
                <p>
                  <span className="text-muted-foreground">Temas que engajam: </span>
                  {identity.engagingThemes.join("; ")}
                </p>
              )}
              <p className="text-muted-foreground">{identity.summary}</p>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">A identidade ainda não foi lida.</p>
          )}
        </div>
      </div>

      {topPosts.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Postagens que mais engajaram</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topPosts.map((post) => (
              <a
                key={post.id}
                href={post.permalink ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="group overflow-hidden rounded-lg border"
              >
                <img
                  src={post.mediaUrl!}
                  alt={post.caption?.substring(0, 80) ?? "Postagem"}
                  className="aspect-square w-full object-cover"
                  loading="lazy"
                />
                <div className="text-muted-foreground flex items-center gap-2 p-1.5 text-[11px]">
                  <span className="font-medium">{post.platform === "INSTAGRAM" ? "IG" : "FB"}</span>
                  <span className="flex items-center gap-0.5">
                    <Heart className="h-3 w-3" />
                    {post.likes}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <MessageCircle className="h-3 w-3" />
                    {post.comments}
                  </span>
                  {post.shares > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Share2 className="h-3 w-3" />
                      {post.shares}
                    </span>
                  )}
                </div>
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
