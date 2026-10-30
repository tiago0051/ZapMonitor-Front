import { useUserContext } from "@/context/UserContext/userContext";
import type { FC } from "react";
import { useMemberRoleOptions } from "../useMemberRoleOptions";
import { DialogCancelInvitation } from "./dialogCancelInvitation";
import { DialogChangeMemberRole } from "./dialogChangeMemberRole";
import { DialogChangeMemberStatus } from "./dialogChangeMemberStatus";

type MemberRowActionsProps = {
  member: Member;
  clientId: string;
};

export const MemberRowActions: FC<MemberRowActionsProps> = ({ member, clientId }) => {
  const { user } = useUserContext();
  const { canManageMember } = useMemberRoleOptions(clientId);

  if (member.status === "PENDING") {
    return <DialogCancelInvitation clientId={clientId} invitationId={member.id} />;
  }

  // O próprio acesso e o de quem tem mais poder não podem ser alterados
  if (member.id === user?.id || !canManageMember(member)) return null;

  return (
    <div className="flex gap-1">
      <DialogChangeMemberRole clientId={clientId} member={member} />
      <DialogChangeMemberStatus clientId={clientId} userId={member.id} action={member.status === "ACTIVE" ? "deactivate" : "activate"} />
    </div>
  );
};
