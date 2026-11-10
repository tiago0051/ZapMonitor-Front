import { Button } from "@/components/ui/button";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { contactDisplayName } from "../contactUtils";

type ContactMergeSuggestionsProps = {
  contact: ContactDetail;
  onChanged: (contact: ContactDetail) => void;
};

const sourceLabel: Record<string, string> = {
  LEAD_FORM: "formulário de cadastro",
  AI: "IA, lido na conversa",
  API: "integração",
};

/**
 * Outra ficha com o mesmo e-mail ou telefone, e as duas conversando no WhatsApp: pode ser a mesma pessoa. Juntar traz a
 * outra para esta; "não é a mesma pessoa" some com a sugestão.
 */
export const ContactMergeSuggestions: FC<ContactMergeSuggestionsProps> = ({ contact, onChanged }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const merge = useMutation({
    mutationFn: (sourceId: string) => contactService.merge(client.id, contact.id, sourceId),
    onError: requestErrorHandling,
    onSuccess: (updated, sourceId) => {
      onChanged(updated);
      queryClient.removeQueries({ queryKey: ["contacts", "detail", client.id, sourceId] });
      setPendingId(null);
      toast.success("Fichas mescladas");
    },
  });
  const dismiss = useMutation({
    mutationFn: (suggestionId: string) => contactService.dismissMergeSuggestion(client.id, contact.id, suggestionId),
    onError: requestErrorHandling,
    onSuccess: onChanged,
  });

  if (contact.mergeSuggestions.length === 0) return null;
  const canMerge = can("contacts.manage");

  return (
    <section className="grid gap-2">
      <h3 className="text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wider uppercase">
        <Users className="h-3 w-3 text-amber-600" />
        Pode ser a mesma pessoa
      </h3>
      {contact.mergeSuggestions.map((suggestion) => (
        <div
          key={suggestion.id}
          className="grid gap-2 rounded-lg border border-amber-300 bg-amber-50/60 px-3 py-2 text-sm dark:border-amber-700/60 dark:bg-amber-950/30"
        >
          <p>
            A ficha de{" "}
            <Link to={`${baseUrl}/contacts/${suggestion.other.id}`} className="font-medium underline-offset-2 hover:underline">
              {contactDisplayName(suggestion.other)}
            </Link>{" "}
            tem o mesmo {suggestion.reason === "EMAIL" ? "e-mail" : "telefone"}:{" "}
            <span className="font-medium break-all">{suggestion.sharedValue}</span>
          </p>
          <p className="text-muted-foreground text-xs">
            Veio de {sourceLabel[suggestion.source] ?? suggestion.source}. Juntar traz telefones, e-mails, conversas e negócios da outra
            ficha para esta e apaga a outra.
          </p>
          {canMerge ? (
            <div className="flex flex-wrap gap-2">
              {pendingId === suggestion.id ? (
                <>
                  <Button size="sm" variant="destructive" disabled={merge.isPending} onClick={() => merge.mutate(suggestion.other.id)}>
                    Confirmar
                  </Button>
                  <Button size="sm" variant="ghost" disabled={merge.isPending} onClick={() => setPendingId(null)}>
                    Cancelar
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => setPendingId(suggestion.id)}>
                    Juntar nesta ficha
                  </Button>
                  <Button size="sm" variant="ghost" disabled={dismiss.isPending} onClick={() => dismiss.mutate(suggestion.id)}>
                    Não é a mesma pessoa
                  </Button>
                </>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground text-xs">Peça a quem pode mesclar contatos para decidir.</p>
          )}
        </div>
      ))}
    </section>
  );
};
