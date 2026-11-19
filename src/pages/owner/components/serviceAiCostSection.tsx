import { EmptyState } from "@/components/state-message";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ReactNode } from "react";
import { formatCurrency, formatCurrencyPrecise, formatNumber } from "../ownerFormat";

const MobileValue = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <dt className="text-muted-foreground text-xs">{label}</dt>
    <dd className="text-sm font-semibold tabular-nums">{children}</dd>
  </div>
);

const agentShare = (row: ServiceAiCostRow) => (row.tokens > 0 ? `${Math.round((row.agentTokens / row.tokens) * 100)}%` : "–");

/**
 * Tokens e custo de IA por atendimento no mês: tudo o que a IA consumiu em nome de um atendimento (respostas dos agentes,
 * condições do fluxo, leituras de áudio/imagem/PDF e o resumo), vezes o custo por milhão de tokens da tabela.
 */
export const ServiceAiCostSection = ({ serviceAiCost }: { serviceAiCost: ServiceAiCost }) => {
  const isMobile = useIsMobile();
  const { total, clients, costPerMillionTokens } = serviceAiCost;
  const clientsWithServices = clients.filter((client) => client.services > 0 || client.tokens > 0);

  const summary = [
    { label: "Tokens por atendimento com IA", value: formatNumber(total.tokensPerServiceWithAi) },
    { label: "Custo por atendimento com IA", value: formatCurrencyPrecise(total.costPerServiceWithAi) },
    { label: "Custo por atendimento (todos)", value: formatCurrencyPrecise(total.costPerService) },
    { label: "Atendimentos com IA", value: `${formatNumber(total.servicesWithAi)} de ${formatNumber(total.services)}` },
    { label: "Custo de IA nos atendimentos", value: formatCurrency(total.cost) },
  ];

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Custo de IA por atendimento</CardTitle>
        <CardDescription>
          Tokens que a IA consumiu em cada atendimento — respostas dos agentes, condições do fluxo, leitura de mídia e resumo —
          a {formatCurrency(costPerMillionTokens)} por milhão de tokens. Atendimentos de teste ficam de fora; o consumo de
          antes desta medição não tem atendimento ligado e não entra.
        </CardDescription>
      </CardHeader>
      <div className="flex flex-col gap-3 px-6">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {summary.map((item) => (
            <Card key={item.label} className="gap-1 py-3">
              <CardHeader className="px-4">
                <CardDescription>{item.label}</CardDescription>
                <CardTitle className="text-base break-words tabular-nums sm:text-lg">{item.value}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        {clientsWithServices.length === 0 ? (
          <EmptyState title="Nenhum atendimento com plano ativo neste mês" />
        ) : isMobile ? (
          <ul className="space-y-3">
            {clientsWithServices.map((client) => (
              <li key={client.id} className="rounded-lg border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate font-medium">{client.name}</p>
                  <p className="shrink-0 text-right text-sm font-semibold tabular-nums">
                    <span className="text-muted-foreground block text-xs font-normal">Por atendimento com IA</span>
                    {formatCurrencyPrecise(client.costPerServiceWithAi)}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-2">
                  <MobileValue label="Atendimentos (com IA)">
                    {formatNumber(client.services)} ({formatNumber(client.servicesWithAi)})
                  </MobileValue>
                  <MobileValue label="Tokens por atendimento com IA">{formatNumber(client.tokensPerServiceWithAi)}</MobileValue>
                  <MobileValue label="Respostas dos agentes">{agentShare(client)}</MobileValue>
                  <MobileValue label="Por atendimento (todos)">{formatCurrencyPrecise(client.costPerService)}</MobileValue>
                  <MobileValue label="Custo no mês">{formatCurrency(client.cost)}</MobileValue>
                </dl>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto pb-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead className="text-right">Atendimentos</TableHead>
                  <TableHead className="text-right">Com IA</TableHead>
                  <TableHead className="text-right">Tokens</TableHead>
                  <TableHead className="text-right">Entrada / saída</TableHead>
                  <TableHead className="text-right">Agentes</TableHead>
                  <TableHead className="text-right">Tokens por atend. com IA</TableHead>
                  <TableHead className="text-right">Custo no mês</TableHead>
                  <TableHead className="text-right">Por atend. (todos)</TableHead>
                  <TableHead className="text-right">Por atend. com IA</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientsWithServices.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(client.services)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(client.servicesWithAi)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(client.tokens)}</TableCell>
                    <TableCell className="text-muted-foreground text-right text-xs tabular-nums">
                      {formatNumber(client.inputTokens)} / {formatNumber(client.outputTokens)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{agentShare(client)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(client.tokensPerServiceWithAi)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrency(client.cost)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatCurrencyPrecise(client.costPerService)}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatCurrencyPrecise(client.costPerServiceWithAi)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </Card>
  );
};
