import type { FC } from "react";
import { COMPANY } from "./legalCompany";
import { LegalPage, LegalSection as Section } from "./legalInfo";

const UPDATED_AT = "10 de novembro de 2026";

/** Política de privacidade pública, sem login; é o link informado na tela de consentimento do Google. */
export const PrivacyPolicy: FC = () => (
  <LegalPage title="Política de Privacidade" updatedAt={UPDATED_AT}>
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
          <strong>Atendimento:</strong> mensagens de WhatsApp e e-mail, áudios, imagens e documentos trocados, números de telefone, nomes e
          dados que as empresas registram nas fichas de contato e no CRM.
        </li>
        <li>
          <strong>Integrações conectadas pela empresa cliente:</strong> dados das contas de anúncio da Meta, do Google Ads (YouTube) e do
          TikTok, números de WhatsApp e, quando conectados, o Google Agenda e o canal do YouTube (os dados do Google estão detalhados na
          seção 4).
        </li>
        <li>
          <strong>Dados técnicos:</strong> endereço IP, navegador, dispositivo, registros de erro e de uso do painel, usados para segurança,
          suporte e melhoria do produto.
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
        As bases legais são a execução do contrato com a empresa cliente, o cumprimento de obrigação legal, o legítimo interesse (segurança
        e melhoria do produto) e, quando necessário, o consentimento.
      </p>
    </Section>

    <Section id="google" title="4. Dados do Google (Google Agenda, Google Ads e YouTube)">
      <p>
        A empresa cliente pode conectar uma conta Google para três funções, cada uma com a própria permissão pedida no login do Google: a
        agenda dos agentes de IA, a gestão dos anúncios do YouTube pelo Google Ads e, opcionalmente, o envio de vídeos de anúncio ao canal
        do YouTube. A conexão é feita por um usuário com permissão de administração no painel e pode ser desfeita a qualquer momento.
      </p>
      <h3 className="font-semibold">4.1 Google Agenda</h3>
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
          Dos eventos já existentes, usamos somente o início e o fim para calcular os horários livres. Títulos, descrições, participantes e
          demais detalhes desses eventos não são armazenados nem mostrados aos contatos ou à IA.
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
      <h3 className="font-semibold">4.2 Google Ads (anúncios do YouTube)</h3>
      <p>
        Com a permissão do Google Ads, o {COMPANY.product} acessa as contas de anúncio que a própria empresa cliente escolhe vincular, para
        mostrar os resultados dos anúncios ao lado das vendas registradas no CRM, sugerir melhorias e aplicar mudanças.
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>
          <strong>Dados acessados:</strong> a lista de contas de anúncio que a conta Google alcança; as campanhas, grupos de anúncios,
          anúncios, listas de público e ações de conversão das contas vinculadas; e as métricas diárias (gasto, impressões, cliques,
          visualizações de vídeo e conversões).
        </li>
        <li>
          <strong>Alterações:</strong> pausar ou ativar campanhas, grupos e anúncios, mudar o orçamento diário, criar campanhas de vídeo
          (sempre criadas pausadas) e criar ações de conversão. Nenhuma alteração é feita sem a aprovação de um usuário da empresa cliente
          com essa permissão no painel.
        </li>
        <li>
          <strong>Conversões:</strong> quando uma conversa vinda de um anúncio avança no funil de vendas, enviamos ao Google Ads a conversão
          com o identificador do clique (gclid) ou, sem ele, o telefone do contato transformado em código (hash SHA-256), nunca o telefone
          em texto.
        </li>
        <li>
          <strong>Inteligência artificial:</strong> para escrever as sugestões e os textos de campanha que a empresa cliente vê no painel,
          enviamos ao provedor de IA as métricas e os textos dos anúncios da própria empresa.
        </li>
        <li>
          <strong>Comparação por segmento:</strong> estatísticas agregadas e anônimas de desempenho dos criativos (por exemplo, que tipo de
          abertura de vídeo vende mais) podem ser combinadas entre empresas do mesmo segmento, sem identificar empresas, contas ou pessoas.
          A empresa cliente pode desligar essa participação no painel.
        </li>
        <li>
          Guardamos o token de acesso concedido pelo Google, criptografado, e uma cópia da estrutura e das métricas das contas vinculadas,
          apagada ao desconectar.
        </li>
      </ul>
      <h3 className="font-semibold">4.3 Envio de vídeos ao YouTube (opcional)</h3>
      <p>
        Com a permissão de envio de vídeos do YouTube, o {COMPANY.product} publica no canal da conta Google conectada, como vídeo não
        listado, apenas os vídeos de anúncio que a empresa cliente escolhe enviar pelo painel, para usá-los nas campanhas. Não lemos, não
        alteramos e não apagamos outros vídeos do canal. Essa permissão pode ser recusada no login: nesse caso, a empresa cola o link de um
        vídeo que já está no canal.
      </p>
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
        <li>
          usamos os dados do Google apenas para oferecer e melhorar as funções visíveis para a empresa cliente (agenda, gestão de anúncios e
          envio de vídeos);
        </li>
        <li>
          não vendemos esses dados e não os usamos para publicidade nossa ou de terceiros, para perfilamento ou para avaliação de crédito;
        </li>
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
        No painel, em Configurações → Google Agenda → Desconectar ou Configurações → Anúncios do YouTube → Desconectar, ou na página de
        permissões da conta Google (
        <a
          className="text-primary underline underline-offset-2"
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noreferrer"
        >
          myaccount.google.com/permissions
        </a>
        ). Ao desconectar, o token é revogado e apagado, e a cópia dos dados do Google Ads é excluída; as sessões já marcadas continuam na
        agenda do Google, e as campanhas e vídeos continuam na conta do cliente.
      </p>
    </Section>

    <Section id="compartilhamento" title="5. Com quem compartilhamos">
      <p>
        Compartilhamos dados apenas com fornecedores necessários para operar o serviço, sob contrato e com obrigações de confidencialidade:
      </p>
      <ul className="list-disc space-y-2 pl-6">
        <li>infraestrutura em nuvem e armazenamento de arquivos (Microsoft Azure);</li>
        <li>Meta, para envio e recebimento de mensagens do WhatsApp e integrações de anúncios conectadas pela empresa;</li>
        <li>
          Google, para os recursos de inteligência artificial (Gemini) e, quando conectados, para o Google Agenda, o Google Ads e o YouTube;
        </li>
        <li>TikTok, para as integrações de anúncios conectadas pela empresa;</li>
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
        guarda. Os dados do Google são apagados quando a conta Google é desconectada (a agenda e os anúncios têm conexões separadas), e os
        registros das sessões marcadas são apagados com a conta da empresa cliente.
      </p>
    </Section>

    <Section id="seguranca" title="8. Segurança">
      <p>
        Usamos conexão criptografada (HTTPS), criptografia dos tokens de acesso a serviços conectados, controle de acesso por permissões e
        registros de auditoria. Nenhum sistema é totalmente imune a incidentes; se houver um incidente relevante, avisaremos os afetados e a
        Autoridade Nacional de Proteção de Dados, conforme a LGPD.
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
  </LegalPage>
);
