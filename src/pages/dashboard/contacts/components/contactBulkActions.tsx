import { segmentSelectClassName } from "@/components/segment/segmentBuilder";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { downloadBlob } from "@/pages/dashboard/broadcasts/email/emailCampaignUtils";
import { contactService } from "@/services/api/contactService";
import { emailSequenceService } from "@/services/api/emailSequenceService";
import { whatsappService } from "@/services/api/whatsappService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, ListPlus, Tag } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { describeBulkEnroll } from "../contactUtils";

const count = (value: number) => value.toLocaleString("pt-BR");

type PickDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selection: ContactBulkSelection;
  total: number;
  onDone: () => void;
};

const TagDialog: FC<PickDialogProps> = ({ open, onOpenChange, selection, total, onDone }) => {
  const { client } = useClientContext();
  const [categoryId, setCategoryId] = useState("");
  const categoriesQuery = useQuery({
    queryKey: ["whatsappCategories", client.id, "broadcast"],
    queryFn: () =>
      whatsappService.findAllMessageCategoriesByClient({ params: { clientId: client.id }, queries: { page: 1, take: 200, text: "" } }),
    enabled: open,
  });
  const mutation = useMutation({
    mutationFn: () => contactService.bulkTag(client.id, { selection, categoryId }),
    onError: requestErrorHandling,
    onSuccess: ({ tagged, withoutConversation }) => {
      toast.success(`${count(tagged)} ${tagged === 1 ? "contato etiquetado" : "contatos etiquetados"}`, {
        description: withoutConversation
          ? `${count(withoutConversation)} ainda não conversaram pelo WhatsApp; a etiqueta fica na conversa e eles não têm uma.`
          : undefined,
      });
      onOpenChange(false);
      onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Etiquetar {count(total)} contatos</DialogTitle>
          <DialogDescription>A etiqueta vai para as conversas de WhatsApp de cada pessoa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="bulk-tag">Etiqueta</Label>
          <select
            id="bulk-tag"
            className={segmentSelectClassName}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">Selecione</option>
            {(categoriesQuery.data?.items ?? []).map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button disabled={!categoryId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Etiquetando..." : "Etiquetar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SequenceDialog: FC<PickDialogProps> = ({ open, onOpenChange, selection, total, onDone }) => {
  const { client } = useClientContext();
  const [sequenceId, setSequenceId] = useState("");
  const sequencesQuery = useQuery({
    queryKey: ["emailSequences", client.id],
    queryFn: () => emailSequenceService.findAll(client.id),
    enabled: open,
  });
  const sequences = (sequencesQuery.data ?? []).filter((sequence) => sequence.active);
  const mutation = useMutation({
    mutationFn: () => contactService.bulkSequence(client.id, { selection, sequenceId }),
    onError: requestErrorHandling,
    onSuccess: (result) => {
      const { title, description } = describeBulkEnroll(result);
      toast.success(title, { description });
      onOpenChange(false);
      onDone();
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inscrever {count(total)} contatos numa sequência</DialogTitle>
          <DialogDescription>
            Quem tem e-mail recebe a sequência desde o primeiro e-mail. Sem e-mail, descadastrados e quem já está nela ficam de fora.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor="bulk-sequence">Sequência ligada</Label>
          <select
            id="bulk-sequence"
            className={segmentSelectClassName}
            value={sequenceId}
            onChange={(event) => setSequenceId(event.target.value)}
          >
            <option value="">
              {sequencesQuery.isLoading ? "Carregando..." : sequences.length ? "Selecione" : "Nenhuma sequência ligada"}
            </option>
            {sequences.map((sequence) => (
              <option key={sequence.id} value={sequence.id}>
                {sequence.name}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button disabled={!sequenceId || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Inscrevendo..." : "Inscrever"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

type ContactBulkActionsProps = { selection: ContactBulkSelection; total: number; onDone: () => void };

/** Etiquetar, inscrever em sequência e exportar as fichas escolhidas, conforme as permissões. */
export const ContactBulkActions: FC<ContactBulkActionsProps> = ({ selection, total, onDone }) => {
  const { client, can } = useClientContext();
  const [dialog, setDialog] = useState<"tag" | "sequence" | null>(null);

  const exportMutation = useMutation({
    mutationFn: () => contactService.bulkExport(client.id, { selection }),
    onError: requestErrorHandling,
    onSuccess: (blob) => downloadBlob(blob, "contatos.csv"),
  });

  const dialogProps = (kind: "tag" | "sequence") => ({
    open: dialog === kind,
    onOpenChange: (open: boolean) => setDialog(open ? kind : null),
    selection,
    total,
    onDone,
  });

  return (
    <div className="flex flex-wrap gap-2">
      {can("contacts.manage") && (
        <Button type="button" size="sm" variant="outline" onClick={() => setDialog("tag")}>
          <Tag className="mr-1 h-4 w-4" />
          Etiquetar
        </Button>
      )}
      {can("broadcasts.send") && (
        <Button type="button" size="sm" variant="outline" onClick={() => setDialog("sequence")}>
          <ListPlus className="mr-1 h-4 w-4" />
          Inscrever em sequência
        </Button>
      )}
      {can("contacts.manage") && (
        <Button type="button" size="sm" variant="outline" disabled={exportMutation.isPending} onClick={() => exportMutation.mutate()}>
          <Download className="mr-1 h-4 w-4" />
          {exportMutation.isPending ? "Exportando..." : "Exportar CSV"}
        </Button>
      )}
      <TagDialog {...dialogProps("tag")} />
      <SequenceDialog {...dialogProps("sequence")} />
    </div>
  );
};
