import { isAxiosError } from "axios";
import { toast } from "sonner";

export function requestErrorHandling(error: unknown) {
  if (isAxiosError(error)) {
    toast.error(error.response?.data?.message || "Erro desconhecido");
  } else {
    toast.error("Erro desconhecido");
  }
}
