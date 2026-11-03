import { NotFound } from "@/components/not-found";
import { EmailList } from "@/pages/dashboard/email/emailList/emailList";
import { Route, Routes } from "react-router";

const EmailRouter = () => {
  return (
    <Routes>
      <Route index element={<EmailList />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default EmailRouter;
