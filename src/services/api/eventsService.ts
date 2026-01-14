import api from "./api";

export const eventsService = {
  findLast: async ({ params }: FindLastEventData): Promise<TEvent> => {
    const response = await api.get(`/client/${params.clientId}/event/lastEvent`);

    return response.data;
  },
  findAfters: async ({ params }: FindAfterEventsData): Promise<TEvent[]> => {
    const response = await api.get(`/client/${params.clientId}/event/${params.eventId}/afterEvents`);

    return response.data;
  },
};
