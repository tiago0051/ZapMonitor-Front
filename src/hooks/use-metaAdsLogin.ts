import { metaContants } from "@/contants/metaContants";
import { useCallback, useEffect, useState } from "react";
import { loadFacebookSdk } from "./use-metaEmbeddedSignup";

type UseMetaAdsLoginOptions = {
  onCode: (code: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

/** Login com a Meta para anúncios: devolve o código que o back troca pelo token. */
export const useMetaAdsLogin = ({ onCode, onCancel, onError }: UseMetaAdsLoginOptions) => {
  const [isSdkReady, setIsSdkReady] = useState<boolean>(!!window.FB);
  const isConfigured = !!metaContants.APP_ID && !!metaContants.ADS_LOGIN_CONFIG_ID;

  useEffect(() => {
    if (!isConfigured || window.FB) return;

    loadFacebookSdk()
      .then(() => setIsSdkReady(true))
      .catch((error: Error) => onError?.(error.message));
  }, [isConfigured]);

  const launch = useCallback(() => {
    if (!window.FB) {
      onError?.("SDK da Meta ainda não foi carregado");
      return;
    }

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;
        if (code) onCode(code);
        else onCancel?.();
      },
      { config_id: metaContants.ADS_LOGIN_CONFIG_ID, response_type: "code", override_default_response_type: true },
    );
  }, [onCode, onCancel, onError]);

  return { launch, isConfigured, isSdkReady };
};
