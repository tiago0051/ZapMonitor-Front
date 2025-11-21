import { useLocalStorage } from "usehooks-ts";
import { useClientContext } from "../ClientContext/clientContext";
import { useEffect } from "react";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import { WhatsappEventsContext } from "./WhatsappEventsContext";
import { Outlet } from "react-router";

export const WhatsappEventsProvider = () => {
  const { client } = useClientContext();

  const [events, setEvents] = useLocalStorage<WhatsappEventToExecute[]>("whatsappEvents", []);
  const lastEvent = events[0];

  function changeEventExecutedStatus(event: WhatsappEventToExecute) {
    setEvents((prev) => {
      const array = [...prev];
      const eventIndex = prev.findIndex((item) => item.id === event.id);

      array[eventIndex].executed = true;

      return array;
    });
  }

  useEffect(() => {
    const loadAsync = async () => {
      if (lastEvent) {
        const data = await whatsappService.findAfterWhatsappEvent({
          params: {
            clientId: client.id,
            whatsappEventId: lastEvent.id,
          },
        });

        setEvents((prev) => [...data, ...prev]);
      } else {
        const lastEvent = await whatsappService.findLastWhatsappEvent({
          params: {
            clientId: client.id,
          },
        });

        setEvents(() => [lastEvent]);
      }
    };

    loadAsync();
  }, []);

  useEffect(() => {
    socket.on("contacts:update", (data: WhatsappEvent) => {
      setEvents((prev) => [data, ...prev]);
    });

    return () => {
      socket.off("contacts:update");
    };
  }, []);

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
