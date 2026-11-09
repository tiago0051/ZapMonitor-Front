import type { FC, ReactNode } from "react";

// Dados da empresa exibidos na política; conferir com o jurídico antes de publicar
const COMPANY = {
  product: "ZapMonitor",
  legalName: "[RAZÃO SOCIAL]",
  document: "[CNPJ]",
  contactEmail: "[E-MAIL DE PRIVACIDADE]",
  panelUrl: "[URL DO PAINEL]",
};

const UPDATED_AT = "9 de novembro de 2026";

const Section: FC<{ id: string; title: string; children: ReactNode }> = ({ id, title, children }) => (
  <section id={id} className="scroll-mt-6 space-y-3">
    <h2 className="text-xl font-semibold">{title}</h2>
    {children}
  </section>
);

/** Política de privacidade pública, sem login; é o link informado na tela de consentimento do Google. */
export const PrivacyPolicy: FC = () => (
  <div className="bg-background text-foreground min-h-screen">
    <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 text-[15px] leading-relaxed sm:py-16">
      <header className="space-y-2 border-b pb-6">
        <p className="text-muted-foreground text-sm font-medium">{COMPANY.product}</p>
        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm">Última atualização: {UPDATED_AT}</p>
      </header>

      <p>
        Esta política explica como o {COMPANY.product}, plataforma de atendimento, automação e CRM pelo WhatsApp e e-mail mantida por{" "}
        {COMPANY.legalName}, inscrita no CNPJ {COMPANY.document} (&quot;nós&quot;), trata dados pessoais, em conformidade com a Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018 – LGPD). Ela vale para o painel em {COMPANY.panelUrl}, para o aplicativo e para as integrações
        oferecidas pela plataforma.
      </p>

      <Section id="papeis" title="1. Quem é responsável pelos dados">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Dados das empresas clientes e dos usuários do painel</strong> (cadastro, login, uso da plataforma): somos o{" "}
            <em>controlador</em>.
          </li>
          <li>
            <strong>Dados dos contatos atendidos pelas empresas clientes</strong> (mensagens, fichas de contato, negócios, agendamentos): a
            empresa cliente é a controladora e nós atuamos como <em>operador</em>, tratando esses dados apenas para prestar o serviço
            contratado e conforme as instruções dela. Pedidos sobre esses dados devem ser feitos primeiro à empresa com quem a pessoa
            conversou.
          </li>
        </ul>
      </Section>

      <Section id="dados" title="2. Dados que tratamos">
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <strong>Cadastro e acesso:</strong> nome, e-mail, telefone, empresa, permissões e registros de login.
          </li>
          <li>
            <strong>Atendimento:</strong> mensagens de WhatsApp e e-mail, áudios, imagens e documentos trocados, números de telefone, nomes
            e dados que as empresas registram nas fichas de contato e no CRM.
          </li>
          <li>
            <strong>Integrações conectadas pela empresa cliente:</strong> dados das contas de anúncio da Meta, números de WhatsApp e, quando
            conectado, o Google Agenda (detalhado na seção 4).
          </li>
          <li>
            <strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo, registros de erro e de uso do painel, usados para
            segurança, suporte e melhoria do produto.
          </li>
        </ul>
      </Section>

      <Section id="finalidades" title="3. Para que usamos os dados">
        <ul className="list-disc space-y-2 pl-6">
          <li>Prestar o serviço contratado: atendimento, automações, agentes de IA, CRM, campanhas e relatórios.</li>
          <li>Autenticar usuários, proteger as contas e prevenir fraudes e abusos.</li>
          <li>Cobrança, suporte e comunicações sobre o serviço.</li>
          <li>Cumprir obrigações legais e regulatórias.</li>
        </ul>
        <p>
          As bases legais são a execução do contrato com a empresa cliente, o cumprimento de obrigação legal, o legítimo interesse
          (segurança e melhoria do produto) e, quando necessário, o consentimento.
        </p>
      </Section>

      <Section id="google" title="4. Dados do Google (Google Agenda)">
        <p>
          A empresa cliente pode conectar uma conta Google para que os agentes de IA do {COMPANY.product} controlem a agenda dela: consultar
          horários livres, marcar, remarcar e desmarcar sessões com os contatos atendidos. A conexão é feita pelo login do Google, por um
          usuário com permissão de administração no painel, e pode ser desfeita a qualquer momento.
        </p>
        <h3 className="font-semibold">Dados acessados</h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>O endereço de e-mail da conta Google conectada, para identificar a conexão no painel.</li>
          <li>A lista de agendas da conta, para a empresa escolher em qual agenda as sessões são marcadas.</li>
          <li>
            Os eventos da agenda escolhida, apenas para saber quais horários estão ocupados e para criar, alterar e excluir os eventos das
            sessões marcadas pelos agentes.
          </li>
        </ul>
        <h3 className="font-semibold">Como usamos e guardamos</h3>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            Dos eventos já existentes, usamos somente o início e o fim para calcular os horários livres. Títulos, descrições, participantes
            e demais detalhes desses eventos não são armazenados nem mostrados aos contatos ou à IA.
          </li>
          <li>
            Guardamos o token de acesso concedido pelo Google, criptografado, e, para cada sessão marcada pelos agentes, o identificador do
            evento, a agenda, o início, o fim e o contato que a marcou, para que cada contato só consiga remarcar ou desmarcar as próprias
            sessões.
          </li>
          <li>
            Ao provedor de IA enviamos apenas os horários livres já calculados e os dados das sessões do próprio contato, nunca os
            compromissos da agenda.
          </li>
        </ul>
        <h3 className="font-semibold">Uso Limitado</h3>
        <p>
          O uso e a transferência, para qualquer outro aplicativo, de informações recebidas das APIs do Google seguem a{" "}
          <a
            className="text-primary underline underline-offset-2"
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Política de Dados do Usuário dos Serviços de API do Google
          </a>
          , incluindo os requisitos de Uso Limitado. Em especial:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>usamos os dados do Google apenas para oferecer e melhorar a função de agenda visível para a empresa cliente;</li>
          <li>não vendemos esses dados e não os usamos para publicidade, perfilamento ou avaliação de crédito;</li>
          <li>não usamos esses dados para treinar modelos de inteligência artificial;</li>
          <li>
            não os transferimos a terceiros, exceto quando necessário para prestar o serviço, por exigência legal ou em fusão ou aquisição,
            com aviso prévio;
          </li>
          <li>
            pessoas da nossa equipe não leem esses dados, salvo com consentimento da empresa cliente, para investigar problemas de segurança
            ou cumprir a lei.
          </li>
        </ul>
        <h3 className="font-semibold">Como revogar o acesso</h3>
        <p>
          No painel, em Configurações → Google Agenda → Desconectar, ou na página de permissões da conta Google (
          <a
            className="text-primary underline underline-offset-2"
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          ). Ao desconectar, o token é revogado e apagado; as sessões já marcadas continuam na agenda do Google.
        </p>
      </Section>

      <Section id="compartilhamento" title="5. Com quem compartilhamos">
        <p>
          Compartilhamos dados apenas com fornecedores necessários para operar o serviço, sob contrato e com obrigações de
          confidencialidade:
        </p>
        <ul className="list-disc space-y-2 pl-6">
          <li>infraestrutura em nuvem e armazenamento de arquivos (Microsoft Azure);</li>
          <li>Meta, para envio e recebimento de mensagens do WhatsApp e integrações de anúncios conectadas pela empresa;</li>
          <li>Google, para os recursos de inteligência artificial (Gemini) e para o Google Agenda, quando conectado;</li>
          <li>Amazon Web Services, para envio de e-mails;</li>
          <li>ferramentas de monitoramento de erros e de uso do painel (Microsoft Application Insights e Microsoft Clarity).</li>
        </ul>
        <p>Também podemos compartilhar dados quando exigido por lei ou por ordem de autoridade competente. Não vendemos dados pessoais.</p>
      </Section>

      <Section id="transferencia" title="6. Transferência internacional">
        <p>
          Alguns fornecedores processam dados fora do Brasil. Nesses casos, adotamos as garantias previstas na LGPD, como cláusulas
          contratuais e fornecedores com níveis adequados de proteção.
        </p>
      </Section>

      <Section id="retencao" title="7. Por quanto tempo guardamos">
        <p>
          Mantemos os dados enquanto a empresa cliente usar o serviço e pelo tempo necessário para cumprir obrigações legais ou exercer
          direitos. Ao fim do contrato, ou a pedido da empresa cliente, os dados são excluídos ou anonimizados, salvo quando a lei exigir a
          guarda. Os dados do Google são apagados quando a conta Google é desconectada, e os registros das sessões marcadas são apagados com
          a conta da empresa cliente.
        </p>
      </Section>

      <Section id="seguranca" title="8. Segurança">
        <p>
          Usamos conexão criptografada (HTTPS), criptografia dos tokens de acesso a serviços conectados, controle de acesso por permissões e
          registros de auditoria. Nenhum sistema é totalmente imune a incidentes; se houver um incidente relevante, avisaremos os afetados e
          a Autoridade Nacional de Proteção de Dados, conforme a LGPD.
        </p>
      </Section>

      <Section id="direitos" title="9. Seus direitos">
        <p>
          Você pode pedir confirmação do tratamento, acesso, correção, anonimização, portabilidade, exclusão, informação sobre
          compartilhamento e revogação do consentimento, além de se opor a tratamentos irregulares, pelo e-mail {COMPANY.contactEmail}. Se
          seus dados foram tratados como contato de uma empresa cliente, encaminharemos o pedido a ela.
        </p>
      </Section>

      <Section id="cookies" title="10. Cookies">
        <p>
          O painel usa cookies e armazenamento local necessários para manter o login e as preferências, e cookies de análise de uso para
          melhorar o produto. Você pode bloqueá-los no navegador, mas o login deixa de funcionar sem os cookies necessários.
        </p>
      </Section>

      <Section id="criancas" title="11. Crianças e adolescentes">
        <p>O painel é destinado a empresas e não é direcionado a menores de 18 anos.</p>
      </Section>

      <Section id="alteracoes" title="12. Alterações nesta política">
        <p>
          Podemos atualizar esta política. A data da última atualização fica no topo da página e, em mudanças relevantes, avisaremos as
          empresas clientes pelo painel ou por e-mail.
        </p>
      </Section>

      <Section id="contato" title="13. Contato e encarregado de dados">
        <p>
          Dúvidas e pedidos sobre privacidade: {COMPANY.contactEmail}. {COMPANY.legalName}, CNPJ {COMPANY.document}.
        </p>
      </Section>
    </main>
  </div>
);
