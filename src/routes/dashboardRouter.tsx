import type { FC } from "react";
import { Route, Routes } from "react-router";
import { HomePage } from "../pages/dashboard/home/home";
import { DashboardLayout } from "@/pages/dashboard/layout";
import { ClientRouter } from "./clientRouter";
import { EmailRouter } from "./emailRouter";
import { WhatsappRouter } from "./whatsappRouter";

export const DashboardRouter: FC = () => {
  return (
    <Routes>
      <Route element={<DashboardLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/client/*" element={<ClientRouter />} />
        <Route path="/email/*" element={<EmailRouter />} />
        <Route path="/whatsapp/*" element={<WhatsappRouter />} />
      </Route>
    </Routes>
  );
};
