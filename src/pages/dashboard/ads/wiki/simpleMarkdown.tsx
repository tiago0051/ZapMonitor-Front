import { Fragment, type FC, type ReactNode } from "react";

// Markdown dos artigos da wiki: títulos, listas, citações, tabelas, negrito, itálico e links.
// Monta elementos do React (nunca HTML cru), então o texto do dono não consegue injetar nada na página.

type Block =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "quote"; text: string }
  | { kind: "table"; header: string[]; rows: string[][] };

const LIST_ITEM = /^\s*(?:[-*]|(\d+)\.)\s+(.*)$/;
const splitRow = (line: string) =>
  line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
const isTableSeparator = (line: string) => /^\s*\|?\s*:?-{2,}/.test(line);

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim()) {
      index++;
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length <= 2 ? 2 : 3, text: heading[2] });
      index++;
      continue;
    }

    if (line.trim().startsWith("|")) {
      const tableLines: string[] = [];
      while (index < lines.length && lines[index].trim().startsWith("|")) tableLines.push(lines[index++]);
      const [header, ...rest] = tableLines;
      blocks.push({ kind: "table", header: splitRow(header), rows: rest.filter((row) => !isTableSeparator(row)).map(splitRow) });
      continue;
    }

    if (line.startsWith(">")) {
      const quote: string[] = [];
      while (index < lines.length && lines[index].startsWith(">")) quote.push(lines[index++].replace(/^>\s?/, ""));
      blocks.push({ kind: "quote", text: quote.join(" ") });
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const ordered = !!item[1];
      const items: string[] = [];
      while (index < lines.length) {
        const match = LIST_ITEM.exec(lines[index]);
        if (!match || !!match[1] !== ordered) break;
        items.push(match[2]);
        index++;
      }
      blocks.push({ kind: "list", ordered, items });
      continue;
    }

    const paragraph: string[] = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,3})\s/.test(lines[index]) &&
      !LIST_ITEM.test(lines[index]) &&
      !lines[index].startsWith(">") &&
      !lines[index].trim().startsWith("|")
    )
      paragraph.push(lines[index++]);
    blocks.push({ kind: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
const isSafeUrl = (url: string) => /^https?:\/\//i.test(url);

function renderInline(text: string): ReactNode {
  return text.split(INLINE).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) return <em key={index}>{part.slice(1, -1)}</em>;
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link)
      return isSafeUrl(link[2]) ? (
        <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
          {link[1]}
        </a>
      ) : (
        link[1]
      );
    return <Fragment key={index}>{part}</Fragment>;
  });
}

export const SimpleMarkdown: FC<{ markdown: string }> = ({ markdown }) => (
  <div className="space-y-3 text-sm leading-relaxed">
    {parseBlocks(markdown).map((block, index) => {
      switch (block.kind) {
        case "heading":
          return block.level === 2 ? (
            <h3 key={index} className="pt-2 text-base font-semibold">
              {renderInline(block.text)}
            </h3>
          ) : (
            <h4 key={index} className="pt-1 text-sm font-semibold">
              {renderInline(block.text)}
            </h4>
          );
        case "quote":
          return (
            <blockquote key={index} className="text-muted-foreground border-l-2 pl-3 italic">
              {renderInline(block.text)}
            </blockquote>
          );
        case "list": {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List key={index} className={block.ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}>
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderInline(item)}</li>
              ))}
            </List>
          );
        }
        case "table":
          return (
            <div key={index} className="overflow-x-auto rounded-md border">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    {block.header.map((cell, cellIndex) => (
                      <th key={cellIndex} className="px-3 py-2 font-medium">
                        {renderInline(cell)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex} className="border-t">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-3 py-2 align-top">
                          {renderInline(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        default:
          return <p key={index}>{renderInline(block.text)}</p>;
      }
    })}
  </div>
);
