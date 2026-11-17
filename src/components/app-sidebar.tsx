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
  FiCalendar,
  FiColumns,
  FiKey,
  FiLogOut,
  FiMail,
  FiRepeat,
  FiSend,
  FiSettings,
  FiSpeaker,
  FiTarget,
  FiInstagram,
  FiImage,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { FaWhatsapp } from "react-icons/fa";
import { ChevronsUpDown, PanelLeftIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  // Basta uma destas permissões
  anyPermission?: Permission[];
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
    title: "Planejamento",
    icon: FiCalendar,
    url: "planner",
    permission: "planner.view",
  },
  {
    title: "Estratégias",
    icon: FiTarget,
    url: "strategies",
    permission: "strategies.view",
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
    title: "Estúdio",
    icon: FiImage,
    url: "studio",
    anyPermission: ["ads.manage", "posts.manage"],
    requiresAds: true,
  },
  {
    title: "Gestão",
    icon: FiActivity,
    url: "management",
    anyPermission: ["management.view", "reports.view"],
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

// Até duas iniciais do nome, para o avatar do menu da conta
const initialsOf = (name: string | undefined) =>
  (name ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("") || "?";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { logout, user } = useUserContext();
  const { toggleSidebar, setOpenMobile, isMobile } = useSidebar();
  const baseUrl = useBaseUrl();
  const { can, canUseCrm, canUseAds, client } = useClientContext();
  const { pathname } = useLocation();

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
          <SidebarMenu className="gap-1">
            {navMain
              .filter(
                (item) =>
                  (!item.permission || can(item.permission)) &&
                  (!item.anyPermission || item.anyPermission.some((permission) => can(permission))) &&
                  (!item.requiresCrm || canUseCrm) &&
                  (!item.requiresAds || canUseAds),
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
      {/* Conta, troca de cliente e painéis num menu só: o rodapé ocupa uma linha e sobra espaço para o menu principal */}
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  tooltip={user?.name ?? "Conta"}
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <span className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold">
                    {initialsOf(user?.name)}
                  </span>
                  <span className="grid min-w-0 flex-1 text-left leading-tight">
                    <span className="truncate text-sm font-medium">{user?.name ?? "Conta"}</span>
                    <span className="text-muted-foreground truncate text-xs">{user?.email}</span>
                  </span>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side={isMobile ? "top" : "right"} align="end" sideOffset={8} className="min-w-56">
                <DropdownMenuLabel className="font-normal">
                  <p className="truncate text-sm font-medium">{user?.name}</p>
                  <p className="text-muted-foreground truncate text-xs">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {canSwitchClient && (
                  <DropdownMenuItem asChild>
                    <Link to={`/auth/select_client`}>
                      <FiRepeat />
                      Trocar cliente
                    </Link>
                  </DropdownMenuItem>
                )}
                {user?.isImplanter && (
                  <DropdownMenuItem asChild>
                    <Link to={`/dashboard/implanter`}>
                      <FiBriefcase />
                      Painel do implantador
                    </Link>
                  </DropdownMenuItem>
                )}
                {user?.isOwner && (
                  <DropdownMenuItem asChild>
                    <Link to={`/dashboard/owner`}>
                      <FiTrendingUp />
                      Tela do dono
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link to={`${baseUrl}/configuration?tab=account`}>
                    <FiKey />
                    Alterar senha
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild onClick={() => logout()}>
                  <Link to={`/auth/logout`}>
                    <FiLogOut />
                    Sair
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
