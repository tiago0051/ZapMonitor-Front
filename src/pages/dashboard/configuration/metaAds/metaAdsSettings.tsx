import { EmptyState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useMetaAdsLogin } from "@/hooks/use-metaAdsLogin";
import { accountStatusLabel, syncStatusLabel } from "@/pages/dashboard/ads/adsUtils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, ChevronRight, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { MetaAdsLeadPages } from "./metaAdsLeadPages";
import { MetaAdsConversions } from "./metaAdsConversions";
import { MetaAdsTokenDialog } from "./metaAdsTokenDialog";

const scopeLabel: Record<string, string> = {
  ads_management: "mudar anúncios",
  business_management: "acessar o portfólio",
  leads_retrieval: "ler leads dos formulários",
  pages_show_list: "ver as páginas",
  pages_manage_posts: "publicar na página (Postagens)",
  pages_read_engagement: "ler as postagens da página",
  instagram_basic: "ler o Instagram",
  instagram_content_publish: "publicar no Instagram (Postagens)",
};

export const MetaAdsSettings = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);
  const [isTokenDialogOpen, setIsTokenDialogOpen] = useState(false);

  const connectionQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "connection", client.id],
    queryFn: () => metaAdsService.findConnection({ params: { clientId: client.id } }),
  });
  const connection = connectionQuery.data;

  const availableQuery = useQuery({
    queryKey: ["metaAds", "available", client.id],
    queryFn: () => metaAdsService.findAvailableAccounts({ params: { clientId: client.id } }),
    enabled: connection.connected,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metaAds"] });

  const connect = useMutation({
    mutationFn: metaAdsService.connect,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Meta conectada. Escolha as contas de anúncio.");
    },
  });
  const disconnect = useMutation({
    mutationFn: metaAdsService.disconnect,
    onError: requestErrorHandling,
    onSuccess: () => {
      setIsConfirmingDisconnect(false);
      invalidate();
      toast.success("Meta desconectada");
    },
  });
  const linkAccount = useMutation({
    mutationFn: metaAdsService.linkAccount,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Conta vinculada. A sincronização começou.");
    },
  });
  const unlinkAccount = useMutation({ mutationFn: metaAdsService.unlinkAccount, onError: requestErrorHandling, onSuccess: invalidate });
  const removeAccountToken = useMutation({
    mutationFn: metaAdsService.removeAccountToken,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("A conta voltou a usar o token da conexão");
    },
  });
  const syncAccount = useMutation({
    mutationFn: metaAdsService.syncAccount,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Sincronização agendada");
    },
  });

  const { launch, isConfigured, isSdkReady } = useMetaAdsLogin({
    onCode: (code) => connect.mutate({ params: { clientId: client.id }, body: { code } }),
    onCancel: () => toast.info("Conexão com a Meta cancelada"),
    onError: (message) => toast.error(message),
  });

  const isPending =
    connect.isPending || disconnect.isPending || linkAccount.isPending || unlinkAccount.isPending || removeAccountToken.isPending;
  const linkedByMetaId = new Map(connection.accounts.map((account) => [account.metaAccountId, account]));
  // Contas vinculadas com token próprio podem não aparecer para o token da conexão; entram na lista do mesmo jeito
  const availableIds = new Set(availableQuery.data?.map((account) => account.metaAccountId));
  const accountRows: AvailableAdAccount[] = [
    ...(availableQuery.data ?? []),
    ...(availableQuery.isSuccess ? connection.accounts : [])
      .filter((account) => !availableIds.has(account.metaAccountId))
      .map((account) => ({
        metaAccountId: account.metaAccountId,
        name: account.name,
        currency: account.currency,
        accountStatus: account.accountStatus,
        businessName: account.businessName,
        linked: true,
        granted: false,
      })),
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col items-start justify-between gap-4 space-y-0 sm:flex-row">
        <div>
          <CardTitle>Anúncios da Meta</CardTitle>
          <CardDescription>
            Conecte a Meta e vincule as contas de anúncio que o ZapMonitor vai acompanhar. Nada muda na Meta por aqui: as contas são só
            lidas e copiadas a cada 6 horas.
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          {!connection.connected ? (
            <Button onClick={launch} disabled={!isConfigured || !isSdkReady || isPending}>
              Conectar com a Meta
            </Button>
          ) : (
            <Button variant="outline" onClick={launch} disabled={!isSdkReady || isPending}>
              Reconectar
            </Button>
          )}
        </div>
      </CardHeader>
      <MetaAdsTokenDialog clientId={client.id} open={isTokenDialogOpen} onOpenChange={setIsTokenDialogOpen} />

      <CardContent className="space-y-6">
        {!isConfigured && (
          <p className="text-destructive text-sm">
            O login com a Meta para anúncios não está configurado neste ambiente (VITE_META_ADS_LOGIN_CONFIG_ID).
          </p>
        )}

        {!connection.connected && (
          <EmptyState
            title="A Meta ainda não está conectada"
            description="Ao conectar, entre com uma pessoa que tenha acesso às contas de anúncio no portfólio da empresa e autorize os anúncios. Se preferir, vincule as contas com um token de usuário do sistema em Opções avançadas, no fim da página."
          />
        )}

        {connection.connected && (
          <>
            <div className="space-y-1 text-sm">
              <p>
                Conectado como <span className="font-medium">{connection.metaUserName}</span>
                {connection.tokenExpiresAt
                  ? ` · acesso válido até ${format(new Date(connection.tokenExpiresAt), "dd/MM/yyyy")}`
                  : " · acesso sem prazo de expiração"}
              </p>
              {connection.missingScopes.length > 0 && (
                <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  Faltam permissões para as próximas fases: {connection.missingScopes.map((scope) => scopeLabel[scope] ?? scope).join(", ")}
                  . Reconecte e autorize tudo.
                </p>
              )}
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Contas de anúncio</h3>
              {availableQuery.isLoading && <LoadingState className="justify-start py-2" />}
              {availableQuery.isSuccess && accountRows.length === 0 && (
                <p className="text-muted-foreground text-sm">Esta conexão não enxerga nenhuma conta de anúncio.</p>
              )}
              <ul className="divide-y rounded-lg border">
                {accountRows.map((available) => {
                  const linked = linkedByMetaId.get(available.metaAccountId);

                  return (
                    <li key={available.metaAccountId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1 break-words">
                        <p className="truncate text-sm font-medium">{available.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {available.metaAccountId} · {available.currency} ·{" "}
                          {accountStatusLabel[available.accountStatus] ?? "Status desconhecido"}
                          {available.businessName && ` · ${available.businessName}`}
                        </p>
                        {linked && (
                          <p className="text-muted-foreground text-xs">
                            {syncStatusLabel[linked.syncStatus]}
                            {linked.lastSyncedAt && ` em ${format(new Date(linked.lastSyncedAt), "dd/MM HH:mm")}`}
                            {linked.syncError && <span className="text-destructive"> · {linked.syncError}</span>}
                          </p>
                        )}
                        {linked?.hasOwnToken && (
                          <p className="text-muted-foreground text-xs">
                            Usa token próprio
                            {linked.tokenExpiresAt
                              ? ` · válido até ${format(new Date(linked.tokenExpiresAt), "dd/MM/yyyy")}`
                              : " · sem prazo de expiração"}
                          </p>
                        )}
                        {!available.granted && !linked?.hasOwnToken && (
                          <p className="text-destructive text-xs">
                            Não liberada para o app. Reconecte e marque esta conta em editar acesso na Meta, ou vincule com token (em Opções
                            avançadas).
                          </p>
                        )}
                      </div>
                      {linked ? (
                        <>
                          <Badge variant="secondary">Vinculada</Badge>
                          {/* Só quando a conexão também alcança a conta; senão a sincronização voltaria a falhar */}
                          {linked.hasOwnToken && available.granted && (
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={isPending}
                              onClick={() => removeAccountToken.mutate({ params: { clientId: client.id, accountId: linked.id } })}
                            >
                              Usar token da conexão
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            aria-label={`Sincronizar ${available.name}`}
                            disabled={syncAccount.isPending}
                            onClick={() => syncAccount.mutate({ params: { clientId: client.id, accountId: linked.id } })}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isPending}
                            onClick={() => unlinkAccount.mutate({ params: { clientId: client.id, accountId: linked.id } })}
                          >
                            Desvincular
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isPending || !available.granted}
                          onClick={() =>
                            linkAccount.mutate({ params: { clientId: client.id }, body: { metaAccountId: available.metaAccountId } })
                          }
                        >
                          Vincular
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            <MetaAdsLeadPages />

            <MetaAdsConversions />

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {isConfirmingDisconnect ? (
                <>
                  <p className="text-sm">Desconectar apaga a cópia de todas as contas no ZapMonitor. Nada muda na Meta.</p>
                  <Button
                    size="sm"
                    variant="destructive"
                    disabled={disconnect.isPending}
                    onClick={() => disconnect.mutate({ params: { clientId: client.id } })}
                  >
                    Desconectar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsConfirmingDisconnect(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsConfirmingDisconnect(true)}>
                  Desconectar a Meta
                </Button>
              )}
            </div>
          </>
        )}

        {/* Token de usuário do sistema: caminho técnico, fica recolhido para não competir com o "Conectar com a Meta" */}
        <details className="group border-t pt-4">
          <summary className="text-muted-foreground hover:text-foreground focus-visible:ring-ring/50 flex w-fit cursor-pointer list-none items-center gap-1 rounded text-sm font-medium outline-none focus-visible:ring-[3px] [&::-webkit-details-marker]:hidden">
            <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />
            Opções avançadas
          </summary>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-muted-foreground max-w-xl text-xs">
              Vincule uma conta de anúncio com um token de usuário do sistema do Gerenciador de Negócios, quando o login com a Meta não
              libera a conta.
            </p>
            <Button variant="outline" size="sm" onClick={() => setIsTokenDialogOpen(true)} disabled={isPending}>
              Vincular com token
            </Button>
          </div>
        </details>
      </CardContent>
    </Card>
  );
};
