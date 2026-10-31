import { Badge } from "@/components/ui/badge";
import { getMembershipRoleLabel } from "../implanterUserFormat";

/** Tenants do usuário com o papel em cada um; os inativos aparecem apagados. */
export const UserMemberships = ({ memberships }: { memberships: ImplanterUserMembership[] }) => (
  <div className="flex flex-wrap gap-1">
    {memberships.map((membership) => (
      <Badge
        key={membership.clientId}
        variant={membership.active ? "outline" : "secondary"}
        className={membership.active ? "" : "opacity-60"}
      >
        {membership.clientName} · {getMembershipRoleLabel(membership)}
        {!membership.active && " (inativo)"}
      </Badge>
    ))}
  </div>
);
