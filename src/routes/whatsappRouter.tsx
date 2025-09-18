import { WhatsappChat } from "@/pages/dashboard/whatsapp/chat/whatsappChat";
import { Route, Routes } from "react-router";

export const WhatsappRouter = () => {
  return (
    <Routes>
      <Route index element={<WhatsappChat />} />
    </Routes>
  );
};
