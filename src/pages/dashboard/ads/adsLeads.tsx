import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { metaAdsService } from "@/services/api/metaAdsService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Download, FileText, Phone, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { leadStatusInfo } from "./adsUtils";

const leadAnswer = (lead: AdLead, keys: string[]) =>
  lead.fields.find((field) => keys.includes(field.name.toLowerCase()))?.values.join(", ") ?? null;

/** Últimos leads de formulário, com o que virou contato e o que precisa de atenção. */
export const AdsLeads = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();

  const leadsQuery = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["metaAds", "leads", client.id],
    queryFn: () => metaAdsService.findLeads({ params: { clientId: client.id } }),
    // Um lead recém-chegado é processado na fila
    refetchInterval: (query) => (query.state.data?.some((lead) => lead.status === "PENDING") ? 5000 : false),
  });

  const [metaLeadId, setMetaLeadId] = useState("");
  const [phoneLead, setPhoneLead] = useState<AdLead | null>(null);
  const [phone, setPhone] = useState("");

  const invalidateLeads = () => queryClient.invalidateQueries({ queryKey: ["metaAds", "leads"] });
  const importLead = useMutation({
    mutationFn: metaAdsService.importLead,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidateLeads();
      setMetaLeadId("");
      toast.success("Lead encontrado na Meta. Processando...");
    },
  });
  const setLeadPhone = useMutation({
    mutationFn: metaAdsService.setLeadPhone,
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidateLeads();
      setPhoneLead(null);
      toast.success("Telefone salvo. Processando o lead de novo...");
    },
  });

  const retryLead = useMutation({
    mutationFn: metaAdsService.retryLead,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["metaAds", "leads"] });
      toast.success("Lead enviado para processar de novo");
    },
  });

  if (leadsQuery.isLoading) return <LoadingState />;
  if (leadsQuery.isError)
    return (
      <ErrorState message="Não foi possível carregar os leads." onRetry={() => leadsQuery.refetch()} isRetrying={leadsQuery.isFetching} />
    );

  const leads = leadsQuery.data ?? [];

  // Para leads que não chegam pelo webhook, como o lead de verificação do conjunto de dados
  const importBar = can("ads.manage") && (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const id = metaLeadId.trim();
        if (id) importLead.mutate({ params: { clientId: client.id }, body: { metaLeadId: id } });
      }}
    >
      <Input
        className="max-w-64"
        inputMode="numeric"
        placeholder="Id do lead na Meta"
        aria-label="Id do lead na Meta"
        value={metaLeadId}
        onChange={(event) => setMetaLeadId(event.target.value.replace(/\D/g, ""))}
      />
      <Button type="submit" variant="outline" size="sm" disabled={!metaLeadId.trim() || importLead.isPending}>
        <Download className="h-3.5 w-3.5" />
        {importLead.isPending ? "Buscando..." : "Importar lead"}
      </Button>
      <p className="text-muted-foreground text-xs">
        Use para leads que não chegaram sozinhos, como o lead de verificação do conjunto de dados.
      </p>
    </form>
  );

  const phoneDialog = (
    <Dialog open={!!phoneLead} onOpenChange={(open) => !open && setPhoneLead(null)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Informar telefone</DialogTitle>
          <DialogDescription>
            O formulário não trouxe um telefone válido. O lead será processado de novo com este número, que fica registrado como informado
            no ZapMonitor.
          </DialogDescription>
        </DialogHeader>
        <form
          id="lead-phone-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (phoneLead && phone.trim())
              setLeadPhone.mutate({ params: { clientId: client.id, leadId: phoneLead.id }, body: { phone: phone.trim() } });
          }}
        >
          <Input
            autoFocus
            type="tel"
            placeholder="(11) 99999-8888"
            aria-label="Telefone"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => setPhoneLead(null)}>
            Cancelar
          </Button>
          <Button type="submit" form="lead-phone-form" disabled={!phone.trim() || setLeadPhone.isPending}>
            Salvar e processar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (leads.length === 0)
    return (
      <div className="space-y-4">
        {importBar}
        <EmptyState
          icon={FileText}
          title="Nenhum lead de formulário recebido"
          description={
            can("ads.manage")
              ? "Ligue as páginas com formulários de cadastro nas configurações para os leads virarem negócio."
              : "Peça a um administrador para ligar as páginas com formulários de cadastro."
          }
          action={
            can("ads.manage") && (
              <Button asChild>
                <Link to={`${baseUrl}/configuration?tab=metaAds`}>Ligar páginas</Link>
              </Button>
            )
          }
        />
      </div>
    );

  return (
    <div className="space-y-4">
      {importBar}
      {phoneDialog}
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recebido</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Página</TableHead>
              <TableHead>Situação</TableHead>
              <TableHead>Negócio</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const status = leadStatusInfo[lead.status];
              return (
                <TableRow key={lead.id}>
                  <TableCell className="text-xs whitespace-nowrap">
                    {format(new Date(lead.leadCreatedAt ?? lead.createdAt), "dd/MM HH:mm")}
                  </TableCell>
                  <TableCell className="text-sm">{leadAnswer(lead, ["full_name", "nome", "nome completo"]) ?? "—"}</TableCell>
                  <TableCell className="text-sm whitespace-nowrap">
                    {lead.manualPhone ? (
                      <span title="Informado no ZapMonitor">{lead.manualPhone} (informado)</span>
                    ) : (
                      (leadAnswer(lead, ["phone_number", "telefone", "celular", "whatsapp"]) ?? "—")
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{lead.pageName ?? "—"}</TableCell>
                  <TableCell>
                    <span
                      className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", status.className)}
                      title={lead.error ?? undefined}
                    >
                      {status.label}
                    </span>
                    {lead.error && lead.status !== "CREATED" && <p className="text-muted-foreground mt-1 max-w-56 text-xs">{lead.error}</p>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {lead.dealId ? (
                      <Link to={`${baseUrl}/crm`} className="text-primary hover:underline">
                        {lead.dealTitle ?? "Abrir CRM"}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    {can("ads.manage") && lead.status === "NO_PHONE" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setPhone(lead.manualPhone ?? "");
                          setPhoneLead(lead);
                        }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                        Informar telefone
                      </Button>
                    )}
                    {can("ads.manage") && (lead.status === "FAILED" || lead.status === "NO_PHONE") && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={retryLead.isPending}
                        onClick={() => retryLead.mutate({ params: { clientId: client.id, leadId: lead.id } })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Processar de novo
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
