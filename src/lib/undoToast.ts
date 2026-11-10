import { toast } from "sonner";

type UndoableOptions = {
  /** Texto do toast, ex.: "Tarefa removida" */
  message: string;
  /** Executa a ação de verdade (ex.: chamar a API) quando o prazo para desfazer acaba */
  commit: () => void | Promise<unknown>;
  /** Chamado se a pessoa clicar em "Desfazer" (ex.: devolver o item à tela) */
  onUndo?: () => void;
  /** Tempo para desfazer, em ms */
  duration?: number;
};

/**
 * Adia uma ação destrutiva simples e mostra um toast com "Desfazer".
 * A ação só roda quando o toast some sem a pessoa desfazer.
 * Para efeitos externos sérios (ex.: descadastro, encerrar plano), prefira useConfirm.
 */
export function undoableAction({ message, commit, onUndo, duration = 5000 }: UndoableOptions) {
  let undone = false;
  let done = false;

  const run = () => {
    if (undone || done) return;
    done = true;
    void commit();
  };

  const timer = window.setTimeout(run, duration);

  toast(message, {
    duration,
    action: {
      label: "Desfazer",
      onClick: () => {
        if (done) return;
        undone = true;
        window.clearTimeout(timer);
        onUndo?.();
      },
    },
    onAutoClose: () => {
      window.clearTimeout(timer);
      run();
    },
    onDismiss: () => {
      window.clearTimeout(timer);
      run();
    },
  });
}
