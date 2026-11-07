import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Phone, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useDebounceValue } from "usehooks-ts";
import { contactDisplayName } from "./contactUtils";
import { ImportContactsDialog } from "./components/importContactsDialog";

const TAKE = 20;

const DialogNewContact = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  const create = useMutation({
    mutationFn: () =>
      contactService.create(client.id, {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      }),
    onError: requestErrorHandling,
    onSuccess: (contact) => {
      queryClient.invalidateQueries({ queryKey: ["contacts", "list", client.id] });
      setIsOpen(false);
      navigate(`${baseUrl}/contacts/${contact.id}`);
    },
  });

  const isValid = !!(name.trim() || phone.trim() || email.trim());

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) create.mutate();
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          setName("");
          setPhone("");
          setEmail("");
        }
        setIsOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Novo contato
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Novo contato</DialogTitle>
            <DialogDescription>Informe pelo menos o nome, o telefone ou o e-mail. O resto pode ser preenchido na ficha.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="new-contact-name">Nome</Label>
            <Input id="new-contact-name" value={name} maxLength={191} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-contact-phone">Telefone</Label>
            <Input
              id="new-contact-phone"
              value={phone}
              maxLength={40}
              placeholder="(21) 98086-2828"
              onChange={(event) => setPhone(event.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="new-contact-email">E-mail</Label>
            <Input
              id="new-contact-email"
              type="email"
              value={email}
              maxLength={191}
              placeholder="nome@empresa.com"
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!isValid || create.isPending}>
              Criar contato
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const Contacts = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search.trim(), 400);
  const [page, setPage] = useState(1);

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["contacts", "list", client.id, debouncedSearch, page],
    queryFn: () => contactService.findAll(client.id, { page, take: TAKE, search: debouncedSearch || undefined }),
  });

  const items = query.data?.items ?? [];
  const pages = Math.max(1, Math.ceil((query.data?.total ?? 0) / TAKE));

  return (
    <div className="flex h-full flex-col gap-4 overflow-auto p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Contatos</h1>
          <p className="text-muted-foreground text-sm">
            A ficha de cada pessoa, com os telefones, os e-mails, os campos, as conversas e os negócios.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {can("contacts.manage") && <ImportContactsDialog />}
          <DialogNewContact />
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        <Input
          aria-label="Buscar contatos"
          placeholder="Buscar por nome, documento, telefone ou e-mail"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          className="pl-9"
        />
      </div>

      {query.isLoading && <LoadingState label="Carregando contatos..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar os contatos." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title={debouncedSearch ? "Nenhum contato encontrado" : "Nenhum contato ainda"}
          description={
            debouncedSearch
              ? "Confira o nome, o telefone ou o e-mail digitado."
              : "Os contatos aparecem aqui quando alguém conversa no WhatsApp, chega por formulário ou é cadastrado."
          }
        />
      )}

      {items.length > 0 && (
        <ul className="divide-y rounded-xl border">
          {items.map((contact) => (
            <li key={contact.id}>
              <Link
                to={`${baseUrl}/contacts/${contact.id}`}
                className="hover:bg-accent/40 focus-visible:ring-ring grid gap-1 px-4 py-3 outline-none focus-visible:ring-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-4"
              >
                <span className="truncate font-medium">{contactDisplayName(contact)}</span>
                <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate tabular-nums">{contact.phone ?? "—"}</span>
                  {contact.phoneCount > 1 && <span className="text-xs">+{contact.phoneCount - 1}</span>}
                </span>
                <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{contact.email ?? "—"}</span>
                  {contact.emailCount > 1 && <span className="text-xs">+{contact.emailCount - 1}</span>}
                </span>
                <span className="text-muted-foreground text-xs whitespace-nowrap">
                  {contact.dealCount > 0 ? `${contact.dealCount} ${contact.dealCount === 1 ? "negócio" : "negócios"}` : ""}
                </span>
              </Link>
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
    </div>
  );
};
