import { scriptChannelLabel, scriptMethodLabel } from "./salesScriptUtils";

const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const list = (title: string, items: string[]) =>
  items.length ? `<h4>${title}</h4><ul>${items.map((item) => `<li>${escape(item)}</li>`).join("")}</ul>` : "";

/** Página do roteiro pronta para imprimir; no diálogo de impressão a pessoa escolhe "Salvar como PDF". */
export function buildSalesScriptPrintHtml(script: SalesScriptData, offerName: string | null): string {
  const stages = script.stages
    .map(
      (stage, index) => `<section class="stage">
  <h3>${index + 1}. ${escape(stage.name)}</h3>
  ${stage.goal ? `<p class="goal">${escape(stage.goal)}</p>` : ""}
  ${list("Perguntas", stage.questions)}
  ${list("Falas", stage.lines)}
  ${list("Sinais para avançar", stage.advanceSignals)}
  ${list("Evite", stage.avoid)}
</section>`,
    )
    .join("");

  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(script.name)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#111;margin:32px;line-height:1.45}
  h1{font-size:22px;margin:0 0 4px} .meta{color:#555;font-size:13px;margin-bottom:20px}
  .stage{border:1px solid #ddd;border-radius:8px;padding:12px 16px;margin:0 0 12px;break-inside:avoid}
  h3{margin:0 0 6px;font-size:16px} h4{margin:10px 0 4px;font-size:13px;color:#333}
  .goal{margin:0 0 4px;color:#333} ul{margin:0;padding-left:20px} li{margin:2px 0}
  .notes{white-space:pre-wrap;border-top:1px solid #ddd;padding-top:12px;margin-top:16px}
  @media print{body{margin:12mm}}
</style></head><body>
<h1>${escape(script.name)}</h1>
<p class="meta">${escape(offerName ?? "Atendimento em geral")} · ${escape(scriptChannelLabel[script.channel])} · ${escape(scriptMethodLabel[script.method].label)}</p>
${stages}
${script.notes ? `<div class="notes"><h4>Regras gerais</h4>${escape(script.notes)}</div>` : ""}
<script>window.addEventListener("load",function(){setTimeout(function(){window.print()},200)})</script>
</body></html>`;
}

/** Abre o roteiro numa aba e chama a impressão; falso quando o navegador bloqueia a aba. */
export function printSalesScript(script: SalesScriptData, offerName: string | null): boolean {
  const html = buildSalesScriptPrintHtml(script, offerName);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const opened = window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return !!opened;
}
