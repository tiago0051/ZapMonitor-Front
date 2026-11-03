import type { FC } from "react";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Reports } from "./reports/reports";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { FaWhatsapp } from "react-icons/fa";
import { FiActivity, FiMail, FiSettings, FiUsers } from "react-icons/fi";

// Atalhos sem permissão ficam visíveis para qualquer membro do cliente
const shortcuts: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  url: string;
  permission?: Permission;
}[] = [
  {
    title: "Atendimento WhatsApp",
    description: "Responder a fila e as conversas em andamento",
    icon: FaWhatsapp,
    url: "whatsapp",
    permission: "whatsapp.chat",
  },
  { title: "E-mails", description: "Consultar os e-mails enviados", icon: FiMail, url: "email", permission: "email.view" },
  {
    title: "Gestão",
    description: "Acompanhar atendimentos em andamento e encerrados",
    icon: FiActivity,
    url: "management",
    permission: "management.view",
  },
  { title: "Usuários", description: "Convidar pessoas e ajustar acessos", icon: FiUsers, url: "members", permission: "members.manage" },
  { title: "Configurações", description: "Fluxos, templates, números e sua senha", icon: FiSettings, url: "configuration" },
];

export const HomePage: FC = () => {
  const baseUrl = useBaseUrl();
  const { can } = useClientContext();

  const allowedShortcuts = shortcuts.filter((shortcut) => !shortcut.permission || can(shortcut.permission));

  return (
    <div className="mx-auto size-full max-w-7xl overflow-auto px-4 py-4">
      <div className="mx-auto space-y-8">
        <div>
          <h2 className="mb-4 text-2xl">Atalhos</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {allowedShortcuts.map((shortcut, index) => {
              // O primeiro atalho é a tarefa principal do usuário e ganha destaque
              const isPrimary = index === 0 && shortcut.url === "whatsapp";

              return (
                <Link
                  key={shortcut.url}
                  to={`${baseUrl}/${shortcut.url}`}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-5 py-4 transition-colors",
                    isPrimary ? "border-transparent bg-green-600 text-white shadow-lg hover:bg-green-700" : "bg-card hover:bg-muted",
                  )}
                >
                  <shortcut.icon className={cn("h-6 w-6 shrink-0", !isPrimary && "text-muted-foreground")} />
                  <span className="min-w-0">
                    <span className="block text-base font-medium">{shortcut.title}</span>
                    <span className={cn("block text-sm", isPrimary ? "text-white/80" : "text-muted-foreground")}>
                      {shortcut.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {can("reports.view") && (
          <>
            <Separator />
            <Reports />
          </>
        )}
      </div>
    </div>
  );
};
