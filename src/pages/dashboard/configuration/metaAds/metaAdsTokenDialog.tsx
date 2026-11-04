import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { accountStatusLabel } from "@/pages/dashboard/ads/adsUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

type MetaAdsTokenDialogProps = {
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Vincula contas de anúncio com um token informado pelo usuário, como o de um usuário do sistema do portfólio. Serve
 * para contas que o login com a Meta não alcança; sem conexão, o token vira a conexão do cliente.
 */
export const MetaAdsTokenDialog = ({ clientId, open, onOpenChange }: MetaAdsTokenDialogProps) => {
  const queryClient = useQueryClient();
  const [accessToken, setAccessToken] = useState("");

  const findAccounts = useMutation({ mutationFn: metaAdsService.findAccountsForToken, onError: requestErrorHandling });
  const linkAccount = useMutation({
    mutationFn: metaAdsService.linkAccountWithToken,
    onError: requestErrorHandling,
    onSuccess: (account) => {
      queryClient.invalidateQueries({ queryKey: ["metaAds"] });
      toast.success(`${account.name} vinculada com o token. A sincronização começou.`);
      findAccounts.mutate({ params: { clientId }, body: { accessToken } });
    },
  });

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setAccessToken("");
      findAccounts.reset();
    }
    onOpenChange(isOpen);
  };

  const token = accessToken.trim();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Vincular conta com token</DialogTitle>
          <DialogDescription>
            Gere um token no portfólio da empresa (Configurações do negócio → Usuários do sistema → Gerar token) para o app do ZapMonitor,
            com a conta de anúncio atribuída e as permissões ads_read ou ads_management. O token fica guardado criptografado e vale só para
            as contas vinculadas por aqui.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (token) findAccounts.mutate({ params: { clientId }, body: { accessToken: token } });
          }}
        >
          <Label htmlFor="meta-ads-token">Token de acesso</Label>
          <div className="flex gap-2">
            <Input
              id="meta-ads-token"
              type="password"
              autoComplete="off"
              placeholder="EAAB..."
              value={accessToken}
              onChange={(event) => {
                setAccessToken(event.target.value);
                findAccounts.reset();
              }}
            />
            <Button type="submit" disabled={!token || findAccounts.isPending}>
              {findAccounts.isPending ? "Buscando..." : "Buscar contas"}
            </Button>
          </div>
        </form>

        {findAccounts.data?.length === 0 && (
          <p className="text-muted-foreground text-sm">Este token não enxerga nenhuma conta de anúncio.</p>
        )}

        {!!findAccounts.data?.length && (
          <ul className="max-h-72 divide-y overflow-y-auto rounded-lg border">
            {findAccounts.data.map((account) => (
              <li key={account.metaAccountId} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{account.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {account.metaAccountId} · {account.currency} · {accountStatusLabel[account.accountStatus] ?? "Status desconhecido"}
                    {account.businessName && ` · ${account.businessName}`}
                  </p>
                  {!account.granted && <p className="text-destructive text-xs">Esta conta não foi liberada para o app neste token.</p>}
                </div>
                <Button
                  size="sm"
                  variant={account.linked ? "outline" : "default"}
                  disabled={!account.granted || linkAccount.isPending}
                  onClick={() =>
                    linkAccount.mutate({ params: { clientId }, body: { accessToken: token, metaAccountId: account.metaAccountId } })
                  }
                >
                  {account.linked ? "Usar este token" : "Vincular"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};
