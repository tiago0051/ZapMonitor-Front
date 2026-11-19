import { isAxiosError } from "axios";

export const contactDetailKey = (clientId: string, id: string) => ["contacts", "detail", clientId, id];

export const contactDisplayName = (contact: { name: string | null; phone?: string | null; email?: string | null }) =>
  contact.name?.trim() || contact.phone || contact.email || "Sem nome";

export type DuplicateContact = { id: string; name: string | null; message: string };

/** O 409 de telefone ou e-mail repetido traz a ficha que já tem o dado; nulo para os outros erros. */
export const duplicateContactFromError = (error: unknown): DuplicateContact | null => {
  if (!isAxiosError(error) || error.response?.status !== 409) return null;

  const data = error.response.data as { existingContactId?: string; existingContactName?: string | null; message?: string } | undefined;
  if (!data?.existingContactId) return null;

  return { id: data.existingContactId, name: data.existingContactName ?? null, message: data.message ?? "Este contato já existe" };
};

const formatCount = (value: number) => value.toLocaleString("pt-BR");

/** Resumo de quem entrou na sequência e por que os outros não. */
export const describeBulkEnroll = (result: BulkEnrollResult) => {
  const out = [
    result.noEmail && `${formatCount(result.noEmail)} sem e-mail`,
    result.suppressed && `${formatCount(result.suppressed)} descadastrados`,
    result.already && `${formatCount(result.already)} já estavam na sequência`,
  ].filter(Boolean);
  return {
    title: `${formatCount(result.enrolled)} ${result.enrolled === 1 ? "pessoa inscrita" : "pessoas inscritas"}`,
    description: out.length ? `Ficaram de fora: ${out.join(", ")}.` : undefined,
  };
};
