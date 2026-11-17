import { LoadingState } from "@/components/state-message";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { memberService } from "@/services/api/memberService";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, UserCheck, UserX } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

type DialogChangeMemberStatusProps = {
  clientId: string;
  member: Pick<Member, "id" | "name" | "email">;
  action: "activate" | "deactivate";
};

const content = {
  activate: {
    trigger: "Ativar",
    title: "Ativar usuário",
    description: "Este usuário voltará a ter acesso a este cliente. Ele não volta sozinho para os grupos de atendimento.",
    confirm: "Ativar",
    icon: UserCheck,
    iconClassName: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
    buttonVariant: "default" as const,
    successMessage: "Usuário ativado",
  },
  deactivate: {
    trigger: "Desativar",
    title: "Desativar usuário",
    description: "Este usuário perderá o acesso a este cliente e sairá de tudo o que tinha aqui.",
    confirm: "Desativar",
    icon: UserX,
    iconClassName: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
    buttonVariant: "destructive" as const,
    successMessage: "Usuário desativado",
  },
};

const selectClassName =
  "border-input dark:bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] disabled:opacity-50";

export const DialogChangeMemberStatus: FC<DialogChangeMemberStatusProps> = ({ clientId, member, action }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const config = content[action];
  const Icon = config.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          {config.trigger}
        </Button>
      </DialogTrigger>

      <DialogContent
        className={cn("max-w-[90vw] rounded-xl p-4", action === "deactivate" ? "max-h-[90dvh] w-[520px] overflow-y-auto" : "w-[320px]")}
      >
        <DialogHeader className="flex flex-col items-center justify-center gap-2 text-center sm:text-center">
          <div className={`flex h-10 w-10 items-center justify-center rounded-full ${config.iconClassName}`}>
            <Icon className="h-5 w-5" />
          </div>

          <DialogTitle className="text-center">{config.title}</DialogTitle>
          <DialogDescription className="text-center">{config.description}</DialogDescription>
        </DialogHeader>

        <div className="bg-muted/50 rounded-lg border px-3 py-2 text-center text-sm">
          <p className="truncate font-medium">{member.name ?? "Sem nome"}</p>
          <p className="text-muted-foreground truncate">{member.email}</p>
        </div>

        {/* O conteúdo monta só com o diálogo aberto, para ler o impacto na hora */}
        {isOpen &&
          (action === "deactivate" ? (
            <DeactivateContent clientId={clientId} member={member} onDone={() => setIsOpen(false)} />
          ) : (
            <ActivateContent clientId={clientId} member={member} onDone={() => setIsOpen(false)} />
          ))}
      </DialogContent>
    </Dialog>
  );
};

type ContentProps = { clientId: string; member: Pick<Member, "id" | "name" | "email">; onDone: () => void };

const ActivateContent: FC<ContentProps> = ({ clientId, member, onDone }) => {
  const queryClient = useQueryClient();
  const activate = useMutation({
    mutationFn: memberService.activate,
    onError: requestErrorHandling,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      toast.success(content.activate.successMessage);
      onDone();
    },
  });

  return (
    <DialogFooter className="gap-2 sm:justify-end">
      <Button type="button" variant="outline" onClick={onDone} disabled={activate.isPending}>
        Voltar
      </Button>
      <Button type="button" onClick={() => activate.mutate({ params: { clientId, userId: member.id } })} disabled={activate.isPending}>
        {content.activate.confirm}
      </Button>
    </DialogFooter>
  );
};

/**
 * Lê onde o usuário está antes de desativar. Grupo em que ele é o único ativo exige um substituto (sem ele, ninguém atende
 * a fila); atendimentos, negócios e tarefas podem passar para outra pessoa ou ficar na fila e sem responsável.
 */
const DeactivateContent: FC<ContentProps> = ({ clientId, member, onDone }) => {
  const queryClient = useQueryClient();
  const [groupReplacements, setGroupReplacements] = useState<Record<string, string>>({});
  const [transferToUserId, setTransferToUserId] = useState("");

  const impactQuery = useQuery({
    queryKey: ["members", clientId, "deactivation-impact", member.id],
    queryFn: () => memberService.findDeactivationImpact(clientId, member.id),
    staleTime: 0,
  });
  const membersQuery = useQuery({
    queryKey: ["members", clientId, "active-list"],
    queryFn: () => memberService.findAll({ params: { clientId }, queries: { page: 1, take: 100, status: "ACTIVE" } }),
  });
  const candidates = (membersQuery.data?.items ?? []).filter((item) => item.id !== member.id);

  const deactivate = useMutation({
    mutationFn: memberService.deactivate,
    onError: (error) => {
      // Outra pessoa pode ter saído de um grupo enquanto o diálogo estava aberto: relê o impacto
      impactQuery.refetch();
      requestErrorHandling(error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members", clientId] });
      queryClient.invalidateQueries({ queryKey: ["serviceGroups"] });
      toast.success(content.deactivate.successMessage);
      onDone();
    },
  });

  if (impactQuery.isLoading || membersQuery.isLoading) return <LoadingState label="Verificando onde o usuário está..." />;
  if (impactQuery.isError || !impactQuery.data)
    return <p className="text-destructive text-sm">Não foi possível verificar onde o usuário está. Feche e tente de novo.</p>;

  const impact = impactQuery.data;
  const criticalGroups = impact.serviceGroups.filter((group) => group.onlyMember);
  const otherGroups = impact.serviceGroups.filter((group) => !group.onlyMember);
  const missing = criticalGroups.filter((group) => !groupReplacements[group.id]);
  const hasAssignments = impact.contactsInService + impact.openDeals + impact.openDealTasks + impact.openPlannerTasks > 0;
  const nothing = !impact.serviceGroups.length && !hasAssignments && !impact.assistantRoutines;
  const canSubmit = !missing.length && !deactivate.isPending;

  const submit = () =>
    deactivate.mutate({
      params: { clientId, userId: member.id },
      body: { serviceGroupReplacements: groupReplacements, transferToUserId: transferToUserId || null },
    });

  return (
    <div className="grid gap-4 text-sm">
      {nothing && (
        <p className="text-muted-foreground text-center">Este usuário não está em grupos nem tem atendimentos, negócios ou tarefas.</p>
      )}

      {criticalGroups.length > 0 && (
        <section className="grid gap-3 rounded-lg border border-amber-300 p-3 dark:border-amber-800">
          <div className="flex gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
            <p>
              <span className="font-medium">Escolha quem substitui. </span>
              {criticalGroups.length === 1 ? "Ele é o único ativo neste grupo" : "Ele é o único ativo nestes grupos"}: sem um substituto,
              ninguém atenderia quem cai na fila.
            </p>
          </div>
          {criticalGroups.map((group) => (
            <div key={group.id} className="grid gap-1">
              <Label htmlFor={`replacement-${group.id}`}>Grupo "{group.name}"</Label>
              <select
                id={`replacement-${group.id}`}
                className={selectClassName}
                value={groupReplacements[group.id] ?? ""}
                aria-invalid={!groupReplacements[group.id]}
                onChange={(event) => setGroupReplacements((current) => ({ ...current, [group.id]: event.target.value }))}
              >
                <option value="">Selecione o substituto</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.name ?? candidate.email}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {!candidates.length && (
            <p className="text-destructive">
              Não há outro usuário ativo neste cliente. Convide ou ative alguém antes de desativar este usuário.
            </p>
          )}
        </section>
      )}

      {(otherGroups.length > 0 || hasAssignments || impact.assistantRoutines > 0) && (
        <section className="grid gap-2">
          <p className="font-medium">O que muda</p>
          <ul className="text-muted-foreground list-disc space-y-1 pl-5">
            {otherGroups.length > 0 && (
              <li>
                Sai {otherGroups.length === 1 ? "do grupo" : "dos grupos"} {otherGroups.map((group) => `"${group.name}"`).join(", ")}{" "}
                (continua com outros atendentes).
              </li>
            )}
            {impact.contactsInService > 0 && <li>{impact.contactsInService} contato(s) em atendimento com ele agora.</li>}
            {impact.openDeals > 0 && <li>{impact.openDeals} negócio(s) aberto(s) sob a responsabilidade dele.</li>}
            {impact.openDealTasks + impact.openPlannerTasks > 0 && (
              <li>{impact.openDealTasks + impact.openPlannerTasks} tarefa(s) pendente(s) com ele (CRM e Planejamento).</li>
            )}
            {impact.assistantRoutines > 0 && <li>{impact.assistantRoutines} rotina(s) do assistente criadas por ele serão desligadas.</li>}
            <li>Os aparelhos dele param de receber avisos deste cliente.</li>
          </ul>
        </section>
      )}

      {hasAssignments && (
        <div className="grid gap-1">
          <Label htmlFor="transfer-to">Quem assume os atendimentos, negócios e tarefas</Label>
          <select
            id="transfer-to"
            className={selectClassName}
            value={transferToUserId}
            onChange={(event) => setTransferToUserId(event.target.value)}
          >
            <option value="">Ninguém: atendimentos voltam para a fila e negócios e tarefas ficam sem responsável</option>
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name ?? candidate.email}
              </option>
            ))}
          </select>
        </div>
      )}

      <p className="text-muted-foreground text-xs">O histórico (quem atendeu, vendeu ou criou) continua com o nome dele.</p>

      <DialogFooter className="gap-2 sm:justify-end">
        <Button type="button" variant="outline" onClick={onDone} disabled={deactivate.isPending}>
          Voltar
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={submit}
          disabled={!canSubmit}
          title={missing.length ? "Escolha o substituto em cada grupo marcado" : undefined}
        >
          {content.deactivate.confirm}
        </Button>
      </DialogFooter>
    </div>
  );
};
