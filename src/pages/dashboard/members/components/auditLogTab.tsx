import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { memberService } from "@/services/api/memberService";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { endOfDay, format, startOfDay } from "date-fns";
import { History } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

const auditEntityTypeLabel: Record<AuditEntityType, string> = {
  FLOW: "Fluxos",
  AI_AGENT: "Agentes de IA",
  SERVICE_GROUP: "Grupos de atendimento",
  WHATSAPP_NUMBER: "Números de WhatsApp",
  PERMISSION_GROUP: "Grupos de permissão",
  MEMBER: "Usuários",
  INVITATION: "Convites",
  SETTINGS: "Configurações",
  OFFER: "Ofertas",
};

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border bg-transparent px-3 py-1 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm";

const PAGE_SIZE = 20;

/** Quem mudou o quê e quando: fluxos, agentes, grupos, números, equipe e acessos. */
export const AuditLogTab = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const [entityType, setEntityType] = useState<AuditEntityType | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);

  // Datas do filtro são dias inteiros no fuso de quem está vendo
  const fromIso = from ? startOfDay(new Date(`${from}T00:00:00`)).toISOString() : undefined;
  const toIso = to ? endOfDay(new Date(`${to}T00:00:00`)).toISOString() : undefined;

  const auditQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["auditLogs", client.id, entityType, fromIso, toIso, page],
    queryFn: () =>
      memberService.findAuditLogs(client.id, {
        page,
        take: PAGE_SIZE,
        entityType: entityType ? [entityType] : undefined,
        from: fromIso,
        to: toIso,
      }),
    placeholderData: keepPreviousData,
  });

  const changeFilter = (apply: () => void) => {
    apply();
    setPage(1);
  };

  const data = auditQuery.data;
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));
  const hasFilters = !!entityType || !!from || !!to;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="audit-type">Tipo</Label>
          <select
            id="audit-type"
            value={entityType}
            onChange={(event) => changeFilter(() => setEntityType(event.target.value as AuditEntityType | ""))}
            className={selectClassName}
          >
            <option value="">Todos os tipos</option>
            {Object.entries(auditEntityTypeLabel).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-from">De</Label>
          <Input
            id="audit-from"
            type="date"
            value={from}
            max={to || undefined}
            onChange={(event) => changeFilter(() => setFrom(event.target.value))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="audit-to">Até</Label>
          <Input
            id="audit-to"
            type="date"
            value={to}
            min={from || undefined}
            onChange={(event) => changeFilter(() => setTo(event.target.value))}
          />
        </div>
      </div>

      {auditQuery.isLoading && <LoadingState label="Carregando histórico..." />}
      {auditQuery.isError && (
        <ErrorState
          message="Não foi possível buscar o histórico."
          onRetry={() => auditQuery.refetch()}
          isRetrying={auditQuery.isFetching}
        />
      )}

      {data && data.items.length === 0 && (
        <EmptyState
          icon={History}
          title={hasFilters ? "Nada encontrado com estes filtros" : "Nenhuma alteração registrada ainda"}
          description={
            hasFilters
              ? "Mude o tipo ou o período."
              : "Mudanças em fluxos, agentes de IA, grupos, números, usuários e permissões aparecem aqui."
          }
        />
      )}

      {data && data.items.length > 0 && (
        <ul className="divide-y rounded-lg border">
          {data.items.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-start sm:gap-4">
              <span className="text-muted-foreground shrink-0 text-xs tabular-nums sm:w-28 sm:pt-0.5">
                {format(new Date(entry.createdAt), "dd/MM/yyyy HH:mm")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="break-words">{entry.summary}</p>
                <p className="text-muted-foreground text-xs">{entry.userName ?? "Sistema"}</p>
              </div>
              <Badge variant="outline" className="w-fit shrink-0">
                {auditEntityTypeLabel[entry.entityType] ?? entry.entityType}
              </Badge>
            </li>
          ))}
        </ul>
      )}

      {data && (data.canPreviousPage || data.canNextPage) && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <Button variant="outline" size="sm" disabled={!data.canPreviousPage} onClick={() => setPage((current) => current - 1)}>
            Anterior
          </Button>
          <span className="text-muted-foreground tabular-nums">
            Página {page} de {pageCount}
          </span>
          <Button variant="outline" size="sm" disabled={!data.canNextPage} onClick={() => setPage((current) => current + 1)}>
            Próxima
          </Button>
        </div>
      )}

      <p className="text-muted-foreground text-xs">
        O que foi feito pelo assistente fica no{" "}
        <Link to={`${baseUrl}/assistant?tab=historico`} className="underline underline-offset-4">
          histórico do assistente
        </Link>
        .
      </p>
    </div>
  );
};
