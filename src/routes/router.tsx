import type { FC } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router";
import { LoginRouter } from "./loginRouter";
import { DashboardRouter } from "./dashboardRouter";
import { ImplanterRouter } from "./implanterRouter";
import { OwnerRouter } from "./ownerRouter";
import { useUserContext } from "@/context/UserContext/userContext";

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

      <Route path="*" element={<Navigate to="/auth/login" />} />
    </Routes>
  );
};

const PrivateRouter: FC = () => {
  const { isLogged } = useUserContext();

  return (
    <Routes>
      {isLogged ? (
        <>
          <Route path="/client/:clientId/*" element={<DashboardRouter />} />
          <Route path="/implanter/*" element={<ImplanterRouter />} />
          <Route path="/owner/*" element={<OwnerRouter />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to={"/auth/login"} />} />
      )}
    </Routes>
  );
};
