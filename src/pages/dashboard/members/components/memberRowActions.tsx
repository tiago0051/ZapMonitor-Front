import type { FC } from "react";
import { DialogCancelInvitation } from "./dialogCancelInvitation";
import { DialogChangeMemberStatus } from "./dialogChangeMemberStatus";

type MemberRowActionsProps = {
  member: Member;
  clientId: string;
};

export const MemberRowActions: FC<MemberRowActionsProps> = ({ member, clientId }) => {
  if (member.status === "PENDING") {
    return <DialogCancelInvitation clientId={clientId} invitationId={member.id} />;
  }

  return (
    <DialogChangeMemberStatus
      clientId={clientId}
      userId={member.id}
      action={member.status === "ACTIVE" ? "deactivate" : "activate"}
    />
  );
};
