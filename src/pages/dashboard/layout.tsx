import { AppSidebar } from "@/components/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Outlet } from "react-router";

export const DashboardLayout = () => {
  const isMobile = useIsMobile();

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {isMobile && (
          <div className="h-10 bg-secondary grid grid-cols-[1fr_min-content_1fr] items-center px-2 gap-2">
            <SidebarTrigger className="justify-self-start" />
            <p className="text-2xl font-bold text-white bg-foreground px-2 rounded-sm">
              Zap<span className="text-primary">Monitor</span>
            </p>
            <div></div>
          </div>
        )}
        <div className="flex flex-1 flex-col gap-4 px-4 py-2">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
