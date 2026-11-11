import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";
import { useState, type FC } from "react";

/** Roteiros de vídeo curto que a IA escreve com a base da marca e o que já vende; o gestor grava e sobe na campanha. */
export const AdsVideoScripts: FC<{ account: AdAccount }> = ({ account }) => {
  const { client, can } = useClientContext();
  const [brief, setBrief] = useState("");
  const queryClient = useQueryClient();
  const write = useMutation({ mutationFn: adsPlatformService.writeVideoScripts, onError: requestErrorHandling });
  const generate = useMutation({
    mutationFn: adsPlatformService.generateVideo,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "videoGenerations", client.id, account.id] });
      toast.success("A IA está gerando o vídeo; fica pronto em alguns minutos");
    },
  });
  const generationsQuery = useQuery({
    queryKey: ["metaAds", "videoGenerations", client.id, account.id],
    queryFn: () => adsPlatformService.findVideoGenerations({ params: { clientId: client.id, accountId: account.id } }),
    // Acompanha os vídeos que ainda estão sendo gerados
    refetchInterval: (query) => (query.state.data?.some((item) => item.status === "QUEUED" || item.status === "RUNNING") ? 15000 : false),
  });
  const running = (generationsQuery.data ?? []).filter((item) => item.status === "QUEUED" || item.status === "RUNNING").length;
  const failed = (generationsQuery.data ?? []).find((item) => item.status === "FAILED");

  if (!can("ads.manage")) return null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Roteiros para gravar</h2>
        <p className="text-muted-foreground text-xs">
          Vídeo é o que mais pesa no resultado. A IA escreve 3 roteiros curtos com ganchos diferentes, seguindo o que já vende na conta.
          Grave com o celular, na vertical, ou peça para a IA gerar o vídeo a partir do roteiro.
        </p>
      </div>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          write.mutate({ params: { clientId: client.id, accountId: account.id }, body: { brief } });
        }}
      >
        <div className="grid min-w-0 flex-1 gap-1">
          <Label htmlFor="scripts-brief" className="text-xs">
            Sobre o que (opcional)
          </Label>
          <Input
            id="scripts-brief"
            value={brief}
            maxLength={1000}
            placeholder="Ex.: depoimento de cliente aposentado"
            onChange={(event) => setBrief(event.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="outline" disabled={write.isPending}>
          <Sparkles className="h-4 w-4" />
          {write.isPending ? "Escrevendo…" : "Escrever roteiros"}
        </Button>
      </form>

      {running > 0 && <p className="text-muted-foreground text-xs">{running} vídeo(s) sendo gerado(s) pela IA…</p>}
      {failed && !running && <p className="text-destructive text-xs">Último vídeo da IA falhou: {failed.error}</p>}
      {write.data && (
        <div className="grid gap-3 md:grid-cols-3">
          {write.data.map((script, index) => (
            <article key={index} className="min-w-0 space-y-2 rounded-lg border p-3 text-sm">
              <h3 className="font-semibold">{script.titulo}</h3>
              <p className="text-xs">
                <span className="font-medium">Gancho:</span> {script.gancho}
              </p>
              <ol className="space-y-1 text-xs">
                {script.cenas.map((scene, sceneIndex) => (
                  <li key={sceneIndex}>
                    <span className="text-muted-foreground tabular-nums">{scene.tempo}</span> {scene.fala}
                    {scene.legenda && <span className="text-muted-foreground"> · legenda: “{scene.legenda}”</span>}
                    {scene.imagem && <span className="text-muted-foreground"> · {scene.imagem}</span>}
                  </li>
                ))}
              </ol>
              <p className="text-xs">
                <span className="font-medium">Chamada:</span> {script.chamada}
              </p>
              {script.porQue && <p className="text-muted-foreground text-xs">{script.porQue}</p>}
              <Button
                size="sm"
                variant="outline"
                disabled={generate.isPending}
                onClick={() => generate.mutate({ params: { clientId: client.id, accountId: account.id }, body: { script } })}
              >
                Gerar vídeo com a IA
              </Button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
};
