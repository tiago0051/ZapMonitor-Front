import { differenceInCalendarDays, format, isToday, isYesterday } from "date-fns";
import { parsePhoneNumber } from "libphonenumber-js";

export function formatShortId(id: string) {
  return id.split("-")[0];
}

export function formatAcronym(name: string) {
  const nameSplited = name.split(" ");

  if (nameSplited.length > 1) {
    const lastName = nameSplited[nameSplited.length - 1];
    if (lastName) return `${nameSplited[0][0]}${lastName[0]}`;
  }

  return `${nameSplited[0][0]}`;
}

export function formatShortName(name: string) {
  const nameSplited = name.split(" ");
  if (nameSplited.length > 1) {
    const lastName = nameSplited[nameSplited.length - 1];
    if (lastName) return `${nameSplited[0]} ${lastName}`;
  }

  return name;
}

// Marcadores do WhatsApp: precisam estar colados ao texto e fora de uma palavra, como em "*oi*" mas não em "2*3*4"
// "**texto**" (Markdown, comum nas respostas dos agentes de IA) também vira negrito
const WHATSAPP_STYLE_PATTERN = /(^|[^\p{L}\p{N}])(\*\*|[*_~])(?=\S)([^\n]*?\S)\2(?![\p{L}\p{N}])/u;
const WHATSAPP_MONOSPACE_PATTERN = /```([\s\S]+?)```/;

const whatsappStyleElements = { "**": "strong", "*": "strong", _: "em", "~": "s" } as const;

function formatWhatsappInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let rest = text;
  let index = 0;

  for (let match = WHATSAPP_STYLE_PATTERN.exec(rest); match; match = WHATSAPP_STYLE_PATTERN.exec(rest)) {
    const [whole, before, marker, content] = match;
    const Element = whatsappStyleElements[marker as keyof typeof whatsappStyleElements];
    const key = `${keyPrefix}-${index++}`;

    nodes.push(rest.slice(0, match.index) + before);
    // O conteúdo pode ter outros marcadores, como em "*_negrito e itálico_*"
    nodes.push(<Element key={key}>{formatWhatsappInline(content, key)}</Element>);
    rest = rest.slice(match.index + whole.length);
  }

  nodes.push(rest);
  return nodes.filter((node) => node !== "");
}

/** Aplica a formatação do WhatsApp: *negrito*, _itálico_, ~tachado~ e ```monoespaçado```. */
export function formatWhatsappText(text: string | null | undefined): React.ReactNode[] {
  if (!text) return [];

  // O bloco monoespaçado é literal: o que está dentro dele não é formatado
  return text.split(WHATSAPP_MONOSPACE_PATTERN).flatMap((part, index) =>
    index % 2 === 1
      ? [
          <code key={`code-${index}`} className="font-mono text-[0.95em]">
            {part}
          </code>,
        ]
      : formatWhatsappInline(part, `text-${index}`),
  );
}

export function formatPhoneNumber(phone: string) {
  const phoneNumberParsed = parsePhoneNumber(phone, "BR");
  return phoneNumberParsed ? phoneNumberParsed.formatInternational() : phone;
}

// Horário da última mensagem no estilo do WhatsApp: hora hoje, "Ontem", dia da semana na última semana, data depois disso
export function formatConversationTime(date: string | Date) {
  if (isToday(date)) return format(date, "HH:mm");
  if (isYesterday(date)) return "Ontem";
  if (differenceInCalendarDays(new Date(), date) < 7) {
    // "segunda-feira" vira "Segunda"
    const weekday = format(date, "EEEE").split("-")[0];
    return weekday.charAt(0).toUpperCase() + weekday.slice(1);
  }

  return format(date, "dd/MM/yy");
}
