import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/** Pede para a conta de anúncio ser copiada da Meta de novo agora. */
export const useSyncAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: metaAdsService.syncAccount,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      toast.success("Sincronização agendada");
    },
  });
};
