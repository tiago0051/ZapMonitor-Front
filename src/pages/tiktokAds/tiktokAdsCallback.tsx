import { TIKTOK_AUTH_MESSAGE } from "@/pages/dashboard/configuration/adsPlatforms/tiktokAuth";
import { useEffect, useState } from "react";

/** Volta da autorização do TikTok: entrega o auth_code à janela do painel que abriu o login e fecha. */
export const TikTokAdsCallback = () => {
  // Aberta fora do popup (link copiado, aba recarregada): não há para quem entregar o código
  const [isOrphan] = useState(() => !window.opener);

  useEffect(() => {
    if (!window.opener) return;
    const params = new URLSearchParams(window.location.search);
    const message = { type: TIKTOK_AUTH_MESSAGE, authCode: params.get("auth_code") ?? params.get("code"), state: params.get("state") };

    window.opener.postMessage(message, window.location.origin);
    window.close();
  }, []);

  return (
    <div className="flex h-screen items-center justify-center p-6 text-center text-sm">
      {isOrphan
        ? "Esta página fecha sozinha quando aberta pelo ZapMonitor. Volte ao painel e conecte o TikTok de novo."
        : "Conectando o TikTok…"}
    </div>
  );
};
