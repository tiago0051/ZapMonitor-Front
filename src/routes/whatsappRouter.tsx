import { WhatsappChat } from "@/pages/dashboard/whatsapp/chat/whatsappChat";
import { WhatsappKanban } from "@/pages/dashboard/whatsapp/kanban/whatsappKanban";
import { Route, Routes } from "react-router";

export const WhatsappRouter = () => {
  return (
    <Routes>
      <Route index element={<WhatsappChat />} />
      <Route path="kanban" element={<WhatsappKanban />} />
    </Routes>
  );
};
