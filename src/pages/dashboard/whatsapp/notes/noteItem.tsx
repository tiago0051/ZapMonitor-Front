import { formatShortName } from "@/utils/formatString";
import { format } from "date-fns";
import { StickyNote } from "lucide-react";
import type { FC, ReactNode } from "react";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Destaca os "@Nome" dos colegas mencionados. */
const renderContent = (content: string, mentions: WhatsappNoteUser[]): ReactNode => {
  const names = mentions.map((mention) => mention.name).filter(Boolean);
  if (names.length === 0) return content;

  const pattern = new RegExp(`(@(?:${names.map(escapeRegExp).join("|")}))`, "g");
  return content.split(pattern).map((part, index) =>
    index % 2 === 1 ? (
      <span key={index} className="font-semibold text-amber-800 dark:text-amber-300">
        {part}
      </span>
    ) : (
      part
    ),
  );
};

/** Nota interna na conversa: amarela, no meio, para não parecer mensagem do contato. */
export const NoteItem: FC<{ note: WhatsappInternalNote }> = ({ note }) => (
  <div
    className="w-[min(85%,36rem)] shrink-0 self-center rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950 shadow-xs dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
    role="note"
    aria-label="Nota interna"
  >
    <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
      <StickyNote className="size-3.5" aria-hidden />
      Nota interna · só a equipe vê
    </p>
    <p className="break-words whitespace-pre-wrap">{renderContent(note.content, note.mentions)}</p>
    <p className="mt-1 flex justify-between gap-2 text-[11px] text-amber-800/80 dark:text-amber-300/80">
      <span className="truncate">{note.authorName ? formatShortName(note.authorName) : "Equipe"}</span>
      <time dateTime={note.createdAt} title={format(note.createdAt, "dd/MM/yyyy 'às' HH:mm")} className="tabular-nums">
        {format(note.createdAt, "HH:mm")}
      </time>
    </p>
  </div>
);
