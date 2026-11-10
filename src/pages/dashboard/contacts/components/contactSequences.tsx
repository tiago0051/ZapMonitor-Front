import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useBaseUrl } from "@/hooks/use-baseUrl";
import { cn } from "@/lib/utils";
import { selectClassName } from "@/pages/dashboard/broadcasts/audienceSources";
import { enrollmentStatusInfo, stopReasonLabel } from "@/pages/dashboard/broadcasts/sequences/sequenceUtils";
import { emailSequenceService } from "@/services/api/emailSequenceService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState, type FC } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

/** Sequências de e-mail da pessoa: em quais está, e colocar ou tirar. */
export const ContactSequences: FC<{ contactId: string; hasEmail: boolean }> = ({ contactId, hasEmail }) => {
  const { client, can } = useClientContext();
  const baseUrl = useBaseUrl();
  const queryClient = useQueryClient();
  const [sequenceId, setSequenceId] = useState("");
  const { confirm, confirmDialog } = useConfirm();
  const canSend = can("broadcasts.send");

  const enrollmentsKey = ["emailSequences", client.id, "enrollments", "contact", contactId];
  const enrollmentsQuery = useQuery({
    queryKey: enrollmentsKey,
    queryFn: () => emailSequenceService.findEnrollments(client.id, { contactId, take: 50 }),
  });
  const sequencesQuery = useQuery({
    queryKey: ["emailSequences", client.id, "list"],
    queryFn: () => emailSequenceService.findAll(client.id),
    enabled: canSend,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: enrollmentsKey });
    queryClient.invalidateQueries({ queryKey: ["contacts", "timeline", client.id, contactId] });
  };

  const enroll = useMutation({
    mutationFn: () => emailSequenceService.enroll(client.id, sequenceId, { contactId }),
    onError: requestErrorHandling,
    onSuccess: () => {
      setSequenceId("");
      refresh();
      toast.success("Colocada na sequência");
    },
  });
  const stop = useMutation({
    mutationFn: (enrollmentId: string) => emailSequenceService.stopEnrollment(client.id, enrollmentId),
    onError: requestErrorHandling,
    onSuccess: () => {
      refresh();
      toast.success("Tirada da sequência");
    },
  });

  const enrollments = enrollmentsQuery.data?.items ?? [];
  const activeIds = new Set(enrollments.filter((item) => item.status === "ACTIVE").map((item) => item.sequenceId));
  const available = (sequencesQuery.data ?? []).filter((sequence) => sequence.active && !activeIds.has(sequence.id));

  if (!enrollments.length && !canSend) return null;

  const onStop = async (enrollmentId: string, sequenceName: string) => {
    const ok = await confirm({
      title: "Tirar da sequência?",
      description: `A pessoa deixa de receber os próximos e-mails de "${sequenceName}". Para voltar, será preciso colocá-la de novo.`,
      confirmLabel: "Tirar",
      destructive: true,
    });
    if (ok) stop.mutate(enrollmentId);
  };

  return (
    <section className="grid gap-3 rounded-xl border p-4">
      {confirmDialog}
      <h2 className="text-lg font-semibold">Sequências de e-mail</h2>
      {enrollments.length === 0 && <p className="text-muted-foreground text-sm">Não está em nenhuma sequência.</p>}
      {enrollments.length > 0 && (
        <ul className="grid gap-2">
          {enrollments.map((item) => {
            const status = enrollmentStatusInfo[item.status];
            return (
              <li key={item.id} className="flex flex-wrap items-center gap-2 text-sm">
                <div className="min-w-0 flex-1">
                  <Link to={`${baseUrl}/broadcasts/sequences/${item.sequenceId}`} className="font-medium hover:underline">
                    {item.sequenceName}
                  </Link>
                  <p className="text-muted-foreground text-xs">
                    {item.status === "ACTIVE" && item.nextRunAt
                      ? `e-mail ${item.stepIndex + 1} em ${format(new Date(item.nextRunAt), "dd/MM HH:mm")}`
                      : item.status === "STOPPED" && item.stoppedReason
                        ? (stopReasonLabel[item.stoppedReason] ?? item.stoppedReason)
                        : `desde ${format(new Date(item.createdAt), "dd/MM/yyyy")}`}
                  </p>
                </div>
                <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", status.className)}>{status.label}</span>
                {canSend && item.status === "ACTIVE" && (
                  <Button variant="ghost" size="sm" disabled={stop.isPending} onClick={() => onStop(item.id, item.sequenceName)}>
                    Tirar
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {canSend && (
        <div className="grid gap-1.5">
          <Label htmlFor="contact-sequence">Colocar numa sequência</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              id="contact-sequence"
              className={selectClassName}
              value={sequenceId}
              disabled={!hasEmail || !available.length}
              onChange={(event) => setSequenceId(event.target.value)}
            >
              <option value="">
                {!hasEmail ? "A ficha não tem e-mail" : available.length ? "Escolha a sequência" : "Nenhuma sequência ligada disponível"}
              </option>
              {available.map((sequence) => (
                <option key={sequence.id} value={sequence.id}>
                  {sequence.name}
                </option>
              ))}
            </select>
            <Button variant="outline" disabled={!sequenceId || enroll.isPending} onClick={() => enroll.mutate()}>
              Colocar
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
