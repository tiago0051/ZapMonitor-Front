import type { FC } from "react";
import { Route, Routes } from "react-router";
import { Login } from "../pages/auth/login/login";
import { LoginLayout } from "@/pages/auth/layout";
import { ClientList } from "@/pages/auth/clientList/clientList";
import { Logout } from "@/pages/auth/logout";
import { Register } from "@/pages/auth/register/register";
import { VerifyEmail } from "@/pages/auth/verifyEmail/verifyEmail";
import { ForgotPassword } from "@/pages/auth/forgotPassword/forgotPassword";
import { ResetPassword } from "@/pages/auth/resetPassword/resetPassword";

export const LoginRouter: FC = () => {
  return (
    <Routes>
      <Route path="*" element={<LoginLayout />}>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="verify-email" element={<VerifyEmail />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="logout" element={<Logout />} />
        <Route path="select_client" element={<ClientList />} />
      </Route>
    </Routes>
  );
};
