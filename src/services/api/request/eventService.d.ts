//#region Find Last  Event
type FindLastEventData = {
  params: FindLastEventParams;
};

type FindLastEventParams = {
  clientId: string;
};
//#endregion

//#region Find After  Events
type FindAfterEventsData = {
  params: FindAfterEventsParams;
};

type FindAfterEventsParams = {
  clientId: string;
  eventId: string;
};
//#endregion
