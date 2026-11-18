import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FC } from "react";
import { SHORTCUTS } from "./keyboardShortcuts";

type ShortcutsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Lista dos atalhos de teclado do atendimento, aberta com "?". */
export const ShortcutsDialog: FC<ShortcutsDialogProps> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Atalhos de teclado</DialogTitle>
        <DialogDescription>Funcionam fora da caixa de mensagem; Esc e a busca funcionam em qualquer lugar.</DialogDescription>
      </DialogHeader>
      <ul className="divide-y">
        {SHORTCUTS.map((shortcut) => (
          <li key={shortcut.label} className="flex items-center justify-between gap-3 py-2 text-sm">
            <span>{shortcut.label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {shortcut.keys.map((key) => (
                <kbd key={key} className="bg-muted text-foreground min-w-6 rounded border px-1.5 py-0.5 text-center font-mono text-xs">
                  {key}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </DialogContent>
  </Dialog>
);
