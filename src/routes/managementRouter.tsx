import { Management } from "@/pages/dashboard/management/management";
import { Route, Routes } from "react-router";

const ManagementRouter = () => {
  return (
    <Routes>
      <Route index element={<Management />} />
    </Routes>
  );
};

export default ManagementRouter;
