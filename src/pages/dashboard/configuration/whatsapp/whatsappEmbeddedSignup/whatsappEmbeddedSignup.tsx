import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useMetaEmbeddedSignup } from "@/hooks/use-metaEmbeddedSignup";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useParams } from "react-router";
import { toast } from "sonner";

export const WhatsappEmbeddedSignup = () => {
  const { clientId } = useParams();

  const queryClient = useQueryClient();

  const createEmbeddedSignupMutation = useMutation({
    mutationFn: whatsappService.createEmbeddedSignup,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["whatsappConfigurations", clientId],
      });
      toast.success("Número registrado com sucesso");
    },
  });

  const embeddedSignup = useMetaEmbeddedSignup({
    onSuccess: (result) => {
      createEmbeddedSignupMutation.mutate({
        body: result,
        params: { clientId: clientId! },
      });
    },
    onCancel: () => toast.info("Registro do número cancelado"),
    onError: (message) => toast.error(message),
  });

  const isLoading =
    embeddedSignup.isSigningUp || createEmbeddedSignupMutation.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar número pela Meta</CardTitle>
        <CardDescription>
          Conecte um número do WhatsApp Business através do cadastro
          incorporado da Meta. As credenciais serão configuradas
          automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!embeddedSignup.isConfigured && (
          <p className="text-destructive text-sm">
            O cadastro incorporado não está configurado. Defina as variáveis
            VITE_META_APP_ID e VITE_META_EMBEDDED_SIGNUP_CONFIG_ID.
          </p>
        )}
        <Button
          onClick={embeddedSignup.launch}
          disabled={
            !embeddedSignup.isConfigured ||
            !embeddedSignup.isSdkReady ||
            isLoading
          }
        >
          {isLoading ? <Loader2 className="animate-spin" /> : <FaWhatsapp />}
          {createEmbeddedSignupMutation.isPending
            ? "Registrando número..."
            : "Conectar com a Meta"}
        </Button>
      </CardContent>
    </Card>
  );
};
