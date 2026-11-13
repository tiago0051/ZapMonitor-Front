import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Film, ImagePlus, Loader2, Palette, Trash2 } from "lucide-react";
import { useRef, useState, type FC } from "react";
import { creativeStudioService } from "@/services/api/creativeStudioService";
import { CreativeStudioDialog } from "../../studio/creativeStudioDialog";
import { toast } from "sonner";
import { assetOriginLabel } from "../pilot/pilotUtils";

const ACCEPT = "image/jpeg,image/png,video/mp4,video/quicktime";

type AdsAssetLibraryProps = {
  account: AdAccount;
  assets: AdCreativeAsset[];
  // Modo de escolha: o criativo marcado e o que fazer ao clicar
  selectedId?: string | null;
  onSelect?: (asset: AdCreativeAsset) => void;
};

/** Imagens e vídeos enviados para a conta na Meta; também serve para escolher o criativo de um anúncio. */
export const AdsAssetLibrary: FC<AdsAssetLibraryProps> = ({ account, assets, selectedId, onSelect }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const params = { clientId: client.id, accountId: account.id };

  // Versão do estúdio vai para a biblioteca da conta e, no modo de escolha, já fica marcada no anúncio
  const useFromStudio = async (generation: CreativeGeneration) => {
    try {
      const asset = await creativeStudioService.sendToAds(client.id, generation.id, account.id);
      queryClient.invalidateQueries({ queryKey: ["metaAds", "assets"] });
      toast.success(
        asset.type === "VIDEO" ? "Vídeo enviado; a Meta leva alguns minutos para processar" : "Imagem enviada para a biblioteca",
      );
      onSelect?.(asset);
    } catch (error) {
      requestErrorHandling(error);
      throw error;
    }
  };

  const upload = useMutation({
    mutationFn: metaAdsService.uploadAsset,
    onError: requestErrorHandling,
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "assets"] });
      toast.success(asset.type === "VIDEO" ? "Vídeo enviado; a Meta leva alguns minutos para processar" : "Imagem enviada");
      onSelect?.(asset);
    },
  });
  const remove = useMutation({
    mutationFn: metaAdsService.deleteAsset,
    onError: requestErrorHandling,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["metaAds", "assets"] }),
  });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
        {assets.map((asset) => (
          <div
            key={asset.id}
            className={cn(
              "group relative overflow-hidden rounded-md border",
              onSelect && "cursor-pointer",
              selectedId === asset.id && "ring-primary ring-2",
            )}
          >
            <button type="button" className="block w-full" disabled={!onSelect} onClick={() => onSelect?.(asset)} title={asset.name}>
              {asset.previewUrl ? (
                <img src={asset.previewUrl} alt={asset.name} className="aspect-square w-full object-cover" loading="lazy" />
              ) : (
                <span className="bg-muted text-muted-foreground flex aspect-square w-full flex-col items-center justify-center gap-1 text-[10px]">
                  <Film className="h-5 w-5" />
                  Vídeo
                </span>
              )}
              <span className="block truncate px-1 py-0.5 text-left text-[10px]">{asset.name}</span>
              {asset.origin !== "UPLOAD" && (
                <span className="text-muted-foreground block truncate px-1 pb-0.5 text-left text-[10px]">
                  {assetOriginLabel[asset.origin]}
                  {asset.angle && ` · ${asset.angle}`}
                </span>
              )}
            </button>
            {can("ads.manage") && !onSelect && (
              <Button
                size="icon"
                variant="secondary"
                className="absolute top-1 right-1 h-8 w-8 md:h-6 md:w-6 md:opacity-60 md:group-hover:opacity-100 md:focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                aria-label={`Tirar ${asset.name} da biblioteca`}
                disabled={remove.isPending}
                onClick={() => remove.mutate({ params: { clientId: client.id, assetId: asset.id } })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}

        {can("ads.manage") && (
          <button
            type="button"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
            className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-xs"
          >
            {upload.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
            {upload.isPending ? "Enviando…" : "Enviar"}
          </button>
        )}
        {can("ads.manage") && (
          <button
            type="button"
            onClick={() => setStudioOpen(true)}
            className="text-muted-foreground hover:bg-muted flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed text-center text-xs"
          >
            <Palette className="h-5 w-5" aria-hidden />
            Criar no estúdio
          </button>
        )}
      </div>
      {can("ads.manage") && (
        <CreativeStudioDialog
          open={studioOpen}
          onOpenChange={setStudioOpen}
          description="Envie as fotos do produto e as instruções: a IA cria o criativo, você pede alterações e manda a versão escolhida para esta conta."
          defaults={{ purpose: "AD" }}
          pickLabel={onSelect ? "Usar neste anúncio" : "Enviar para a biblioteca"}
          onPick={useFromStudio}
        />
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) upload.mutate({ params, file });
          event.target.value = "";
        }}
      />
      <p className="text-muted-foreground text-[11px]">
        Imagem JPG ou PNG até 30 MB, de preferência 1080×1080; vídeo MP4 ou MOV até 100 MB.
      </p>
    </div>
  );
};
