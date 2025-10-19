import { WhatsappContacts } from "@/pages/dashboard/whatsapp/contact/whatsappChat";
import { WhatsappKanban } from "@/pages/dashboard/whatsapp/kanban/whatsappKanban";
import { WhatsappLayout } from "@/pages/dashboard/whatsapp/whatsappLayout";
import { Route, Routes } from "react-router";

export const WhatsappRouter = () => {
  return (
    <Routes>
      <Route element={<WhatsappLayout />}>
        <Route index element={<WhatsappKanban />} />
        <Route path="contacts" element={<WhatsappContacts />} />
      </Route>
    </Routes>
  );
};
