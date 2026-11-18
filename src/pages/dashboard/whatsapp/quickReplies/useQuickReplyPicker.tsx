import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { QuickReplyPanel } from "./quickReplyPanel";
import { searchQuickReplies, useQuickReplies } from "./quickReplies";

// "/" no começo da caixa, sem espaço depois: o resto é a busca
const SLASH_QUERY = /^\/(\S*)$/;

/**
 * Lista de respostas rápidas aberta ao digitar "/" na caixa de mensagem. Setas navegam, Enter ou Tab escolhem e Esc
 * fecha (a barra continua no texto).
 */
export const useQuickReplyPicker = ({ text, onSelect }: { text: string; onSelect: (reply: QuickReply) => void }) => {
  const match = SLASH_QUERY.exec(text);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isOpen = !!match && dismissedFor !== text;

  const query = match?.[1] ?? null;
  const repliesQuery = useQuickReplies(query !== null);
  const results = useMemo(() => searchQuickReplies(repliesQuery.data ?? [], query ?? ""), [repliesQuery.data, query]);

  const [prevQuery, setPrevQuery] = useState(query);
  if (query !== prevQuery) {
    setPrevQuery(query);
    setActiveIndex(0);
  }

  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  /** Devolve true quando a tecla foi da lista (o compositor não deve tratar). */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isOpen) return false;

    if (event.key === "Escape") {
      event.preventDefault();
      setDismissedFor(text);
      return true;
    }
    if (results.length === 0) return false;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % results.length);
      return true;
    }
    if ((event.key === "Enter" && !event.shiftKey) || event.key === "Tab") {
      event.preventDefault();
      onSelect(results[Math.min(activeIndex, results.length - 1)]);
      return true;
    }
    return false;
  };

  const panel = isOpen ? (
    <QuickReplyPanel
      listRef={listRef}
      results={results}
      activeIndex={activeIndex}
      isLoading={repliesQuery.isLoading}
      isError={repliesQuery.isError}
      hasAny={(repliesQuery.data?.length ?? 0) > 0}
      onHover={setActiveIndex}
      onSelect={onSelect}
    />
  ) : null;

  return { isOpen, handleKeyDown, panel };
};

