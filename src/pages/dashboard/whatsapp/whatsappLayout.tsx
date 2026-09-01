import { SocketProvider } from "@/context/SocketContext/socketProvider";
// import { WhatsappProvider } from "@/context/WhatsappContext/whatsappProvider";
import { Outlet } from "react-router";

export const WhatsappLayout = () => (
  <SocketProvider>
    {/* <WhatsappProvider> */}
      <Outlet />
    {/* </WhatsappProvider> */}
  </SocketProvider>
);
