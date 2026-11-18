import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { cn } from "@/lib/utils";
import { socialPostService } from "@/services/api/socialPostService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { MessageSquareWarning, SendHorizontal } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { socialApprovalInfo, socialTextareaClassName } from "./postsUtils";

type Props = {
  post: SocialPost;
  // Salva o que foi editado na tela antes de enviar
  beforeSend: () => Promise<void>;
  onChange: (post: SocialPost) => void;
};

const SENDABLE_STATUSES: SocialPostStatus[] = ["READY", "FAILED"];

/** Aviso do pedido aberto (aguardando ou ajuste pedido) com o recado. */
export const PostApprovalNotice: FC<{ post: SocialPost }> = ({ post }) => {
  if (!post.approvalStatus) return null;
  const info = socialApprovalInfo[post.approvalStatus];
  return (
    <div className={cn("grid gap-1 rounded-lg p-3 text-sm", info.className)}>
      <p className="font-medium">
        {info.label}
        {post.approvalStatus === "PENDING" && post.approvalRequestedAt && (
          <span className="font-normal"> · enviada em {format(new Date(post.approvalRequestedAt), "dd/MM 'às' HH:mm")}</span>
        )}
      </p>
      {post.approvalNote && (
        <p className="whitespace-pre-line">
          {post.approvalStatus === "CHANGES" ? "O que ajustar: " : "Recado: "}
          {post.approvalNote}
        </p>
      )}
    </div>
  );
};

/** Quem cria sem poder publicar: envia a postagem pronta para quem publica aprovar. */
export const PostApprovalRequest: FC<Props> = ({ post, beforeSend, onChange }) => {
  const { client } = useClientContext();
  const [note, setNote] = useState("");
  const send = useMutation({
    mutationFn: async () => {
      await beforeSend();
      return socialPostService.requestApproval(client.id, post.id, note.trim() || undefined);
    },
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onChange(updated);
      setNote("");
      toast.success("Enviada para aprovação. Quem pode publicar recebe o aviso.");
    },
  });

  if (!SENDABLE_STATUSES.includes(post.status)) return null;
  if (post.approvalStatus === "PENDING")
    return <p className="text-muted-foreground text-sm">Quem pode publicar vai revisar e publicar ou pedir ajuste.</p>;

  return (
    <div className="grid gap-2 rounded-lg border p-3">
      <Label htmlFor="post-approval-note">{post.approvalStatus === "CHANGES" ? "Ajustou? Envie de novo" : "Enviar para aprovar"}</Label>
      <p className="text-muted-foreground text-xs">Você cria e revisa; quem pode publicar aprova, agenda ou pede ajuste.</p>
      <textarea
        id="post-approval-note"
        value={note}
        maxLength={2000}
        placeholder="Recado para quem aprova (opcional)"
        onChange={(event) => setNote(event.target.value)}
        className={cn(socialTextareaClassName, "min-h-16")}
      />
      <Button className="justify-self-start" disabled={send.isPending} onClick={() => send.mutate()}>
        <SendHorizontal className="mr-2 h-4 w-4" aria-hidden />
        {send.isPending ? "Enviando..." : "Enviar para aprovar"}
      </Button>
    </div>
  );
};

/** Quem publica, numa postagem aguardando aprovação: devolve com o que ajustar. */
export const PostRequestChanges: FC<Omit<Props, "beforeSend">> = ({ post, onChange }) => {
  const { client } = useClientContext();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const request = useMutation({
    mutationFn: () => socialPostService.requestChanges(client.id, post.id, note.trim()),
    onError: requestErrorHandling,
    onSuccess: (updated) => {
      onChange(updated);
      setOpen(false);
      setNote("");
      toast.success("Ajuste pedido. Quem enviou recebe o aviso.");
    },
  });

  if (post.approvalStatus !== "PENDING") return null;
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        <MessageSquareWarning className="mr-2 h-4 w-4" aria-hidden />
        Pedir ajuste
      </Button>
    );

  return (
    <div className="grid basis-full gap-2 rounded-lg border p-3">
      <Label htmlFor="post-changes-note">O que precisa ajustar?</Label>
      <textarea
        id="post-changes-note"
        value={note}
        maxLength={2000}
        autoFocus
        placeholder="Ex.: troque a foto pela do produto novo e tire o preço da legenda"
        onChange={(event) => setNote(event.target.value)}
        className={cn(socialTextareaClassName, "min-h-16")}
      />
      <div className="flex flex-wrap gap-2">
        <Button disabled={!note.trim() || request.isPending} onClick={() => request.mutate()}>
          {request.isPending ? "Enviando..." : "Devolver com ajuste"}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  );
};
