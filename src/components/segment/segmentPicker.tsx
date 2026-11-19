import { useConfirm } from "@/components/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { segmentService } from "@/services/api/segmentService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FC } from "react";
import { toast } from "sonner";
import { SegmentBuilder, segmentSelectClassName } from "./segmentBuilder";
import { emptySegmentRules, sameSegmentRules, segmentRulesError } from "./segmentUtils";
import { useSegmentPreview } from "./useSegmentPreview";

const count = (value: number) => value.toLocaleString("pt-BR");

type SegmentPickerProps = {
  value: SegmentSelection;
  onChange: (value: SegmentSelection) => void;
  // Destaca a contagem do canal do disparo
  channel?: "WHATSAPP" | "EMAIL";
  idPrefix?: string;
};

/** Segmento salvo ou montado na hora, com a contagem do servidor e o botão de salvar para reutilizar. */
export const SegmentPicker: FC<SegmentPickerProps> = ({ value, onChange, channel, idPrefix = "segment" }) => {
  const { client, can } = useClientContext();
  const queryClient = useQueryClient();
  const { confirm, confirmDialog } = useConfirm();
  const [saveName, setSaveName] = useState<string | null>(null);
  const canSave = can("broadcasts.send");

  const segmentsQuery = useQuery({
    queryKey: ["segments", client.id],
    queryFn: () => segmentService.findAll(client.id),
  });
  const segments = segmentsQuery.data ?? [];
  const saved = segments.find((segment) => segment.id === value.segmentId) ?? null;
  const changed = !!saved && !sameSegmentRules(saved.rules, value.rules);

  const rulesError = segmentRulesError(value.rules);
  const previewQuery = useSegmentPreview(value.rules);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["segments", client.id] });

  const saveMutation = useMutation({
    mutationFn: (input: { mode: "create" | "update"; name: string }) =>
      input.mode === "update" && saved
        ? segmentService.update(client.id, saved.id, { name: saved.name, rules: value.rules })
        : segmentService.create(client.id, { name: input.name, rules: value.rules }),
    onError: requestErrorHandling,
    onSuccess: (segment) => {
      invalidate();
      setSaveName(null);
      onChange({ segmentId: segment.id, rules: segment.rules });
      toast.success("Segmento salvo", { description: "Ele aparece nos disparos, nas campanhas de e-mail, nas sequências e nos contatos." });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => segmentService.remove(client.id, id),
    onError: requestErrorHandling,
    onSuccess: () => {
      invalidate();
      onChange({ segmentId: null, rules: value.rules });
      toast.success("Segmento excluído");
    },
  });

  const preview = previewQuery.data;

  return (
    <div className="grid gap-4">
      {confirmDialog}
      <div className="grid gap-1.5">
        <Label htmlFor={`${idPrefix}-saved`}>Segmento</Label>
        <select
          id={`${idPrefix}-saved`}
          className={segmentSelectClassName}
          value={value.segmentId ?? ""}
          onChange={(event) => {
            const segment = segments.find((item) => item.id === event.target.value);
            onChange(segment ? { segmentId: segment.id, rules: segment.rules } : { segmentId: null, rules: emptySegmentRules() });
          }}
        >
          <option value="">Montar agora</option>
          {segments.map((segment) => (
            <option key={segment.id} value={segment.id}>
              {segment.name}
            </option>
          ))}
        </select>
        {changed && <p className="text-muted-foreground text-xs">Você mudou as regras deste segmento; salve para reutilizar assim.</p>}
      </div>

      <SegmentBuilder value={value.rules} onChange={(rules) => onChange({ ...value, rules })} idPrefix={idPrefix} />

      <div className="bg-muted/40 grid gap-1 rounded-lg p-3 text-sm" aria-live="polite">
        {rulesError ? (
          <p className="text-muted-foreground">{rulesError}.</p>
        ) : previewQuery.isFetching && !preview ? (
          <p className="text-muted-foreground">Contando...</p>
        ) : preview ? (
          <>
            <p>
              <span className="font-semibold tabular-nums">{count(preview.total)}</span> {preview.total === 1 ? "pessoa" : "pessoas"} no
              segmento
            </p>
            <p className="text-muted-foreground text-xs">
              <span className={channel === "WHATSAPP" ? "text-foreground font-medium" : undefined}>
                {count(preview.withPhone)} com telefone
              </span>
              {" · "}
              <span className={channel === "EMAIL" ? "text-foreground font-medium" : undefined}>
                {count(preview.withEmail)} com e-mail que pode receber
              </span>
            </p>
          </>
        ) : null}
      </div>

      {canSave && !rulesError && (
        <div className="grid gap-2">
          {saveName === null ? (
            <div className="flex flex-wrap gap-2">
              {saved && changed && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saveMutation.isPending}
                  onClick={() => saveMutation.mutate({ mode: "update", name: saved.name })}
                >
                  Salvar alterações em "{saved.name}"
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => setSaveName(saved ? `${saved.name} (cópia)` : "")}>
                {saved ? "Salvar como novo segmento" : "Salvar segmento para reutilizar"}
              </Button>
              {saved && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={removeMutation.isPending}
                  onClick={async () => {
                    const ok = await confirm({
                      title: `Excluir o segmento "${saved.name}"?`,
                      description: "As campanhas já criadas com ele não mudam.",
                      confirmLabel: "Excluir",
                      destructive: true,
                    });
                    if (ok) removeMutation.mutate(saved.id);
                  }}
                >
                  Excluir segmento
                </Button>
              )}
            </div>
          ) : (
            <form
              className="flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (saveName.trim()) saveMutation.mutate({ mode: "create", name: saveName.trim() });
              }}
            >
              <Input
                aria-label="Nome do segmento"
                autoFocus
                maxLength={120}
                placeholder="Ex.: Clientes VIP sem compra em 90 dias"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={!saveName.trim() || saveMutation.isPending}>
                  Salvar
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSaveName(null)}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
