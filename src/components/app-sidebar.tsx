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
  useSidebar,
} from "@/components/ui/sidebar";
import { useUserContext } from "@/context/UserContext/userContext";
import { FiLogOut, FiMail, FiSettings } from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { PanelLeftIcon } from "lucide-react";
import { Link } from "react-router";
import { useBaseUrl } from "@/hooks/use-baseUrl";

// This is sample data.
const data = {
  navMain: [
    {
      title: "E-mails",
      icon: FiMail,
      url: "email",
    },
    {
      title: "WhatsApp",
      icon: FaWhatsapp,
      url: "whatsapp",
    },
    {
      title: "Clientes",
      icon: FiSettings,
      url: "configuration",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout } = useUserContext();
  const { toggleSidebar } = useSidebar();
  const baseUrl = useBaseUrl();

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip={"Início"} asChild>
              <Link to={baseUrl}>
                <p className="text-foreground text-[10px] font-bold">ZM</p>
                <p className="bg-foreground rounded-sm px-2 text-2xl font-bold text-white">
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
                  <Link to={`${baseUrl}/${item.url}`} className="font-medium">
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
          <SidebarMenuButton onClick={() => logout()} asChild tooltip={"Sair"}>
            <Link to={`/auth/logout`}>
              <FiLogOut />
              Sair
            </Link>
          </SidebarMenuButton>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
