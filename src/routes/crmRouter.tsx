import { NotFound } from "@/components/not-found";
import { CrmBoard } from "@/pages/dashboard/crm/crmBoard";
import { Route, Routes } from "react-router";

const CrmRouter = () => {
  return (
    <Routes>
      <Route index element={<CrmBoard />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default CrmRouter;
