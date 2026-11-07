import { ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { CustomFieldInput } from "@/pages/dashboard/crm/components/customFieldInput";
import {
  crmTextareaClassName,
  dealStatusLabel,
  formatCurrency,
  toCustomFieldsBody,
  toCustomFieldsForm,
} from "@/pages/dashboard/crm/crmUtils";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Mail, MessageCircle, Phone, Star, Trash2 } from "lucide-react";
import { useState, type FC, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { contactDetailKey } from "../contactUtils";
import { ContactMerge } from "./contactMerge";
import { AiFieldUpdates } from "@/components/aiFieldUpdates/aiFieldUpdates";

type ContactProfileProps =
  { contactId: string; conversationId?: never; compact?: boolean } | { conversationId: string; contactId?: never; compact?: boolean };

const Section: FC<{ title: string; action?: ReactNode; children: ReactNode }> = ({ title, action, children }) => (
  <section className="grid gap-2">
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">{title}</h3>
      {action}
    </div>
    {children}
  </section>
);

/** Ficha da pessoa: dados, telefones, e-mails, campos, conversas, negócios e mesclagem. */
export const ContactProfile: FC<ContactProfileProps> = ({ contactId, conversationId, compact }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();

  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: contactId ? contactDetailKey(client.id, contactId) : ["contacts", "conversation", client.id, conversationId],
    queryFn: () =>
      contactId ? contactService.findOne(client.id, contactId) : contactService.findByConversation(client.id, conversationId!),
  });

  const fieldsQuery = useQuery({
    queryKey: ["contacts", "fields", client.id],
    queryFn: () => contactService.findFields(client.id),
  });

  if (query.isLoading) return <LoadingState label="Carregando a ficha..." />;
  if (query.isError || !query.data)
    return <ErrorState message="Não foi possível abrir a ficha." onRetry={() => query.refetch()} isRetrying={query.isFetching} />;

  const contact = query.data;
  const onSaved = (updated: ContactDetail) => {
    queryClient.setQueryData(contactDetailKey(client.id, updated.id), updated);
    if (conversationId) queryClient.setQueryData(["contacts", "conversation", client.id, conversationId], updated);
    queryClient.invalidateQueries({ queryKey: ["contacts", "list", client.id] });
  };

  return (
    <div className={cn("grid", compact ? "gap-5" : "gap-6")}>
      <AiFieldUpdates owner={{ contactId: contact.id }} onAccepted={() => query.refetch()} />
      <ContactData key={contact.updatedAt} contact={contact} onSaved={onSaved} />
      <ContactPhones contact={contact} onSaved={onSaved} />
      <ContactEmails contact={contact} onSaved={onSaved} />
      {!!fieldsQuery.data?.some((field) => field.active) && (
        <ContactFields
          key={`fields-${contact.updatedAt}`}
          contact={contact}
          fields={fieldsQuery.data.filter((field) => field.active)}
          onSaved={onSaved}
        />
      )}
      <ContactConversations contact={contact} />
      <ContactDeals contact={contact} />
      <ContactMerge contact={contact} onMerged={onSaved} />
    </div>
  );
};

type SectionProps = { contact: ContactDetail; onSaved: (contact: ContactDetail) => void };

const ContactData: FC<SectionProps> = ({ contact, onSaved }) => {
  const { client } = useClientContext();
  const [name, setName] = useState(contact.name ?? "");
  const [document, setDocument] = useState(contact.document ?? "");
  const [notes, setNotes] = useState(contact.notes ?? "");

  const save = useMutation({
    mutationFn: () => contactService.update(client.id, contact.id, { name, document, notes }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success("Ficha salva");
    },
  });

  const isDirty = name !== (contact.name ?? "") || document !== (contact.document ?? "") || notes !== (contact.notes ?? "");

  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (isDirty) save.mutate();
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`contact-name-${contact.id}`}>Nome</Label>
        <Input id={`contact-name-${contact.id}`} value={name} maxLength={191} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`contact-document-${contact.id}`}>Documento</Label>
        <Input
          id={`contact-document-${contact.id}`}
          value={document}
          maxLength={40}
          placeholder="CPF ou CNPJ"
          onChange={(event) => setDocument(event.target.value)}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`contact-notes-${contact.id}`}>Observações</Label>
        <textarea
          id={`contact-notes-${contact.id}`}
          value={notes}
          maxLength={5000}
          onChange={(event) => setNotes(event.target.value)}
          className={crmTextareaClassName}
        />
      </div>
      {isDirty && (
        <Button type="submit" size="sm" className="justify-self-start" disabled={save.isPending}>
          Salvar
        </Button>
      )}
    </form>
  );
};

const ContactPhones: FC<SectionProps> = ({ contact, onSaved }) => {
  const { client } = useClientContext();
  const [phone, setPhone] = useState("");
  const [label, setLabel] = useState("");

  const add = useMutation({
    mutationFn: () => contactService.addPhone(client.id, contact.id, { phone, label: label.trim() || undefined }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onSaved(updated);
      setPhone("");
      setLabel("");
    },
  });
  const remove = useMutation({
    mutationFn: (phoneId: string) => contactService.removePhone(client.id, contact.id, phoneId),
    onError: requestErrorHandling,
    onSuccess: onSaved,
  });
  const setPrimary = useMutation({
    mutationFn: (phoneId: string) => contactService.setPrimaryPhone(client.id, contact.id, phoneId),
    onError: requestErrorHandling,
    onSuccess: onSaved,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (phone.trim()) add.mutate();
  };

  return (
    <Section title="Telefones">
      {contact.phones.length === 0 && <p className="text-muted-foreground text-sm">Nenhum telefone.</p>}
      <ul className="grid gap-1.5">
        {contact.phones.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <Phone className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate tabular-nums">
              {item.phoneNumber}
              {item.label && <span className="text-muted-foreground"> · {item.label}</span>}
            </span>
            {item.isPrimary ? (
              <Badge variant="secondary">Principal</Badge>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Tornar principal"
                aria-label={`Tornar ${item.phoneNumber} o telefone principal`}
                disabled={setPrimary.isPending}
                onClick={() => setPrimary.mutate(item.id)}
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-7 w-7"
              title="Tirar da ficha"
              aria-label={`Tirar ${item.phoneNumber} da ficha`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <form className="flex flex-wrap gap-2" onSubmit={onSubmit}>
        <Input
          aria-label="Novo telefone"
          placeholder="(21) 98086-2828"
          value={phone}
          maxLength={40}
          onChange={(event) => setPhone(event.target.value)}
          className="min-w-0 flex-1 basis-36"
        />
        <Input
          aria-label="Rótulo do telefone"
          placeholder="Rótulo (opcional)"
          value={label}
          maxLength={40}
          onChange={(event) => setLabel(event.target.value)}
          className="min-w-0 flex-1 basis-28"
        />
        <Button type="submit" variant="outline" disabled={!phone.trim() || add.isPending}>
          Adicionar
        </Button>
      </form>
    </Section>
  );
};

const ContactEmails: FC<SectionProps> = ({ contact, onSaved }) => {
  const { client } = useClientContext();
  const [email, setEmail] = useState("");

  const add = useMutation({
    mutationFn: () => contactService.addEmail(client.id, contact.id, { email }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onSaved(updated);
      setEmail("");
    },
  });
  const remove = useMutation({
    mutationFn: (emailId: string) => contactService.removeEmail(client.id, contact.id, emailId),
    onError: requestErrorHandling,
    onSuccess: onSaved,
  });
  const setPrimary = useMutation({
    mutationFn: (emailId: string) => contactService.setPrimaryEmail(client.id, contact.id, emailId),
    onError: requestErrorHandling,
    onSuccess: onSaved,
  });

  return (
    <Section title="E-mails">
      {contact.emails.length === 0 && <p className="text-muted-foreground text-sm">Nenhum e-mail.</p>}
      <ul className="grid gap-1.5">
        {contact.emails.map((item) => (
          <li key={item.id} className="flex items-center gap-2 text-sm">
            <Mail className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <span className={cn("min-w-0 flex-1 truncate", item.invalidAt && "text-muted-foreground line-through")}>{item.email}</span>
            {item.invalidAt && <Badge variant="destructive">Voltou</Badge>}
            {item.isPrimary ? (
              <Badge variant="secondary">Principal</Badge>
            ) : (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Tornar principal"
                aria-label={`Tornar ${item.email} o e-mail principal`}
                disabled={setPrimary.isPending}
                onClick={() => setPrimary.mutate(item.id)}
              >
                <Star className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground h-7 w-7"
              title="Tirar da ficha"
              aria-label={`Tirar ${item.email} da ficha`}
              disabled={remove.isPending}
              onClick={() => remove.mutate(item.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (email.trim()) add.mutate();
        }}
      >
        <Input
          type="email"
          aria-label="Novo e-mail"
          placeholder="nome@empresa.com"
          value={email}
          maxLength={191}
          onChange={(event) => setEmail(event.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" variant="outline" disabled={!email.trim() || add.isPending}>
          Adicionar
        </Button>
      </form>
    </Section>
  );
};

const ContactFields: FC<SectionProps & { fields: CrmField[] }> = ({ contact, fields, onSaved }) => {
  const { client } = useClientContext();
  const [values, setValues] = useState(() => toCustomFieldsForm(fields, contact.customFields));

  const save = useMutation({
    mutationFn: () => contactService.update(client.id, contact.id, { customFields: toCustomFieldsBody(fields, values) }),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onSaved(updated);
      toast.success("Campos salvos");
    },
  });

  const initial = toCustomFieldsForm(fields, contact.customFields);
  const isDirty = fields.some((field) => (values[field.id] ?? "") !== (initial[field.id] ?? ""));

  return (
    <Section title="Campos">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          if (isDirty) save.mutate();
        }}
      >
        {fields.map((field) => (
          <div key={field.id} className="grid gap-1.5">
            <Label htmlFor={`contact-field-${contact.id}-${field.id}`}>{field.name}</Label>
            <CustomFieldInput
              id={`contact-field-${contact.id}-${field.id}`}
              field={field}
              value={values[field.id] ?? ""}
              onChange={(value) => setValues((current) => ({ ...current, [field.id]: value }))}
            />
          </div>
        ))}
        {isDirty && (
          <Button type="submit" size="sm" className="justify-self-start" disabled={save.isPending}>
            Salvar campos
          </Button>
        )}
      </form>
    </Section>
  );
};

const ContactConversations: FC<{ contact: ContactDetail }> = ({ contact }) => {
  const baseUrl = useBaseUrl();
  const { can } = useClientContext();

  return (
    <Section title="Conversas no WhatsApp">
      {contact.conversations.length === 0 && (
        <p className="text-muted-foreground text-sm">Nenhuma conversa ainda. Ela aparece quando a pessoa manda ou recebe uma mensagem.</p>
      )}
      <ul className="grid gap-1.5">
        {contact.conversations.map((conversation) => (
          <li key={conversation.id} className="flex items-center gap-2 text-sm">
            <MessageCircle className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate tabular-nums">{conversation.phoneNumber}</p>
              <p className="text-muted-foreground truncate text-xs">
                {conversation.whatsappName ? `${conversation.whatsappName} · ` : ""}
                {conversation.lastMessageAt
                  ? `última mensagem em ${format(new Date(conversation.lastMessageAt), "dd/MM/yyyy HH:mm")}`
                  : "sem mensagens"}
              </p>
            </div>
            {can("whatsapp.chat") && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`${baseUrl}/whatsapp?contactId=${conversation.id}&phone=${encodeURIComponent(conversation.phoneNumber)}`}>
                  Abrir
                </Link>
              </Button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
};

const ContactDeals: FC<{ contact: ContactDetail }> = ({ contact }) => {
  const baseUrl = useBaseUrl();
  const { can, canUseCrm } = useClientContext();

  if (!canUseCrm) return null;

  return (
    <Section
      title="Negócios"
      action={
        can("crm.view") && contact.deals.length > 0 ? (
          <Link to={`${baseUrl}/crm`} className="text-primary text-xs hover:underline">
            Abrir o CRM
          </Link>
        ) : undefined
      }
    >
      {contact.deals.length === 0 && <p className="text-muted-foreground text-sm">Nenhum negócio.</p>}
      <ul className="grid gap-1.5">
        {contact.deals.map((deal) => (
          <li key={deal.id} className="grid gap-0.5 rounded-lg border px-3 py-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium">{deal.title}</span>
              <Badge variant="secondary">{dealStatusLabel[deal.status] ?? deal.status}</Badge>
            </div>
            <p className="text-muted-foreground truncate text-xs">
              {deal.pipelineName} · {deal.stageName}
              {deal.value !== null && ` · ${formatCurrency(deal.value)}`}
            </p>
          </li>
        ))}
      </ul>
    </Section>
  );
};
