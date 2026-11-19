import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Filter, Mail, Phone, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { useDebounceValue } from "usehooks-ts";
import { contactDisplayName, duplicateContactFromError, type DuplicateContact } from "./contactUtils";
import { ImportContactsDialog } from "./components/importContactsDialog";
import { ContactBulkActions } from "./components/contactBulkActions";
import { SegmentBuilder, segmentSelectClassName } from "@/components/segment/segmentBuilder";
import { emptySegmentRules, segmentConditionError, segmentRulesError } from "@/components/segment/segmentUtils";
import { Checkbox } from "@/components/ui/checkbox";
import { segmentService } from "@/services/api/segmentService";
import { toast } from "sonner";

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
  // Telefone ou e-mail que já está numa ficha: em vez de só avisar, oferece abrir a ficha existente
  const [duplicate, setDuplicate] = useState<DuplicateContact | null>(null);

  const create = useMutation({
    mutationFn: () =>
      contactService.create(client.id, {
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
      }),
    onError: (error) => {
      const existing = duplicateContactFromError(error);
      if (existing) setDuplicate(existing);
      else requestErrorHandling(error);
    },
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
          setDuplicate(null);
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
              onChange={(event) => {
                setPhone(event.target.value);
                setDuplicate(null);
              }}
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
              onChange={(event) => {
                setEmail(event.target.value);
                setDuplicate(null);
              }}
            />
          </div>
          {duplicate && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 text-sm text-amber-800 dark:border-amber-700/60 dark:bg-amber-950/30 dark:text-amber-300"
            >
              <span className="min-w-0">Já existe uma ficha com este telefone ou e-mail.</span>
              <Button type="button" size="sm" variant="outline" asChild>
                <Link to={`${baseUrl}/contacts/${duplicate.id}`} onClick={() => setIsOpen(false)}>
                  Abrir ficha de {duplicate.name?.trim() || "contato"}
                </Link>
              </Button>
            </div>
          )}
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

// Filtro vale quando todas as regras estão completas; sem regra nenhuma a lista mostra todos
const filterRulesOf = (rules: SegmentRules) =>
  [...rules.include, ...rules.exclude].some((condition) => segmentConditionError(condition)) ? null : rules;

export const Contacts = () => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search.trim(), 400);
  const [page, setPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [segmentId, setSegmentId] = useState("");
  const [rules, setRules] = useState<SegmentRules>(emptySegmentRules);
  const [debouncedRules] = useDebounceValue(rules, 500);
  const appliedRules = filterRulesOf(debouncedRules);
  const hasFilter = !!appliedRules && appliedRules.include.length + appliedRules.exclude.length > 0;
  // Marcadas na página; "todas do filtro" vale para a lista inteira, mesmo as páginas não abertas
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [allOfFilter, setAllOfFilter] = useState(false);
  const [saveName, setSaveName] = useState<string | null>(null);

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["contacts", "list", client.id, debouncedSearch, page, hasFilter ? appliedRules : null],
    queryFn: () =>
      hasFilter
        ? contactService.search(client.id, { rules: appliedRules!, search: debouncedSearch || undefined, page, take: TAKE })
        : contactService.findAll(client.id, { page, take: TAKE, search: debouncedSearch || undefined }),
    placeholderData: keepPreviousData,
  });

  const segmentsQuery = useQuery({
    queryKey: ["segments", client.id],
    queryFn: () => segmentService.findAll(client.id),
    enabled: can("broadcasts.view"),
  });
  const segments = segmentsQuery.data ?? [];

  const saveMutation = useMutation({
    mutationFn: (name: string) => segmentService.create(client.id, { name, rules }),
    onError: requestErrorHandling,
    onSuccess: (segment) => {
      queryClient.invalidateQueries({ queryKey: ["segments", client.id] });
      setSegmentId(segment.id);
      setSaveName(null);
      toast.success("Segmento salvo", { description: "Use-o nos disparos de WhatsApp, nas campanhas de e-mail e nas sequências." });
    },
  });

  const items = query.data?.items ?? [];
  const total = query.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / TAKE));

  const clearSelection = () => {
    setSelected(new Set());
    setAllOfFilter(false);
  };
  // Filtro, busca ou página novos: a seleção anterior não vale mais
  const resetTo = (next: () => void) => {
    next();
    setPage(1);
    clearSelection();
  };

  const pageSelected = items.length > 0 && items.every((contact) => selected.has(contact.id));
  const selectionCount = allOfFilter ? total : selected.size;
  const selection: ContactBulkSelection = allOfFilter
    ? { rules: hasFilter ? appliedRules! : undefined, search: debouncedSearch || undefined }
    : { contactIds: [...selected] };
  const rulesError = segmentRulesError(rules);
  const canBulk = can("contacts.manage") || can("broadcasts.send");

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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-md">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            aria-label="Buscar contatos"
            placeholder="Buscar por nome, documento, telefone ou e-mail"
            value={search}
            onChange={(event) => resetTo(() => setSearch(event.target.value))}
            className="pl-9"
          />
        </div>
        <Button type="button" variant={showFilters || hasFilter ? "secondary" : "outline"} onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-1 h-4 w-4" />
          Filtros{hasFilter ? " (ativos)" : ""}
        </Button>
        {hasFilter && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() =>
              resetTo(() => {
                setRules(emptySegmentRules());
                setSegmentId("");
              })
            }
          >
            Limpar filtros
          </Button>
        )}
      </div>

      {showFilters && (
        <div className="grid gap-4 rounded-xl border p-4">
          {segments.length > 0 && (
            <div className="grid gap-1.5 sm:max-w-sm">
              <Label htmlFor="contacts-segment">Segmento salvo</Label>
              <select
                id="contacts-segment"
                className={segmentSelectClassName}
                value={segmentId}
                onChange={(event) => {
                  const segment = segments.find((item) => item.id === event.target.value);
                  resetTo(() => {
                    setSegmentId(segment?.id ?? "");
                    setRules(segment ? segment.rules : emptySegmentRules());
                  });
                }}
              >
                <option value="">Nenhum</option>
                {segments.map((segment) => (
                  <option key={segment.id} value={segment.id}>
                    {segment.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <SegmentBuilder value={rules} onChange={(value) => resetTo(() => setRules(value))} idPrefix="contacts-filter" />
          {can("broadcasts.send") &&
            !rulesError &&
            (saveName === null ? (
              <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setSaveName("")}>
                Salvar como segmento
              </Button>
            ) : (
              <form
                className="flex flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (saveName.trim()) saveMutation.mutate(saveName.trim());
                }}
              >
                <Input
                  aria-label="Nome do segmento"
                  autoFocus
                  maxLength={120}
                  placeholder="Ex.: Clientes VIP"
                  value={saveName}
                  onChange={(event) => setSaveName(event.target.value)}
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={!saveName.trim() || saveMutation.isPending}>
                    Salvar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSaveName(null)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            ))}
        </div>
      )}

      {query.isLoading && <LoadingState label="Carregando contatos..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar os contatos." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && items.length === 0 && (
        <EmptyState
          title={debouncedSearch || hasFilter ? "Nenhum contato encontrado" : "Nenhum contato ainda"}
          description={
            debouncedSearch || hasFilter
              ? "Confira o que foi digitado ou mude os filtros."
              : "Os contatos aparecem aqui quando alguém conversa no WhatsApp, chega por formulário ou é cadastrado."
          }
        />
      )}

      {items.length > 0 && (
        <div className="grid gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <div className="flex flex-wrap items-center gap-3">
              {canBulk && (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={pageSelected}
                    onCheckedChange={(checked) => {
                      setAllOfFilter(false);
                      const next = new Set(selected);
                      for (const contact of items) {
                        if (checked === true) next.add(contact.id);
                        else next.delete(contact.id);
                      }
                      setSelected(next);
                    }}
                  />
                  Selecionar a página
                </label>
              )}
              <span className="text-muted-foreground tabular-nums">
                {total.toLocaleString("pt-BR")} {total === 1 ? "contato" : "contatos"}
              </span>
            </div>
            {canBulk && pageSelected && !allOfFilter && total > items.length && (
              <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={() => setAllOfFilter(true)}>
                Selecionar todos os {total.toLocaleString("pt-BR")} {hasFilter || debouncedSearch ? "do filtro" : "contatos"}
              </Button>
            )}
          </div>

          {selectionCount > 0 && (
            <div className="bg-muted/50 flex flex-wrap items-center justify-between gap-2 rounded-lg border p-2 pl-3">
              <span className="text-sm font-medium">
                {selectionCount.toLocaleString("pt-BR")} {selectionCount === 1 ? "selecionado" : "selecionados"}
                {allOfFilter && " (todos do filtro)"}
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <ContactBulkActions
                  selection={selection}
                  total={selectionCount}
                  onDone={() => queryClient.invalidateQueries({ queryKey: ["contacts", "list", client.id] })}
                />
                <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                  Limpar seleção
                </Button>
              </div>
            </div>
          )}

          <ul className="divide-y rounded-xl border">
            {items.map((contact) => (
              <li key={contact.id} className="flex items-center gap-1">
                {canBulk && (
                  <Checkbox
                    aria-label={`Selecionar ${contactDisplayName(contact)}`}
                    className="ml-3 shrink-0"
                    checked={allOfFilter || selected.has(contact.id)}
                    onCheckedChange={(checked) => {
                      const next = new Set(allOfFilter ? items.map((item) => item.id) : selected);
                      if (checked === true) next.add(contact.id);
                      else next.delete(contact.id);
                      setAllOfFilter(false);
                      setSelected(next);
                    }}
                  />
                )}
                <Link
                  to={`${baseUrl}/contacts/${contact.id}`}
                  className="hover:bg-accent/40 focus-visible:ring-ring grid min-w-0 flex-1 gap-1 px-3 py-3 outline-none focus-visible:ring-2 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-center md:gap-4"
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
        </div>
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
