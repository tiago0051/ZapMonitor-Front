import { WhatsappContacts } from "@/pages/dashboard/whatsapp/contact";
import { WhatsappLayout } from "@/pages/dashboard/whatsapp/whatsappLayout";
import { Route, Routes } from "react-router";

const WhatsappRouter = () => {
  return (
    <Routes>
      <Route element={<WhatsappLayout />}>
        <Route index element={<WhatsappContacts />} />
      </Route>
    </Routes>
  );
};

export default WhatsappRouter;
