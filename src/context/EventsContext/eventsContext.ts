import { createContext, useContext } from "react";

type EventsLayoutContextType = {
  eventsToExecute: TEvent[];
  changeEventExecutedStatus: (event: TEvent) => void;
};

export const EventsContext = createContext({} as EventsLayoutContextType);

export const useEventsContext = () => useContext(EventsContext);
