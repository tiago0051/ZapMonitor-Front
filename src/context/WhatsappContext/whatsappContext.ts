import { createContext, useContext } from "react";

type WhatsappLayoutContextType = {
  contactSelected: WhatsappContactMessage | null;
  hasContactSelected: boolean;
  setContactSelected: (contact: WhatsappContactMessage | null) => void;
  playSound: () => void;
};

export const WhatsappContext = createContext({} as WhatsappLayoutContextType);

export const useWhatsappContext = () => useContext(WhatsappContext);
