import { Fragment, type FC, type ReactNode } from "react";

/** **negrito** vira <strong>; o resto é texto puro (nada de HTML vindo da IA). */
const renderInline = (text: string): ReactNode[] =>
  text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, index) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={index}>{part.slice(2, -2)}</strong>
      ) : (
        <Fragment key={index}>{part}</Fragment>
      ),
    );

/** Texto da IA com parágrafos, listas com "-", "*" ou "1." e negrito. */
export const AdvisorText: FC<{ text: string }> = ({ text }) => {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  let ordered = false;

  const flushList = () => {
    if (list.length === 0) return;
    const items = list.map((item, index) => <li key={index}>{renderInline(item)}</li>);
    blocks.push(
      ordered ? (
        <ol key={blocks.length} className="list-decimal space-y-1 pl-5">
          {items}
        </ol>
      ) : (
        <ul key={blocks.length} className="list-disc space-y-1 pl-5">
          {items}
        </ul>
      ),
    );
    list = [];
  };

  for (const line of text.split("\n")) {
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    const numbered = line.match(/^\s*\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      if (list.length && ordered !== !!numbered) flushList();
      ordered = !!numbered;
      list.push((bullet ?? numbered)![1]);
      continue;
    }

    flushList();
    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading)
      blocks.push(
        <p key={blocks.length} className="font-semibold">
          {renderInline(heading[1])}
        </p>,
      );
    else if (line.trim()) blocks.push(<p key={blocks.length}>{renderInline(line)}</p>);
  }
  flushList();

  return <div className="space-y-2 text-sm leading-relaxed">{blocks}</div>;
};
