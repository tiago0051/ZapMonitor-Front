import { NotFound } from "@/components/not-found";
import { PermissionRoute } from "@/components/permission-route";
import { EmailPage } from "@/pages/dashboard/email/emailPage";
import { EmailTemplateEditor } from "@/pages/dashboard/email/templates/emailTemplateEditor";
import { Route, Routes } from "react-router";

const EmailRouter = () => {
  return (
    <Routes>
      <Route index element={<EmailPage />} />
      <Route
        path="templates/:templateId"
        element={
          <PermissionRoute permission="templates.manage">
            <EmailTemplateEditor />
          </PermissionRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default EmailRouter;
