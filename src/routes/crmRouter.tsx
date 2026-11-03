import { NotFound } from "@/components/not-found";
import { SocketProvider } from "@/context/SocketContext/socketProvider";
import { CrmPage } from "@/pages/dashboard/crm/crmPage";
import { Route, Routes } from "react-router";

const CrmRouter = () => {
  return (
    // O socket mantém o quadro atualizado quando outra pessoa mexe em um negócio
    <SocketProvider>
      <Routes>
        <Route index element={<CrmPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </SocketProvider>
  );
};

export default CrmRouter;
