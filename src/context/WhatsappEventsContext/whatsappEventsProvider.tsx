import { useLocalStorage } from "usehooks-ts";
import { useClientContext } from "../ClientContext/clientContext";
import { useCallback, useEffect } from "react";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import { Outlet } from "react-router";
import { WhatsappEventsContext } from "./whatsappEventsContext";
import { useSocketContext } from "../SocketContext/socketContext";

export const WhatsappEventsProvider = () => {
  const { isConnected } = useSocketContext();
  const { client } = useClientContext();

  const [events, setEvents] = useLocalStorage<WhatsappEventToExecute[]>("whatsappEvents", []);
  const lastEvent = events[events.length - 1];

  function changeEventExecutedStatus(event: WhatsappEventToExecute) {
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
      const data = await whatsappService.findAfterWhatsappEvent({
        params: {
          clientId: client.id,
          whatsappEventId: lastEvent.id,
        },
      });

      const dataToAdd = data.filter((newEvent) => !events.some((existingEvent) => existingEvent.id === newEvent.id));
      if (dataToAdd.length > 0) {
        setEvents((prev) => [...prev, ...dataToAdd]);
      }
    } else {
      const lastEvent = await whatsappService.findLastWhatsappEvent({
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
      socket.on("contacts:update", (data: WhatsappEvent) => {
        setEvents((prev) => [...prev, data]);
      });
    }

    return () => {
      socket.off("contacts:update");
    };
  }, [isConnected]);

  return (
    <WhatsappEventsContext.Provider
      value={{
        changeEventExecutedStatus,
        eventsToExecute: events.filter((item) => !item.executed),
      }}
    >
      <Outlet />
    </WhatsappEventsContext.Provider>
  );
};
