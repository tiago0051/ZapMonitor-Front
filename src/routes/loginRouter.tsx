import type { FC } from "react";
import { Route, Routes } from "react-router";
import { Login } from "../pages/auth/login/login";

export const LoginRouter: FC = () => {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
    </Routes>
  );
};
