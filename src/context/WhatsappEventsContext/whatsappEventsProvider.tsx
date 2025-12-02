import { useLocalStorage } from "usehooks-ts";
import { useClientContext } from "../ClientContext/clientContext";
import { useEffect } from "react";
import { whatsappService } from "@/services/api/whatsappService";
import { socket } from "@/services/socket/socket";
import { Outlet } from "react-router";
import { WhatsappEventsContext } from "./whatsappEventsContext";

export const WhatsappEventsProvider = () => {
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

  const loadAsync = async () => {
    if (lastEvent) {
      const data = await whatsappService.findAfterWhatsappEvent({
        params: {
          clientId: client.id,
          whatsappEventId: lastEvent.id,
        },
      });

      setEvents((prev) => {
        const dataToAdd = data.filter((newEvent) => !prev.some((existingEvent) => existingEvent.id === newEvent.id));

        if (dataToAdd.length === 0) return prev;

        return [...prev, ...dataToAdd];
      });
    } else {
      const lastEvent = await whatsappService.findLastWhatsappEvent({
        params: {
          clientId: client.id,
        },
      });

      setEvents(() => [lastEvent]);
    }
  };

  useEffect(() => {
    loadAsync();
  }, []);

  useEffect(() => {
    window.addEventListener("focus", loadAsync);

    return () => {
      window.removeEventListener("focus", loadAsync);
    };
  }, [events]);

  useEffect(() => {
    socket.on("contacts:update", (data: WhatsappEvent) => {
      setEvents((prev) => [...prev, data]);
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
      {socket.disconnected && <div>Desconectado, favor atualizar a tela</div>}
      <Outlet />
    </WhatsappEventsContext.Provider>
  );
};
