import { useMemo } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import type { FC } from "react";
import { cn } from "@/lib/utils";
import { formatAcronym } from "@/utils/formatString";

type ContactAvatarProps = {
  contact: WhatsappContactMessage;
  size?: "sm" | "md";
  className?: string;
};

const avatarPalette = [
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
  "bg-emerald-100 text-emerald-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-fuchsia-100 text-fuchsia-700",
];

const getAvatarColorByInitial = (initial: string) => {
  const letter = initial.trim().charAt(0).toUpperCase();
  if (!letter) return "bg-muted text-muted-foreground";

  return avatarPalette[letter.charCodeAt(0) % avatarPalette.length];
};

export const ContactAvatar: FC<ContactAvatarProps> = ({ contact, size, className }) => {
  const contactInitial = useMemo(() => formatAcronym(contact.surname || contact.name || "") || "SN", [contact.surname, contact.name]);
  const avatarColor = useMemo(() => getAvatarColorByInitial(contactInitial), [contactInitial]);

  const sz = size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";

  return (
    <Avatar size="default" className={cn("border-border/30 h-8 w-8 border", sz, className)}>
      <AvatarFallback className={cn("text-xs font-semibold", avatarColor)}>{contactInitial || "?"}</AvatarFallback>
    </Avatar>
  );
};
