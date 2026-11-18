import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { socialPostService } from "@/services/api/socialPostService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { BarChart3, Leaf } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router";
import { formatCount, insightsSummary, socialFormatLabel, socialPlatformLabel } from "./postsUtils";

const useResults = (days: number) => {
  const { client } = useClientContext();
  return useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["socialPosts", client.id, "results", days],
    queryFn: () => socialPostService.findResults(client.id, days),
    staleTime: 5 * 60_000,
  });
};

const Stat: FC<{ label: string; value: number | null; hint?: string }> = ({ label, value, hint }) => (
  <div className="rounded-lg border p-3">
    <p className="text-muted-foreground text-xs">{label}</p>
    <p className="text-xl font-semibold tabular-nums">{formatCount(value)}</p>
    {hint && <p className="text-muted-foreground text-[11px]">{hint}</p>}
  </div>
);

/** Visão de resultados em Postagens: totais do período e cada postagem com alcance e engajamento. */
export const PostsResults: FC<{ days?: number }> = ({ days = 30 }) => {
  const baseUrl = useBaseUrl();
  const query = useResults(days);

  if (query.isLoading) return <LoadingState label="Carregando resultados..." />;
  if (query.isError)
    return <ErrorState message="Não foi possível buscar os resultados." onRetry={() => query.refetch()} isRetrying={query.isFetching} />;
  const results = query.data;
  if (!results?.posts)
    return (
      <EmptyState
        icon={BarChart3}
        title="Nenhuma postagem publicada no período"
        description="Quando uma postagem sai, o alcance, as curtidas e os comentários aparecem aqui (atualizados a cada 6 horas)."
      />
    );

  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Postagens publicadas" value={results.posts} hint={`Últimos ${results.days} dias`} />
        <Stat label="Pessoas alcançadas" value={results.total.reach} hint="Somando Instagram e Facebook" />
        <Stat label="Engajamento" value={results.engagement} hint="Curtidas, comentários, compartilhamentos e salvos" />
        <Stat label="Comentários" value={results.total.comments} />
      </div>
      <ul className="grid gap-2">
        {results.items.map((item) => (
          <li key={item.id}>
            <Link
              to={`${baseUrl}/posts/${item.id}`}
              className="hover:bg-accent/40 focus-visible:ring-ring flex gap-3 rounded-xl border p-3 outline-none focus-visible:ring-2"
            >
              {item.thumbnailUrl && item.thumbnailKind === "IMAGE" ? (
                <img src={item.thumbnailUrl} alt="" loading="lazy" className="aspect-[4/5] w-14 shrink-0 rounded-md object-cover" />
              ) : (
                <div className="bg-muted aspect-[4/5] w-14 shrink-0 rounded-md" aria-hidden />
              )}
              <div className="grid min-w-0 flex-1 content-start gap-1">
                <p className="line-clamp-1 text-sm font-medium">{item.title}</p>
                <p className="text-muted-foreground text-xs">
                  {socialFormatLabel[item.format]} · {item.platforms.map((platform) => socialPlatformLabel[platform]).join(" e ")}
                  {item.publishedAt && ` · ${format(new Date(item.publishedAt), "dd/MM")}`}
                </p>
                <p className="text-xs tabular-nums">{insightsSummary(item.insights) ?? "Resultados ainda não lidos da Meta"}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-lg font-semibold tabular-nums">{formatCount(item.engagement)}</p>
                <p className="text-muted-foreground text-[11px]">engajamento</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Bloco "Orgânico" na aba Resultados de Anúncios: o alcance e o engajamento das postagens ao lado do pago, sem mexer na
 * comparação das plataformas pagas.
 */
export const OrganicResultsBlock: FC = () => {
  const baseUrl = useBaseUrl();
  const query = useResults(30);
  const results = query.data;
  if (query.isLoading || query.isError || !results) return null;

  return (
    <section aria-labelledby="organic-results" className="grid gap-3 rounded-xl border p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Leaf className="h-4 w-4 text-emerald-600" aria-hidden />
        <h2 id="organic-results" className="font-semibold">
          Orgânico (postagens)
        </h2>
        <span className="text-muted-foreground text-xs">Últimos {results.days} dias, sem verba</span>
        <Link to={`${baseUrl}/posts?view=results`} className="text-primary ml-auto text-sm underline-offset-2 hover:underline">
          Ver postagens
        </Link>
      </div>
      {results.posts ? (
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Postagens publicadas" value={results.posts} />
          <Stat label="Pessoas alcançadas" value={results.total.reach} />
          <Stat label="Engajamento" value={results.engagement} hint="Curtidas, comentários, compartilhamentos e salvos" />
          <Stat label="Cliques" value={results.total.clicks} hint="Só o Facebook informa" />
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhuma postagem publicada nos últimos 30 dias.</p>
      )}
    </section>
  );
};
