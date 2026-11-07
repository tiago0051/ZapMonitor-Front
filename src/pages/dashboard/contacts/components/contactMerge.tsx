import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { contactService } from "@/services/api/contactService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { useDebounceValue } from "usehooks-ts";
import { contactDisplayName } from "../contactUtils";

type ContactMergeProps = {
  contact: ContactDetail;
  onMerged: (contact: ContactDetail) => void;
};

/**
 * Junta outra ficha da mesma pessoa nesta: telefones, e-mails, conversas e negócios passam para cá e a outra é
 * apagada. Sugere as fichas com o mesmo nome e permite buscar qualquer outra.
 */
export const ContactMerge: FC<ContactMergeProps> = ({ contact, onMerged }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounceValue(search.trim(), 400);
  // Ficha escolhida, esperando a confirmação
  const [pendingId, setPendingId] = useState<string | null>(null);

  const searchQuery = useQuery({
    queryKey: ["contacts", "list", client.id, "merge", debouncedSearch],
    queryFn: () => contactService.findAll(client.id, { search: debouncedSearch, take: 5 }),
    enabled: debouncedSearch.length >= 2,
  });

  const merge = useMutation({
    mutationFn: (sourceId: string) => contactService.merge(client.id, contact.id, sourceId),
    onError: requestErrorHandling,
    onSuccess: (updated, sourceId) => {
      onMerged(updated);
      queryClient.removeQueries({ queryKey: ["contacts", "detail", client.id, sourceId] });
      setPendingId(null);
      setSearch("");
      toast.success("Fichas mescladas");
    },
  });

  if (!can("contacts.manage")) return null;

  const candidates = [
    ...contact.sameName,
    ...(searchQuery.data?.items ?? []).filter((item) => item.id !== contact.id && !contact.sameName.some((same) => same.id === item.id)),
  ];

  return (
    <section className="grid gap-2">
      <h3 className="text-muted-foreground text-[11px] font-semibold tracking-wider uppercase">Mesclar com outra ficha</h3>
      <p className="text-muted-foreground text-xs">
        Use quando a mesma pessoa tem duas fichas. Telefones, e-mails, conversas e negócios da outra ficha vêm para esta, e a outra é
        apagada. Os dados desta ficha são mantidos; os campos vazios recebem os da outra.
      </p>
      <Input
        aria-label="Buscar a outra ficha"
        placeholder="Buscar por nome, telefone ou e-mail"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      {contact.sameName.length > 0 && !search && <p className="text-muted-foreground text-xs">Fichas com o mesmo nome:</p>}
      <ul className="grid gap-1.5">
        {candidates.map((candidate) => (
          <li key={candidate.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{contactDisplayName(candidate)}</p>
              <p className="text-muted-foreground truncate text-xs">
                {[candidate.phone, candidate.email].filter(Boolean).join(" · ") || "sem telefone e e-mail"}
                {candidate.dealCount > 0 && ` · ${candidate.dealCount} ${candidate.dealCount === 1 ? "negócio" : "negócios"}`}
              </p>
            </div>
            {pendingId === candidate.id ? (
              <div className="flex gap-1">
                <Button size="sm" variant="destructive" disabled={merge.isPending} onClick={() => merge.mutate(candidate.id)}>
                  Confirmar
                </Button>
                <Button size="sm" variant="ghost" disabled={merge.isPending} onClick={() => setPendingId(null)}>
                  Cancelar
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setPendingId(candidate.id)}>
                Juntar nesta
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
};
