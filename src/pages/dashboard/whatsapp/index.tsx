import { useEffect, useState } from "react";
import { MessageSquare, Search, X, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { whatsappService } from "@/services/api/whatsappService";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { ContactCard } from "./components/contactCard";
import { InfoPanel } from "./components/infoPanel";
import { ChatView } from "./components/chatView";
import { useSocketContext } from "@/context/SocketContext/socketContext";
import type { ContactUpdate } from "./types/contactUpdate";
import { useIsMobile } from "@/hooks/use-mobile";

// ── Shared sub-panels ────────────────────────────────────────────────────────

const takeItems = 10;

function ContactListPanel({
  tab,
  setTab,
  search,
  setSearch,
  selected,
  onSelectContact,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  search: string;
  setSearch: (s: string) => void;
  selected: WhatsappContactMessage | null;
  onSelectContact: (contact: WhatsappContactMessage) => void;
}) {
  const { socket, isConnected } = useSocketContext();
  const { client } = useClientContext();

  const queryClient = useQueryClient();

  const contactsStatsQuery = useQuery({
    queryFn: async () =>
      whatsappService.findContactsStats({
        params: {
          clientId: client.id,
        },
      }),
    queryKey: ["whatsapp", "contactsStats"],
  });

  const contactsMessageQuery = useQuery({
    queryFn: async () =>
      whatsappService.findAllContacts({
        params: {
          clientId: client.id,
        },
        queries: {
          page: 1,
          take: takeItems,
          tab,
          text: search,
        },
      }),
    queryKey: ["whatsapp", "contacts", tab, search],
  });

  useEffect(() => {
    if (isConnected) {
      socket.on("contacts:update", ({ contact, isNewMessage }: ContactUpdate) => {
        contactsStatsQuery.refetch();

        queryClient.setQueryData(["whatsapp", "contacts", tab, search], (data: PaginatedResponse<WhatsappContactMessage>) => {
          if (!data) return;

          const { items, ...old } = data;

          const hasContact = items.some((item) => item.id === contact.id);

          if (hasContact)
            return {
              ...old,
              items: items.map((item) => (item.id === contact.id ? contact : item)),
            };

          const hasPageFull = items.length === takeItems;

          if (!hasContact && !old.canNextPage && !hasPageFull) return { ...old, items: [...items, contact] };
        });
      });
    }

    return () => {
      socket.off("contacts:update");
    };
  }, [isConnected, socket]);

  const queueContactsLength = contactsStatsQuery.data?.queueCount ?? 0;
  const myContactsLength = contactsStatsQuery.data?.myCount ?? 0;

  const contacts = contactsMessageQuery.data?.items ?? [];

  return (
    <div className="bg-card flex h-full flex-col">
      {/* Tabs */}
      <div className="border-border flex flex-shrink-0 border-b">
        {(["queue", "mine", "all"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { queue: "Fila", mine: "Meus", all: "Todos" };
          const badges: Record<Tab, React.ReactNode> = {
            queue: (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {queueContactsLength}
              </span>
            ),
            mine: (
              <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                {myContactsLength}
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
              {badges[t]}
              {tab === t && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
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
      <div className="scrollbar-hide flex-1 overflow-y-auto">
        {contacts.length === 0 ? (
          <div className="text-muted-foreground py-12 text-center text-sm">Nenhum contato encontrado</div>
        ) : (
          contacts.map((c) => <ContactCard key={c.id} contact={c} active={selected?.id === c.id} onClick={() => onSelectContact(c)} />)
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

type MobileView = "list" | "chat" | "info";

export function Whatsapp() {
  const { isConnected } = useSocketContext();
  const isMobile = useIsMobile();

  const [tab, setTab] = useState<Tab>("queue");
  const [selected, setSelected] = useState<WhatsappContactMessage | null>(null);
  const [rightPanel, setRightPanel] = useState<"summary" | "history">("summary");
  const [search, setSearch] = useState("");
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const handleSelectContact = (contact: WhatsappContactMessage) => {
    setSelected(contact);
    setMobileView("chat");
  };

  return (
    <>
      {!isConnected && <div className="w-full bg-yellow-300 p-2">Desconectado</div>}
      <div className="bg-background flex overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
        {/* ════ DESKTOP LAYOUT (md+) ════ */}
        {!isMobile && (
          <div className="flex h-full w-full">
            {/* Contact list */}
            <aside className="border-border flex w-80 flex-shrink-0 flex-col border-r">
              <ContactListPanel
                tab={tab}
                setTab={setTab}
                search={search}
                setSearch={setSearch}
                selected={selected}
                onSelectContact={handleSelectContact}
              />
            </aside>

            {/* Conversation + right panel */}
            {selected ? (
              <div className="flex min-w-0 flex-1 overflow-hidden">
                <div className="flex min-w-0 flex-1 flex-col">{<ChatView contact={selected} />}</div>
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
            <div className="min-h-0 flex-1 overflow-hidden">
              {/* List view */}
              <div className={`h-full ${mobileView === "list" ? "block" : "hidden"}`}>
                <ContactListPanel
                  tab={tab}
                  setTab={setTab}
                  search={search}
                  setSearch={setSearch}
                  selected={selected}
                  onSelectContact={handleSelectContact}
                />
              </div>

              {/* Chat view */}
              <div className={`h-full ${mobileView === "chat" ? "block" : "hidden"}`}>{selected && <ChatView contact={selected} />}</div>

              {/* Info view */}
              <div className={`flex h-full flex-col ${mobileView === "info" ? "flex" : "hidden"}`}>
                {/* Back to chat */}
                <div className="border-border bg-card flex flex-shrink-0 items-center gap-2 border-b px-4 py-3">
                  <button
                    className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                    onClick={() => setMobileView("chat")}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <span className="text-foreground text-sm font-semibold">Informações</span>
                </div>
                <div className="min-h-0 flex-1">
                  {selected ? <InfoPanel selected={selected} rightPanel={rightPanel} setRightPanel={setRightPanel} /> : null}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
