import { useConfirm } from "@/components/confirm-dialog";
import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";

const LEAVE_OPTIONS = {
  title: "Sair sem salvar?",
  description: "Há alterações que ainda não foram salvas. Se sair agora, elas serão perdidas.",
  confirmLabel: "Sair sem salvar",
  cancelLabel: "Continuar editando",
  destructive: true,
} as const;

/**
 * Protege uma tela com alterações não salvas.
 *
 * O app usa BrowserRouter (sem useBlocker), então o hook:
 * - pede confirmação do navegador ao fechar ou recarregar a aba;
 * - intercepta cliques em links internos (sidebar, "Voltar" em <Link>) e pergunta antes de sair;
 * - expõe `guard(fn)` para envolver navegações feitas por código (ex.: botão que chama navigate()).
 *
 * Renderize `guardDialog` em algum lugar da tela.
 */
export function useUnsavedChangesGuard(isDirty: boolean) {
  const navigate = useNavigate();
  const { confirm, confirmDialog } = useConfirm();

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!isDirty) return;
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      event.preventDefault();
      event.stopPropagation();
      void confirm(LEAVE_OPTIONS).then((ok) => {
        if (ok) navigate(url.pathname + url.search + url.hash);
      });
    };
    // Captura no document roda antes do listener do React, então o <Link> não navega
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [isDirty, confirm, navigate]);

  const guard = useCallback(
    (action: () => void) => {
      if (!isDirty) return action();
      void confirm(LEAVE_OPTIONS).then((ok) => {
        if (ok) action();
      });
    },
    [isDirty, confirm],
  );

  return { guard, guardDialog: confirmDialog };
}
