import { NotFound } from "@/components/not-found";
import { CrmPage } from "@/pages/dashboard/crm/crmPage";
import { Route, Routes } from "react-router";

const CrmRouter = () => {
  return (
    // O socket do painel (DashboardLayout) mantém o quadro atualizado quando outra pessoa mexe em um negócio
    <Routes>
      <Route index element={<CrmPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default CrmRouter;
