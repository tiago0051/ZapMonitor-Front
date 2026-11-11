import { googleContants } from "@/contants/googleContants";
import { useCallback, useEffect, useState } from "react";

type GoogleCodeResponse = { code?: string; error?: string; error_description?: string };
type GoogleCodeClient = { requestCode: () => void };
type GoogleAccounts = {
  oauth2: {
    initCodeClient: (config: {
      client_id: string;
      scope: string;
      ux_mode: "popup";
      prompt?: string;
      include_granted_scopes?: boolean;
      callback: (response: GoogleCodeResponse) => void;
      error_callback?: (error: { type: string; message?: string }) => void;
    }) => GoogleCodeClient;
  };
};

const getGoogleAccounts = () => (window as unknown as { google?: { accounts?: GoogleAccounts } }).google?.accounts;

let scriptPromise: Promise<void> | null = null;

/** Carrega o Google Identity Services uma vez só. */
function loadGoogleIdentityServices(): Promise<void> {
  if (getGoogleAccounts()?.oauth2) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Não foi possível carregar o login do Google"));
    };
    document.head.appendChild(script);
  });

  return scriptPromise;
}

type UseGoogleCalendarLoginOptions = {
  // Permissões pedidas; o padrão é a agenda
  scope?: string;
  // Texto do erro quando o Google não autoriza
  deniedMessage?: string;
  onCode: (code: string) => void;
  onCancel?: () => void;
  onError?: (message: string) => void;
};

/** Login com o Google para a agenda: o popup devolve o código que o back troca pelo acesso contínuo. */
export const useGoogleCalendarLogin = ({
  scope = googleContants.CALENDAR_SCOPES,
  deniedMessage = "O Google não autorizou o acesso à agenda",
  onCode,
  onCancel,
  onError,
}: UseGoogleCalendarLoginOptions) => {
  const isConfigured = !!googleContants.OAUTH_CLIENT_ID;
  const [isReady, setIsReady] = useState<boolean>(!!getGoogleAccounts()?.oauth2);

  useEffect(() => {
    if (!isConfigured || isReady) return;

    loadGoogleIdentityServices()
      .then(() => setIsReady(true))
      .catch((error: Error) => onError?.(error.message));
  }, [isConfigured]);

  const launch = useCallback(() => {
    const accounts = getGoogleAccounts();
    if (!accounts?.oauth2) {
      onError?.("O login do Google ainda não foi carregado");
      return;
    }

    accounts.oauth2
      .initCodeClient({
        client_id: googleContants.OAUTH_CLIENT_ID,
        scope,
        ux_mode: "popup",
        // O fluxo de código já pede acesso contínuo; "consent" faz o Google devolver o refresh token mesmo quando a conta já autorizou antes
        prompt: "consent",
        callback: (response) => {
          if (response.code) onCode(response.code);
          else if (response.error === "access_denied") onCancel?.();
          else onError?.(response.error_description || deniedMessage);
        },
        error_callback: (error) => (error.type === "popup_closed" ? onCancel?.() : onError?.(error.message || "Falha no login do Google")),
      })
      .requestCode();
  }, [scope, deniedMessage, onCode, onCancel, onError]);

  return { launch, isConfigured, isReady };
};
