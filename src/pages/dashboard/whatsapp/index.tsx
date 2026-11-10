import { EmptyState, ErrorState } from "@/components/state-message";
import { useEffect, useRef, useState } from "react";
import { MessageSquare, Search, X, ArrowLeft, Users, WifiOff } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ContactCard } from "./components/contactCard";
import { ContactCardSkeleton } from "./components/contactCard/skeleton";
import { InfoPanel, type InfoPanelTab } from "./components/infoPanel";
import { ChatView } from "./components/chatView";
import { DialogNewContactTemplate } from "./components/dialogNewContactTemplate";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContactsListService } from "./useContactsListService";
import { useServiceGroupSelection } from "./useServiceGroupSelection";
import { NotificationSettings } from "./notifications/notificationSettings";
import { useNewContactNotifications } from "./notifications/useNewContactNotifications";
import { useSearchParams } from "react-router";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUnsavedChangesGuard } from "@/hooks/use-unsaved-changes";

// ── Shared sub-panels ────────────────────────────────────────────────────────

// Fica no fim da lista; quando entra na área visível, pede a próxima página
function LoadMoreSentinel({ onVisible }: { onVisible: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const onVisibleRef = useRef(onVisible);

  useEffect(() => {
    onVisibleRef.current = onVisible;
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => entry.isIntersecting && onVisibleRef.current(), { rootMargin: "200px" });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} aria-hidden className="h-px" />;
}

function ContactListPanel({
  tab,
  setTab,
  selected,
  onSelectContact,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  selected: WhatsappContactMessage | null;
  onSelectContact: (contact: WhatsappContactMessage) => void;
}) {
  const [search, setSearch] = useState("");

  const serviceGroupSelection = useServiceGroupSelection();
  const { serviceGroups, selectedServiceGroupId } = serviceGroupSelection;

  const { contacts, stats } = useContactsListService({
    search,
    tab,
    serviceGroupId: selectedServiceGroupId,
    enabled: !serviceGroupSelection.isLoading,
  });

  function renderContactsList() {
    if (contacts.isLoading) return Array.from({ length: 6 }).map((_, index) => <ContactCardSkeleton key={index} />);
    if (contacts.isError)
      return (
        <ErrorState message="Não foi possível buscar os contatos." onRetry={() => contacts.refetch()} isRetrying={contacts.isRefetching} />
      );
    if (contacts.isEmpty) {
      const emptyMessages: Record<Tab, { title: string; description: string }> = {
        queue: { title: "Fila vazia", description: "Nenhum contato aguardando atendimento agora." },
        mine: { title: "Nenhum atendimento seu", description: "Assuma um contato da fila para começar." },
        all: { title: "Nenhum contato", description: "Os contatos aparecem aqui depois da primeira mensagem." },
      };
      const empty = search ? { title: "Nenhum contato encontrado", description: `Nada encontrado para "${search}".` } : emptyMessages[tab];

      return <EmptyState className="m-3 border-0" icon={MessageSquare} title={empty.title} description={empty.description} />;
    }

    return (
      <>
        {contacts.items.map((c) => (
          <ContactCard key={c.id} contact={c} active={selected?.id === c.id} highlight={search} onClick={() => onSelectContact(c)} />
        ))}
        {contacts.isFetchingNextPage && Array.from({ length: 3 }).map((_, index) => <ContactCardSkeleton key={`next-${index}`} />)}
        {contacts.hasNextPage && !contacts.isFetchingNextPage && <LoadMoreSentinel onVisible={() => contacts.fetchNextPage()} />}
      </>
    );
  }

  return (
    <div className="bg-card flex h-full flex-col">
      {serviceGroups.length > 0 && (
        <div className="border-border flex flex-shrink-0 items-center gap-2 border-b px-3 py-2">
          <Users className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
          <select
            aria-label="Grupo de atendimento"
            value={selectedServiceGroupId}
            onChange={(e) => serviceGroupSelection.setSelectedServiceGroupId(e.target.value)}
            disabled={serviceGroups.length === 1}
            className="text-foreground min-w-0 flex-1 truncate bg-transparent text-base font-medium outline-none disabled:cursor-not-allowed disabled:opacity-100 md:text-sm"
          >
            {serviceGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Tabs */}
      <div className="border-border flex flex-shrink-0 border-b">
        {(["queue", "mine", "all"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { queue: "Fila", mine: "Meus", all: "Todos" };
          const badges: Record<Tab, React.ReactNode> = {
            queue: (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {stats.queueLength}
              </span>
            ),
            mine: (
              <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                {stats.mineLength}
              </span>
            ),
            all: null,
          };
          return (
            <button
              key={t}
              type="button"
              aria-pressed={tab === t}
              onClick={() => setTab(t)}
              className={`relative flex flex-1 items-center justify-center py-3 text-sm font-medium transition-colors ${
                tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {labels[t]}
              {!stats.isLoading && badges[t]}
              {tab === t && (
                <motion.span
                  layoutId="contact-tab-indicator"
                  className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500"
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="border-border flex flex-shrink-0 items-center gap-2 border-b px-3 py-2.5">
        <div className="bg-muted flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5">
          <Search className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Buscar conversas"
            placeholder="Buscar por nome ou telefone"
            className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} aria-label="Limpar busca" className="-m-1.5 p-1.5">
              <X className="text-muted-foreground h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <NotificationSettings />
        <DialogNewContactTemplate
          onSent={(contact) => {
            setTab("all");
            onSelectContact(contact);
          }}
        />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="scrollbar-hide flex-1 overflow-y-auto"
        >
          {renderContactsList()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ── Connection status ────────────────────────────────────────────────────────

// Espera um pouco antes de avisar: a conexão inicial e quedas rápidas não devem piscar a faixa
const DISCONNECTED_NOTICE_DELAY = 3000;

function ConnectionNotice({ isConnected }: { isConnected: boolean }) {
  const [isDisconnectedLongEnough, setIsDisconnectedLongEnough] = useState(false);

  useEffect(() => {
    if (isConnected) return;

    const timeout = setTimeout(() => setIsDisconnectedLongEnough(true), DISCONNECTED_NOTICE_DELAY);
    return () => {
      clearTimeout(timeout);
      setIsDisconnectedLongEnough(false);
    };
  }, [isConnected]);

  if (isConnected || !isDisconnectedLongEnough) return null;

  return (
    <div
      role="status"
      className="flex flex-shrink-0 flex-wrap items-center gap-x-2 gap-y-0.5 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span className="font-medium">Sem conexão em tempo real.</span>
      <span className="text-amber-800 dark:text-amber-300">Reconectando… Novas mensagens podem demorar a aparecer.</span>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

type MobileView = "list" | "chat" | "info";

const mobileViewIndex: Record<MobileView, number> = { list: 0, chat: 1, info: 2 };

const mobileViewSlideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%" }),
};

export function Whatsapp() {
  const { isConnected } = useSocketContext();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState<Tab>("queue");
  const [selected, setSelected] = useState<WhatsappContactMessage | null>(null);
  const [rightPanel, setRightPanel] = useState<InfoPanelTab>("summary");
  const [[mobileView, mobileViewDirection], setMobileViewState] = useState<[MobileView, number]>(["list", 0]);

  // A ficha (aba "Ficha" do painel) avisa se tem edição pendente; trocar de aba/contato a desmontaria
  const [isProfileDirty, setIsProfileDirty] = useState(false);
  const { guard, guardDialog } = useUnsavedChangesGuard(isProfileDirty);

  const goToMobileView = (view: MobileView) => {
    setMobileViewState(([current]) => [view, mobileViewIndex[view] > mobileViewIndex[current] ? 1 : -1]);
  };

  const handleSelectContact = (contact: WhatsappContactMessage) => {
    const open = () => {
      setSelected(contact);
      goToMobileView("chat");
    };
    if (contact.id === selected?.id) return open();
    guard(open);
  };

  const changeRightPanel = (panel: InfoPanelTab) => {
    if (panel === rightPanel) return;
    guard(() => setRightPanel(panel));
  };

  // Links de fora da tela (como o card do CRM) abrem a conversa do contato pela aba Todos
  const { client } = useClientContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedContactId = searchParams.get("contactId");
  const linkedPhone = searchParams.get("phone");

  useEffect(() => {
    if (!linkedContactId || !linkedPhone) return;

    whatsappService
      .findAllContacts({ params: { clientId: client.id }, queries: { page: 1, take: 10, tab: "all", text: linkedPhone } })
      .then((response) => {
        const contact = response.items.find((item) => item.id === linkedContactId);
        if (!contact) return;

        setTab("all");
        handleSelectContact(contact);
      })
      .finally(() => setSearchParams({}, { replace: true }));
  }, [linkedContactId, linkedPhone]);

  const { serviceGroups } = useServiceGroupSelection();
  useNewContactNotifications({
    serviceGroupIds: serviceGroups.map((group) => group.id),
    selectedContactId: selected?.id,
    onOpenContact: (contact, contactTab) => {
      setTab(contactTab);
      handleSelectContact(contact);
    },
  });

  return (
    <div className="flex h-full flex-col">
      {guardDialog}
      <ConnectionNotice isConnected={isConnected} />
      <div className="flex min-h-0 flex-1 overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* ════ DESKTOP LAYOUT (md+) ════ */}
        {!isMobile && (
          <div className="flex h-full w-full">
            {/* Contact list */}
            <aside className="border-border flex w-80 flex-shrink-0 flex-col border-r">
              <ContactListPanel tab={tab} setTab={setTab} selected={selected} onSelectContact={handleSelectContact} />
            </aside>

            {/* Conversation + right panel */}
            {selected ? (
              <div className="flex min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 flex-1 flex-col">
                  <ChatView key={selected.id} contact={selected} onServiceAssumed={() => setTab("mine")} />
                </div>
                <aside className="border-border w-72 flex-shrink-0 border-l">
                  <InfoPanel
                    selected={selected}
                    rightPanel={rightPanel}
                    setRightPanel={changeRightPanel}
                    onProfileDirtyChange={setIsProfileDirty}
                  />
                </aside>
              </div>
            ) : (
              <div className="bg-background flex flex-1 items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="text-muted-foreground mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p className="text-muted-foreground text-sm">Selecione um contato para iniciar</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════ MOBILE LAYOUT (<md) ════ */}
        {isMobile && (
          <div className="flex h-full w-full flex-col md:hidden">
            {/* Views */}
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <AnimatePresence initial={false} custom={mobileViewDirection}>
                <motion.div
                  key={mobileView}
                  custom={mobileViewDirection}
                  variants={mobileViewSlideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.28, ease: "easeInOut" }}
                  className="absolute inset-0 h-full w-full"
                >
                  {mobileView === "list" && (
                    <ContactListPanel tab={tab} setTab={setTab} selected={selected} onSelectContact={handleSelectContact} />
                  )}

                  {mobileView === "chat" && selected && (
                    <ChatView
                      key={selected.id}
                      contact={selected}
                      onServiceAssumed={() => setTab("mine")}
                      onBack={() => goToMobileView("list")}
                      onShowInfo={() => goToMobileView("info")}
                    />
                  )}

                  {mobileView === "info" && (
                    <div className="flex h-full flex-col">
                      {/* Back to chat */}
                      <div className="border-border bg-card flex flex-shrink-0 items-center gap-2 border-b px-4 py-3">
                        <button
                          aria-label="Voltar para a conversa"
                          className="hover:bg-muted text-muted-foreground flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                          onClick={() => guard(() => goToMobileView("chat"))}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span className="text-foreground text-sm font-semibold">Informações</span>
                      </div>
                      <div className="min-h-0 flex-1">
                        {selected ? (
                          <InfoPanel
                            selected={selected}
                            rightPanel={rightPanel}
                            setRightPanel={changeRightPanel}
                            onProfileDirtyChange={setIsProfileDirty}
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
