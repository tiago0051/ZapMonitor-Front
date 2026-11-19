import { useClientContext } from "@/context/ClientContext/clientContext";
import { quickReplyService } from "@/services/api/quickReplyService";
import { useQuery } from "@tanstack/react-query";

export const QUICK_REPLY_VARIABLES = [
  { token: "{nome}", label: "Nome do contato" },
  { token: "{primeiro_nome}", label: "Primeiro nome do contato" },
  { token: "{atendente}", label: "Seu apelido (ou primeiro nome)" },
] as const;

export const quickRepliesQueryKey = (clientId: string) => ["whatsapp", "quickReplies", clientId];

/** Respostas da empresa e as pessoais de quem está logado. */
export const useQuickReplies = (enabled = true) => {
  const { client } = useClientContext();
  return useQuery({
    meta: { errorHandledInline: true },
    queryKey: quickRepliesQueryKey(client.id),
    queryFn: () => quickReplyService.findAll({ params: { clientId: client.id } }),
    staleTime: 60 * 1000,
    enabled,
  });
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? "";

/**
 * Troca as variáveis pelo nome do contato e do atendente; sem o nome, a variável some sem deixar espaço duplo.
 * attendantName já vem pronto para o cliente: o apelido ou o primeiro nome (attendantDisplayName).
 */
export function fillQuickReply(content: string, values: { contactName: string | null; attendantName: string | null }) {
  const contactName = values.contactName?.trim() ?? "";
  return content
    .replaceAll("{nome}", contactName)
    .replaceAll("{primeiro_nome}", firstName(contactName))
    .replaceAll("{atendente}", values.attendantName?.trim() ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ ([,.!?])/g, "$1");
}

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();

/** Atalho que começa com o termo primeiro, depois quem tem o termo no atalho, no título ou no texto. */
export function searchQuickReplies(replies: QuickReply[], term: string) {
  const query = normalize(term.trim());
  if (!query) return replies;

  return replies
    .map((reply) => {
      const shortcut = normalize(reply.shortcut);
      const score = shortcut.startsWith(query)
        ? 0
        : shortcut.includes(query)
          ? 1
          : normalize(reply.title).includes(query)
            ? 2
            : normalize(reply.content).includes(query)
              ? 3
              : -1;
      return { reply, score };
    })
    .filter((item) => item.score >= 0)
    .sort((first, second) => first.score - second.score || first.reply.shortcut.localeCompare(second.reply.shortcut))
    .map((item) => item.reply);
}
