import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { socialTextareaClassName } from "@/pages/dashboard/posts/postsUtils";
import { brandIdentityService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ExternalLink, Plus, Sparkles, Upload, X } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

const sourceLabel: Record<BrandSourceStatus, string> = {
  OK: "lida",
  MISSING_PERMISSION: "sem permissão",
  NOT_LINKED: "não ligada",
  FAILED: "falhou",
};

const emptyIdentity: BrandIdentityData = { colors: [], visualStyle: "", logoDescription: "", engagingThemes: [], summary: "" };

const BrandForm: FC<{ brand: BrandIdentity }> = ({ brand }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const logoRef = useRef<HTMLInputElement>(null);
  const canEdit = can("brand.manage");

  const [pageId, setPageId] = useState(brand.metaPageId ?? "");
  const [about, setAbout] = useState(brand.about ?? "");
  const [hashtags, setHashtags] = useState(brand.fixedHashtags.join(" "));
  const [identity, setIdentity] = useState<BrandIdentityData>(brand.identity ?? emptyIdentity);

  const pagesQuery = useQuery({
    enabled: canEdit,
    meta: { errorHandledInline: true },
    queryKey: ["brandIdentity", client.id, "pages"],
    queryFn: () => brandIdentityService.findPages(client.id),
  });

  const apply = (saved: BrandIdentity) => {
    queryClient.setQueryData(["brandIdentity", client.id], saved);
    queryClient.invalidateQueries({ queryKey: ["socialPosts", client.id, "setup"] });
  };

  const save = useMutation({
    mutationFn: () =>
      brandIdentityService.update(client.id, {
        about,
        fixedHashtags: hashtags.split(/[\s,]+/).filter(Boolean),
        metaPageId: pageId || undefined,
        identity,
      }),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      apply(saved);
      toast.success("Identidade da marca salva");
    },
  });
  const refresh = useMutation({
    mutationFn: async () => {
      // Salva o que foi escrito antes: o "sobre a empresa" entra na leitura da IA
      await brandIdentityService.update(client.id, {
        about,
        fixedHashtags: hashtags.split(/[\s,]+/).filter(Boolean),
        metaPageId: pageId || undefined,
      });
      return brandIdentityService.refresh(client.id, pageId || undefined);
    },
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      apply(saved);
      toast.success("A IA leu a página e o Instagram");
    },
  });
  const uploadLogo = useMutation({
    mutationFn: (file: File) => brandIdentityService.uploadLogo(client.id, file),
    onError: requestErrorHandling,
    onSuccess: (saved) => {
      apply(saved);
      toast.success("Logo atualizada");
    },
  });

  const setColor = (index: number, value: string) =>
    setIdentity((current) => ({
      ...current,
      colors: current.colors.map((color, position) => (position === index ? value.toUpperCase() : color)),
    }));

  const pages = pagesQuery.data ?? [];
  const busy = refresh.isPending || brand.status === "SYNCING";

  return (
    <div className="grid gap-6">
      <section className="grid gap-3">
        <h3 className="font-medium">Página e Instagram</h3>
        {canEdit && pagesQuery.isSuccess && !pages.length && (
          <p className="text-muted-foreground text-sm">
            Nenhuma página encontrada.{" "}
            <Link to={`${baseUrl}/configuration?tab=metaAds`} className="underline">
              Conecte a Meta
            </Link>{" "}
            autorizando a página da empresa.
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="grid gap-1.5">
            <Label htmlFor="brand-page">Página do Facebook</Label>
            <select
              id="brand-page"
              value={pageId}
              disabled={!canEdit || !pages.length}
              onChange={(event) => setPageId(event.target.value)}
              className={cn(crmSelectClassName, "sm:w-72")}
            >
              {!pageId && <option value="">{pages.length ? "Escolha a página" : (brand.pageName ?? "Nenhuma página")}</option>}
              {pageId && !pages.some((page) => page.id === pageId) && <option value={pageId}>{brand.pageName ?? pageId}</option>}
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.name}
                </option>
              ))}
            </select>
          </div>
          {canEdit && (
            <Button disabled={busy || !pages.length} onClick={() => refresh.mutate()}>
              <Sparkles className="mr-2 h-4 w-4" aria-hidden />
              {busy ? "A IA está lendo..." : brand.identity ? "Ler de novo com IA" : "Ler a página e o Instagram com IA"}
            </Button>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          {brand.instagramUsername
            ? `Instagram ligado: @${brand.instagramUsername}`
            : "Nenhum Instagram profissional ligado à página ainda."}
          {brand.identityUpdatedAt && ` · Lida em ${format(new Date(brand.identityUpdatedAt), "dd/MM/yyyy 'às' HH:mm")}`}
        </p>
        {brand.sources && (
          <p className="text-muted-foreground text-xs">
            Página: {sourceLabel[brand.sources.page]} · Postagens do Facebook: {sourceLabel[brand.sources.facebookPosts]} · Instagram:{" "}
            {sourceLabel[brand.sources.instagram]}
          </p>
        )}
        {brand.status === "FAILED" && brand.error && <p className="text-sm text-red-700 dark:text-red-300">{brand.error}</p>}
      </section>

      <section className="grid gap-3">
        <h3 className="font-medium">Logo</h3>
        <div className="flex flex-wrap items-center gap-3">
          {brand.logoUrl ? (
            <img src={brand.logoUrl} alt="Logo da marca" className="bg-muted h-20 w-20 rounded-lg border object-contain p-1" />
          ) : (
            <div className="bg-muted text-muted-foreground grid h-20 w-20 place-items-center rounded-lg border text-xs">sem logo</div>
          )}
          {canEdit && (
            <>
              <Button variant="outline" size="sm" disabled={uploadLogo.isPending} onClick={() => logoRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" aria-hidden />
                {uploadLogo.isPending ? "Enviando..." : "Enviar logo"}
              </Button>
              <input
                ref={logoRef}
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) uploadLogo.mutate(file);
                  event.target.value = "";
                }}
              />
            </>
          )}
          <p className="text-muted-foreground max-w-sm text-xs">
            {brand.logoUploaded
              ? "Logo enviada por você; a leitura da página não troca."
              : "Sem logo enviada, usamos a foto da página. A IA coloca a logo nas imagens das postagens e ela pode ir para os e-mails."}
          </p>
        </div>
      </section>

      <section className="grid gap-3">
        <h3 className="font-medium">Visual</h3>
        <div className="grid gap-1.5">
          <span className="text-sm font-medium">Cores da marca</span>
          <div className="flex flex-wrap items-center gap-2">
            {identity.colors.map((color, index) => (
              <div key={index} className="flex items-center gap-1 rounded-md border p-1">
                <input
                  type="color"
                  aria-label={`Cor ${index + 1}`}
                  value={color}
                  disabled={!canEdit}
                  onChange={(event) => setColor(index, event.target.value)}
                  className="h-7 w-9 cursor-pointer rounded"
                />
                <span className="font-mono text-xs">{color}</span>
                {canEdit && (
                  <button
                    type="button"
                    aria-label={`Tirar a cor ${color}`}
                    onClick={() =>
                      setIdentity((current) => ({ ...current, colors: current.colors.filter((_, position) => position !== index) }))
                    }
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            {canEdit && identity.colors.length < 6 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIdentity((current) => ({ ...current, colors: [...current.colors, "#1F2937"] }))}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                Cor
              </Button>
            )}
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="brand-style">Estilo visual</Label>
          <textarea
            id="brand-style"
            value={identity.visualStyle}
            maxLength={1000}
            disabled={!canEdit}
            placeholder="Ex.: fotos claras com fundo branco, tipografia moderna, muito verde e detalhes em dourado"
            onChange={(event) => setIdentity((current) => ({ ...current, visualStyle: event.target.value }))}
            className={socialTextareaClassName}
          />
        </div>
        {identity.engagingThemes.length > 0 && (
          <p className="text-muted-foreground text-sm">
            <span className="font-medium">Temas que mais engajam:</span> {identity.engagingThemes.join(" · ")}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="font-medium">Texto</h3>
        <div className="grid gap-1.5">
          <Label htmlFor="brand-about">Sobre a empresa, público e tom de voz</Label>
          <textarea
            id="brand-about"
            value={about}
            maxLength={5000}
            disabled={!canEdit}
            placeholder="Ex.: Loja de perfumes em Niterói para mulheres de 25 a 45 anos. Tom próximo e alegre, sem gírias. Entregamos em 24 horas."
            onChange={(event) => setAbout(event.target.value)}
            className={socialTextareaClassName}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="brand-hashtags">Hashtags fixas</Label>
          <Input
            id="brand-hashtags"
            value={hashtags}
            disabled={!canEdit}
            placeholder="#suamarca #suacidade"
            onChange={(event) => setHashtags(event.target.value)}
          />
          <p className="text-muted-foreground text-xs">Entram em todas as postagens, além das que a IA sugere.</p>
        </div>
      </section>

      {canEdit && (
        <Button className="justify-self-start" disabled={save.isPending || busy} onClick={() => save.mutate()}>
          {save.isPending ? "Salvando..." : "Salvar identidade"}
        </Button>
      )}

      {brand.posts.length > 0 && (
        <section className="grid gap-2">
          <h3 className="font-medium">Postagens que mais engajaram</h3>
          <p className="text-muted-foreground text-xs">A IA de imagem usa as primeiras como referência de estilo.</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
            {brand.posts.map((post, index) => (
              <a
                key={index}
                href={post.permalink ?? undefined}
                target="_blank"
                rel="noreferrer"
                className="group relative overflow-hidden rounded-lg border"
                title={post.caption ?? undefined}
              >
                {post.mediaUrl ? (
                  <img src={post.mediaUrl} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                ) : (
                  <div className="bg-muted aspect-square" />
                )}
                <span className="bg-background/85 absolute inset-x-0 bottom-0 flex items-center justify-between px-1.5 py-0.5 text-[11px] tabular-nums">
                  {post.likes} curtidas
                  {post.permalink && <ExternalLink className="h-3 w-3" aria-hidden />}
                </span>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

/** Identidade da marca do cliente: uma só para postagens, e-mails e anúncios. */
export const BrandIdentitySettings = () => {
  const { client } = useClientContext();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["brandIdentity", client.id],
    queryFn: () => brandIdentityService.find(client.id),
    refetchInterval: (current) => (current.state.data?.status === "SYNCING" ? 4000 : false),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identidade da marca</CardTitle>
        <CardDescription>
          A IA lê a página do Facebook e o Instagram da empresa e aprende a logo, as cores, o estilo e os temas que engajam. Vale para todo
          o sistema: imagens e legendas das postagens, visual dos e-mails e criativos dos anúncios.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {query.isLoading && <LoadingState label="Carregando..." />}
        {query.isError && (
          <ErrorState
            message="Não foi possível carregar a identidade da marca."
            onRetry={() => query.refetch()}
            isRetrying={query.isFetching}
          />
        )}
        {query.data && (
          <BrandForm key={`${query.data.identityUpdatedAt}-${query.data.metaPageId}-${query.data.status}`} brand={query.data} />
        )}
      </CardContent>
    </Card>
  );
};
