import { createContext, useContext } from "react";

type WhatsappLayoutContextType = {
  contactSelected: WhatsappContactMessage | null;
  hasContactSelected: boolean;
  setContactSelected: (contact: WhatsappContactMessage | null) => void;
  usersInContacts: Record<string, User[]>;
  playSound: () => void;
  allContacts: WhatsappContactMessage[];
  inServiceContacts: WhatsappContactMessage[];
};

export const WhatsappContext = createContext({} as WhatsappLayoutContextType);

export const useWhatsappContext = () => useContext(WhatsappContext);
