import { NotFound } from "@/components/not-found";
import { Management } from "@/pages/dashboard/management/management";
import { Route, Routes } from "react-router";

const ManagementRouter = () => {
  return (
    <Routes>
      <Route index element={<Management />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ManagementRouter;
