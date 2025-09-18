import { ClientList } from "@/pages/dashboard/client/clientList/clientList";
import { EditClientLayout } from "@/pages/dashboard/client/clientList/edit/layout";
import { Route, Routes } from "react-router";

export const ClientRouter = () => {
  return (
    <Routes>
      <Route index element={<ClientList />} />
      <Route path=":clientId" element={<EditClientLayout />} />
    </Routes>
  );
};
