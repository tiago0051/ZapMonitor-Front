import { Members } from "@/pages/dashboard/members/members";
import { Route, Routes } from "react-router";

const MembersRouter = () => {
  return (
    <Routes>
      <Route index element={<Members />} />
    </Routes>
  );
};

export default MembersRouter;
