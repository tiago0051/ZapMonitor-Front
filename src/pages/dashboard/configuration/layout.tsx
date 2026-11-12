import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { ChangePasswordForm } from "@/components/change-password-form";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { clientService } from "@/services/api/clientService";
import { useQuery } from "@tanstack/react-query";
import {
  Palette,
  Bot,
  CircleSlash,
  Code2,
  Columns3,
  KeyRound,
  Mail,
  Megaphone,
  MessageSquareText,
  Phone,
  ShieldCheck,
  CalendarDays,
  Tags,
  TextCursorInput,
  Users,
  Workflow,
  MonitorPlay,
  Clapperboard,
  type LucideIcon,
} from "lucide-react";
import { Suspense, useEffect, useRef, type ReactNode } from "react";
import { FirstStepsChecklist } from "./components/firstStepsChecklist";
import { useParams, useSearchParams } from "react-router";
import { AiAgents } from "./aiAgent/aiAgents";
import { GoogleCalendarSettings } from "./googleCalendar/googleCalendarSettings";
import { ClientConfiguration } from "./client";
import { Flows } from "./flow/flows";
import { PermissionGroups } from "./permissionGroup/permissionGroups";
import { Pipelines } from "./pipeline/pipelines";
import { LostReasons } from "./lostReason/lostReasons";
import { CrmFields } from "./crmField/crmFields";
import { EmailSettings } from "./emailSending/emailSenders";
import { MetaAdsSettings } from "./metaAds/metaAdsSettings";
import { BrandIdentitySettings } from "./brandIdentity/brandIdentitySettings";
import { AdPlatformSettings } from "./adsPlatforms/adPlatformSettings";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { ServiceGroups } from "./serviceGroup/serviceGroup";
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
  // Só aparece quando o plano inclui o módulo CRM
  requiresCrm?: boolean;
  // Só aparece quando o plano inclui o módulo de anúncios
  requiresAds?: boolean;
  // Abre por link (?tab=), mas fica fora do menu; a troca de senha mora no menu do usuário, na sidebar
  hiddenFromNav?: boolean;
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
    label: "CRM",
    sections: [
      { id: "pipeline", label: "Funis", icon: Columns3, content: <Pipelines />, permission: "crm.manage", requiresCrm: true },
      {
        id: "crmField",
        label: "Campos personalizados",
        icon: TextCursorInput,
        content: <CrmFields />,
        permission: "crm.manage",
        requiresCrm: true,
      },
      {
        id: "lostReason",
        label: "Motivos de perda",
        icon: CircleSlash,
        content: <LostReasons />,
        permission: "crm.manage",
        requiresCrm: true,
      },
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
    label: "Marca",
    sections: [
      {
        id: "brandIdentity",
        label: "Identidade da marca",
        icon: Palette,
        content: <BrandIdentitySettings />,
        permission: "brand.manage",
      },
    ],
  },
  {
    label: "Canais e integrações",
    sections: [
      {
        id: "metaAds",
        label: "Anúncios da Meta",
        icon: Megaphone,
        content: <MetaAdsSettings />,
        permission: "ads.manage",
        requiresAds: true,
      },
      {
        id: "youtubeAds",
        label: "Anúncios do YouTube",
        icon: MonitorPlay,
        content: <AdPlatformSettings platform="GOOGLE" />,
        permission: "ads.manage",
        requiresAds: true,
      },
      {
        id: "tiktokAds",
        label: "Anúncios do TikTok",
        icon: Clapperboard,
        content: <AdPlatformSettings platform="TIKTOK" />,
        permission: "ads.manage",
        requiresAds: true,
      },
      {
        id: "email",
        label: "Envio de e-mail",
        icon: Mail,
        content: <EmailSettings />,
        permission: "emailSettings.manage",
      },
      {
        id: "numbers",
        label: "Números de WhatsApp",
        icon: Phone,
        content: <WhatsappConfiguration />,
        permission: "channels.manage",
      },
      {
        id: "googleCalendar",
        label: "Google Agenda",
        icon: CalendarDays,
        content: <GoogleCalendarSettings />,
        permission: "googleCalendar.manage",
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
    sections: [{ id: "account", label: "Senha", icon: KeyRound, content: <ChangePasswordForm />, hiddenFromNav: true }],
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
  const { can, access } = useClientContext();

  const allowedGroups = configurationGroups
    .map((group) => ({
      ...group,
      sections: group.sections.filter(
        (section) =>
          (!section.permission || can(section.permission)) &&
          (!section.requiresCrm || access.crmEnabled) &&
          (!section.requiresAds || access.adsEnabled),
      ),
    }))
    .filter((group) => group.sections.length > 0);
  const sections = allowedGroups.flatMap((group) => group.sections);
  // Sem nenhuma outra seção liberada, a de senha continua no menu para a tela não ficar vazia
  const hasNavSections = sections.some((section) => !section.hiddenFromNav);
  const navGroups = hasNavSections
    ? allowedGroups
        .map((group) => ({ ...group, sections: group.sections.filter((section) => !section.hiddenFromNav) }))
        .filter((group) => group.sections.length > 0)
    : allowedGroups;
  const navSections = navGroups.flatMap((group) => group.sections);

  const findClientByIdQuery = useQuery({
    queryKey: ["client", clientId],
    queryFn: () => clientService.findById({ params: { clientId: clientId! } }),
  });

  // Sem aba pedida (ou sem acesso a ela), abre a primeira que o usuário pode ver
  const requestedSectionId = searchParams.get("tab") ?? "";
  const activeSection =
    sections.find((section) => section.id === (legacySectionIds[requestedSectionId] ?? requestedSectionId)) ?? navSections[0];

  const selectSection = (sectionId: string) => setSearchParams({ tab: sectionId }, { replace: true });

  // No celular a faixa de seções rola sozinha até a aba ativa
  const chipsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const activeChip = chipsRef.current?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!activeChip || activeChip.offsetParent === null) return;
    activeChip.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [activeSection.id]);

  return (
    <div className="flex h-full flex-col overflow-auto p-4 md:p-6">
      <div className="mb-4">
        <p className="text-muted-foreground text-sm">{findClientByIdQuery.data?.name}</p>
        <h1 className="text-2xl font-semibold">Configurações</h1>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <nav className="shrink-0 md:w-56">
          {/* Mobile: lista horizontal rolável */}
          <div ref={chipsRef} className="scrollbar-hide -mx-4 flex gap-2 overflow-x-auto px-4 md:hidden">
            {navSections.map((section) => (
              <button
                key={section.id}
                onClick={() => selectSection(section.id)}
                aria-current={section.id === activeSection.id ? "page" : undefined}
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
            {navGroups.map((group) => (
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
          {/* Só na entrada das configurações, sem aba escolhida */}
          {!requestedSectionId && clientId && <FirstStepsChecklist clientId={clientId} onSelectTab={selectSection} />}
          {/* A key recria o boundary ao trocar de seção, limpando o erro da anterior */}
          <QueryErrorBoundary key={activeSection.id} message={`Não foi possível carregar a seção ${activeSection.label}.`}>
            <Suspense fallback={<SectionSkeleton />}>{activeSection.content}</Suspense>
          </QueryErrorBoundary>
        </main>
      </div>
    </div>
  );
};
