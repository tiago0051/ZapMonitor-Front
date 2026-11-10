import { NotFound } from "@/components/not-found";
import { PermissionRoute } from "@/components/permission-route";
import { EditClientLayout } from "@/pages/dashboard/configuration/layout";
import { WhatsappTemplateNew } from "@/pages/dashboard/configuration/whatsapp/whatsappTemplate/whatsappTemplateNew";
import { lazy } from "react";
import { Route, Routes } from "react-router";

// O editor traz a biblioteca do canvas; só carrega quando um fluxo é aberto
const FlowEditor = lazy(() =>
  import("@/pages/dashboard/configuration/flow/editor/flowEditor").then((module) => ({ default: module.FlowEditor })),
);

const ConfigurationRouter = () => {
  return (
    <Routes>
      <Route index element={<EditClientLayout />} />
      <Route
        path="flow/:flowId"
        element={
          <PermissionRoute permission="flows.manage">
            <FlowEditor />
          </PermissionRoute>
        }
      />
      <Route
        path="templates/new"
        element={
          <PermissionRoute permission="templates.manage">
            <WhatsappTemplateNew />
          </PermissionRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ConfigurationRouter;
