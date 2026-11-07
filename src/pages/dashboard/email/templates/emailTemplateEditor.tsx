import { ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { crmSelectClassName } from "@/pages/dashboard/crm/crmUtils";
import { contactService } from "@/services/api/contactService";
import { emailSendingService } from "@/services/api/emailSendingService";
import { emailTemplateService } from "@/services/api/emailTemplateService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Monitor, Plus, Smartphone, Trash2 } from "lucide-react";
import { useEffect, useState, type FC, type FormEvent } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { blockLabels, blockSummary, cloneBlock, createBlock, moveItem } from "./blockUtils";
import { BlockProperties, VariablePicker } from "./components/blockProperties";

type Draft = { name: string; subject: string; preheader: string; blocks: EmailBlock[] };

const toBody = (draft: Draft) => ({ name: draft.name, subject: draft.subject, preheader: draft.preheader || null, blocks: draft.blocks });

/** Escolhe uma ficha para ver o e-mail com os dados dela. */
const ContactPicker: FC<{ value: ContactListItem | null; onChange: (contact: ContactListItem | null) => void }> = ({ value, onChange }) => {
  const { client } = useClientContext();
  const [search, setSearch] = useState("");
  const [debounced] = useDebounceValue(search.trim(), 400);
  const query = useQuery({
    queryKey: ["contacts", "list", client.id, "emailPreview", debounced],
    queryFn: () => contactService.findAll(client.id, { search: debounced, take: 6 }),
    enabled: debounced.length >= 2,
  });

  if (value)
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-muted-foreground">Dados de</span>
        <span className="truncate font-medium">{value.name || value.email || value.phone}</span>
        <Button variant="link" size="sm" className="h-auto px-0" onClick={() => onChange(null)}>
          trocar
        </Button>
      </div>
    );

  return (
    <div className="relative w-64">
      <Input
        aria-label="Ver com os dados de um contato"
        placeholder="Ver com os dados de um contato"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {!!query.data?.items.length && (
        <ul className="bg-popover absolute top-full z-10 mt-1 w-full rounded-md border p-1 shadow-md">
          {query.data.items.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                className="hover:bg-accent w-full truncate rounded px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  onChange(contact);
                  setSearch("");
                }}
              >
                {contact.name || contact.email || contact.phone}
                {contact.email && <span className="text-muted-foreground"> · {contact.email}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const SendTestDialog: FC<{ draft: Draft; contactId: string | null }> = ({ draft, contactId }) => {
  const { client, can } = useClientContext();
  const [open, setOpen] = useState(false);
  const [senderId, setSenderId] = useState("");
  const [to, setTo] = useState("");
  const sendersQuery = useQuery({
    queryKey: ["emailSending", "senders", client.id],
    queryFn: () => emailSendingService.findSenders(client.id),
    enabled: open && can("emailSettings.manage"),
  });
  const verified = sendersQuery.data?.filter((sender) => sender.status === "VERIFIED") ?? [];

  const send = useMutation({
    mutationFn: () =>
      emailTemplateService.sendTest(client.id, {
        ...toBody(draft),
        senderId: senderId || verified[0]?.id,
        to,
        contactId: contactId ?? undefined,
      }),
    onError: requestErrorHandling,
    onSuccess: () => {
      toast.success(`Teste enviado para ${to}`);
      setOpen(false);
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (to.trim() && (senderId || verified[0])) send.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Enviar teste</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Enviar teste</DialogTitle>
            <DialogDescription>
              Envia o conteúdo que está na tela, mesmo sem salvar{contactId ? ", com os dados do contato escolhido na prévia" : ""}.
            </DialogDescription>
          </DialogHeader>
          {!can("emailSettings.manage") && (
            <p className="text-muted-foreground text-sm">Você precisa da permissão de configurar o envio de e-mail.</p>
          )}
          {sendersQuery.isSuccess && verified.length === 0 && (
            <p className="text-muted-foreground text-sm">
              Nenhum remetente verificado. Cadastre o domínio em Configurações › Envio de e-mail.
            </p>
          )}
          {verified.length > 0 && (
            <div className="grid gap-2">
              <Label htmlFor="test-sender">Remetente</Label>
              <select
                id="test-sender"
                value={senderId || verified[0].id}
                onChange={(event) => setSenderId(event.target.value)}
                className={crmSelectClassName}
              >
                {verified.map((sender) => (
                  <option key={sender.id} value={sender.id}>
                    {sender.fromName} &lt;{sender.fromEmail}&gt;
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="grid gap-2">
            <Label htmlFor="test-to">Para</Label>
            <Input id="test-to" type="email" value={to} placeholder="seu@email.com" onChange={(event) => setTo(event.target.value)} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!to.trim() || verified.length === 0 || send.isPending}>
              Enviar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const EditorForm: FC<{ template: EmailTemplate }> = ({ template }) => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft>({
    name: template.name,
    subject: template.subject,
    preheader: template.preheader ?? "",
    blocks: template.blocks,
  });
  const [saved, setSaved] = useState(JSON.stringify(draft));
  const [selectedId, setSelectedId] = useState<string | null>(template.blocks[0]?.id ?? null);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewContact, setPreviewContact] = useState<ContactListItem | null>(null);
  const [debouncedDraft] = useDebounceValue(draft, 500);

  const isDirty = JSON.stringify(draft) !== saved;

  // Avisa antes de fechar a aba com alterações não salvas
  useEffect(() => {
    if (!isDirty) return;
    const handler = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  const preview = useQuery({
    queryKey: ["emailTemplates", "preview", client.id, debouncedDraft, previewContact?.id],
    queryFn: () => emailTemplateService.preview(client.id, { ...toBody(debouncedDraft), contactId: previewContact?.id }),
    placeholderData: (previous) => previous,
  });

  const save = useMutation({
    mutationFn: () => emailTemplateService.update(client.id, template.id, toBody(draft)),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      setSaved(JSON.stringify(draft));
      queryClient.setQueryData(["emailTemplates", "detail", client.id, template.id], updated);
      queryClient.invalidateQueries({ queryKey: ["emailTemplates", "list", client.id] });
      toast.success("Modelo salvo");
    },
  });

  const setBlocks = (blocks: EmailBlock[]) => setDraft((current) => ({ ...current, blocks }));
  const selected = draft.blocks.find((block) => block.id === selectedId) ?? null;

  const addBlock = (type: EmailBlock["type"]) => {
    const block = createBlock(type);
    const index = selected ? draft.blocks.findIndex((item) => item.id === selected.id) + 1 : draft.blocks.length;
    setBlocks([...draft.blocks.slice(0, index), block, ...draft.blocks.slice(index)]);
    setSelectedId(block.id);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
        <Link
          to={`${baseUrl}/email?tab=templates`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Voltar para os modelos"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Input
          aria-label="Nome do modelo"
          value={draft.name}
          maxLength={191}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          className="w-64 font-medium"
        />
        <span className="text-muted-foreground text-xs">{isDirty ? "Alterações não salvas" : "Salvo"}</span>
        <div className="ml-auto flex gap-2">
          <SendTestDialog draft={draft} contactId={previewContact?.id ?? null} />
          <Button disabled={!isDirty || save.isPending} onClick={() => save.mutate()}>
            Salvar
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 overflow-auto lg:grid-cols-[260px_minmax(0,1fr)_320px] lg:overflow-hidden">
        {/* Blocos */}
        <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto border-b p-3 lg:border-r lg:border-b-0">
          <div className="grid gap-2">
            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="template-subject">Assunto</Label>
                <VariablePicker onPick={(token) => setDraft({ ...draft, subject: `${draft.subject} ${token}`.trim() })} />
              </div>
              <Input
                id="template-subject"
                value={draft.subject}
                maxLength={300}
                onChange={(event) => setDraft({ ...draft, subject: event.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="template-preheader">Texto de prévia</Label>
              <Input
                id="template-preheader"
                value={draft.preheader}
                maxLength={300}
                placeholder="Aparece ao lado do assunto"
                onChange={(event) => setDraft({ ...draft, preheader: event.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Blocos</h2>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-7">
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {(Object.keys(blockLabels) as EmailBlock["type"][]).map((type) => (
                  <DropdownMenuItem key={type} onClick={() => addBlock(type)}>
                    {blockLabels[type]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {draft.blocks.length === 0 && <p className="text-muted-foreground text-sm">Adicione o primeiro bloco do e-mail.</p>}
          <ul className="grid gap-1">
            {draft.blocks.map((block, index) => (
              <li
                key={block.id}
                className={cn(
                  "group flex items-center gap-1 rounded-md border px-2 py-1.5",
                  selectedId === block.id && "border-primary bg-primary/5",
                )}
              >
                <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setSelectedId(block.id)}>
                  <span className="block text-sm font-medium">{blockLabels[block.type]}</span>
                  <span className="text-muted-foreground block truncate text-xs">{blockSummary(block)}</span>
                </button>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label="Subir"
                    onClick={() => setBlocks(moveItem(draft.blocks, index, index - 1))}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label="Descer"
                    onClick={() => setBlocks(moveItem(draft.blocks, index, index + 1))}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    aria-label="Duplicar"
                    onClick={() => setBlocks([...draft.blocks.slice(0, index + 1), cloneBlock(block), ...draft.blocks.slice(index + 1)])}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="text-muted-foreground h-6 w-6"
                    aria-label="Remover"
                    onClick={() => setBlocks(draft.blocks.filter((item) => item.id !== block.id))}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* Prévia */}
        <section className="bg-muted/40 flex min-h-[480px] flex-col gap-3 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1" role="group" aria-label="Tamanho da prévia">
              <Button
                size="sm"
                variant={device === "desktop" ? "secondary" : "ghost"}
                aria-pressed={device === "desktop"}
                onClick={() => setDevice("desktop")}
              >
                <Monitor className="h-4 w-4" />
                Computador
              </Button>
              <Button
                size="sm"
                variant={device === "mobile" ? "secondary" : "ghost"}
                aria-pressed={device === "mobile"}
                onClick={() => setDevice("mobile")}
              >
                <Smartphone className="h-4 w-4" />
                Celular
              </Button>
            </div>
            <ContactPicker value={previewContact} onChange={setPreviewContact} />
          </div>
          {preview.data && (
            <p className="text-sm">
              <span className="text-muted-foreground">Assunto: </span>
              <span className="font-medium">{preview.data.subject || "sem assunto"}</span>
            </p>
          )}
          {preview.isError && (
            <ErrorState message="Não foi possível montar a prévia." onRetry={() => preview.refetch()} isRetrying={preview.isFetching} />
          )}
          <div className="flex flex-1 justify-center">
            <iframe
              title="Prévia do e-mail"
              sandbox=""
              srcDoc={preview.data?.html ?? ""}
              className={cn(
                "bg-background min-h-[640px] rounded-lg border shadow-sm transition-[width]",
                device === "desktop" ? "w-full max-w-[680px]" : "w-[375px]",
              )}
            />
          </div>
        </section>

        {/* Propriedades */}
        <aside className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t p-3 lg:border-t-0 lg:border-l">
          {selected ? (
            <>
              <h2 className="text-sm font-semibold">{blockLabels[selected.type]}</h2>
              <BlockProperties
                key={selected.id}
                block={selected}
                onChange={(updated) => setBlocks(draft.blocks.map((block) => (block.id === updated.id ? updated : block)))}
              />
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Selecione um bloco para editar.</p>
          )}
        </aside>
      </div>
    </div>
  );
};

export const EmailTemplateEditor = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const { client } = useClientContext();
  const query = useQuery({
    meta: { errorHandledInline: true },
    queryKey: ["emailTemplates", "detail", client.id, templateId],
    queryFn: () => emailTemplateService.findOne(client.id, templateId!),
  });

  if (query.isLoading) return <LoadingState label="Abrindo o modelo..." />;
  if (query.isError || !query.data)
    return <ErrorState message="Não foi possível abrir o modelo." onRetry={() => query.refetch()} isRetrying={query.isFetching} />;

  return <EditorForm key={query.data.id} template={query.data} />;
};
