// Marca de ordem de bytes: sem ela o Excel lê os acentos errado
const BOM = "\uFEFF";

type CsvCell = string | number | null | undefined;

const escapeCell = (value: CsvCell) => {
  if (value === null || value === undefined) return "";
  const text = typeof value === "number" ? value.toLocaleString("pt-BR", { maximumFractionDigits: 2, useGrouping: false }) : value;
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** CSV no jeito que o Excel em português abre direto: ponto e vírgula, vírgula decimal e BOM para os acentos. */
export function toCsv(rows: CsvCell[][]) {
  return `${BOM}${rows.map((row) => row.map(escapeCell).join(";")).join("\r\n")}`;
}

export function downloadCsv(fileName: string, rows: CsvCell[][]) {
  const url = URL.createObjectURL(new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.endsWith(".csv") ? fileName : `${fileName}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
