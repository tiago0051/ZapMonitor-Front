import { NotFound } from "@/components/not-found";
import { type FC, lazy } from "react";
import { Link, Navigate, Route, Routes, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { QueryErrorBoundary } from "@/components/query-error-boundary";
import { HomePage } from "../pages/dashboard/home/home";
import { DashboardLayout } from "@/pages/dashboard/layout";
import { ClientProvider } from "@/context/ClientContext/clientProvider";
import { PermissionRoute } from "@/components/permission-route";
import { PlanExpiredScreen } from "@/components/plan/planExpiredScreen";
import { isPlanExpiredError } from "@/components/plan/planExpired";
import { AssistantPage } from "@/pages/dashboard/assistant/assistantPage";

const WhatsappRouter = lazy(() => import("./whatsappRouter"));
const ConfigurationRouter = lazy(() => import("./clientRouter"));
const EmailRouter = lazy(() => import("./emailRouter"));
const MembersRouter = lazy(() => import("./membersRouter"));
const ManagementRouter = lazy(() => import("./managementRouter"));
const CrmRouter = lazy(() => import("./crmRouter"));
const AdsRouter = lazy(() => import("./adsRouter"));
const BroadcastsRouter = lazy(() => import("./broadcastsRouter"));
const ContactsRouter = lazy(() => import("./contactsRouter"));

export const DashboardRouter: FC = () => {
  const { clientId } = useParams<{ clientId: string }>();

  if (!clientId) return <Navigate to={"/auth/login"} />;

  return (
    <Routes>
      <Route
        element={
          <QueryErrorBoundary
            message="Não foi possível abrir este cliente."
            renderError={(error) => (isPlanExpiredError(error) ? <PlanExpiredScreen /> : null)}
            action={
              <Button variant="link" asChild>
                <Link to="/auth/select_client">Ir para meus clientes</Link>
              </Button>
            }
          >
            <ClientProvider />
          </QueryErrorBoundary>
        }
      >
        <Route element={<DashboardLayout />}>
          <Route index element={<HomePage />} />
          <Route path="configuration/*" element={<ConfigurationRouter />} />
          {/* Todo membro conversa; o assistente age com as permissões de quem está logado */}
          <Route path="assistant" element={<AssistantPage />} />
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
            path="contacts/*"
            element={
              <PermissionRoute permission="contacts.view">
                <ContactsRouter />
              </PermissionRoute>
            }
          />
          <Route
            path="crm/*"
            element={
              <PermissionRoute permission="crm.view" requiresCrm>
                <CrmRouter />
              </PermissionRoute>
            }
          />
          <Route
            path="ads/*"
            element={
              <PermissionRoute permission="ads.view" requiresAds>
                <AdsRouter />
              </PermissionRoute>
            }
          />
          <Route
            path="broadcasts/*"
            element={
              <PermissionRoute permission="broadcasts.view">
                <BroadcastsRouter />
              </PermissionRoute>
            }
          />
          <Route
            path="management/*"
            element={
              <PermissionRoute permission="management.view">
                <ManagementRouter />
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
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};
