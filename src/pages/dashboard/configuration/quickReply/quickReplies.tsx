import { useConfirm } from "@/components/confirm-dialog";
import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { quickReplyService } from "@/services/api/quickReplyService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquareDashed, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import {
  QUICK_REPLY_VARIABLES,
  quickRepliesQueryKey,
  searchQuickReplies,
  useQuickReplies,
} from "@/pages/dashboard/whatsapp/quickReplies/quickReplies";

const textareaClassName =
  "border-input bg-background focus-visible:ring-ring w-full resize-y rounded-md border px-3 py-2 text-base focus-visible:ring-1 focus-visible:outline-none md:text-sm";

type FormState = { id: string | null } & SaveQuickReplyBody;

const emptyForm = (shared: boolean): FormState => ({ id: null, shortcut: "", title: "", content: "", shared });

/** Formulário de criar/editar; montado só com o diálogo aberto. */
const QuickReplyForm: FC<{ initial: FormState; canManageShared: boolean; onDone: () => void }> = ({ initial, canManageShared, onDone }) => {
  const { client } = useClientContext();
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const save = useMutation({
    mutationFn: () =>
      form.id
        ? quickReplyService.update({ params: { clientId: client.id, id: form.id }, body: form })
        : quickReplyService.create({ params: { clientId: client.id }, body: form }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickRepliesQueryKey(client.id) });
      toast.success(form.id ? "Resposta rápida atualizada" : "Resposta rápida criada");
      onDone();
    },
  });

  // Coloca a variável onde está o cursor
  const insertVariable = (token: string) => {
    const input = contentRef.current;
    const start = input?.selectionStart ?? form.content.length;
    const end = input?.selectionEnd ?? form.content.length;
    const content = `${form.content.slice(0, start)}${token}${form.content.slice(end)}`;
    setForm({ ...form, content });
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + token.length, start + token.length);
    });
  };

  const canSave = !!form.shortcut.trim() && !!form.title.trim() && !!form.content.trim() && !save.isPending;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (canSave) save.mutate();
  };

  return (
    <form onSubmit={submit} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{form.id ? "Editar resposta rápida" : "Nova resposta rápida"}</DialogTitle>
        <DialogDescription>No atendimento, digite "/" e o atalho na caixa de mensagem para usar a resposta.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor="quick-reply-shortcut">Atalho</Label>
          <div className="relative">
            <span className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm">/</span>
            <Input
              id="quick-reply-shortcut"
              className="pl-6"
              value={form.shortcut}
              maxLength={30}
              autoFocus
              placeholder="pix"
              onChange={(event) => setForm({ ...form, shortcut: event.target.value.replace(/\s+/g, "-") })}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="quick-reply-title">Título</Label>
          <Input
            id="quick-reply-title"
            value={form.title}
            maxLength={120}
            placeholder="Chave Pix para pagamento"
            onChange={(event) => setForm({ ...form, title: event.target.value })}
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="quick-reply-content">Texto</Label>
        <textarea
          id="quick-reply-content"
          ref={contentRef}
          rows={5}
          maxLength={4096}
          value={form.content}
          placeholder="Olá, {primeiro_nome}! Segue a chave Pix: ..."
          onChange={(event) => setForm({ ...form, content: event.target.value })}
          className={textareaClassName}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground text-xs">Inserir:</span>
          {QUICK_REPLY_VARIABLES.map((variable) => (
            <button
              key={variable.token}
              type="button"
              onClick={() => insertVariable(variable.token)}
              title={variable.label}
              className="bg-muted hover:bg-muted/70 rounded px-1.5 py-0.5 font-mono text-xs"
            >
              {variable.token}
            </button>
          ))}
        </div>
      </div>

      {canManageShared && (
        <label className="flex items-start gap-3 rounded-lg border p-3">
          <Switch checked={form.shared} onCheckedChange={(shared) => setForm({ ...form, shared })} className="mt-0.5" />
          <span className="grid gap-0.5">
            <span className="text-sm font-medium">Da empresa</span>
            <span className="text-muted-foreground text-xs">Toda a equipe vê e usa. Desligado, só você vê.</span>
          </span>
        </label>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!canSave}>
          Salvar
        </Button>
      </DialogFooter>
    </form>
  );
};

const QuickReplyList: FC<{ replies: QuickReply[]; onEdit: (reply: QuickReply) => void; onDelete: (reply: QuickReply) => void }> = ({
  replies,
  onEdit,
  onDelete,
}) => (
  <ul className="divide-y rounded-lg border">
    {replies.map((reply) => (
      <li key={reply.id} className="flex items-start gap-3 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="bg-muted rounded px-1.5 py-0.5 font-mono text-xs">/{reply.shortcut}</span>
            <span className="truncate font-medium">{reply.title}</span>
          </p>
          <p className="text-muted-foreground mt-1 line-clamp-2 text-xs whitespace-pre-wrap">{reply.content}</p>
        </div>
        {reply.canEdit && (
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" aria-label={`Editar /${reply.shortcut}`} onClick={() => onEdit(reply)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label={`Excluir /${reply.shortcut}`} onClick={() => onDelete(reply)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </li>
    ))}
  </ul>
);

/** Cadastro das respostas rápidas: as da empresa (quem gerencia edita) e as pessoais de cada um. */
export const QuickReplies = () => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const canManageShared = can("quickReplies.manage");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<FormState | null>(null);

  const repliesQuery = useQuickReplies();

  const remove = useMutation({
    mutationFn: (reply: QuickReply) => quickReplyService.delete({ params: { clientId: client.id, id: reply.id } }),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: quickRepliesQueryKey(client.id) });
      toast.success("Resposta rápida excluída");
    },
  });

  const filtered = useMemo(() => searchQuickReplies(repliesQuery.data ?? [], search), [repliesQuery.data, search]);
  const shared = filtered.filter((reply) => reply.shared);
  const mine = filtered.filter((reply) => !reply.shared);

  const handleDelete = async (reply: QuickReply) => {
    const ok = await confirm({
      title: `Excluir /${reply.shortcut}?`,
      description: reply.shared ? "Ela some para toda a equipe." : "Ela some só para você.",
      confirmLabel: "Excluir",
      destructive: true,
    });
    if (ok) remove.mutate(reply);
  };

  const startEdit = (reply: QuickReply) =>
    setEditing({ id: reply.id, shortcut: reply.shortcut, title: reply.title, content: reply.content, shared: reply.shared });

  const renderSection = (title: string, description: string, replies: QuickReply[], emptyText: string) => (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline">{replies.length}</Badge>
      </div>
      <p className="text-muted-foreground text-xs">{description}</p>
      {replies.length === 0 ? (
        <EmptyState icon={MessageSquareDashed} title={search ? "Nada encontrado" : emptyText} />
      ) : (
        <QuickReplyList replies={replies} onEdit={startEdit} onDelete={handleDelete} />
      )}
    </section>
  );

  return (
    <Card>
      {confirmDialog}
      <CardHeader>
        <CardTitle>Respostas rápidas</CardTitle>
        <CardDescription>
          Textos prontos para o atendimento. Na caixa de mensagem, digite "/" e o atalho (por exemplo /pix) para escolher. Use {"{nome}"},{" "}
          {"{primeiro_nome}"} e {"{atendente}"} (seu apelido em Minha conta, ou o primeiro nome) para personalizar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="bg-muted flex flex-1 items-center gap-2 rounded-lg px-3 py-1.5">
            <Search className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Buscar respostas rápidas"
              placeholder="Buscar por atalho, título ou texto"
              className="placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-base outline-none md:text-sm"
            />
          </div>
          <Button onClick={() => setEditing(emptyForm(false))}>
            <Plus className="h-4 w-4" />
            Nova resposta
          </Button>
        </div>

        {repliesQuery.isLoading && <LoadingState />}
        {repliesQuery.isError && (
          <ErrorState
            message="Não foi possível carregar as respostas rápidas."
            onRetry={() => repliesQuery.refetch()}
            isRetrying={repliesQuery.isFetching}
          />
        )}
        {repliesQuery.data && (
          <>
            {renderSection(
              "Da empresa",
              canManageShared ? "Toda a equipe vê. Você pode criar e editar." : "Toda a equipe vê. Só quem gerencia pode alterar.",
              shared,
              "Nenhuma resposta da empresa",
            )}
            {renderSection("Minhas", "Só você vê e usa.", mine, "Você ainda não criou respostas pessoais")}
          </>
        )}

        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
            {editing && <QuickReplyForm initial={editing} canManageShared={canManageShared} onDone={() => setEditing(null)} />}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
