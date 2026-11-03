import { NotFound } from "@/components/not-found";
import { PanelLayout } from "@/components/panel-layout";
import { Implanter } from "@/pages/implanter/implanter";
import type { FC } from "react";
import { Route, Routes } from "react-router";

export const ImplanterRouter: FC = () => {
  return (
    <Routes>
      <Route element={<PanelLayout />}>
        <Route index element={<Implanter />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
};
