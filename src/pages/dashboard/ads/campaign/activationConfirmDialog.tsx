import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Play } from "lucide-react";
import { useState, type FC } from "react";
import { formatMoney } from "../adsUtils";
import { useSpendStatus } from "../components/useSpendStatus";

const PREVIEW_LABEL: Record<string, string> = {
  MOBILE_FEED_STANDARD: "Feed do Facebook",
  INSTAGRAM_STANDARD: "Feed do Instagram",
};

// Prévia montada com a mídia e o texto do plano, quando a Meta não devolve a dela
const BuiltPreview: FC<{ creative: AdActivationPreview["creatives"][number] }> = ({ creative }) => (
  <div className="mx-auto w-full max-w-[320px] overflow-hidden rounded-lg border text-sm">
    <p className="line-clamp-4 p-3 whitespace-pre-line">{creative.primaryText}</p>
    {creative.mediaUrl &&
      (creative.mediaType === "VIDEO" ? (
        <video src={creative.mediaUrl} className="aspect-square w-full bg-black object-cover" muted controls />
      ) : (
        <img src={creative.mediaUrl} alt="" className="aspect-square w-full object-cover" />
      ))}
    <div className="bg-muted/50 flex items-center gap-2 p-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{creative.headline}</p>
        {creative.description && <p className="text-muted-foreground truncate text-xs">{creative.description}</p>}
      </div>
      <span className="bg-background shrink-0 rounded border px-2 py-1 text-xs font-medium">WhatsApp</span>
    </div>
  </div>
);

type Props = {
  draftId: string;
  accountId: string;
  open: boolean;
  isActivating: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
};

/** Confirmação antes de ligar a campanha: quanto vai gastar, para onde vai a conversa e como o anúncio aparece. */
export const ActivationConfirmDialog: FC<Props> = ({ draftId, accountId, open, isActivating, onOpenChange, onConfirm }) => {
  const { client } = useClientContext();
  const [previewIndex, setPreviewIndex] = useState(0);
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "activationPreview", client.id, draftId],
    queryFn: () => metaAdsService.findActivationPreview({ params: { clientId: client.id, draftId } }),
    enabled: open,
    staleTime: 0,
  });
  const spendQuery = useSpendStatus(open ? accountId : undefined);
  const data = query.data;
  const money = (value: number) => formatMoney(value, data?.currency ?? "BRL");
  const preview = data?.previews[previewIndex] ?? data?.previews[0];
  const spend = spendQuery.data;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Ativar a campanha?</DialogTitle>
          <DialogDescription>Ao ativar, a campanha começa a gastar assim que a Meta aprovar os anúncios.</DialogDescription>
        </DialogHeader>

        {query.isLoading && <LoadingState />}
        {query.isError && (
          <ErrorState message="Não foi possível montar o resumo." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
        )}
        {data && (
          <div className="grid gap-4 sm:grid-cols-2">
            <dl className="grid content-start gap-2 text-sm">
              <div>
                <dt className="text-muted-foreground text-xs">Verba por dia</dt>
                <dd className="font-medium tabular-nums">{money(data.dailyBudget)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Duração</dt>
                <dd>{data.durationDays ? `${data.durationDays} dia(s)` : "Sem data para acabar (roda até você pausar)"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Total estimado no período</dt>
                <dd className="font-medium tabular-nums">
                  {data.estimatedTotal !== null ? money(data.estimatedTotal) : `${money(data.dailyBudget * 30)} a cada 30 dias`}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Estrutura</dt>
                <dd>
                  {data.adSetsCount} conjunto(s) · {data.adsCount} anúncio(s)
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs">Conversas chegam no WhatsApp</dt>
                <dd>{data.whatsappPhoneNumber ?? "Número não definido"}</dd>
              </div>
              {spend?.maxAccountMonthlySpend && (
                <div>
                  <dt className="text-muted-foreground text-xs">Teto do mês da conta</dt>
                  <dd className="tabular-nums">
                    {money(spend.monthSpend)} gastos de {money(spend.maxAccountMonthlySpend)}
                  </dd>
                </div>
              )}
              {data.blockedReason && (
                <div role="alert" className="text-destructive flex gap-1.5 rounded-md border border-current/30 p-2 text-xs">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Não dá para ativar agora: {data.blockedReason}.</span>
                </div>
              )}
            </dl>

            <div className="space-y-2">
              <p className="text-muted-foreground text-xs">Prévia do anúncio</p>
              {data.previews.length > 1 && (
                <div className="flex flex-wrap gap-1">
                  {data.previews.map((item, index) => (
                    <Button
                      key={item.format}
                      size="sm"
                      variant={item === preview ? "secondary" : "ghost"}
                      className="h-7 text-xs"
                      onClick={() => setPreviewIndex(index)}
                    >
                      {PREVIEW_LABEL[item.format] ?? item.format}
                    </Button>
                  ))}
                </div>
              )}
              {preview ? (
                <iframe
                  key={preview.url}
                  src={preview.url}
                  title={`Prévia: ${PREVIEW_LABEL[preview.format] ?? preview.format}`}
                  className="mx-auto h-[450px] w-full max-w-[340px] rounded-lg border"
                  sandbox="allow-scripts allow-same-origin"
                />
              ) : data.creatives[0] ? (
                <>
                  <BuiltPreview creative={data.creatives[0]} />
                  <p className="text-muted-foreground text-center text-xs">Prévia montada com a mídia e o texto do plano.</p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">Sem prévia disponível.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Voltar
          </Button>
          <Button disabled={!data || !!data.blockedReason || isActivating} onClick={onConfirm}>
            {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            Ativar e começar a gastar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
