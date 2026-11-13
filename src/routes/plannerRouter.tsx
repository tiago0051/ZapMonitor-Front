import { NotFound } from "@/components/not-found";
import { PlannerPage } from "@/pages/dashboard/planner/plannerPage";
import { Route, Routes } from "react-router";

const PlannerRouter = () => (
  <Routes>
    <Route index element={<PlannerPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default PlannerRouter;
