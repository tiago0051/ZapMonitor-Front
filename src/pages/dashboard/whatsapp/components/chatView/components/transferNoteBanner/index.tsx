import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { StickyNote, X } from "lucide-react";
import { useState, type FC } from "react";

type TransferNoteBannerProps = {
  transferNote: NonNullable<WhatsappContactService["transferNote"]>;
};

/** Nota de quem transferiu, no topo da conversa, até quem recebeu agir ou fechar o aviso. */
export const TransferNoteBanner: FC<TransferNoteBannerProps> = ({ transferNote }) => {
  // Fechado vale só para esta nota: uma transferência nova mostra a nota nova
  const [dismissedAt, setDismissedAt] = useState<string | null>(null);
  if (dismissedAt === transferNote.createdAt) return null;

  return (
    <div
      role="note"
      className="flex flex-shrink-0 items-start gap-2 border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 sm:px-5 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold">
          Nota de {transferNote.fromName ?? "quem transferiu"} · {format(new Date(transferNote.createdAt), "dd/MM HH:mm")}
        </p>
        <p className="break-words whitespace-pre-wrap">{transferNote.note}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0"
        aria-label="Fechar nota"
        onClick={() => setDismissedAt(transferNote.createdAt)}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
