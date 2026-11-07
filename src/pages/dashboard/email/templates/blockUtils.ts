export const blockLabels: Record<EmailBlock["type"], string> = {
  heading: "Título",
  text: "Texto",
  image: "Imagem",
  button: "Botão",
  divider: "Divisor",
  spacer: "Espaço",
  columns: "Duas colunas",
  social: "Redes sociais",
};

export const columnBlockTypes: EmailColumnBlock["type"][] = ["heading", "text", "image", "button"];

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b${Date.now()}${Math.random()}`);

export function createBlock(type: EmailBlock["type"]): EmailBlock {
  const id = newId();
  switch (type) {
    case "heading":
      return { id, type, text: "Título", align: "left", level: 1 };
    case "text":
      return { id, type, text: "Escreva aqui. Use **negrito**, _itálico_ e [links](https://).", align: "left" };
    case "image":
      return { id, type, url: "", alt: "", link: null, width: 100, align: "center" };
    case "button":
      return { id, type, text: "Saiba mais", url: "https://", align: "center", color: null };
    case "divider":
      return { id, type };
    case "spacer":
      return { id, type, height: 24 };
    case "columns":
      return { id, type, columns: [[createBlock("text") as EmailTextBlock], [createBlock("text") as EmailTextBlock]] };
    case "social":
      return { id, type, links: [{ network: "instagram", url: "https://instagram.com/" }], align: "center" };
  }
}

/** Cópia com ids novos, para duplicar um bloco. */
export function cloneBlock(block: EmailBlock): EmailBlock {
  const copy = { ...structuredClone(block), id: newId() } as EmailBlock;
  if (copy.type === "columns")
    copy.columns = [copy.columns[0].map((item) => ({ ...item, id: newId() })), copy.columns[1].map((item) => ({ ...item, id: newId() }))];
  return copy;
}

/** Resumo do bloco na lista da esquerda. */
export function blockSummary(block: EmailBlock): string {
  switch (block.type) {
    case "heading":
    case "text":
    case "button":
      return block.text.replace(/\s+/g, " ").slice(0, 60);
    case "image":
      return block.url ? block.alt || "imagem" : "sem imagem";
    case "spacer":
      return `${block.height}px`;
    case "social":
      return block.links.map((link) => link.network).join(", ");
    default:
      return "";
  }
}

export function moveItem<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items;
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}
