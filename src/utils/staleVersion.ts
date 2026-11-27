// Depois de um deploy, a aba aberta ainda roda a versão antiga e pede arquivos de tela (chunks) que não existem
// mais. O import falha e a tela caía no erro genérico. Aqui a página recarrega uma vez para pegar a versão nova.

const RELOADED_AT_KEY = "zapmonitor:stale-version-reloaded-at";
// Se já recarregou há pouco e falhou de novo, não é versão velha (ex.: sem internet): deixa o erro aparecer
const RELOAD_GUARD_MS = 30_000;

const CHUNK_ERROR_PATTERNS = [
  "failed to fetch dynamically imported module",
  "error loading dynamically imported module",
  "importing a module script failed",
  "unable to preload css",
];

/** Erro de arquivo da tela que não carregou, típico de aba aberta durante um deploy. */
export function isStaleVersionError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const normalized = message.toLowerCase();

  return CHUNK_ERROR_PATTERNS.some((pattern) => normalized.includes(pattern));
}

/** Recarrega a página para pegar a versão nova, no máximo uma vez a cada 30 segundos. Devolve se recarregou. */
export function reloadForNewVersion(): boolean {
  try {
    const last = Number(sessionStorage.getItem(RELOADED_AT_KEY) ?? 0);
    if (Date.now() - last < RELOAD_GUARD_MS) return false;
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()));
  } catch {
    // Sem sessionStorage não dá para evitar laço; recarrega mesmo assim, como o botão faria
  }

  window.location.reload();
  return true;
}

/** Escuta a falha de carregamento de tela do Vite e recarrega. O erro segue para a tela, que avisa da versão nova. */
export function listenForStaleVersion() {
  window.addEventListener("vite:preloadError", () => reloadForNewVersion());
}
