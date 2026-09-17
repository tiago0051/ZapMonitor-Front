import { SocketProvider } from "@/context/SocketContext/socketProvider";
import { Outlet } from "react-router";

export const WhatsappLayout = () => (
  <SocketProvider>
    <Outlet />
  </SocketProvider>
);
