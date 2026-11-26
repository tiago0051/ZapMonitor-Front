import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { artAgendaService } from "@/services/api/artAgendaService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, Loader2 } from "lucide-react";
import { useState, type FC, type FormEvent } from "react";
import { toast } from "sonner";
import { selectClassName } from "../strategies/strategyUtils";

const copy = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Link copiado");
  } catch {
    toast.error("Não foi possível copiar; selecione o link e copie");
  }
};

/**
 * Links do orgânico para o WhatsApp: vão na bio, no adesivo de link do story ou na legenda do Facebook. Cada conversa que
 * chega pelo link fica marcada como orgânica e entra no relatório da frente.
 */
export const OrganicLinks: FC<{ socialPostId?: string; defaultMessage?: string }> = ({ socialPostId, defaultMessage }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const canManage = can("posts.manage");
  const queryKey = ["organicLinks", client.id, socialPostId ?? "all"];

  const linksQuery = useQuery({ queryKey, queryFn: () => artAgendaService.findLinks(client.id, socialPostId) });
  const numbersQuery = useQuery({
    queryKey: ["whatsappConfigurations", client.id, "organicLinks"],
    queryFn: () => whatsappService.findAllConfigurations({ params: { clientId: client.id }, queries: { page: 1, take: 100 } }),
    enabled: canManage,
  });
  const numbers = numbersQuery.data?.items ?? [];

  const [name, setName] = useState(socialPostId ? "Link da postagem" : "Link da bio");
  const [message, setMessage] = useState(defaultMessage ?? "Olá! Vi no Instagram e quero saber mais.");
  const [numberId, setNumberId] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["organicLinks", client.id] });
  const create = useMutation({
    mutationFn: () =>
      artAgendaService.createLink(client.id, {
        socialPostId: socialPostId ?? null,
        name: name.trim(),
        message: message.trim(),
        whatsappConfigurationId: numberId || numbers[0]?.id,
      }),
    onError: requestErrorHandling,
    onSuccess: (link) => {
      invalidate();
      copy(link.url);
    },
  });
  const toggle = useMutation({
    mutationFn: (link: OrganicLink) => artAgendaService.updateLink(client.id, link.id, { active: !link.active }),
    onError: requestErrorHandling,
    onSuccess: invalidate,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    create.mutate();
  };

  const links = linksQuery.data ?? [];

  return (
    <div className="space-y-4">
      {linksQuery.isLoading ? (
        <LoadingState className="justify-start py-2" />
      ) : links.length > 0 ? (
        <ul className="space-y-2">
          {links.map((link) => (
            <li key={link.id} className="space-y-1 rounded-lg border p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{link.name}</span>
                {canManage && (
                  <label className="text-muted-foreground flex items-center gap-2 text-xs">
                    {link.active ? "Ligado" : "Desligado"}
                    <Switch
                      checked={link.active}
                      onCheckedChange={() => toggle.mutate(link)}
                      aria-label={`Ligar ou desligar ${link.name}`}
                    />
                  </label>
                )}
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-muted min-w-0 flex-1 truncate rounded px-2 py-1 text-xs select-all">{link.url}</code>
                <Button size="icon" variant="ghost" aria-label="Copiar o link" onClick={() => copy(link.url)}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-muted-foreground text-xs tabular-nums">
                {link.clicks} clique(s) · {link.conversations} conversa(s)
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-muted-foreground text-sm">Nenhum link ainda.</p>
      )}

      {canManage && (
        <form onSubmit={onSubmit} className="grid gap-3 rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">Novo link</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="organic-link-name">Nome</Label>
              <Input id="organic-link-name" value={name} maxLength={200} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organic-link-number">Número</Label>
              <select
                id="organic-link-number"
                className={selectClassName}
                value={numberId || numbers[0]?.id || ""}
                onChange={(event) => setNumberId(event.target.value)}
              >
                {numbers.map((number) => (
                  <option key={number.id} value={number.id}>
                    {number.phoneNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organic-link-message">Mensagem que abre no WhatsApp</Label>
            <Input id="organic-link-message" value={message} maxLength={1000} onChange={(event) => setMessage(event.target.value)} />
            <p className="text-muted-foreground text-xs">
              O código do link entra no fim da mensagem; é por ele que a conversa é reconhecida.
            </p>
          </div>
          <Button
            type="submit"
            size="sm"
            className="justify-self-start"
            disabled={!name.trim() || !message.trim() || !numbers.length || create.isPending}
          >
            {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
            Criar e copiar o link
          </Button>
          {!numbersQuery.isLoading && !numbers.length && <p className="text-destructive text-xs">Conecte um número de WhatsApp antes.</p>}
        </form>
      )}
    </div>
  );
};

/** Diálogo com os links do orgânico do cliente (bio, stories), aberto pela tela de Postagens. */
export const OrganicLinksDialog: FC<{ open: boolean; onOpenChange: (open: boolean) => void }> = ({ open, onOpenChange }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Links para o WhatsApp</DialogTitle>
        <DialogDescription>
          Para a bio do Instagram, o adesivo de link dos stories e as postagens do Facebook. Quem chega por eles fica marcado como vindo do
          orgânico e entra no relatório da Agência.
        </DialogDescription>
      </DialogHeader>
      {open && <OrganicLinks />}
    </DialogContent>
  </Dialog>
);
