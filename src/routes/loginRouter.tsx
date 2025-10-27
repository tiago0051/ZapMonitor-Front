import type { FC } from "react";
import { Route, Routes } from "react-router";
import { Login } from "../pages/auth/login/login";
import { LoginLayout } from "@/pages/auth/layout";
import { ClientList } from "@/pages/auth/clientList/clientList";

export const LoginRouter: FC = () => {
  return (
    <Routes>
      <Route path="*" element={<LoginLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="select_client" element={<ClientList />} />
      </Route>
    </Routes>
  );
};
