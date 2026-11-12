import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { Sparkles } from "lucide-react";
import { useState, type FC } from "react";
import { Link, useLocation } from "react-router";
import { AssistantChat } from "./components/assistantChat";

type AssistantPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Assistente num painel lateral, aberto de qualquer tela; manda junto a tela aberta para dar contexto. */
export const AssistantPanel: FC<AssistantPanelProps> = ({ open, onOpenChange }) => {
  const baseUrl = useBaseUrl();
  const { pathname } = useLocation();
  // undefined abre a conversa mais recente; fica guardada enquanto o painel fecha e abre
  const [conversationId, setConversationId] = useState<string | null | undefined>(undefined);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="h-dvh w-full gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="flex-row items-center gap-2 border-b py-3 pr-12">
          <Sparkles className="text-primary h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <SheetTitle>Assistente</SheetTitle>
            <SheetDescription className="truncate text-xs">Nada muda sem a sua aprovação.</SheetDescription>
          </div>
          <Button size="sm" variant="ghost" asChild>
            <Link to={`${baseUrl}/assistant${conversationId ? `?conversa=${conversationId}` : ""}`} onClick={() => onOpenChange(false)}>
              Abrir tela
            </Link>
          </Button>
        </SheetHeader>
        <div className="min-h-0 flex-1 p-2 sm:p-3">
          <AssistantChat variant="panel" conversationId={conversationId} onConversationChange={setConversationId} page={pathname} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

/** Botão do assistente preso na borda direita da tela (computador). */
export const AssistantEdgeButton: FC<{ onClick: () => void }> = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label="Abrir o assistente"
    className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring fixed top-1/2 right-0 z-40 hidden -translate-y-1/2 items-center gap-1.5 rounded-l-md px-1.5 py-3 text-xs font-medium shadow-md outline-none focus-visible:ring-2 md:flex md:flex-col"
  >
    <Sparkles className="h-4 w-4" />
    <span className="[writing-mode:vertical-rl]">Assistente</span>
  </button>
);
