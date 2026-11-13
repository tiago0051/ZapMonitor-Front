import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Film, Image as ImageIcon, Loader2, Palette } from "lucide-react";
import { useState, type FC } from "react";
import { creativeKindLabel, creativePurposeLabel } from "./studioUtils";

const TAKE = 24;

const kindFilters: { value: CreativeKind | ""; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "IMAGE", label: "Imagens" },
  { value: "VIDEO", label: "Vídeos" },
];

type StudioProjectListProps = {
  onOpen: (projectId: string) => void;
  // Mostra só um tipo (ex.: reel só aceita vídeo)
  kind?: CreativeKind;
};

/** Criativos do estúdio em grade, com a capa (favorita ou última versão pronta). */
export const StudioProjectList: FC<StudioProjectListProps> = ({ onOpen, kind: fixedKind }) => {
  const { client } = useClientContext();
  const [kind, setKind] = useState<CreativeKind | "">(fixedKind ?? "");
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ["creativeStudio", client.id, "list", kind, page],
    queryFn: () => creativeStudioService.findAll(client.id, { page, take: TAKE, kind: kind || undefined }),
    refetchInterval: (current) => (current.state.data?.items.some((item) => item.running) ? 5000 : false),
  });
  const items = query.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / TAKE));

  return (
    <div className="grid gap-3">
      {!fixedKind && (
        <div className="flex flex-wrap gap-2">
          {kindFilters.map((filter) => (
            <Button
              key={filter.value}
              size="sm"
              variant={kind === filter.value ? "secondary" : "ghost"}
              aria-pressed={kind === filter.value}
              onClick={() => {
                setKind(filter.value);
                setPage(1);
              }}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      )}

      {query.isLoading && <LoadingState label="Carregando criativos..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar os criativos." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && !items.length && (
        <EmptyState
          icon={Palette}
          title="Nenhum criativo ainda"
          description="Clique em Novo criativo, escreva as instruções e envie as fotos do produto: a IA cria a arte e você pede alterações até ficar do jeito certo."
        />
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpen(item.id)}
              className="hover:bg-accent/40 focus-visible:ring-ring grid content-start gap-2 rounded-xl border p-2 text-left outline-none focus-visible:ring-2"
            >
              <div className="bg-muted relative aspect-square overflow-hidden rounded-lg">
                {item.cover?.url ? (
                  item.cover.kind === "VIDEO" ? (
                    <video src={item.cover.url} muted playsInline className="h-full w-full object-cover" />
                  ) : (
                    <img src={item.cover.url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )
                ) : (
                  <span className="text-muted-foreground flex h-full items-center justify-center">
                    {item.kind === "VIDEO" ? <Film className="h-6 w-6" aria-hidden /> : <ImageIcon className="h-6 w-6" aria-hidden />}
                  </span>
                )}
                {item.running && (
                  <span className="bg-background/90 absolute top-1 left-1 flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> Gerando
                  </span>
                )}
              </div>
              <span className="line-clamp-2 text-sm font-medium">{item.title}</span>
              <span className={cn("text-muted-foreground text-xs")}>
                {creativeKindLabel[item.kind]} · {creativePurposeLabel[item.purpose]} · {item.versions}{" "}
                {item.versions === 1 ? "versão" : "versões"}
              </span>
              <span className="text-muted-foreground text-[11px] tabular-nums">{format(new Date(item.updatedAt), "dd/MM/yyyy HH:mm")}</span>
            </button>
          ))}
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
    </div>
  );
};
