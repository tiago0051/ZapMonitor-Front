import { Button } from "@/components/ui/button";
import { useMetaEmbeddedSignup } from "@/hooks/use-metaEmbeddedSignup";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useParams } from "react-router";
import { toast } from "sonner";

// Cadastro incorporado da Meta: o caminho recomendado para conectar um número
export const WhatsappEmbeddedSignupButton = () => {
  const { clientId } = useParams();

  const queryClient = useQueryClient();

  const createEmbeddedSignupMutation = useMutation({
    mutationFn: whatsappService.createEmbeddedSignup,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsappConfigurations", clientId],
      });
      toast.success("Número conectado com sucesso");
    },
  });

  const embeddedSignup = useMetaEmbeddedSignup({
    onSuccess: (result) => {
      createEmbeddedSignupMutation.mutate({
        body: result,
        params: { clientId: clientId! },
      });
    },
    onCancel: () => toast.info("Conexão do número cancelada"),
    onError: (message) => toast.error(message),
  });

  const isLoading = embeddedSignup.isSigningUp || createEmbeddedSignupMutation.isPending;

  return (
    <Button
      onClick={embeddedSignup.launch}
      disabled={!embeddedSignup.isConfigured || !embeddedSignup.isSdkReady || isLoading}
      title={
        embeddedSignup.isConfigured
          ? undefined
          : "Cadastro incorporado não configurado: defina VITE_META_APP_ID e VITE_META_EMBEDDED_SIGNUP_CONFIG_ID"
      }
    >
      {isLoading ? <Loader2 className="animate-spin" /> : <FaWhatsapp />}
      {createEmbeddedSignupMutation.isPending ? "Conectando número..." : "Conectar com a Meta"}
    </Button>
  );
};
