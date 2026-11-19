import type { ReactNode } from "react";

const fold = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLocaleLowerCase();

/** Texto com o termo marcado, sem diferenciar maiúsculas e acentos (como a busca do servidor). */
export const HighlightText = ({ text, term }: { text: string; term: string }) => {
  const needle = fold(term.trim());
  if (!needle) return <>{text}</>;

  const haystack = fold(text);
  const parts: ReactNode[] = [];
  let cursor = 0;
  // Os acentos comuns do português viram um caractere só no texto original: as posições batem
  for (let index = haystack.indexOf(needle); index >= 0; index = haystack.indexOf(needle, index + needle.length)) {
    if (index > cursor) parts.push(text.slice(cursor, index));
    parts.push(
      <mark key={index} className="rounded-sm bg-yellow-200 px-0.5 text-inherit dark:bg-yellow-500/40">
        {text.slice(index, index + needle.length)}
      </mark>,
    );
    cursor = index + needle.length;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <>{parts}</>;
};
