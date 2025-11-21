import { createContext, useContext } from "react";

type WhatsappLayoutContextType = {
  eventsToExecute: WhatsappEvent[];
  changeEventExecutedStatus: (event: WhatsappEvent) => void;
};

export const WhatsappEventsContext = createContext({} as WhatsappLayoutContextType);

export const useWhatsappEventsContext = () => useContext(WhatsappEventsContext);
