import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { Outlet } from "react-router";

export const DashboardLayout = () => {
  const { isConnected } = useSocketContext();
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {isMobile && (
          <div className="bg-secondary grid h-10 grid-cols-[1fr_min-content_1fr] items-center gap-2 px-2">
            <SidebarTrigger className="justify-self-start" />
            <p className="bg-foreground rounded-sm px-2 text-2xl font-bold text-white">
              Zap<span className="text-primary">Monitor</span>
            </p>
            <div></div>
          </div>
        )}
        {!isConnected && <div className="absolute w-full bg-yellow-300 p-2">Desconectado</div>}
        <div className="flex size-full flex-col overflow-hidden bg-gray-50 p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
