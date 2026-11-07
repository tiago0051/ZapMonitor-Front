import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCallback, useEffect, useMemo, useRef, useState, type FC, type ReactNode } from "react";
import { dealContactName } from "../crmUtils";
import { ChatDockContext, type ChatDockContextValue, type ChatDockWindow } from "./chatDockContext";
import { CHAT_WINDOW_MINIMIZED_WIDTH, CHAT_WINDOW_WIDTH, ChatWindow } from "./chatWindow";

const DOCK_GAP = 8;
const OVERFLOW_BUTTON_WIDTH = 48;

/** Quantas janelas, da mais recente para a mais antiga, cabem lado a lado na largura do rodapé. */
const countFittingWindows = (windows: ChatDockWindow[], availableWidth: number) => {
  const widthOf = (dockWindow: ChatDockWindow) => (dockWindow.minimized ? CHAT_WINDOW_MINIMIZED_WIDTH : CHAT_WINDOW_WIDTH) + DOCK_GAP;
  const totalWidth = windows.reduce((total, dockWindow) => total + widthOf(dockWindow), 0);
  // Quando nem todas cabem, o botão "+N" também ocupa espaço
  const limit = totalWidth <= availableWidth ? availableWidth : availableWidth - OVERFLOW_BUTTON_WIDTH;

  let used = 0;
  let count = 0;
  for (const dockWindow of windows) {
    used += widthOf(dockWindow);
    if (used > limit) break;
    count++;
  }

  // A conversa recém-aberta sempre aparece, mesmo numa tela estreita
  return Math.max(count, Math.min(1, windows.length));
};

/**
 * Janelas de conversa do WhatsApp no rodapé do CRM, como no Messenger. Só no computador; no celular os atalhos levam
 * para a tela de atendimento.
 */
export const ChatDockProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const isMobile = useIsMobile();
  const [windows, setWindows] = useState<ChatDockWindow[]>([]);
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockWidth, setDockWidth] = useState(0);

  useEffect(() => {
    const element = dockRef.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => setDockWidth(entry.contentRect.width));
    observer.observe(element);

    return () => observer.disconnect();
  }, [isMobile]);

  const openChat = useCallback((contact: DealContact) => {
    setWindows((current) => [{ contact, minimized: false }, ...current.filter((dockWindow) => dockWindow.contact.id !== contact.id)]);
  }, []);

  const closeChat = useCallback((contactId: string) => {
    setWindows((current) => current.filter((dockWindow) => dockWindow.contact.id !== contactId));
  }, []);

  const toggleMinimized = useCallback((contactId: string) => {
    setWindows((current) =>
      current.map((dockWindow) => (dockWindow.contact.id === contactId ? { ...dockWindow, minimized: !dockWindow.minimized } : dockWindow)),
    );
  }, []);

  const value = useMemo<ChatDockContextValue>(
    () => ({ windows, openChat, closeChat, toggleMinimized }),
    [windows, openChat, closeChat, toggleMinimized],
  );

  if (isMobile) return <>{children}</>;

  const visibleCount = countFittingWindows(windows, dockWidth);
  const visibleWindows = windows.slice(0, visibleCount);
  const hiddenWindows = windows.slice(visibleCount);

  return (
    <ChatDockContext.Provider value={value}>
      <div className="relative flex h-full flex-col overflow-hidden">
        {children}

        <div
          ref={dockRef}
          className="pointer-events-none absolute inset-x-4 bottom-0 z-40 flex flex-row-reverse items-end"
          style={{ gap: DOCK_GAP }}
        >
          {visibleWindows.map((dockWindow) => (
            <ChatWindow
              key={dockWindow.contact.id}
              contact={dockWindow.contact}
              minimized={dockWindow.minimized}
              onToggleMinimized={() => toggleMinimized(dockWindow.contact.id)}
              onClose={() => closeChat(dockWindow.contact.id)}
            />
          ))}

          {hiddenWindows.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="pointer-events-auto mb-2 h-10 w-10 shrink-0 rounded-full shadow-lg"
                  aria-label={`Mais ${hiddenWindows.length} conversas`}
                >
                  +{hiddenWindows.length}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" side="top">
                {hiddenWindows.map((dockWindow) => (
                  <DropdownMenuItem key={dockWindow.contact.id} onClick={() => openChat(dockWindow.contact)}>
                    {dealContactName(dockWindow.contact)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </ChatDockContext.Provider>
  );
};
