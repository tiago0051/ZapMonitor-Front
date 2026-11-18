import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Outlet, useLocation } from "react-router";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useTaskReminders } from "./crm/useTaskReminders";
import { PlanDueBanner } from "@/components/plan/planDueBanner";
import { AiPausedBanner } from "@/components/plan/aiPausedBanner";
import { Button } from "@/components/ui/button";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Sparkles } from "lucide-react";
import { useState } from "react";
import { AssistantEdgeButton, AssistantPanel } from "./assistant/assistantPanel";
import { SocketProvider } from "@/context/SocketContext/socketProvider";
import { CallProvider } from "./whatsapp/calls/callProvider";
import { WhatsappNotifications } from "./whatsapp/notifications/whatsappNotifications";

export const DashboardLayout = () => {
  const isMobile = useIsMobile();
  const { client, canUseCrm, can } = useClientContext();
  const canUseWhatsapp = can("whatsapp.chat");
  useTaskReminders(canUseCrm);
  const baseUrl = useBaseUrl();
  const { pathname } = useLocation();
  const [assistantOpen, setAssistantOpen] = useState(false);
  // Na própria tela do assistente o atalho não faz sentido
  const showAssistant = pathname !== `${baseUrl}/assistant` && !pathname.startsWith(`${baseUrl}/assistant/`);

  return (
    // Tempo real no painel todo (um socket só): ligações e avisos de conversa seguem em qualquer tela.
    // A chave recria a conexão ao trocar de cliente, para não continuar recebendo eventos do anterior.
    <SocketProvider key={client.id} enabled={canUseWhatsapp || canUseCrm}>
      <CallProvider>
        {canUseWhatsapp && <WhatsappNotifications />}
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset className="h-dvh min-w-0 overflow-hidden">
            {isMobile && (
              <div className="bg-secondary grid h-10 shrink-0 grid-cols-[1fr_min-content_1fr] items-center gap-2 px-2">
                <SidebarTrigger className="justify-self-start" />
                <p className="bg-foreground rounded-sm px-2 text-2xl font-bold text-white">
                  Zap<span className="text-primary">Monitor</span>
                </p>
                {showAssistant ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 justify-self-end"
                    aria-label="Abrir o assistente"
                    onClick={() => setAssistantOpen(true)}
                  >
                    <Sparkles className="text-primary h-4 w-4" />
                  </Button>
                ) : (
                  <div></div>
                )}
              </div>
            )}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <PlanDueBanner />
              <AiPausedBanner />
              <div className="min-h-0 flex-1">
                <Outlet />
              </div>
            </div>
          </SidebarInset>
          {showAssistant && (
            <>
              {!isMobile && <AssistantEdgeButton onClick={() => setAssistantOpen(true)} />}
              <AssistantPanel open={assistantOpen} onOpenChange={setAssistantOpen} />
            </>
          )}
        </SidebarProvider>
      </CallProvider>
    </SocketProvider>
  );
};
