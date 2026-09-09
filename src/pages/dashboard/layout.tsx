import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Outlet } from "react-router";

export const DashboardLayout = () => {
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
        <div className="grid h-[calc(100vh-5px)] overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
