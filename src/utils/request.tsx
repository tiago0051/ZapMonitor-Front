import { isAxiosError } from "axios";
import { toast } from "sonner";

/** Mensagem da API para mostrar ao usuário (ou uma genérica). */
export function requestErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join("\n");
    return message || "Erro desconhecido";
  }
  return "Erro desconhecido";
}

export function requestErrorHandling(error: unknown) {
  toast.error(requestErrorMessage(error));
}
