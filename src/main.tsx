import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "./providers";
import { Router } from "./routes/router";
import "@/style/globalStyle.css";
import { Toaster } from "./components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Toaster />
    <Providers>
      <Router />
    </Providers>
  </StrictMode>,
);
