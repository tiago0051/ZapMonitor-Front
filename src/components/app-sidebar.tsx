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
import {
  FiActivity,
  FiBook,
  FiBriefcase,
  FiColumns,
  FiKey,
  FiLogOut,
  FiMail,
  FiRepeat,
  FiSend,
  FiSettings,
  FiSpeaker,
  FiInstagram,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { PanelLeftIcon } from "lucide-react";
import { Link, useLocation } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { clientService } from "@/services/api/clientService";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { useClientContext } from "@/context/ClientContext/clientContext";

// Itens sem permissão ficam visíveis para qualquer membro do cliente
// Itens do CRM também dependem de o plano incluir o módulo
const navMain: {
  title: string;
  icon: React.ComponentType;
  url: string;
  permission?: Permission;
  requiresCrm?: boolean;
  requiresAds?: boolean;
}[] = [
  {
    title: "Assistente",
    icon: FiZap,
    url: "assistant",
  },
  {
    title: "E-mails",
    icon: FiMail,
    url: "email",
    permission: "email.view",
  },
  {
    title: "WhatsApp",
    icon: FaWhatsapp,
    url: "whatsapp",
    permission: "whatsapp.chat",
  },
  {
    title: "Contatos",
    icon: FiBook,
    url: "contacts",
    permission: "contacts.view",
  },
  {
    title: "Campanhas",
    icon: FiSend,
    url: "broadcasts",
    permission: "broadcasts.view",
  },
  {
    title: "CRM",
    icon: FiColumns,
    url: "crm",
    permission: "crm.view",
    requiresCrm: true,
  },
  {
    title: "Anúncios",
    icon: FiSpeaker,
    url: "ads",
    permission: "ads.view",
    requiresAds: true,
  },
  {
    title: "Postagens",
    icon: FiInstagram,
    url: "posts",
    permission: "posts.view",
    requiresAds: true,
  },
  {
    title: "Gestão",
    icon: FiActivity,
    url: "management",
    permission: "management.view",
  },
  {
    title: "Usuários",
    icon: FiUsers,
    url: "members",
    permission: "members.manage",
  },
  {
    title: "Configurações",
    icon: FiSettings,
    url: "configuration",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useUserContext();
  const { toggleSidebar, setOpenMobile, isMobile } = useSidebar();
  const baseUrl = useBaseUrl();
  const { can, canUseCrm, canUseAds, client } = useClientContext();
  const { pathname, search } = useLocation();

  // No celular o menu é um Sheet: fecha ao navegar
  React.useEffect(() => {
    setOpenMobile(false);
  }, [pathname, setOpenMobile]);

  // Mesma consulta da tela de clientes: trocar só faz sentido com mais de um cliente
  const findAllClientQuery = useQuery({
    queryKey: ["clients"],
    queryFn: () => clientService.findAll(),
  });
  const canSwitchClient = (findAllClientQuery.data?.length ?? 0) > 1;

  const isActive = (url: string) => pathname === url || pathname.startsWith(`${url}/`);

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
          <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
            <p className="text-muted-foreground px-2 pt-1 text-xs">Cliente</p>
            <p className="truncate px-2 text-sm font-semibold" title={client.name}>
              {client.name}
            </p>
          </SidebarMenuItem>
          {!isMobile && (
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={"Encolher"}>
                <button onClick={toggleSidebar}>
                  <PanelLeftIcon />
                  <span>Encolher</span>
                </button>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu className="gap-2">
            {navMain
              .filter(
                (item) =>
                  (!item.permission || can(item.permission)) && (!item.requiresCrm || canUseCrm) && (!item.requiresAds || canUseAds),
              )
              .map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title} isActive={isActive(`${baseUrl}/${item.url}`)}>
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
          {canSwitchClient && (
            <SidebarMenuButton asChild tooltip={"Trocar cliente"}>
              <Link to={`/auth/select_client`}>
                <FiRepeat />
                Trocar cliente
              </Link>
            </SidebarMenuButton>
          )}
          {user?.isImplanter && (
            <SidebarMenuButton asChild tooltip={"Painel do implantador"}>
              <Link to={`/dashboard/implanter`}>
                <FiBriefcase />
                Painel do implantador
              </Link>
            </SidebarMenuButton>
          )}
          {user?.isOwner && (
            <SidebarMenuButton asChild tooltip={"Tela do dono"}>
              <Link to={`/dashboard/owner`}>
                <FiTrendingUp />
                Tela do dono
              </Link>
            </SidebarMenuButton>
          )}
          <SidebarMenuButton
            asChild
            tooltip={"Alterar senha"}
            isActive={pathname === `${baseUrl}/configuration` && search.includes("tab=account")}
          >
            <Link to={`${baseUrl}/configuration?tab=account`}>
              <FiKey />
              Alterar senha
            </Link>
          </SidebarMenuButton>
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
