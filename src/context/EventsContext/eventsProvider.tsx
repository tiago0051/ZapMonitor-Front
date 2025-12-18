import { useLocalStorage } from "usehooks-ts";
import { useClientContext } from "../ClientContext/clientContext";
import { useCallback, useEffect } from "react";
import { socket } from "@/services/socket/socket";
import { Outlet } from "react-router";
import { useSocketContext } from "../SocketContext/socketContext";
import { EventsContext } from "./eventsContext";
import { eventsService } from "@/services/api/eventsService";

export const EventsProvider = () => {
  const { isConnected } = useSocketContext();
  const { client } = useClientContext();

  const [events, setEvents] = useLocalStorage<TEventToExecute[]>("events", []);
  const lastEvent = events[events.length - 1];

  function changeEventExecutedStatus(event: TEventToExecute) {
    setEvents((prev) => {
      const array = [...prev];
      const eventIndex = prev.findIndex((item) => item.id === event.id);

      array[eventIndex].executed = true;

      const itemsToReturn = array.filter((item, index) => !item.executed || index === array.length - 1);
      return itemsToReturn;
    });
  }

  const loadAsync = useCallback(async () => {
    if (lastEvent) {
      const data = await eventsService.findAfters({
        params: {
          clientId: client.id,
          eventId: lastEvent.id,
        },
      });

      const dataToAdd = data.filter((newEvent) => !events.some((existingEvent) => existingEvent.id === newEvent.id));
      if (dataToAdd.length > 0) {
        setEvents((prev) => [...prev, ...dataToAdd]);
      }
    } else {
      const lastEvent = await eventsService.findLast({
        params: {
          clientId: client.id,
        },
      });

      setEvents(() => [lastEvent]);
    }
  }, [client.id, lastEvent]);

  useEffect(() => {
    if (isConnected) loadAsync();
  }, [loadAsync, isConnected]);

  useEffect(() => {
    window.addEventListener("focus", loadAsync);

    return () => {
      window.removeEventListener("focus", loadAsync);
    };
  }, [loadAsync]);

  useEffect(() => {
    if (isConnected) {
      socket.on("contacts:update", (data: TEvent) => {
        setEvents((prev) => [...prev, data]);
      });
    }

    return () => {
      socket.off("contacts:update");
    };
  }, [isConnected]);

  return (
    <EventsContext.Provider
      value={{
        changeEventExecutedStatus,
        eventsToExecute: events.filter((item) => !item.executed),
      }}
    >
      <Outlet />
    </EventsContext.Provider>
  );
};
