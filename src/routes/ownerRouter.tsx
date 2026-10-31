import { PanelLayout } from "@/components/panel-layout";
import { Owner } from "@/pages/owner/owner";
import type { FC } from "react";
import { Route, Routes } from "react-router";

export const OwnerRouter: FC = () => {
  return (
    <Routes>
      <Route element={<PanelLayout />}>
        <Route index element={<Owner />} />
      </Route>
    </Routes>
  );
};
