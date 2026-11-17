import { NotFound } from "@/components/not-found";
import { Whatsapp } from "@/pages/dashboard/whatsapp";
import { Route, Routes } from "react-router";

// Socket e ligações ficam no layout do painel (DashboardLayout): sair do atendimento não derruba a ligação
const WhatsappRouter = () => {
  return (
    <Routes>
      <Route index element={<Whatsapp />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default WhatsappRouter;
