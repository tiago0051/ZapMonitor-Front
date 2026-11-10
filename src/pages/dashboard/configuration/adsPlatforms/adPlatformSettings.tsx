import { EmptyState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { googleContants } from "@/contants/googleContants";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useGoogleCalendarLogin } from "@/hooks/use-googleCalendarLogin";
import { accountStatusLabel, syncStatusLabel } from "@/pages/dashboard/ads/adsUtils";
import { useSyncAccount } from "@/pages/dashboard/ads/components/useSyncAccount";
import { adsPlatformService } from "@/services/api/adsPlatformService";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FC } from "react";
import { toast } from "sonner";
import { AdPlatformConversions } from "./adPlatformConversions";
import { AdTrackedLinks } from "./adTrackedLinks";
import { TikTokLeadSources } from "./tiktokLeadSources";
import { TIKTOK_AUTH_MESSAGE, tiktokRedirectUri } from "./tiktokAuth";

type ConnectablePlatform = Extract<AdPlatform, "GOOGLE" | "TIKTOK">;

const COPY: Record<ConnectablePlatform, { title: string; description: string; connect: string; empty: string; env: string }> = {
  GOOGLE: {
    title: "Anúncios do YouTube",
    description:
      "Conecte a conta Google com acesso ao Google Ads. As campanhas Demand Gen e de vídeo, que rodam no YouTube, entram no gestor de anúncios com as métricas do dia.",
    connect: "Conectar com o Google",
    empty:
      "Entre com uma conta Google que acesse o Google Ads da empresa (direto ou por uma conta de administrador) e autorize o Google Ads.",
    env: "VITE_GOOGLE_OAUTH_CLIENT_ID no painel e GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET no servidor, com a Google Ads API ativada no projeto do Google Cloud",
  },
  TIKTOK: {
    title: "Anúncios do TikTok",
    description:
      "Autorize o ZapMonitor no TikTok for Business. As campanhas, grupos e anúncios dos anunciantes escolhidos entram no gestor com as métricas do dia.",
    connect: "Conectar com o TikTok",
    empty: "Entre com um usuário do TikTok for Business que administre os anunciantes da empresa e autorize todos os acessos.",
    env: "TIKTOK_APP_ID e TIKTOK_APP_SECRET no servidor, e o endereço /tiktok-ads/callback cadastrado no app do TikTok",
  },
};

/** Conexão e contas de anúncio do Google Ads (YouTube) ou do TikTok. */
export const AdPlatformSettings: FC<{ platform: ConnectablePlatform }> = ({ platform }) => {
  const { client } = useClientContext();
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  const copy = COPY[platform];
  const [isConfirmingDisconnect, setIsConfirmingDisconnect] = useState(false);
  const params = { clientId: client.id, platform };

  const connectionQuery = useSuspenseQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "platform", platform, "connection", client.id],
    queryFn: () => adsPlatformService.findConnection({ params }),
  });
  const connection = connectionQuery.data;
  const isUsable = connection.connected && !connection.revoked;

  const availableQuery = useQuery({
    queryKey: ["metaAds", "platform", platform, "available", client.id],
    queryFn: () => adsPlatformService.findAvailableAccounts({ params }),
    enabled: isUsable,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["metaAds"] });
  const connect = useMutation({
    mutationFn: adsPlatformService.connect,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Conectado. Escolha as contas de anúncio.");
    },
  });
  const disconnect = useMutation({
    mutationFn: adsPlatformService.disconnect,
    onError: requestErrorHandling,
    onSuccess: () => {
      setIsConfirmingDisconnect(false);
      invalidate();
      toast.success("Desconectado");
    },
  });
  const linkAccount = useMutation({
    mutationFn: adsPlatformService.linkAccount,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Conta vinculada. A primeira sincronização já começou.");
    },
  });
  const unlinkAccount = useMutation({
    mutationFn: metaAdsService.unlinkAccount,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      toast.success("Conta desvinculada");
    },
  });
  const syncAccount = useSyncAccount();

  const connectMutate = connect.mutate;
  const onCode = useCallback(
    (code: string) => connectMutate({ params: { clientId: client.id, platform }, body: { code } }),
    [connectMutate, client.id, platform],
  );
  const google = useGoogleCalendarLogin({
    scope: googleContants.ADS_SCOPES,
    deniedMessage: "O Google não autorizou o acesso ao Google Ads",
    onCode,
    onCancel: () => toast.info("Conexão com o Google cancelada"),
    onError: (message) => toast.error(message),
  });
  const tiktok = useTikTokLogin({ clientId: client.id, onCode, onError: (message) => toast.error(message) });

  const isPending = connect.isPending || disconnect.isPending || linkAccount.isPending || unlinkAccount.isPending;
  const isLoginReady = platform === "GOOGLE" ? google.isConfigured && google.isReady : true;
  const canLaunch = connection.configured && isLoginReady && !isPending;
  const launch = platform === "GOOGLE" ? google.launch : tiktok.launch;
  const linkedById = new Map(connection.accounts.map((account) => [account.metaAccountId, account]));

  return (
    <Card>
      <CardHeader className="flex flex-col items-start gap-4 space-y-0 sm:flex-row sm:justify-between">
        <div>
          <CardTitle>{copy.title}</CardTitle>
          <CardDescription>{copy.description}</CardDescription>
        </div>
        <Button variant={isUsable ? "outline" : "default"} onClick={launch} disabled={!canLaunch}>
          {connection.connected ? "Reconectar" : copy.connect}
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {!connection.configured && (
          <div className="space-y-1 text-sm">
            <p className="text-destructive">Esta integração está indisponível no momento. Fale com o suporte.</p>
            {(user?.isOwner || user?.isImplanter) && (
              <p className="text-muted-foreground text-xs">Detalhe técnico: configure {copy.env}.</p>
            )}
          </div>
        )}

        {!connection.connected && <EmptyState title="Ainda não conectado" description={copy.empty} />}

        {connection.connected && (
          <>
            <div className="space-y-1 text-sm">
              <p>
                Conectado como <span className="font-medium">{connection.externalUserName ?? "—"}</span>
                {connection.connectedAt && ` · desde ${format(new Date(connection.connectedAt), "dd/MM/yyyy")}`}
              </p>
              {connection.revoked && (
                <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A plataforma recusou o acesso (permissão removida ou senha trocada).
                  Reconecte para voltar a sincronizar.
                </p>
              )}
            </div>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Contas de anúncio</h3>
              {availableQuery.isLoading && <LoadingState className="justify-start py-2" />}
              {availableQuery.isSuccess && availableQuery.data.length === 0 && (
                <p className="text-muted-foreground text-sm">Esta conexão não enxerga nenhuma conta de anúncio.</p>
              )}
              <ul className="divide-y rounded-lg border empty:hidden">
                {(availableQuery.data ?? []).map((available) => {
                  const linked = linkedById.get(available.externalId);

                  return (
                    <li key={available.externalId} className="flex flex-wrap items-center gap-3 px-3 py-2">
                      <div className="min-w-0 flex-1 break-words">
                        <p className="truncate text-sm font-medium">{available.name}</p>
                        <p className="text-muted-foreground text-xs">
                          {available.externalId} · {available.currency} ·{" "}
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
                      </div>
                      {linked ? (
                        <>
                          <Badge variant="secondary">Vinculada</Badge>
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
                          disabled={isPending || available.accountStatus !== 1}
                          onClick={() => linkAccount.mutate({ params, body: { externalId: available.externalId } })}
                        >
                          Vincular
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {connection.accounts.length > 0 && (
              <>
                <AdTrackedLinks platform={platform} />
                <AdPlatformConversions platform={platform} accounts={connection.accounts} />
                {platform === "TIKTOK" && <TikTokLeadSources accounts={connection.accounts} />}
              </>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t pt-4">
              {isConfirmingDisconnect ? (
                <>
                  <p className="text-sm">Desconectar apaga a cópia das contas no ZapMonitor. Nada muda na plataforma.</p>
                  <Button size="sm" variant="destructive" disabled={disconnect.isPending} onClick={() => disconnect.mutate({ params })}>
                    Desconectar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setIsConfirmingDisconnect(false)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setIsConfirmingDisconnect(true)}>
                  Desconectar
                </Button>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

/**
 * Login do TikTok em popup: o TikTok volta para /tiktok-ads/callback, que manda o auth_code para esta janela. O state
 * confere que a volta é deste pedido.
 */
const useTikTokLogin = ({
  clientId,
  onCode,
  onError,
}: {
  clientId: string;
  onCode: (code: string) => void;
  onError: (message: string) => void;
}) => {
  const stateRef = useRef<string | null>(null);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== TIKTOK_AUTH_MESSAGE) return;
      if (!stateRef.current || event.data.state !== stateRef.current) return;
      stateRef.current = null;
      if (event.data.authCode) onCode(event.data.authCode);
      else onError("O TikTok não autorizou o acesso");
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onCode, onError]);

  const launch = useCallback(async () => {
    // A janela abre antes do await para o navegador não bloquear o popup
    const popup = window.open("", "tiktok-ads-auth", "width=640,height=760");
    try {
      const { url, state } = await adsPlatformService.tiktokAuthorizeUrl({
        params: { clientId },
        queries: { redirectUri: tiktokRedirectUri() },
      });
      stateRef.current = state;
      if (popup) popup.location.href = url;
      else window.location.href = url;
    } catch (error) {
      popup?.close();
      requestErrorHandling(error);
    }
  }, [clientId]);

  return { launch };
};
