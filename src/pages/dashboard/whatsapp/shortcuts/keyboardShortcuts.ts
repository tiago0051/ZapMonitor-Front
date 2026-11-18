import { useEffect, useRef } from "react";

// Atalhos do atendimento. Alt+Shift+letra não abre menus do navegador (Alt+E/Alt+F abrem no Chrome e no Firefox)
export const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";
const shift = isMac ? "⇧" : "Shift";

export const SHORTCUTS = [
  { keys: [`${alt}`, "↑"], label: "Conversa anterior da lista" },
  { keys: [`${alt}`, "↓"], label: "Próxima conversa da lista" },
  { keys: [mod, "K"], label: "Buscar conversas" },
  { keys: [alt, shift, "A"], label: "Assumir o atendimento" },
  { keys: [alt, shift, "E"], label: "Encerrar o atendimento" },
  { keys: [alt, shift, "T"], label: "Transferir o atendimento" },
  { keys: ["Esc"], label: "Fechar painel ou janela aberta" },
  { keys: ["?"], label: "Mostrar esta lista de atalhos" },
] as const;

/** Foco num campo de texto: os atalhos de letra e seta não disparam (só Esc e Ctrl/⌘+K). */
export const isTypingTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
};

/** Algum diálogo aberto: os atalhos da tela esperam ele fechar. */
export const isDialogOpen = () => !!document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]');

export const isModK = (event: KeyboardEvent) => (event.metaKey || event.ctrlKey) && !event.altKey && event.code === "KeyK";

/** Alt+Shift+letra, pelo código da tecla (no Mac, Alt+letra vira outro caractere). */
export const isAltShiftKey = (event: KeyboardEvent, letter: string) =>
  event.altKey && event.shiftKey && !event.ctrlKey && !event.metaKey && event.code === `Key${letter}`;

/** Atalho comum da tela: fora de campos de texto e sem diálogo aberto. */
export const canRunScreenShortcut = (event: KeyboardEvent) => !event.defaultPrevented && !isTypingTarget(event.target) && !isDialogOpen();

/** Escuta o teclado na janela com o handler mais recente, sem registrar de novo a cada render. */
export const useWindowKeydown = (handler: (event: KeyboardEvent) => void) => {
  const handlerRef = useRef(handler);
  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => handlerRef.current(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
};
