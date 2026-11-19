import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { whatsappService } from "@/services/api/whatsappService";
import { useInfiniteQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronDown, ChevronUp, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState, type FC } from "react";

const PAGE_SIZE = 20;
const MIN_LENGTH = 2;
const DEBOUNCE_MS = 350;

type ConversationSearchProps = {
  contactId: string;
  // Termo em uso (para marcar nas mensagens) e mensagem escolhida para mostrar
  onChange: (state: { term: string; messageId: string | null; nonce: number }) => void;
  onClose: () => void;
};

/**
 * Busca dentro da conversa: procura no servidor (mensagens antigas também) e anda pelos resultados do mais novo para o
 * mais antigo. Enter ou ↑ vai para o anterior; Shift+Enter ou ↓ para o mais novo; Esc fecha.
 */
export const ConversationSearch: FC<ConversationSearchProps> = ({ contactId, onChange, onClose }) => {
  const { client } = useClientContext();
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const [index, setIndex] = useState(0);
  const nonce = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setTerm(input.trim()), DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [input]);

  const enabled = term.length >= MIN_LENGTH;
  const searchQuery = useInfiniteQuery({
    meta: { errorHandledInline: true },
    queryKey: [`contact-${contactId}`, "messageSearch", contactId, term],
    queryFn: ({ pageParam = 1 }) =>
      whatsappService.searchContactMessages({
        params: { clientId: client.id, contactId },
        queries: { text: term, page: pageParam, take: PAGE_SIZE },
      }),
    getNextPageParam: (lastPage, allPages) => (lastPage.canNextPage ? allPages.length + 1 : undefined),
    initialPageParam: 1,
    enabled,
  });

  const results = enabled ? (searchQuery.data?.pages.flatMap((page) => page.items) ?? []) : [];
  const total = enabled ? (searchQuery.data?.pages[0]?.total ?? 0) : 0;
  const current = results[index] ?? null;

  // Termo novo: volta para o resultado mais recente
  const [prevTerm, setPrevTerm] = useState(term);
  if (term !== prevTerm) {
    setPrevTerm(term);
    setIndex(0);
  }

  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const currentId = current?.id ?? null;
  useEffect(() => {
    nonce.current += 1;
    onChangeRef.current({ term: enabled ? term : "", messageId: currentId, nonce: nonce.current });
  }, [term, enabled, currentId]);

  // Ao sair da busca, as marcações somem
  useEffect(() => () => onChangeRef.current({ term: "", messageId: null, nonce: 0 }), []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const goOlder = async () => {
    if (index + 1 < results.length) {
      setIndex(index + 1);
      return;
    }
    if (searchQuery.hasNextPage && !searchQuery.isFetchingNextPage) {
      const next = await searchQuery.fetchNextPage();
      const loaded = next.data?.pages.reduce((count, page) => count + page.items.length, 0) ?? 0;
      if (index + 1 < loaded) setIndex(index + 1);
    }
  };

  const goNewer = () => setIndex((value) => Math.max(0, value - 1));

  const canGoOlder = index + 1 < results.length || !!searchQuery.hasNextPage;
  const isSearching = enabled && searchQuery.isFetching;

  const status = !enabled
    ? input.trim().length > 0
      ? "Digite ao menos 2 letras"
      : ""
    : searchQuery.isError
      ? "Não foi possível buscar"
      : searchQuery.isLoading
        ? "Buscando..."
        : total === 0
          ? "Nada encontrado"
          : `${index + 1} de ${total}`;

  return (
    <div className="bg-card flex flex-col gap-1 border-b px-2 py-2 sm:px-3 md:px-5">
      <div className="flex items-center gap-1.5">
        <div className="bg-muted flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-1.5">
          {isSearching ? (
            <Loader2 className="text-muted-foreground h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
          )}
          <input
            ref={inputRef}
            value={input}
            maxLength={100}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                onClose();
              } else if (event.key === "Enter") {
                event.preventDefault();
                if (event.shiftKey) goNewer();
                else void goOlder();
              }
            }}
            aria-label="Buscar nesta conversa"
            placeholder="Buscar nesta conversa"
            className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
          />
          <span className="text-muted-foreground shrink-0 text-xs tabular-nums" role="status" aria-live="polite">
            {status}
          </span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Resultado mais antigo" disabled={!canGoOlder} onClick={() => void goOlder()}>
          <ChevronUp className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Resultado mais novo" disabled={index === 0} onClick={goNewer}>
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="Fechar busca" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {current && (
        <p className="text-muted-foreground truncate px-1 text-xs">
          <span className="tabular-nums">{format(current.createdAt, "dd/MM/yyyy HH:mm")}</span> · {current.snippet}
        </p>
      )}
    </div>
  );
};
