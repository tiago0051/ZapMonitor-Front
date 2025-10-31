import { WhatsappContacts } from "@/pages/dashboard/whatsapp/contact/whatsappChat";
// import { WhatsappKanban } from "@/pages/dashboard/whatsapp/kanban/whatsappKanban";
import { WhatsappLayout } from "@/pages/dashboard/whatsapp/whatsappLayout";
import { Route, Routes } from "react-router";

const WhatsappRouter = () => {
  return (
    <Routes>
      <Route element={<WhatsappLayout />}>
        <Route index element={<WhatsappContacts />} />
        {/*<Route index element={<WhatsappKanban />} />*/}
      </Route>
    </Routes>
  );
};

export default WhatsappRouter;
