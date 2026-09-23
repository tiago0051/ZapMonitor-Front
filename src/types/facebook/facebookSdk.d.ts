export type FacebookLoginResponse = {
  status: "connected" | "not_authorized" | "unknown";
  authResponse: {
    code?: string;
    accessToken?: string;
    userID?: string;
  } | null;
};

export type FacebookLoginOptions = {
  config_id: string;
  response_type: "code";
  override_default_response_type: boolean;
  extras?: Record<string, unknown>;
};

export type FacebookSdk = {
  init: (params: { appId: string; autoLogAppEvents?: boolean; xfbml?: boolean; version: string }) => void;
  login: (callback: (response: FacebookLoginResponse) => void, options: FacebookLoginOptions) => void;
};

declare global {
  interface Window {
    FB?: FacebookSdk;
    fbAsyncInit?: () => void;
  }
}
