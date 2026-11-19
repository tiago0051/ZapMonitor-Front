import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Smile } from "lucide-react";
import { useState, type FC } from "react";

// Sem biblioteca: os emojis mais usados no atendimento, por grupo (o sistema desenha cada um)
const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Rostos",
    emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 😊 🙂 😉 😍 🥰 😘 😋 😎 🤩 🥳 🤗 🤔 🤭 😐 😶 🙄 😏 😬 😌 😴 😷 🤒 🤯 😢 😭 😤 😡 😱 😳 🥺 🙏".split(
      " ",
    ),
  },
  {
    label: "Gestos",
    emojis: "👍 👎 👌 ✌️ 🤞 🤝 👏 🙌 👋 💪 👉 👈 👆 👇 ☝️ ✋ 🤙 🫶 ✍️".split(" "),
  },
  {
    label: "Símbolos",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 💔 ✅ ❌ ⚠️ ❗ ❓ ⭐ 🌟 ✨ 🔥 💯 🎉 🎁 🎂 🔔 📌 📍 ⏰ ⏳ 🕒".split(" "),
  },
  {
    label: "Objetos",
    emojis: "📱 💻 📞 ✉️ 📧 📄 📎 📷 🛒 🛍️ 💰 💵 💳 🧾 📦 🚚 🏠 🏢 🗓️ 📅 🔑 🔒 💡 🚗 ☕ 🍕".split(" "),
  },
];

type EmojiPickerProps = {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
  className?: string;
};

/** Botão com uma grade de emojis comuns; o escolhido entra onde está o cursor (quem usa decide). */
export const EmojiPicker: FC<EmojiPickerProps> = ({ onSelect, disabled, className }) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="icon" disabled={disabled} aria-label="Emojis" className={className}>
          <Smile />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="top"
        className="max-h-72 w-72 overflow-y-auto p-2"
        // O foco volta para a caixa de mensagem, não para o botão
        onCloseAutoFocus={(event) => event.preventDefault()}
      >
        {EMOJI_GROUPS.map((group) => (
          <div key={group.label} className="mb-2 last:mb-0">
            <p className="text-muted-foreground mb-1 px-1 text-[11px] font-medium">{group.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {group.emojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => onSelect(emoji)}
                  aria-label={emoji}
                  className={cn("hover:bg-muted flex h-8 w-8 items-center justify-center rounded text-lg leading-none")}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
};
