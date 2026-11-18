import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { contactDisplayName, duplicateContactFromError, type DuplicateContact } from "@/pages/dashboard/contacts/contactUtils";
import { contactService } from "@/services/api/contactService";
import { crmService } from "@/services/api/crmService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Search, UserPlus } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { useDebounceValue } from "usehooks-ts";
import { pipelinesForNewDeal } from "../crmUtils";
import { useCrmOptions } from "../useCrmOptions";
import { NewDealForm } from "./newDealForm";

type SelectedPerson = { id: string; name: string | null };

/** Cria a ficha de quem ainda não está cadastrado; telefone ou e-mail repetido oferece usar a ficha existente. */
const NewPersonForm: FC<{ initialName: string; onCreated: (person: SelectedPerson) => void; onCancel: () => void }> = ({
  initialName,
  onCreated,
  onCancel,
}) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
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
      onCreated({ id: contact.id, name: contact.name });
    },
  });

  const isValid = !!(name.trim() || phone.trim() || email.trim());

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isValid) create.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="new-deal-person-name">Nome</Label>
        <Input id="new-deal-person-name" value={name} maxLength={191} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="new-deal-person-phone">Telefone</Label>
        <Input
          id="new-deal-person-phone"
          value={phone}
          maxLength={40}
          placeholder="(21) 98086-2828"
          onChange={(event) => {
            setPhone(event.target.value);
            setDuplicate(null);
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="new-deal-person-email">E-mail</Label>
        <Input
          id="new-deal-person-email"
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
          <Button type="button" size="sm" variant="outline" onClick={() => onCreated({ id: duplicate.id, name: duplicate.name })}>
            Usar a ficha de {duplicate.name?.trim() || "contato"}
          </Button>
        </div>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={!isValid || create.isPending}>
          Criar contato
        </Button>
        <Button type="button" variant="ghost" onClick={onCancel}>
          Voltar
        </Button>
      </div>
    </form>
  );
};

/** Formulário do negócio para a ficha escolhida, considerando os negócios abertos que ela já tem. */
const PersonDealForm: FC<{ person: SelectedPerson; defaultPipelineId?: string; onCreated: (deal: Deal) => void }> = ({
  person,
  defaultPipelineId,
  onCreated,
}) => {
  const { client } = useClientContext();
  const { canViewAll, activePipelines, visibleServiceGroups } = useCrmOptions();

  const dealsQuery = useQuery({
    queryKey: ["crm", "deals", "person", person.id],
    queryFn: () => crmService.findPersonDeals({ params: { clientId: client.id, personId: person.id } }),
  });
  if (dealsQuery.isLoading) return <LoadingState className="py-2" />;

  return (
    <NewDealForm
      target={{ contactId: person.id }}
      pipelines={pipelinesForNewDeal(activePipelines, dealsQuery.data ?? [])}
      defaultPipelineId={defaultPipelineId}
      defaultServiceGroupId={canViewAll ? "" : (visibleServiceGroups[0]?.id ?? "")}
      idPrefix="board-new-deal"
      onCreated={onCreated}
    />
  );
};

/** "Novo negócio" do quadro: busca o contato (ou cadastra um) e cria o negócio já com funil, etapa, título e valor. */
export const NewDealDialog: FC<{ defaultPipelineId?: string; onCreated: (deal: Deal) => void }> = ({ defaultPipelineId, onCreated }) => {
  const { client } = useClientContext();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search.trim(), 350);
  const [isCreatingPerson, setIsCreatingPerson] = useState(false);
  const [person, setPerson] = useState<SelectedPerson | null>(null);

  const contactsQuery = useQuery({
    queryKey: ["contacts", "list", client.id, debouncedSearch, 1],
    queryFn: () => contactService.findAll(client.id, { page: 1, take: 8, search: debouncedSearch }),
    enabled: isOpen && debouncedSearch.length >= 2 && !person && !isCreatingPerson,
  });

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSearch("");
      setPerson(null);
      setIsCreatingPerson(false);
    }
    setIsOpen(open);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Novo negócio
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo negócio</DialogTitle>
          <DialogDescription>
            {person
              ? `Para ${person.name?.trim() || "o contato escolhido"}.`
              : isCreatingPerson
                ? "Cadastre a pessoa. Com telefone, o negócio já fica ligado à conversa do WhatsApp."
                : "Busque o contato pelo nome, telefone ou e-mail, ou cadastre um novo."}
          </DialogDescription>
        </DialogHeader>

        {person ? (
          <div className="grid gap-3">
            <Button variant="ghost" size="sm" className="justify-self-start" onClick={() => setPerson(null)}>
              <ArrowLeft className="h-3.5 w-3.5" />
              Trocar contato
            </Button>
            <PersonDealForm
              person={person}
              defaultPipelineId={defaultPipelineId}
              onCreated={(deal) => {
                setIsOpen(false);
                onCreated(deal);
              }}
            />
          </div>
        ) : isCreatingPerson ? (
          <NewPersonForm initialName={search.trim()} onCreated={setPerson} onCancel={() => setIsCreatingPerson(false)} />
        ) : (
          <div className="grid gap-3">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                autoFocus
                aria-label="Buscar contato"
                placeholder="Nome, telefone ou e-mail"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            {debouncedSearch.length >= 2 && contactsQuery.isLoading && <LoadingState className="py-2" />}
            {contactsQuery.data && contactsQuery.data.items.length === 0 && (
              <p className="text-muted-foreground text-sm">Nenhum contato encontrado.</p>
            )}
            {!!contactsQuery.data?.items.length && (
              <ul className="divide-y rounded-lg border">
                {contactsQuery.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setPerson({ id: item.id, name: item.name })}
                      className="hover:bg-accent/40 grid w-full gap-0.5 px-3 py-2 text-left"
                    >
                      <span className="truncate text-sm font-medium">{contactDisplayName(item)}</span>
                      <span className="text-muted-foreground truncate text-xs">
                        {[item.phone, item.email].filter(Boolean).join(" · ") || "Sem telefone e e-mail"}
                        {item.dealCount > 0 && ` · ${item.dealCount} ${item.dealCount === 1 ? "negócio" : "negócios"}`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Button variant="outline" className="justify-self-start" onClick={() => setIsCreatingPerson(true)}>
              <UserPlus className="h-4 w-4" />
              Cadastrar novo contato
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
