export const googleContants = {
  // Client OAuth "Web" do Google Cloud; o mesmo client id fica no back com o secret
  OAUTH_CLIENT_ID: import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID,
  // Eventos da agenda (marcar, remarcar, desmarcar e ver o que está ocupado) e a lista de agendas da conta
  CALENDAR_SCOPES: [
    "openid",
    "email",
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  ].join(" "),
};
