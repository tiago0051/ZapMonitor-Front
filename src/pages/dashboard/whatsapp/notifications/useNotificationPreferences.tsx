import { useClientContext } from "@/context/ClientContext/clientContext";
import { useUserContext } from "@/context/UserContext/userContext";
import { useLocalStorage } from "usehooks-ts";

export type NotificationPreferences = {
  // Contato novo entrando na fila
  queue: boolean;
  // Atendimento atribuído ao usuário e mensagens novas dos contatos que ele atende
  mine: boolean;
  sound: boolean;
};

const defaultPreferences: NotificationPreferences = { queue: false, mine: false, sound: true };

// A permissão de notificação é do navegador, então a preferência também fica nele, por cliente e usuário
export const useNotificationPreferences = () => {
  const { client } = useClientContext();
  const { user } = useUserContext();

  const [preferences, setPreferences] = useLocalStorage<NotificationPreferences>(
    `whatsapp:notifications:${client.id}:${user?.id ?? "anonymous"}`,
    defaultPreferences,
  );

  const updatePreferences = (update: Partial<NotificationPreferences>) => setPreferences((current) => ({ ...current, ...update }));

  return { preferences: { ...defaultPreferences, ...preferences }, updatePreferences };
};

export const isBrowserNotificationSupported = () => typeof window !== "undefined" && "Notification" in window;
