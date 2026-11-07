import { createContext, useContext } from "react";

export type ChatDockWindow = {
  contact: DealContact;
  minimized: boolean;
};

export type ChatDockContextValue = {
  // A mais recente primeiro; ela fica mais à direita no rodapé
  windows: ChatDockWindow[];
  openChat: (contact: DealContact) => void;
  closeChat: (contactId: string) => void;
  toggleMinimized: (contactId: string) => void;
};

export const ChatDockContext = createContext<ChatDockContextValue | null>(null);

/** Janelas de conversa do CRM; nulo fora do CRM ou no celular, onde a conversa abre na tela de atendimento. */
export const useChatDock = () => useContext(ChatDockContext);
