import { EditClientLayout } from "@/pages/dashboard/configuration/layout";
import { Route, Routes } from "react-router";

const ConfigurationRouter = () => {
  return (
    <Routes>
      <Route index element={<EditClientLayout />} />
    </Routes>
  );
};

export default ConfigurationRouter;
