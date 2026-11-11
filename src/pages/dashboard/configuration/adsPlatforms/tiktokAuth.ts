// Mensagem que a página de volta do TikTok manda para a janela que abriu o login
export const TIKTOK_AUTH_MESSAGE = "zapmonitor:tiktok-ads-auth";

/** Endereço cadastrado no app do TikTok como redirect. */
export const tiktokRedirectUri = () => `${window.location.origin}/tiktok-ads/callback`;
