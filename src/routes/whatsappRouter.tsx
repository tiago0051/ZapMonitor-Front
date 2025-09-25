import { WhatsappChat } from "@/pages/dashboard/whatsapp/chat/whatsappChat";
import { WhatsappKanban } from "@/pages/dashboard/whatsapp/kanban/whatsappKanban";
import { WhatsappLayout } from "@/pages/dashboard/whatsapp/whatsappLayout";
import { Route, Routes } from "react-router";

export const WhatsappRouter = () => {
  return (
    <Routes>
      <Route element={<WhatsappLayout />}>
        <Route index element={<WhatsappChat />} />
        <Route path="kanban" element={<WhatsappKanban />} />
      </Route>
    </Routes>
  );
};
