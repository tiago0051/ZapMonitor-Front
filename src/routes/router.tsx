import type { FC } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { useUserContext } from "../context/UserContext/userContext";
import { LoginRouter } from "./loginRouter";
import { DashboardRouter } from "./dashboardRouter";

export const Router: FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="dashboard/*" element={<PrivateRouter />} />
        <Route path="*" element={<PublicRouter />} />
      </Routes>
    </BrowserRouter>
  );
};

const PublicRouter: FC = () => {
  return (
    <Routes>
      <Route path="auth/*" element={<LoginRouter />} />
    </Routes>
  );
};

const PrivateRouter: FC = () => {
  const { isAuthenticated } = useUserContext();

  if (!isAuthenticated) return <Navigate to="/auth/login" />;

  return (
    <Routes>
      <Route path="*" element={<DashboardRouter />} />
    </Routes>
  );
};
