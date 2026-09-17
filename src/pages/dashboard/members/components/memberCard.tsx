import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import type { FC } from "react";
import { memberStatusLabel, memberStatusVariant } from "../memberStatus";
import { MemberRowActions } from "./memberRowActions";

type MemberCardProps = {
  member: Member;
  clientId: string;
};

export const MemberCard: FC<MemberCardProps> = ({ member, clientId }) => {
  return (
    <div className="border-border rounded-lg border p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {member.name ?? <span className="text-muted-foreground italic">Convite pendente</span>}
          </p>
          <p className="text-muted-foreground truncate text-sm">{member.email}</p>
        </div>
        <Badge variant={memberStatusVariant[member.status]} className="shrink-0">
          {memberStatusLabel[member.status]}
        </Badge>
      </div>

      <p className="text-muted-foreground mt-2 text-xs">Entrou em {format(member.createdAt, "dd/MM/yyyy HH:mm")}</p>

      <div className="mt-3 flex justify-end border-t pt-3">
        <MemberRowActions member={member} clientId={clientId} />
      </div>
    </div>
  );
};
