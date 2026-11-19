import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { cn } from "@/lib/utils";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AtSign, Send } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type FC, type KeyboardEvent } from "react";
import { addNoteToCache } from "./useContactNotes";

const NOTE_MAX_LENGTH = 2000;

const normalize = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();

// "@" no começo ou depois de espaço, até o cursor: o resto é a busca do colega
const MENTION_QUERY = /(^|\s)@([^\s@]*)$/;

/**
 * Caixa da nota interna. "@" abre a lista de colegas; quem continua citado no texto ao enviar recebe o aviso.
 */
export const NoteComposer: FC<{ contactId: string }> = ({ contactId }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  // Colegas escolhidos na lista; só os que ainda estão no texto contam
  const [picked, setPicked] = useState<WhatsappNoteUser[]>([]);

  const usersQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["whatsapp", "mentionableUsers", client.id],
    queryFn: () => whatsappService.findMentionableUsers({ params: { clientId: client.id } }),
    staleTime: 5 * 60 * 1000,
  });

  const mentionMatch = MENTION_QUERY.exec(text.slice(0, cursor));
  const mentionTerm = mentionMatch ? normalize(mentionMatch[2]) : null;
  const suggestions = useMemo(() => {
    if (mentionTerm === null) return [];
    return (usersQuery.data ?? []).filter((item) => item.id !== user?.id && normalize(item.name).includes(mentionTerm)).slice(0, 8);
  }, [usersQuery.data, mentionTerm, user?.id]);
  const isPickerOpen = suggestions.length > 0;

  const createNote = useMutation({
    mutationFn: whatsappService.createInternalNote,
    onSuccess: (note) => {
      addNoteToCache(queryClient, note);
      setText("");
      setPicked([]);
      inputRef.current?.focus();
    },
    onError: requestErrorHandling,
  });

  const pickUser = (target: WhatsappNoteUser) => {
    if (!mentionMatch) return;
    const start = cursor - mentionMatch[2].length - 1;
    const insert = `@${target.name} `;
    const next = `${text.slice(0, start)}${insert}${text.slice(cursor)}`;
    setText(next);
    setPicked((current) => (current.some((item) => item.id === target.id) ? current : [...current, target]));
    const position = start + insert.length;
    setCursor(position);
    setActiveIndex(0);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(position, position);
    });
  };

  const send = () => {
    const content = text.trim();
    if (!content || createNote.isPending) return;
    const mentionedUserIds = picked.filter((item) => content.includes(`@${item.name}`)).map((item) => item.id);
    createNote.mutate({ params: { clientId: client.id, contactId }, body: { content, mentionedUserIds } });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (isPickerOpen) {
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((index) => (index + step + suggestions.length) % suggestions.length);
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        pickUser(suggestions[Math.min(activeIndex, suggestions.length - 1)]);
        return;
      }
    }
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      send();
    }
  };

  const onChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setText(event.target.value);
    setCursor(event.target.selectionStart ?? event.target.value.length);
    setActiveIndex(0);
    event.target.style.height = "auto";
    event.target.style.height = `${event.target.scrollHeight}px`;
  };

  return (
    <div className="flex flex-col gap-2">
      {isPickerOpen && (
        <ul role="listbox" aria-label="Mencionar colega" className="bg-popover max-h-48 overflow-y-auto rounded-lg border py-1 shadow-md">
          {suggestions.map((item, index) => (
            <li
              key={item.id}
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onMouseDown={(event) => {
                event.preventDefault();
                pickUser(item);
              }}
              className={cn("flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm", index === activeIndex && "bg-muted")}
            >
              <AtSign className="text-muted-foreground h-3.5 w-3.5" />
              {item.name}
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          maxLength={NOTE_MAX_LENGTH}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={(event) => setCursor(event.currentTarget.selectionStart ?? 0)}
          readOnly={createNote.isPending}
          placeholder="Nota para a equipe (use @ para chamar um colega)"
          aria-label="Escreva uma nota interna"
          className="max-h-40 w-full resize-none overflow-auto rounded border border-amber-300 bg-amber-50 px-4 py-2 leading-5 transition focus:ring-2 focus:ring-amber-400 focus:outline-none dark:border-amber-500/40 dark:bg-amber-500/10"
        />
        <Button
          type="button"
          size="icon"
          onMouseDown={(event) => event.preventDefault()}
          onClick={send}
          disabled={!text.trim() || createNote.isPending}
          aria-label="Salvar nota"
          className="bg-amber-500 text-white hover:bg-amber-600"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
