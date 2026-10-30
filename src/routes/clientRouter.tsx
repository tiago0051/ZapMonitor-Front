import { PermissionRoute } from "@/components/permission-route";
import { EditClientLayout } from "@/pages/dashboard/configuration/layout";
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
    </Routes>
  );
};

export default ConfigurationRouter;
