import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, BellOff } from "lucide-react";
import { useState, type FC } from "react";
import { isBrowserNotificationSupported, useNotificationPreferences, type NotificationPreferences } from "./useNotificationPreferences";

const options: { key: keyof NotificationPreferences; label: string; description: string }[] = [
  { key: "queue", label: "Fila", description: "Quando um contato novo entrar na fila." },
  {
    key: "mine",
    label: "Meus atendimentos",
    description: "Quando um atendimento for atribuído a você e a cada mensagem nova dos contatos que você atende.",
  },
  { key: "sound", label: "Tocar som", description: "Junto com as notificações acima." },
];

const readPermission = () => (isBrowserNotificationSupported() ? Notification.permission : "unsupported");

export const NotificationSettings: FC = () => {
  const { preferences, updatePreferences } = useNotificationPreferences();
  const [permission, setPermission] = useState(readPermission);

  const isAnyTabEnabled = preferences.queue || preferences.mine;

  const togglePreference = async (key: keyof NotificationPreferences, checked: boolean) => {
    updatePreferences({ [key]: checked });

    // Pede a permissão no clique, que é quando o navegador aceita mostrar o pedido
    if (checked && key !== "sound" && readPermission() === "default") {
      setPermission(await Notification.requestPermission());
    }
  };

  return (
    <Popover onOpenChange={(isOpen) => isOpen && setPermission(readPermission())}>
      <PopoverTrigger asChild>
        <button
          aria-label="Notificações"
          title="Notificações"
          className="hover:bg-muted text-muted-foreground flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg transition-colors"
        >
          {isAnyTabEnabled ? <Bell className="text-foreground h-4 w-4" /> : <BellOff className="h-4 w-4" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div>
          <p className="text-sm font-semibold">Notificações</p>
          <p className="text-muted-foreground text-xs">Escolha de quais abas você quer ser avisado. Vale para este navegador.</p>
        </div>

        {options.map((option) => (
          <label key={option.key} className="flex cursor-pointer items-start gap-2.5">
            <Checkbox
              className="mt-0.5"
              checked={preferences[option.key]}
              disabled={option.key === "sound" && !isAnyTabEnabled}
              onCheckedChange={(checked) => togglePreference(option.key, checked === true)}
            />
            <span>
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="text-muted-foreground block text-xs">{option.description}</span>
            </span>
          </label>
        ))}

        {isAnyTabEnabled && permission === "denied" && (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            O navegador está bloqueando as notificações deste site. Libere nas configurações do site para receber avisos com a aba em
            segundo plano. Com a aba aberta, os avisos continuam aparecendo na tela.
          </p>
        )}
        {isAnyTabEnabled && permission === "unsupported" && (
          <p className="text-muted-foreground text-xs">
            Este navegador não tem notificações do sistema. Os avisos aparecem só com a aba aberta.
          </p>
        )}
        <p className="text-muted-foreground border-t pt-2 text-xs">Os avisos chegam enquanto a tela de WhatsApp estiver aberta.</p>
      </PopoverContent>
    </Popover>
  );
};
