import { DialogEditUser } from "./dialogEditUser";
import { DialogSendPasswordReset } from "./dialogSendPasswordReset";
import { DialogUserAccess } from "./dialogUserAccess";

export const UserActions = ({ user }: { user: ImplanterUser }) => (
  <div className="flex flex-wrap gap-1">
    <DialogEditUser user={user} />
    <DialogUserAccess user={user} />
    <DialogSendPasswordReset user={user} />
  </div>
);
