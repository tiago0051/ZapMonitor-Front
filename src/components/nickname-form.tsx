import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUserContext } from "@/context/UserContext/userContext";
import { userService } from "@/services/api/userSevice";
import { attendantDisplayName } from "@/utils/attendantName";
import { requestErrorHandling } from "@/utils/request";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

const NICKNAME_MAX = 40;

/** Apelido que aparece para os clientes nas mensagens (ex.: {atendente} das respostas rápidas). */
export function NicknameForm() {
  const { user } = useUserContext();
  const queryClient = useQueryClient();
  const saved = user?.nickname ?? "";
  const [nickname, setNickname] = useState(saved);
  // O usuário chega depois do /user/me (e muda ao salvar): o campo acompanha o valor salvo
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    setNickname(saved);
  }

  const saveMutation = useMutation({
    mutationFn: (value: string | null) => userService.updateProfile({ nickname: value }),
    onSuccess: (me) => {
      queryClient.setQueryData(["me"], me);
      toast.success(me.nickname ? "Apelido salvo" : "Apelido removido; os clientes veem seu primeiro nome");
    },
    onError: requestErrorHandling,
  });

  const trimmed = nickname.trim();
  const changed = trimmed !== saved;
  const preview = attendantDisplayName({ name: user?.name ?? "", nickname: trimmed || null });

  return (
    <form
      className="max-w-xl space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        saveMutation.mutate(trimmed || null);
      }}
    >
      <div>
        <h2 className="text-xl font-semibold">Apelido para os clientes</h2>
        <p className="text-muted-foreground text-sm">
          É como você aparece nas mensagens para os clientes, por exemplo no {"{atendente}"} das respostas rápidas. Dentro do sistema, a equipe
          continua vendo seu nome completo.
        </p>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="nickname">Apelido</Label>
        <Input
          id="nickname"
          value={nickname}
          maxLength={NICKNAME_MAX}
          placeholder={attendantDisplayName({ name: user?.name ?? "", nickname: null }) || "Ex.: Ana"}
          onChange={(event) => setNickname(event.target.value)}
          disabled={saveMutation.isPending}
        />
        <p className="text-muted-foreground text-xs">
          {preview && (
            <>
              Os clientes vão ler: <span className="text-foreground font-medium">"Olá, aqui é {preview}"</span>.{" "}
            </>
          )}
          Em branco, usa o seu primeiro nome.
        </p>
      </div>

      <Button type="submit" disabled={!changed || saveMutation.isPending}>
        {saveMutation.isPending ? "Salvando..." : "Salvar apelido"}
      </Button>
    </form>
  );
}
