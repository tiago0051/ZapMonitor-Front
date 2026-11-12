import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { strategyWikiService } from "@/services/api/strategyWikiService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Eye, EyeOff, ExternalLink, Pencil, Plus, RotateCcw, Search, Sparkles, Trash2 } from "lucide-react";
import { useMemo, useState, type FC } from "react";
import { toast } from "sonner";
import { SimpleMarkdown } from "./simpleMarkdown";
import { StrategyArticleEditor } from "./strategyArticleEditor";
import {
  matchesChannel,
  matchesSearch,
  STRATEGY_CATEGORIES,
  STRATEGY_CATEGORY_LABEL,
  STRATEGY_CHANNEL_LABEL,
  STRATEGY_CHANNELS,
  STRATEGY_PURPOSE_LABEL,
} from "./wikiUtils";

const Tag: FC<{ children: string; tone?: "default" | "primary" | "warning" }> = ({ children, tone = "default" }) => (
  <span
    className={cn(
      "inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap",
      tone === "primary" && "bg-primary/10 text-primary",
      tone === "warning" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      tone === "default" && "bg-muted text-muted-foreground",
    )}
  >
    {children}
  </span>
);

const originLabel: Record<StrategyArticleOrigin, string | null> = { SYSTEM: null, EDITED: "Editado", CUSTOM: "Criado pelo dono" };

const ArticleReader: FC<{
  article: StrategyArticle;
  segmentLabel: string | null;
  isOwner: boolean;
  onBack: () => void;
  onEdit: () => void;
}> = ({ article, segmentLabel, isOwner, onBack, onEdit }) => {
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["strategyWiki"] });

  const toggleEnabled = useMutation({
    mutationFn: () => strategyWikiService.setEnabled({ params: { slug: article.slug }, body: { enabled: !article.enabled } }),
    onSuccess: (saved) => {
      toast.success(saved.enabled ? "Artigo visível de novo" : "Artigo escondido das telas e da IA");
      refresh();
    },
    onError: requestErrorHandling,
  });
  const resetOrDelete = useMutation({
    mutationFn: () => strategyWikiService.resetOrDelete({ params: { slug: article.slug } }),
    onSuccess: () => {
      toast.success(article.origin === "CUSTOM" ? "Artigo apagado" : "Artigo voltou ao texto padrão");
      if (article.origin === "CUSTOM") onBack();
      refresh();
    },
    onError: requestErrorHandling,
  });

  const handleResetOrDelete = async () => {
    const isCustom = article.origin === "CUSTOM";
    const confirmed = await confirm({
      title: isCustom ? "Apagar este artigo?" : "Voltar ao texto padrão?",
      description: isCustom ? "Ele sai da wiki e da IA de todos os clientes." : "A sua edição deste artigo será descartada.",
      confirmLabel: isCustom ? "Apagar" : "Voltar ao padrão",
      destructive: true,
    });
    if (confirmed) resetOrDelete.mutate();
  };

  return (
    <article className="space-y-4">
      {confirmDialog}
      <Button variant="ghost" size="sm" className="-ml-2 md:hidden" onClick={onBack}>
        <ArrowLeft className="size-4" /> Voltar à lista
      </Button>

      <header className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          <Tag>{STRATEGY_CATEGORY_LABEL[article.category] ?? article.category}</Tag>
          {article.channels.map((channel) => (
            <Tag key={channel}>{STRATEGY_CHANNEL_LABEL[channel]}</Tag>
          ))}
          {article.segments.length > 0 && <Tag tone="primary">{segmentLabel ? `Do seu segmento: ${segmentLabel}` : "Segmento"}</Tag>}
          {isOwner && originLabel[article.origin] && <Tag tone="warning">{originLabel[article.origin]!}</Tag>}
          {isOwner && !article.enabled && <Tag tone="warning">Escondido</Tag>}
        </div>
        <h2 className="text-lg font-semibold sm:text-xl">{article.title}</h2>
        <p className="text-muted-foreground text-sm">{article.summary}</p>
      </header>

      {isOwner && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={onEdit}>
            <Pencil className="size-4" /> Editar
          </Button>
          <Button size="sm" variant="outline" disabled={toggleEnabled.isPending} onClick={() => toggleEnabled.mutate()}>
            {article.enabled ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            {article.enabled ? "Esconder" : "Mostrar"}
          </Button>
          {article.origin !== "SYSTEM" && (
            <Button size="sm" variant="outline" disabled={resetOrDelete.isPending} onClick={handleResetOrDelete}>
              {article.origin === "CUSTOM" ? <Trash2 className="size-4" /> : <RotateCcw className="size-4" />}
              {article.origin === "CUSTOM" ? "Apagar" : "Voltar ao padrão"}
            </Button>
          )}
        </div>
      )}

      <section className="bg-primary/5 space-y-2 rounded-lg border p-3" aria-labelledby={`guidance-${article.slug}`}>
        <h3 id={`guidance-${article.slug}`} className="flex items-center gap-1.5 text-sm font-semibold">
          <Sparkles className="text-primary size-4" /> O que a IA segue
        </h3>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {article.guidance.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
        <p className="text-muted-foreground text-xs">
          Usado em: {article.purposes.map((purpose) => STRATEGY_PURPOSE_LABEL[purpose]).join(", ")}.
        </p>
      </section>

      <SimpleMarkdown markdown={article.body} />

      {article.sources.length > 0 && (
        <section className="space-y-1 border-t pt-3">
          <h3 className="text-sm font-semibold">Fontes</h3>
          <ul className="space-y-1">
            {article.sources.map((source) => (
              <li key={source.url}>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary inline-flex items-center gap-1 text-sm underline-offset-2 hover:underline"
                >
                  {source.title} <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
};

/**
 * Wiki de estratégias de marketing (marca, oferta, criativos, funil, verba, medição, plataformas, segmentos). A IA que cria
 * os anúncios e a que conversa sobre estratégia usam estes artigos; o dono do sistema edita para todos os clientes.
 */
export const AdsStrategyWiki: FC<{ platform?: AdPlatform }> = ({ platform }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const isOwner = !!user?.isOwner;
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<StrategyCategory | "ALL">("ALL");
  const [channel, setChannel] = useState<StrategyChannel | "ALL">("ALL");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [editor, setEditor] = useState<{ article: StrategyArticle | null } | null>(null);

  const clientQuery = useQuery({
    queryKey: ["strategyWiki", "client", client.id],
    queryFn: () => strategyWikiService.findForClient({ params: { clientId: client.id } }),
  });
  // O dono vê também os artigos escondidos, para poder mostrá-los de novo
  const ownerQuery = useQuery({ queryKey: ["strategyWiki", "owner"], queryFn: strategyWikiService.findForOwner, enabled: isOwner });
  const query = isOwner ? ownerQuery : clientQuery;
  const segment = clientQuery.data?.segment ?? null;
  const segmentLabel = clientQuery.data?.segmentLabel ?? null;

  const visible = useMemo(() => {
    const articles = (query.data?.articles ?? []).filter(
      (article) =>
        // Artigos de outros segmentos só aparecem para o dono
        (isOwner || !article.segments.length || (!!segment && article.segments.includes(segment))) &&
        (category === "ALL" || article.category === category) &&
        matchesChannel(article, channel) &&
        matchesSearch(article, search),
    );
    // Os do segmento do cliente vêm primeiro, depois os essenciais
    return articles.sort(
      (first, second) =>
        Number(!!segment && second.segments.includes(segment)) - Number(!!segment && first.segments.includes(segment)) ||
        first.priority - second.priority,
    );
  }, [query.data, isOwner, segment, category, channel, search]);

  const selected = query.data?.articles.find((article) => article.slug === selectedSlug) ?? null;

  if (query.isLoading) return <LoadingState label="Carregando a wiki…" />;
  if (query.isError)
    return <ErrorState message="Não foi possível carregar a wiki" onRetry={() => query.refetch()} isRetrying={query.isFetching} />;

  const grouped = STRATEGY_CATEGORIES.map((item) => ({
    category: item,
    articles: visible.filter((article) => article.category === item),
  })).filter((group) => group.articles.length);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-2xl space-y-1">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <BookOpen className="size-5" /> Wiki de estratégias
          </h2>
          <p className="text-muted-foreground text-sm">
            Estratégias de crescimento de marca e venda na Meta, no YouTube, no TikTok e na web. A IA usa estes artigos ao criar campanhas e
            criativos, ao analisar a conta e na conversa de estratégia — sempre abaixo dos números da sua conta.
          </p>
          {segmentLabel && (
            <p className="text-xs">
              Seu segmento: <strong>{segmentLabel}</strong> — os artigos dele aparecem primeiro.
            </p>
          )}
        </div>
        {isOwner && (
          <Button size="sm" onClick={() => setEditor({ article: null })}>
            <Plus className="size-4" /> Novo artigo
          </Button>
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="relative">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar na wiki"
            placeholder="Buscar: gancho, verba, TikTok, oferta…"
            className="pl-8"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          aria-label="Assunto"
          className={cn(crmSelectClassName, "sm:w-48")}
          value={category}
          onChange={(event) => setCategory(event.target.value as StrategyCategory | "ALL")}
        >
          <option value="ALL">Todos os assuntos</option>
          {STRATEGY_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {STRATEGY_CATEGORY_LABEL[item]}
            </option>
          ))}
        </select>
        <select
          aria-label="Canal"
          className={cn(crmSelectClassName, "sm:w-40")}
          value={channel}
          onChange={(event) => setChannel(event.target.value as StrategyChannel | "ALL")}
        >
          <option value="ALL">Todos os canais</option>
          {STRATEGY_CHANNELS.map((item) => (
            <option key={item} value={item}>
              {STRATEGY_CHANNEL_LABEL[item]}
              {platform === item ? " (esta conta)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(240px,320px)_1fr]">
        <nav aria-label="Artigos da wiki" className={cn("space-y-4", selected && "hidden md:block")}>
          {grouped.length === 0 ? (
            <EmptyState title="Nenhum artigo encontrado" description="Tente outra palavra ou tire os filtros." />
          ) : (
            grouped.map((group) => (
              <div key={group.category} className="space-y-1">
                <h3 className="text-muted-foreground px-2 text-xs font-semibold tracking-wide uppercase">
                  {STRATEGY_CATEGORY_LABEL[group.category]}
                </h3>
                <ul>
                  {group.articles.map((article) => (
                    <li key={article.slug}>
                      <button
                        type="button"
                        onClick={() => setSelectedSlug(article.slug)}
                        aria-current={article.slug === selectedSlug ? "page" : undefined}
                        className={cn(
                          "hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-sm transition-colors",
                          article.slug === selectedSlug && "bg-muted font-medium",
                          !article.enabled && "opacity-50",
                        )}
                      >
                        {article.title}
                        {!!segment && article.segments.includes(segment) && (
                          <span className="text-primary ml-1 text-[11px] font-medium">· seu segmento</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </nav>

        <div className={cn("min-w-0 rounded-lg border p-3 sm:p-4", !selected && "hidden md:block")}>
          {selected ? (
            <ArticleReader
              key={selected.slug}
              article={selected}
              segmentLabel={segmentLabel}
              isOwner={isOwner}
              onBack={() => setSelectedSlug(null)}
              onEdit={() => setEditor({ article: selected })}
            />
          ) : (
            <EmptyState
              icon={BookOpen}
              title="Escolha um artigo"
              description="Cada artigo traz o que a IA segue e a explicação completa, com fontes."
            />
          )}
        </div>
      </div>

      {editor && (
        <StrategyArticleEditor
          key={editor.article?.slug ?? "new"}
          article={editor.article}
          open
          onOpenChange={(open) => !open && setEditor(null)}
          onSaved={(saved) => setSelectedSlug(saved.slug)}
        />
      )}
    </div>
  );
};
