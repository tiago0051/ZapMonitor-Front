import { TriangleAlert } from "lucide-react";

export const GoogleCalendarHelp = () => {
  return (
    <div className="bg-muted/50 space-y-4 rounded-md border p-4 text-sm">
      <p className="font-semibold">Como gerar a credencial</p>
      <ol className="text-muted-foreground list-decimal space-y-2 pl-4">
        <li>
          No{" "}
          <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-primary underline">
            Google Cloud Console
          </a>
          , crie um projeto (ou use um existente).
        </li>
        <li>
          Em "APIs e serviços", ative a <strong className="text-foreground">Google Calendar API</strong>.
        </li>
        <li>Em "IAM e administrador" &gt; "Contas de serviço", crie uma conta de serviço.</li>
        <li>
          Na conta criada, abra "Chaves" &gt; "Adicionar chave" &gt; "Criar nova chave" &gt; JSON. O arquivo baixado é o que vai no upload.
        </li>
        <li>
          No Google Agenda, abra as configurações da agenda &gt; "Compartilhar com pessoas específicas" e adicione o e-mail da conta de
          serviço com a permissão <strong className="text-foreground">"Fazer alterações nos eventos"</strong>.
        </li>
        <li>
          Na mesma tela, em "Integrar agenda", copie o <strong className="text-foreground">ID da agenda</strong> e cole no formulário.
        </li>
      </ol>

      <div className="flex gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 p-3">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
        <div className="space-y-2">
          <p>
            <strong>
              A IA só reconhece um agendamento como do contato se o telefone dele estiver no título, na descrição ou no local do evento.
            </strong>
          </p>
          <p className="text-muted-foreground">
            Qualquer formato serve, com ou sem DDI e com ou sem o nono dígito, por exemplo <code>(21) 97448-1023</code>. Sem o telefone, a
            IA responde que o contato não tem agendamentos.
          </p>
        </div>
      </div>

      <p className="text-muted-foreground">
        Um agendamento cancelado pela IA é removido da agenda, e os convidados do evento recebem aviso do Google.
      </p>
    </div>
  );
};
