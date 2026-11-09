import type { FC } from "react";
import { Link } from "react-router";
import { COMPANY } from "./legalCompany";
import { LegalPage, LegalSection as Section } from "./legalInfo";

const UPDATED_AT = "9 de novembro de 2026";

/** Termos de serviço públicos, sem login; link da tela de consentimento do Google junto com a política de privacidade. */
export const TermsOfService: FC = () => (
  <LegalPage title="Termos de Serviço" updatedAt={UPDATED_AT}>
    <p>
      Estes termos regem o uso do {COMPANY.product}, plataforma de atendimento, automação e CRM pelo WhatsApp e e-mail mantida por{" "}
      {COMPANY.legalName}, inscrita no CNPJ {COMPANY.document} (&quot;nós&quot;). Ao criar uma conta, acessar o painel em {COMPANY.panelUrl}{" "}
      ou usar o aplicativo, a empresa contratante (&quot;cliente&quot;) e cada pessoa que ela autorizar a usar o painel
      (&quot;usuário&quot;) concordam com estes termos e com a{" "}
      <Link to="/privacidade" className="text-primary underline underline-offset-2">
        Política de Privacidade
      </Link>
      . Se houver contrato ou proposta comercial assinada, as condições dele prevalecem sobre estes termos no que forem diferentes.
    </p>

    <Section id="servico" title="1. O serviço">
      <p>
        O {COMPANY.product} permite que empresas atendam seus contatos pelo WhatsApp e por e-mail, organizem filas e equipes, automatizem
        conversas com fluxos e agentes de inteligência artificial, gerenciem contatos e negócios em um CRM, enviem campanhas e conectem
        serviços de terceiros, como Meta (WhatsApp e anúncios) e Google Agenda. Os recursos disponíveis dependem do plano contratado e podem
        evoluir ao longo do tempo.
      </p>
    </Section>

    <Section id="contas" title="2. Contas e acesso">
      <ul className="list-disc space-y-2 pl-6">
        <li>O cliente é responsável pelas pessoas que convida para o painel e pelas permissões que dá a cada uma.</li>
        <li>
          Cada usuário deve manter suas credenciais em sigilo e nos avisar imediatamente sobre qualquer acesso não autorizado. Atos feitos
          com as credenciais de um usuário são de responsabilidade do cliente.
        </li>
        <li>As informações de cadastro devem ser verdadeiras e mantidas atualizadas.</li>
      </ul>
    </Section>

    <Section id="planos" title="3. Planos, pagamento e cancelamento">
      <ul className="list-disc space-y-2 pl-6">
        <li>
          O serviço é cobrado conforme o plano contratado, que define limites como usuários, números de WhatsApp, atendimentos,
          armazenamento e consumo de IA. Recursos usados além do plano podem ser cobrados à parte, conforme a tabela vigente.
        </li>
        <li>
          Custos de terceiros, como as conversas cobradas pela Meta no WhatsApp, seguem as regras e os preços desses terceiros, salvo se o
          plano disser o contrário.
        </li>
        <li>
          Em caso de atraso no pagamento, podemos limitar ou suspender o acesso depois de avisar o cliente. O cliente pode cancelar a
          qualquer momento, valendo o cancelamento a partir do fim do período já pago, salvo condição diferente no contrato.
        </li>
      </ul>
    </Section>

    <Section id="uso" title="4. Uso aceitável">
      <p>O cliente e os usuários se comprometem a não usar o {COMPANY.product} para:</p>
      <ul className="list-disc space-y-2 pl-6">
        <li>enviar spam ou mensagens a pessoas que não autorizaram o contato, ou desrespeitar pedidos de descadastro;</li>
        <li>
          descumprir as políticas do WhatsApp Business, da Meta, do Google ou de qualquer serviço conectado, inclusive as regras de modelos
          de mensagem e de janela de atendimento;
        </li>
        <li>enganar, assediar, discriminar ou fraudar pessoas, ou divulgar conteúdo ilegal;</li>
        <li>tratar dados pessoais sem base legal ou em desacordo com a LGPD;</li>
        <li>
          tentar acessar dados de outros clientes, contornar limites do plano, explorar falhas de segurança ou sobrecarregar a plataforma;
        </li>
        <li>copiar, revender ou fazer engenharia reversa do serviço sem autorização.</li>
      </ul>
      <p>
        Podemos suspender o acesso, remover conteúdo ou desconectar integrações quando houver violação destes termos, risco à plataforma ou
        a terceiros, ou exigência legal, avisando o cliente sempre que possível.
      </p>
    </Section>

    <Section id="dados" title="5. Dados dos contatos do cliente">
      <p>
        O cliente é o controlador dos dados dos contatos que atende pelo {COMPANY.product} e é responsável por ter base legal para
        tratá-los, informar esses contatos e atender os pedidos deles. Nós tratamos esses dados como operador, apenas para prestar o
        serviço, conforme a{" "}
        <Link to="/privacidade" className="text-primary underline underline-offset-2">
          Política de Privacidade
        </Link>
        .
      </p>
    </Section>

    <Section id="ia" title="6. Inteligência artificial e automações">
      <ul className="list-disc space-y-2 pl-6">
        <li>
          Os agentes de IA, fluxos e automações agem conforme a configuração feita pelo cliente: instruções, regras, horários e ferramentas
          ligadas. O cliente é responsável por essa configuração e por revisar o funcionamento antes de colocá-la em uso.
        </li>
        <li>
          Respostas geradas por IA podem conter erros. O cliente deve acompanhar os atendimentos automáticos e não deve usar a IA como única
          fonte de decisões que exijam avaliação profissional, como diagnósticos de saúde, orientação jurídica ou financeira.
        </li>
        <li>
          Quando uma ferramenta estiver ligada, o agente pode executar ações em serviços conectados em nome do cliente, como marcar,
          remarcar ou desmarcar compromissos no Google Agenda, sempre dentro das regras configuradas.
        </li>
        <li>O consumo de IA é contabilizado e pode ser limitado ou cobrado conforme o plano.</li>
      </ul>
    </Section>

    <Section id="integracoes" title="7. Serviços de terceiros">
      <p>
        Integrações como WhatsApp, Meta, Google e provedores de e-mail são oferecidas por terceiros e estão sujeitas aos termos e políticas
        deles. Não respondemos por indisponibilidades, mudanças de regras, bloqueios de números ou contas, ou cobranças feitas por esses
        terceiros. O cliente pode desconectar uma integração a qualquer momento nas configurações do painel.
      </p>
    </Section>

    <Section id="propriedade" title="8. Propriedade intelectual">
      <p>
        O {COMPANY.product}, sua marca, código e materiais pertencem a {COMPANY.legalName}. O cliente recebe uma licença de uso não
        exclusiva e intransferível enquanto o contrato estiver ativo. O conteúdo que o cliente cadastra (mensagens, contatos, modelos,
        prompts e arquivos) continua sendo dele, e nos autoriza a usá-lo apenas para prestar o serviço.
      </p>
    </Section>

    <Section id="disponibilidade" title="9. Disponibilidade e suporte">
      <p>
        Trabalhamos para manter o serviço disponível e seguro, mas ele pode passar por manutenções, atualizações e falhas, inclusive de
        provedores de infraestrutura e de serviços conectados. Níveis de disponibilidade e de suporte específicos valem apenas quando
        previstos em contrato.
      </p>
    </Section>

    <Section id="responsabilidade" title="10. Limitação de responsabilidade">
      <p>
        Na medida permitida pela lei, não respondemos por lucros cessantes, perda de oportunidades ou danos indiretos, nem por danos
        causados pelo uso indevido da plataforma, por configurações feitas pelo cliente ou por serviços de terceiros. Nossa responsabilidade
        total, em qualquer caso, fica limitada ao valor pago pelo cliente nos 12 meses anteriores ao fato. Nada nestes termos afasta
        direitos que a lei não permita limitar.
      </p>
    </Section>

    <Section id="encerramento" title="11. Encerramento">
      <p>
        Ao fim do contrato, o acesso ao painel é encerrado e as integrações são desconectadas. O cliente pode pedir a exportação dos seus
        dados antes do encerramento; depois, os dados são excluídos ou anonimizados nos prazos da Política de Privacidade, salvo quando a
        lei exigir a guarda.
      </p>
    </Section>

    <Section id="alteracoes" title="12. Alterações nestes termos">
      <p>
        Podemos atualizar estes termos. A data da última atualização fica no topo da página e, em mudanças relevantes, avisaremos os
        clientes pelo painel ou por e-mail com antecedência razoável. Continuar usando o serviço depois da mudança significa concordar com a
        nova versão.
      </p>
    </Section>

    <Section id="lei" title="13. Lei aplicável e foro">
      <p>
        Estes termos seguem as leis do Brasil. Fica eleito o foro da comarca de {COMPANY.forum} para resolver questões relacionadas a eles,
        salvo quando a lei garantir outro foro.
      </p>
    </Section>

    <Section id="contato" title="14. Contato">
      <p>
        Dúvidas sobre estes termos: {COMPANY.contactEmail}. {COMPANY.legalName}, CNPJ {COMPANY.document}.
      </p>
    </Section>
  </LegalPage>
);
