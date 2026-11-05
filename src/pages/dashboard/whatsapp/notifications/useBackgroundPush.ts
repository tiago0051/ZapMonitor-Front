import { pushService } from "@/services/api/pushService";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";

export type BackgroundPushStatus =
  // Navegador sem Web Push
  | "unsupported"
  // iPhone/iPad fora do app instalado: o Safari só entrega push para o app na tela de início
  | "needsInstall"
  // Servidor sem as chaves de push
  | "unavailable"
  | "denied"
  | "off"
  | "on";

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
export const isBackgroundPushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

const toApplicationServerKey = (base64: string) => {
  const padded = `${base64}${"=".repeat((4 - (base64.length % 4)) % 4)}`.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const toBody = (subscription: PushSubscription) => {
  const json = subscription.toJSON();
  return { endpoint: subscription.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" };
};

// Em desenvolvimento o service worker do PWA não é registrado; espera no máximo alguns segundos
const findRegistration = () =>
  Promise.race([navigator.serviceWorker.ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), 4000))]);

/** Inscrição deste aparelho nas notificações com o app fechado. */
export const useBackgroundPush = () => {
  const configQuery = useQuery({ queryKey: ["push", "config"], queryFn: pushService.findConfig, enabled: isBackgroundPushSupported() });
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  // Sem suporte não há o que verificar
  const [isChecking, setIsChecking] = useState(isBackgroundPushSupported);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isBackgroundPushSupported()) return;

    let active = true;
    (async () => {
      const registration = await findRegistration();
      const current = (await registration?.pushManager.getSubscription()) ?? null;
      if (!active) return;

      setSubscription(current);
      setIsChecking(false);
      // Liga o aparelho ao usuário logado agora (o mesmo navegador pode ter trocado de conta)
      if (current) pushService.saveSubscription(toBody(current)).catch(() => undefined);
    })();

    return () => {
      active = false;
    };
  }, []);

  const publicKey = configQuery.data?.publicKey ?? null;

  const status: BackgroundPushStatus = !isBackgroundPushSupported()
    ? isIos() && !isStandalone()
      ? "needsInstall"
      : "unsupported"
    : configQuery.isSuccess && !publicKey
      ? "unavailable"
      : Notification.permission === "denied"
        ? "denied"
        : subscription
          ? "on"
          : "off";

  const enable = useCallback(async () => {
    if (!publicKey) return;
    setIsBusy(true);
    setError(null);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("A permissão de notificações foi negada. Libere nas configurações do navegador para este site.");
        return;
      }

      const registration = await findRegistration();
      if (!registration) {
        setError("O app ainda não terminou de instalar. Recarregue a página e tente de novo.");
        return;
      }

      const created = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toApplicationServerKey(publicKey),
      });
      await pushService.saveSubscription(toBody(created));
      setSubscription(created);
      configQuery.refetch();
    } catch {
      setError("Não foi possível ativar as notificações neste aparelho. Tente de novo.");
    } finally {
      setIsBusy(false);
    }
  }, [publicKey, configQuery]);

  const disable = useCallback(async () => {
    if (!subscription) return;
    setIsBusy(true);
    setError(null);

    try {
      await pushService.deleteSubscription(subscription.endpoint).catch(() => undefined);
      await subscription.unsubscribe();
      setSubscription(null);
      configQuery.refetch();
    } finally {
      setIsBusy(false);
    }
  }, [subscription, configQuery]);

  return { status, isChecking, isBusy, error, enable, disable };
};
