import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SocketContext } from "@/context/SocketContext/socketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContext } from "react";
import { Outlet } from "react-router";

export const DashboardLayout = () => {
  const { isConnected } = useContext(SocketContext);
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
        <div className="flex max-w-screen flex-1 flex-col gap-2 overflow-hidden px-4 py-2">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
