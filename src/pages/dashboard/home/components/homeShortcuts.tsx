import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bot,
  BookUser,
  Columns3,
  FileText,
  Mail,
  Megaphone,
  MessageSquareText,
  Phone,
  Send,
  Settings,
  Sparkles,
  UserCog,
  Users,
  UsersRound,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { FiInstagram } from "react-icons/fi";
import { Link } from "react-router";

type Shortcut = {
  title: string;
  description: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>;
  url: string;
  // Sem permissão, o atalho fica visível para qualquer membro
  permission?: Permission;
  anyPermission?: Permission[];
  requiresCrm?: boolean;
  requiresAds?: boolean;
};

// Agrupados pelo que a pessoa quer fazer; o primeiro de cada grupo é o mais usado
const shortcutGroups: { label: string; shortcuts: Shortcut[] }[] = [
  {
    label: "Atender",
    shortcuts: [
      {
        title: "Atendimento WhatsApp",
        description: "Fila e conversas em andamento",
        icon: FaWhatsapp,
        url: "whatsapp",
        permission: "whatsapp.chat",
      },
      { title: "Contatos", description: "Fichas, telefones e histórico", icon: BookUser, url: "contacts", permission: "contacts.view" },
      { title: "Assistente", description: "Peça para o sistema fazer por você", icon: Sparkles, url: "assistant" },
      { title: "E-mails", description: "E-mails enviados e recebidos", icon: Mail, url: "email", permission: "email.view" },
    ],
  },
  {
    label: "Vender e divulgar",
    shortcuts: [
      { title: "CRM", description: "Funil de vendas e negócios", icon: Columns3, url: "crm", permission: "crm.view", requiresCrm: true },
      {
        title: "Nova campanha",
        description: "Disparo em massa por WhatsApp",
        icon: Send,
        url: "broadcasts/new",
        permission: "broadcasts.send",
      },
      {
        title: "Campanhas",
        description: "Disparos agendados e enviados",
        icon: Megaphone,
        url: "broadcasts",
        permission: "broadcasts.view",
      },
      {
        title: "Anúncios",
        description: "Resultados e ajustes com IA",
        icon: BarChart3,
        url: "ads",
        permission: "ads.view",
        requiresAds: true,
      },
      {
        title: "Postagens",
        description: "Facebook e Instagram com IA",
        icon: FiInstagram,
        url: "posts",
        permission: "posts.view",
        requiresAds: true,
      },
    ],
  },
  {
    label: "Acompanhar",
    shortcuts: [
      {
        title: "Equipe agora",
        description: "Quem está atendendo quem",
        icon: UsersRound,
        url: "management?tab=inProgress",
        permission: "management.view",
      },
      {
        title: "Desempenho do WhatsApp",
        description: "Mensagens, atendimentos e horários de pico",
        icon: BarChart3,
        url: "management?tab=performance",
        permission: "reports.view",
      },
      { title: "Usuários", description: "Convidar pessoas e ajustar acessos", icon: UserCog, url: "members", permission: "members.manage" },
    ],
  },
  {
    label: "Configurar",
    shortcuts: [
      {
        title: "Fluxos",
        description: "Caminho do atendimento automático",
        icon: Workflow,
        url: "configuration?tab=flow",
        permission: "flows.manage",
      },
      {
        title: "Modelos de mensagem",
        description: "Templates aprovados pela Meta",
        icon: MessageSquareText,
        url: "configuration?tab=template",
        permission: "templates.manage",
      },
      {
        title: "Agentes de IA",
        description: "Quem responde sozinho no fluxo",
        icon: Bot,
        url: "configuration?tab=aiAgent",
        permission: "aiAgents.manage",
      },
      {
        title: "Grupos de atendimento",
        description: "Quem atende cada número",
        icon: Users,
        url: "configuration?tab=serviceGroup",
        permission: "serviceGroups.manage",
      },
      {
        title: "Números",
        description: "WhatsApp conectados",
        icon: Phone,
        url: "configuration?tab=numbers",
        permission: "channels.manage",
      },
      {
        title: "Funis",
        description: "Etapas do CRM",
        icon: FileText,
        url: "configuration?tab=pipeline",
        permission: "crm.manage",
        requiresCrm: true,
      },
      { title: "Todas as configurações", description: "Senha, integrações e mais", icon: Settings, url: "configuration" },
    ],
  },
];

export const HomeShortcuts = () => {
  const baseUrl = useBaseUrl();
  const { can, access } = useClientContext();

  const isAllowed = (shortcut: Shortcut) =>
    (!shortcut.permission || can(shortcut.permission)) &&
    (!shortcut.anyPermission || shortcut.anyPermission.some((permission) => can(permission))) &&
    (!shortcut.requiresCrm || access.crmEnabled) &&
    (!shortcut.requiresAds || access.adsEnabled);

  const groups = shortcutGroups
    .map((group) => ({ ...group, shortcuts: group.shortcuts.filter(isAllowed) }))
    .filter((group) => group.shortcuts.length > 0);

  return (
    <section aria-labelledby="home-shortcuts" className="space-y-4">
      <h2 id="home-shortcuts" className="text-lg font-semibold">
        Atalhos
      </h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {groups.map((group) => (
          <div key={group.label} className="bg-card rounded-xl border p-2 shadow-xs">
            <p className="text-muted-foreground px-2 pt-1 pb-2 text-xs font-medium tracking-wide uppercase">{group.label}</p>
            <ul className="space-y-0.5">
              {group.shortcuts.map((shortcut) => {
                const isWhatsapp = shortcut.url === "whatsapp";
                return (
                  <li key={shortcut.url}>
                    <Link
                      to={`${baseUrl}/${shortcut.url}`}
                      className="hover:bg-muted focus-visible:ring-ring flex items-center gap-3 rounded-lg px-2 py-2 transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                          isWhatsapp ? "bg-green-600 text-white" : "bg-muted text-muted-foreground",
                        )}
                      >
                        <shortcut.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{shortcut.title}</span>
                        <span className="text-muted-foreground block truncate text-xs">{shortcut.description}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
