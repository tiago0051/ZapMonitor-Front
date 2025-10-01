import type { FC } from "react";
import { Navigate, Route, Routes, useParams } from "react-router";
import { HomePage } from "../pages/dashboard/home/home";
import { DashboardLayout } from "@/pages/dashboard/layout";
import { EmailRouter } from "./emailRouter";
import { WhatsappRouter } from "./whatsappRouter";
import { ClientProvider } from "@/context/ClientContext/clientProvider";
import { ConfigurationRouter } from "./clientRouter";

export const DashboardRouter: FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) return <Navigate to={"/auth/login"} />;

  return (
    <Routes>
      <Route element={<ClientProvider />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="configuration/*" element={<ConfigurationRouter />} />
          <Route path="email/*" element={<EmailRouter />} />
          <Route path="whatsapp/*" element={<WhatsappRouter />} />
        </Route>
      </Route>
    </Routes>
  );
};
