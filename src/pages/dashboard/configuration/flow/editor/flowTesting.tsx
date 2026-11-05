import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { flowService } from "@/services/api/flowService";
import { formatPhoneNumber } from "@/utils/formatString";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { useState, type FC } from "react";
import { toast } from "sonner";

const showPhone = (digits: string) => {
  try {
    return formatPhoneNumber(`+${digits}`);
  } catch {
    return `+${digits}`;
  }
};

type Props = {
  clientId: string;
  flow: Flow;
};

/**
 * Números de teste: quando um deles escreve para qualquer WhatsApp do cliente, o atendimento roda o rascunho deste
 * fluxo (ou a versão publicada, sem rascunho). Os demais contatos continuam na versão publicada.
 */
export const FlowTestContacts: FC<Props> = ({ clientId, flow }) => {
  const queryClient = useQueryClient();
  const params = { clientId, flowId: flow.id };
  const queryKey = ["flowTestContacts", clientId, flow.id];
  const [phoneNumber, setPhoneNumber] = useState("");

  const contactsQuery = useQuery({ queryKey, queryFn: () => flowService.findTestContacts({ params }) });
  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const addContact = useMutation({
    mutationFn: () => flowService.addTestContact({ params, body: { phoneNumber } }),
    onError: requestErrorHandling,
    onSuccess: (contact) => {
      setPhoneNumber("");
      refresh();
      toast.success(`${showPhone(contact.phoneNumber)} agora testa este fluxo`, {
        description: "Mande uma mensagem desse celular para qualquer número do cliente para começar.",
      });
    },
  });
  const deleteContact = useMutation({
    mutationFn: (testContactId: string) => flowService.deleteTestContact({ params: { ...params, testContactId } }),
    onError: requestErrorHandling,
    onSuccess: refresh,
  });
  const restartTest = useMutation({
    mutationFn: (testContactId: string) => flowService.restartTest({ params: { ...params, testContactId } }),
    onError: requestErrorHandling,
    onSuccess: ({ finished }) =>
      toast.success(finished ? "Atendimento de teste encerrado" : "Esse número não tinha atendimento aberto", {
        description: "A próxima mensagem começa o fluxo do zero.",
      }),
  });

  const contacts = contactsQuery.data ?? [];

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" title="Números que caem no rascunho deste fluxo">
          <FlaskConical className="h-4 w-4" />
          Testar{contacts.length > 0 && ` (${contacts.length})`}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Números de teste</p>
          <p className="text-muted-foreground text-xs">
            Quando um destes celulares manda mensagem para qualquer WhatsApp do cliente, o atendimento roda o{" "}
            {flow.draftDefinition ? "rascunho salvo" : "fluxo"} — mesmo sem publicar e sem número ligado. Salve o rascunho antes de testar.
            As ações são reais (CRM, categorias, fila), e o atendimento fica marcado como teste e fora dos relatórios.
          </p>
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (phoneNumber.trim()) addContact.mutate();
          }}
        >
          <div className="grid flex-1 gap-1">
            <Label htmlFor="flow-test-phone" className="text-xs">
              Celular com DDD
            </Label>
            <Input
              id="flow-test-phone"
              inputMode="tel"
              placeholder="11 99999-8888"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={!phoneNumber.trim() || addContact.isPending}>
            {addContact.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Adicionar
          </Button>
        </form>

        {contactsQuery.isLoading && <p className="text-muted-foreground text-sm">Carregando…</p>}
        {contactsQuery.isError && <p className="text-destructive text-sm">Não foi possível carregar os números de teste.</p>}
        {contactsQuery.isSuccess && contacts.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum número de teste. Adicione o seu celular para começar.</p>
        )}
        {contacts.length > 0 && (
          <ul className="divide-y rounded-md border">
            {contacts.map((contact) => (
              <li key={contact.id} className="flex items-center gap-1 px-2 py-1.5">
                <span className="flex-1 text-sm tabular-nums">{showPhone(contact.phoneNumber)}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Recomeçar o teste de ${showPhone(contact.phoneNumber)}`}
                  title="Encerrar o atendimento aberto para a próxima mensagem começar do zero"
                  disabled={restartTest.isPending}
                  onClick={() => restartTest.mutate(contact.id)}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Remover ${showPhone(contact.phoneNumber)}`}
                  title="Remover número de teste"
                  disabled={deleteContact.isPending}
                  onClick={() => deleteContact.mutate(contact.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground text-xs">
          Um celular testa um fluxo por vez: adicioná-lo aqui o tira do teste de outro fluxo. Um atendimento já aberto continua no que
          estava; use recomeçar para testar de novo.
        </p>
      </PopoverContent>
    </Popover>
  );
};
