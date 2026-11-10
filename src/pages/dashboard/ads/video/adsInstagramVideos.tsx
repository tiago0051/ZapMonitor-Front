import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronRight } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";
import { AdsVideoScripts } from "./adsVideoScripts";

/**
 * Meta: roteiros e vídeos gerados pela IA para os anúncios do Instagram (Reels e Stories). O vídeo pronto vai para a
 * biblioteca de criativos da conta e é escolhido na criação de campanha abaixo.
 */
export const AdsInstagramVideos: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const params = { clientId: client.id, accountId: account.id };

  const generationsQuery = useQuery({
    queryKey: ["metaAds", "videoGenerations", client.id, account.id],
    queryFn: () => adsPlatformService.findVideoGenerations({ params }),
  });
  const send = useMutation({
    mutationFn: adsPlatformService.sendGeneratedVideo,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "assets"] });
      toast.success("Vídeo na biblioteca de criativos; escolha ele ao montar a campanha");
    },
  });
  const ready = (generationsQuery.data ?? []).filter((generation) => generation.status === "DONE");

  if (!can("ads.manage")) return null;

  return (
    // Fica recolhido para não competir com a criação de campanha
    <details className="group rounded-lg border p-3">
      <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
        Vídeo com IA para o Instagram (Reels e Stories)
      </summary>
      <div className="mt-3 space-y-4">
        <AdsVideoScripts account={account} />

        {ready.length > 0 && (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Vídeos prontos</h3>
            <ul className="flex flex-wrap gap-2">
              {ready.map((generation) => (
                <li key={generation.id} className="flex items-center gap-1 rounded border px-2 py-1 text-xs">
                  {generation.url ? (
                    <a href={generation.url} target="_blank" rel="noreferrer" className="underline">
                      {format(new Date(generation.createdAt), "dd/MM HH:mm")}
                    </a>
                  ) : (
                    format(new Date(generation.createdAt), "dd/MM HH:mm")
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2"
                    disabled={send.isPending}
                    onClick={() => send.mutate({ params: { clientId: client.id, generationId: generation.id } })}
                  >
                    Enviar para a biblioteca
                  </Button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </details>
  );
};
