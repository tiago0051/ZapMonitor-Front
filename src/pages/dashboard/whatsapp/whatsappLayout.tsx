import { WhatsappProvider } from "@/context/WhatsappContext/whatsappProvider";
import { Outlet } from "react-router";

export const WhatsappLayout = () => (
  <WhatsappProvider>
    <Outlet />
  </WhatsappProvider>
);
