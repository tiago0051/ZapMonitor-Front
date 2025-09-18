import * as React from "react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserContext } from "@/context/UserContext/userContext";
import { FiHome, FiLogOut, FiMail, FiSettings } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { PanelLeftIcon } from "lucide-react";
import { Link } from "react-router";

// This is sample data.
const data = {
  navMain: [
    {
      title: "E-mails",
      icon: FiMail,
      url: "/dashboard/email",
    },
    {
      title: "WhatsApp",
      icon: FaWhatsapp,
      url: "/dashboard/whatsapp",
    },
    {
      title: "Clientes",
      icon: FiSettings,
      url: "/dashboard/client",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout } = useUserContext();
  const { toggleSidebar } = useSidebar();

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={"Início"}>
              <div className="bg-slate-600 font-bold w-4 h-4 shrink-0 rounded-sm text-white justify-center flex items-center text-[6px]">
                Z<span className="text-primary">M</span>
              </div>
              <Link to="/dashboard">
                <p className="text-2xl font-bold text-white bg-slate-600 px-2 rounded-sm">
                  Zap<span className="text-primary">Monitor</span>
                </p>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip={"Encolher"}>
              <button onClick={toggleSidebar}>
                <PanelLeftIcon />
                <span>Encolher</span>
              </button>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {data.navMain.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title}>
                  <Link to={item.url} className="font-medium">
                    <item.icon />
                    {item.title}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuButton onClick={() => logout()}>
            <FiLogOut />
            <span>Sair</span>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
