import { EmptyState, ErrorState, LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { emailTemplateService } from "@/services/api/emailTemplateService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

const DialogNewTemplate = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [starterKey, setStarterKey] = useState("");
  const startersQuery = useQuery({
    queryKey: ["emailTemplates", "starters", client.id],
    queryFn: () => emailTemplateService.starters(client.id),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => emailTemplateService.create(client.id, { name, starterKey: starterKey || undefined }),
    onError: requestErrorHandling,
    onSuccess: (template) => navigate(`${baseUrl}/email/templates/${template.id}`),
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (name.trim()) create.mutate();
  };

  const options = [{ key: "", name: "Em branco", description: "Comece do zero." }, ...(startersQuery.data ?? [])];

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (value) {
          setName("");
          setStarterKey("");
        }
        setOpen(value);
      }}
    >
      <DialogTrigger asChild>
        <Button>Novo modelo</Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Novo modelo de e-mail</DialogTitle>
            <DialogDescription>Dê um nome e escolha por onde começar.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="template-name">Nome</Label>
            <Input
              id="template-name"
              value={name}
              maxLength={191}
              placeholder="Ex.: Boas-vindas do consignado"
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="grid gap-2" role="radiogroup" aria-label="Começar de">
            {options.map((option) => (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={starterKey === option.key}
                onClick={() => setStarterKey(option.key)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left",
                  starterKey === option.key ? "border-primary bg-primary/5" : "hover:bg-accent/40",
                )}
              >
                <span className="block text-sm font-medium">{option.name}</span>
                <span className="text-muted-foreground block text-xs">{option.description}</span>
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              Criar e editar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

/** Modelos de e-mail do cliente. */
export const EmailTemplates = () => {
  const { client } = useClientContext();
  const baseUrl = useBaseUrl();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const listKey = ["emailTemplates", "list", client.id];

  const query = useQuery({ meta: { errorHandledInline: true }, queryKey: listKey, queryFn: () => emailTemplateService.findAll(client.id) });
  const duplicate = useMutation({
    mutationFn: (id: string) => emailTemplateService.duplicate(client.id, id),
    onError: requestErrorHandling,
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: listKey });
      navigate(`${baseUrl}/email/templates/${template.id}`);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => emailTemplateService.remove(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: listKey });
      setConfirmDeleteId(null);
      toast.success("Modelo removido");
    },
  });

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-muted-foreground text-sm">
          E-mails montados em blocos, com variáveis da ficha, prévia no computador e no celular e envio de teste.
        </p>
        <DialogNewTemplate />
      </div>
      {query.isLoading && <LoadingState label="Carregando modelos..." />}
      {query.isError && (
        <ErrorState message="Não foi possível buscar os modelos." onRetry={() => query.refetch()} isRetrying={query.isFetching} />
      )}
      {query.isSuccess && query.data.length === 0 && (
        <EmptyState title="Nenhum modelo ainda" description="Crie o primeiro em branco ou a partir de um modelo pronto." />
      )}
      {!!query.data?.length && (
        <ul className="divide-y rounded-xl border">
          {query.data.map((template) => (
            <li key={template.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Link to={`${baseUrl}/email/templates/${template.id}`} className="min-w-0 flex-1">
                <p className="truncate font-medium hover:underline">{template.name}</p>
                <p className="text-muted-foreground truncate text-sm">{template.subject || "sem assunto"}</p>
              </Link>
              <span className="text-muted-foreground text-xs tabular-nums">
                editado em {format(new Date(template.updatedAt), "dd/MM/yyyy HH:mm")}
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" disabled={duplicate.isPending} onClick={() => duplicate.mutate(template.id)}>
                  Duplicar
                </Button>
                {confirmDeleteId === template.id ? (
                  <>
                    <Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(template.id)}>
                      Confirmar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setConfirmDeleteId(null)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={() => setConfirmDeleteId(template.id)}>
                    Remover
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
