import { isAxiosError } from "axios";
import { toast } from "sonner";

export function requestErrorHandling(error: unknown) {
  if (isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) {
      toast.error(message.join("\n"));
      return;
    }

    toast.error(message || "Erro desconhecido");
  } else {
    toast.error("Erro desconhecido");
  }
}
