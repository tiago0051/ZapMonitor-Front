import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState, LoadingState } from "@/components/state-message";
import { userService } from "@/services/api/userSevice";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Copy, Download, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";

const TWO_FACTOR_QUERY_KEY = ["twoFactorStatus"];

const copyText = async (text: string, message: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(message);
  } catch {
    toast.error("Não foi possível copiar. Selecione e copie à mão.");
  }
};

/** Códigos de recuperação: aparecem uma única vez, então dá para copiar e baixar. */
const RecoveryCodesDialog: FC<{ codes: string[] | null; onClose: () => void }> = ({ codes, onClose }) => {
  const text = codes?.join("\n") ?? "";

  const download = () => {
    const blob = new Blob([`Códigos de recuperação do ZapMonitor\nCada código vale uma vez.\n\n${text}\n`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "zapmonitor-codigos-de-recuperacao.txt";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={!!codes} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Guarde seus códigos de recuperação</DialogTitle>
          <DialogDescription>
            Se você perder o celular, use um destes códigos no lugar do código do app para entrar. Cada um vale uma vez. Eles não aparecem
            de novo.
          </DialogDescription>
        </DialogHeader>
        <ul className="bg-muted grid grid-cols-2 gap-2 rounded-md p-3 font-mono text-sm">
          {codes?.map((code) => (
            <li key={code}>{code}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => copyText(text, "Códigos copiados")}>
            <Copy className="h-4 w-4" />
            Copiar
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={download}>
            <Download className="h-4 w-4" />
            Baixar arquivo
          </Button>
        </div>
        <DialogFooter>
          <Button type="button" onClick={onClose}>
            Já guardei os códigos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type CodeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  askPassword?: boolean;
  destructive?: boolean;
  isPending: boolean;
  onConfirm: (values: { code: string; password: string }) => void;
};

/** Pede o código do app (e a senha, quando precisa) antes de uma ação sensível. */
const CodeDialog: FC<CodeDialogProps> = ({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  askPassword,
  destructive,
  isPending,
  onConfirm,
}) => {
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      setCode("");
      setPassword("");
    }
    onOpenChange(value);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onConfirm({ code: code.trim(), password });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form id="two-factor-code-form" onSubmit={handleSubmit} className="grid gap-4">
          {askPassword && (
            <div className="grid gap-2">
              <Label htmlFor="two-factor-password">Senha atual</Label>
              <Input
                id="two-factor-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.currentTarget.value)}
                disabled={isPending}
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="two-factor-confirm-code">Código do app autenticador</Label>
            <Input
              id="two-factor-confirm-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={20}
              placeholder="123456"
              value={code}
              onChange={(event) => setCode(event.currentTarget.value)}
              disabled={isPending}
            />
            <p className="text-muted-foreground text-xs">Também vale um código de recuperação.</p>
          </div>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Voltar
          </Button>
          <Button
            type="submit"
            form="two-factor-code-form"
            variant={destructive ? "destructive" : "default"}
            disabled={isPending || !code.trim() || (askPassword && !password)}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type TwoFactorSettingsProps = {
  // O tenant exige a verificação para o papel do usuário
  required?: boolean;
  // Chamado depois de ativar ou desativar, para recarregar o acesso ao tenant
  onChange?: () => void;
};

export const TwoFactorSettings: FC<TwoFactorSettingsProps> = ({ required, onChange }) => {
  const queryClient = useQueryClient();
  const [setup, setSetup] = useState<TwoFactorSetup | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [dialog, setDialog] = useState<"disable" | "regenerate" | null>(null);

  const statusQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: TWO_FACTOR_QUERY_KEY,
    queryFn: userService.findTwoFactorStatus,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: TWO_FACTOR_QUERY_KEY });
    onChange?.();
  };

  const startSetup = useMutation({
    mutationFn: userService.startTwoFactorSetup,
    onError: requestErrorHandling,
    onSuccess: (data) => {
      setSetup(data);
      setSetupCode("");
    },
  });

  const enable = useMutation({
    mutationFn: userService.enableTwoFactor,
    onError: requestErrorHandling,
    onSuccess: ({ recoveryCodes: codes }) => {
      setSetup(null);
      setRecoveryCodes(codes);
      toast.success("Verificação em duas etapas ativada");
      refresh();
    },
  });

  const disable = useMutation({
    mutationFn: userService.disableTwoFactor,
    onError: requestErrorHandling,
    onSuccess: () => {
      setDialog(null);
      toast.success("Verificação em duas etapas desativada");
      refresh();
    },
  });

  const regenerate = useMutation({
    mutationFn: userService.regenerateTwoFactorRecoveryCodes,
    onError: requestErrorHandling,
    onSuccess: ({ recoveryCodes: codes }) => {
      setDialog(null);
      setRecoveryCodes(codes);
      refresh();
    },
  });

  const status = statusQuery.data;

  return (
    <section className="max-w-xl space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Verificação em duas etapas</h2>
        <p className="text-muted-foreground text-sm">
          Além da senha, o login pede um código que muda a cada 30 segundos no app autenticador do seu celular (Google Authenticator,
          Microsoft Authenticator ou outro). Mesmo que alguém descubra sua senha, não consegue entrar.
        </p>
      </div>

      {required && !status?.enabled && (
        <div className="flex gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>Este cliente exige a verificação em duas etapas para administradores. Ative para continuar usando o sistema.</p>
        </div>
      )}

      {statusQuery.isLoading && <LoadingState />}
      {statusQuery.isError && (
        <ErrorState
          message="Não foi possível ver a verificação em duas etapas."
          onRetry={() => statusQuery.refetch()}
          isRetrying={statusQuery.isFetching}
        />
      )}

      {status?.enabled && (
        <div className="space-y-3 rounded-md border p-4">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            Ativa{status.enabledAt ? ` desde ${format(status.enabledAt, "dd/MM/yyyy")}` : ""}
          </p>
          <p className="text-muted-foreground text-sm">
            {status.recoveryCodesLeft === 0
              ? "Você não tem mais códigos de recuperação. Gere novos para não ficar sem acesso se perder o celular."
              : `${status.recoveryCodesLeft} ${status.recoveryCodesLeft === 1 ? "código de recuperação restante" : "códigos de recuperação restantes"}.`}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDialog("regenerate")}>
              Gerar novos códigos de recuperação
            </Button>
            <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDialog("disable")}>
              Desativar
            </Button>
          </div>
        </div>
      )}

      {status && !status.enabled && !setup && (
        <Button onClick={() => startSetup.mutate()} disabled={startSetup.isPending}>
          {startSetup.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Ativar verificação em duas etapas
        </Button>
      )}

      {status && !status.enabled && setup && (
        <form
          className="space-y-4 rounded-md border p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (setupCode.trim()) enable.mutate(setupCode.trim());
          }}
        >
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Instale um app autenticador no celular, se ainda não tiver.</li>
            <li>No app, toque em adicionar conta e leia o QR code abaixo.</li>
            <li>Digite o código de 6 dígitos que aparecer no app.</li>
          </ol>
          <img src={setup.qrCode} alt="QR code para o app autenticador" className="h-48 w-48 rounded-md border bg-white p-2" />
          <div className="space-y-1">
            <p className="text-muted-foreground text-xs">Não consegue ler o QR code? Digite esta chave no app:</p>
            <div className="flex items-center gap-2">
              <code className="bg-muted rounded px-2 py-1 text-xs break-all">{setup.secret}</code>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Copiar chave"
                onClick={() => copyText(setup.secret, "Chave copiada")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <a href={setup.otpauthUrl} className="text-primary text-xs underline underline-offset-4 md:hidden">
              Abrir no app autenticador deste celular
            </a>
          </div>
          <div className="grid max-w-xs gap-2">
            <Label htmlFor="two-factor-setup-code">Código do app</Label>
            <Input
              id="two-factor-setup-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={7}
              placeholder="123456"
              value={setupCode}
              onChange={(event) => setSetupCode(event.currentTarget.value)}
              disabled={enable.isPending}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={enable.isPending || !setupCode.trim()}>
              {enable.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar e ativar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setSetup(null)} disabled={enable.isPending}>
              Cancelar
            </Button>
          </div>
        </form>
      )}

      <CodeDialog
        open={dialog === "disable"}
        onOpenChange={(open) => setDialog(open ? "disable" : null)}
        title="Desativar verificação em duas etapas"
        // Com a verificação ativa o acesso não diz se o cliente exige, então o aviso vale para os dois casos
        description="Sua conta volta a pedir só a senha para entrar. Se este cliente exigir a verificação para administradores, você será levado a ativar de novo."
        confirmLabel="Desativar"
        askPassword
        destructive
        isPending={disable.isPending}
        onConfirm={(values) => disable.mutate(values)}
      />
      <CodeDialog
        open={dialog === "regenerate"}
        onOpenChange={(open) => setDialog(open ? "regenerate" : null)}
        title="Gerar novos códigos de recuperação"
        description="Os códigos antigos deixam de valer."
        confirmLabel="Gerar códigos"
        isPending={regenerate.isPending}
        onConfirm={({ code }) => regenerate.mutate(code)}
      />
      <RecoveryCodesDialog codes={recoveryCodes} onClose={() => setRecoveryCodes(null)} />
    </section>
  );
};
