import type { FC } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import { LoginRouter } from "./loginRouter";
import { DashboardRouter } from "./dashboardRouter";
import { ImplanterRouter } from "./implanterRouter";
import { OwnerRouter } from "./ownerRouter";
import { useUserContext } from "@/context/UserContext/userContext";
import { PrivacyPolicy } from "@/pages/legal/privacyPolicy";
import { TermsOfService } from "@/pages/legal/termsOfService";
import { TikTokAdsCallback } from "@/pages/tiktokAds/tiktokAdsCallback";
import { withReturnTo } from "@/utils/returnTo";
import { PublicMarketingReport } from "@/pages/report/publicMarketingReport";
import { PublicProposal } from "@/pages/proposal/publicProposal";
import { EmailUnsubscribe } from "@/pages/public/emailUnsubscribe";
import { AdLinkUnavailable } from "@/pages/public/adLinkUnavailable";

export const Router: FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas, com ou sem login: links da tela de consentimento do Google */}
        <Route path="privacidade" element={<PrivacyPolicy />} />
        <Route path="politica-de-privacidade" element={<Navigate to="/privacidade" replace />} />
        <Route path="termos" element={<TermsOfService />} />
        <Route path="termos-de-servico" element={<Navigate to="/termos" replace />} />
        {/* Volta do login do TikTok no popup; só repassa o código para a janela do painel */}
        <Route path="tiktok-ads/callback" element={<TikTokAdsCallback />} />
        {/* Relatório do mês compartilhado por link: público, somente leitura */}
        <Route path="relatorio/:token" element={<PublicMarketingReport />} />
        {/* Proposta comercial enviada ao cliente: pública, com aceite e recusa */}
        <Route path="proposta/:token" element={<PublicProposal />} />
        {/* Descadastro pelo link dos e-mails enviados */}
        <Route path="descadastro/:token" element={<EmailUnsubscribe />} />
        {/* Link rastreado de anúncio que não está mais ativo */}
        <Route path="link-indisponivel" element={<AdLinkUnavailable />} />
        <Route path="dashboard/*" element={<PrivateRouter />} />
        <Route path="*" element={<PublicRouter />} />
      </Routes>
    </BrowserRouter>
  );
};

const PublicRouter: FC = () => {
  return (
    <Routes>
      <Route path="auth/*" element={<LoginRouter />} />

      <Route path="*" element={<Navigate to="/auth/login" />} />
    </Routes>
  );
};

const PrivateRouter: FC = () => {
  const { isLogged } = useUserContext();
  const location = useLocation();
  // Sem sessão: guarda a tela pedida (ex.: conversa aberta pelo aviso) para voltar a ela depois do login
  const loginUrl = withReturnTo("/auth/login", `${location.pathname}${location.search}${location.hash}`);

  return (
    <Routes>
      {isLogged ? (
        <>
          <Route path="/client/:clientId/*" element={<DashboardRouter />} />
          <Route path="/implanter/*" element={<ImplanterRouter />} />
          <Route path="/owner/*" element={<OwnerRouter />} />
          <Route path="*" element={<Navigate to="/auth/select_client" />} />
        </>
      ) : (
        <Route path="*" element={<Navigate to={loginUrl} replace />} />
      )}
    </Routes>
  );
};
