import { useClientContext } from "@/context/ClientContext/clientContext";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export type MediaQuotaScope = "studio" | "posts";

export const mediaQuotaKey = (clientId: string) => ["creativeStudio", clientId, "usage"];

/** Uso do dia (últimas 24 horas) de imagens e vídeos gerados pela IA; o limite é por cliente. */
export function useMediaQuota(scope: MediaQuotaScope, enabled = true) {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: mediaQuotaKey(client.id),
    queryFn: () => creativeStudioService.findDailyUsage(client.id),
    enabled,
    staleTime: 30_000,
    refetchInterval: 120_000,
  });
  const usage = query.data?.[scope] ?? null;
  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: mediaQuotaKey(client.id) }), [queryClient, client.id]);

  return {
    usage,
    posts: query.data?.posts ?? null,
    // Sem a resposta ainda, não bloqueia: o back confere o limite de qualquer forma
    imagesLeft: usage ? Math.max(0, usage.images.max - usage.images.used) : Infinity,
    videosLeft: usage ? Math.max(0, usage.videos.max - usage.videos.used) : Infinity,
    refresh,
  };
}

/** Explicação curta para botão desabilitado pelo limite do dia. */
export const quotaReachedText = (kind: "image" | "video") =>
  kind === "video"
    ? "Limite de vídeos com IA de hoje atingido. Ele libera aos poucos, 24 horas depois de cada vídeo gerado."
    : "Limite de imagens com IA de hoje atingido. Ele libera aos poucos, 24 horas depois de cada imagem gerada.";
