import { isAxiosError } from "axios";
import { toast } from "sonner";

type ToolMeta = {
  label: string;
  destructive?: boolean;
};

const TOOL_META: Record<string, ToolMeta> = {
  google_calendar_list_appointments: { label: "Consultar agendamentos" },
  google_calendar_cancel_appointment: { label: "Cancelar agendamentos", destructive: true },
};

export const getToolMeta = (tool: { name: string; description: string }): ToolMeta => {
  return TOOL_META[tool.name] ?? { label: tool.description };
};

export type AiIntegrationError = {
  message: string;
  detail?: string;
  field?: string;
};

const getOriginalMessage = (error: unknown): string | undefined => {
  if (!isAxiosError(error)) return undefined;
  const message = error.response?.data?.message;
  if (Array.isArray(message)) return message.join("\n");
  return typeof message === "string" ? message : undefined;
};

export const translateAiIntegrationError = (error: unknown, context?: { clientEmail?: string }): AiIntegrationError => {
  const detail = getOriginalMessage(error);
  const status = isAxiosError(error) ? error.response?.status : undefined;

  if (status === 403) return { message: "Você não tem acesso a este cliente.", detail };
  if (status === 404) return { message: "Integração não encontrada.", detail };

  if (status === 400 && detail) {
    if (detail.startsWith("Invalid credentials")) {
      return { message: "O arquivo enviado não é uma chave de service account válida.", detail };
    }
    if (detail.startsWith("Invalid settings")) {
      const field = detail.match(/at (\w+)/)?.[1];
      return { message: "Confira as configurações informadas.", detail, field };
    }
    if (detail.startsWith("Credentials are required")) {
      return { message: "Envie o arquivo da service account.", detail };
    }
    if (detail.startsWith("Unknown tools")) {
      return { message: "Ferramenta desconhecida. Recarregue a página e tente novamente.", detail };
    }
    if (detail.startsWith("Failed to authenticate")) {
      return { message: "Não foi possível autenticar com o Google. Gere uma nova chave.", detail };
    }
    if (detail.startsWith("Failed to fetch the calendar")) {
      const email = context?.clientEmail ?? "o e-mail da service account";
      return { message: `Não encontramos a agenda. Confira o ID e se ela foi compartilhada com ${email}.`, detail };
    }
  }

  return { message: "Não foi possível concluir a operação.", detail };
};

export const showAiIntegrationError = (error: unknown) => {
  const { message, detail } = translateAiIntegrationError(error);
  toast.error(message, { description: detail });
};
