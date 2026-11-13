import { NotFound } from "@/components/not-found";
import { StudioPage, StudioProjectPage } from "@/pages/dashboard/studio/studioPage";
import { Route, Routes } from "react-router";

const StudioRouter = () => {
  return (
    <Routes>
      <Route index element={<StudioPage />} />
      <Route path=":projectId" element={<StudioProjectPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default StudioRouter;
