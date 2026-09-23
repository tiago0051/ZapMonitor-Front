import { useState } from "react";
import { MessageSquare, Search, X, ArrowLeft } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { ContactCard } from "./components/contactCard";
import { ContactCardSkeleton } from "./components/contactCard/skeleton";
import { InfoPanel } from "./components/infoPanel";
import { ChatView } from "./components/chatView";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useContactsListService } from "./useContactsListService";

// ── Shared sub-panels ────────────────────────────────────────────────────────

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

  const { contacts, stats } = useContactsListService({ search, tab });

  function renderContactsList() {
    if (contacts.isLoading) return Array.from({ length: 6 }).map((_, index) => <ContactCardSkeleton key={index} />);
    if (contacts.isEmpty) return <div className="text-muted-foreground py-12 text-center text-sm">Nenhum contato encontrado</div>;

    return contacts.items.map((c) => (
      <ContactCard key={c.id} contact={c} active={selected?.id === c.id} onClick={() => onSelectContact(c)} />
    ));
  }

  return (
    <div className="bg-card flex h-full flex-col">
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

      <div className="border-border flex-shrink-0 border-b px-3 py-2.5">
        <div className="bg-muted flex items-center gap-2 rounded-lg px-3 py-1.5">
          <Search className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar contato..."
            className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="text-muted-foreground h-3.5 w-3.5" />
            </button>
          )}
        </div>
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
  const [rightPanel, setRightPanel] = useState<"summary" | "history" | "files">("summary");
  const [[mobileView, mobileViewDirection], setMobileViewState] = useState<[MobileView, number]>(["list", 0]);

  const goToMobileView = (view: MobileView) => {
    setMobileViewState(([current]) => [view, mobileViewIndex[view] > mobileViewIndex[current] ? 1 : -1]);
  };

  const handleSelectContact = (contact: WhatsappContactMessage) => {
    setSelected(contact);
    goToMobileView("chat");
  };

  return (
    <>
      {!isConnected && <div className="max-h-10 w-full bg-yellow-300 p-2">Desconectado</div>}
      <div className="flex h-full overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
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
                  <InfoPanel selected={selected} rightPanel={rightPanel} setRightPanel={setRightPanel} />
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
                          className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                          onClick={() => goToMobileView("chat")}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </button>
                        <span className="text-foreground text-sm font-semibold">Informações</span>
                      </div>
                      <div className="min-h-0 flex-1">
                        {selected ? <InfoPanel selected={selected} rightPanel={rightPanel} setRightPanel={setRightPanel} /> : null}
                      </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
