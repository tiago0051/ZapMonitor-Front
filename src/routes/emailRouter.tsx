import { EmailList } from "@/pages/dashboard/email/emailList/emailList";
import { Route, Routes } from "react-router";

export const EmailRouter = () => {
  return (
    <Routes>
      <Route index element={<EmailList />} />
    </Routes>
  );
};
