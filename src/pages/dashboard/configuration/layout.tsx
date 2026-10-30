import { ChangePasswordForm } from "@/components/change-password-form";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import {
  Bot,
  Code2,
  KeyRound,
  MessageSquareText,
  Phone,
  ShieldCheck,
  Sparkles,
  Tags,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { Suspense, type ReactNode } from "react";
import { useParams, useSearchParams } from "react-router";
import { AiAgents } from "./aiAgent/aiAgents";
import { ClientConfiguration } from "./client";
import { Flows } from "./flow/flows";
import { PermissionGroups } from "./permissionGroup/permissionGroups";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { ServiceGroups } from "./serviceGroup/serviceGroup";
import { WhatsappAiConfiguration } from "./whatsapp/whatsappAi/whatsappAiConfiguration";
import { WhatsappCategory } from "./whatsapp/whatsappCategory/whatsappCategory";
import { WhatsappConfiguration } from "./whatsapp/whatsappConfiguration/whatsappConfiguration";
import { WhatsappTemplate } from "./whatsapp/whatsappTemplate/whatsappTemplate";

type ConfigurationSection = {
  id: string;
  label: string;
  icon: LucideIcon;
  content: ReactNode;
  // Sem permissão, a seção fica disponível para qualquer membro
  permission?: Permission;
};

// Grupos ordenados pela frequência de uso: atendimento muda toda semana; canais e integrações, só na implantação
const configurationGroups: { label: string; sections: ConfigurationSection[] }[] = [
  {
    label: "Atendimento",
    sections: [
      { id: "flow", label: "Fluxos", icon: Workflow, content: <Flows />, permission: "flows.manage" },
      {
        id: "serviceGroup",
        label: "Grupos de atendimento",
        icon: Users,
        content: <ServiceGroups />,
        permission: "serviceGroups.manage",
      },
      { id: "aiAgent", label: "Agentes de IA", icon: Bot, content: <AiAgents />, permission: "aiAgents.manage" },
    ],
  },
  {
    label: "Mensagens",
    sections: [
      {
        id: "template",
        label: "Templates",
        icon: MessageSquareText,
        content: <WhatsappTemplate />,
        permission: "templates.manage",
      },
      { id: "category", label: "Categorias", icon: Tags, content: <WhatsappCategory />, permission: "categories.manage" },
    ],
  },
  {
    label: "Canais e integrações",
    sections: [
      {
        id: "numbers",
        label: "Números de WhatsApp",
        icon: Phone,
        content: <WhatsappConfiguration />,
        permission: "channels.manage",
      },
      {
        id: "ai",
        label: "Inteligência artificial",
        icon: Sparkles,
        content: <WhatsappAiConfiguration />,
        permission: "aiConfig.manage",
      },
      { id: "api", label: "API", icon: Code2, content: <ClientConfiguration />, permission: "api.manage" },
    ],
  },
  {
    label: "Equipe",
    sections: [
      {
        id: "permissionGroup",
        label: "Grupos de permissão",
        icon: ShieldCheck,
        content: <PermissionGroups />,
        permission: "permissionGroups.manage",
      },
    ],
  },
  {
    label: "Conta",
    sections: [{ id: "account", label: "Senha", icon: KeyRound, content: <ChangePasswordForm /> }],
  },
];

// Links antigos usavam outras abas
const legacySectionIds: Record<string, string> = { whatsapp: "template", whatsappConfiguration: "numbers" };

const SectionSkeleton = () => (
  <div className="space-y-4 rounded-xl border p-6">
    <Skeleton className="h-6 w-48" />
    <Skeleton className="h-4 w-full max-w-md" />
    <Skeleton className="h-32 w-full" />
  </div>
);

export const EditClientLayout = () => {
  const { clientId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { can } = useClientContext();

  const allowedGroups = configurationGroups
    .map((group) => ({ ...group, sections: group.sections.filter((section) => !section.permission || can(section.permission)) }))
    .filter((group) => group.sections.length > 0);
  const sections = allowedGroups.flatMap((group) => group.sections);

  const findClientByIdQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
  });

  // Sem aba pedida (ou sem acesso a ela), abre a primeira que o usuário pode ver
  const requestedSectionId = searchParams.get("tab") ?? "";
  const activeSection =
    sections.find((section) => section.id === (legacySectionIds[requestedSectionId] ?? requestedSectionId)) ?? sections[0];

  const selectSection = (sectionId: string) => setSearchParams({ tab: sectionId }, { replace: true });

  return (
    <div className="flex h-full flex-col overflow-auto p-4 md:p-6">
      <div className="mb-4">
        <p className="text-muted-foreground text-sm">{findClientByIdQuery.data?.name}</p>
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="shrink-0 md:w-56">
          {/* Mobile: lista horizontal rolável */}
          <div className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => selectSection(section.id)}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                  section.id === activeSection.id ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted",
                )}
              >
                <section.icon className="h-3.5 w-3.5" />
                {section.label}
              </button>
            ))}
          </div>

          {/* Desktop: menu lateral agrupado */}
          <div className="hidden space-y-5 md:block">
            {allowedGroups.map((group) => (
              <div key={group.label}>
                <p className="text-muted-foreground mb-1.5 px-3 text-xs font-semibold tracking-wide uppercase">{group.label}</p>
                <div className="space-y-0.5">
                  {group.sections.map((section) => (
                    <button
                      key={section.id}
                      onClick={() => selectSection(section.id)}
                      aria-current={section.id === activeSection.id ? "page" : undefined}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                        section.id === activeSection.id
                          ? "bg-muted text-foreground font-medium"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                      )}
                    >
                      <section.icon className="h-4 w-4 shrink-0" />
                      {section.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        <main className="min-w-0 flex-1 space-y-5">
          <Suspense fallback={<SectionSkeleton />}>{activeSection.content}</Suspense>
        </main>
      </div>
    </div>
  );
};
