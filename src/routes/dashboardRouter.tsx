import { type FC, lazy } from "react";
import { Navigate, Route, Routes, useParams } from "react-router";
import { HomePage } from "../pages/dashboard/home/home";
import { DashboardLayout } from "@/pages/dashboard/layout";
import { ClientProvider } from "@/context/ClientContext/clientProvider";
import { PermissionRoute } from "@/components/permission-route";

const WhatsappRouter = lazy(() => import("./whatsappRouter"));
const ConfigurationRouter = lazy(() => import("./clientRouter"));
const EmailRouter = lazy(() => import("./emailRouter"));
const MembersRouter = lazy(() => import("./membersRouter"));

export const DashboardRouter: FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) return <Navigate to={"/auth/login"} />;

  return (
    <Routes>
      <Route element={<ClientProvider />}>
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="configuration/*" element={<ConfigurationRouter />} />
          <Route
            path="email/*"
            element={
              <PermissionRoute permission="email.view">
                <EmailRouter />
              </PermissionRoute>
            }
          />
          <Route
            path="whatsapp/*"
            element={
              <PermissionRoute permission="whatsapp.chat">
                <WhatsappRouter />
              </PermissionRoute>
            }
          />
          <Route
            path="members/*"
            element={
              <PermissionRoute permission="members.manage">
                <MembersRouter />
              </PermissionRoute>
            }
          />
        </Route>
      </Route>
    </Routes>
  );
};
