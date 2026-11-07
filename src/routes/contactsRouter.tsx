import { NotFound } from "@/components/not-found";
import { ContactDetailPage } from "@/pages/dashboard/contacts/contactDetail";
import { Contacts } from "@/pages/dashboard/contacts/contacts";
import { Route, Routes } from "react-router";

const ContactsRouter = () => {
  return (
    <Routes>
      <Route index element={<Contacts />} />
      <Route path=":contactId" element={<ContactDetailPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default ContactsRouter;
