import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { emailSendingService } from "@/services/api/emailSendingService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Check, Copy } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";

const statusInfo: Record<EmailSenderStatus, { label: string; className: string }> = {
  VERIFIED: { label: "Verificado", className: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
  PENDING: { label: "Aguardando o DNS", className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
  FAILED: { label: "Falhou", className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300" },
};

const percent = (part: number, total: number) => (total ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "—");

const sendersKey = (clientId: string) => ["emailSending", "senders", clientId];

const CopyButton: FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-7 w-7 shrink-0"
      aria-label={`Copiar ${label}`}
      onClick={() =>
        navigator.clipboard
          .writeText(value)
          .then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          })
          .catch(() => toast.error("Não foi possível copiar; selecione o texto"))
      }
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
};

const DialogNewSender: FC = () => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState("");
  const [fromLocalPart, setFromLocalPart] = useState("contato");
  const [fromName, setFromName] = useState("");
  const [replyTo, setReplyTo] = useState("");

  const create = useMutation({
    mutationFn: () =>
      emailSendingService.createSender(client.id, { domain, fromLocalPart, fromName, replyTo: replyTo.trim() || undefined }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sendersKey(client.id) });
      setIsOpen(false);
      toast.success("Remetente criado. Cadastre os registros DNS para verificar o domínio");
    },
  });

  const isValid = domain.trim() && fromLocalPart.trim() && fromName.trim();
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) create.mutate();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setDomain("");
          setFromLocalPart("contato");
          setFromName("");
          setReplyTo("");
        }
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button>Novo remetente</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Novo remetente</DialogTitle>
            <DialogDescription>
              Use um domínio da empresa. Depois de criar, cadastre os registros DNS que aparecem no remetente; a verificação costuma levar
              alguns minutos.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="sender-domain">Domínio</Label>
            <Input
              id="sender-domain"
              value={domain}
              placeholder="maxcred.net.br"
              maxLength={191}
              onChange={(event) => setDomain(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sender-local">Endereço do remetente</Label>
            <div className="flex items-center gap-2">
              <Input
                id="sender-local"
                value={fromLocalPart}
                maxLength={64}
                onChange={(event) => setFromLocalPart(event.target.value)}
                className="min-w-0 flex-1"
              />
              <span className="text-muted-foreground truncate text-sm">@{domain.trim() || "dominio.com.br"}</span>
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sender-name">Nome que aparece para quem recebe</Label>
            <Input
              id="sender-name"
              value={fromName}
              maxLength={100}
              placeholder="Maxcred"
              onChange={(event) => setFromName(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sender-reply">Responder para (opcional)</Label>
            <Input
              id="sender-reply"
              type="email"
              value={replyTo}
              maxLength={191}
              placeholder="atendimento@maxcred.net.br"
              onChange={(event) => setReplyTo(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!isValid || create.isPending}>
              Criar remetente
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const SenderCard: FC<{ sender: EmailSender }> = ({ sender }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [testTo, setTestTo] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDns, setShowDns] = useState(sender.status !== "VERIFIED");

  const refresh = () => queryClient.invalidateQueries({ queryKey: sendersKey(client.id) });

  const verify = useMutation({
    mutationFn: () => emailSendingService.verifySender(client.id, sender.id),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      refresh();
      if (updated.status === "VERIFIED") toast.success("Domínio verificado; o remetente já pode enviar");
      else toast.info("Os registros DNS ainda não foram encontrados. Pode levar alguns minutos depois de cadastrar");
    },
  });
  const sendTest = useMutation({
    mutationFn: () => emailSendingService.sendTest(client.id, sender.id, testTo),
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success(`E-mail de teste enviado para ${testTo}`);
      setTestTo("");
    },
  });
  const remove = useMutation({
    mutationFn: () => emailSendingService.deleteSender(client.id, sender.id),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Remetente removido");
    },
  });

  const status = statusInfo[sender.status];
  const { stats } = sender;

  return (
    <li className="grid gap-4 rounded-xl border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold">{sender.fromName}</p>
          <p className="text-muted-foreground truncate text-sm">
            {sender.fromEmail}
            {sender.replyTo && ` · respostas para ${sender.replyTo}`}
          </p>
        </div>
        <span className={cn("rounded px-2 py-0.5 text-xs font-medium", status.className)}>{status.label}</span>
      </div>

      {sender.status === "VERIFIED" && (
        <dl className="grid grid-cols-2 gap-3 text-sm tabular-nums sm:grid-cols-4">
          <div>
            <dt className="text-muted-foreground text-xs">Enviados (30 dias)</dt>
            <dd className="font-medium">{stats.total.toLocaleString("pt-BR")}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Entregues</dt>
            <dd className="font-medium">{percent(stats.delivered, stats.total)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Rejeitados</dt>
            <dd className={cn("font-medium", stats.total && stats.bounced / stats.total > 0.05 && "text-destructive")}>
              {percent(stats.bounced, stats.total)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Reclamações</dt>
            <dd className={cn("font-medium", stats.total && stats.complained / stats.total > 0.001 && "text-destructive")}>
              {percent(stats.complained, stats.total)}
            </dd>
          </div>
        </dl>
      )}

      <div className="grid gap-2">
        <button
          type="button"
          className="text-primary justify-self-start text-sm underline-offset-2 hover:underline"
          aria-expanded={showDns}
          onClick={() => setShowDns((current) => !current)}
        >
          {showDns ? "Esconder" : "Ver"} os registros DNS
        </button>
        {showDns && (
          <div className="grid gap-2">
            <p className="text-muted-foreground text-xs">
              Cadastre estes registros no painel onde o domínio está hospedado (Registro.br, Cloudflare, GoDaddy...). Os marcados como
              obrigatórios verificam o domínio; SPF e DMARC melhoram a entrega.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Tipo</th>
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sender.dnsRecords.map((record) => (
                    <tr key={`${record.type}-${record.name}`} className="align-top">
                      <td className="px-3 py-2">
                        <span className="font-mono">{record.type}</span>
                        {record.required && <span className="text-muted-foreground block text-[10px]">obrigatório</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1">
                          <span className="font-mono break-all">{record.name}</span>
                          <CopyButton value={record.name} label="o nome do registro" />
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-start gap-1">
                          <span className="font-mono break-all">{record.value}</span>
                          <CopyButton value={record.value} label="o valor do registro" />
                        </div>
                        <p className="text-muted-foreground mt-1">{record.purpose}</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {sender.status !== "VERIFIED" && (
          <Button variant="outline" size="sm" disabled={verify.isPending} onClick={() => verify.mutate()}>
            Verificar agora
          </Button>
        )}
        {sender.lastCheckedAt && sender.status !== "VERIFIED" && (
          <span className="text-muted-foreground text-xs">última consulta {format(new Date(sender.lastCheckedAt), "dd/MM HH:mm")}</span>
        )}
        {sender.status === "VERIFIED" && (
          <form
            className="flex min-w-0 flex-1 flex-wrap gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (testTo.trim()) sendTest.mutate();
            }}
          >
            <Input
              type="email"
              aria-label="Enviar e-mail de teste para"
              placeholder="seu@email.com"
              value={testTo}
              onChange={(event) => setTestTo(event.target.value)}
              className="min-w-0 flex-1 basis-48"
            />
            <Button type="submit" variant="outline" size="sm" disabled={!testTo.trim() || sendTest.isPending}>
              Enviar teste
            </Button>
          </form>
        )}
        <div className="ml-auto flex gap-1">
          {confirmDelete ? (
            <>
              <Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate()}>
                Confirmar remoção
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmDelete(true)}>
              Remover
            </Button>
          )}
        </div>
      </div>
    </li>
  );
};

/** Remetentes do cliente: domínio, registros DNS, verificação, reputação e envio de teste. */
export const EmailSenders = () => {
  const { client } = useClientContext();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: sendersKey(client.id),
    queryFn: () => emailSendingService.findSenders(client.id),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Remetentes de e-mail</CardTitle>
          <CardDescription>
            Os e-mails saem com o domínio da empresa, assinados (DKIM), com descadastro em um clique e com rejeições e reclamações tratadas
            sozinhas. Rejeição acima de 5% ou reclamação acima de 0,1% aparecem em vermelho: o provedor pode bloquear o envio.
          </CardDescription>
        </div>
        <DialogNewSender />
      </CardHeader>
      <CardContent>
        {query.isLoading && <LoadingState label="Carregando remetentes..." />}
        {query.isError && (
          <ErrorState message="Não foi possível buscar os remetentes." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
        )}
        {query.isSuccess && query.data.length === 0 && (
          <EmptyState title="Nenhum remetente" description="Cadastre o domínio da empresa para enviar e-mails pelo ZapMonitor." />
        )}
        {!!query.data?.length && (
          <ul className="grid gap-3">
            {query.data.map((sender) => (
              <SenderCard key={sender.id} sender={sender} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

const reasonLabel: Record<EmailSuppressionReason, string> = {
  UNSUBSCRIBE: "Descadastrou",
  BOUNCE: "E-mail voltou",
  COMPLAINT: "Marcou como spam",
  MANUAL: "Incluído à mão",
};

const TAKE = 20;

/** E-mails que não recebem mais nada do cliente. */
export const EmailSuppressions = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState("");
  const queryKey = ["emailSending", "suppressions", client.id];

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: [...queryKey, search.trim(), page],
    queryFn: () => emailSendingService.findSuppressions(client.id, { page, take: TAKE, search: search.trim() || undefined }),
  });
  const add = useMutation({
    mutationFn: () => emailSendingService.addSuppression(client.id, email),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      setEmail("");
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => emailSendingService.removeSuppression(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const canEdit = can("emailSettings.manage");
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / TAKE));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Descadastrados</CardTitle>
        <CardDescription>
          Quem se descadastrou, marcou como spam ou teve o e-mail rejeitado de vez não recebe mais nenhum e-mail de campanha. Tirar alguém
          desta lista só vale com o consentimento da pessoa.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Input
            aria-label="Buscar e-mail"
            placeholder="Buscar e-mail"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            className="min-w-0 flex-1 basis-48"
          />
          {canEdit && (
            <form
              className="flex min-w-0 flex-1 basis-64 gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (email.trim()) add.mutate();
              }}
            >
              <Input
                type="email"
                aria-label="Incluir e-mail na lista"
                placeholder="Incluir e-mail"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-w-0 flex-1"
              />
              <Button type="submit" variant="outline" disabled={!email.trim() || add.isPending}>
                Incluir
              </Button>
            </form>
          )}
        </div>

        {query.isLoading && <LoadingState label="Carregando..." />}
        {query.isError && (
          <ErrorState message="Não foi possível buscar a lista." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
        )}
        {query.isSuccess && query.data.items.length === 0 && <p className="text-muted-foreground text-sm">Ninguém na lista.</p>}
        {!!query.data?.items.length && (
          <ul className="divide-y rounded-lg border">
            {query.data.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{item.email}</span>
                <Badge variant="secondary">{reasonLabel[item.reason]}</Badge>
                <span className="text-muted-foreground text-xs tabular-nums">{format(new Date(item.createdAt), "dd/MM/yyyy")}</span>
                {canEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate(item.id)}
                  >
                    Tirar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {pages > 1 && (
          <div className="flex items-center justify-end gap-2 text-sm">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
              Anterior
            </Button>
            <span className="text-muted-foreground tabular-nums">
              {page} de {pages}
            </span>
            <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(page + 1)}>
              Próxima
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const EmailSettings = () => (
  <div className="grid gap-6">
    <EmailSenders />
    <EmailSuppressions />
  </div>
);
