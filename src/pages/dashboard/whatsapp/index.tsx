import { useState } from "react";
import {
  MessageSquare,
  Users,
  Clock,
  Send,
  Paperclip,
  Smile,
  CheckCheck,
  Bot,
  FileText,
  MoreHorizontal,
  Search,
  X,
  Tag,
  Mic,
  ArrowLeft,
  Info,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

type Tab = "queue" | "mine" | "all";
type MessageSide = "in" | "out";
type ProtocolStatus = "resolved" | "open" | "transferred";

interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread?: number;
  tags?: string[];
  agent?: string;
  waiting?: string;
  protocol: string;
}

interface Message {
  id: string;
  side: MessageSide;
  text: string;
  time: string;
  read?: boolean;
}

interface Protocol {
  id: string;
  date: string;
  agent: string;
  status: ProtocolStatus;
  summary: string;
}

// ── Mock data ────────────────────────────────────────────────────────────────

const queueContacts: Contact[] = [
  {
    id: "q1",
    name: "Ana Beatriz",
    avatar: "AB",
    lastMessage: "Olá, preciso de ajuda com meu pedido #4821",
    time: "09:14",
    unread: 2,
    tags: ["Suporte"],
    waiting: "12 min",
    protocol: "PRO-4821",
  },
  {
    id: "q2",
    name: "Carlos Mendes",
    avatar: "CM",
    lastMessage: "Bom dia! Quando meu produto será entregue?",
    time: "09:08",
    unread: 1,
    tags: ["Entrega"],
    waiting: "18 min",
    protocol: "PRO-4820",
  },
  {
    id: "q3",
    name: "Fernanda Lopes",
    avatar: "FL",
    lastMessage: "Quero cancelar minha assinatura.",
    time: "08:57",
    tags: ["Cancelamento"],
    waiting: "29 min",
    protocol: "PRO-4819",
  },
  {
    id: "q4",
    name: "Roberto Alves",
    avatar: "RA",
    lastMessage: "Ainda não recebi o reembolso do mês passado.",
    time: "08:42",
    unread: 3,
    tags: ["Suporte", "Entrega", "Cancelamento", "Financeiro"],
    waiting: "44 min",
    protocol: "PRO-4818",
  },
];

const myContacts: Contact[] = [
  {
    id: "m1",
    name: "Mariana Costa",
    avatar: "MC",
    lastMessage: "Perfeito, obrigada pela ajuda!",
    time: "09:20",
    agent: "Você",
    protocol: "PRO-4815",
  },
  {
    id: "m2",
    name: "João Victor",
    avatar: "JV",
    lastMessage: "Ok, vou verificar no meu e-mail.",
    time: "09:15",
    agent: "Você",
    protocol: "PRO-4814",
    unread: 1,
  },
  {
    id: "m3",
    name: "Patrícia Souza",
    avatar: "PS",
    lastMessage: "Não consigo acessar minha conta.",
    time: "08:50",
    agent: "Você",
    tags: ["Acesso"],
    protocol: "PRO-4812",
  },
];

const allContacts: Contact[] = [
  ...queueContacts,
  ...myContacts,
  {
    id: "a1",
    name: "Beatriz Oliveira",
    avatar: "BO",
    lastMessage: "Boa tarde, quero saber sobre o plano anual.",
    time: "08:30",
    tags: ["Vendas"],
    protocol: "PRO-4810",
    agent: "Luisa M.",
  },
  {
    id: "a2",
    name: "Diego Martins",
    avatar: "DM",
    lastMessage: "Recebi um produto com defeito.",
    time: "08:15",
    tags: ["Troca"],
    protocol: "PRO-4808",
    agent: "Pedro S.",
  },
  {
    id: "a3",
    name: "Camila Ferreira",
    avatar: "CF",
    lastMessage: "Preciso de nota fiscal do pedido #3190.",
    time: "07:58",
    tags: ["Financeiro"],
    protocol: "PRO-4807",
    agent: "Ana R.",
  },
  {
    id: "a4",
    name: "Lucas Pereira",
    avatar: "LP",
    lastMessage: "Meu app está travando na tela de login.",
    time: "07:44",
    tags: ["Técnico"],
    protocol: "PRO-4806",
    agent: "Pedro S.",
  },
  {
    id: "a5",
    name: "Renata Gomes",
    avatar: "RG",
    lastMessage: "Quero atualizar meu endereço de entrega.",
    time: "07:31",
    tags: ["Cadastro"],
    protocol: "PRO-4805",
    agent: "Luisa M.",
  },
  {
    id: "a6",
    name: "Thiago Barbosa",
    avatar: "TB",
    lastMessage: "Quando abre o suporte presencial?",
    time: "07:20",
    tags: ["Geral"],
    protocol: "PRO-4804",
    agent: "Ana R.",
  },
  {
    id: "a7",
    name: "Isabela Rocha",
    avatar: "IR",
    lastMessage: "Meu cupom de desconto não está funcionando.",
    time: "07:10",
    tags: ["Vendas"],
    protocol: "PRO-4803",
    agent: "Você",
  },
];

const conversationMessages: Record<string, Message[]> = {
  q1: [
    { id: "1", side: "in", text: "Olá, bom dia!", time: "09:10" },
    {
      id: "2",
      side: "in",
      text: "Preciso de ajuda com meu pedido #4821, ele deveria ter chegado ontem mas ainda não recebi.",
      time: "09:11",
    },
    { id: "3", side: "out", text: "Bom dia, Ana! Vou verificar o status do seu pedido agora mesmo.", time: "09:13", read: true },
    { id: "4", side: "in", text: "Obrigada! Fico aguardando.", time: "09:14" },
  ],
  m1: [
    { id: "1", side: "in", text: "Boa tarde! Preciso trocar o tamanho de um produto.", time: "08:50" },
    { id: "2", side: "out", text: "Olá Mariana, tudo bem? Pode me passar o número do pedido?", time: "08:52", read: true },
    { id: "3", side: "in", text: "Claro, é o #3290.", time: "08:53" },
    {
      id: "4",
      side: "out",
      text: "Perfeito! Já realizei a solicitação de troca. Você receberá um e-mail de confirmação.",
      time: "09:18",
      read: true,
    },
    { id: "5", side: "in", text: "Perfeito, obrigada pela ajuda!", time: "09:20" },
  ],
  m2: [
    { id: "1", side: "in", text: "Não estou recebendo os e-mails de confirmação do sistema.", time: "09:00" },
    { id: "2", side: "out", text: "Entendido, João! Vou verificar as configurações da sua conta.", time: "09:05", read: true },
    { id: "3", side: "out", text: "Encontrei o problema. Seu e-mail estava marcado como inativo. Já corrigi.", time: "09:12", read: true },
    { id: "4", side: "in", text: "Ok, vou verificar no meu e-mail.", time: "09:15" },
  ],
};

const protocolHistory: Record<string, Protocol[]> = {
  q1: [
    {
      id: "P-4801",
      date: "12/07/2026",
      agent: "Luisa M.",
      status: "resolved",
      summary: "Cliente solicitou segunda via de boleto. Enviada por e-mail.",
    },
    { id: "P-4788", date: "28/06/2026", agent: "Pedro S.", status: "resolved", summary: "Dúvida sobre prazo de entrega esclarecida." },
  ],
  m1: [
    {
      id: "P-4790",
      date: "01/07/2026",
      agent: "Luisa M.",
      status: "resolved",
      summary: "Troca de produto solicitada e processada com sucesso.",
    },
    {
      id: "P-4775",
      date: "20/06/2026",
      agent: "Ana R.",
      status: "resolved",
      summary: "Cancelamento de pedido duplicado realizado e reembolso iniciado.",
    },
  ],
  m2: [{ id: "P-4800", date: "10/07/2026", agent: "Você", status: "resolved", summary: "Suporte técnico prestado para acesso ao portal." }],
};

const aiSummaries: Record<string, string> = {
  q1: "Cliente aguarda informações sobre o pedido #4821 com entrega em atraso. Alto nível de urgência — pedido estava previsto para ontem. Sem histórico de reclamações anteriores sobre entrega.",
  m1: "Solicitação de troca de tamanho do pedido #3290 processada com sucesso. Cliente satisfeita e sem pendências abertas.",
  m2: "Problema de recebimento de e-mails corrigido. E-mail do cliente estava marcado como inativo no sistema — já normalizado.",
  m3: "Cliente relata impossibilidade de acesso à conta. Aguardando verificação de identidade para reset de senha.",
};

// ── Sub-components ────────────────────────────────────────────────────────────

const avatarColors: Record<string, string> = {
  AB: "bg-violet-100 text-violet-700",
  CM: "bg-blue-100 text-blue-700",
  FL: "bg-pink-100 text-pink-700",
  RA: "bg-orange-100 text-orange-700",
  MC: "bg-teal-100 text-teal-700",
  JV: "bg-indigo-100 text-indigo-700",
  PS: "bg-rose-100 text-rose-700",
  BO: "bg-yellow-100 text-yellow-700",
  DM: "bg-cyan-100 text-cyan-700",
  CF: "bg-lime-100 text-lime-700",
  LP: "bg-purple-100 text-purple-700",
  RG: "bg-fuchsia-100 text-fuchsia-700",
  TB: "bg-sky-100 text-sky-700",
  IR: "bg-emerald-100 text-emerald-700",
};

function Avatar({ initials, size = "md" }: { initials: string; size?: "sm" | "md" }) {
  const color = avatarColors[initials] ?? "bg-gray-100 text-gray-600";
  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return <div className={`${sz} ${color} flex flex-shrink-0 items-center justify-center rounded-full font-semibold`}>{initials}</div>;
}

function StatusDot({ status }: { status: ProtocolStatus }) {
  const colors: Record<ProtocolStatus, string> = {
    resolved: "bg-green-400",
    open: "bg-amber-400",
    transferred: "bg-blue-400",
  };
  return <span className={`h-2 w-2 flex-shrink-0 rounded-full ${colors[status]}`} />;
}

function ContactCard({
  contact,
  active,
  onClick,
  showWaiting,
  showAgent = false,
}: {
  contact: Contact;
  active: boolean;
  onClick: () => void;
  showWaiting: boolean;
  showAgent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`border-border w-full border-b px-4 py-3 text-left transition-colors ${
        active ? "border-l-2 border-l-green-500 bg-green-50" : "border-l-2 border-l-transparent hover:bg-gray-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <Avatar initials={contact.avatar} />
        <div className="min-w-0 flex-1">
          <div className="mb-0.5 flex items-center justify-between gap-1">
            <span className="text-foreground truncate text-sm font-semibold">{contact.name}</span>
            <span className="text-muted-foreground flex-shrink-0 text-[11px]">{contact.time}</span>
          </div>
          <p className="text-muted-foreground mb-1.5 truncate text-xs">{contact.lastMessage}</p>
          <div className="flex flex-wrap items-center gap-1.5">
            {contact.tags &&
              contact.tags.slice(0, 2).map((t) => (
                <span
                  key={t}
                  className="text-muted-foreground bg-muted flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] leading-none font-medium"
                >
                  {t}
                </span>
              ))}
            {contact.tags && contact.tags.length > 2 && (
              <span className="text-muted-foreground bg-muted rounded px-1.5 py-0.5 text-[10px] leading-none font-semibold">
                +{contact.tags.length - 2}
              </span>
            )}
            {showWaiting && contact.waiting && (
              <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                <Clock className="h-2.5 w-2.5" />
                {contact.waiting}
              </span>
            )}
            {showAgent && contact.agent && (
              <span className="text-muted-foreground flex items-center gap-1 text-[10px]">
                <Users className="h-2.5 w-2.5" />
                {contact.agent}
              </span>
            )}
            {contact.unread && (
              <span className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-[10px] font-bold text-white">
                {contact.unread}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function MessageBubble({ msg }: { msg: Message }) {
  const isOut = msg.side === "out";
  return (
    <div className={`flex ${isOut ? "justify-end" : "justify-start"} mb-2`}>
      <div
        className={`max-w-[72%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          isOut ? "rounded-br-sm bg-green-500 text-white" : "text-foreground border-border rounded-bl-sm border bg-white shadow-sm"
        }`}
      >
        <p>{msg.text}</p>
        <div className={`mt-1 flex items-center gap-1 ${isOut ? "justify-end" : "justify-start"}`}>
          <span className={`text-[10px] ${isOut ? "text-green-100" : "text-muted-foreground"}`}>{msg.time}</span>
          {isOut && <CheckCheck className={`h-3 w-3 ${msg.read ? "text-blue-200" : "text-green-200"}`} />}
        </div>
      </div>
    </div>
  );
}

// ── Shared sub-panels ────────────────────────────────────────────────────────

function ContactListPanel({
  tab,
  setTab,
  search,
  setSearch,
  allSearch,
  setAllSearch,
  hasSearched,
  setHasSearched,
  filtered,
  allFiltered,
  selectedId,
  setSelectedId,
  onSelectContact,
}: {
  tab: Tab;
  setTab: (t: Tab) => void;
  search: string;
  setSearch: (s: string) => void;
  allSearch: string;
  setAllSearch: (s: string) => void;
  hasSearched: boolean;
  setHasSearched: (b: boolean) => void;
  filtered: Contact[];
  allFiltered: Contact[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  onSelectContact: (id: string) => void;
}) {
  return (
    <div className="bg-card flex h-full flex-col">
      {/* Tabs */}
      <div className="border-border flex flex-shrink-0 border-b">
        {(["queue", "mine", "all"] as Tab[]).map((t) => {
          const labels: Record<Tab, string> = { queue: "Fila", mine: "Meus", all: "Todos" };
          const badges: Record<Tab, React.ReactNode> = {
            queue: (
              <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                {queueContacts.length}
              </span>
            ),
            mine: (
              <span className="ml-1.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                {myContacts.length}
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

      {tab !== "all" ? (
        <>
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
            {filtered.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">Nenhum contato encontrado</div>
            ) : (
              filtered.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  active={selectedId === c.id}
                  onClick={() => onSelectContact(c.id)}
                  showWaiting={tab === "queue"}
                />
              ))
            )}
          </div>
        </>
      ) : (
        <>
          <div className="border-border flex-shrink-0 border-b px-3 py-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setHasSearched(true);
              }}
              className="flex items-center gap-2"
            >
              <div className="bg-muted flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5">
                <Search className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                <input
                  value={allSearch}
                  onChange={(e) => {
                    setAllSearch(e.target.value);
                    setHasSearched(false);
                  }}
                  placeholder="Nome, protocolo ou tag..."
                  className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-sm outline-none"
                />
                {allSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setAllSearch("");
                      setHasSearched(false);
                    }}
                  >
                    <X className="text-muted-foreground h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-8 flex-shrink-0 rounded-lg bg-green-500 px-3 text-xs font-medium text-white transition-colors hover:bg-green-600"
              >
                Buscar
              </button>
            </form>
          </div>
          <div className="scrollbar-hide flex-1 overflow-y-auto">
            {!hasSearched ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-14 text-center">
                <Search className="text-muted-foreground h-8 w-8 opacity-30" />
                <p className="text-muted-foreground text-sm">Digite para buscar entre todos os atendimentos</p>
                <p className="text-muted-foreground text-[11px] opacity-70">Exibe até 10 resultados</p>
              </div>
            ) : allFiltered.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center text-sm">Nenhum resultado encontrado</div>
            ) : (
              <>
                <div className="px-4 py-2">
                  <span className="text-muted-foreground text-[11px]">
                    {allFiltered.length} resultado{allFiltered.length !== 1 ? "s" : ""}
                    {allContacts.filter(
                      (c) =>
                        c.name.toLowerCase().includes(allSearch.toLowerCase()) ||
                        c.protocol.toLowerCase().includes(allSearch.toLowerCase()) ||
                        (c.tags ?? []).some((t) => t.toLowerCase().includes(allSearch.toLowerCase())),
                    ).length > 10 && " (mostrando 10)"}
                  </span>
                </div>
                {allFiltered.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    active={selectedId === c.id}
                    onClick={() => onSelectContact(c.id)}
                    showWaiting={false}
                    showAgent
                  />
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function InfoPanel({
  selected,
  rightPanel,
  setRightPanel,
  tab,
  protocols,
  aiSummary,
}: {
  selected: Contact;
  rightPanel: "summary" | "history";
  setRightPanel: (p: "summary" | "history") => void;
  tab: Tab;
  protocols: Protocol[];
  aiSummary: string | null;
}) {
  return (
    <div className="bg-card flex h-full flex-col">
      <div className="border-border flex flex-shrink-0 border-b">
        <button
          onClick={() => setRightPanel("summary")}
          className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            rightPanel === "summary" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Bot className="h-3.5 w-3.5" />
          Resumo IA
          {rightPanel === "summary" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
        <button
          onClick={() => setRightPanel("history")}
          className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors ${
            rightPanel === "history" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileText className="h-3.5 w-3.5" />
          Histórico
          {rightPanel === "history" && <span className="absolute right-0 bottom-0 left-0 h-0.5 rounded-full bg-green-500" />}
        </button>
      </div>

      <div className="border-border bg-muted/40 flex-shrink-0 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar initials={selected.avatar} size="sm" />
          <div>
            <p className="text-foreground text-xs font-semibold">{selected.name}</p>
            <p className="text-muted-foreground text-[11px]">{selected.protocol}</p>
          </div>
        </div>
      </div>

      <div className="scrollbar-hide flex-1 overflow-y-auto px-4 py-4">
        {rightPanel === "summary" ? (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-green-100">
                <Bot className="h-3.5 w-3.5 text-green-600" />
              </div>
              <span className="text-foreground text-xs font-semibold">Análise automática</span>
            </div>
            {aiSummary ? (
              <p className="text-muted-foreground bg-muted rounded-xl p-3 text-xs leading-relaxed">{aiSummary}</p>
            ) : (
              <p className="text-muted-foreground text-xs">Sem resumo disponível.</p>
            )}
            {selected.tags && selected.tags.length > 0 && (
              <div className="mt-4">
                <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.tags.map((t) => (
                    <span
                      key={t}
                      className="text-foreground bg-muted inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-medium"
                    >
                      <Tag className="text-muted-foreground h-2.5 w-2.5" />
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {tab === "queue" && selected.waiting && (
              <div className="mt-4">
                <p className="text-muted-foreground mb-2 text-[11px] font-semibold tracking-wider uppercase">Aguardando</p>
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                  <Clock className="h-3 w-3" />
                  {selected.waiting}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div>
            <p className="text-muted-foreground mb-3 text-[11px] font-semibold tracking-wider uppercase">Atendimentos anteriores</p>
            {protocols.length === 0 ? (
              <p className="text-muted-foreground text-xs">Sem histórico.</p>
            ) : (
              <div className="space-y-3">
                {protocols.map((p) => (
                  <div key={p.id} className="border-border bg-card rounded-xl border p-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="text-foreground text-xs font-semibold">{p.id}</span>
                      <div className="flex items-center gap-1">
                        <StatusDot status={p.status} />
                        <span className="text-muted-foreground text-[10px]">
                          {p.status === "resolved" ? "Resolvido" : p.status === "open" ? "Aberto" : "Transferido"}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground mb-2 text-[11px] leading-relaxed">{p.summary}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-[10px]">{p.agent}</span>
                      <span className="text-muted-foreground text-[10px]">{p.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main App ──────────────────────────────────────────────────────────────────

type MobileView = "list" | "chat" | "info";

export function Whatsapp() {
  const [tab, setTab] = useState<Tab>("queue");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [rightPanel, setRightPanel] = useState<"summary" | "history">("summary");
  const [search, setSearch] = useState("");
  const [allSearch, setAllSearch] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [mobileView, setMobileView] = useState<MobileView>("list");

  const contacts = tab === "queue" ? queueContacts : myContacts;
  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.lastMessage.toLowerCase().includes(search.toLowerCase()),
  );

  const allFiltered = hasSearched
    ? allContacts
        .filter(
          (c) =>
            c.name.toLowerCase().includes(allSearch.toLowerCase()) ||
            c.protocol.toLowerCase().includes(allSearch.toLowerCase()) ||
            (c.tags ?? []).some((t) => t.toLowerCase().includes(allSearch.toLowerCase())),
        )
        .slice(0, 10)
    : [];

  const selected = [...queueContacts, ...myContacts, ...allContacts].find((c) => c.id === selectedId);
  const messages = selectedId ? (conversationMessages[selectedId] ?? []) : [];
  const protocols = selectedId ? (protocolHistory[selectedId] ?? []) : [];
  const aiSummary = selectedId ? (aiSummaries[selectedId] ?? null) : null;

  const handleSend = () => {
    if (!message.trim()) return;
    setMessage("");
  };

  const handleSelectContact = (id: string) => {
    setSelectedId(id);
    setMobileView("chat");
  };

  // Shared conversation content
  const ChatView = selected ? (
    <div className="flex h-full flex-col">
      {/* Header */}
      <header className="bg-card border-border flex flex-shrink-0 items-center gap-2 border-b px-3 py-3 md:px-5">
        {/* Back button — mobile only */}
        <button
          className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors md:hidden"
          onClick={() => setMobileView("list")}
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <Avatar initials={selected.avatar} />
        <div className="min-w-0 flex-1">
          <p className="text-foreground truncate text-sm font-semibold">{selected.name}</p>
          <p className="text-muted-foreground text-xs">{selected.protocol}</p>
        </div>
        <div className="flex items-center gap-1">
          <button className="hidden rounded-lg bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-100 sm:block">
            Assumir
          </button>
          <button className="hidden rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100 sm:block">
            Encerrar
          </button>
          {/* Info button — mobile only */}
          <button
            className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors md:hidden"
            onClick={() => setMobileView("info")}
          >
            <Info className="h-4 w-4" />
          </button>
          <button className="hover:bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-lg transition-colors">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Messages */}
      <div className="scrollbar-hide flex-1 overflow-y-auto bg-[#f0f0f0] px-4 py-5 md:px-6">
        <div className="flex flex-col">
          {messages.length === 0 ? (
            <div className="flex h-full items-center justify-center py-16">
              <p className="text-muted-foreground text-sm">Nenhuma mensagem ainda.</p>
            </div>
          ) : (
            messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
          )}
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-border flex-shrink-0 border-t px-3 py-3 md:px-4">
        <div className="bg-muted flex items-end gap-2 rounded-xl px-3 py-2">
          <button className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <Paperclip className="h-4 w-4" />
          </button>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Digite uma mensagem..."
            rows={1}
            className="text-foreground placeholder:text-muted-foreground max-h-28 flex-1 resize-none bg-transparent py-1 text-sm leading-relaxed outline-none"
            style={{ scrollbarWidth: "none" }}
          />
          <button className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <Smile className="h-4 w-4" />
          </button>
          {message.trim() ? (
            <button
              onClick={handleSend}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 text-white transition-colors hover:bg-green-600"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-green-500 text-white transition-colors hover:bg-green-600">
              <Mic className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="bg-background flex h-screen overflow-hidden" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ════ DESKTOP LAYOUT (md+) ════ */}
      <div className="hidden h-full w-full md:flex">
        {/* Contact list */}
        <aside className="border-border flex w-80 flex-shrink-0 flex-col border-r">
          <ContactListPanel
            tab={tab}
            setTab={setTab}
            search={search}
            setSearch={setSearch}
            allSearch={allSearch}
            setAllSearch={setAllSearch}
            hasSearched={hasSearched}
            setHasSearched={setHasSearched}
            filtered={filtered}
            allFiltered={allFiltered}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
            onSelectContact={handleSelectContact}
          />
        </aside>

        {/* Conversation + right panel */}
        {selected ? (
          <div className="flex min-w-0 flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col">{ChatView}</div>
            <aside className="border-border w-72 flex-shrink-0 border-l">
              <InfoPanel
                selected={selected}
                rightPanel={rightPanel}
                setRightPanel={setRightPanel}
                tab={tab}
                protocols={protocols}
                aiSummary={aiSummary}
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

      {/* ════ MOBILE LAYOUT (<md) ════ */}
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
              allSearch={allSearch}
              setAllSearch={setAllSearch}
              hasSearched={hasSearched}
              setHasSearched={setHasSearched}
              filtered={filtered}
              allFiltered={allFiltered}
              selectedId={selectedId}
              setSelectedId={setSelectedId}
              onSelectContact={handleSelectContact}
            />
          </div>

          {/* Chat view */}
          <div className={`h-full ${mobileView === "chat" ? "block" : "hidden"}`}>
            {ChatView ?? (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground text-sm">Nenhum contato selecionado</p>
              </div>
            )}
          </div>

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
              {selected ? (
                <InfoPanel
                  selected={selected}
                  rightPanel={rightPanel}
                  setRightPanel={setRightPanel}
                  tab={tab}
                  protocols={protocols}
                  aiSummary={aiSummary}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
