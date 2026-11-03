import { NotFound } from "@/components/not-found";
import { Members } from "@/pages/dashboard/members/members";
import { Route, Routes } from "react-router";

const MembersRouter = () => {
  return (
    <Routes>
      <Route index element={<Members />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default MembersRouter;
