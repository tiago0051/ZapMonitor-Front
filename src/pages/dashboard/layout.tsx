import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Outlet } from "react-router";

export const DashboardLayout = () => {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="flex flex-1 flex-col gap-4 px-4 py-2">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};
