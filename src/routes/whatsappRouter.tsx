import { NotFound } from "@/components/not-found";
import { Whatsapp } from "@/pages/dashboard/whatsapp";
import { WhatsappLayout } from "@/pages/dashboard/whatsapp/whatsappLayout";
import { Route, Routes } from "react-router";

const WhatsappRouter = () => {
  return (
    <Routes>
      <Route element={<WhatsappLayout />}>
        <Route index element={<Whatsapp />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};

export default WhatsappRouter;
