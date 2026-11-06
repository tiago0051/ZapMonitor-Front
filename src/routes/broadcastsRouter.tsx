import { NotFound } from "@/components/not-found";
import { PermissionRoute } from "@/components/permission-route";
import { BroadcastDetail } from "@/pages/dashboard/broadcasts/broadcastDetail";
import { BroadcastNew } from "@/pages/dashboard/broadcasts/broadcastNew";
import { Broadcasts } from "@/pages/dashboard/broadcasts/broadcasts";
import { Route, Routes } from "react-router";

const BroadcastsRouter = () => {
  return (
    <Routes>
      <Route index element={<Broadcasts />} />
      <Route
        path="new"
        element={
          <PermissionRoute permission="broadcasts.send">
            <BroadcastNew />
          </PermissionRoute>
        }
      />
      <Route path=":broadcastId" element={<BroadcastDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default BroadcastsRouter;
