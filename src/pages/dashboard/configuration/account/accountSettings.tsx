import { ChangePasswordForm } from "@/components/change-password-form";
import { NicknameForm } from "@/components/nickname-form";
import { TwoFactorSettings } from "@/components/two-factor-settings";
import { Separator } from "@/components/ui/separator";
import { useClientContext } from "@/context/ClientContext/clientContext";
import { useQueryClient } from "@tanstack/react-query";

/** Minha conta: apelido para os clientes, senha e verificação em duas etapas. */
export const AccountSettings = () => {
  const { client, access } = useClientContext();
  const queryClient = useQueryClient();

  return (
    <div className="space-y-8">
      <NicknameForm />
      <Separator className="max-w-xl" />
      <ChangePasswordForm />
      <Separator className="max-w-xl" />
      <TwoFactorSettings
        required={access.twoFactorSetupRequired}
        // Ativar libera o resto do sistema quando o cliente exige; desativar pode voltar a exigir
        onChange={() => queryClient.invalidateQueries({ queryKey: ["clientAccess", client.id] })}
      />
    </div>
  );
};
