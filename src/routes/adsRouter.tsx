import { NotFound } from "@/components/not-found";
import { AdsPage } from "@/pages/dashboard/ads/adsPage";
import { Route, Routes } from "react-router";

const AdsRouter = () => {
  return (
    <Routes>
      <Route index element={<AdsPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AdsRouter;
