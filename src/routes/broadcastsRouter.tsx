import { NotFound } from "@/components/not-found";
import { PermissionRoute } from "@/components/permission-route";
import { BroadcastDetail } from "@/pages/dashboard/broadcasts/broadcastDetail";
import { BroadcastNew } from "@/pages/dashboard/broadcasts/broadcastNew";
import { Broadcasts } from "@/pages/dashboard/broadcasts/broadcasts";
import { EmailCampaignDetail } from "@/pages/dashboard/broadcasts/email/emailCampaignDetail";
import { EmailCampaignNew } from "@/pages/dashboard/broadcasts/email/emailCampaignNew";
import { EmailSequenceEditor } from "@/pages/dashboard/broadcasts/sequences/emailSequenceEditor";
import { StrategyIntentFrame } from "@/pages/dashboard/strategies/strategyIntentBanner";
import { Route, Routes } from "react-router";

const BroadcastsRouter = () => {
  return (
    <Routes>
      <Route index element={<Broadcasts />} />
      <Route
        path="new"
        element={
          <PermissionRoute permission="broadcasts.send">
            <StrategyIntentFrame kinds={["BROADCAST"]}>
              <BroadcastNew />
            </StrategyIntentFrame>
          </PermissionRoute>
        }
      />
      <Route
        path="email/new"
        element={
          <PermissionRoute permission="broadcasts.send">
            <StrategyIntentFrame kinds={["EMAIL_CAMPAIGN"]}>
              <EmailCampaignNew />
            </StrategyIntentFrame>
          </PermissionRoute>
        }
      />
      <Route path="email/:campaignId" element={<EmailCampaignDetail />} />
      <Route
        path="sequences/new"
        element={
          <PermissionRoute permission="broadcasts.send">
            <StrategyIntentFrame kinds={["EMAIL_SEQUENCE"]}>
              <EmailSequenceEditor />
            </StrategyIntentFrame>
          </PermissionRoute>
        }
      />
      <Route path="sequences/:sequenceId" element={<EmailSequenceEditor />} />
      <Route path=":broadcastId" element={<BroadcastDetail />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default BroadcastsRouter;
