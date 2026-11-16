import { NotFound } from "@/components/not-found";
import { StrategiesPage } from "@/pages/dashboard/strategies/strategiesPage";
import { StrategyDetailPage } from "@/pages/dashboard/strategies/strategyDetailPage";
import { Route, Routes } from "react-router";

const StrategiesRouter = () => (
  <Routes>
    <Route index element={<StrategiesPage />} />
    <Route path=":strategyId" element={<StrategyDetailPage />} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

export default StrategiesRouter;
