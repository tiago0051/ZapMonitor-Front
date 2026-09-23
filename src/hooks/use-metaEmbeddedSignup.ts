import { metaContants } from "@/contants/metaContants";
import type { FacebookSdk } from "@/types/facebook/facebookSdk";
import { useCallback, useEffect, useRef, useState } from "react";

const FACEBOOK_SDK_URL = "https://connect.facebook.net/en_US/sdk.js";
const FACEBOOK_SDK_SCRIPT_ID = "facebook-jssdk";
const FACEBOOK_ORIGINS = ["https://www.facebook.com", "https://web.facebook.com"];

export type EmbeddedSignupSessionInfo = {
  phoneNumberId: string;
  wabaId: string;
  businessId?: string;
};

export type EmbeddedSignupResult = EmbeddedSignupSessionInfo & {
  code: string;
};

type UseMetaEmbeddedSignupOptions = {
  onSuccess: (result: EmbeddedSignupResult) => void;
  onCancel?: (currentStep?: string) => void;
  onError?: (message: string) => void;
};

let sdkPromise: Promise<FacebookSdk> | null = null;

function loadFacebookSdk(): Promise<FacebookSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  if (sdkPromise) return sdkPromise;

  sdkPromise = new Promise<FacebookSdk>((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({
        appId: metaContants.APP_ID,
        autoLogAppEvents: true,
        xfbml: true,
        version: metaContants.GRAPH_API_VERSION,
      });
      resolve(window.FB!);
    };

    if (document.getElementById(FACEBOOK_SDK_SCRIPT_ID)) return;

    const script = document.createElement("script");
    script.id = FACEBOOK_SDK_SCRIPT_ID;
    script.src = FACEBOOK_SDK_URL;
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.onerror = () => {
      sdkPromise = null;
      script.remove();
      reject(new Error("Não foi possível carregar o SDK da Meta"));
    };
    document.body.appendChild(script);
  });

  return sdkPromise;
}

export const useMetaEmbeddedSignup = ({ onSuccess, onCancel, onError }: UseMetaEmbeddedSignupOptions) => {
  const [isSdkReady, setIsSdkReady] = useState<boolean>(!!window.FB);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);

  const sessionInfoRef = useRef<EmbeddedSignupSessionInfo | null>(null);
  const codeRef = useRef<string | null>(null);
  const isActiveRef = useRef<boolean>(false);

  const callbacksRef = useRef({ onSuccess, onCancel, onError });
  useEffect(() => {
    callbacksRef.current = { onSuccess, onCancel, onError };
  });

  const isConfigured = !!metaContants.APP_ID && !!metaContants.EMBEDDED_SIGNUP_CONFIG_ID;

  const finish = useCallback(() => {
    isActiveRef.current = false;
    codeRef.current = null;
    sessionInfoRef.current = null;
    setIsSigningUp(false);
  }, []);

  // O código de autorização (FB.login) e os dados da sessão (postMessage) chegam
  // separadamente e em ordem indefinida, então só concluímos quando ambos existirem.
  const tryComplete = useCallback(() => {
    if (!isActiveRef.current || !codeRef.current || !sessionInfoRef.current) return;

    const result: EmbeddedSignupResult = {
      code: codeRef.current,
      ...sessionInfoRef.current,
    };

    finish();
    callbacksRef.current.onSuccess(result);
  }, [finish]);

  useEffect(() => {
    if (!isConfigured) return;

    loadFacebookSdk()
      .then(() => setIsSdkReady(true))
      .catch((error: Error) => callbacksRef.current.onError?.(error.message));
  }, [isConfigured]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!FACEBOOK_ORIGINS.includes(event.origin)) return;

      let data: {
        type?: string;
        event?: string;
        data?: {
          phone_number_id?: string;
          waba_id?: string;
          business_id?: string;
          current_step?: string;
          error_message?: string;
        };
      };

      try {
        data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      } catch {
        return;
      }

      if (data?.type !== "WA_EMBEDDED_SIGNUP" || !isActiveRef.current) return;

      if (data.event === "FINISH" || data.event === "FINISH_ONLY_WABA") {
        if (!data.data?.phone_number_id || !data.data?.waba_id) {
          finish();
          callbacksRef.current.onError?.("Nenhum número de telefone foi selecionado no cadastro");
          return;
        }

        sessionInfoRef.current = {
          phoneNumberId: data.data.phone_number_id,
          wabaId: data.data.waba_id,
          businessId: data.data.business_id,
        };
        tryComplete();
      } else if (data.event === "CANCEL") {
        finish();
        callbacksRef.current.onCancel?.(data.data?.current_step);
      } else if (data.event === "ERROR") {
        finish();
        callbacksRef.current.onError?.(data.data?.error_message || "Erro no cadastro da Meta");
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [finish, tryComplete]);

  const launch = useCallback(() => {
    if (!window.FB) {
      callbacksRef.current.onError?.("SDK da Meta ainda não foi carregado");
      return;
    }

    codeRef.current = null;
    sessionInfoRef.current = null;
    isActiveRef.current = true;
    setIsSigningUp(true);

    window.FB.login(
      (response) => {
        const code = response.authResponse?.code;

        if (!isActiveRef.current) return;

        if (!code) {
          finish();
          callbacksRef.current.onCancel?.();
          return;
        }

        codeRef.current = code;
        tryComplete();
      },
      {
        config_id: metaContants.EMBEDDED_SIGNUP_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: "",
          sessionInfoVersion: "3",
        },
      },
    );
  }, [finish, tryComplete]);

  return { launch, isConfigured, isSdkReady, isSigningUp };
};
