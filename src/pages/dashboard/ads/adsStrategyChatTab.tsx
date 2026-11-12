import { AssistantChat } from "@/pages/dashboard/assistant/components/assistantChat";
import { useState, type FC } from "react";
import { useLocation } from "react-router";

const STARTERS = [
  "Quais campanhas trazem conversa mas não vendem?",
  "Como redistribuir a verba entre as campanhas para vender mais?",
  "Quais criativos estão cansados e o que testar no lugar?",
];

/** Aba Estratégia: o assistente com foco na conta de anúncio escolhida; mudanças viram plano para aprovar. */
export const AdsStrategyChatTab: FC<{ account: AdAccount }> = ({ account }) => {
  const { pathname } = useLocation();
  const [conversationId, setConversationId] = useState<string | null>(null);

  return (
    <AssistantChat
      conversationId={conversationId}
      onConversationChange={setConversationId}
      adAccountId={account.id}
      page={pathname}
      starters={STARTERS}
      emptyTitle="Converse sobre a estratégia desta conta"
      emptyDescription="O assistente lê as campanhas, as métricas e as vendas do CRM. O que ele propuser mudar vira um plano para aprovar."
      className="h-[calc(100dvh-14rem)] min-h-[480px]"
    />
  );
};
