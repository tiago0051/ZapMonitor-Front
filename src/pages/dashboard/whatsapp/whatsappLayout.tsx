import { SocketProvider } from "@/context/SocketContext/socketProvider";
import { Outlet } from "react-router";
import { CallProvider } from "./calls/callProvider";

export const WhatsappLayout = () => (
  <SocketProvider>
    {/* Ligações ficam acima das páginas do atendimento: trocar de conversa não derruba a ligação */}
    <CallProvider>
      <Outlet />
    </CallProvider>
  </SocketProvider>
);
