import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pause, Play } from "lucide-react";
import type { FC } from "react";
import { toast } from "sonner";

type Props = {
  accountId: string;
  level: Exclude<AdTargetLevel, "account">;
  metaId: string;
  // Status configurado na Meta (ACTIVE ou PAUSED), não o efetivo
  status: string;
  size?: "sm" | "icon";
};

const levelLabel: Record<Exclude<AdTargetLevel, "account">, string> = { campaign: "Campanha", adset: "Conjunto", ad: "Anúncio" };

/**
 * Pausar ou ativar sem passar pela IA. Fica no histórico de mudanças, com desfazer. Pausar vale a qualquer hora;
 * ativar respeita o horário das travas.
 */
export const AdStatusToggle: FC<Props> = ({ accountId, level, metaId, status, size = "icon" }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const isActive = status === "ACTIVE";
  const target = isActive ? "PAUSED" : "ACTIVE";

  const setStatus = useMutation({
    mutationFn: () => metaAdsService.setStatus({ params: { clientId: client.id, accountId }, body: { level, metaId, status: target } }),
    onError: requestErrorHandling,
    onSuccess: (change) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      if (change.status === "APPLIED") toast.success(`${levelLabel[level]} ${target === "PAUSED" ? "pausado" : "ativado"} na Meta`);
      else toast.error(change.error ?? "A Meta não aplicou a mudança", { description: "Veja na aba Mudanças." });
    },
  });

  if (!can("ads.approve") || (status !== "ACTIVE" && status !== "PAUSED")) return null;

  const label = isActive ? `Pausar ${levelLabel[level].toLowerCase()}` : `Ativar ${levelLabel[level].toLowerCase()}`;
  const Icon = setStatus.isPending ? Loader2 : isActive ? Pause : Play;

  return (
    <Button
      type="button"
      variant="outline"
      size={size === "icon" ? "icon" : "sm"}
      className={size === "icon" ? "h-7 w-7" : undefined}
      aria-label={label}
      title={label}
      disabled={setStatus.isPending}
      onClick={(event) => {
        // As linhas da tabela abrem e fecham no clique
        event.stopPropagation();
        setStatus.mutate();
      }}
    >
      <Icon className={setStatus.isPending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
      {size === "sm" && label}
    </Button>
  );
};
