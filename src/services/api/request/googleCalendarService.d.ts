type GoogleCalendarClientRequestData = {
  params: { clientId: string };
};

type ConnectGoogleCalendarRequestData = {
  params: { clientId: string };
  body: { code: string };
};

type AiAgentToolRequestParams = {
  clientId: string;
  aiAgentId: string;
};

type FindGoogleCalendarToolRequestData = {
  params: AiAgentToolRequestParams;
};

type SaveGoogleCalendarToolRequestData = {
  params: AiAgentToolRequestParams;
  body: GoogleCalendarToolRules & { enabled: boolean };
};
