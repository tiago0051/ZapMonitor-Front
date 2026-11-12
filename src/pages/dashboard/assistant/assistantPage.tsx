import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { assistantService } from "@/services/api/assistantService";
import { useQuery } from "@tanstack/react-query";
import type { FC } from "react";
import { useSearchParams } from "react-router";
import { assistantKeys } from "./assistantUtils";
import { AuditTab } from "./auditTab";
import { AssistantChat } from "./components/assistantChat";
import { PlansToApprove } from "./plansToApprove";
import { ProjectsTab } from "./projectsTab";
import { RoutinesTab } from "./routinesTab";
import { SettingsTab } from "./settingsTab";

const TABS = ["conversa", "aprovar", "projetos", "rotinas", "historico", "regras"] as const;
type Tab = (typeof TABS)[number];

const scrollTab = "min-h-0 overflow-y-auto pt-2 pb-4";

export const AssistantPage: FC = () => {
  const { client } = useClientContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const planId = searchParams.get("plan");
  const conversationId = searchParams.get("conversa");
  const requestedTab = searchParams.get("tab") as Tab | null;
  // O link da notificação (?plan=) abre direto em "Para aprovar"
  const tab: Tab = requestedTab && TABS.includes(requestedTab) ? requestedTab : planId ? "aprovar" : "conversa";

  const awaitingQuery = useQuery({
    queryKey: assistantKeys.awaitingMe(client.id),
    queryFn: () => assistantService.findPlans(client.id, { awaitingMe: true }),
    refetchInterval: 60_000,
  });
  const awaitingCount = awaitingQuery.data?.length ?? 0;

  const changeTab = (value: string) => {
    const next = new URLSearchParams();
    if (value !== "conversa") next.set("tab", value);
    if (value === "conversa" && conversationId) next.set("conversa", conversationId);
    if (value === "aprovar" && planId) next.set("plan", planId);
    setSearchParams(next, { replace: true });
  };
  const openConversation = (id: string | null) => setSearchParams(id ? { conversa: id } : {}, { replace: !id });

  return (
    <div className="flex h-full flex-col gap-3 overflow-hidden p-3 sm:p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Assistente</h1>
        <p className="text-muted-foreground text-sm">
          Peça análises e mudanças em fluxos, agentes, CRM, campanhas e anúncios. Nada muda sem aprovação.
        </p>
      </div>

      <Tabs value={tab} onValueChange={changeTab} className="min-h-0 flex-1 gap-0">
        <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <TabsList className="w-max">
            <TabsTrigger value="conversa">Conversa</TabsTrigger>
            <TabsTrigger value="aprovar">
              Para aprovar
              {awaitingCount > 0 && (
                <span
                  aria-label={`${awaitingCount} planos esperando por você`}
                  className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] leading-none font-semibold text-white tabular-nums"
                >
                  {awaitingCount > 99 ? "99+" : awaitingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="projetos">Projetos</TabsTrigger>
            <TabsTrigger value="rotinas">Rotinas</TabsTrigger>
            <TabsTrigger value="historico">Histórico</TabsTrigger>
            <TabsTrigger value="regras">Regras</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="conversa" className="flex min-h-0 flex-col pt-3">
          <AssistantChat conversationId={conversationId} onConversationChange={openConversation} className="flex-1" />
        </TabsContent>
        <TabsContent value="aprovar" className={scrollTab}>
          <PlansToApprove highlightedPlanId={planId} />
        </TabsContent>
        <TabsContent value="projetos" className={scrollTab}>
          <ProjectsTab onOpenConversation={openConversation} />
        </TabsContent>
        <TabsContent value="rotinas" className={scrollTab}>
          <RoutinesTab onOpenConversation={openConversation} />
        </TabsContent>
        <TabsContent value="historico" className={scrollTab}>
          <AuditTab />
        </TabsContent>
        <TabsContent value="regras" className={scrollTab}>
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
