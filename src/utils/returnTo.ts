/**
 * Volta para a tela de onde o login foi pedido (ex.: aviso de conversa aberto com a sessão vencida). Só aceita
 * caminhos do painel deste site: nada de endereço externo, para o link de login não virar porta de redirecionamento.
 */
export const RETURN_TO_PARAM = "returnTo";

export function sanitizeReturnTo(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/dashboard/") || value.startsWith("//") || value.includes("\\")) return null;

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin) return null;

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/** Cliente do caminho de volta (`/dashboard/client/:clientId/...`), para conferir o acesso antes de ir direto. */
export function returnToClientId(returnTo: string) {
  return /^\/dashboard\/client\/([^/?#]+)/.exec(returnTo)?.[1] ?? null;
}

/** Acrescenta o caminho de volta (se válido) a uma rota de autenticação. */
export function withReturnTo(path: string, returnTo: string | null | undefined) {
  const safe = sanitizeReturnTo(returnTo);
  if (!safe) return path;

  return `${path}?${new URLSearchParams({ [RETURN_TO_PARAM]: safe })}`;
}

/** Tela atual do navegador, para voltar a ela depois do login. */
export const currentReturnTo = () => sanitizeReturnTo(`${window.location.pathname}${window.location.search}${window.location.hash}`);
